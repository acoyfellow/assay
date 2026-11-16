import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Command } from "foldkit";
import { Message } from "./message.ts";

export type OutputTone = "dim" | "pass" | "fail" | "plain" | "command";
export type OutputLine = { readonly text: string; readonly tone: OutputTone };

const out = (tone: OutputTone, text: string): OutputLine => ({ tone, text });

export const installSteps = [
  {
    id: "clone",
    title: "Get the code",
    body: "Needs Bun, Git and Node 22 or later.",
    lines: ["git clone https://github.com/acoyfellow/assay", "cd assay", "bun install"],
    output: [],
  },
  {
    id: "provider",
    title: "Choose a model provider",
    body: "Agents run with Pi. Any provider Pi supports works.",
    lines: ["export ASSAY_PI_PROVIDER=anthropic"],
    output: [],
  },
  {
    id: "run",
    title: "Start the fleet",
    body: "Six agents, three coding tasks, each in its own git worktree. A line prints as each agent stops and its hidden test runs.",
    lines: ["bun packages/fleet/src/cli.ts run examples/tally/plan-real.json"],
    output: [
      out("dim", "fleet tally-real: 6 agents, 6 at a time, model claude-haiku-4-5"),
      out("fail", "catalog-search-1  FAIL   7 turns  $0.0536   38s  steered 1"),
      out("pass", "cart-merge-2      PASS  13 turns  $0.0593   49s"),
      out("pass", "cart-merge-1      PASS  13 turns  $0.0638   55s"),
      out("pass", "discount-cap-1    PASS  18 turns  $0.1370  115s"),
      out("fail", "catalog-search-2  FAIL  17 turns  $0.1502  120s  killed by spend cap"),
      out("fail", "discount-cap-2    FAIL  17 turns  $0.2723  286s  killed by spend cap"),
      out("plain", "done: 3/6 passed, $0.7362 spent"),
    ],
  },
  {
    id: "steer",
    title: "Watch and steer, from a second terminal",
    body: "See every agent while it works. Send one a message mid-task, or stop it. The others keep going.",
    lines: [
      "bun packages/fleet/src/cli.ts ps",
      'bun packages/fleet/src/cli.ts steer catalog-search-1 "run node --test before you stop"',
    ],
    output: [
      out("dim", "seat              stage    turns   spend  last tool"),
      out("plain", "cart-merge-1      working      4  $0.0196  read"),
      out("plain", "catalog-search-1  working      2  $0.0106  read"),
      out("plain", "discount-cap-2    working      4  $0.0186  bash"),
      out("dim", "…"),
      out(
        "command",
        'bun packages/fleet/src/cli.ts steer catalog-search-1 "run node --test before you stop"',
      ),
      out("pass", '{"steered":["catalog-search-1"],"steers":1}'),
    ],
  },
  {
    id: "land",
    title: "Land the work",
    body: "One passing diff per task goes on one branch, then the full test suite runs on it.",
    lines: ["bun packages/fleet/src/cli.ts land runs/tally-real-…"],
    output: [
      out("pass", "LAND  cart-merge      passed, 93 lines, $0.0638"),
      out("fail", "SKIP  catalog-search  no passing seat"),
      out("pass", "LAND  discount-cap    passed, 139 lines, $0.1370"),
      out("plain", "branch assay/tally-real: 2/3 tasks, tests pass"),
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  body: string;
  lines: ReadonlyArray<string>;
  output: ReadonlyArray<OutputLine>;
}>;

const commandsOf = (id: string) => {
  const step = installSteps.find((each) => each.id === id);
  if (!step) return "";
  const later: ReadonlyArray<OutputLine> = step.output;
  return [...step.lines, ...later.filter((line) => line.tone === "command").map((line) => line.text)].join(
    "\n",
  );
};

export type InstallStepId = (typeof installSteps)[number]["id"];

export const CopyStep = Command.define("CopyStep", {
  args: { step: Schema.String },
  messages: [Message.Copied],
  execute: ({ step }) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(commandsOf(step))).pipe(
      Effect.as(Message.Copied({ step })),
      Effect.orElseSucceed(() => Message.Copied({ step })),
    ),
});
