import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { MicroUsd } from "../Money.ts";
import { AssayId } from "./Assay.id.ts";
import { NotRunning } from "./NotRunning.rejection.ts";

export class SeatClaimed extends Domain.Event("SeatClaimed", {
  seat: Schema.String,
  runner: Schema.String,
  reservedMicroUsd: MicroUsd,
}) {}

export class UnknownSeat extends Domain.Rejection("UnknownSeat", {
  seat: Schema.String,
}) {}
export class AlreadyClaimed extends Domain.Rejection("AlreadyClaimed", {
  runner: Schema.String,
}) {}
export class OverBudget extends Domain.Rejection("OverBudget", {
  remainingMicroUsd: MicroUsd,
  neededMicroUsd: MicroUsd,
}) {}

export class ClaimSeat extends Domain.Command(
  "ClaimSeat",
  {
    target: AssayId,
    input: { seat: Schema.String, runner: Schema.String },
    events: [SeatClaimed],
    rejects: [NotRunning, UnknownSeat, AlreadyClaimed, OverBudget],
    reply: { reservedMicroUsd: MicroUsd },
  },
  {
    description: "Reserve a seat's worst-case cost from the budget so a runner may start it.",
  },
) {}
