---
title: CLI and MCP
description: One Api, two surfaces. Hand your agent whichever it uses best.
order: 4
---

Assay has one Api. The CLI and the MCP tools are both made from it, so they take the same inputs, return the same results and refuse the same things. Descriptions come from the model, so `--help` and the MCP tool schema say the same words.

## CLI

The CLI is a client of a running assay server.

```sh
export ASSAY_URL=http://localhost:8788/api
bun packages/server/src/cli.ts --help
```

| Subcommand | Does |
|---|---|
| `start-assay` | Freeze a plan and a budget |
| `claim-seat` | Hold a seat's worst-case cost |
| `record-receipt` | Record what a seat did |
| `record-grade` | Record the hidden grader's verdict |
| `cancel-assay` | Stop an assay |
| `assay-score get` | Read an assay's score |
| `seat-status get` | Read one seat |

Every flag has `--help`. A refusal prints its JSON to stderr and exits with code 1.

## MCP

Two ways to connect:

- **Over HTTP**, to the same server the CLI uses: `http://localhost:8788/mcp`.
- **Over stdio**, with its own in-memory model: `bun packages/server/src/mcp.ts`.

For Pi, put this in your project's `.pi/mcp.json`:

```json
{ "mcpServers": { "assay": { "url": "http://localhost:8788/mcp", "exposure": "direct" } } }
```

The tools are `AssayApi_StartAssay_send`, `AssayApi_ClaimSeat_send`, `AssayApi_RecordReceipt_send`, `AssayApi_RecordGrade_send`, `AssayApi_CancelAssay_send`, `AssayApi_AssayScore_get` and `AssayApi_SeatStatus_get`.

## Which one

We measured it with assay itself. See [the bench](/docs/bench/).
