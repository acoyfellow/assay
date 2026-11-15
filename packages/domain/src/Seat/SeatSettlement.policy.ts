import * as Domain from "@alchemy.run/domain";
import * as Effect from "effect/Effect";
import { Assay } from "../Assay/Assay.aggregate.ts";
import { SettleSeat } from "../Assay/SettleSeat.command.ts";
import { SeatGraded } from "./RecordGrade.command.ts";
import { Seat } from "./Seat.aggregate.ts";

export class SeatSettlement extends Domain.Policy(
  "SeatSettlement",
  { from: Seat, on: [SeatGraded] },
  { description: "When a seat is graded, charge its real spend to the assay and count its grade." },
) {}

export const SeatSettlementLive = SeatSettlement.toLayer(
  Effect.gen(function* () {
    const assays = yield* Assay;
    return Effect.fn(function* ({ event }) {
      yield* assays
        .send(
          event.assayId,
          new SettleSeat({ seat: event.seat, spentMicroUsd: event.totalSpentMicroUsd, passed: event.passed }),
        )
        .pipe(Effect.catchTag(["NotClaimed", "NotRunning"], () => Effect.void));
    });
  }),
);
