---
title: The model
description: The words assay uses, its commands, and the rules that refuse them.
order: 3
---

Assay is a domain model built with [@alchemy.run/domain](https://alchemy.run/domain). Every rule lives in one place, and the same model runs in memory for tests and on Durable Objects in production.

## Words

| Word | Means |
|---|---|
| Shape | Who an agent is: harness, model, tools, limits. |
| Plan | What to run: a list of seats. Frozen at start. |
| Seat | One agent, one goal, one workspace, one hidden grader. |
| Assay | One run of a plan. It owns its seats and its budget. |
| Receipt | What a seat did: outcome, turns, spend. Written by the runner. |
| Grade | What the hidden grader said: passed or failed, and why. |
| Score | Recomputed from every receipt and grade. |

## Commands

| Command | Sent to | Refused when |
|---|---|---|
| `StartAssay` | assay id | already started; no seats; no budget; a seat twice |
| `ClaimSeat` | assay id | not running; unknown seat; already claimed; over budget |
| `RecordReceipt` | seat id | already stopped; a resumed seat with a different plan |
| `RecordGrade` | seat id | no receipt yet; already graded |
| `CancelAssay` | assay id | not running |

Every refusal is a typed rejection with its own name, for example `OverBudget { remainingMicroUsd, neededMicroUsd }`. A refusal that comes from a wrong id says which id to use.

## Reads

| Read | Key | Holds |
|---|---|---|
| `AssayScore` | assay id | seats, graded, passed, spent, budget, status |
| `SeatStatus` | seat id | stage, attempts, turns, spent, passed, reason |

## What happens on its own

When a seat is graded, a policy settles it on its assay: the hold is released, the real spend is charged, and the grade is counted. When the last seat settles, the assay finishes.

## How it is checked

Eleven stories run the whole model in memory, one per rule. Each story fails if any event, rejection or reply is not accounted for.
