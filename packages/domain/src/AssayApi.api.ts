import * as Domain from "@alchemy.run/domain";
import { AssayModel } from "./Assay.model.ts";

export class AssayApi extends Domain.Api(
  "AssayApi",
  {
    model: AssayModel,
    commands: ["StartAssay", "ClaimSeat", "CancelAssay", "RecordReceipt", "RecordGrade"],
    views: ["AssayScore"],
  },
  {
    description: "Run many agents on one goal and score each with a grader it never sees.",
  },
) {}
