# Clear a backlog

**Use it when:** you have several small, separate tickets. One agent per ticket, all at once, one branch at the end.

**Grader:** one acceptance test per ticket, in `checks/`, hidden from the agents.

```sh
bun assay run examples/recipes/backlog/plan.json
bun assay land runs/backlog-<id>
```

Each ticket is a seat. `writable` keeps each agent to its own files, so the diffs do not clash. `land` puts one passing diff per ticket on `assay/<run>` and runs the whole test suite.

**Worst case:** 4 agents × $0.15 = $0.60.

**On your repo:** one markdown file per ticket in `tasks/`. Write the acceptance test from the ticket's acceptance lines. Keep tickets to separate files, or land will report a conflict.
