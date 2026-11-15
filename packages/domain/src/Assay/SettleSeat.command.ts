import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { MicroUsd } from "../Money.ts";
import { AssayId } from "./Assay.id.ts";
import { NotRunning } from "./NotRunning.rejection.ts";

export class SeatSettled extends Domain.Event("SeatSettled", {
  seat: Schema.String,
  spentMicroUsd: MicroUsd,
  passed: Schema.Boolean,
  finished: Schema.Boolean,
}) {}

export class NotClaimed extends Domain.Rejection("NotClaimed", { seat: Schema.String }) {}

export class SettleSeat extends Domain.Command(
  "SettleSeat",
  {
    target: AssayId,
    input: { seat: Schema.String, spentMicroUsd: MicroUsd, passed: Schema.Boolean },
    events: [SeatSettled],
    rejects: [NotRunning, NotClaimed],
  },
  { description: "Release a graded seat's reservation and charge what it really spent." },
) {}
