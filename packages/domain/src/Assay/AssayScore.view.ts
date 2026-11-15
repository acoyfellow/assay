import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { MicroUsd } from "../Money.ts";
import { Assay } from "./Assay.aggregate.ts";

export class AssayScore extends Domain.View(
  "AssayScore",
  {
    from: [Assay],
    key: Assay,
    state: Schema.Struct({
      planHash: Schema.String,
      seats: Schema.Int,
      graded: Schema.Int,
      passed: Schema.Int,
      spentMicroUsd: MicroUsd,
      budgetMicroUsd: MicroUsd,
      status: Schema.Literals(["unstarted", "running", "finished", "cancelled"]),
    }),
    initial: {
      planHash: "",
      seats: 0,
      graded: 0,
      passed: 0,
      spentMicroUsd: 0,
      budgetMicroUsd: 0,
      status: "unstarted",
    },
    evolve: {
      AssayStarted: (score, event) => ({
        ...score,
        planHash: event.planHash,
        seats: event.seats.length,
        budgetMicroUsd: event.budgetMicroUsd,
        status: "running" as const,
      }),
      SeatSettled: (score, event) => ({
        ...score,
        graded: score.graded + 1,
        passed: score.passed + (event.passed ? 1 : 0),
        spentMicroUsd: score.spentMicroUsd + event.spentMicroUsd,
        status: event.finished ? ("finished" as const) : score.status,
      }),
      AssayCancelled: (score) => ({ ...score, status: "cancelled" as const }),
    },
  },
  { description: "How an assay is going: seats graded, seats passed, and money spent against the budget." },
) {}
