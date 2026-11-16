#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "== fleet: fake RPC agents, steer, kill, spend cap, skip, hidden grader, land"
bun packages/runner/test/gate.test.ts
