---
title: What assay is
description: Run many agents on one goal. Score each with a grader it never sees.
order: 1
---

Assay runs many agents on the same goal and scores each one with a grader the agent cannot see or change.

You give it a plan: a list of **seats**. A seat is one agent, one goal, one workspace and one hidden grader. Assay freezes the plan, holds each seat's worst-case cost from your budget, and keeps one receipt and one grade per seat. The score is recomputed from those receipts. It is never taken from the agent.

## When to use it

- You want to know which model, prompt or tool surface does a task best, and you want numbers, not a feeling.
- You want many attempts at one task, and you want to keep only the ones that pass a check.
- You hand this job to an agent, and you need it to stay inside a budget.

## What it promises

1. A plan is frozen when the assay starts. Every receipt names the plan it ran.
2. A seat starts only if its worst-case cost still fits the budget.
3. A seat is graded once, after it stops, by a grader it could not read or write.
4. A seat that dies can be resumed. Its spend adds up across attempts.
5. The score is recomputed from receipts and grades.

## What it does not do

- It does not run on our servers. You run it, on your machine or on your own Cloudflare account.
- It does not give you a model. Your agents call the model you choose, for example through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/).
- It does not decide a winner for you. It gives you receipts and a score you can check.

Next: [Quick start](/docs/quick-start/).
