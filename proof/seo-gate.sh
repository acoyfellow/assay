#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../packages/web"
bun test/audit.ts "${1:-https://assay.coey.dev}"
