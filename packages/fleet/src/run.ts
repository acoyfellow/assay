import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { decodePlan, type ExpandedSeat, expandSeats, type Plan } from "./Plan.ts";

type Usage = { turns: number; toolCalls: number; usd: number; lastText: string };
type Receipt = Usage & {
  seat: string;
  outcome: "stopped" | "died";
  passed: boolean;
  gradeOutput: string;
  ms: number;
};

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, "../../..");
const cliEntry = join(root, "packages/server/src/cli.ts");
const serveEntry = join(root, "packages/server/src/serve.ts");
const scopeGuard = join(here, "scope-guard.ts");

const microUsd = (usd: number) => Math.round(usd * 1_000_000);

const usageOf = (events: string): Usage => {
  const usage: Usage = { turns: 0, toolCalls: 0, usd: 0, lastText: "" };
  for (const line of events.split("\n")) {
    if (!line.startsWith("{")) continue;
    const event = JSON.parse(line);
    if (event.type === "tool_execution_start") usage.toolCalls += 1;
    if (event.type === "message_end" && event.message?.role === "assistant") {
      usage.turns += 1;
      usage.usd += event.message.usage?.cost?.total ?? 0;
      const text = (event.message.content ?? []).filter((part: { type: string }) => part.type === "text");
      if (text.length > 0) usage.lastText = text.map((part: { text: string }) => part.text).join("");
    }
  }
  return { ...usage, lastText: usage.lastText.slice(0, 300) };
};

const startLedger = async (port: number) => {
  const server = Bun.spawn(["bun", serveEntry], {
    env: { ...process.env, ASSAY_PORT: String(port) },
    stdout: "ignore",
    stderr: "ignore",
  });
  for (let tries = 0; tries < 80; tries++) {
    const up = await fetch(`http://localhost:${port}/health`).then(
      (response) => response.ok,
      () => false,
    );
    if (up) return server;
    await Bun.sleep(100);
  }
  server.kill();
  throw new Error(`ledger on port ${port} did not start`);
};

const ledgerCall = async (api: string, args: ReadonlyArray<string>): Promise<unknown> => {
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
  if (code !== 0) throw new Error(`assay ${args[0]}: ${err.slice(0, 400)}`);
  return JSON.parse(out);
};

