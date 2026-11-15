# CLI vs MCP: first assay

Same task, same model (Claude Haiku 4.5 on Pi), same domain Api. Only the surface differs: the `assay` CLI made by `toCli`, or the MCP tools made by `toMcp`.
A hidden grader reads the seat's own assay server after the agent stops. Every receipt and grade is recorded in a separate assay ledger, and its `AssayScore` is checked against the receipts.

| Arm | Passed | Mean turns | Mean tool calls | Mean cost | Total cost | Mean time |
|---|---|---|---|---|---|---|
| cli | 5/5 | 22.8 | 28.0 | $0.0500 | $0.2499 | 59s |
| mcp | 1/5 | 11.4 | 15.4 | $0.0377 | $0.1887 | 34s |

Total spend: $0.4386.

## Failed seats

- mcp-1: score.graded is 0, want 2; score.passed is 0, want 1; score.spentMicroUsd is 0, want 33000; score.status is "running", want "finished"
- mcp-3: score.graded is 0, want 2; score.passed is 0, want 1; score.spentMicroUsd is 0, want 33000; score.status is "running", want "finished"
- mcp-2: score.graded is 0, want 2; score.passed is 0, want 1; score.spentMicroUsd is 0, want 33000; score.status is "running", want "finished"
- mcp-4: score.graded is 0, want 2; score.passed is 0, want 1; score.spentMicroUsd is 0, want 33000; score.status is "running", want "finished"

## Why seats failed

The task gives a seat id as `job-7/alpha`. Most seats first sent `ClaimSeat` with that seat id as its target, not the assay id `job-7`. The server refuses it with `NotRunning`, the seats are never charged to the assay, and its score stays at 0 graded.

| Arm | First claim used a seat id | Then retried with the assay id |
|---|---|---|
| cli | 4/5 | 4/4 |
| mcp | 5/5 | 1/5 |

Both arms made the same first mistake. The difference is recovery: the CLI arm read `assay claim-seat --help` and its exit code, and retried. The MCP arm got `{"_tag":"NotRunning"}` and moved on. In both surfaces, `target` has no description, and `NotRunning` does not say the target is wrong.

## What this does not show

- 5 seats per arm is a first signal, not a verdict.
- One task, one model, one harness.
