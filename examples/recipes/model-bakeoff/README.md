# Model bakeoff

**Use it when:** you want to know if the cheap model is good enough for your code, before you pay for the expensive one.

**Grader:** the same hidden test for every model.

```sh
bun packages/fleet/src/cli.ts run examples/recipes/model-bakeoff/plan.json
```

Two seats run the same task. Each seat sets its own `model`. With `"repeat": 2` you get two tries per model. Compare PASS, turns and cost in the output, or in `fleet.json`. Do not `land` a bakeoff: every seat edits the same file, so only the first one lands and the rest conflict.

**Last run:** Haiku 2/2 passed, $0.31 total. Sonnet 2/2 passed, $0.22 total, in fewer turns. On this task the bigger model was cheaper.

**Worst case:** 4 agents × $0.40 = $1.60.

**On your repo:** copy one seat per model, keep the task and grader the same. Use more repeats for a fairer answer. Two tries is a hint, not a result.
