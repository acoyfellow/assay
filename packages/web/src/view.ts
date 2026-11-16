import type { Html, HtmlBuilder } from "foldkit/html";
import { installSteps, type OutputLine } from "./command.ts";
import { heroStage, phaseList } from "./hero.ts";
import { Message } from "./message.ts";
import type { Model, Surface } from "./model.ts";
import numbers from "./numbers.json";
import { cellsOf, type Drawing } from "./pixels.ts";

type H = HtmlBuilder<Message>;
type Arm = (typeof numbers.run2.arms)[number];

const repo = "https://github.com/acoyfellow/assay";

const piCall = [
  "you  /assay both tickets, 2 tries each,",
  "     2 rounds, under $0.60",
  "",
  "pi   ASSAY CONTRACT · tally-tickets",
  "     shipping-free  writes src/shipping.ts",
  "     tax-regions    writes src/tax.ts",
  "     agents   4 per round, 2 rounds",
  "     cost     at most $0.56",
  "     hidden   checks, reference",
  "     graders  proven",
  "     Type go to start.",
  "",
  "you  go",
  "you  tell them all to run the tests",
  "pi   → assay_steer all · steered 4",
  "",
  "     shipping-free-1  PASS  $0.0018",
  "     tax-regions-1    PASS  $0.0015",
  "     branch assay/tally-tickets",
  "     2/2 tasks, tests pass",
  "",
  "you  /assay-off",
].join("\n");

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
    [h.Class("sticky top-0 z-10 bg-g2/85 backdrop-blur")],
    [
      h.div(
        [h.Class("mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4")],
        [
          h.a(
            [h.Href("/"), h.Class("flex items-center gap-2.5 text-lg tracking-tight text-k1 no-underline")],
            [pixel(h, "tube", 24), "assay"],
          ),
          h.nav(
            [h.Class("flex gap-1 rounded-full bg-g1 p-1 text-sm")],
            [
              h.a(
                [h.Href("/docs/"), h.Class("rounded-full px-3.5 py-1.5 text-k1 no-underline hover:bg-g0")],
                ["Docs"],
              ),
              h.a(
                [
                  h.Href("/docs/bench/"),
                  h.Class("rounded-full px-3.5 py-1.5 text-k1 no-underline hover:bg-g0"),
                ],
                ["Bench"],
              ),
              h.a(
                [h.Href(repo), h.Class("rounded-full px-3.5 py-1.5 text-k1 no-underline hover:bg-g0")],
                ["GitHub"],
              ),
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
        [h.Class("button-light flex size-16 items-center justify-center rounded-full")],
        [
          h.svg(
            [h.ViewBox("0 0 12 12"), h.Width("24"), h.Height("24"), h.ShapeRendering("crispEdges")],
            [h.path([h.D("M4 2 L11 6 L4 10 Z"), h.Fill("var(--color-k1)")], [])],
          ),
        ],
      ),
    ],
  );

const hero = (h: H, model: Model): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-3 pt-6 pb-10 sm:px-5 sm:pt-10")],
    [
      h.div(
        [h.Class("rounded-[32px] bg-g0 p-3 shadow-shell sm:rounded-shell sm:p-4")],
        [
          h.div(
            [h.Class("grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6")],
            [
              h.div(
                [h.Class("flex flex-col gap-6 px-5 pt-8 pb-4 sm:px-10 sm:pt-14 sm:pb-12")],
                [
                  h.h1(
                    [
                      h.Class(
                        "display m-0 text-[40px] leading-[1.05] font-normal text-balance sm:text-[52px]",
                      ),
                    ],
                    [h.span([h.Class("text-g5")], ["Coding agents, "]), "checked by tests they never see."],
                  ),
                  h.p(
                    [h.Class("m-0 max-w-[40ch] text-[16px] text-g6 text-pretty")],
                    [
                      "Run many coding agents on your repo. Each one is graded by a hidden test it cannot read or change. Only work that passes lands on your branch.",
                    ],
                  ),
                  h.ul(
                    [h.Class("m-0 flex list-none flex-wrap gap-2 p-0"), h.DataAttribute("facts", "hero")],
                    heroFacts.map((fact) =>
                      h.li([h.Class("rounded-full bg-g1 px-3.5 py-1.5 text-[13px] text-k1")], [fact]),
                    ),
                  ),
                  phaseList(h, model.clock),
                  h.div([h.Class("grow")], []),
                  h.div(
                    [h.Class("flex flex-wrap items-center gap-3")],
                    [
                      h.a(
                        [
                          h.Href("/docs/quick-start/"),
                          h.Class(
                            "button-dark rounded-full px-5 py-3 text-[15px] font-medium text-on-dark no-underline",
                          ),
                        ],
                        ["Quick start"],
                      ),
                      h.a(
                        [h.Href("/docs/"), h.Class("text-[15px] text-k1 underline underline-offset-[5px]")],
                        ["Read the docs"],
                      ),
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
                        "dark-card relative block w-full cursor-pointer appearance-none overflow-hidden rounded-[24px] border-0 p-6 text-left sm:p-9 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-k1",
                      ),
                    ],
                    [
                      h.div(
                        [h.Class("mb-5 flex items-center justify-between gap-3")],
                        [
                          h.span([h.Class("display text-[22px] text-on-dark")], ["A real run"]),
                          h.span(
                            [
                              h.Class(
                                "inline-flex items-center gap-2 rounded-full bg-ok-deep px-3 py-1.5 font-mono text-[12px] text-ok",
                              ),
                            ],
                            [
                              h.span([h.Class("size-2 rotate-45 rounded-[2px] bg-ok")], []),
                              `${numbers.fleet.passed}/${numbers.fleet.agents} passed · ${numbers.fleet.usd}`,
                            ],
                          ),
                        ],
                      ),
                      h.div(
                        [
                          h.Class(
                            `transition-[filter,opacity] duration-300 ${model.playing ? "" : "opacity-35 grayscale"}`,
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
        ],
      ),
    ],
  );

const toneClass: Record<OutputLine["tone"], string> = {
  dim: "text-on-dark-dim",
  pass: "text-ok",
  fail: "text-[#8a8a87]",
  plain: "text-on-dark",
  command: "text-on-dark",
};

const commandRow = (h: H, text: string): Html =>
  h.span([h.Class("block text-on-dark")], [h.span([h.Class("text-ok")], ["$ "]), text]);

const outputRow = (h: H, line: OutputLine): Html =>
  line.tone === "command"
    ? commandRow(h, line.text)
    : h.span([h.Class(`block w-max break-normal whitespace-pre ${toneClass[line.tone]}`)], [line.text]);

const installStep = (h: H, model: Model, step: (typeof installSteps)[number], index: number): Html =>
  h.li(
    [
      h.Class(
        "grid min-w-0 items-center gap-5 rounded-[24px] bg-g0 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10",
      ),
    ],
    [
      h.div(
        [h.Class("flex min-w-0 flex-col gap-2")],
        [
          h.p([h.Class("m-0 font-mono text-xs text-g5")], [`0${index + 1}`]),
          h.h3([h.Class("m-0 text-[18px] font-medium")], [step.title]),
          h.p([h.Class("m-0 text-[15px] text-g6")], [step.body]),
        ],
      ),
      h.div(
        [h.Class("dark-card min-w-0 rounded-[16px]")],
        [
          h.div(
            [h.Class("flex items-center justify-between py-2 pr-2 pl-4")],
            [
              h.span(
                [h.Class("flex items-center gap-1.5")],
                [
                  h.span([h.Class("size-2.5 rounded-full bg-[#3a3a3c]")], []),
                  h.span([h.Class("size-2.5 rounded-full bg-[#3a3a3c]")], []),
                  h.span([h.Class("size-2.5 rounded-full bg-[#3a3a3c]")], []),
                  h.span(
                    [h.Class("ml-2 font-mono text-[12px] text-on-dark-dim")],
                    [index === 3 ? "terminal 2" : "terminal"],
                  ),
                ],
              ),
              h.button(
                [
                  h.Type("button"),
                  h.OnClick(Message.ClickedCopy({ step: step.id })),
                  h.DataAttribute("copy", step.id),
                  h.Class(
                    "button-light cursor-pointer rounded-full border-0 px-3.5 py-1 text-[12px] font-medium text-k1",
                  ),
                ],
                [model.copied === step.id ? "Copied" : "Copy"],
              ),
            ],
          ),
          h.pre(
            [
              h.Class(
                "m-0 overflow-x-auto px-4 pt-1 pb-4 font-mono text-[12.5px] leading-[1.75] break-all whitespace-pre-wrap text-on-dark",
              ),
            ],
            [
              h.code(
                [],
                [
                  ...step.lines.map((line) => commandRow(h, line)),
                  ...step.output.map((line) => outputRow(h, line)),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );

const getStarted = (h: H, model: Model): Html =>
  band(
    h,
    "Get started.",
    " What you will see.",
    "Real output from one run on a laptop: six Haiku agents, every model call through the relay, all three tasks landed on a branch, 24 cents.",
    [
      h.ol(
        [h.Class("m-0 mt-10 grid list-none gap-4 p-0")],
        installSteps.map((step, index) => installStep(h, model, step, index)),
      ),
      h.p(
        [h.Class("mt-6 mb-0 px-2 text-[15px]")],
        [
          h.a(
            [h.Href("/docs/quick-start/"), h.Class("text-k1 underline underline-offset-[5px]")],
            ["Full quick start, and how to write your own plan"],
          ),
        ],
      ),
    ],
  );

const planExample = `{
  "name": "tally",
  "repo": "seed",
  "model": "claude-haiku-5-5",
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
  band(
    h,
    "How it works.",
    " Four parts.",
    "A plan, a budget, a hidden test per task, and one receipt per agent.",
    [
      h.ol(
        [h.Class("m-0 mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4")],
        [
          [
            "plan",
            "Write a plan",
            "A repo, a model, and a list of tasks. Each task names the files the agent may change and the command that grades it.",
          ],
          [
            "budget",
            "Set a budget",
            "Each agent starts only if its worst-case cost still fits. Run 6 or 60.",
          ],
          [
            "grader",
            "Grade in secret",
            "When an agent stops, assay runs a test it could not read in a clean copy of its work.",
          ],
          [
            "receipt",
            "Read the receipts",
            "One receipt per agent: what it did, what it cost, and whether it passed. The score is added up from those.",
          ],
        ].map(([drawing, title, body]) => rule(h, drawing as Drawing, title as string, body as string)),
      ),
      h.div(
        [h.Class("mt-4 grid gap-4 rounded-shell bg-g0 p-3 sm:p-4 lg:grid-cols-[1fr_1.3fr] lg:gap-6")],
        [
          h.div(
            [h.Class("flex flex-col gap-4 px-5 pt-8 pb-4 sm:px-10 sm:pt-12 sm:pb-10")],
            [
              h.h3(
                [h.Class("display m-0 text-[30px] leading-[1.1] font-normal")],
                [h.span([h.Class("text-g5")], ["One file. "]), "The whole run."],
              ),
              h.p(
                [h.Class("m-0 text-g6")],
                ["Paths are relative to the plan. A writable entry that ends in / allows a whole folder."],
              ),
            ],
          ),
          h.pre(
            [
              h.Class(
                "dark-card m-0 overflow-x-auto rounded-[24px] p-6 font-mono text-[12.5px] leading-[1.75] text-on-dark-dim sm:p-10",
              ),
            ],
            [h.code([], [planExample])],
          ),
        ],
      ),
    ],
  );

const band = (h: H, quiet: string, point: string, body: string, content: readonly Html[]): Html =>
  h.section(
    [h.Class("mx-auto max-w-6xl px-5 py-16 sm:py-24")],
    [
      h.div(
        [h.Class("max-w-2xl")],
        [
          h.h2(
            [h.Class("display m-0 text-[30px] leading-[1.1] font-normal sm:text-[38px]")],
            [h.span([h.Class("text-g5")], [quiet]), point],
          ),
          h.p([h.Class("mt-3 mb-0 text-g6 text-pretty")], [body]),
        ],
      ),
      ...content,
    ],
  );

const rule = (h: H, drawing: Drawing, title: string, body: string): Html =>
  h.li(
    [h.Class("flex flex-col gap-4 rounded-[24px] bg-g0 p-7 sm:p-8")],
    [
      h.div([h.Class("self-start rounded-[14px] bg-g1 p-3")], [pixel(h, drawing, 32, title)]),
      h.h3([h.Class("m-0 mt-2 text-[18px] font-medium")], [title]),
      h.p([h.Class("m-0 text-[15px] text-g6")], [body]),
    ],
  );

const surfaceCall: Record<Surface, string> = { pi: piCall, cli: cliCall, mcp: mcpCall };

const tab = (h: H, model: Model, surface: Surface, label: string): Html =>
  h.button(
    [
      h.Type("button"),
      h.OnClick(Message.ChoseSurface({ surface })),
      h.AriaPressed(String(model.surface === surface)),
      h.Class(
        model.surface === surface
          ? "cursor-pointer rounded-full border-0 bg-white/[0.12] px-4 py-1.5 text-[13px] text-on-dark"
          : "cursor-pointer rounded-full border-0 bg-transparent px-4 py-1.5 text-[13px] text-on-dark-dim hover:text-on-dark",
      ),
    ],
    [label],
  );

const heroFacts = [
  "Tests hidden from agents",
  "Agents hold no keys",
  "Runs on your machine or a container",
] as const;

const versusRows = [
  ["Who says the work is done", "The agent, about itself", "A test the agent never saw"],
  [
    "Can the agent game the check",
    "Yes. It can read and edit the tests.",
    "No. The tests are hidden and it can only write its own files.",
  ],
  [
    "Is the check any good",
    "Nobody checks",
    "Proven first: the untouched repo fails, a known good fix passes",
  ],
  [
    "Who holds the model key",
    "The agent",
    "Only the relay. Agents get a seat key that works for the card's models, inside the budget.",
  ],
  ["Money", "Spent until it stops", "Budget set before go, a cap per agent, stopped mid-turn"],
  ["What you get", "A message saying it worked", "A branch with only passing work, and your tests run on it"],
] as const;

const versus = (h: H): Html =>
  band(
    h,
    "Not just subagents.",
    " A referee they can't see.",
    "Every assay agent is a normal coding agent. The difference is who decides it worked.",
    [
      h.div(
        [h.Class("mt-10 overflow-x-auto rounded-[24px] bg-g0 py-4")],
        [
          h.table(
            [
              h.Class("w-full min-w-[620px] border-collapse text-left text-[15px]"),
              h.DataAttribute("versus", "subagents"),
            ],
            [
              h.thead(
                [],
                [
                  h.tr(
                    [],
                    ["", "Subagents", "assay"].map((label) =>
                      h.th([h.Class("px-8 pt-3 pb-4 text-[13px] font-normal text-g5")], [label]),
                    ),
                  ),
                ],
              ),
              h.tbody(
                [],
                versusRows.map(([question, plain, ours]) =>
                  h.tr(
                    [h.Class("border-t border-g2 align-top")],
                    [
                      h.td([h.Class("px-8 py-4 font-medium")], [question]),
                      h.td([h.Class("px-8 py-4 text-g6")], [plain]),
                      h.td([h.Class("px-8 py-4")], [ours]),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      h.p(
        [h.Class("mt-6 mb-0 px-2 text-[15px] text-g6")],
        [
          "Use plain subagents when there is nothing to test: design, writing, research. Use assay when the work has a test, or you can write one.",
        ],
      ),
    ],
  );

const recipeCards = [
  {
    href: "/docs/recipes/#fix-the-build",
    title: "Fix the build",
    when: "Tests are red.",
    how: "3 agents race a fix. None can touch the tests. Smallest passing diff lands.",
    run: "3/3 passed · $0.11 · 32s",
  },
  {
    href: "/docs/recipes/#clear-a-backlog",
    title: "Clear a backlog",
    when: "Several small tickets.",
    how: "One agent per ticket, all at once. Every passing ticket lands on one branch.",
    run: "4/4 passed · 2 tickets landed · $0.13",
  },
  {
    href: "/docs/recipes/#best-of-n",
    title: "Best of N",
    when: "A task is hard for a cheap model.",
    how: "5 cheap tries at one task. Keep the best one that passes.",
    run: "5/5 passed · $0.42 · 104s",
  },
  {
    href: "/docs/recipes/#model-bakeoff",
    title: "Model bakeoff",
    when: "Is the cheap model good enough?",
    how: "Same task, same hidden test, one seat per model. Compare pass rate and cost.",
    run: "Sonnet $0.22 · Haiku $0.31 · both 2/2",
  },
] as const;

const recipeCard = (h: H, card: (typeof recipeCards)[number]): Html =>
  h.li(
    [h.Class("min-w-0")],
    [
      h.a(
        [
          h.Href(card.href),
          h.Class("flex h-full flex-col gap-3 rounded-[24px] bg-g0 p-6 text-k1 no-underline sm:p-7"),
        ],
        [
          h.p([h.Class("m-0 text-[13px] text-g5")], [card.when]),
          h.h3([h.Class("m-0 text-[20px] font-medium")], [card.title]),
          h.p([h.Class("m-0 flex-1 text-[15px] text-g6")], [card.how]),
          card.run
            ? h.span(
                [h.Class("w-fit rounded-full bg-ok-deep px-3 py-1 font-mono text-[12px] text-ok")],
                [`last run: ${card.run}`],
              )
            : h.span(
                [h.Class("w-fit rounded-full bg-g1 px-3 py-1 font-mono text-[12px] text-g6")],
                ["plan + grader checked"],
              ),
        ],
      ),
    ],
  );

const recipes = (h: H): Html =>
  band(
    h,
    "Recipes.",
    " Run one today.",
    "Each recipe is a folder with a plan, tasks and a grader. A check proves every grader fails the untouched repo and passes a good fix. Run it as is, then copy it for your repo, or hand the page to your agent.",
    [
      h.ul(
        [h.Class("m-0 mt-10 grid list-none gap-4 p-0 sm:grid-cols-2")],
        recipeCards.map((card) => recipeCard(h, card)),
      ),
      h.p(
        [h.Class("mt-6 mb-0 px-2 text-[15px]")],
        [
          h.a(
            [h.Href("/docs/recipes/"), h.Class("text-k1 underline underline-offset-[5px]")],
            ["All recipes, how to write a grader, and a prompt for your agent"],
          ),
        ],
      ),
    ],
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
                [h.Class("display m-0 text-[30px] leading-[1.1] font-normal")],
                [h.span([h.Class("text-g5")], ["Run it "]), "from a chat."],
              ),
              h.p(
                [h.Class("m-0 text-g6")],
                [
                  "In Pi, talk about the work and type /assay. Your agent writes the tasks and the hidden tests, proves the tests work, and shows you a contract. Nothing runs before you type go. You steer in plain words. Only passing work lands, and only /assay-off ends it.",
                ],
              ),
              h.div([h.Class("grow")], []),
              h.a(
                [h.Href("/docs/pi/"), h.Class("text-[15px] text-k1 underline underline-offset-[5px]")],
                ["assay in Pi"],
              ),
            ],
          ),
          h.div(
            [h.Class("dark-card flex min-w-0 flex-col gap-6 rounded-[24px] p-6 sm:p-10")],
            [
              h.div(
                [h.Class("inline-flex self-start gap-1 rounded-full bg-white/[0.05] p-1")],
                [tab(h, model, "pi", "Pi chat"), tab(h, model, "cli", "CLI"), tab(h, model, "mcp", "MCP")],
              ),
              h.pre(
                [h.Class("m-0 overflow-x-auto font-mono text-[12.5px] leading-[1.85] text-on-dark-dim")],
                [h.code([h.DataAttribute("surface-call", model.surface)], [surfaceCall[model.surface]])],
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
      h.td([h.Class("px-8 py-4 text-[16px] font-medium")], [after.arm.toUpperCase()]),
      h.td([h.Class("px-8 py-4 font-mono text-g6")], [`${before.passed}/${before.seats}`]),
      h.td(
        [
          h.Class(
            after.arm === "mcp" ? "px-8 py-4 font-mono font-medium text-[#d2691e]" : "px-8 py-4 font-mono",
          ),
        ],
        [`${after.passed}/${after.seats}`],
      ),
      h.td([h.Class("px-8 py-4 font-mono text-g6")], [`${before.meanTurns} → ${after.meanTurns}`]),
      h.td([h.Class("px-8 py-4 font-mono text-g6")], [`${before.meanCost} → ${after.meanCost}`]),
    ],
  );

const bench = (h: H): Html =>
  band(
    h,
    "One early test.",
    " CLI or MCP?",
    `Before the runner existed: can an agent drive the ledger itself? ${numbers.seatsPerArm} seats per surface, ${numbers.model} on ${numbers.harness}. In round 1, most seats sent a command to the wrong id. For round 2, we added one sentence that says which id each command takes.`,
    [
      h.div(
        [h.Class("mt-10 overflow-x-auto rounded-[24px] bg-g0 py-4")],
        [
          h.table(
            [
              h.Class("w-full min-w-[520px] border-collapse text-left text-sm"),
              h.DataAttribute("bench", "run1-vs-run2"),
            ],
            [
              h.thead(
                [],
                [
                  h.tr(
                    [],
                    ["Surface", "Round 1", "Round 2", "Turns", "Cost per seat"].map((label) =>
                      h.th([h.Class("px-8 pt-3 pb-4 text-[13px] font-normal text-g5")], [label]),
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
        [h.Class("mt-5 mb-0 px-2 text-sm text-g6")],
        [
          `Total cost ${numbers.run1.total} for round 1, ${numbers.run2.total} for round 2. One task and one model, so this is a first signal, not proof. `,
          h.a(
            [h.Href("/docs/bench/"), h.Class("text-k1 underline underline-offset-[5px]")],
            ["Method and receipts"],
          ),
        ],
      ),
    ],
  );

const footer = (h: H): Html =>
  h.footer(
    [h.Class("mx-auto max-w-6xl px-5 pt-6 pb-12")],
    [
      h.div(
        [
          h.Class(
            "flex flex-wrap items-center justify-between gap-4 rounded-full bg-g1 px-6 py-4 text-[13px] text-g6",
          ),
        ],
        [
          h.span([h.Class("flex items-center gap-2 text-k1")], [pixel(h, "tube", 14), "assay"]),
          h.div(
            [h.Class("flex gap-5")],
            [
              h.a([h.Href("/docs/"), h.Class("text-g6 no-underline hover:text-k1")], ["Docs"]),
              h.a([h.Href("/llms.txt"), h.Class("text-g6 no-underline hover:text-k1")], ["llms.txt"]),
              h.a([h.Href(repo), h.Class("text-g6 no-underline hover:text-k1")], ["GitHub"]),
            ],
          ),
        ],
      ),
    ],
  );

export const view = (model: Model, h: H): Html =>
  h.div(
    [],
    [
      nav(h),
      h.main(
        [],
        [
          hero(h, model),
          versus(h),
          surfaces(h, model),
          getStarted(h, model),
          recipes(h),
          howItWorks(h),
          bench(h),
        ],
      ),
      footer(h),
    ],
  );
