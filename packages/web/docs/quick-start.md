---
title: Quick start
description: Run the example. Six agents, three coding tasks, hidden tests, no keys in the agents.
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

## 3. Run it

Tell assay which Pi provider to use, then run the plan:

```sh
export ASSAY_PI_PROVIDER=anthropic
bun assay run examples/tally/plan.json
```

The plan runs each task twice, six agents at once. Each agent works in its own git worktree, at the same commit. A line prints as each agent stops and its hidden test runs:

```text
assay tally-real: 6 agents, hidden tests blocked by sandbox-exec, model calls via relay (agents hold no key), 6 at a time, model claude-haiku-5-5
catalog-search-2  PASS  7 turns  $0.0356  22s
cart-merge-1      PASS  4 turns  $0.0288  23s
cart-merge-2      PASS  7 turns  $0.0374  24s
discount-cap-1    PASS  5 turns  $0.0398  25s
catalog-search-1  PASS  8 turns  $0.0406  26s
discount-cap-2    PASS  6 turns  $0.0593  39s
done: 3/3 tasks passed, 6/6 agents passed, $0.2415 spent
```

That is a real run, in `examples/tally/receipts/`. The relay log there has all 37 model calls, and none was refused. Yours will differ. An agent that spends more than `worstCaseUsdPerSeat` is stopped. A seat that would go over `budgetUsd` is skipped, not started.

## 4. Watch and steer

While it runs, open a second terminal:

```sh
bun assay status
bun assay watch cart-merge-1
bun assay steer catalog-search-1 "run node --test before you stop"
bun assay steer --all "do not edit package.json"
bun assay kill discount-cap-2
```

`ps` shows each agent's stage, turns, spend and last tool. A steer reaches the agent after its current step. Steers and kills are written to the seat's receipt.

## 5. Land the work

```sh
bun assay land runs/tally-real-20261116T13344878
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

`assay.json` holds every receipt and the score. `land.json` holds what was landed and the test result.

## 7. Write your own plan

Point `repo` at your code and add a seat per task:

```json
{
  "name": "my-fixes",
  "repo": "../my-app",
  "model": "claude-haiku-5-5",
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

Model names change. Set `ASSAY_MODEL` to run any plan on another model without editing it. Seats that name their own `model` keep it.

If your provider needs a token minted, set `ASSAY_PI_TOKEN_COMMAND` and `ASSAY_PI_TOKEN_ENV`. To load Pi extensions, set `ASSAY_PI_EXTENSIONS`.

Next: [The model](/docs/model/).
