---
title: Recipes
description: Plans you can run today. Each one is a folder in examples/recipes with a plan, tasks, a grader, and a check that the grader works.
order: 2.5
---

A recipe is a folder you can run as is, then copy for your own repo. Every recipe is checked by `proof/recipes-gate.sh`: the untouched repo must fail its grader, and a known good fix must pass it. If a grader cannot tell good work from no work, the gate fails.

| Recipe | Use it when | Grader | Agents | Worst case |
|---|---|---|---|---|
| [Fix the build](#fix-the-build) | Tests are red | Your test suite | 3 | $0.45 |
| [Clear a backlog](#clear-a-backlog) | Several small tickets | One hidden test per ticket | 4 | $0.60 |
| [Best of N](#best-of-n) | A task is hard for a cheap model | Hidden test | 5 | $0.75 |
| [Model bakeoff](#model-bakeoff) | Is the cheap model good enough? | Same hidden test per model | 4 | $1.60 |

{{recipeRuns}}

## Fix the build

Your tests fail. Three agents each try a fix. Each can only write under `src/`, so none can pass by changing a test.

```sh
bun assay run examples/recipes/fix-the-build/plan.json
bun assay land runs/fix-the-build-<id>
```

```json
{
  "repeat": 3,
  "seats": [
    { "id": "fix", "task": "tasks/fix.md", "writable": ["src/"], "grade": "node --test" }
  ]
}
```

On your repo: set `repo`, set `grade` and `test` to your test command, and set `writable` to your source folders.

## Clear a backlog

One agent per ticket, all at once. `land` puts every passing ticket on one branch and runs the whole suite.

```sh
bun assay run examples/recipes/backlog/plan.json
bun assay land runs/backlog-<id>
```

```json
{
  "hidden": ["checks"],
  "seats": [
    { "id": "shipping-free", "task": "tasks/shipping-free.md", "writable": ["src/shipping.ts", "test/shipping.test.ts"], "grade": "sh \"$ASSAY_PLAN_DIR/check.sh\" shipping-free" },
    { "id": "tax-regions", "task": "tasks/tax-regions.md", "writable": ["src/tax.ts", "test/tax.test.ts"], "grade": "sh \"$ASSAY_PLAN_DIR/check.sh\" tax-regions" }
  ]
}
```

On your repo: one markdown file per ticket, one acceptance test per ticket in `checks/`. Keep tickets to separate files so the diffs do not clash.

## Best of N

Five cheap tries at one hard task. `land` keeps the passing diff with the fewest changed lines.

```sh
bun assay run examples/recipes/best-of-n/plan.json
```

```json
{ "repeat": 5, "seats": [{ "id": "discount-cap", "task": "…", "writable": ["src/discount.ts"], "grade": "…" }] }
```

## Model bakeoff

Same task, same grader, one seat per model. Compare PASS, turns and cost.

```sh
bun assay run examples/recipes/model-bakeoff/plan.json
```

```json
{
  "repeat": 2,
  "seats": [
    { "id": "haiku", "model": "claude-haiku-5-5", "task": "…", "grade": "…" },
    { "id": "sonnet", "model": "claude-sonnet-5-5", "task": "…", "grade": "…" }
  ]
}
```

Do not `land` a bakeoff. Every seat edits the same file, so only one lands and the rest conflict.

In our last run (Haiku 4.5 and Sonnet 4.5) both models passed 2/2. Sonnet spent $0.22 in 19 turns; Haiku spent $0.31 in 34. On this task the bigger model was cheaper. Two tries per model is a hint, not a result. Use more repeats before you decide.

## Write a grader

A grader is any shell command. Exit 0 means pass. It runs in a clean copy of the agent's commit, after the agent stops.

| Kind | Grade command | Good for |
|---|---|---|
| Your suite | `npm test` | Fixes, refactors |
| Hidden test | `sh "$ASSAY_PLAN_DIR/check.sh" <task>` | New features |
| Type check | `npx tsc --noEmit` | Migrations |
| Any script | `node check.mjs` | Lint rules, size limits, output files |

Rules that make a grader worth trusting:

- Put hidden tests and answers in a folder listed in `hidden`. Agents cannot read it.
- Run the existing tests too, so an agent cannot pass by breaking something else.
- Check it both ways before you spend money: the untouched repo must fail, a correct fix must pass. Add a `proof.json` that names a known good fix per seat, then run `bash proof/recipes-gate.sh <your recipe folder>`.

## Point an agent at this

Give a coding agent this page and `/llms.txt`, then ask:

```text
Read https://assay.coey.dev/docs/recipes/. Copy examples/recipes/backlog to assay/.
Point repo at this project. Turn these tickets into tasks and checks: <tickets>.
Write assay/proof.json with a known good fix per seat.
Run bash proof/recipes-gate.sh assay until it passes. Do not start it.
```

The agent writes the plan and graders, and proves the graders work. You start it and land the branch.
