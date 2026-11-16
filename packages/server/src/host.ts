import * as Domain from "@alchemy.run/domain";
import { AssayHandlers, AssayModel } from "@assay/domain/Assay.model";
import * as Layer from "effect/Layer";

export const calls = [
  "StartAssay",
  "ClaimSeat",
  "SkipSeat",
  "CancelAssay",
  "RecordReceipt",
  "RecordGrade",
  "AssayScore.get",
  "SeatStatus.get",
] as const;

export const AssayInMemory = AssayModel.layer(AssayHandlers).pipe(Layer.provideMerge(Domain.InMemory));
