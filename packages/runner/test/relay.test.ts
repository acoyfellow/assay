import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRelay } from "../src/relay.ts";
import { agentEnv } from "../src/run.ts";

const secret = "sk-real-provider-secret-do-not-leak";

const fakeUpstream = () => {
  const seen: Array<{ key: string | null; model: string; maxTokens: number }> = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (request) => {
      const body = (await request.json()) as { model: string; max_tokens: number };
      seen.push({ key: request.headers.get("x-api-key"), model: body.model, maxTokens: body.max_tokens });
      if (request.headers.get("x-api-key") !== secret) return new Response("no key", { status: 401 });
      return Response.json({
        content: [{ type: "text", text: "ok" }],
        usage: { input_tokens: 1000, output_tokens: 1000 },
      });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, seen, stop: () => server.stop(true) };
};

const call = (url: string, key: string, model: string, maxTokens = 100) =>
  fetch(`${url}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [] }),
  });

const setup = (budgetUsd = 1) => {
  const upstream = fakeUpstream();
  const log = join(mkdtempSync(join(tmpdir(), "relay-")), "relay.jsonl");
  const relay = startRelay(
    { baseUrl: upstream.url, headers: async () => ({ "x-api-key": secret }) },
    { models: ["card-model"], maxTokens: 500, budgetUsd, usdPerMillion: { input: 100, output: 100 } },
    log,
  );
  return { upstream, relay, log, stop: () => (relay.stop(), upstream.stop()) };
};

describe("model relay: agents never hold a key", () => {
  test("seat key works through the relay and the real secret is added outside", async () => {
    const { upstream, relay, stop } = setup();
    const key = relay.seatKey("seat-a");
    expect(key).not.toContain(secret);
    const response = await call(relay.url, key, "card-model");
    expect(response.status).toBe(200);
    expect(upstream.seen.at(-1)?.key).toBe(secret);
    stop();
  });

  test("the seat key is worthless at the provider", async () => {
    const { upstream, relay, stop } = setup();
    const response = await call(upstream.url, relay.seatKey("seat-a"), "card-model");
    expect(response.status).toBe(401);
    stop();
  });

  test("unknown keys, other paths and models off the card are refused before the provider", async () => {
    const { upstream, relay, stop } = setup();
    const key = relay.seatKey("seat-a");
    expect((await call(relay.url, "guess", "card-model")).status).toBe(401);
    expect((await call(relay.url, key, "expensive-model")).status).toBe(403);
    expect((await fetch(`${relay.url}/v1/models`, { headers: { "x-api-key": key } })).status).toBe(403);
    expect(upstream.seen.length).toBe(0);
    stop();
  });

  test("max tokens is capped and the budget stops calls at the network", async () => {
    const { upstream, relay, log, stop } = setup(0.24);
    const key = relay.seatKey("seat-a");
    expect((await call(relay.url, key, "card-model", 99999)).status).toBe(200);
    expect(upstream.seen.at(-1)?.maxTokens).toBe(500);
    await Bun.sleep(20);
    expect(relay.spentUsd()).toBeCloseTo(0.2, 5);
    expect((await call(relay.url, key, "card-model", 99999)).status).toBe(402);
    expect(upstream.seen.length).toBe(1);
    const lines = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines.map((line) => line.status)).toEqual([200, 402]);
    expect(lines[0].seat).toBe("seat-a");
    stop();
  });

  test("agent env drops anything secret-shaped", () => {
    process.env.ANTHROPIC_API_KEY = secret;
    process.env.SOME_PROVIDER_TOKEN = secret;
    process.env.ASSAY_UPSTREAM_URL = "https://provider";
    process.env.PLAIN_NAME = secret;
    process.env.ASSAY_UPSTREAM_TOKEN_ENV = "PLAIN_NAME";
    const env = agentEnv({ PI_CODING_AGENT_DIR: "/x" });
    expect(JSON.stringify(env)).not.toContain(secret);
    expect(env.ASSAY_UPSTREAM_URL).toBeUndefined();
    expect(env.PI_CODING_AGENT_DIR).toBe("/x");
    expect(env.PATH).toBeDefined();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.SOME_PROVIDER_TOKEN;
    delete process.env.ASSAY_UPSTREAM_URL;
    delete process.env.PLAIN_NAME;
    delete process.env.ASSAY_UPSTREAM_TOKEN_ENV;
  });
});
