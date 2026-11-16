import type { Html, HtmlBuilder } from "foldkit/html";
import type { Message } from "./message.ts";
import numbers from "./numbers.json";
import {
  graded,
  gradedCount,
  gradeShown,
  heldAt,
  type Lane,
  laneProgress,
  laneShown,
  lanes,
  passedAt,
  phaseAt,
  phases,
  planShown,
  sceneFade,
  scoreShown,
  spentAt,
  wireDrawn,
} from "./timeline.ts";

type H = HtmlBuilder<Message>;

const ink = "var(--color-ink)";
const graphite = "var(--color-graphite)";
const quiet = "var(--color-quiet)";
const line = "var(--color-line)";
const signal = "var(--color-signal)";
const paper = "var(--color-paper)";

const laneTop = 52;
const laneGap = 44;
const laneHeight = 32;
const laneLeft = 236;
const trackLeft = 396;
const cellCount = 20;
const cellPitch = 7;
const resultLeft = 548;
const planBox = { x: 0, y: 92, w: 168, h: 176 };

const laneY = (index: number) => laneTop + index * laneGap;

const label = (h: H, x: number, y: number, text: string, fill: string, size = 12, anchor = "start"): Html =>
  h.text(
    [
      h.X(String(x)),
      h.Y(String(y)),
      h.Fill(fill),
      h.FontSize(String(size)),
      h.TextAnchor(anchor),
      h.Stroke("none"),
    ],
    [text],
  );

const planCard = (h: H, clock: number): Html => {
  const shown = planShown(clock);
  const rows: ReadonlyArray<[string, string]> = [
    ["repo", "seed/"],
    ["model", "haiku-4.5"],
    ["tasks", "3 × 2"],
    ["parallel", String(numbers.fleet.agents)],
    ["budget", "$6.00"],
  ];
  return h.g(
    [h.Opacity(String(shown)), h.Transform(`translate(0 ${(1 - shown) * 10})`)],
    [
      h.rect(
        [
          h.X(String(planBox.x)),
          h.Y(String(planBox.y)),
          h.Width(String(planBox.w)),
          h.Height(String(planBox.h)),
          h.Fill(paper),
          h.Stroke(ink),
        ],
        [],
      ),
      label(h, 14, planBox.y + 24, "plan.json", ink, 13),
      h.line(
        [
          h.X1("14"),
          h.X2(String(planBox.w - 14)),
          h.Y1(String(planBox.y + 36)),
          h.Y2(String(planBox.y + 36)),
          h.Stroke(line),
        ],
        [],
      ),
      ...rows.flatMap(([key, value], index) => [
        label(h, 14, planBox.y + 60 + index * 23, key, quiet),
        label(h, planBox.w - 14, planBox.y + 60 + index * 23, value, ink, 12, "end"),
      ]),
    ],
  );
};

const wire = (h: H, clock: number, index: number): Html => {
  const fromX = planBox.x + planBox.w;
  const fromY = planBox.y + planBox.h / 2;
  const toY = laneY(index) + laneHeight / 2;
  const mid = (fromX + laneLeft) / 2;
  return h.path(
    [
      h.D(`M${fromX} ${fromY} C ${mid} ${fromY}, ${mid} ${toY}, ${laneLeft} ${toY}`),
      h.Fill("none"),
      h.Stroke(quiet),
      h.PathLength("1"),
      h.StrokeDasharray("1"),
      h.Attribute("stroke-dashoffset", String(1 - wireDrawn(clock, index))),
    ],
    [],
  );
};

const workCells = (h: H, clock: number, lane: Lane, y: number): ReadonlyArray<Html> => {
  const filled = Math.round(laneProgress(clock, lane) * cellCount);
  const settled = graded(clock, lane);
  return Array.from({ length: cellCount }, (_, cell) => {
    const on = cell < filled;
    const fill = !on ? line : settled && lane.passed ? signal : settled ? quiet : ink;
    return h.rect(
      [
        h.X(String(trackLeft + cell * cellPitch)),
        h.Y(String(y + 11)),
        h.Width("5"),
        h.Height("10"),
        h.Fill(fill),
      ],
      [],
    );
  });
};

const verdict = (h: H, clock: number, lane: Lane, y: number): Html => {
  const shown = gradeShown(clock, lane);
  const working = laneProgress(clock, lane) < 1;
  if (shown <= 0) {
    return label(h, resultLeft + 8, y + 20, working ? `${lane.turns > 0 ? "…" : ""}` : "checking", quiet, 11);
  }
  const markX = resultLeft + 8;
  return h.g(
    [h.Opacity(String(shown))],
    [
      h.rect(
        [
          h.X(String(markX)),
          h.Y(String(y + 12)),
          h.Width("8"),
          h.Height("8"),
          h.Fill(lane.passed ? signal : "none"),
          h.Stroke(lane.passed ? "none" : ink),
        ],
        [],
      ),
      label(h, markX + 16, y + 20, lane.passed ? "pass" : "fail", lane.passed ? signal : graphite),
      label(h, 640, y + 20, `$${lane.usd.toFixed(2)}`, graphite, 11, "end"),
    ],
  );
};

