---
title: Quick start
description: Run the example fleet. Six agents, three coding tasks, a hidden grader.
order: 2
---

You need [Bun](https://bun.sh), Git, Node 22 or later, and [Pi](https://pi.dev) with a model provider set up.

## 1. Get the code

```sh
git clone https://github.com/acoyfellow/assay
cd assay
bun install
```

## 2. Look at the example

`examples/tally` is a small shop repo with three tasks.

| Path | What it is |
|---|---|
| `seed/` | The repo each agent gets a copy of |
| `tasks/*.md` | One prompt per task |
| `hidden/` | Tests the agents never see |
| `grade.sh` | Copies the hidden tests in, runs them and the existing tests |
| `plan.json` | Which tasks to run, how many times, the model and the budget |

## 3. Run the fleet

Tell assay which Pi provider to use, then run the plan:

```sh
export ASSAY_PI_PROVIDER=anthropic
bun packages/fleet/src/cli.ts run examples/tally/plan.json
```

The plan runs each task twice, six agents at once. Each agent works in its own git worktree, at the same commit. A line prints as each agent stops and its hidden test runs:

```text
fleet tally-real: 6 agents, 6 at a time, model claude-haiku-4-5
catalog-search-1  FAIL   7 turns  $0.0536   38s  steered 1
cart-merge-2      PASS  13 turns  $0.0593   49s
cart-merge-1      PASS  13 turns  $0.0638   55s
discount-cap-1    PASS  18 turns  $0.1370  115s
catalog-search-2  FAIL  17 turns  $0.1502  120s  killed by spend cap
discount-cap-2    FAIL  17 turns  $0.2723  286s  killed by spend cap
done: 3/6 passed, $0.7362 spent
```

That is a real run. Yours will differ. An agent that spends more than `worstCaseUsdPerSeat` is stopped. A seat that would go over `budgetUsd` is skipped, not started.

## 4. Watch and steer

While the fleet runs, open a second terminal:

```sh
bun packages/fleet/src/cli.ts ps
bun packages/fleet/src/cli.ts watch cart-merge-1
bun packages/fleet/src/cli.ts steer catalog-search-1 "run node --test before you stop"
bun packages/fleet/src/cli.ts steer --all "do not edit package.json"
bun packages/fleet/src/cli.ts kill discount-cap-2
```

`ps` shows each agent's stage, turns, spend and last tool. A steer reaches the agent after its current step. Steers and kills are written to the seat's receipt.

## 5. Land the work

```sh
bun packages/fleet/src/cli.ts land runs/tally-real-20261116T13344878
```

```text
LAND  cart-merge      passed, 93 lines, $0.0638
SKIP  catalog-search  no passing seat
LAND  discount-cap    passed, 139 lines, $0.1370
branch assay/tally-real-20261116T13344878: 2/3 tasks, tests pass
```

For each task, `land` takes the passing seat with the smallest diff, puts it on branch `assay/<run>`, and runs the plan's `test` command on the result. The branch is in `runs/<run>/repo.git`.

## 6. Read the results

Each agent has a folder under `runs/<run>/`:

| File | What it holds |
|---|---|
| `repo/` | The agent's git worktree, committed on branch `seat/<seat>` |
| `receipt.json` | Outcome, turns, steers, cost, time, diff size, and the grader's output |
| `events.jsonl` | Everything the agent did |

`fleet.json` holds every receipt and the score. `land.json` holds what was landed and the test result.

## 7. Write your own plan

Point `repo` at your code and add a seat per task:

```json
{
  "name": "my-fixes",
  "repo": "../my-app",
  "model": "claude-haiku-4-5",
  "parallel": 4,
  "budgetUsd": 5,
  "worstCaseUsdPerSeat": 0.5,
  "hidden": ["graders"],
  "test": "npm test",
  "seats": [
    {
      "id": "fix-login",
      "task": "tasks/fix-login.md",
      "writable": ["src/auth/"],
      "grade": "npm test -- auth"
    }
  ]
}
```

Paths in the plan are relative to the plan file. Agents cannot read folders listed in `hidden` (on macOS this uses `sandbox-exec`). A `writable` entry that ends in `/` allows a whole folder. Add `"repeat": 3` to run every seat three times.

If your provider needs a token minted, set `ASSAY_PI_TOKEN_COMMAND` and `ASSAY_PI_TOKEN_ENV`. To load Pi extensions, set `ASSAY_PI_EXTENSIONS`.

Next: [The model](/docs/model/).
