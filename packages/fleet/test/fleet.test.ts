import { strict as assert } from "node:assert";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFleet } from "../src/run.ts";

const here = new URL(".", import.meta.url).pathname;
const example = join(here, "../../../examples/tally");
const work = mkdtempSync(join(tmpdir(), "assay-fleet-test-"));
cpSync(example, join(work, "tally"), { recursive: true });
const plan = {
  name: "fake",
  repo: "seed",
  model: "fake-model",
  parallel: 2,
  minutesPerSeat: 1,
  worstCaseUsdPerSeat: 0.1,
  budgetUsd: 1,
  seats: [
    {
      id: "cart-merge",
      task: "tasks/cart-merge.md",
      writable: ["src/cart.ts"],
      grade: 'sh "$ASSAY_PLAN_DIR/grade.sh" cart-merge',
    },
    {
      id: "catalog-search",
      task: "tasks/catalog-search.md",
      writable: ["src/catalog.ts"],
      grade: 'sh "$ASSAY_PLAN_DIR/grade.sh" catalog-search',
    },
  ],
};
const planPath = join(work, "tally", "fake-plan.json");
writeFileSync(planPath, JSON.stringify(plan));

process.env.ASSAY_PI_BIN = join(here, "fake/pi");
process.env.FAKE_FIX_DIR = join(here, "../../../examples/tally/reference");
process.env.ASSAY_PI_PROVIDER = "fake";

const summary = await runFleet(planPath, join(work, "runs"));
const bySeat = Object.fromEntries(summary.receipts.map((receipt) => [receipt.seat, receipt.passed]));
assert.equal(bySeat["cart-merge"], true, "the fixed copy must pass the hidden tests");
assert.equal(bySeat["catalog-search"], false, "the untouched copy must fail the hidden tests");
const score = summary.score as { seats: number; graded: number; passed: number; status: string };
assert.deepEqual([score.seats, score.graded, score.passed, score.status], [2, 2, 1, "finished"]);
console.log("fleet ok: fixed copy passed, untouched copy failed, ledger score matches");
