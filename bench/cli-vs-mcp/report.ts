import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Receipt = {
  readonly arm: "cli" | "mcp";
  readonly seat: string;
  readonly outcome: string;
  readonly passed: boolean;
  readonly reason: string;
  readonly turns: number;
  readonly toolCalls: number;
  readonly microUsd: number;
  readonly ms: number;
};
type Score = { readonly seats: number; readonly graded: number; readonly passed: number; readonly spentMicroUsd: number };

const here = new URL(".", import.meta.url).pathname;
const seatsPerArm = Number(process.env.SEATS ?? 5);
const maxMicroUsd = 2_000_000;
const problems: Array<string> = [];

const receiptsDir = join(here, "receipts");
const receipts: ReadonlyArray<Receipt> = existsSync(receiptsDir)
  ? readdirSync(receiptsDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => JSON.parse(readFileSync(join(receiptsDir, file), "utf8")))
  : [];
const ledgerFile = join(here, "ledger-scores.json");
const ledger: { scores: Record<string, Score> } = existsSync(ledgerFile)
  ? JSON.parse(readFileSync(ledgerFile, "utf8"))
  : { scores: {} };

const usd = (micro: number) => `$${(micro / 1e6).toFixed(4)}`;
const mean = (values: ReadonlyArray<number>) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

const rows = (["cli", "mcp"] as const).map((arm) => {
  const mine = receipts.filter((receipt) => receipt.arm === arm);
  const stopped = mine.filter((receipt) => receipt.outcome === "stopped");
  const recomputed = {
    graded: stopped.length,
    passed: mine.filter((receipt) => receipt.passed).length,
    spentMicroUsd: stopped.reduce((sum, receipt) => sum + receipt.microUsd, 0),
  };
  const score = ledger.scores[arm];
  if (mine.length !== seatsPerArm) problems.push(`${arm}: ${mine.length} receipts, want ${seatsPerArm}`);
  if (stopped.length !== mine.length) problems.push(`${arm}: ${mine.length - stopped.length} seats died and have no grade`);
  if (score === undefined) problems.push(`${arm}: no AssayScore in the ledger`);
  else
    for (const field of ["graded", "passed", "spentMicroUsd"] as const)
      if (score[field] !== recomputed[field])
        problems.push(`${arm}: AssayScore.${field}=${score[field]} but receipts say ${recomputed[field]}`);
  return {
    arm,
    seats: mine.length,
    passed: recomputed.passed,
    meanTurns: mean(mine.map((receipt) => receipt.turns)),
    meanToolCalls: mean(mine.map((receipt) => receipt.toolCalls)),
    meanMicroUsd: mean(mine.map((receipt) => receipt.microUsd)),
    totalMicroUsd: mine.reduce((sum, receipt) => sum + receipt.microUsd, 0),
    meanSeconds: mean(mine.map((receipt) => receipt.ms / 1000)),
    reasons: mine.filter((receipt) => !receipt.passed).map((receipt) => `${receipt.seat}: ${receipt.reason}`),
  };
});

const benchDir = join(here, "../../.tmp/bench");
type Claim = { readonly first: string | null; readonly recovered: boolean };
const claimOf = (seatDir: string): Claim => {
  const file = join(benchDir, seatDir, "events.jsonl");
  if (!existsSync(file)) return { first: null, recovered: false };
  const targets = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line))
    .filter((event) => event.type === "tool_execution_start")
    .flatMap((event) => {
      const args = event.args ?? {};
      if (String(event.toolName).includes("ClaimSeat")) return [String(args.target)];
      const command = String(args.command ?? "");
      if (!command.includes("claim-seat") || command.includes("--help")) return [];
      const match = command.match(/--target[ =]"?([^\s"\\]+)/);
      return match?.[1] ? [match[1]] : [];
    });
  const first = targets[0] ?? null;
  return { first, recovered: first?.includes("/") === true && targets.some((target) => !target.includes("/")) };
};
const claims = (["cli", "mcp"] as const).map((arm) => {
  const mine = receipts.filter((receipt) => receipt.arm === arm).map((receipt) => claimOf(`${receipt.seat}-try1`));
  const wrongFirst = mine.filter((claim) => claim.first?.includes("/"));
  return `| ${arm} | ${wrongFirst.length}/${mine.length} | ${wrongFirst.filter((claim) => claim.recovered).length}/${wrongFirst.length} |`;
});

const total = rows.reduce((sum, row) => sum + row.totalMicroUsd, 0);
if (total > maxMicroUsd) problems.push(`spend ${usd(total)} is over ${usd(maxMicroUsd)}`);

const table = [
  "| Arm | Passed | Mean turns | Mean tool calls | Mean cost | Total cost | Mean time |",
  "|---|---|---|---|---|---|---|",
  ...rows.map(
    (row) =>
      `| ${row.arm} | ${row.passed}/${row.seats} | ${row.meanTurns.toFixed(1)} | ${row.meanToolCalls.toFixed(1)} | ${usd(row.meanMicroUsd)} | ${usd(row.totalMicroUsd)} | ${row.meanSeconds.toFixed(0)}s |`,
  ),
];

const failures = rows.flatMap((row) => row.reasons.map((reason) => `- ${reason}`));

writeFileSync(
  join(here, "RESULT.md"),
  [
    "# CLI vs MCP: first assay",
    "",
    "Same task, same model (Claude Haiku 4.5 on Pi), same domain Api. Only the surface differs: the `assay` CLI made by `toCli`, or the MCP tools made by `toMcp`.",
    "A hidden grader reads the seat's own assay server after the agent stops. Every receipt and grade is recorded in a separate assay ledger, and its `AssayScore` is checked against the receipts.",
    "",
    ...table,
    "",
    `Total spend: ${usd(total)}.`,
    "",
    "## Failed seats",
    "",
    ...(failures.length ? failures : ["None."]),
    "",
    "## Why seats failed",
    "",
    "The task gives a seat id as `job-7/alpha`. Most seats first sent `ClaimSeat` with that seat id as its target, not the assay id `job-7`. The server refuses it with `NotRunning`, the seats are never charged to the assay, and its score stays at 0 graded.",
    "",
    "| Arm | First claim used a seat id | Then retried with the assay id |",
    "|---|---|---|",
    ...claims,
    "",
    "Both arms made the same first mistake. The difference is recovery: the CLI arm read `assay claim-seat --help` and its exit code, and retried. The MCP arm got `{\"_tag\":\"NotRunning\"}` and moved on. In both surfaces, `target` has no description, and `NotRunning` does not say the target is wrong.",
    "",
    "## What this does not show",
    "",
    `- ${seatsPerArm} seats per arm is a first signal, not a verdict.`,
    "- One task, one model, one harness.",
    "",
  ].join("\n"),
);

console.log(table.join("\n"));
console.log(`total ${usd(total)}`);
if (problems.length) {
  for (const problem of problems) console.log(`PROBLEM ${problem}`);
  process.exit(1);
}
