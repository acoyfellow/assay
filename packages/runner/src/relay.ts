import { appendFileSync } from "node:fs";

export type Upstream = {
  readonly baseUrl: string;
  readonly headers: () => Promise<Record<string, string>>;
};

export type RelayLimits = {
  readonly models: ReadonlyArray<string>;
  readonly maxTokens: number;
  readonly budgetUsd: number;
  readonly usdPerMillion: { readonly input: number; readonly output: number };
};

export type RelayCall = {
  readonly seat: string;
  readonly model: string;
  readonly status: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly usd: number;
  readonly refused: string;
  readonly at: string;
};

export type Relay = {
  readonly url: string;
  readonly seatKey: (seat: string) => string;
  readonly spentUsd: () => number;
  readonly calls: () => ReadonlyArray<RelayCall>;
  readonly stop: () => void;
};

const randomKey = () => `assay-seat-${crypto.randomUUID()}`;

type Usage = { input: number; cacheRead: number; cacheWrite: number; output: number };

const emptyUsage = (): Usage => ({ input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });

const addUsage = (total: Usage, raw: Record<string, number> | undefined) => {
  if (!raw) return;
  total.input = Math.max(total.input, raw.input_tokens ?? 0);
  total.cacheRead = Math.max(total.cacheRead, raw.cache_read_input_tokens ?? 0);
  total.cacheWrite = Math.max(total.cacheWrite, raw.cache_creation_input_tokens ?? 0);
  total.output = Math.max(total.output, raw.output_tokens ?? 0);
};

const usageOf = (text: string): Usage => {
  const total = emptyUsage();
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const event = JSON.parse(line.slice(5).trim());
      addUsage(total, event.message?.usage ?? event.usage);
    } catch {}
  }
  if (total.input + total.output + total.cacheRead === 0) {
    try {
      addUsage(total, JSON.parse(text).usage);
    } catch {}
  }
  return total;
};

const refuse = (status: number, message: string) =>
  Response.json({ type: "error", error: { type: "assay_relay", message } }, { status });

export const startRelay = (upstream: Upstream, limits: RelayLimits, logFile: string): Relay => {
  const keys = new Map<string, string>();
  const calls: RelayCall[] = [];
  let spent = 0;
  let pendingWorstCase = 0;

  const record = (call: RelayCall) => {
    calls.push(call);
    appendFileSync(logFile, `${JSON.stringify(call)}\n`);
  };

  const price = limits.usdPerMillion;
  const costOf = (usage: Usage) =>
    (usage.input * price.input +
      usage.cacheRead * (price.input / 10) +
      usage.cacheWrite * (price.input * 1.25) +
      usage.output * price.output) /
    1_000_000;

  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    idleTimeout: 0,
    fetch: async (request) => {
      const url = new URL(request.url);
      const key =
        request.headers.get("x-api-key") ??
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
        "";
      const seat = keys.get(key);
      const base = {
        seat: seat ?? "unknown",
        model: "",
        status: 0,
        inputTokens: 0,
        outputTokens: 0,
        usd: 0,
        at: new Date().toISOString(),
      };
      if (!seat) {
        record({ ...base, status: 401, refused: "unknown seat key" });
        return refuse(401, "unknown seat key");
      }
      if (request.method !== "POST" || !url.pathname.endsWith("/v1/messages")) {
        record({ ...base, status: 403, refused: `path ${url.pathname}` });
        return refuse(403, "only POST /v1/messages is relayed");
      }
      const body = (await request.json().catch(() => null)) as { model?: string; max_tokens?: number } | null;
      if (!body?.model || !limits.models.includes(body.model)) {
        record({ ...base, model: body?.model ?? "", status: 403, refused: "model not on the card" });
        return refuse(403, `model ${body?.model} is not on the contract card (${limits.models.join(", ")})`);
      }
      const maxTokens = Math.min(body.max_tokens ?? limits.maxTokens, limits.maxTokens);
      const worstCase = costOf({ ...emptyUsage(), output: maxTokens });
      if (spent + pendingWorstCase + worstCase > limits.budgetUsd) {
        record({ ...base, model: body.model, status: 402, refused: "budget spent" });
        return refuse(402, `the assay budget of $${limits.budgetUsd} is spent`);
      }
      pendingWorstCase += worstCase;
      const headers = new Headers({
        "content-type": "application/json",
        "anthropic-version": request.headers.get("anthropic-version") ?? "2023-06-01",
        ...(await upstream.headers()),
      });
      const beta = request.headers.get("anthropic-beta");
      if (beta) headers.set("anthropic-beta", beta);
      const response = await fetch(`${upstream.baseUrl.replace(/\/+$/, "")}/v1/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, max_tokens: maxTokens }),
      }).catch((error: Error) => refuse(502, `upstream: ${error.message}`));
      if (!response.body) {
        pendingWorstCase -= worstCase;
        record({ ...base, model: body.model, status: response.status, refused: "" });
        return response;
      }
      const [toAgent, toMeter] = response.body.tee();
      new Response(toMeter).text().then((text) => {
        const usage = usageOf(text);
        const usd = costOf(usage);
        pendingWorstCase -= worstCase;
        spent += usd;
        record({
          ...base,
          model: body.model ?? "",
          status: response.status,
          inputTokens: usage.input + usage.cacheRead + usage.cacheWrite,
          outputTokens: usage.output,
          usd,
          refused: "",
        });
      });
      return new Response(toAgent, {
        status: response.status,
        headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
      });
    },
  });

  return {
    url: `http://127.0.0.1:${server.port}`,
    seatKey: (seat) => {
      const key = randomKey();
      keys.set(key, seat);
      return key;
    },
    spentUsd: () => spent,
    calls: () => [...calls],
    stop: () => server.stop(true),
  };
};

export const upstreamFromEnv = (): Upstream | null => {
  const baseUrl = process.env.ASSAY_UPSTREAM_URL;
  if (!baseUrl) return null;
  const header = process.env.ASSAY_UPSTREAM_HEADER ?? "x-api-key";
  const tokenCommand = process.env.ASSAY_UPSTREAM_TOKEN_COMMAND;
  const tokenEnv = process.env.ASSAY_UPSTREAM_TOKEN_ENV;
  const extra = Object.fromEntries(
    (process.env.ASSAY_UPSTREAM_EXTRA_HEADERS ?? "")
      .split(",")
      .filter(Boolean)
      .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]),
  );
  let cached: { token: string; at: number } | null = null;
  const token = async () => {
    if (tokenEnv && process.env[tokenEnv]) return process.env[tokenEnv] ?? "";
    if (!tokenCommand) return "";
    if (cached && Date.now() - cached.at < 5 * 60_000) return cached.token;
    const out = (
      await new Response(Bun.spawn(["sh", "-c", tokenCommand], { stdout: "pipe" }).stdout).text()
    ).trim();
    cached = { token: out, at: Date.now() };
    return out;
  };
  return {
    baseUrl,
    headers: async () => {
      const value = await token();
      const prefix = header.toLowerCase() === "authorization" ? "Bearer " : "";
      return value ? { ...extra, [header]: `${prefix}${value}` } : extra;
    },
  };
};
