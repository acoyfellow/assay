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
        [h.Class("rounded-[30px] bg-g0 p-2.5 shadow-shell sm:rounded-shell sm:p-3.5")],
        [
          h.div(
            [h.Class("rounded-[22px] bg-g1 p-2 sm:rounded-well sm:p-3")],
            [
              h.div(
                [h.Class("grid gap-3 lg:grid-cols-[1fr_1.05fr]")],
                [
                  h.div(
                    [h.Class("flex flex-col gap-5 rounded-card border border-g3 p-6 sm:p-9")],
                    [
                      h.p(
                        [h.Class("text-[13px] font-medium text-[#d2691e]")],
                        ["Open source · your machine or your Cloudflare account"],
                      ),
                      h.h1(
                        [h.Class("display text-[40px] leading-[1.05] text-balance sm:text-[56px]")],
                        [
                          h.span([h.Class("text-g5")], ["Evals tell you who wins. "]),
                          "Assay makes the next round better.",
                        ],
                      ),
                      h.p(
                        [h.Class("max-w-[44ch] text-[16px] text-g6 text-pretty")],
                        [
                          "Run many agents on one goal. Grade each one with a check it cannot see. Change one thing, run again, keep what passes.",
                        ],
                      ),
                      h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                          chip(h, "Frozen plan"),
                          chip(h, "Hidden grader", true),
                          chip(h, "Budget held"),
                          chip(h, "Receipts"),
                        ],
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
                    [h.Class("dark-card flex min-w-0 flex-col gap-5 rounded-card p-6 text-on-dark sm:p-9")],
                    [
                      h.h2([h.Class("display text-[26px] leading-tight")], ["Hand it to your agent"]),
                      h.p(
                        [h.Class("text-[15px] text-on-dark-dim")],
                        ["One line installs the CLI and the MCP tools. Your agent drives the rest."],
                      ),
                      h.div(
                        [
                          h.Class(
                            "flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 pl-4",
                          ),
                        ],
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
                      h.div(
                        [h.Class("flex flex-wrap items-center justify-between gap-3")],
                        [
                          h.span(
                            [
                              h.Class(
                                "inline-flex items-center gap-2.5 rounded-full border border-ok/15 bg-ok-deep px-4 py-2.5 text-[15px] text-ok",
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
    [h.Class("rounded-card bg-g0 p-5 shadow-pill")],
    [
      h.p([h.Class("font-mono text-xs text-g5")], [n]),
      h.h3([h.Class("mt-2 text-[17px] font-medium")], [title]),
      h.p([h.Class("mt-1 text-sm text-g6")], [body]),
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
    [h.Class("mx-auto max-w-6xl px-5 py-12")],
    [
      sectionHead(
        h,
        "A loop, not a scoreboard. ",
        "Each round earns its place.",
        "A score alone tells you who won. The loop tells you what to change, and proves the change helped.",
      ),
      h.div(
        [h.Class("mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4")],
        [
          loopStep(
            h,
            "01",
            "Freeze the plan",
            "Every receipt names the plan it ran. Change the plan, start a new assay.",
          ),
          loopStep(
            h,
            "02",
            "Hold the budget",
            "A seat starts only if its worst case still fits. Real spend replaces the hold.",
          ),
          loopStep(
            h,
            "03",
            "Grade in secret",
            "Each seat is graded once, after it stops, by a check it could not read or write.",
          ),
          loopStep(
            h,
            "04",
            "Recompute, then change one thing",
            "The score comes from receipts, never the agent's report. Then run the next round.",
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
    [h.Class("mx-auto max-w-6xl px-5 py-12")],
    [
      h.div(
        [h.Class("grid gap-3 lg:grid-cols-[1fr_1.3fr]")],
        [
          h.div(
            [h.Class("flex flex-col gap-4 rounded-card border border-g3 p-6 sm:p-9")],
            [
              h.h2(
                [h.Class("display text-[30px] leading-[1.1]")],
                [h.span([h.Class("text-g5")], ["One model. "]), "Two surfaces."],
              ),
              h.p(
                [h.Class("text-g6")],
                [
                  "The CLI and the MCP tools are both made from one domain model. They take the same inputs, refuse the same things, and say the same words. A wrong id gets a refusal that names the right one.",
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
            [h.Class("dark-card flex min-w-0 flex-col gap-4 rounded-card p-5 sm:p-7")],
            [
              h.div(
                [h.Class("inline-flex self-start gap-1 rounded-full border border-white/10 p-1")],
                [tab(h, model, "cli", "CLI"), tab(h, model, "mcp", "MCP")],
              ),
              h.pre(
                [
                  h.Class(
                    "overflow-x-auto rounded-inset border border-white/10 bg-white/[0.02] p-5 font-mono text-[12.5px] leading-[1.75] text-on-dark-dim",
                  ),
                ],
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
    [h.Class("border-t border-g2")],
    [
      h.td([h.Class("px-5 py-3.5 font-medium")], [after.arm.toUpperCase()]),
      h.td([h.Class("px-5 py-3.5 font-mono text-g6")], [`${before.passed}/${before.seats}`]),
      h.td([h.Class("px-5 py-3.5 font-mono font-medium text-[#d2691e]")], [`${after.passed}/${after.seats}`]),
      h.td([h.Class("px-5 py-3.5 font-mono text-g6")], [`${before.meanTurns} → ${after.meanTurns}`]),
      h.td([h.Class("px-5 py-3.5 font-mono text-g6")], [`${before.meanCost} → ${after.meanCost}`]),
    ],
  );

const bench = (h: H): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-12")],
    [
      sectionHead(
        h,
        "We ran the loop on assay. ",
        "One change closed the gap.",
        `${numbers.seatsPerArm} seats per surface, ${numbers.model} on ${numbers.harness}, a hidden grader. In round 1, most MCP seats sent a command to the wrong id. In round 2, the model said which id each command takes.`,
      ),
      h.div(
        [h.Class("mt-6 overflow-x-auto rounded-card bg-g0 shadow-pill")],
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
                      h.th([h.Class("px-5 py-3.5 text-[13px] font-medium")], [label]),
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
        [h.Class("mt-4 text-sm text-g6")],
        [
          h.span([h.Class("font-medium text-k1")], [`(${numbers.run1.total} → ${numbers.run2.total})`]),
          " total spend per round. ",
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
    [h.Class("mx-auto mt-6 max-w-6xl px-5 pb-10")],
    [
      h.div(
        [
          h.Class(
            "flex flex-wrap items-center justify-between gap-3 border-t border-g3 pt-6 text-sm text-g6",
          ),
        ],
        [
          h.p(
            [h.Class("flex items-center gap-2")],
            [logo(h, 16), "MIT. You run it: no hosted service, no free model calls."],
          ),
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
