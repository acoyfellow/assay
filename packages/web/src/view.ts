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

const logo = (h: H, size: number): Html =>
  h.img([h.Src("/logo.svg"), h.Alt(""), h.Width(String(size)), h.Height(String(size)), h.Class("logo")]);

const nav = (h: H): Html =>
  h.header(
    [h.Class("sticky top-0 z-10 bg-g2/85 backdrop-blur")],
    [
      h.div(
        [h.Class("mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4")],
        [
          h.a(
            [h.Href("/"), h.Class("flex items-center gap-2.5 text-lg tracking-tight text-k1")],
            [logo(h, 24), "assay"],
          ),
          h.nav(
            [h.Class("flex gap-1 rounded-full bg-g1 p-1 text-sm")],
            [
              h.a([h.Href("/docs/"), h.Class("rounded-full px-3.5 py-1.5 text-k1 hover:bg-g0")], ["Docs"]),
              h.a(
                [h.Href("/docs/bench/"), h.Class("rounded-full px-3.5 py-1.5 text-k1 hover:bg-g0")],
                ["Bench"],
              ),
              h.a([h.Href(repo), h.Class("rounded-full px-3.5 py-1.5 text-k1 hover:bg-g0")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

const chip = (h: H, label: string, tint = false): Html =>
  h.span([h.Class(`${tint ? "pill-tint" : "pill"} rounded-full px-3.5 py-1.5 text-[13px] text-k1`)], [label]);

const hero = (h: H, model: Model): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-3 pt-6 pb-10 sm:px-5 sm:pt-10")],
    [
      h.div(
        [h.Class("rounded-[32px] bg-g0 p-3 shadow-shell sm:rounded-shell sm:p-4")],
        [
          h.div(
            [h.Class("contents")],
            [
              h.div(
                [h.Class("grid gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6")],
                [
                  h.div(
                    [h.Class("flex flex-col gap-6 px-5 pt-8 pb-4 sm:px-10 sm:pt-14 sm:pb-12")],
                    [
                      h.p([h.Class("text-[13px] font-medium text-[#d2691e]")], ["Runs on your machine"]),
                      h.h1(
                        [h.Class("display text-[40px] leading-[1.05] text-balance sm:text-[56px]")],
                        [
                          h.span([h.Class("text-g5")], ["Evals pick a winner. "]),
                          "Assay shows what to change next.",
                        ],
                      ),
                      h.p(
                        [h.Class("max-w-[44ch] text-[16px] text-g6 text-pretty")],
                        [
                          "Run many agents on one goal. A grader they cannot see checks each one. Change one thing and run again.",
                        ],
                      ),
                      h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [chip(h, "Frozen plan"), chip(h, "Hidden grader", true), chip(h, "Hard budget")],
                      ),
                      h.div([h.Class("grow")], []),
                      h.div(
                        [h.Class("flex flex-wrap items-center gap-3")],
                        [
                          h.a(
                            [
                              h.Href("/docs/quick-start/"),
                              h.Class(
                                "button-dark rounded-full px-5 py-3 text-[15px] font-medium text-on-dark",
                              ),
                            ],
                            ["Quick start"],
                          ),
                          h.a(
                            [
                              h.Href("/docs/bench/"),
                              h.Class("text-[15px] text-k1 underline underline-offset-[5px]"),
                            ],
                            ["See the bench"],
                          ),
                        ],
                      ),
                    ],
                  ),
                  h.div(
                    [
                      h.Class(
                        "dark-card flex min-w-0 flex-col gap-6 rounded-[24px] p-7 text-on-dark sm:p-12 lg:min-h-[520px]",
                      ),
                    ],
                    [
                      h.h2([h.Class("display text-[26px] leading-tight")], ["Give it to your agent"]),
                      h.p(
                        [h.Class("text-[15px] text-on-dark-dim")],
                        ["Clone it, start the server, and your agent uses the CLI or the MCP tools."],
                      ),
                      h.div(
                        [h.Class("flex min-w-0 items-center gap-2 rounded-full bg-white/[0.05] p-1.5 pl-4")],
                        [
                          h.code(
                            [h.Class("min-w-0 flex-1 truncate font-mono text-[13px] text-on-dark-dim")],
                            [installLine],
                          ),
                          h.button(
                            [
                              h.Type("button"),
                              h.OnClick(Message.ClickedCopy()),
                              h.Class(
                                "button-light shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium text-k1",
                              ),
                            ],
                            [model.copied ? "Copied" : "Copy"],
                          ),
                        ],
                      ),
                      h.div([h.Class("grow")], []),
                      h.pre(
                        [h.Class("overflow-x-auto font-mono text-[13px] leading-[1.9] text-on-dark-dim")],
                        [
                          h.code(
                            [],
                            [
                              "seat-2   stopped   6 turns   $0.0247\n",
                              h.span([h.Class("text-on-dark")], ["grade    "]),
                              h.span([h.Class("text-ok")], ["pass"]),
                              "   server state matches",
                            ],
                          ),
                        ],
                      ),
                      h.div(
                        [h.Class("flex flex-wrap items-center justify-between gap-3")],
                        [
                          h.span(
                            [
                              h.Class(
                                "inline-flex items-center gap-2.5 rounded-full bg-ok-deep px-4 py-2.5 text-[15px] text-ok",
                              ),
                            ],
                            [
                              h.span([h.Class("size-3 rotate-45 rounded-[3px] bg-ok")], []),
                              `Round 2 · ${numbers.run2.arms.map((a) => `${a.arm.toUpperCase()} ${a.passed}/${a.seats}`).join(" · ")}`,
                            ],
                          ),
                          h.a(
                            [
                              h.Href("/docs/"),
                              h.Class(
                                "button-light rounded-full px-5 py-2.5 text-[15px] font-medium text-k1",
                              ),
                            ],
                            ["Read the docs →"],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );

const loopStep = (h: H, n: string, title: string, body: string): Html =>
  h.div(
    [h.Class("rounded-[24px] bg-g0 p-7 sm:p-8")],
    [
      h.p([h.Class("font-mono text-xs text-g5")], [n]),
      h.h3([h.Class("mt-6 text-[18px] font-medium")], [title]),
      h.p([h.Class("mt-2 text-[15px] text-g6")], [body]),
    ],
  );

const sectionHead = (h: H, quiet: string, point: string, body: string): Html =>
  h.div(
    [h.Class("max-w-2xl")],
    [
      h.h2(
        [h.Class("display text-[30px] leading-[1.1] sm:text-[38px]")],
        [h.span([h.Class("text-g5")], [quiet]), point],
      ),
      h.p([h.Class("mt-3 text-g6 text-pretty")], [body]),
    ],
  );

const promises = (h: H): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-16 sm:py-24")],
    [
      sectionHead(
        h,
        "Four rules. ",
        "Same rules every round.",
        "If the rules stay the same, you can compare one round with the next.",
      ),
      h.div(
        [h.Class("mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4")],
        [
          loopStep(
            h,
            "01",
            "The plan is frozen",
            "Each receipt names its plan. A new plan needs a new assay.",
          ),
          loopStep(h, "02", "The budget is hard", "A seat starts only if its worst-case cost still fits."),
          loopStep(
            h,
            "03",
            "The grader is hidden",
            "Each seat is graded once, after it stops. It cannot read or change the grader.",
          ),
          loopStep(
            h,
            "04",
            "The score is recomputed",
            "From receipts and grades, not from what the agent reports.",
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
          ? "rounded-full bg-white/[0.08] px-4 py-1.5 text-[13px] text-on-dark"
          : "rounded-full px-4 py-1.5 text-[13px] text-on-dark-dim hover:text-on-dark",
      ),
    ],
    [label],
  );

const surfaces = (h: H, model: Model): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-16 sm:py-24")],
    [
      h.div(
        [h.Class("grid gap-4 rounded-shell bg-g0 p-3 sm:p-4 lg:grid-cols-[1fr_1.3fr] lg:gap-6")],
        [
          h.div(
            [h.Class("flex flex-col gap-5 px-5 pt-8 pb-4 sm:px-10 sm:pt-12 sm:pb-10")],
            [
              h.h2(
                [h.Class("display text-[30px] leading-[1.1]")],
                [h.span([h.Class("text-g5")], ["One model. "]), "Two surfaces."],
              ),
              h.p(
                [h.Class("text-g6")],
                [
                  "The CLI and the MCP tools come from one model. Same inputs, same refusals, same words. If you send a wrong id, the refusal names the right one.",
                ],
              ),
              h.div([h.Class("grow")], []),
              h.a(
                [
                  h.Href("/docs/cli-and-mcp/"),
                  h.Class("text-[15px] text-k1 underline underline-offset-[5px]"),
                ],
                ["CLI and MCP →"],
              ),
            ],
          ),
          h.div(
            [h.Class("dark-card flex min-w-0 flex-col gap-6 rounded-[24px] p-6 sm:p-10")],
            [
              h.div(
                [h.Class("inline-flex self-start gap-1 rounded-full bg-white/[0.05] p-1")],
                [tab(h, model, "cli", "CLI"), tab(h, model, "mcp", "MCP")],
              ),
              h.pre(
                [h.Class("overflow-x-auto font-mono text-[12.5px] leading-[1.85] text-on-dark-dim")],
                [h.code([], [model.surface === "cli" ? cliCall : mcpCall])],
              ),
            ],
          ),
        ],
      ),
    ],
  );

const armRow = (h: H, before: Arm, after: Arm): Html =>
  h.tr(
    [],
    [
      h.td([h.Class("px-8 py-4 text-[16px] font-medium")], [after.arm.toUpperCase()]),
      h.td([h.Class("px-8 py-4 font-mono text-g6")], [`${before.passed}/${before.seats}`]),
      h.td([h.Class("px-8 py-4 font-mono font-medium text-[#d2691e]")], [`${after.passed}/${after.seats}`]),
      h.td([h.Class("px-8 py-4 font-mono text-g6")], [`${before.meanTurns} → ${after.meanTurns}`]),
      h.td([h.Class("px-8 py-4 font-mono text-g6")], [`${before.meanCost} → ${after.meanCost}`]),
    ],
  );

const bench = (h: H): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-16 sm:py-24")],
    [
      sectionHead(
        h,
        "We tested assay with assay. ",
        "One sentence fixed MCP.",
        `${numbers.seatsPerArm} seats per surface, ${numbers.model} on ${numbers.harness}. In round 1, most seats sent a command to the wrong id. For round 2, we added one sentence that says which id each command takes.`,
      ),
      h.div(
        [h.Class("mt-10 overflow-x-auto rounded-[24px] bg-g0 py-4")],
        [
          h.table(
            [h.Class("w-full min-w-[520px] text-left text-sm"), h.DataAttribute("bench", "run1-vs-run2")],
            [
              h.thead(
                [h.Class("text-g6")],
                [
                  h.tr(
                    [],
                    ["Surface", "Round 1 passed", "Round 2 passed", "Mean turns", "Mean cost"].map((label) =>
                      h.th([h.Class("px-8 pt-3 pb-4 text-[13px] font-normal text-g5")], [label]),
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
        [h.Class("mt-5 px-2 text-sm text-g6")],
        [
          h.span([h.Class("font-medium text-k1")], [`(${numbers.run1.total} → ${numbers.run2.total})`]),
          " total cost per round. ",
          h.a(
            [h.Href("/docs/bench/"), h.Class("text-k1 underline underline-offset-[5px]")],
            ["Read the receipts →"],
          ),
        ],
      ),
    ],
  );

const footer = (h: H): Html =>
  h.footer(
    [h.Class("mx-auto mt-8 max-w-6xl px-5 pb-12")],
    [
      h.div(
        [h.Class("flex flex-wrap items-center justify-between gap-3 text-sm text-g6")],
        [
          h.p([h.Class("flex items-center gap-2")], [logo(h, 16), "You run it. There is no hosted service."]),
          h.div(
            [h.Class("flex gap-5")],
            [
              h.a([h.Href("/docs/"), h.Class("hover:text-k1")], ["Docs"]),
              h.a([h.Href("/llms.txt"), h.Class("hover:text-k1")], ["llms.txt"]),
              h.a([h.Href(repo), h.Class("hover:text-k1")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

export const view = (model: Model, h: H): Html =>
  h.div([], [nav(h), h.main([], [hero(h, model), promises(h), surfaces(h, model), bench(h)]), footer(h)]);
