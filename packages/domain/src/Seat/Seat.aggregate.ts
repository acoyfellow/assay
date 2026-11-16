import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { AssayId } from "../Assay/Assay.id.ts";
import { MicroUsd } from "../Money.ts";
import { AlreadyGraded, NoReceipt, RecordGrade, SeatGraded } from "./RecordGrade.command.ts";
import { AlreadyRecorded, ReceiptRecorded, RecordReceipt, WrongPlan } from "./RecordReceipt.command.ts";
import { SeatId } from "./Seat.id.ts";

const Known = {
  assayId: AssayId,
  seat: Schema.String,
  planHash: Schema.String,
  attempts: Schema.Int,
  totalSpentMicroUsd: MicroUsd,
};

export const SeatState = Schema.Union([
  Schema.TaggedStruct("Waiting", {}),
  Schema.TaggedStruct("Died", Known),
  Schema.TaggedStruct("Stopped", Known),
  Schema.TaggedStruct("Graded", { ...Known, passed: Schema.Boolean }),
]);
export type SeatState = typeof SeatState.Type;

const spentSoFar = (seat: SeatState): number => (seat._tag === "Waiting" ? 0 : seat.totalSpentMicroUsd);
const attemptsSoFar = (seat: SeatState): number => (seat._tag === "Waiting" ? 0 : seat.attempts);

export class Seat extends Domain.Aggregate("Seat", {
  id: SeatId,
  state: SeatState,
  initial: { _tag: "Waiting" },
  commands: [RecordReceipt, RecordGrade],
  decide: {
    RecordReceipt: (seat, cmd) => {
      if (seat._tag === "Stopped" || seat._tag === "Graded") return new AlreadyRecorded();
      if (seat._tag === "Died" && seat.planHash !== cmd.planHash) {
        return new WrongPlan({ expected: seat.planHash });
      }
      return [
        new ReceiptRecorded({
          assayId: cmd.assayId,
          seat: cmd.seat,
          planHash: cmd.planHash,
          outcome: cmd.outcome,
          turns: cmd.turns,
          steers: cmd.steers ?? 0,
          spentMicroUsd: cmd.spentMicroUsd,
          totalSpentMicroUsd: spentSoFar(seat) + cmd.spentMicroUsd,
        }),
      ];
    },
    RecordGrade: (seat, cmd) => {
      if (seat._tag === "Graded") return new AlreadyGraded({ passed: seat.passed });
      if (seat._tag !== "Stopped") return new NoReceipt();
      return [
        new SeatGraded({
          assayId: seat.assayId,
          seat: seat.seat,
          passed: cmd.passed,
          reason: cmd.reason,
          totalSpentMicroUsd: seat.totalSpentMicroUsd,
        }),
      ];
    },
  },
  evolve: {
    ReceiptRecorded: (seat, event) => ({
      _tag: event.outcome === "died" ? ("Died" as const) : ("Stopped" as const),
      assayId: event.assayId,
      seat: event.seat,
      planHash: event.planHash,
      attempts: attemptsSoFar(seat) + 1,
      totalSpentMicroUsd: event.totalSpentMicroUsd,
    }),
    SeatGraded: (seat, event) =>
      seat._tag === "Stopped" ? { ...seat, _tag: "Graded" as const, passed: event.passed } : seat,
  },
}) {}
