---
title: What assay is
description: Spin up a fleet of coding agents. Each gets its own copy of your repo, and a test it never saw checks the work.
order: 1
---

Assay starts many coding agents at once from one plan file.

Each agent:

- gets its own copy of your repo,
- can write only the files you allow,
- stops at a time limit,
- is graded after it stops by a command it never saw.

Assay holds each agent's worst-case cost from your budget before it starts, and writes one receipt per agent. The score is added up from the receipts, never taken from the agent.

## What people use a fleet for

- **Many tasks at once.** Ten small fixes, ten agents, one command.
- **The same task many times.** Run it five times and keep the copy that passed.
- **Comparing setups.** Same tasks, two models or two prompts, and the same grader for both.

## What it runs on

- Agents run with [Pi](https://pi.dev) on your machine, using the model you choose, for example through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/).
- The grader is any shell command. Exit 0 means pass.

## What it does not do yet

- It does not run agents in the cloud. Today the fleet runs on your machine, as many at once as you set in `parallel`.
- It does not merge the passing work back for you. Each agent's copy stays in the run folder.

Next: [Quick start](/docs/quick-start/).
