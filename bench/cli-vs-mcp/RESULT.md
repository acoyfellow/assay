# CLI vs MCP

## Run 1 vs run 2

Run 1: `target` had no description, and `NotRunning` said nothing. Run 2: `target` says which id it takes, and `NotRunning` names the right assay id when it gets a seat id. Task, model and grader are the same.

| Arm | Run 1 passed | Run 2 passed | Run 1 mean turns | Run 2 mean turns | Run 1 mean cost | Run 2 mean cost |
|---|---|---|---|---|---|---|
| cli | 5/5 | 5/5 | 22.8 | 14.0 | $0.0500 | $0.0340 |
| mcp | 1/5 | 5/5 | 11.4 | 6.0 | $0.0377 | $0.0247 |

## Run 2

Same task, same model (Claude Haiku 4.5 on Pi), same domain Api. Only the surface differs: the `assay` CLI made by `toCli`, or the MCP tools made by `toMcp`.
A hidden grader reads the seat's own assay server after the agent stops. Every receipt and grade is recorded in a separate assay ledger, and its `AssayScore` is checked against the receipts.

| Arm | Passed | Mean turns | Mean tool calls | Mean cost | Total cost | Mean time |
|---|---|---|---|---|---|---|
| cli | 5/5 | 14.0 | 17.0 | $0.0340 | $0.1700 | 34s |
| mcp | 5/5 | 6.0 | 8.0 | $0.0247 | $0.1236 | 17s |

Total spend: $0.2936.

## Failed seats

None.

## First claims in run 2

| Arm | First claim used a seat id | Then retried with the assay id |
|---|---|---|
| cli | 0/5 | 0/0 |
| mcp | 0/5 | 0/0 |

Run 1's version of this table and its explanation are in `receipts-run1/RESULT.md`.

## What this does not show

- 5 seats per arm is a first signal, not a verdict.
- One task, one model, one harness.
