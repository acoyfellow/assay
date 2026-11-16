import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodePlan, expandRound, type Plan, roundsOf } from "../../runner/src/Plan.ts";

export type Phase = "idle" | "drafting" | "carded" | "running" | "landed" | "off";

export type Card = {
  readonly plan: string;
  readonly name: string;
  readonly model: string;
  readonly tasks: ReadonlyArray<{
    readonly id: string;
    readonly writable: ReadonlyArray<string>;
    readonly model: string;
  }>;
  readonly agentsPerRound: number;
  readonly rounds: number;
  readonly parallel: number;
  readonly worstCaseUsdPerAgent: number;
  readonly worstCaseUsd: number;
  readonly budgetUsd: number;
  readonly hidden: ReadonlyArray<string>;
  readonly landTest: string;
  readonly graders: { readonly passed: boolean; readonly lines: ReadonlyArray<string> };
  readonly keys: "relay" | "direct" | "missing";
};

export const keysOf = (env: Record<string, string | undefined>): Card["keys"] =>
  env.ASSAY_UPSTREAM_URL ? "relay" : env.ASSAY_DIRECT_PROVIDER === "1" ? "direct" : "missing";

const keysLine = (keys: Card["keys"]) =>
  keys === "relay"
    ? "held by assay. Agents get a seat key that only works through the relay"
    : keys === "direct"
      ? "WARNING: agents use their own provider login (ASSAY_DIRECT_PROVIDER=1)"
      : "NO RELAY. Set ASSAY_UPSTREAM_URL and ASSAY_UPSTREAM_TOKEN_COMMAND before go";

const canGo = (card: Card) => card.graders.passed && card.keys !== "missing";

export type SeatRow = {
  readonly seat: string;
  readonly task: string;
  readonly stage: string;
  readonly turns: number;
  readonly usd: number;
  readonly steers: number;
  readonly lastTool: string;
};

export type LandResult = {
  readonly branch: string;
  readonly landed: number;
  readonly tasks: ReadonlyArray<{ task: string; applied: boolean; reason: string }>;
  readonly test: { command: string; passed: boolean };
  readonly repo: string;
};

export type ModeEvent =
  | { readonly kind: "card"; readonly card: Card }
  | { readonly kind: "line"; readonly text: string }
  | { readonly kind: "landed"; readonly land: LandResult | null; readonly summary: string }
  | { readonly kind: "off" };

export type ModeOptions = {
  readonly root: string;
  readonly home: string;
  readonly env?: Record<string, string>;
  readonly onEvent?: (event: ModeEvent) => void;
};

type Run = { child: ChildProcess; out: string; runDir: string; exited: Promise<number> };

const money = (usd: number) => `$${usd.toFixed(2)}`;

const capture = (command: string, args: ReadonlyArray<string>, cwd: string, env: NodeJS.ProcessEnv) =>
  new Promise<{ code: number; out: string }>((done) => {
    const child = spawn(command, [...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      out += chunk;
    });
    child.on("close", (code) => done({ code: code ?? 1, out }));
  });

export const worstCase = (plan: Plan) => {
  const perRound = expandRound(plan, 1).length * plan.worstCaseUsdPerSeat;
  return Math.min(plan.budgetUsd, perRound * roundsOf(plan));
};

export const renderCard = (card: Card) =>
  [
    `ASSAY CONTRACT · ${card.name}`,
    "",
    ...card.tasks.map(
      (task) =>
        `  task ${task.id.padEnd(20)} writes ${task.writable.join(", ")}${task.model !== card.model ? `  (${task.model})` : ""}`,
    ),
    "",
    `  agents     ${card.agentsPerRound} per round, ${card.parallel} at a time, model ${card.model}`,
    `  rounds     ${card.rounds} (failed tasks run again while budget is left)`,
    `  cost       at most ${money(card.worstCaseUsd)} (budget ${money(card.budgetUsd)}, ${money(card.worstCaseUsdPerAgent)} cap per agent)`,
    `  hidden     ${card.hidden.length ? card.hidden.join(", ") : "nothing. Agents can read every file"}`,
    `  land test  ${card.landTest || "none"}`,
    `  keys       ${keysLine(card.keys)}`,
    `  graders    ${card.graders.passed ? "proven: untouched repo fails, known good fix passes" : "NOT PROVEN, fix before go"}`,
    "",
    canGo(card)
      ? "Type go to start. Nothing runs before that."
      : card.graders.passed
        ? "go is locked until the relay is set up."
        : "go is locked until the graders are proven.",
  ].join("\n");

