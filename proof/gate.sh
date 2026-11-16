#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "== tsc -b"
npx tsc -b

echo "== biome"
npx biome check .

echo "== domain stories"
(cd packages/domain && npx vitest run)

echo "== cli + mcp end to end"
bun packages/server/test/e2e.ts

echo "== fleet plan and fake fleet run"
bun packages/runner/test/plan.test.ts
bash proof/runner-gate.sh
bash proof/recipes-gate.sh

echo "GATE PASS"
