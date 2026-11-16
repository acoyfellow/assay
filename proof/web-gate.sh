#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "== numbers and docs from the bench"
(cd packages/web && bun scripts/numbers.ts && bun scripts/docs.ts)

echo "== tsc -b"
npx tsc -b

echo "== biome"
npx biome check .

echo "== vite build"
(cd packages/web && bun run build)

echo "== preview"
(cd packages/web && bun run preview > "$root/.tmp/preview.log" 2>&1) &
preview=$!
trap 'kill $preview 2>/dev/null; pkill -f "vite preview --port 4174" 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do curl -sf http://localhost:4174/ > /dev/null && break; sleep 0.2; done

echo "== routes, numbers, screenshots"
bun packages/web/test/pages.ts

echo "== hero plays, pauses, rests"
BASE_URL=http://localhost:4174 bun packages/web/test/hero.ts

echo "WEB GATE PASS"
