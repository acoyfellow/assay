import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createMode, type ModeEvent, renderCard } from "../src/mode.ts";

const here = new URL(".", import.meta.url).pathname;
const root = resolve(here, "../../..");
const work = mkdtempSync(join(tmpdir(), "assay-pi-gate-"));
const recipe = join(work, "fleet");
cpSync(join(root, "examples/recipes/backlog"), recipe, { recursive: true });
cpSync(join(root, "examples/tally/seed"), join(work, "seed"), { recursive: true });

const fixes = join(work, "fixes");
cpSync(join(recipe, "reference/src"), fixes, { recursive: true });

const results: Array<[string, boolean]> = [];
const check = (name: string, ok: boolean) => {
  results.push([name, ok]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

const writeTask = (name: string, lines: ReadonlyArray<string>) =>
  writeFileSync(join(recipe, "tasks", `${name}.md`), `${lines.join("\n")}\n`);
writeTask("shipping-free", [
  `fake-fix: ${join(fixes, "shipping.ts")}`,
  "fake-to: src/shipping.ts",
  "fake-needs-steer: yes",
  "fake-wait: 2500",
]);
writeTask("tax-regions", [
  `fake-fix: ${join(fixes, "tax.ts")}`,
  "fake-to: src/tax.ts",
  "fake-only-round: 2",
  "fake-wait: 300",
]);

const writePlan = (overrides: Record<string, unknown>) => {
  const plan = JSON.parse(readFileSync(join(recipe, "plan.json"), "utf8"));
  const file = join(recipe, `plan-${Object.keys(overrides).join("-") || "base"}.json`);
  writeFileSync(
    file,
    JSON.stringify({ ...plan, repo: "../seed", model: "fake-model", repeat: 1, ...overrides }, null, 2),
  );
  return file;
};

const env = { ASSAY_PI_BIN: join(root, "packages/fleet/test/fake/pi"), ASSAY_PI_PROVIDER: "fake" };
const events: ModeEvent[] = [];
const mode = createMode({ root, home: join(work, "home"), env, onEvent: (event) => events.push(event) });

const goodPlan = writePlan({ rounds: 2, parallel: 2, worstCaseUsdPerSeat: 0.1, budgetUsd: 1 });

check("go before a card is refused", !mode.go().ok && mode.phase() === "idle");
mode.start();
const prepared = await mode.prepare(goodPlan);
const card = mode.card();
console.log(prepared.text);
check(
  "card shows both tasks and their files",
  prepared.text.includes("shipping-free") && prepared.text.includes("src/tax.ts"),
);
check(
  "card worst case is agents x cap x rounds",
  card?.worstCaseUsd === 0.4 && card.agentsPerRound === 2 && card.rounds === 2,
);
check(
  "card names hidden folders and the land test",
  prepared.text.includes("checks, reference") && prepared.text.includes("node --test"),
);
check("card proves the graders", card?.graders.passed === true && prepared.text.includes("proven"));
check("no agent has run before go", !existsSync(join(work, "home", "runs")) && mode.phase() === "carded");

const broken = join(recipe, "plan-broken.json");
writeFileSync(
  broken,
  JSON.stringify({
    ...JSON.parse(readFileSync(goodPlan, "utf8")),
    seats: [{ ...JSON.parse(readFileSync(goodPlan, "utf8")).seats[0], grade: "true" }],
  }),
);
const brokenMode = createMode({ root, home: join(work, "home-broken"), env });
brokenMode.start();
const brokenCard = await brokenMode.prepare(broken);
check("a grader that passes anything is not proven", brokenCard.text.includes("NOT PROVEN"));
check(
  "go is locked when graders are not proven",
  !brokenMode.go().ok && !existsSync(join(work, "home-broken", "runs")),
);

check("go starts the fleet", mode.go().ok && mode.phase() === "running");

const waitFor = async (predicate: () => Promise<boolean> | boolean, ms: number) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await Bun.sleep(100);
  }
  return false;
};

const shippingWorking = async () => {
  const rows = await mode.ps();
  return Array.isArray(rows) && rows.some((row) => row.seat === "shipping-free" && row.stage === "working");
};
check("fleet_ps shows the agent working", await waitFor(shippingWorking, 10000));
const steered = await mode.steer("shipping-free", "add the free-shipping function now");
check("fleet_steer reaches the agent", steered.ok && JSON.stringify(steered.body).includes("shipping-free"));

await mode.done();
check("the fleet lands on its own after it stops", await waitFor(() => mode.phase() === "landed", 30000));
const output = mode.output();
console.log(output.trim());
check(
  "round 2 retries only the failed task",
  output.includes("round 2: retrying tax-regions") && !output.includes("shipping-free-r2"),
);
const land = mode.land();
check("the retried task lands with the steered one", land?.landed === 2 && land.test.passed === true);
check(
  "the landed event is sent to the chat",
  events.some((event) => event.kind === "landed"),
);
check("landing did not end fleet mode", mode.phase() === "landed");

const poorPlan = writePlan({
  rounds: 3,
  parallel: 2,
  worstCaseUsdPerSeat: 0.4,
  budgetUsd: 0.8,
  name: "poor",
});
const poorMode = createMode({ root, home: join(work, "home-poor"), env });
poorMode.start();
writeTask("shipping-free", ["fake-wait: 200"]);
writeTask("tax-regions", ["fake-wait: 200"]);
const poorCard = await poorMode.prepare(poorPlan);
check(
  "card caps worst case at the budget",
  poorMode.card()?.worstCaseUsd === 0.8 && poorCard.text.includes("$0.80"),
);
writeTask("shipping-free", ["fake-wait: 200", "fake-burn: 0.5"]);
writeTask("tax-regions", ["fake-wait: 200", "fake-burn: 0.5"]);
poorMode.go();
await poorMode.done();
await waitFor(() => poorMode.phase() === "landed", 20000);
const poorOut = poorMode.output();
console.log(poorOut.trim());
check("budget stops the retries", poorOut.includes("over budget") && !poorOut.includes("r3-"));

check("only off ends fleet mode", mode.phase() !== "off");
await mode.off();
check("off ends fleet mode", mode.phase() === "off" && !mode.go().ok && !mode.start().ok);
check(
  "card renders without a run",
  renderCard(card ?? (await Promise.reject(new Error("no card")))).includes("Type go"),
);

const runs = readdirSync(join(work, "home", "runs"));
check("one run folder for the good fleet", runs.length === 1);

const failed = results.filter(([, ok]) => !ok);
console.log(
  failed.length === 0 ? "PI GATE PASS" : `PI GATE FAIL: ${failed.map(([name]) => name).join(", ")}`,
);
process.exit(failed.length === 0 ? 0 : 1);
