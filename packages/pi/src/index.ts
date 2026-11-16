import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createMode, type LandResult, type Mode, type ModeEvent, renderCard } from "./mode.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../../..");

const draftBrief = (want: string) =>
  [
    "Assay mode is on. Draft an assay for this: tasks for coding agents, each checked by a test the agent never sees. Then show me the contract card. Do not start it.",
    "Do not do the work yourself. Do not edit the repo's source or tests. The agents do the work. You only write files under assay/.",
    "",
    `What I want: ${want || "see the chat above"}`,
    "",
    "Steps:",
    `1. Read ${join(root, "packages/web/docs/recipes.md")} and pick the closest recipe in ${join(root, "examples/recipes")}.`,
    '2. Write assay/plan.json in this repo, one seat per task, tasks in assay/tasks/, hidden checks in a folder listed in hidden. Set repo to the repo root ("..") unless I say otherwise.',
    "3. Write assay/proof.json with a known good fix per seat (write the fix under assay/reference/).",
    "4. Call the assay_card tool with assay/plan.json. It proves the graders and shows the card.",
    "5. If the card says NOT PROVEN, fix the graders and call assay_card again.",
    "Stop after the card. I will type go.",
  ].join("\n");

const landText = (land: LandResult | null, summary: string) => {
  if (!land) return `Assay finished: ${summary}. Nothing to land.`;
  return [
    `Assay finished: ${summary}`,
    ...land.tasks.map((task) => `  ${task.applied ? "LAND" : "SKIP"} ${task.task}: ${task.reason}`),
    `Branch ${land.branch}: ${land.landed}/${land.tasks.length} tasks, tests ${land.test.passed ? "pass" : "FAIL"}.`,
    `Look: git -C ${land.repo} log --stat ${land.branch}`,
    "Nothing is merged. Assay mode stays on until you type /assay-off.",
  ].join("\n");
};

const text = (value: unknown) => ({
  content: [
    { type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
  ],
  details: {},
});

export default function assayMode(pi: ExtensionAPI) {
  let mode: Mode | null = null;

  const say = (content: string, triggerTurn = false) =>
    pi.sendMessage({ customType: "assay", content, display: true }, { triggerTurn });

  const onEvent = (event: ModeEvent) => {
    if (event.kind === "line" && /PASS|FAIL|SKIP|round|done:/.test(event.text)) say(event.text);
    if (event.kind === "landed") say(landText(event.land, event.summary), true);
  };

  const ensure = () => {
    mode ??= createMode({ root, home: process.env.ASSAY_HOME ?? join(homedir(), ".assay"), onEvent });
    return mode;
  };

  pi.registerCommand("assay", {
    description:
      "Assay mode: draft tasks and hidden tests from the chat, prove the tests, show a contract card. Nothing runs before go.",
    handler: async (args) => {
      const current = ensure();
      if (current.phase() === "off") mode = null;
      const started = ensure().start();
      if (!started.ok) return say(started.reason);
      pi.sendUserMessage(draftBrief(args.trim()));
    },
  });

  pi.registerCommand("assay-off", {
    description: "End assay mode. Stops running agents. Nothing is merged.",
    handler: async () => {
      if (!mode) return say("Assay mode is not on.");
      await mode.off();
      mode = null;
      say("Assay mode is off. Branches stay in the run folder. Nothing was merged.");
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    if (mode?.phase() !== "drafting") return;
    if (event.toolName !== "write" && event.toolName !== "edit") return;
    const path = resolve(ctx.cwd, String((event.input as { path?: unknown }).path ?? ""));
    if (path.startsWith(resolve(ctx.cwd, "assay"))) return;
    return {
      block: true,
      reason: "Assay mode is drafting. Only write under assay/. The agents do the work after go.",
    };
  });

  pi.on("input", async (event) => {
    if (event.source === "extension" || !mode) return { action: "continue" as const };
    if (event.text.trim().toLowerCase() !== "go") return { action: "continue" as const };
    const card = mode.card();
    const started = mode.go();
    if (!started.ok) {
      say(started.reason);
      return { action: "handled" as const };
    }
    say(
      `Started ${card?.name}: ${card?.agentsPerRound} agents, up to ${card?.rounds} rounds, at most $${card?.worstCaseUsd.toFixed(2)}. Ask me to check, steer or stop any agent.`,
    );
    return { action: "handled" as const };
  });

  pi.registerTool({
    name: "assay_card",
    label: "Assay card",
    description:
      "Prove an assay plan's graders (untouched repo must fail, known good fix must pass) and show the contract card. Does not start anything. The user starts it by typing go.",
    parameters: Type.Object({ plan: Type.String({ description: "Path to plan.json" }) }),
    async execute(_id, params, _signal, _update, ctx) {
      const current = ensure();
      if (current.phase() === "idle") current.start();
      const result = await current.prepare(resolve(ctx.cwd, params.plan));
      return text(result.text);
    },
  });

  pi.registerTool({
    name: "assay_status",
    label: "Assay status",
    description: "Every agent in the running assay: stage, turns, spend, steers, last tool.",
    parameters: Type.Object({}),
    async execute() {
      return text(await ensure().ps());
    },
  });

  pi.registerTool({
    name: "assay_steer",
    label: "Steer agent",
    description:
      "Send a message to one running agent, or to every working agent with seat 'all'. It arrives after the agent's current step. Use when the user asks you to tell an agent something.",
    parameters: Type.Object({
      seat: Type.String({ description: "Seat id from assay_status, or 'all'" }),
      message: Type.String({ description: "What to tell the agent" }),
    }),
    async execute(_id, params) {
      return text((await ensure().steer(params.seat, params.message)).body);
    },
  });

  pi.registerTool({
    name: "assay_stop",
    label: "Stop agent",
    description: "Stop one running agent. The others keep going. Only when the user asks.",
    parameters: Type.Object({ seat: Type.String({ description: "Seat id from assay_status" }) }),
    async execute(_id, params) {
      return text((await ensure().kill(params.seat)).body);
    },
  });

  pi.registerCommand("assay-card", {
    description: "Show the current assay contract card again.",
    handler: async () => {
      const card = mode?.card();
      say(card ? renderCard(card) : "No card yet. Start with /assay.");
    },
  });
}
