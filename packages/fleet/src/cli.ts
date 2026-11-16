import { runFleet } from "./run.ts";

const [command, planPath, ...rest] = process.argv.slice(2);
const outFlag = rest.indexOf("--out");
const outRoot = outFlag >= 0 ? (rest[outFlag + 1] ?? "runs") : "runs";

if (command !== "run" || !planPath) {
  console.error("usage: assay-fleet run <plan.json> [--out runs]");
  process.exit(2);
}

await runFleet(planPath, outRoot);