export const createMode = (options: ModeOptions) => {
  const emit = options.onEvent ?? (() => {});
  const env = { ...process.env, ...options.env, ASSAY_HOME: options.home };
  const runnerCli = join(options.root, "packages/runner/src/cli.ts");
  const recipesTest = join(options.root, "packages/runner/test/recipes.test.ts");
  let phase: Phase = "idle";
  let card: Card | null = null;
  let run: Run | null = null;
  let landResult: LandResult | null = null;

  const controlUrl = () => {
    const file = join(options.home, "current.json");
    if (!existsSync(file)) return null;
    return (JSON.parse(readFileSync(file, "utf8")) as { url: string }).url;
  };

  const control = async (path: string, init?: RequestInit) => {
    const url = controlUrl();
    if (phase !== "running" || !url)
      return { ok: false, body: { error: `no assay is running (phase ${phase})` } };
    const response = await fetch(`${url}${path}`, init).catch(() => null);
    if (!response) return { ok: false, body: { error: "the assay is not answering" } };
    return { ok: response.ok, body: (await response.json()) as unknown };
  };

  const post = (path: string, message?: string) =>
    control(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message ? { message } : {}),
    });

  const start = () => {
    if (phase === "off") return { ok: false, reason: "assay mode is off. Start again with /assay." };
    phase = "drafting";
    card = null;
    return { ok: true, reason: "" };
  };

  const prepare = async (planPath: string) => {
    if (phase === "off" || phase === "running")
      return { ok: false, text: `cannot draw a card while ${phase}` };
    const planFile = resolve(planPath);
    if (!existsSync(planFile)) return { ok: false, text: `no plan at ${planFile}` };
    let plan: Plan;
    try {
      plan = decodePlan(JSON.parse(readFileSync(planFile, "utf8")));
    } catch (error) {
      return { ok: false, text: `plan does not decode: ${(error as Error).message.slice(0, 400)}` };
    }
    const proof = await capture("bun", [recipesTest, planFile], options.root, env);
    const lines = proof.out.split("\n").filter((line) => /^(PASS|FAIL)/.test(line));
    card = {
      plan: planFile,
      name: plan.name,
      model: plan.model,
      tasks: plan.seats.map((seat) => ({
        id: seat.id,
        writable: seat.writable,
        model: seat.model ?? plan.model,
      })),
      agentsPerRound: expandRound(plan, 1).length,
      rounds: roundsOf(plan),
      parallel: plan.parallel ?? 4,
      worstCaseUsdPerAgent: plan.worstCaseUsdPerSeat,
      worstCaseUsd: worstCase(plan),
      budgetUsd: plan.budgetUsd,
      hidden: plan.hidden ?? [],
      landTest: plan.test ?? "",
      graders: { passed: proof.code === 0, lines },
      keys: keysOf(env),
    };
    phase = "carded";
    emit({ kind: "card", card });
    return { ok: true, text: renderCard(card) };
  };

  const finish = async (code: number) => {
    const current = run;
    if (!current || phase !== "running") return;
    const summary =
      current.out.split("\n").find((line) => line.startsWith("done:")) ?? `assay exited ${code}`;
    if (!existsSync(join(current.runDir, "assay.json"))) {
      phase = "landed";
      emit({ kind: "landed", land: null, summary });
      return;
    }
    await capture("bun", [runnerCli, "land", current.runDir], options.root, env);
    const landFile = join(current.runDir, "land.json");
    landResult = existsSync(landFile)
      ? {
          ...(JSON.parse(readFileSync(landFile, "utf8")) as LandResult),
          repo: join(current.runDir, "repo.git"),
        }
      : null;
    phase = "landed";
    emit({ kind: "landed", land: landResult, summary });
  };

  const go = () => {
    if (phase !== "carded" || !card)
      return { ok: false, reason: `nothing to start (phase ${phase}). Draw a card first.` };
    if (!card.graders.passed)
      return { ok: false, reason: "the graders are not proven. Fix them and draw the card again." };
    if (card.keys === "missing")
      return {
        ok: false,
        reason:
          "no model relay, so agents would need a key. Set ASSAY_UPSTREAM_URL and ASSAY_UPSTREAM_TOKEN_COMMAND.",
      };
    const out = join(options.home, "runs");
    mkdirSync(out, { recursive: true });
    const child = spawn("bun", [runnerCli, "run", card.plan, "--out", out], {
      cwd: options.root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const current: Run = {
      child,
      out: "",
      runDir: "",
      exited: new Promise((done) => child.on("close", (code) => done(code ?? 1))),
    };
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      current.out += text;
      for (const line of text.split("\n").filter(Boolean)) {
        const runDir = line.match(/run in (.+)$/)?.[1];
        if (runDir) current.runDir = runDir.trim();
        const fleet = line.match(/^assay (\S+):/)?.[1];
        if (fleet && !current.runDir) current.runDir = join(out, fleet);
        emit({ kind: "line", text: line });
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    run = current;
    phase = "running";
    current.exited.then(finish);
    return { ok: true, reason: "" };
  };

  const ps = async () => {
    const reply = await control("/seats");
    return reply.ok ? ((reply.body as { seats: SeatRow[] }).seats ?? []) : reply.body;
  };

  const steer = async (seat: string, message: string) =>
    seat === "all" ? post("/steer", message) : post(`/seats/${encodeURIComponent(seat)}/steer`, message);

  const kill = async (seat: string) => post(`/seats/${encodeURIComponent(seat)}/kill`);

  const off = async () => {
    const current = run;
    phase = "off";
    if (current && current.child.exitCode === null) {
      current.child.kill("SIGTERM");
      await current.exited;
    }
    emit({ kind: "off" });
  };

  return {
    phase: () => phase,
    card: () => card,
    land: () => landResult,
    runDir: () => run?.runDir ?? "",
    output: () => run?.out ?? "",
    done: () => run?.exited ?? Promise.resolve(0),
    start,
    prepare,
    go,
    ps,
    steer,
    kill,
    off,
  };
};

export type Mode = ReturnType<typeof createMode>;
