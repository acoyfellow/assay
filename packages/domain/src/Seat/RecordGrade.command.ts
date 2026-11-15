import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { AssayId } from "../Assay/Assay.id.ts";
import { MicroUsd } from "../Money.ts";
import { SeatId } from "./Seat.id.ts";

export class SeatGraded extends Domain.Event("SeatGraded", {
  assayId: AssayId,
  seat: Schema.String,
  passed: Schema.Boolean,
  reason: Schema.String,
  totalSpentMicroUsd: MicroUsd,
}) {}

export class NoReceipt extends Domain.Rejection(
  "NoReceipt",
  {},
  { description: "Grade a seat only after it stopped with a receipt." },
) {}
export class AlreadyGraded extends Domain.Rejection("AlreadyGraded", {
  passed: Schema.Boolean,
}) {}

export class RecordGrade extends Domain.Command(
  "RecordGrade",
  {
    target: SeatId,
    input: { passed: Schema.Boolean, reason: Schema.String },
    events: [SeatGraded],
    rejects: [NoReceipt, AlreadyGraded],
  },
  { description: "Record the hidden grader's verdict. A seat is graded once." },
) {}
