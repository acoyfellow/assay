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

The plan runs each task twice, six agents at once:

```text
fleet tally-20261116T013423: 6 agents, 6 at a time, model claude-haiku-4-5
cart-merge-2             PASS   10 turns  $0.0460  54s
cart-merge-1             PASS   11 turns  $0.0433  54s
discount-cap-1           PASS   13 turns  $0.0485  65s
discount-cap-2           FAIL   11 turns  $0.0833  86s
catalog-search-1         FAIL   17 turns  $0.0864  95s
catalog-search-2         FAIL   18 turns  $0.1401  131s
done: 3/6 passed, $0.4475 spent
```

That is a real run. Yours will differ.

## 4. Read the results

Each agent has a folder under `runs/<fleet id>/`:

| File | What it holds |
|---|---|
| `repo/` | The agent's copy, with its changes |
| `receipt.json` | Outcome, turns, cost, time, and the grader's output |
| `events.jsonl` | Everything the agent did |

`runs/<fleet id>/fleet.json` holds every receipt and the score.

## 5. Write your own plan

Point `repo` at your code and add a seat per task:

```json
{
  "name": "my-fixes",
  "repo": "../my-app",
  "model": "claude-haiku-4-5",
  "parallel": 4,
  "budgetUsd": 5,
  "worstCaseUsdPerSeat": 0.5,
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

Paths in the plan are relative to the plan file. A `writable` entry that ends in `/` allows a whole folder. Add `"repeat": 3` to run every seat three times.

If your provider needs a token minted, set `ASSAY_PI_TOKEN_COMMAND` and `ASSAY_PI_TOKEN_ENV`. To load Pi extensions, set `ASSAY_PI_EXTENSIONS`.

Next: [The model](/docs/model/).
