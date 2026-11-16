import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git } from "../src/git.ts";
import { land } from "../src/land.ts";
import { runFleet } from "../src/run.ts";

const here = new URL(".", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "assay-fleet-gate-"));
const plans = join(work, "tally");
cpSync(join(here, "../../../examples/tally"), plans, { recursive: true });

process.env.ASSAY_PI_BIN = join(here, "fake/pi");
process.env.ASSAY_PI_PROVIDER = "fake";
process.env.ASSAY_HOME = join(work, "home");

const cli = join(here, "../src/cli.ts");
const fleetCli = async (args: ReadonlyArray<string>) => {
  const child = Bun.spawn(["bun", cli, ...args], { env: process.env, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { out, err, code };
};

const task = (name: string, lines: ReadonlyArray<string>) => {
  writeFileSync(join(plans, "tasks", `${name}.md`), `${lines.join("\n")}\n`);
  return `tasks/${name}.md`;
};

const reference = join(work, "fixes");
cpSync(join(plans, "reference/src"), reference, { recursive: true });
const seat = (id: string, taskFile: string, writable: string, grade: string) => ({
  id,
  task: taskFile,
  writable: [writable],
  grade: `sh "$ASSAY_PLAN_DIR/grade.sh" ${grade}`,
});

const plan = {
  name: "gate",
  repo: "seed",
  model: "fake-model",
  parallel: 5,
  minutesPerSeat: 1,
  worstCaseUsdPerSeat: 0.2,
  budgetUsd: 0.9,
  hidden: ["hidden", "reference"],
  test: "node --test",
  seats: [
    seat(
      "cart-merge",
      task("gate-cart", [
        `fake-fix: ${reference}/cart.ts`,
        "fake-to: src/cart.ts",
        `fake-peek: ${join(plans, "hidden/cart-merge.test.ts")}`,
        "fake-wait: 2500",
      ]),
      "src/cart.ts",
      "cart-merge",
    ),
    seat(
      "discount-cap",
      task("gate-discount", [
        `fake-fix: ${reference}/discount.ts`,
        "fake-to: src/discount.ts",
        "fake-wait: 2500",
      ]),
      "src/discount.ts",
      "discount-cap",
    ),
    seat("catalog-search", task("gate-kill", ["fake-wait: 30000"]), "src/catalog.ts", "catalog-search"),
    seat(
      "catalog-burn",
      task("gate-burn", ["fake-wait: 30000", "fake-burn: 0.05"]),
      "src/catalog.ts",
      "catalog-search",
    ),
    seat("over-budget", task("gate-over", ["fake-wait: 100"]), "src/catalog.ts", "catalog-search"),
  ],
};
const planPath = join(plans, "gate-plan.json");
writeFileSync(planPath, JSON.stringify(plan, null, 2));

const results: Array<[string, boolean]> = [];
const check = (name: string, ok: boolean) => {
  results.push([name, ok]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

const waitFor = async (predicate: () => Promise<boolean>, ms: number) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await Bun.sleep(100);
  }
  return false;
};

const running = runFleet(planPath, join(work, "runs"));

const working = async () => {
  const ps = await fleetCli(["ps"]);
  return (ps.out.match(/ working /g) ?? []).length >= 3;
};
check("ps shows the agents working", await waitFor(working, 10000));
console.log((await fleetCli(["ps"])).out.trim());

const steered = await fleetCli(["steer", "cart-merge", "also add a changelog line"]);
check("steer reaches one seat", steered.code === 0 && steered.out.includes('"steered":["cart-merge"]'));
const killed = await fleetCli(["kill", "catalog-search"]);
check("kill stops one seat", killed.code === 0 && killed.out.includes('"killed":"catalog-search"'));
const noSuch = await fleetCli(["kill", "nobody"]);
check(
  "kill of an unknown seat is refused and names the seats",
  noSuch.code !== 0 && noSuch.err.includes("cart-merge"),
);

const summary = await running;
const by = Object.fromEntries(summary.receipts.map((receipt) => [receipt.seat, receipt]));
const cart = by["cart-merge"];
const runDir = summary.runDir;
const cartTree = join(runDir, "cart-merge", "repo");
const steerFile = join(cartTree, "steer.txt");
const peekFile = join(cartTree, "peek.txt");

check("over-budget seat is skipped, run finishes", by["over-budget"]?.outcome === "skipped");
check("killed seat is recorded as killed by a person", by["catalog-search"]?.killedBy === "person");
check("spend cap stops a seat past its hold", by["catalog-burn"]?.killedBy === "spend cap");
check("the other seats finish and pass", cart?.passed === true && by["discount-cap"]?.passed === true);
check("steer is counted on the receipt", cart?.steers === 1);
check(
  "the steered agent got the message",
  existsSync(steerFile) && readFileSync(steerFile, "utf8").includes("changelog"),
);
check(
  "hidden grader is unreadable by the agent",
  existsSync(peekFile) && readFileSync(peekFile, "utf8").startsWith("read-blocked"),
);
const score = summary.score as { seats: number; passed: number; skipped: number; status: string };
console.log(JSON.stringify(score));
check(
  "ledger score matches receipts",
  score.seats === 5 && score.passed === 2 && score.skipped === 1 && score.status === "finished",
);
check(
  "each seat commits on its own branch off the pinned commit",
  cart?.sha !== summary.base && cart?.branch === "seat/cart-merge",
);

const landed = await land(runDir);
check("land puts both fixes on one branch", landed.landed === 2);
check("tests pass on the landed branch", landed.test.passed);
const files = (await git(join(runDir, "repo.git"), ["diff", "--name-only", summary.base, landed.branch])).out;
check(
  "landed branch has both fixes and nothing from failed seats",
  files.includes("src/cart.ts") && files.includes("src/discount.ts") && !files.includes("src/catalog.ts"),
);

const failed = results.filter(([, ok]) => !ok);
console.log(
  failed.length === 0 ? "FLEET GATE PASS" : `FLEET GATE FAIL: ${failed.map(([name]) => name).join(", ")}`,
);
process.exit(failed.length === 0 ? 0 : 1);
