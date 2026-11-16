#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== recipes: every grader fails the untouched repo and passes a known good fix"
bun packages/fleet/test/recipes.test.ts "$@"
