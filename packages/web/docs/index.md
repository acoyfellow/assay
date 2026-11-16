---
title: What assay is
description: Coding agents, checked by tests they never see. The passing work lands on your branch.
order: 1
---

Assay runs coding agents on your repo and decides for itself whether they worked. The agent does not get a say.

Each agent:

- gets its own copy of your repo,
- can write only the files you allow,
- cannot read the tests that grade it,
- holds no model key. Its calls go through a relay that holds the key,
- stops at a time limit and a spend cap.

After an agent stops, assay runs the hidden test in its copy. Only work that passes lands on your branch, and your tests run on that branch.

## Three rules

| Rule | How |
|---|---|
| Agents never see the tests | Folders in `hidden` are blocked: `sandbox-exec` on macOS, bubblewrap on Linux. If neither is there, assay will not run. |
| Agents never hold a key | The relay adds your provider token outside the agent. Each agent gets a seat key that works only through the relay, only for the models on the card, only inside the budget. |
| Only passing work lands | `land` cherry-picks the passing seats onto one branch and runs your tests. You merge. |

## Where it runs

- On your machine, or in a Linux container with git, bun and bubblewrap.
- Agents are [Pi](https://pi.dev) processes. The relay speaks the Anthropic messages API, so any provider or gateway with that API works, for example [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/).
- Nothing is uploaded. There is no assay server or account.

## What people use it for

- **Many tasks at once.** Ten small fixes, ten agents, one command.
- **The same task many times.** Run it five times and keep the copy that passed.
- **Comparing setups.** Same tasks, two models, the same hidden test for both.

## When not to use it

When there is nothing to test: design, writing, research. Use plain subagents for those.

## What it does not do yet

- It does not merge for you. `land` makes a branch. You merge.
- The relay speaks only the Anthropic messages API.
- There is no npm package. Clone the repo.

Next: [Quick start](/docs/quick-start/).
