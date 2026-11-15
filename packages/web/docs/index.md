---
title: What assay is
description: Run many agents on one goal. A hidden grader checks each one.
order: 1
---

Assay runs many agents on one goal. A grader that the agents cannot see or change checks each one.

You give it a plan: a list of **seats**. A seat is one agent, one goal, one workspace and one hidden grader. Assay freezes the plan and holds each seat's worst-case cost from the budget. It keeps one receipt and one grade per seat, and computes the score from them.

## When to use it

- You change a prompt, model or tool and want to know if it helped.
- You want many attempts at one task and keep only the ones that pass.
- An agent runs the job and must stay inside a budget.

## What it promises

1. A plan is frozen when the assay starts. Every receipt names the plan it ran.
2. A seat starts only if its worst-case cost still fits the budget.
3. A seat is graded once, after it stops, by a grader it could not read or write.
4. A seat that dies can be resumed. Its spend adds up across attempts.
5. The score is recomputed from receipts and grades.

## What it does not do

- It does not run on our servers. You run it on your machine.
- It does not give you a model. Your agents call the model you choose, for example through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/).
- It does not pick a winner. It gives you receipts and a score you can check.

Next: [Quick start](/docs/quick-start/).
