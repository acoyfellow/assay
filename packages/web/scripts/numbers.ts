import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Receipt = {
  readonly arm: "cli" | "mcp";
  readonly passed: boolean;
  readonly turns: number;
  readonly toolCalls: number;
  readonly microUsd: number;
  readonly ms: number;
};

export type ArmNumbers = {
  readonly arm: "cli" | "mcp";
  readonly passed: number;
  readonly seats: number;
  readonly meanTurns: string;
  readonly meanToolCalls: string;
  readonly meanCost: string;
  readonly meanSeconds: string;
};

const bench = new URL("../../../bench/cli-vs-mcp/", import.meta.url).pathname;

const receiptsIn = (dir: string): ReadonlyArray<Receipt> =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => /^(cli|mcp)-\d+\.json$/.test(file))
        .map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")))
    : [];

const mean = (values: ReadonlyArray<number>) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const armsOf = (receipts: ReadonlyArray<Receipt>): ReadonlyArray<ArmNumbers> =>
  (["cli", "mcp"] as const).map((arm) => {
    const mine = receipts.filter((receipt) => receipt.arm === arm);
    return {
      arm,
      passed: mine.filter((receipt) => receipt.passed).length,
      seats: mine.length,
      meanTurns: mean(mine.map((receipt) => receipt.turns)).toFixed(1),
      meanToolCalls: mean(mine.map((receipt) => receipt.toolCalls)).toFixed(1),
      meanCost: `$${(mean(mine.map((receipt) => receipt.microUsd)) / 1e6).toFixed(4)}`,
      meanSeconds: `${mean(mine.map((receipt) => receipt.ms / 1000)).toFixed(0)}s`,
    };
  });

const run1 = receiptsIn(join(bench, "receipts-run1"));
const run2 = receiptsIn(join(bench, "receipts"));
const totalUsd = (receipts: ReadonlyArray<Receipt>) =>
  `$${(receipts.reduce((sum, receipt) => sum + receipt.microUsd, 0) / 1e6).toFixed(2)}`;

type FleetReceipt = { seat: string; passed: boolean; turns: number; usd: number; ms: number };
const fleetRun = JSON.parse(
  readFileSync(new URL("../../../examples/tally/receipts/assay.json", import.meta.url), "utf8"),
) as { receipts: FleetReceipt[] };
const tallyPlan = JSON.parse(
  readFileSync(new URL("../../../examples/tally/plan-real.json", import.meta.url), "utf8"),
) as { budgetUsd: number; worstCaseUsdPerSeat: number };
const fleet = {
  model: "haiku-5.5",
  budgetUsd: tallyPlan.budgetUsd,
  worstCaseUsdPerSeat: tallyPlan.worstCaseUsdPerSeat,
  agents: fleetRun.receipts.length,
  passed: fleetRun.receipts.filter((receipt) => receipt.passed).length,
  usd: `$${fleetRun.receipts.reduce((sum, receipt) => sum + receipt.usd, 0).toFixed(2)}`,
  seconds: Math.round(Math.max(...fleetRun.receipts.map((receipt) => receipt.ms)) / 1000),
  seats: fleetRun.receipts.map((receipt) => ({
    seat: receipt.seat,
    passed: receipt.passed,
    turns: receipt.turns,
    cost: `$${receipt.usd.toFixed(4)}`,
    seconds: Math.round(receipt.ms / 1000),
  })),
};

const numbers = {
  model: "Claude Haiku 4.5",
  harness: "Pi",
  seatsPerArm: run2.filter((receipt) => receipt.arm === "cli").length,
  run1: { arms: armsOf(run1), total: totalUsd(run1) },
  run2: { arms: armsOf(run2), total: totalUsd(run2) },
  fleet,
};

writeFileSync(new URL("../src/numbers.json", import.meta.url), `${JSON.stringify(numbers, null, 2)}\n`);
console.log(`numbers: run1 ${run1.length} receipts, run2 ${run2.length} receipts`);
