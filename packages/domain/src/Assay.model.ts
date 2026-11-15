import * as Domain from "@alchemy.run/domain";
import * as Layer from "effect/Layer";
import { Assay } from "./Assay/Assay.aggregate.ts";
import { AssayScore } from "./Assay/AssayScore.view.ts";
import { Seat } from "./Seat/Seat.aggregate.ts";
import { SeatSettlement, SeatSettlementLive } from "./Seat/SeatSettlement.policy.ts";

export class AssayModel extends Domain.Model("Assay", {
  aggregates: [Assay, Seat],
  views: [AssayScore],
  policies: [SeatSettlement],
}) {}

export const AssayHandlers = Layer.mergeAll(SeatSettlementLive);
