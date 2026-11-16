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
    body: "Agents run with Pi. Set ASSAY_UPSTREAM_URL and ASSAY_UPSTREAM_TOKEN_COMMAND: the relay holds your token and the agents get none. Prefer chat? Run pi -e packages/pi/src/index.ts and type /assay instead of the steps below.",
    lines: ["export ASSAY_PI_PROVIDER=anthropic"],
    output: [],
  },
  {
    id: "run",
    title: "Start the agents",
    body: "Six agents, three coding tasks, each in its own git worktree. A line prints as each agent stops and its hidden test runs.",
    lines: ["bun assay run examples/tally/plan-real.json"],
    output: [
      out("dim", "assay tally-real: 6 agents, hidden tests blocked by sandbox-exec,"),
      out("dim", "  model calls via relay (agents hold no key), model claude-haiku-5-5"),
      out("pass", "catalog-search-2  PASS  7 turns  $0.0356  22s"),
      out("pass", "cart-merge-1      PASS  4 turns  $0.0288  23s"),
      out("pass", "cart-merge-2      PASS  7 turns  $0.0374  24s"),
      out("pass", "discount-cap-1    PASS  5 turns  $0.0398  25s"),
      out("pass", "catalog-search-1  PASS  8 turns  $0.0406  26s"),
      out("pass", "discount-cap-2    PASS  6 turns  $0.0593  39s"),
      out("plain", "done: 3/3 tasks passed, 6/6 agents passed, $0.2415 spent"),
    ],
  },
  {
    id: "steer",
    title: "Watch and steer, from a second terminal",
    body: "See every agent while it works. Send one a message mid-task, or stop it. The others keep going. This output is from an earlier run.",
    lines: ["bun assay status", 'bun assay steer catalog-search-1 "run node --test before you stop"'],
    output: [
      out("dim", "seat              stage    turns   spend  last tool"),
      out("plain", "cart-merge-1      working      4  $0.0196  read"),
      out("plain", "catalog-search-1  working      2  $0.0106  read"),
      out("plain", "discount-cap-2    working      4  $0.0186  bash"),
      out("dim", "…"),
      out("command", 'bun assay steer catalog-search-1 "run node --test before you stop"'),
      out("pass", '{"steered":["catalog-search-1"],"steers":1}'),
    ],
  },
  {
    id: "land",
    title: "Land the work",
    body: "The smallest passing diff per task goes on one branch, then the full test suite runs on it.",
    lines: ["bun assay land runs/tally-real-…"],
    output: [
      out("pass", "LAND  cart-merge      passed, 59 lines, $0.0374"),
      out("pass", "LAND  catalog-search  passed, 49 lines, $0.0406"),
      out("pass", "LAND  discount-cap    passed, 75 lines, $0.0593"),
      out("plain", "branch assay/tally-real: 3/3 tasks, tests pass"),
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
