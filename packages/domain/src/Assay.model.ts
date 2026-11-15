import * as Domain from "@alchemy.run/domain";
import * as Layer from "effect/Layer";
import { Assay } from "./Assay/Assay.aggregate.ts";
import { AssayScore } from "./Assay/AssayScore.view.ts";
import { Seat } from "./Seat/Seat.aggregate.ts";
import { SeatSettlement, SeatSettlementLive } from "./Seat/SeatSettlement.policy.ts";
import { SeatStatus } from "./Seat/SeatStatus.view.ts";

export class AssayModel extends Domain.Model("Assay", {
  aggregates: [Assay, Seat],
  views: [AssayScore, SeatStatus],
  policies: [SeatSettlement],
}) {}

export const AssayHandlers = Layer.mergeAll(SeatSettlementLive);
