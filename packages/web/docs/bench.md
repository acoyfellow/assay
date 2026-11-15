---
title: The bench
description: CLI vs MCP, measured with assay. Two rounds, one change between them.
order: 5
---

Our first test with assay was of assay. Does an agent do better with the CLI or with the MCP tools?

## How it ran

- {{seatsPerArm}} seats per arm, {{model}} on {{harness}}.
- Each seat gets its own server and one task: start an assay with two seats, claim both, record two receipts, grade them, and report the score.
- After the agent stops, a hidden grader reads that server and checks the score and both seats.
- A second assay records every receipt and grade. The check fails if its score does not match the receipts.

## Run 1

`target` had no description, and a wrong-id refusal said only `NotRunning`.

{{run1}}

Most seats first sent `ClaimSeat` to a seat id. CLI seats saw the exit code and tried again. MCP seats did not.

## Run 2

We added a description to each id, and made the refusal name the right id. The task, model and grader did not change.

{{run2}}

No seat used the wrong id. Both surfaces passed 5 of 5 and cost less.

## What this does not show

- {{seatsPerArm}} seats per arm is a first signal, not proof.
- One task, one model, one harness.
- Both surfaces now find the task easy. The next bench needs a harder task.

## Run it yourself

```sh
ASSAY_PI_PROVIDER=anthropic bun bench/cli-vs-mcp/run.ts
bash proof/bench-gate.sh
```

The receipts are in `bench/cli-vs-mcp/receipts/`.
