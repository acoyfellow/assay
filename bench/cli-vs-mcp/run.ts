import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { grade } from "./grade.ts";

type Arm = "cli" | "mcp";
type Usage = {
  readonly turns: number;
  readonly toolCalls: number;
  readonly microUsd: number;
  readonly lastText: string;
};
type SeatResult = Usage & {
  readonly arm: Arm;
  readonly seat: string;
  readonly outcome: "stopped" | "died";
  readonly attempts: number;
  readonly passed: boolean;
  readonly reason: string;
  readonly ms: number;
};

const here = new URL(".", import.meta.url).pathname;
const root = join(here, "../..");
const cliEntry = join(root, "packages/server/src/cli.ts");
const serveEntry = join(root, "packages/server/src/serve.ts");
const work = join(root, ".tmp/bench");
const receipts = join(here, "receipts");
const seatsPerArm = Number(process.env.SEATS ?? 5);
const worstCaseMicroUsd = 200_000;
const budgetMicroUsd = 1_000_000;
const seatMinutes = 4;
const maxAttempts = 2;
const planHash = new Bun.CryptoHasher("sha256")
  .update(readFileSync(join(here, "task.md")))
  .digest("hex")
  .slice(0, 12);

const surfaces: Record<Arm, string> = {
  cli: "Use the `assay` command in your shell. Run `assay --help` and `assay <subcommand> --help` to learn it.",
  mcp: "Use your assay tools.",
};
const tools: Record<Arm, string> = { cli: "read,bash", mcp: "read,mcp__assay__*" };

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`set ${name}; see bench/cli-vs-mcp/README.md`);
  return value;
};
const provider = required("ASSAY_PI_PROVIDER");
const model = process.env.ASSAY_PI_MODEL ?? "claude-haiku-4-5";
const extensions = (process.env.ASSAY_PI_EXTENSIONS ?? "").split(",").filter(Boolean);
const tokenCommand = process.env.ASSAY_PI_TOKEN_COMMAND;
const tokenEnv = process.env.ASSAY_PI_TOKEN_ENV;
const token = tokenCommand
  ? (await new Response(Bun.spawn(["sh", "-c", tokenCommand], { stdout: "pipe" }).stdout).text()).trim()
  : "";
const providerEnv: Record<string, string> = tokenEnv && token ? { [tokenEnv]: token } : {};

const freePort = (() => {
  let next = 9100;
  return () => next++;
})();

const startServer = async (port: number) => {
  const server = Bun.spawn(["bun", serveEntry], {
    env: { ...process.env, ASSAY_PORT: String(port) },
    stdout: "ignore",
    stderr: "ignore",
  });
  for (let tries = 0; tries < 80; tries++) {
    const up = await fetch(`http://localhost:${port}/health`).then(
      (r) => r.ok,
      () => false,
    );
    if (up) return server;
    await Bun.sleep(100);
  }
  server.kill();
  throw new Error(`server on ${port} did not start`);
};

