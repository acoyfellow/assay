# Best of N

**Use it when:** a task is hard for a cheap model. Five cheap tries often beat one expensive try.

**Grader:** a hidden test the agents never see.

```sh
bun packages/fleet/src/cli.ts run examples/recipes/best-of-n/plan.json
bun packages/fleet/src/cli.ts land runs/best-of-n-<id>
```

Five Haiku agents get the same task. In our first runs, discount-cap passed one time in two. With five tries, the odds that none pass are small. `land` takes the passing diff with the fewest changed lines.

**Worst case:** 5 agents × $0.15 = $0.75.

**On your repo:** one seat, `"repeat": N`. Put the acceptance test in a folder listed in `hidden`.
