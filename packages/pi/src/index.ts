import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createMode, type LandResult, type Mode, type ModeEvent, renderCard } from "./mode.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../../..");

const draftBrief = (want: string) =>
  [
    "Fleet mode is on. Draft a fleet for this, then show me the contract card. Do not start it.",
    "",
    `What I want: ${want || "see the chat above"}`,
    "",
    "Steps:",
    `1. Read ${join(root, "packages/web/docs/recipes.md")} and pick the closest recipe in ${join(root, "examples/recipes")}.`,
    "2. Write fleet/plan.json in this repo, one seat per task, tasks in fleet/tasks/, hidden checks in a folder listed in hidden.",
    "3. Write fleet/proof.json with a known good fix per seat (write the fix under fleet/reference/).",
    "4. Call the fleet_card tool with fleet/plan.json. It proves the graders and shows the card.",
    "5. If the card says NOT PROVEN, fix the graders and call fleet_card again.",
    "Stop after the card. I will type go.",
  ].join("\n");

const landText = (land: LandResult | null, summary: string) => {
  if (!land) return `Fleet finished: ${summary}. Nothing to land.`;
  return [
    `Fleet finished: ${summary}`,
    ...land.tasks.map((task) => `  ${task.applied ? "LAND" : "SKIP"} ${task.task}: ${task.reason}`),
    `Branch ${land.branch}: ${land.landed}/${land.tasks.length} tasks, tests ${land.test.passed ? "pass" : "FAIL"}.`,
    `Look: git -C ${land.repo} log --stat ${land.branch}`,
    "Nothing is merged. Fleet mode stays on until you type /fleet-off.",
  ].join("\n");
};

const text = (value: unknown) => ({
  content: [
    { type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
  ],
  details: {},
});

export default function assayFleet(pi: ExtensionAPI) {
  let mode: Mode | null = null;

  const say = (content: string, triggerTurn = false) =>
    pi.sendMessage({ customType: "assay-fleet", content, display: true }, { triggerTurn });

  const onEvent = (event: ModeEvent) => {
    if (event.kind === "line" && /PASS|FAIL|SKIP|round|done:/.test(event.text)) say(event.text);
    if (event.kind === "landed") say(landText(event.land, event.summary), true);
  };

  const ensure = () => {
    mode ??= createMode({ root, home: process.env.ASSAY_HOME ?? join(homedir(), ".assay"), onEvent });
    return mode;
  };

  pi.registerCommand("fleet", {
    description:
      "Fleet mode: draft a plan from the chat, prove the graders, show a contract card. Nothing runs before go.",
    handler: async (args) => {
      const current = ensure();
      if (current.phase() === "off") mode = null;
      const started = ensure().start();
      if (!started.ok) return say(started.reason);
      pi.sendUserMessage(draftBrief(args.trim()));
    },
  });

  pi.registerCommand("fleet-off", {
    description: "End fleet mode. Stops a running fleet. Nothing is merged.",
    handler: async () => {
      if (!mode) return say("Fleet mode is not on.");
      await mode.off();
      mode = null;
      say("Fleet mode is off. Branches stay in the run folder. Nothing was merged.");
    },
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
    name: "fleet_card",
    label: "Fleet card",
    description:
      "Prove a fleet plan's graders (untouched repo must fail, known good fix must pass) and show the contract card. Does not start anything. The user starts the fleet by typing go.",
    parameters: Type.Object({ plan: Type.String({ description: "Path to plan.json" }) }),
    async execute(_id, params, _signal, _update, ctx) {
      const current = ensure();
      if (current.phase() === "idle") current.start();
      const result = await current.prepare(resolve(ctx.cwd, params.plan));
      return text(result.text);
    },
  });

  pi.registerTool({
    name: "fleet_ps",
    label: "Fleet status",
    description: "Every agent in the running fleet: stage, turns, spend, steers, last tool.",
    parameters: Type.Object({}),
    async execute() {
      return text(await ensure().ps());
    },
  });

  pi.registerTool({
    name: "fleet_steer",
    label: "Steer agent",
    description:
      "Send a message to one running agent, or to every working agent with seat 'all'. It arrives after the agent's current step. Use when the user asks you to tell an agent something.",
    parameters: Type.Object({
      seat: Type.String({ description: "Seat id from fleet_ps, or 'all'" }),
      message: Type.String({ description: "What to tell the agent" }),
    }),
    async execute(_id, params) {
      return text((await ensure().steer(params.seat, params.message)).body);
    },
  });

  pi.registerTool({
    name: "fleet_kill",
    label: "Stop agent",
    description: "Stop one running agent. The others keep going. Only when the user asks.",
    parameters: Type.Object({ seat: Type.String({ description: "Seat id from fleet_ps" }) }),
    async execute(_id, params) {
      return text((await ensure().kill(params.seat)).body);
    },
  });

  pi.registerCommand("fleet-card", {
    description: "Show the current fleet contract card again.",
    handler: async () => {
      const card = mode?.card();
      say(card ? renderCard(card) : "No card yet. Start with /fleet.");
    },
  });
}
