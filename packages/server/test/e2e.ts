import { fileURLToPath } from "node:url";
import * as BunServices from "@effect/platform-bun/BunServices";
import * as McpClient from "effect/ai/McpClient";
import * as McpProtocol from "effect/ai/McpProtocol";
import type * as McpSchema from "effect/ai/McpSchema";
import * as Effect from "effect/Effect";
import * as ChildProcess from "effect/process/ChildProcess";

type Score = {
  readonly graded: number;
  readonly passed: number;
  readonly spentMicroUsd: number;
  readonly status: string;
};

const src = (file: string) => fileURLToPath(new URL(`../src/${file}`, import.meta.url));
const port = 8700 + Math.floor(Math.random() * 200);
const seats = [
  {
    seat: "s1",
    shape: "haiku-pi",
    goal: "cart-merge",
    worstCaseMicroUsd: 100_000,
  },
];

const expectScore = (surface: string, score: Score) => {
  const ok =
    score.graded === 1 && score.passed === 1 && score.spentMicroUsd === 7_700 && score.status === "finished";
  console.log(
    `${ok ? "PASS" : "FAIL"} ${surface} graded=${score.graded} passed=${score.passed} spent=${score.spentMicroUsd} status=${score.status}`,
  );
  return ok;
};

const cli = async (url: string, args: ReadonlyArray<string>): Promise<unknown> => {
  const child = Bun.spawn(["bun", src("cli.ts"), ...args], {
    env: { ...process.env, ASSAY_URL: url },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`assay ${args[0]} exited ${code}: ${err}`);
  return JSON.parse(out);
};

const waitFor = async (url: string) => {
  for (let tries = 0; tries < 50; tries++) {
    const up = await fetch(url).then(
      (response) => response.ok,
      () => false,
    );
    if (up) return;
    await Bun.sleep(100);
  }
  throw new Error(`server at ${url} never came up`);
};

const cliFlow = async (): Promise<boolean> => {
  const server = Bun.spawn(["bun", src("serve.ts")], {
    env: { ...process.env, ASSAY_PORT: String(port) },
    stdout: "ignore",
    stderr: "ignore",
  });
  try {
    await waitFor(`http://localhost:${port}/health`);
    const url = `http://localhost:${port}/api`;
    await cli(url, [
      "start-assay",
      "--target",
      "a-1",
      "--plan-hash",
      "p1",
      "--budget-micro-usd",
      "500000",
      "--seats",
      JSON.stringify(seats),
    ]);
    await cli(url, ["claim-seat", "--target", "a-1", "--seat", "s1", "--runner", "local"]);
    await cli(url, [
      "record-receipt",
      "--target",
      "a-1/s1",
      "--assay-id",
      "a-1",
      "--seat",
      "s1",
      "--plan-hash",
      "p1",
      "--outcome",
      "stopped",
      "--turns",
      "3",
      "--spent-micro-usd",
      "7700",
    ]);
    await cli(url, [
      "record-grade",
      "--target",
      "a-1/s1",
      "--passed",
      "true",
      "--reason",
      "9 of 9 hidden tests pass",
    ]);
    return expectScore("cli", (await cli(url, ["assay-score", "get", "--key", "a-1"])) as Score);
  } finally {
    server.kill();
  }
};

const structured = (result: McpSchema.CallToolResult): unknown => {
  if (result.isError) throw new Error(`tool failed: ${JSON.stringify(result.content)}`);
  if (result.structuredContent !== undefined) return result.structuredContent;
  const text = result.content.find((part) => part.type === "text");
  return text && "text" in text ? JSON.parse(text.text) : null;
};

const mcpFlow = Effect.gen(function* () {
  const client = yield* McpClient.McpClient;
  const tools = yield* client.listTools();
  const call = (suffix: string, args: Record<string, unknown>) =>
    Effect.gen(function* () {
      const tool = tools.find((candidate) => candidate.name === `AssayApi_${suffix}`);
      if (tool === undefined)
        return yield* Effect.die(`no tool ending ${suffix} in ${tools.map((t) => t.name).join(", ")}`);
      return structured(yield* client.callTool({ tool, arguments: args }));
    });
  yield* call("StartAssay_send", {
    target: "a-1",
    input: { planHash: "p1", budgetMicroUsd: 500_000, seats },
  });
  yield* call("ClaimSeat_send", {
    target: "a-1",
    input: { seat: "s1", runner: "local" },
  });
  yield* call("RecordReceipt_send", {
    target: "a-1/s1",
    input: {
      assayId: "a-1",
      seat: "s1",
      planHash: "p1",
      outcome: "stopped",
      turns: 3,
      spentMicroUsd: 7_700,
    },
  });
  yield* call("RecordGrade_send", {
    target: "a-1/s1",
    input: { passed: true, reason: "9 of 9 hidden tests pass" },
  });
  const score = (yield* call("AssayScore_get", { key: "a-1" })) as {
    readonly value: Score;
  };
  return expectScore("mcp", score.value);
}).pipe(
  Effect.provide(
    McpClient.layerStdio({
      name: "assay-e2e",
      version: "0.0.1",
      command: ChildProcess.make("bun", [src("mcp.ts")]),
      protocol: McpProtocol.v2025_11_25,
    }),
  ),
  Effect.provide(BunServices.layer),
  Effect.scoped,
);

const results = [await cliFlow(), await Effect.runPromise(mcpFlow)];
process.exit(results.every(Boolean) ? 0 : 1);
