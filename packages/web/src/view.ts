import type { Html, HtmlBuilder } from "foldkit/html";
import { installLine } from "./command.ts";
import { Message } from "./message.ts";
import type { Model, Surface } from "./model.ts";
import numbers from "./numbers.json";

type H = HtmlBuilder<Message>;
type Arm = (typeof numbers.run2.arms)[number];

const repo = "https://github.com/acoyfellow/assay";

const cliCall = [
  "$ assay claim-seat --target job-7 --seat alpha --runner local",
  '{ "reply": { "reservedMicroUsd": 300000 } }',
  "",
  "$ assay claim-seat --target job-7/alpha --seat alpha --runner local",
  '{ "_tag": "NotRunning",',
  '  "hint": "\\"job-7/alpha\\" is a seat id. Send this command',
  '           to the assay id \\"job-7\\" and name the seat." }',
].join("\n");

const mcpCall = [
  "→ AssayApi_ClaimSeat_send",
  '  { "target": "job-7", "input": { "seat": "alpha", "runner": "local" } }',
  '← { "reply": { "reservedMicroUsd": 300000 } }',
  "",
  "→ AssayApi_ClaimSeat_send",
  '  { "target": "job-7/alpha", "input": { "seat": "alpha", "runner": "local" } }',
  '← { "_tag": "NotRunning",',
  '    "hint": "\\"job-7/alpha\\" is a seat id. Send this command',
  '             to the assay id \\"job-7\\" and name the seat." }',
].join("\n");

