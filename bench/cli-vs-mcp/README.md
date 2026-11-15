# CLI vs MCP

Ten Pi seats do the same task against their own assay server. Five use the `assay` CLI; five use the assay MCP tools. Both surfaces come from one domain Api.

## Run it

Tell the runner how Pi reaches your model:

| Variable | Means |
|---|---|
| `ASSAY_PI_PROVIDER` | The Pi provider, for example `anthropic` or a Cloudflare AI Gateway provider. Required. |
| `ASSAY_PI_MODEL` | The model. Default `claude-haiku-4-5`. |
| `ASSAY_PI_EXTENSIONS` | Pi extensions to load, comma-separated, if your provider is one. |
| `ASSAY_PI_TOKEN_COMMAND` | A shell command that prints a token, if your provider needs one minted. |
| `ASSAY_PI_TOKEN_ENV` | The variable the provider reads that token from. |

```sh
ASSAY_PI_PROVIDER=anthropic bun bench/cli-vs-mcp/run.ts
bash proof/bench-gate.sh
```

`SEATS` (default 5) sets seats per arm, `PARALLEL` (default 4) how many run at once.

The run writes `receipts/`, `ledger-scores.json` and `RESULT.md`. The gate fails unless every seat has a receipt and a grade, the ledger's `AssayScore` matches the receipts, and spend is $2 or less.
