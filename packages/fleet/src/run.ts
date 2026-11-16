import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { type Agent, startAgent } from "./agent.ts";
import { type SeatView, startControl } from "./control.ts";
import { addWorktree, commitSeat, diffStat, repoPath, seedRepo } from "./git.ts";
import { decodePlan, type ExpandedSeat, expandSeats, type Plan, roundsOf } from "./Plan.ts";
import { sandboxed } from "./sandbox.ts";

export type Receipt = {
  seat: string;
  task: string;
  round: number;
  outcome: "stopped" | "died" | "killed" | "skipped";
  killedBy: string;
  passed: boolean;
  gradeOutput: string;
  turns: number;
  toolCalls: number;
  steers: number;
  usd: number;
  ms: number;
  branch: string;
  sha: string;
  changedLines: number;
  lastText: string;
};

export type FleetSummary = {
  assayId: string;
  planHash: string;
  base: string;
  runDir: string;
  score: unknown;
  receipts: Receipt[];
};

const here = dirname(new URL(import.meta.url).pathname);
const root = resolve(here, "../../..");
const cliEntry = join(root, "packages/server/src/cli.ts");
const serveEntry = join(root, "packages/server/src/serve.ts");
const scopeGuard = join(here, "scope-guard.ts");

const microUsd = (usd: number) => Math.round(usd * 1_000_000);

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

type LedgerReply = { ok: true; body: unknown } | { ok: false; error: string };

const ledgerCall = async (api: string, args: ReadonlyArray<string>): Promise<LedgerReply> => {
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
  return code === 0
    ? { ok: true, body: JSON.parse(out) }
    : { ok: false, error: `${out}${err}`.slice(0, 400) };
};

