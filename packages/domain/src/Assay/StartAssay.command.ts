import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { MicroUsd } from "../Money.ts";
import { AssayId } from "./Assay.id.ts";
import { SeatPlan } from "./SeatPlan.ts";

export class AssayStarted extends Domain.Event("AssayStarted", {
  planHash: Schema.String,
  budgetMicroUsd: MicroUsd,
  seats: Schema.Array(SeatPlan),
}) {}

export class AlreadyStarted extends Domain.Rejection("AlreadyStarted", {}) {}
export class NoSeats extends Domain.Rejection("NoSeats", {}) {}
export class NoBudget extends Domain.Rejection("NoBudget", {}) {}
export class DuplicateSeat extends Domain.Rejection("DuplicateSeat", { seat: Schema.String }) {}

export class StartAssay extends Domain.Command(
  "StartAssay",
  {
    target: AssayId,
    input: { planHash: Schema.String, budgetMicroUsd: MicroUsd, seats: Schema.Array(SeatPlan) },
    events: [AssayStarted],
    rejects: [AlreadyStarted, NoSeats, NoBudget, DuplicateSeat],
  },
  { description: "Freeze a plan and a budget, and open its seats to be claimed." },
) {}
