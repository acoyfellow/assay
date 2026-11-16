import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { MicroUsd } from "../Money.ts";
import { Seat } from "./Seat.aggregate.ts";

export class SeatStatus extends Domain.View(
  "SeatStatus",
  {
    from: [Seat],
    key: Seat,
    state: Schema.Struct({
      stage: Schema.Literals(["waiting", "died", "stopped", "killed", "graded"]),
      attempts: Schema.Int,
      turns: Schema.Int,
      steers: Schema.Int,
      spentMicroUsd: MicroUsd,
      passed: Schema.NullOr(Schema.Boolean),
      reason: Schema.String,
    }),
    initial: {
      stage: "waiting",
      attempts: 0,
      turns: 0,
      steers: 0,
      spentMicroUsd: 0,
      passed: null,
      reason: "",
    },
    evolve: {
      ReceiptRecorded: (status, event) => ({
        ...status,
        stage: event.outcome,
        attempts: status.attempts + 1,
        turns: status.turns + event.turns,
        steers: status.steers + event.steers,
        spentMicroUsd: event.totalSpentMicroUsd,
      }),
      SeatGraded: (status, event) => ({
        ...status,
        stage: "graded" as const,
        passed: event.passed,
        reason: event.reason,
      }),
    },
  },
  { description: "One seat: its stage, attempts, turns, spend, and grade. Key is <assayId>/<seat>." },
) {}
