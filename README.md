# assay

Coding agents, checked by tests they never see. The passing work lands on your branch.

[assay.coey.dev](https://assay.coey.dev) · [Docs](https://assay.coey.dev/docs/) · [Recipes](https://assay.coey.dev/docs/recipes/) · [llms.txt](https://assay.coey.dev/llms.txt)

## Three rules

| Rule | How |
|---|---|
| Agents never see the tests | Folders in `hidden` are blocked: `sandbox-exec` on macOS, bubblewrap on Linux. No sandbox, no run. |
| Agents never hold a key | A relay holds the provider token. Each agent gets a seat key that only works through the relay, for the models on the card, inside the budget. |
| Only passing work lands | `land` puts the passing seats on one branch and runs your tests there. You merge. |

## Where it runs

On your machine, or in any Linux container with git, bun and bubblewrap. Agents are [Pi](https://pi.dev) processes, each in its own git worktree. Nothing is uploaded. There is no assay server or account.

## Install

No npm package yet. Clone it:

```sh
git clone https://github.com/acoyfellow/assay
cd assay && bun install
```

Point the relay at your provider. The token stays with assay, never with the agents:

```sh
export ASSAY_UPSTREAM_URL=https://api.anthropic.com
export ASSAY_UPSTREAM_TOKEN_COMMAND='cat ~/.secrets/anthropic'
```

## From a chat, in Pi

```sh
pi -e packages/pi/src/index.ts
```

Talk about the work, then type `/assay <what you want>`. Your agent writes the tasks and the hidden tests, proves the tests, and shows a contract card. Nothing runs before you type `go`. Steer in plain words. Only `/assay-off` ends it. Nothing is merged.

## From a terminal

```sh
bun assay run examples/tally/plan.json
bun assay status
bun assay steer <seat> "run the tests before you stop"
bun assay stop <seat>
bun assay land runs/<run>
```

## Recipes

| Recipe | Use it when |
|---|---|
| [`fix-the-build`](examples/recipes/fix-the-build) | Tests are red |
| [`backlog`](examples/recipes/backlog) | Several small tickets |
| [`best-of-n`](examples/recipes/best-of-n) | A task is hard for a cheap model |
| [`model-bakeoff`](examples/recipes/model-bakeoff) | Is the cheap model good enough? |

Each has a plan, tasks, a hidden test, a known good fix and the receipts from a real run.

## Other guarantees

| | How |
|---|---|
| Agents only write their files | A Pi extension blocks writes outside the seat's `writable` |
| Spend stays in budget | A seat starts only if its worst case fits. It is stopped when its streamed spend passes its cap. The relay refuses calls past the budget. |
| Tests are worth trusting | `proof/recipes-gate.sh`: the untouched repo must fail, a known good fix must pass |

## Layout

| Path | What |
|---|---|
| `packages/domain` | The books: budget, holds, receipts, grades, score. Built with [Alchemy Domain](https://alchemy.run/domain). |
| `packages/server` | The ledger CLI and MCP server, both made from one Api |
| `packages/runner` | Agents in git worktrees, the model relay, the control server, `land` |
| `packages/pi` | assay mode for Pi |
| `packages/web` | assay.coey.dev |
| `examples/` | The tally repo and the recipes |
| `proof/` | The gates |

## Checks

```sh
bash proof/gate.sh       # domain, server, runner, recipes
bash proof/pi-gate.sh    # assay mode in Pi
bash proof/web-gate.sh   # the site
```

## License

MIT