const ledgerMust = async (api: string, args: ReadonlyArray<string>) => {
  const reply = await ledgerCall(api, args);
  if (!reply.ok) throw new Error(`assay ${args[0]}: ${reply.error}`);
  return reply.body;
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

const piCommand = (plan: Plan, seat: ExpandedSeat) => {
  const extensions = (process.env.ASSAY_PI_EXTENSIONS ?? "").split(",").filter(Boolean);
  const provider = plan.provider ?? process.env.ASSAY_PI_PROVIDER ?? "anthropic";
  return [
    process.env.ASSAY_PI_BIN ?? "pi",
    "--mode",
    "rpc",
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
  ];
};

type Live = { view: SeatView; agent?: Agent };

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

const verdictOf = (receipt: Receipt) => {
  if (receipt.outcome === "skipped") return "SKIP";
  return receipt.passed ? "PASS" : "FAIL";
};

const line = (receipt: Receipt) =>
  [
    receipt.seat.padEnd(24),
    verdictOf(receipt),
    `${String(receipt.turns).padStart(3)} turns`,
    `$${receipt.usd.toFixed(4)}`,
    `${Math.round(receipt.ms / 1000)}s`,
    receipt.steers ? `steered ${receipt.steers}` : "",
    receipt.killedBy ? `killed by ${receipt.killedBy}` : "",
    receipt.outcome === "skipped" ? receipt.gradeOutput : "",
  ]
    .filter(Boolean)
    .join("  ");

export const runFleet = async (planPath: string, outRoot: string): Promise<FleetSummary> => {
  const planFile = resolve(planPath);
  const planDir = dirname(planFile);
  const planText = readFileSync(planFile, "utf8");
  const plan = decodePlan(JSON.parse(planText));
  const seats = expandSeats(plan);
  const planHash = new Bun.CryptoHasher("sha256").update(planText).digest("hex").slice(0, 12);
  const assayId = `${plan.name}-${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 17)}`;
  const runDir = resolve(outRoot, assayId);
  mkdirSync(runDir, { recursive: true });
  const hidden = (plan.hidden ?? []).map((path) => resolve(planDir, path));
  const repo = repoPath(runDir);
  const base = await seedRepo(resolve(planDir, plan.repo), repo);

  const live = new Map<string, Live>(
    seats.map((seat) => [
      seat.runId,
      {
        view: {
          seat: seat.runId,
          task: seat.id,
          stage: "queued",
          turns: 0,
          usd: 0,
          steers: 0,
          lastTool: "",
          passed: null,
        },
      },
    ]),
  );
  const setStage = (seat: string, stage: string, passed: boolean | null = null) => {
    const entry = live.get(seat);
    if (entry) entry.view = { ...entry.view, stage, passed };
  };

  const control = startControl({
    fleet: assayId,
    seats: () =>
      [...live.values()].map(({ view, agent }) => {
        if (!agent) return view;
        const usage = agent.usage();
        return {
          ...view,
          stage: view.stage === "working" ? agent.state() : view.stage,
          turns: usage.turns,
          usd: Math.round(usage.usd * 10000) / 10000,
          steers: agent.steers(),
          lastTool: usage.lastTool,
        };
      }),
    agent: (seat) => live.get(seat)?.agent,
    stop: (seat, by) => {
      const agent = live.get(seat)?.agent;
      if (!agent || agent.state() !== "working") return false;
      agent.kill(by);
      return true;
    },
  });

  const port = 9300 + Math.floor(Math.random() * 400);
  const api = `http://localhost:${port}/api`;
  const ledger = await startLedger(port);
  const tokens = await providerEnv();

  let claims: Promise<unknown> = Promise.resolve();
  const claimInOrder = (seat: ExpandedSeat) => {
    const claimed = claims.then(() =>
      ledgerCall(api, ["claim-seat", "--target", assayId, "--seat", seat.runId, "--runner", "local"]),
    );
    claims = claimed;
    return claimed;
  };

  const blank = (seat: ExpandedSeat): Receipt => ({
    seat: seat.runId,
    task: seat.id,
    round: seat.round,
    outcome: "skipped",
    killedBy: "",
    passed: false,
    gradeOutput: "",
    turns: 0,
    toolCalls: 0,
    steers: 0,
    usd: 0,
    ms: 0,
    branch: "",
    sha: base,
    changedLines: 0,
    lastText: "",
  });

  const skipSeat = async (seat: ExpandedSeat, reason: string): Promise<Receipt> => {
    await ledgerCall(api, ["skip-seat", "--target", assayId, "--seat", seat.runId, "--reason", reason]);
    setStage(seat.runId, "skipped");
    const seatDir = join(runDir, seat.runId);
    mkdirSync(seatDir, { recursive: true });
    const receipt = { ...blank(seat), gradeOutput: reason };
    writeFileSync(join(seatDir, "receipt.json"), JSON.stringify(receipt, null, 2));
    if (!reason.startsWith("not needed")) console.log(line(receipt));
    return receipt;
  };

  const runSeat = async (seat: ExpandedSeat): Promise<Receipt> => {
    const started = Date.now();
    const seatDir = join(runDir, seat.runId);
    const worktree = join(seatDir, "repo");
    const branch = `seat/${seat.runId}`;
    const empty = blank(seat);
    mkdirSync(seatDir, { recursive: true });

    const claim = await claimInOrder(seat);
    if (!claim.ok) {
      const reason = claim.error.includes("OverBudget")
        ? "not started: over budget"
        : claim.error.slice(0, 120);
      await ledgerCall(api, ["skip-seat", "--target", assayId, "--seat", seat.runId, "--reason", reason]);
      setStage(seat.runId, "skipped");
      const receipt = { ...empty, gradeOutput: reason, ms: Date.now() - started };
      writeFileSync(join(seatDir, "receipt.json"), JSON.stringify(receipt, null, 2));
      console.log(line(receipt));
      return receipt;
    }

    await addWorktree(repo, worktree, base, branch);
    mkdirSync(join(seatDir, "agent"), { recursive: true });
    writeFileSync(join(seatDir, "agent", "settings.json"), JSON.stringify({ packages: [], extensions: [] }));
    const prompt = readFileSync(resolve(planDir, seat.task), "utf8");
    const agent = startAgent({
      command: sandboxed(piCommand(plan, seat), hidden),
      cwd: worktree,
      env: {
        ...(process.env as Record<string, string>),
        ...tokens,
        PI_CODING_AGENT_DIR: join(seatDir, "agent"),
        ASSAY_WORKSPACE: worktree,
        ASSAY_WRITABLE: seat.writable.join(","),
      },
      prompt,
      eventsFile: join(seatDir, "events.jsonl"),
      capUsd: plan.worstCaseUsdPerSeat,
      minutes: plan.minutesPerSeat ?? 10,
    });
    const entry = live.get(seat.runId);
    if (entry) entry.agent = agent;
    setStage(seat.runId, "working");

    const end = await agent.done;
    const usage = agent.usage();
    const { sha } = await commitSeat(worktree, seat.runId);
    const changedLines = await diffStat(worktree, base);
    setStage(seat.runId, end.state);

    await ledgerMust(api, [
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
      end.state,
      "--turns",
      String(usage.turns),
      "--steers",
      String(agent.steers()),
      "--spent-micro-usd",
      String(microUsd(usage.usd)),
    ]);

    const gradeDir = join(seatDir, "grade");
    await addWorktree(repo, gradeDir, sha, `grade/${seat.runId}`);
    const graded =
      end.state === "died"
        ? { out: "", err: "agent died", code: 1 }
        : await shell(seat.grade, gradeDir, { ASSAY_PLAN_DIR: planDir }, 5);
    const passed = end.state === "stopped" && graded.code === 0;
    const gradeOutput = `${graded.out}${graded.err}`.trim().slice(-400);
    if (end.state !== "died") {
      const reason =
        end.state === "killed"
          ? `killed by ${end.killedBy}`
          : gradeOutput.split("\n").slice(-3).join(" ").slice(0, 200) || (passed ? "pass" : "fail");
      await ledgerMust(api, [
        "record-grade",
        "--target",
        `${assayId}/${seat.runId}`,
        "--passed",
        String(passed),
        "--reason",
        reason,
      ]);
    }
    setStage(seat.runId, passed ? "passed" : "failed", passed);

    const receipt: Receipt = {
      ...empty,
      outcome: end.state,
      killedBy: end.killedBy,
      passed,
      gradeOutput,
      turns: usage.turns,
      toolCalls: usage.toolCalls,
      steers: agent.steers(),
      usd: Math.round(usage.usd * 10000) / 10000,
      ms: Date.now() - started,
      branch,
      sha,
      changedLines,
      lastText: usage.lastText,
    };
    writeFileSync(join(seatDir, "receipt.json"), JSON.stringify(receipt, null, 2));
    console.log(line(receipt));
    return receipt;
  };

  try {
    await ledgerMust(api, [
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
      `fleet ${assayId}: ${seats.length} agents, ${plan.parallel ?? 4} at a time, model ${plan.model}, control ${control.url}`,
    );
    const receipts: Receipt[] = [];
    const passedTasks = new Set<string>();
    for (let round = 1; round <= roundsOf(plan); round++) {
      const inRound = seats.filter((seat) => seat.round === round);
      const needed = inRound.filter((seat) => !passedTasks.has(seat.id));
      for (const seat of inRound.filter((each) => passedTasks.has(each.id))) {
        receipts.push(await skipSeat(seat, "not needed: task already passed"));
      }
      if (needed.length === 0) continue;
      if (round > 1)
        console.log(`round ${round}: retrying ${[...new Set(needed.map((seat) => seat.id))].join(", ")}`);
      const results = await pool(
        needed.map((seat) => () => runSeat(seat)),
        plan.parallel ?? 4,
      );
      receipts.push(...results);
      for (const receipt of results) if (receipt.passed) passedTasks.add(receipt.task);
      const broke = results.every((receipt) => receipt.gradeOutput === "not started: over budget");
      if (broke && round < roundsOf(plan)) {
        console.log(`stopped after round ${round}: budget spent`);
        for (const seat of seats.filter((each) => each.round > round)) {
          receipts.push(await skipSeat(seat, "not needed: budget spent"));
        }
        break;
      }
    }
    await Bun.sleep(300);
    const score = await ledgerMust(api, ["assay-score", "get", "--key", assayId]);
    const summary: FleetSummary = { assayId, planHash, base, runDir, score, receipts };
    writeFileSync(
      join(runDir, "fleet.json"),
      JSON.stringify({ ...summary, planDir, test: plan.test ?? "" }, null, 2),
    );
    const ran = receipts.filter((receipt) => !receipt.gradeOutput.startsWith("not needed"));
    const passed = ran.filter((receipt) => receipt.passed).length;
    const spent = receipts.reduce((total, receipt) => total + receipt.usd, 0);
    const tasks = new Set(receipts.map((receipt) => receipt.task));
    const tasksPassed = new Set(receipts.filter((receipt) => receipt.passed).map((receipt) => receipt.task));
    console.log(
      `done: ${tasksPassed.size}/${tasks.size} tasks passed, ${passed}/${ran.length} agents passed, $${spent.toFixed(4)} spent, run in ${runDir}`,
    );
    return summary;
  } finally {
    control.stop();
    ledger.kill();
  }
};
