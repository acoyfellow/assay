import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { AssayId } from "./Assay.id.ts";
import { UnknownSeat } from "./ClaimSeat.command.ts";
import { NotRunning } from "./NotRunning.rejection.ts";

export class SeatSkipped extends Domain.Event("SeatSkipped", {
  seat: Schema.String,
  reason: Schema.String,
  finished: Schema.Boolean,
}) {}

export class NotOpen extends Domain.Rejection(
  "NotOpen",
  { seat: Schema.String },
  { description: "Only a seat that was never claimed can be skipped." },
) {}

export class SkipSeat extends Domain.Command(
  "SkipSeat",
  {
    target: AssayId,
    input: { seat: Schema.String, reason: Schema.String },
    events: [SeatSkipped],
    rejects: [NotRunning, UnknownSeat, NotOpen],
  },
  {
    description:
      "Mark a seat that will never start, for example because its worst case no longer fits the budget. It counts as not passed and spends nothing.",
  },
) {}
