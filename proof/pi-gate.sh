#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== pi fleet mode: card, go, steer from a tool, rounds, budget stop, off"
bun packages/pi/test/mode.test.ts
echo "== pi extension loads in pi"
bun packages/pi/test/load.test.ts
