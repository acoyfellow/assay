import type { Html, HtmlBuilder } from "foldkit/html";
import { installLine } from "./command.ts";
import { Message } from "./message.ts";
import type { Model, Surface } from "./model.ts";
import numbers from "./numbers.json";
import { type Bar, cellsOf, type Drawing, figureGeometry, layoutBars } from "./pixels.ts";

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

const pixel = (h: H, drawing: Drawing, size: number, label = ""): Html =>
  h.svg(
    [
      h.ViewBox("0 0 12 12"),
      h.Width(String(size)),
      h.Height(String(size)),
      h.ShapeRendering("crispEdges"),
      h.Class("block shrink-0"),
      ...(label ? [h.Role("img"), h.AriaLabel(label)] : [h.AriaHidden(true)]),
    ],
    cellsOf(drawing).map(({ x, y, signal }) =>
      h.rect(
        [
          h.X(String(x)),
          h.Y(String(y)),
          h.Width("1"),
          h.Height("1"),
          h.Fill(signal ? "var(--color-signal)" : "var(--color-ink)"),
        ],
        [],
      ),
    ),
  );

const nav = (h: H): Html =>
  h.header(
    [h.Class("border-b border-ink")],
    [
      h.div(
        [h.Class("mx-auto flex max-w-page items-center justify-between gap-4 px-6 py-5")],
        [
          h.a(
            [h.Href("/"), h.Class("flex items-center gap-2.5 text-[22px] tracking-[-0.02em] no-underline")],
            [pixel(h, "tube", 24), "assay"],
          ),
          h.nav(
            [h.Class("flex gap-6 text-[15px]")],
            [
              h.a([h.Href("/docs/"), h.Class("no-underline hover:underline")], ["Docs"]),
              h.a([h.Href("/docs/bench/"), h.Class("no-underline hover:underline")], ["Bench"]),
              h.a([h.Href(repo), h.Class("no-underline hover:underline")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

const barsFromNumbers = (): readonly Bar[] =>
  [numbers.run1, numbers.run2].flatMap((run, round) =>
    run.arms.map((arm) => ({
      label: arm.arm.toUpperCase(),
      passed: arm.passed,
      seats: arm.seats,
      round,
      focus: round === 1 && arm.arm === "mcp",
    })),
  );

const figureText = (h: H, x: number, y: number, label: string, tone: string): Html =>
  h.text(
    [
      h.X(String(x)),
      h.Y(String(y)),
      h.TextAnchor("middle"),
      h.FontSize("2.6"),
      h.FontFamily("Google Sans Code, monospace"),
      h.Fill(tone),
    ],
    [label],
  );

const passFigure = (h: H): Html => {
  const { unit, floor, width, height, barWidth } = figureGeometry;
  const bars = layoutBars(barsFromNumbers());
  return h.figure(
    [h.Class("m-0 border-t border-ink pt-4")],
    [
      h.svg(
        [
          h.ViewBox(`0 0 ${width} ${height}`),
          h.ShapeRendering("crispEdges"),
          h.Role("img"),
          h.AriaLabel(
            `Seats passed out of ${numbers.seatsPerArm}. Round 1: ${numbers.run1.arms.map((a) => `${a.arm} ${a.passed}`).join(", ")}. Round 2: ${numbers.run2.arms.map((a) => `${a.arm} ${a.passed}`).join(", ")}.`,
          ),
          h.Class("block h-auto w-full max-w-[520px]"),
          h.DataAttribute("figure", "pass-by-round"),
        ],
        [
          ...[0, 1, 2, 3, 4, 5].map((step) =>
            h.rect(
              [
                h.X("0"),
                h.Y(String(floor - step * unit)),
                h.Width("2"),
                h.Height("0.5"),
                h.Fill("var(--color-quiet)"),
              ],
              [],
            ),
          ),
          h.rect(
            [h.X("3"), h.Y(String(floor)), h.Width("90"), h.Height("0.5"), h.Fill("var(--color-ink)")],
            [],
          ),
          ...bars.map((bar) =>
            h.rect(
              [
                h.X(String(bar.x)),
                h.Y(String(bar.top)),
                h.Width(String(barWidth)),
                h.Height(String(bar.height)),
                h.Fill(bar.focus ? "var(--color-signal)" : "var(--color-ink)"),
              ],
              [],
            ),
          ),
          ...bars.map((bar) =>
            figureText(h, bar.x + barWidth / 2, floor + 3.6, bar.label, "var(--color-graphite)"),
          ),
          figureText(h, 21, 2.6, "round 1", "var(--color-quiet)"),
          figureText(h, 65, 2.6, "round 2", "var(--color-quiet)"),
        ],
      ),
      h.figcaption(
        [h.Class("mt-3 text-[13px] text-graphite")],
        [
          h.b([h.Class("font-medium text-ink")], ["Figure 1. "]),
          `Seats that passed, out of ${numbers.seatsPerArm}, by surface. ${numbers.model} on ${numbers.harness}. One sentence was added to the model between rounds.`,
        ],
      ),
    ],
  );
};

const hero = (h: H, model: Model): Html =>
  h.section(
    [h.Class("mx-auto max-w-page px-6 pt-16 pb-20 sm:pt-24")],
    [
      h.div(
        [h.Class("max-w-measure")],
        [
          h.h1(
            [
              h.Class(
                "m-0 text-[36px] leading-[1.08] font-medium tracking-[-0.025em] text-balance sm:text-[44px]",
              ),
            ],
            ["Run many agents on one goal. Grade each one with a check it cannot see."],
          ),
          h.p(
            [h.Class("mt-6 mb-0 text-[17px] text-graphite text-pretty")],
            [
              "Assay keeps one receipt and one grade per agent, and computes the score from them. Change one thing, run again, and see if the score moved.",
            ],
          ),
          h.div(
            [h.Class("mt-8 flex flex-wrap items-center gap-4")],
            [
              h.a(
                [
                  h.Href("/docs/quick-start/"),
                  h.Class("rounded bg-ink px-[18px] py-2.5 text-[15px] font-medium text-paper no-underline"),
                ],
                ["Quick start"],
              ),
              h.a([h.Href("/docs/"), h.Class("text-[15px]")], ["Read the docs"]),
            ],
          ),
          h.div(
            [h.Class("mt-8 flex min-w-0 items-center gap-2 rounded bg-wash py-1.5 pr-1.5 pl-4")],
            [
              h.code([h.Class("min-w-0 flex-1 truncate font-mono text-[13px] text-graphite")], [installLine]),
              h.button(
                [
                  h.Type("button"),
                  h.OnClick(Message.ClickedCopy()),
                  h.Class(
                    "shrink-0 cursor-pointer rounded border border-line bg-paper px-3 py-1 text-[13px] text-ink",
                  ),
                ],
                [model.copied ? "Copied" : "Copy"],
              ),
            ],
          ),
        ],
      ),
      h.div([h.Class("mt-16 max-w-measure")], [passFigure(h)]),
    ],
  );

const sectionHead = (h: H, n: string, title: string): Html =>
  h.div(
    [],
    [
      h.p([h.Class("m-0 font-mono text-[13px] text-quiet")], [n]),
      h.h2([h.Class("mt-2 mb-0 text-[15px] font-medium")], [title]),
    ],
  );

const section = (h: H, n: string, title: string, body: readonly Html[]): Html =>
  h.section(
    [h.Class("border-t border-line")],
    [
      h.div(
        [h.Class("mx-auto grid max-w-page gap-4 px-6 py-16 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10")],
        [sectionHead(h, n, title), h.div([h.Class("min-w-0 max-w-measure")], body)],
      ),
    ],
  );

const rule = (h: H, drawing: Drawing, title: string, body: string): Html =>
  h.li(
    [h.Class("flex gap-5 border-t border-line py-5 first:border-t-0 first:pt-0")],
    [
      h.div([h.Class("rounded bg-wash p-3")], [pixel(h, drawing, 36, title)]),
      h.div(
        [],
        [h.p([h.Class("m-0 font-medium")], [title]), h.p([h.Class("mt-1 mb-0 text-graphite")], [body])],
      ),
    ],
  );

const rules = (h: H): Html =>
  section(h, "01", "Four rules", [
    h.p(
      [h.Class("mt-0 mb-8 text-[17px] text-graphite")],
      ["The rules stay the same every round. That is what lets you compare one round with the next."],
    ),
    h.ul(
      [h.Class("m-0 list-none p-0")],
      [
        rule(h, "plan", "The plan is frozen", "Each receipt names its plan. A new plan needs a new assay."),
        rule(h, "budget", "The budget is hard", "A seat starts only if its worst-case cost still fits."),
        rule(
          h,
          "grader",
          "The grader is hidden",
          "Each seat is graded once, after it stops. It cannot read or change the grader.",
        ),
        rule(
          h,
          "receipt",
          "The score is recomputed",
          "From receipts and grades, not from what the agent reports.",
        ),
      ],
    ),
  ]);

const tab = (h: H, model: Model, surface: Surface, label: string): Html =>
  h.button(
    [
      h.Type("button"),
      h.OnClick(Message.ChoseSurface({ surface })),
      h.AriaPressed(String(model.surface === surface)),
      h.Class(
        model.surface === surface
          ? "cursor-pointer border-b-2 border-ink px-1 pb-2 text-[15px] text-ink"
          : "cursor-pointer border-b-2 border-transparent px-1 pb-2 text-[15px] text-graphite hover:text-ink",
      ),
    ],
    [label],
  );

const surfaces = (h: H, model: Model): Html =>
  section(h, "02", "CLI and MCP", [
    h.p(
      [h.Class("mt-0 mb-8 text-[17px] text-graphite")],
      [
        "The CLI and the MCP tools come from one model. Same inputs, same refusals, same words. If an agent sends a wrong id, the refusal names the right one.",
      ],
    ),
    h.div([h.Class("mb-4 flex gap-5")], [tab(h, model, "cli", "CLI"), tab(h, model, "mcp", "MCP")]),
    h.pre(
      [h.Class("m-0 overflow-x-auto rounded bg-ink p-6 font-mono text-[13px] leading-[1.8] text-[#c9c9c5]")],
      [
        h.code(
          [h.DataAttribute("surface-call", model.surface)],
          [model.surface === "cli" ? cliCall : mcpCall],
        ),
      ],
    ),
    h.p([h.Class("mt-5 mb-0")], [h.a([h.Href("/docs/cli-and-mcp/")], ["CLI and MCP reference"])]),
  ]);

const armRow = (h: H, before: Arm, after: Arm): Html =>
  h.tr(
    [],
    [
      h.td([h.Class("border-b border-line py-2.5 pr-6")], [after.arm.toUpperCase()]),
      h.td(
        [h.Class("border-b border-line py-2.5 pr-6 font-mono text-[13px]")],
        [`${before.passed}/${before.seats}`],
      ),
      h.td(
        [
          h.Class(
            after.arm === "mcp"
              ? "border-b border-line py-2.5 pr-6 font-mono text-[13px] font-medium text-signal"
              : "border-b border-line py-2.5 pr-6 font-mono text-[13px]",
          ),
        ],
        [`${after.passed}/${after.seats}`],
      ),
      h.td(
        [h.Class("border-b border-line py-2.5 pr-6 font-mono text-[13px]")],
        [`${before.meanTurns} → ${after.meanTurns}`],
      ),
      h.td(
        [h.Class("border-b border-line py-2.5 font-mono text-[13px]")],
        [`${before.meanCost} → ${after.meanCost}`],
      ),
    ],
  );

const bench = (h: H): Html =>
  section(h, "03", "What we measured", [
    h.p(
      [h.Class("mt-0 mb-8 text-[17px] text-graphite")],
      [
        `We tested assay with assay. ${numbers.seatsPerArm} seats per surface, ${numbers.model} on ${numbers.harness}. In round 1, most seats sent a command to the wrong id. For round 2, we added one sentence that says which id each command takes.`,
      ],
    ),
    h.div(
      [h.Class("overflow-x-auto")],
      [
        h.table(
          [
            h.Class("w-full min-w-[480px] border-collapse text-left text-[15px]"),
            h.DataAttribute("bench", "run1-vs-run2"),
          ],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  ["Surface", "Round 1", "Round 2", "Turns", "Cost per seat"].map((label) =>
                    h.th(
                      [h.Class("border-b border-ink pr-6 pb-2 text-[13px] font-normal text-graphite")],
                      [label],
                    ),
                  ),
                ),
              ],
            ),
            h.tbody(
              [],
              numbers.run2.arms.map((after, index) => armRow(h, numbers.run1.arms[index] ?? after, after)),
            ),
          ],
        ),
      ],
    ),
    h.p(
      [h.Class("mt-5 mb-0 text-[15px] text-graphite")],
      [
        `Total cost: ${numbers.run1.total} for round 1, ${numbers.run2.total} for round 2. One task and one model, so this is a first signal, not proof. `,
        h.a([h.Href("/docs/bench/"), h.Class("text-ink")], ["Method and receipts"]),
      ],
    ),
  ]);

const footer = (h: H): Html =>
  h.footer(
    [h.Class("border-t border-line")],
    [
      h.div(
        [
          h.Class(
            "mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-6 py-8 text-[13px] text-graphite",
          ),
        ],
        [
          h.span([h.Class("flex items-center gap-2")], [pixel(h, "tube", 12), "assay"]),
          h.div(
            [h.Class("flex gap-5")],
            [
              h.a([h.Href("/docs/"), h.Class("text-graphite")], ["Docs"]),
              h.a([h.Href("/llms.txt"), h.Class("text-graphite")], ["llms.txt"]),
              h.a([h.Href("/brand/"), h.Class("text-graphite")], ["Brand"]),
              h.a([h.Href(repo), h.Class("text-graphite")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

export const view = (model: Model, h: H): Html =>
  h.div([], [nav(h), h.main([], [hero(h, model), rules(h), surfaces(h, model), bench(h)]), footer(h)]);
