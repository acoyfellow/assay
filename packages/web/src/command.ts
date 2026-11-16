import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Command } from "foldkit";
import { Message } from "./message.ts";

export const installSteps = [
  {
    id: "clone",
    title: "Get the code",
    body: "Needs Bun, Git and Node 22 or later.",
    lines: ["git clone https://github.com/acoyfellow/assay", "cd assay", "bun install"],
  },
  {
    id: "provider",
    title: "Choose a model provider",
    body: "Agents run with Pi. Any provider Pi supports works.",
    lines: ["export ASSAY_PI_PROVIDER=anthropic"],
  },
  {
    id: "run",
    title: "Run the example fleet",
    body: "Six agents, three coding tasks, a hidden test for each. Receipts land in runs/.",
    lines: ["bun packages/fleet/src/cli.ts run examples/tally/plan.json"],
  },
] as const;

export type InstallStepId = (typeof installSteps)[number]["id"];

export const CopyStep = Command.define("CopyStep", {
  args: { step: Schema.String },
  messages: [Message.Copied],
  execute: ({ step }) =>
    Effect.tryPromise(() =>
      navigator.clipboard.writeText(installSteps.find((each) => each.id === step)?.lines.join("\n") ?? ""),
    ).pipe(
      Effect.as(Message.Copied({ step })),
      Effect.orElseSucceed(() => Message.Copied({ step })),
    ),
});
