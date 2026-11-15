import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { AssayId } from "./Assay.id.ts";
import { NotRunning } from "./NotRunning.rejection.ts";

export class AssayCancelled extends Domain.Event("AssayCancelled", { reason: Schema.String }) {}

export class CancelAssay extends Domain.Command(
  "CancelAssay",
  {
    target: AssayId,
    input: { reason: Schema.String },
    events: [AssayCancelled],
    rejects: [NotRunning],
  },
  { description: "Stop an assay. Seats not yet claimed are never started." },
) {}