const nav = (h: H): Html =>
  h.header(
    [h.Class("sticky top-0 z-10 border-b border-line bg-ink/90 backdrop-blur")],
    [
      h.div(
        [h.Class("mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5")],
        [
          h.a(
            [h.Href("/"), h.Class("flex items-center gap-2 text-lg font-bold tracking-tight text-fg")],
            [h.span([h.Class("size-3 rounded-full border-[3px] border-accent")], []), "assay"],
          ),
          h.nav(
            [h.Class("flex gap-5 text-sm text-muted")],
            [
              h.a([h.Href("/docs/"), h.Class("hover:text-fg")], ["Docs"]),
              h.a([h.Href("/docs/bench/"), h.Class("hover:text-fg")], ["Bench"]),
              h.a([h.Href(repo), h.Class("hover:text-fg")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

const hero = (h: H, model: Model): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 pt-16 pb-14 sm:pt-24")],
    [
      h.p(
        [h.Class("mb-5 inline-flex rounded-full border border-line px-3 py-1 text-xs text-muted")],
        ["Open source · runs on your machine or your Cloudflare account"],
      ),
      h.h1(
        [h.Class("max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl")],
        ["Run many agents on one goal. ", h.span([h.Class("text-accent")], ["Score each one fairly."])],
      ),
      h.p(
        [h.Class("mt-6 max-w-2xl text-lg text-muted text-pretty")],
        [
          "A tool you hand your agent. It freezes the plan, holds the budget, keeps one receipt per agent, and grades each one with a check the agent never sees.",
        ],
      ),
      h.div(
        [h.Class("mt-8 flex flex-wrap gap-3")],
        [
          h.a(
            [
              h.Href("/docs/quick-start/"),
              h.Class("rounded-lg bg-accent px-5 py-2.5 font-semibold text-ink hover:brightness-110"),
            ],
            ["Quick start"],
          ),
          h.a(
            [
              h.Href("/docs/bench/"),
              h.Class("rounded-lg border border-line px-5 py-2.5 font-semibold hover:bg-panel"),
            ],
            ["See the bench"],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            "mt-8 flex max-w-full items-center gap-2 rounded-lg border border-line bg-panel p-1.5 pl-4 sm:max-w-2xl",
          ),
        ],
        [
          h.code([h.Class("min-w-0 flex-1 truncate font-mono text-[13px] text-muted")], [installLine]),
          h.button(
            [
              h.Type("button"),
              h.OnClick(Message.ClickedCopy()),
              h.Class(
                "shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-line",
              ),
            ],
            [model.copied ? "Copied" : "Copy"],
          ),
        ],
      ),
    ],
  );

const promise = (h: H, n: string, title: string, body: string): Html =>
  h.div(
    [h.Class("rounded-xl border border-line bg-panel p-5")],
    [
      h.p([h.Class("font-mono text-xs text-accent")], [n]),
      h.h3([h.Class("mt-2 font-semibold")], [title]),
      h.p([h.Class("mt-1.5 text-sm text-muted")], [body]),
    ],
  );

const promises = (h: H): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-14")],
    [
      h.h2([h.Class("text-2xl font-bold tracking-tight sm:text-3xl")], ["What it promises"]),
      h.div(
        [h.Class("mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4")],
        [
          promise(
            h,
            "01",
            "The plan is frozen",
            "Every receipt names the plan it ran. Change the plan, start a new assay.",
          ),
          promise(
            h,
            "02",
            "The budget holds",
            "A seat starts only if its worst case still fits. Real spend replaces the hold.",
          ),
          promise(
            h,
            "03",
            "The grader is hidden",
            "Each seat is graded once, after it stops, by a check it could not read or write.",
          ),
          promise(
            h,
            "04",
            "The score is recomputed",
            "From receipts and grades. Never taken from the agent's own report.",
          ),
        ],
      ),
    ],
  );

const tab = (h: H, model: Model, surface: Surface, label: string): Html =>
  h.button(
    [
      h.Type("button"),
      h.OnClick(Message.ChoseSurface({ surface })),
      h.AriaPressed(String(model.surface === surface)),
      h.Class(
        model.surface === surface
          ? "rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-ink"
          : "rounded-md px-3 py-1.5 text-sm font-semibold text-muted hover:text-fg",
      ),
    ],
    [label],
  );

const surfaces = (h: H, model: Model): Html =>
  h.section(
    [h.Class("mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[1fr_1.3fr] lg:items-center")],
    [
      h.div(
        [],
        [
          h.h2([h.Class("text-2xl font-bold tracking-tight sm:text-3xl")], ["One model. Two surfaces."]),
          h.p(
            [h.Class("mt-4 text-muted")],
            [
              "The CLI and the MCP tools are both made from one domain model. They take the same inputs, refuse the same things, and say the same words. A wrong id gets a refusal that names the right one.",
            ],
          ),
          h.a(
            [h.Href("/docs/cli-and-mcp/"), h.Class("mt-5 inline-block font-semibold text-accent")],
            ["CLI and MCP →"],
          ),
        ],
      ),
      h.div(
        [h.Class("min-w-0 rounded-xl border border-line bg-panel")],
        [
          h.div(
            [h.Class("flex gap-1 border-b border-line p-2")],
            [tab(h, model, "cli", "CLI"), tab(h, model, "mcp", "MCP")],
          ),
          h.pre(
            [h.Class("overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-fg/90")],
            [h.code([], [model.surface === "cli" ? cliCall : mcpCall])],
          ),
        ],
      ),
    ],
  );

const armRow = (h: H, before: Arm, after: Arm): Html =>
  h.tr(
    [h.Class("border-t border-line")],
    [
      h.td([h.Class("px-4 py-3 font-semibold")], [after.arm.toUpperCase()]),
      h.td([h.Class("px-4 py-3 text-muted")], [`${before.passed}/${before.seats}`]),
      h.td([h.Class("px-4 py-3 font-semibold text-accent")], [`${after.passed}/${after.seats}`]),
      h.td([h.Class("px-4 py-3 text-muted")], [`${before.meanTurns} → ${after.meanTurns}`]),
      h.td([h.Class("px-4 py-3 text-muted")], [`${before.meanCost} → ${after.meanCost}`]),
    ],
  );

const bench = (h: H): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-14")],
    [
      h.h2([h.Class("text-2xl font-bold tracking-tight sm:text-3xl")], ["We measured assay with assay"]),
      h.p(
        [h.Class("mt-4 max-w-2xl text-muted")],
        [
          `${numbers.seatsPerArm} seats per surface, ${numbers.model} on ${numbers.harness}, a hidden grader. In run 1, most agents sent a command to the wrong id. In run 2, the model said which id each command takes.`,
        ],
      ),
      h.div(
        [h.Class("mt-6 overflow-x-auto rounded-xl border border-line")],
        [
          h.table(
            [h.Class("w-full min-w-[520px] text-left text-sm"), h.DataAttribute("bench", "run1-vs-run2")],
            [
              h.thead(
                [h.Class("bg-panel text-muted")],
                [
                  h.tr(
                    [],
                    ["Surface", "Run 1 passed", "Run 2 passed", "Mean turns", "Mean cost"].map((label) =>
                      h.th([h.Class("px-4 py-3 font-semibold")], [label]),
                    ),
                  ),
                ],
              ),
              h.tbody(
                [],
                numbers.run2.arms.map((after, index) => {
                  const before = numbers.run1.arms[index] ?? after;
                  return armRow(h, before, after);
                }),
              ),
            ],
          ),
        ],
      ),
      h.p(
        [h.Class("mt-4 text-sm text-muted")],
        [
          `Run 1 cost ${numbers.run1.total}, run 2 cost ${numbers.run2.total}. One description in the model closed the gap. `,
          h.a([h.Href("/docs/bench/"), h.Class("text-accent")], ["Read the receipts →"]),
        ],
      ),
    ],
  );

const footer = (h: H): Html =>
  h.footer(
    [h.Class("mt-10 border-t border-line")],
    [
      h.div(
        [
          h.Class(
            "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted",
          ),
        ],
        [
          h.p([], ["MIT. You run it: no hosted service, no free model calls."]),
          h.div(
            [h.Class("flex gap-5")],
            [
              h.a([h.Href("/docs/"), h.Class("hover:text-fg")], ["Docs"]),
              h.a([h.Href("/llms.txt"), h.Class("hover:text-fg")], ["llms.txt"]),
              h.a([h.Href(repo), h.Class("hover:text-fg")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

export const view = (model: Model, h: H): Html =>
  h.div([], [nav(h), h.main([], [hero(h, model), promises(h), surfaces(h, model), bench(h)]), footer(h)]);
