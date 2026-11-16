---
title: The model
description: The words assay uses, its commands, and the rules that refuse them.
order: 3
---

The runner keeps its books in a domain model built with [Alchemy Domain](https://alchemy.run/domain) (`@alchemy.run/domain`). Every rule about budgets, receipts and grades lives in `packages/domain`. `assay run` starts a local copy of it for each run. The CLI and the MCP server are both generated from the same `AssayApi`, so they cannot drift apart.

A command is a class. Its input, its events, its refusals and its reply are all typed:

```ts
export class ClaimSeat extends Domain.Command(
  "ClaimSeat",
  {
    target: AssayId,
    input: { seat: Schema.String, runner: Schema.String },
    events: [SeatClaimed],
    rejects: [NotRunning, UnknownSeat, AlreadyClaimed, OverBudget],
    reply: { reservedMicroUsd: MicroUsd },
  },
  { description: "Reserve a seat's worst-case cost from the budget so a runner may start it." },
) {}
```

| File | Kind |
|---|---|
| `Assay/Assay.aggregate.ts` | The assay: plan, budget, holds, seats |
| `Seat/Seat.aggregate.ts` | One seat: receipt, grade |
| `Seat/SeatSettlement.policy.ts` | When a seat is graded, settle it on its assay |
| `Assay/AssayScore.view.ts`, `Seat/SeatStatus.view.ts` | Reads |
| `AssayApi.api.ts` | What the CLI and MCP expose |

You can also drive the model yourself, from the CLI or over MCP, if you write your own runner. See [CLI and MCP](/docs/cli-and-mcp/).

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
| `SkipSeat` | assay id | not running; seat already claimed or skipped |
| `RecordReceipt` | seat id | already stopped (outcome is stopped, died or killed, with turns, steers and spend); a resumed seat with a different plan |
| `RecordGrade` | seat id | no receipt yet; already graded |
| `CancelAssay` | assay id | not running |

Every refusal has its own name and fields, for example `OverBudget { remainingMicroUsd, neededMicroUsd }`. If you send a wrong id, the refusal names the right one.

## Reads

| Read | Key | Holds |
|---|---|---|
| `AssayScore` | assay id | seats, graded, passed, skipped, spent, budget, status |
| `SeatStatus` | seat id | stage, attempts, turns, steers, spent, passed, reason |

## What happens on its own

When a seat is graded, its assay releases the hold, charges the real cost and counts the grade. When the last seat is done, the assay finishes.

## How it is checked

Thirteen story tests run the model in memory, one per rule. They are written with Alchemy Domain's `Story` helpers: given these events, when this command, then exactly these events, or this refusal. A test fails if any event, refusal or reply is unexpected.
