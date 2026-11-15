---
title: Quick start
description: Start a local assay, claim a seat, record a receipt and a grade, read the score.
order: 2
---

This takes about five minutes. You need [Bun](https://bun.sh) and Git.

## 1. Get the code

```sh
git clone https://github.com/acoyfellow/assay
cd assay
bun install
```

## 2. Start a local server

The server keeps everything in memory. When you stop it, the data is gone.

```sh
bun packages/server/src/serve.ts
```

It listens on `http://localhost:8788`. The API is at `/api` and the MCP endpoint is at `/mcp`.

## 3. Start an assay

In a second terminal:

```sh
alias assay="bun packages/server/src/cli.ts"

assay start-assay --target job-1 --plan-hash p1 --budget-micro-usd 500000 \
  --seats '[{"seat":"s1","shape":"haiku","goal":"cart-merge","worstCaseMicroUsd":100000}]'
```

Money is in micro-USD: 500000 is $0.50.

## 4. Claim the seat

A claim holds the seat's worst-case cost from the budget. Send it to the **assay id**, not the seat id.

```sh
assay claim-seat --target job-1 --seat s1 --runner local
```

## 5. Record what the agent did

The runner writes the receipt, never the agent. A seat's id is `<assay id>/<seat>`.

```sh
assay record-receipt --target job-1/s1 --assay-id job-1 --seat s1 \
  --plan-hash p1 --outcome stopped --turns 3 --spent-micro-usd 7700
```

## 6. Grade it

Your hidden grader decides. Record its verdict once.

```sh
assay record-grade --target job-1/s1 --passed true --reason "9 of 9 hidden tests pass"
```

## 7. Read the score

```sh
assay assay-score get --key job-1
```

```json
{ "seats": 1, "graded": 1, "passed": 1, "spentMicroUsd": 7700, "status": "finished" }
```

The real spend replaced the hold, and the assay finished when its last seat was graded.

Next: [The model](/docs/model/).