const assay = async (api: string, args: ReadonlyArray<string>): Promise<unknown> => {
  const child = Bun.spawn(["bun", cliEntry, ...args], {
    env: { ...process.env, ASSAY_URL: api },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`assay ${args.join(" ")}: ${err.slice(0, 300)}`);
  return JSON.parse(out);
};

const usageOf = (events: string): Usage => {
  let turns = 0;
  let toolCalls = 0;
  let usd = 0;
  let lastText = "";
  for (const line of events.split("\n")) {
    if (!line.startsWith("{")) continue;
    const event = JSON.parse(line);
    if (event.type === "tool_execution_start") toolCalls += 1;
    if (event.type === "message_end" && event.message?.role === "assistant") {
      turns += 1;
      usd += event.message.usage?.cost?.total ?? 0;
      const text = (event.message.content ?? []).filter((part: { type: string }) => part.type === "text");
      if (text.length > 0) lastText = text.map((part: { text: string }) => part.text).join("");
    }
  }
  return { turns, toolCalls, microUsd: Math.round(usd * 1_000_000), lastText: lastText.slice(0, 300) };
};

const prepareWorkspace = (arm: Arm, seat: string, api: string, port: number) => {
  const dir = join(work, seat);
  rmSync(dir, { recursive: true, force: true });
  const agent = join(dir, "agent");
  const workspace = join(dir, "ws");
  mkdirSync(join(workspace, ".pi"), { recursive: true });
  mkdirSync(join(workspace, "bin"), { recursive: true });
  mkdirSync(agent, { recursive: true });
  writeFileSync(join(agent, "settings.json"), JSON.stringify({ packages: [], extensions: [] }));
  if (arm === "mcp") {
    writeFileSync(
      join(workspace, ".pi/mcp.json"),
      JSON.stringify({ mcpServers: { assay: { url: `http://localhost:${port}/mcp`, exposure: "direct" } } }),
    );
  } else {
    writeFileSync(join(workspace, "bin/assay"), `#!/bin/sh\nexec bun ${cliEntry} "$@"\n`, { mode: 0o755 });
  }
  return { dir, agent, workspace, api };
};

const runSeat = async (ledger: string, arm: Arm, index: number): Promise<SeatResult> => {
  const seat = `${arm}-${index}`;
  const port = freePort();
  const api = `http://localhost:${port}/api`;
  const target = await startServer(port);
  const started = Date.now();
  try {
    await assay(ledger, ["claim-seat", "--target", `bench-${arm}`, "--seat", seat, "--runner", "local"]);
    let attempt = await attemptSeat(ledger, arm, seat, api, port, 1);
    let spent = attempt.usage;
    while (attempt.outcome === "died" && attempt.number < maxAttempts) {
      attempt = await attemptSeat(ledger, arm, seat, api, port, attempt.number + 1);
      spent = {
        turns: spent.turns + attempt.usage.turns,
        toolCalls: spent.toolCalls + attempt.usage.toolCalls,
        microUsd: spent.microUsd + attempt.usage.microUsd,
        lastText: attempt.usage.lastText,
      };
    }
    const { outcome } = attempt;
    const usage = spent;
    const verdict =
      outcome === "stopped" ? await grade(api) : { passed: false, reason: `died ${attempt.number} times` };
    if (outcome === "stopped") {
      await assay(ledger, [
        "record-grade",
        "--target",
        `bench-${arm}/${seat}`,
        "--passed",
        String(verdict.passed),
        "--reason",
        verdict.reason,
      ]);
    }
    const result: SeatResult = {
      arm,
      seat,
      outcome,
      attempts: attempt.number,
      ...usage,
      ...verdict,
      ms: Date.now() - started,
    };
    writeFileSync(join(receipts, `${seat}.json`), JSON.stringify(result, null, 2));
    console.log(
      `${seat} ${verdict.passed ? "PASS" : "FAIL"} attempts=${attempt.number} turns=${usage.turns} $${(usage.microUsd / 1e6).toFixed(4)} ${verdict.reason}`,
    );
    return result;
  } finally {
    target.kill();
  }
};

const attemptSeat = async (
  ledger: string,
  arm: Arm,
  seat: string,
  api: string,
  port: number,
  number: number,
) => {
  const { dir, agent, workspace } = prepareWorkspace(arm, `${seat}-try${number}`, api, port);
  const prompt = readFileSync(join(here, "task.md"), "utf8").replace("{{SURFACE}}", surfaces[arm]);
  const pi = Bun.spawn(
    [
      "pi",
      "-p",
      "--mode",
      "json",
      "--no-skills",
      "--no-session",
      "--approve",
      ...extensions.flatMap((extension) => ["-e", extension]),
      "--provider",
      provider,
      "--model",
      model,
      "--tools",
      tools[arm],
      prompt,
    ],
    {
      cwd: workspace,
      env: {
        ...process.env,
        ...providerEnv,
        PI_CODING_AGENT_DIR: agent,
        ASSAY_URL: api,
        PATH: `${join(workspace, "bin")}:${process.env.PATH}`,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const killer = setTimeout(() => pi.kill(), seatMinutes * 60_000);
  const [events, errors, code] = await Promise.all([
    new Response(pi.stdout).text(),
    new Response(pi.stderr).text(),
    pi.exited,
  ]);
  clearTimeout(killer);
  writeFileSync(join(dir, "events.jsonl"), events);
  writeFileSync(join(dir, "stderr.txt"), errors);
  const usage = usageOf(events);
  const outcome: "stopped" | "died" = code === 0 ? "stopped" : "died";
  await assay(ledger, [
    "record-receipt",
    "--target",
    `bench-${arm}/${seat}`,
    "--assay-id",
    `bench-${arm}`,
    "--seat",
    seat,
    "--plan-hash",
    planHash,
    "--outcome",
    outcome,
    "--turns",
    String(usage.turns),
    "--spent-micro-usd",
    String(usage.microUsd),
  ]);
  return { outcome, usage, number } as const;
};

const seatPlans = (arm: Arm) =>
  Array.from({ length: seatsPerArm }, (_, i) => ({
    seat: `${arm}-${i + 1}`,
    shape: "haiku45-pi",
    goal: `cli-vs-mcp/${arm}`,
    worstCaseMicroUsd,
  }));

rmSync(receipts, { recursive: true, force: true });
mkdirSync(receipts, { recursive: true });
const ledgerPort = freePort();
const ledger = `http://localhost:${ledgerPort}/api`;
const ledgerServer = await startServer(ledgerPort);
try {
  const arms: ReadonlyArray<Arm> = ["cli", "mcp"];
  for (const arm of arms) {
    await assay(ledger, [
      "start-assay",
      "--target",
      `bench-${arm}`,
      "--plan-hash",
      planHash,
      "--budget-micro-usd",
      String(budgetMicroUsd),
      "--seats",
      JSON.stringify(seatPlans(arm)),
    ]);
  }
  const jobs = arms.flatMap((arm) =>
    Array.from({ length: seatsPerArm }, (_, i) => () => runSeat(ledger, arm, i + 1)),
  );
  const results: Array<SeatResult> = [];
  const parallel = Number(process.env.PARALLEL ?? 4);
  for (let i = 0; i < jobs.length; i += parallel) {
    results.push(...(await Promise.all(jobs.slice(i, i + parallel).map((job) => job()))));
  }
  await Bun.sleep(500);
  const ledgerScores = Object.fromEntries(
    await Promise.all(
      arms.map(async (arm) => [arm, await assay(ledger, ["assay-score", "get", "--key", `bench-${arm}`])]),
    ),
  );
  writeFileSync(
    join(here, "ledger-scores.json"),
    JSON.stringify({ planHash, scores: ledgerScores }, null, 2),
  );
  console.log(JSON.stringify(ledgerScores));
} finally {
  ledgerServer.kill();
}
