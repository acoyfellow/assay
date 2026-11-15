import * as Domain from "@alchemy.run/domain";

export class NotRunning extends Domain.Rejection(
  "NotRunning",
  {},
  { description: "The assay has not started, or it has already finished." },
) {}
