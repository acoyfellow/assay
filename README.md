# assay

Spin up a fleet of coding agents. Each gets its own copy of your repo, a test it never saw checks the work, and the passing work lands on a branch.

[assay.coey.dev](https://assay.coey.dev) · [Docs](https://assay.coey.dev/docs/) · [Recipes](https://assay.coey.dev/docs/recipes/) · [llms.txt](https://assay.coey.dev/llms.txt)

## From a chat, in Pi

```sh
git clone https://github.com/acoyfellow/assay
cd assay && bun install
pi -e packages/pi/src/index.ts
```

Talk about the work, then type `/fleet <what you want>`. Your agent drafts the plan and the hidden tests, proves the tests, and shows a contract card. Nothing runs before you type `go`. Steer the agents in plain words. The passing work lands on a branch. Only `/fleet-off` ends it. Nothing is merged.

## From a terminal

```sh
export ASSAY_PI_PROVIDER=anthropic
bun packages/fleet/src/cli.ts run examples/tally/plan.json
bun packages/fleet/src/cli.ts ps
bun packages/fleet/src/cli.ts steer <seat> "run the tests before you stop"
bun packages/fleet/src/cli.ts land runs/<run>
```

## Recipes

| Recipe | Use it when |
|---|---|
| [`fix-the-build`](examples/recipes/fix-the-build) | Tests are red |
| [`backlog`](examples/recipes/backlog) | Several small tickets |
| [`best-of-n`](examples/recipes/best-of-n) | A task is hard for a cheap model |
| [`model-bakeoff`](examples/recipes/model-bakeoff) | Is the cheap model good enough? |

Each has a plan, tasks, a hidden grader, a known good fix and the receipts from a real run.

## What it guarantees

| | How |
|---|---|
| Agents only write their files | A Pi extension blocks writes outside the seat's `writable` |
| Agents cannot read the graders | Folders in `hidden` are blocked with `sandbox-exec` on macOS |
| Spend stays in budget | A seat starts only if its worst case fits. It is stopped when its streamed spend passes its cap. |
| Graders are worth trusting | `proof/recipes-gate.sh`: the untouched repo must fail, a known good fix must pass |
| Nothing merges | `land` makes a branch and runs your tests. You merge. |

## Layout

| Path | What |
|---|---|
| `packages/domain` | The books: budget, holds, receipts, grades, score. Built with [Alchemy Domain](https://alchemy.run/domain). |
| `packages/server` | The CLI and MCP server, both made from one Api |
| `packages/fleet` | The runner: Pi RPC agents in git worktrees, control server, `land` |
| `packages/pi` | Fleet mode for Pi |
| `packages/web` | assay.coey.dev |
| `examples/` | The tally repo and the recipes |
| `proof/` | The gates |

## Checks

```sh
bash proof/gate.sh       # domain, server, fleet, recipes
bash proof/pi-gate.sh    # fleet mode in Pi
bash proof/web-gate.sh   # the site
```

## License

MIT