const laneRow = (h: H, clock: number, lane: Lane, index: number): Html => {
  const shown = laneShown(clock, index);
  const y = laneY(index);
  return h.g(
    [h.Opacity(String(shown)), h.Transform(`translate(${(1 - shown) * -12} 0)`)],
    [
      h.rect(
        [
          h.X(String(laneLeft)),
          h.Y(String(y)),
          h.Width(String(640 - laneLeft)),
          h.Height(String(laneHeight)),
          h.Fill(paper),
          h.Stroke(graded(clock, lane) ? line : ink),
        ],
        [],
      ),
      label(h, laneLeft + 12, y + 20, lane.seat, ink),
      ...workCells(h, clock, lane, y),
      verdict(h, clock, lane, y),
    ],
  );
};

const columnHeads = (h: H, clock: number): Html =>
  h.g(
    [h.Opacity(String(laneShown(clock, 0)))],
    [
      label(h, laneLeft, 36, "agent", quiet, 11),
      label(h, trackLeft, 36, "work", quiet, 11),
      label(h, resultLeft + 8, 36, "hidden check", quiet, 11),
    ],
  );

const budgetTop = 334;
const budgetWidth = 640;
const budgetScale = 6;

const budgetBar = (h: H, clock: number, left: number): Html => {
  const held = heldAt(clock);
  const spent = spentAt(clock);
  const width = budgetWidth - left;
  const heldWidth = (held / budgetScale) * width;
  const spentWidth = (spent / budgetScale) * width;
  return h.g(
    [h.Opacity(String(planShown(clock)))],
    [
      label(h, left, budgetTop - 8, "budget $6.00", quiet, 11),
      label(
        h,
        640,
        budgetTop - 8,
        `held for worst case $${held.toFixed(2)}   spent $${spent.toFixed(2)}`,
        graphite,
        11,
        "end",
      ),
      h.rect(
        [h.X(String(left)), h.Y(String(budgetTop)), h.Width(String(width)), h.Height("10"), h.Fill(line)],
        [],
      ),
      h.rect(
        [
          h.X(String(left)),
          h.Y(String(budgetTop)),
          h.Width(String(Math.max(heldWidth, spentWidth))),
          h.Height("10"),
          h.Fill("none"),
          h.Stroke(ink),
        ],
        [],
      ),
      h.rect(
        [h.X(String(left)), h.Y(String(budgetTop)), h.Width(String(spentWidth)), h.Height("10"), h.Fill(ink)],
        [],
      ),
    ],
  );
};

const scoreLine = (h: H, clock: number, left: number): Html => {
  const shown = scoreShown(clock);
  return h.g(
    [h.Opacity(String(shown)), h.Transform(`translate(0 ${(1 - shown) * 6})`)],
    [
      h.line([h.X1(String(left)), h.X2("640"), h.Y1("372"), h.Y2("372"), h.Stroke(ink)], []),
      label(h, left, 398, "score", quiet, 11),
      label(
        h,
        640,
        398,
        `${passedAt(clock)} of ${lanes.length} passed   $${numbers.fleet.usd.slice(1)}   ${numbers.fleet.seconds}s`,
        ink,
        14,
        "end",
      ),
    ],
  );
};

export const heroStage = (h: H, clock: number, compact: boolean): Html =>
  h.svg(
    [
      h.ViewBox(compact ? `${laneLeft} 0 ${640 - laneLeft} 410` : "0 0 640 410"),
      h.Class(compact ? "block w-full font-mono sm:hidden" : "hidden w-full font-mono sm:block"),
      h.Role("img"),
      h.AriaLabel(
        `A plan starts ${lanes.length} agents. Each works in its own copy of the repo. A hidden check grades each one. ${numbers.fleet.passed} of ${numbers.fleet.agents} passed.`,
      ),
      h.DataAttribute("stage", "fleet"),
      h.DataAttribute("graded", String(gradedCount(clock))),
    ],
    [
      h.g(
        [h.Opacity(String(sceneFade(clock)))],
        [
          ...(compact ? [] : [planCard(h, clock), ...lanes.map((_, index) => wire(h, clock, index))]),
          columnHeads(h, clock),
          ...lanes.map((lane, index) => laneRow(h, clock, lane, index)),
          budgetBar(h, clock, compact ? laneLeft : 0),
          scoreLine(h, clock, compact ? laneLeft : 0),
        ],
      ),
    ],
  );

const phaseText: Record<(typeof phases)[number], string> = {
  plan: "Write a plan",
  spawn: "Start the agents",
  work: "They work in parallel",
  grade: "A hidden check grades each",
  score: "Read the score",
};

export const phaseList = (h: H, clock: number): Html => {
  const now = phaseAt(clock);
  return h.ol(
    [h.Class("m-0 mt-8 list-none p-0 font-mono text-[13px]"), h.AriaHidden(true)],
    phases.map((phase, index) =>
      h.li(
        [h.Class(`flex items-center gap-3 py-1 ${phase === now ? "text-ink" : "text-quiet"}`)],
        [
          h.span([h.Class(`size-2 shrink-0 ${phase === now ? "bg-signal" : "bg-line"}`)], []),
          h.span([h.Class("w-4")], [String(index + 1)]),
          phaseText[phase],
        ],
      ),
    ),
  );
};
