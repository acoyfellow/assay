import * as Domain from "@alchemy.run/domain";
import { AssayModel } from "./Assay.model.ts";

export class AssayApi extends Domain.Api(
  "AssayApi",
  {
    model: AssayModel,
    commands: ["StartAssay", "ClaimSeat", "SkipSeat", "CancelAssay", "RecordReceipt", "RecordGrade"],
    views: ["AssayScore", "SeatStatus"],
  },
  {
    description:
      "The books for a fleet of coding agents: budget holds, one receipt and one hidden grade per agent, and the score.",
  },
) {}
