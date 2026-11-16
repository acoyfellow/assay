import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { decodePlan, expandSeats } from "../src/Plan.ts";

const plan = decodePlan(
  JSON.parse(readFileSync(new URL("../../../examples/tally/plan.json", import.meta.url), "utf8")),
);
const seats = expandSeats(plan);
assert.equal(seats.length, plan.seats.length * (plan.repeat ?? 1));
assert.equal(new Set(seats.map((seat) => seat.runId)).size, seats.length);
assert.throws(() => decodePlan({ name: "x" }));
console.log(`plan ok: ${seats.length} seats`);
