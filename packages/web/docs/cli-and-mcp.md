---
title: CLI and MCP
description: Drive the ledger from your own runner or agent, over the CLI or MCP.
order: 4
---

You only need this if you write your own runner. `assay run` already calls these for you.

Assay has one API. The CLI and the MCP tools both come from it, so they take the same inputs and refuse the same things. `--help` and the MCP tool schema use the same words.

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

A refusal prints JSON to stderr and exits with code 1.

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

After one fix, both passed the bench task 5 of 5. MCP used fewer turns. See [the bench](/docs/bench/).
