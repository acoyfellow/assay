---
title: The model
description: The words assay uses, its commands, and the rules that refuse them.
order: 3
---

Assay is a domain model built with [@alchemy.run/domain](https://alchemy.run/domain). Every rule is in one place. Today the model runs in memory, for tests and for the local server.

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
| `StartAssay` | assay id | already started; no seats; no budget; a seat listed twice |
| `ClaimSeat` | assay id | not running; unknown seat; already claimed; over budget |
| `RecordReceipt` | seat id | already stopped; a resumed seat with a different plan |
| `RecordGrade` | seat id | no receipt yet; already graded |
| `CancelAssay` | assay id | not running |

Every refusal has its own name and fields, for example `OverBudget { remainingMicroUsd, neededMicroUsd }`. If you send a wrong id, the refusal names the right one.

## Reads

| Read | Key | Holds |
|---|---|---|
| `AssayScore` | assay id | seats, graded, passed, spent, budget, status |
| `SeatStatus` | seat id | stage, attempts, turns, spent, passed, reason |

## What happens on its own

When a seat is graded, its assay releases the hold, charges the real cost and counts the grade. When the last seat is done, the assay finishes.

## How it is checked

Eleven tests run the model in memory, one per rule. A test fails if any event, refusal or reply is unexpected.
