---
title: The bench
description: CLI vs MCP, measured with assay. Ten seats per run, a hidden grader, receipts you can check.
order: 5
---

The first thing we measured with assay was assay. Which surface does an agent use better: the CLI or the MCP tools?

## How it ran

- {{seatsPerArm}} seats per arm, {{model}} on {{harness}}.
- Each seat gets its own assay server and the same task: start an assay with two seats, claim both, record two receipts, grade them, and report the score.
- A hidden grader reads that server after the agent stops. It checks the score and both seats.
- Every receipt and grade is recorded in a separate assay ledger. The gate fails unless the ledger's score matches the receipts.

## Run 1

`target` had no description, and a wrong-id refusal said only `NotRunning`.

{{run1}}

Almost every seat first sent `ClaimSeat` to a seat id. The CLI seats read `--help` and their exit code, and retried. The MCP seats moved on.

## Run 2

We described each id in the model and made the refusal name the right id. Task, model and grader are the same.

{{run2}}

No seat used the wrong id this time. One sentence in the model closed the gap, and both arms got cheaper.

## What this does not show

- {{seatsPerArm}} seats per arm is a first signal, not a verdict.
- One task, one model, one harness.
- The task is now easy for both. The next bench needs a harder one.

## Run it yourself

```sh
ASSAY_PI_PROVIDER=anthropic bun bench/cli-vs-mcp/run.ts
bash proof/bench-gate.sh
```

The receipts are in `bench/cli-vs-mcp/receipts/`.
