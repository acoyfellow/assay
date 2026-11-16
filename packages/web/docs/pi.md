---
title: Fleet mode in Pi
description: Talk about the work, type /fleet, check the contract card, type go. Steer the agents in plain words. The work lands on a branch. Only /fleet-off ends it.
order: 2.2
---

Fleet mode is a [Pi](https://pi.dev) extension. You do not write a plan by hand. You talk, your agent drafts the fleet, and you say go.

```sh
pi -e packages/pi/src/index.ts
```

To load it every time, add the folder to `packages` in your Pi settings.

## How a session goes

| You | What happens |
|---|---|
| Talk about the work | Normal chat |
| `/fleet <what you want>` | Your agent copies the closest [recipe](/docs/recipes/), writes `fleet/plan.json`, the tasks, the hidden checks and a known good fix. It may only write under `fleet/`. |
| | It calls `fleet_card`. The card shows only after the graders are proven: the untouched repo must fail, the known good fix must pass. |
| `go` | The fleet starts. Before this, no agent runs and nothing is spent. |
| "how are they doing?" | Your agent calls `fleet_ps` |
| "tell the shipping one to run the tests" | Your agent calls `fleet_steer`. It reaches the agent after its current step and is counted on its receipt. |
| "stop the tax one" | Your agent calls `fleet_kill`. The others keep going. |
| | A round ends. Tasks with no passing agent run again, while the budget allows. Then `land` puts one passing diff per task on a branch and runs the tests. |
| `/fleet-off` | Fleet mode ends. Nothing is merged. The branch stays in the run folder. |

## The contract card

```text
FLEET CONTRACT · tally-tickets

  task shipping-free        writes src/shipping.ts, test/shipping.test.ts
  task tax-regions          writes src/tax.ts, test/tax.test.ts

  agents     4 per round, 4 at a time, model claude-haiku-5-5
  rounds     2 (failed tasks run again while budget is left)
  cost       at most $0.56 (budget $0.60, $0.07 cap per agent)
  hidden     checks, reference
  land test  node --test
  graders    proven: untouched repo fails, known good fix passes

Type go to start. Nothing runs before that.
```

If a grader passes the untouched repo, the card says `NOT PROVEN` and `go` is locked.

## Limits

| Limit | How |
|---|---|
| Files | Each agent may only write its seat's `writable` paths |
| Graders | Folders in `hidden` cannot be read by agents (macOS `sandbox-exec`) |
| Money | A seat starts only if its worst case fits the budget. A seat is stopped when its spend, counted while it streams, passes `worstCaseUsdPerSeat`. |
| Merging | Never. You get a branch. |
| Ending | Only `/fleet-off` |

## A real session

One run on a laptop, the driver and four Haiku agents. Two tickets, both landed, tests pass, $0.035 in total. The full log is in `packages/pi/receipts/session.txt`.

```text
you: /fleet both tickets, 2 tries each, up to 2 rounds, keep the whole run under $0.60
pi:  (writes fleet/, proves the graders, shows the card)
you: go
you: tell every agent still working to run node --test before it stops
pi:  → fleet_steer all
     tax-regions-1     PASS  4 turns  $0.0015  13s  steered 1
     tax-regions-2     PASS  5 turns  $0.0017  15s  steered 1
     shipping-free-1   PASS  4 turns  $0.0018  18s  steered 1
     shipping-free-2   PASS  5 turns  $0.0024  18s  steered 1
     LAND shipping-free: passed, 20 lines
     LAND tax-regions: passed, 5 lines
     Branch assay/tally-tickets: 2/2 tasks, tests pass.
you: /fleet-off
```

## How it is checked

`proof/pi-gate.sh` runs fleet mode with a fake agent: the card numbers, no agent before go, a steer from a tool reaches the agent, a failed task runs again in round 2 and lands, the budget stops the retries, and only off ends it. It also starts Pi and checks the commands load.