const shell = async (command: string, cwd: string, env: Record<string, string>, minutes: number) => {
  const child = Bun.spawn(["sh", "-c", command], {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const killer = setTimeout(() => child.kill(), minutes * 60_000);
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  clearTimeout(killer);
  return { out, err, code };
};

const providerEnv = async (): Promise<Record<string, string>> => {
  const command = process.env.ASSAY_PI_TOKEN_COMMAND;
  const name = process.env.ASSAY_PI_TOKEN_ENV;
  if (!command || !name) return {};
  const token = (
    await new Response(Bun.spawn(["sh", "-c", command], { stdout: "pipe" }).stdout).text()
  ).trim();
  return token ? { [name]: token } : {};
};

const runPi = async (
  plan: Plan,
  seat: ExpandedSeat,
  prompt: string,
  workspace: string,
  seatDir: string,
  tokens: Record<string, string>,
) => {
  const agentDir = join(seatDir, "agent");
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ packages: [], extensions: [] }));
  const extensions = (process.env.ASSAY_PI_EXTENSIONS ?? "").split(",").filter(Boolean);
  const provider = plan.provider ?? process.env.ASSAY_PI_PROVIDER ?? "anthropic";
  const pi = Bun.spawn(
    [
      process.env.ASSAY_PI_BIN ?? "pi",
      "-p",
      "--mode",
      "json",
      "--no-skills",
      "--no-session",
      "--approve",
      ...extensions.flatMap((extension) => ["-e", extension]),
      "-e",
      scopeGuard,
      "--provider",
      provider,
      "--model",
      seat.model ?? plan.model,
      "--tools",
      "read,write,edit,bash",
      prompt,
    ],
    {
      cwd: workspace,
      env: {
        ...process.env,
        ...tokens,
        PI_CODING_AGENT_DIR: agentDir,
        ASSAY_WORKSPACE: workspace,
        ASSAY_WRITABLE: seat.writable.join(","),
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const killer = setTimeout(() => pi.kill(), (plan.minutesPerSeat ?? 10) * 60_000);
  const [events, errors, code] = await Promise.all([
    new Response(pi.stdout).text(),
    new Response(pi.stderr).text(),
    pi.exited,
  ]);
  clearTimeout(killer);
  writeFileSync(join(seatDir, "events.jsonl"), events);
  writeFileSync(join(seatDir, "stderr.txt"), errors);
  return { usage: usageOf(events), outcome: code === 0 ? ("stopped" as const) : ("died" as const) };
};

const runSeat = async (
  plan: Plan,
  planDir: string,
  planHash: string,
  assayId: string,
  api: string,
  seat: ExpandedSeat,
  outDir: string,
  tokens: Record<string, string>,
): Promise<Receipt> => {
  const started = Date.now();
  const seatDir = join(outDir, seat.runId);
  const workspace = join(seatDir, "repo");
  rmSync(seatDir, { recursive: true, force: true });
  mkdirSync(seatDir, { recursive: true });
  cpSync(resolve(planDir, plan.repo), workspace, { recursive: true });
  const prompt = readFileSync(resolve(planDir, seat.task), "utf8");

  await ledgerCall(api, ["claim-seat", "--target", assayId, "--seat", seat.runId, "--runner", "local"]);
  const { usage, outcome } = await runPi(plan, seat, prompt, workspace, seatDir, tokens);
  await ledgerCall(api, [
    "record-receipt",
    "--target",
    `${assayId}/${seat.runId}`,
    "--assay-id",
    assayId,
    "--seat",
    seat.runId,
    "--plan-hash",
    planHash,
    "--outcome",
    outcome,
    "--turns",
    String(usage.turns),
    "--spent-micro-usd",
    String(microUsd(usage.usd)),
  ]);

  const graded =
    outcome === "stopped"
      ? await shell(seat.grade, workspace, { ASSAY_PLAN_DIR: planDir }, 5)
      : { out: "", err: "agent died", code: 1 };
  const passed = graded.code === 0;
  const gradeOutput = `${graded.out}${graded.err}`.trim().slice(-400);
  if (outcome === "stopped") {
    await ledgerCall(api, [
      "record-grade",
      "--target",
      `${assayId}/${seat.runId}`,
      "--passed",
      String(passed),
      "--reason",
      gradeOutput.split("\n").slice(-3).join(" ").slice(0, 200) || (passed ? "pass" : "fail"),
    ]);
  }

  const receipt: Receipt = {
    seat: seat.runId,
    outcome,
    passed,
    gradeOutput,
    ms: Date.now() - started,
    ...usage,
  };
  writeFileSync(join(seatDir, "receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(
    `${seat.runId.padEnd(24)} ${passed ? "PASS" : "FAIL"}  ${String(usage.turns).padStart(3)} turns  $${usage.usd.toFixed(4)}  ${Math.round(receipt.ms / 1000)}s`,
  );
  return receipt;
};

const pool = async <T>(jobs: ReadonlyArray<() => Promise<T>>, width: number): Promise<T[]> => {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next++;
      const job = jobs[index];
      if (job) results[index] = await job();
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, worker));
  return results;
};

export const runFleet = async (planPath: string, outRoot: string) => {
  const planFile = resolve(planPath);
  const planDir = dirname(planFile);
  const planText = readFileSync(planFile, "utf8");
  const plan = decodePlan(JSON.parse(planText));
  const seats = expandSeats(plan);
  const planHash = new Bun.CryptoHasher("sha256").update(planText).digest("hex").slice(0, 12);
  const assayId = `${plan.name}-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
  const outDir = resolve(outRoot, assayId);
  mkdirSync(outDir, { recursive: true });

  const port = 9300 + Math.floor(Math.random() * 400);
  const api = `http://localhost:${port}/api`;
  const ledger = await startLedger(port);
  const tokens = await providerEnv();
  try {
    await ledgerCall(api, [
      "start-assay",
      "--target",
      assayId,
      "--plan-hash",
      planHash,
      "--budget-micro-usd",
      String(microUsd(plan.budgetUsd)),
      "--seats",
      JSON.stringify(
        seats.map((seat) => ({
          seat: seat.runId,
          shape: seat.model ?? plan.model,
          goal: seat.id,
          worstCaseMicroUsd: microUsd(plan.worstCaseUsdPerSeat),
        })),
      ),
    ]);
    console.log(
      `fleet ${assayId}: ${seats.length} agents, ${plan.parallel ?? 4} at a time, model ${plan.model}`,
    );
    const receipts = await pool(
      seats.map((seat) => () => runSeat(plan, planDir, planHash, assayId, api, seat, outDir, tokens)),
      plan.parallel ?? 4,
    );
    await Bun.sleep(300);
    const score = await ledgerCall(api, ["assay-score", "get", "--key", assayId]);
    const summary = { assayId, planHash, score, receipts };
    writeFileSync(join(outDir, "fleet.json"), JSON.stringify(summary, null, 2));
    const passed = receipts.filter((receipt) => receipt.passed).length;
    const spent = receipts.reduce((total, receipt) => total + receipt.usd, 0);
    console.log(
      `done: ${passed}/${receipts.length} passed, $${spent.toFixed(4)} spent, receipts in ${outDir}`,
    );
    return summary;
  } finally {
    ledger.kill();
  }
};
