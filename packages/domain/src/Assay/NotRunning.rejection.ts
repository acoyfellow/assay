import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";

export class NotRunning extends Domain.Rejection(
  "NotRunning",
  { hint: Schema.String },
  { description: "No running assay has this id. It has not started, it has finished, or the id is wrong." },
) {}
