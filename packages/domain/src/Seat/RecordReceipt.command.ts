import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { AssayId } from "../Assay/Assay.id.ts";
import { MicroUsd } from "../Money.ts";
import { SeatId } from "./Seat.id.ts";

export const Outcome = Schema.Literals(["stopped", "died"]);
export type Outcome = typeof Outcome.Type;

export class ReceiptRecorded extends Domain.Event("ReceiptRecorded", {
  assayId: AssayId,
  seat: Schema.String,
  planHash: Schema.String,
  outcome: Outcome,
  turns: Schema.Int,
  spentMicroUsd: MicroUsd,
  totalSpentMicroUsd: MicroUsd,
}) {}

export class AlreadyRecorded extends Domain.Rejection(
  "AlreadyRecorded",
  {},
  { description: "This seat stopped and has its one receipt. Only a seat that died takes another." },
) {}
export class WrongPlan extends Domain.Rejection("WrongPlan", { expected: Schema.String }) {}

export class RecordReceipt extends Domain.Command(
  "RecordReceipt",
  {
    target: SeatId,
    input: {
      assayId: AssayId,
      seat: Schema.String,
      planHash: Schema.String,
      outcome: Outcome,
      turns: Schema.Int,
      spentMicroUsd: MicroUsd,
    },
    events: [ReceiptRecorded],
    rejects: [AlreadyRecorded, WrongPlan],
  },
  { description: "Record what a seat did, written by the runner when the agent stops or dies." },
) {}
