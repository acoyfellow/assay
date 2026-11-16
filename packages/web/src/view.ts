import type { Html, HtmlBuilder } from "foldkit/html";
import { installLine } from "./command.ts";
import { heroStage, phaseList } from "./hero.ts";
import { Message } from "./message.ts";
import type { Model, Surface } from "./model.ts";
import numbers from "./numbers.json";
import { cellsOf, type Drawing } from "./pixels.ts";

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

const playOverlay = (h: H, playing: boolean): Html =>
  h.span(
    [
      h.AriaHidden(true),
      h.Class(
        `pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${playing ? "opacity-0" : "opacity-100"}`,
      ),
    ],
    [
      h.span(
        [h.Class("flex size-16 items-center justify-center rounded bg-ink")],
        [
          h.svg(
            [h.ViewBox("0 0 12 12"), h.Width("24"), h.Height("24"), h.ShapeRendering("crispEdges")],
            [h.path([h.D("M3 1 L11 6 L3 11 Z"), h.Fill("var(--color-paper)")], [])],
          ),
        ],
      ),
    ],
  );

const hero = (h: H, model: Model): Html =>
  h.section(
    [h.Class("border-b border-line")],
    [
      h.div(
        [
          h.Class(
            "mx-auto grid max-w-page grid-cols-1 items-start gap-12 px-6 pt-16 pb-16 sm:pt-20 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14",
          ),
        ],
        [
          h.div(
            [],
            [
              h.h1(
                [
                  h.Class(
                    "m-0 text-[36px] leading-[1.08] font-medium tracking-[-0.025em] text-balance sm:text-[44px]",
                  ),
                ],
                ["Spin up a fleet of coding agents."],
              ),
              h.p(
                [h.Class("mt-6 mb-0 text-[17px] text-graphite text-pretty")],
                [
                  "One plan, one command. Each agent gets its own copy of your repo. A test it never saw checks the work.",
                ],
              ),
              phaseList(h, model.clock),
              h.div(
                [h.Class("mt-8 flex flex-wrap items-center gap-4")],
                [
                  h.a(
                    [
                      h.Href("/docs/quick-start/"),
                      h.Class(
                        "rounded bg-ink px-[18px] py-2.5 text-[15px] font-medium text-paper no-underline",
                      ),
                    ],
                    ["Quick start"],
                  ),
                  h.a([h.Href("/docs/"), h.Class("text-[15px]")], ["Read the docs"]),
                ],
              ),
            ],
          ),
          h.figure(
            [h.Class("m-0 min-w-0"), h.DataAttribute("figure", "fleet-run")],
            [
              h.button(
                [
                  h.Type("button"),
                  h.OnClick(Message.ToggledPlay()),
                  h.DataAttribute("control", "play"),
                  h.DataAttribute("playing", String(model.playing)),
                  h.AriaLabel(model.playing ? "Pause the replay" : "Play the replay"),
                  h.Class(
                    "group relative block w-full cursor-pointer appearance-none border-0 border-t border-ink bg-transparent p-0 pt-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink",
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        `transition-[filter,opacity] duration-300 ${model.playing ? "" : "opacity-40 grayscale"}`,
                      ),
                    ],
                    [heroStage(h, model.clock, false), heroStage(h, model.clock, true)],
                  ),
                  playOverlay(h, model.playing),
                ],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class("mx-auto max-w-page px-6 pb-14")],
        [
          h.div(
            [h.Class("flex min-w-0 max-w-measure items-center gap-2 rounded bg-wash py-1.5 pr-1.5 pl-4")],
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
    ],
  );

const planExample = `{
  "name": "tally",
  "repo": "seed",
  "model": "claude-haiku-4-5",
  "parallel": 6,
  "repeat": 2,
  "budgetUsd": 6,
  "worstCaseUsdPerSeat": 0.4,
  "seats": [
    {
      "id": "cart-merge",
      "task": "tasks/cart-merge.md",
      "writable": ["src/cart.ts", "test/cart.test.ts"],
      "grade": "sh grade.sh cart-merge"
    }
  ]
}`;

const howItWorks = (h: H): Html =>
  section(h, "01", "How it works", [
    h.ol(
      [h.Class("m-0 list-none p-0")],
      [
        [
          "plan",
          "Write a plan",
          "A repo, a model, and a list of tasks. Each task names the files the agent may change and the command that grades it.",
        ],
        ["budget", "Set a budget", "Each agent starts only if its worst-case cost still fits. Run 6 or 60."],
        [
          "grader",
          "Grade in secret",
          "When an agent stops, assay runs your grade command in its copy. The agent never saw it.",
        ],
        [
          "receipt",
          "Read the receipts",
          "One receipt per agent: what it did, what it cost, and whether it passed. The score is added up from those.",
        ],
      ].map(([drawing, title, body]) => rule(h, drawing as Drawing, title as string, body as string)),
    ),
    h.pre(
      [h.Class("mt-8 mb-0 overflow-x-auto rounded bg-wash p-5 font-mono text-[13px] leading-[1.7] text-ink")],
      [h.code([], [planExample])],
    ),
    h.p([h.Class("mt-3 mb-0 text-[13px] text-graphite")], ["examples/tally/plan.json, shortened."]),
  ]);

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
  section(h, "02", "Drive it from an agent", [
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
  section(h, "03", "One thing we measured", [
    h.p(
      [h.Class("mt-0 mb-8 text-[17px] text-graphite")],
      [
        `An early test, from before the fleet runner: can an agent drive the ledger itself? ${numbers.seatsPerArm} seats per surface, ${numbers.model} on ${numbers.harness}. In round 1, most seats sent a command to the wrong id. For round 2, we added one sentence that says which id each command takes.`,
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
  h.div([], [nav(h), h.main([], [hero(h, model), howItWorks(h), surfaces(h, model), bench(h)]), footer(h)]);
