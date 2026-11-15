# Assay domain

Assay runs many agents at once on the same goal and scores each one with a grader the agent never sees.

## Words

| Word | Means |
|---|---|
| **Shape** | Who an agent is: harness, model, tools, limits. Data, not code. |
| **Plan** | What to run: a list of seats. Frozen when it starts, so a score always points at one plan. |
| **Seat** | One agent, one goal, one workspace, one hidden grader. |
| **Assay** | One run of a plan. It owns its seats and its budget. |
| **Receipt** | What a seat did: outcome, turns, cost, tool calls. Written by the runner, never by the agent. |
| **Grade** | What the hidden grader said: pass or fail, and why. |
| **Score** | Recomputed from every receipt and grade. Never taken from the agent or the runner. |

## Rules that must hold

1. A plan is frozen at start. Its hash is on every receipt.
2. A seat is graded once, after it stops, by a grader it could not read or write.
3. The score is recomputed from receipts and grades. A score that disagrees with them is refused.
4. Spend never passes the budget. A seat is not started if its worst-case cost would pass it.
5. A seat that dies can be resumed. A seat that finished cannot be run again in the same assay.
6. One receipt per seat. A second receipt for the same seat is refused.

## Aggregates

- `Assay`: the run. Keyed by `AssayId`. Holds the frozen plan hash, the budget, spent so far, and each seat's stage.
- `Seat`: one agent. Keyed by `SeatId` (`<assayId>/<seatId>`). Holds its stage, receipt and grade.

## Commands and what refuses them

| Command | Aggregate | Refused when |
|---|---|---|
| `StartAssay` | Assay | already started; no seats; budget not above 0 |
| `ClaimSeat` | Assay | not running; seat unknown; seat already claimed; would pass budget |
| `RecordReceipt` | Seat | not running; receipt already recorded |
| `RecordGrade` | Seat | no receipt yet; already graded |
| `ResumeSeat` | Seat | not dead; already graded |
| `CancelAssay` | Assay | already finished |

## Views

- `AssayScore`: per assay, recomputed from every `SeatGraded`: seats, passed, spent, done.
- `SeatTimeline`: per seat, for the site and the CLI.

## Not in this model

- Running agents (the server package does it: local processes, Containers, or facets).
- Model calls (AI Gateway, in the server package).
- The grader itself (a command the server runs after the seat stops).
