# Fix the build

**Use it when:** your tests are red and you want a fix by lunch.

**Grader:** your own test suite. No hidden tests to write.

```sh
bun packages/fleet/src/cli.ts run examples/recipes/fix-the-build/plan.json
bun packages/fleet/src/cli.ts land runs/fix-the-build-<id>
```

Three agents try the same fix at once. Each can only write under `src/`, so none can pass by editing a test. `land` keeps the passing fix with the smallest diff.

**Worst case:** 3 agents × $0.15 = $0.45.

**On your repo:** set `repo` to your project, `grade` and `test` to your test command, `writable` to the source folders. Paste the failing output into `tasks/fix.md` if the error is not obvious.
