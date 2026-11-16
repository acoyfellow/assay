#!/usr/bin/env sh
set -u
task="$1"
mkdir -p test/accept
cp "$ASSAY_PLAN_DIR/hidden/fixtures.ts" "$ASSAY_PLAN_DIR/hidden/$task.test.ts" test/accept/
node --test --test-reporter=dot "test/accept/$task.test.ts"
hidden=$?
rm -rf test/accept
node --test --test-reporter=dot >/dev/null 2>&1
existing=$?
if [ "$hidden" -eq 0 ] && [ "$existing" -eq 0 ]; then
  echo "pass: hidden tests and existing tests"
  exit 0
fi
echo "fail: hidden=$hidden existing=$existing"
exit 1
