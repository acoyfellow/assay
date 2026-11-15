#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

bun bench/cli-vs-mcp/report.ts
for heading in "| Arm | Passed | Mean turns" "Total spend" "## Failed seats"; do
  grep -qF "$heading" bench/cli-vs-mcp/RESULT.md || { echo "RESULT.md is missing: $heading"; exit 1; }
done
echo "BENCH GATE PASS"
