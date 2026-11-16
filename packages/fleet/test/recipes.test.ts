import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { decodePlan, expandSeats } from "../src/Plan.ts";

const here = new URL(".", import.meta.url).pathname;
const recipesDir = resolve(here, "../../../examples/recipes");

type Fix = { readonly from: string; readonly to: string };
type Proof = Record<string, ReadonlyArray<Fix>>;

const target = process.argv[2] ? resolve(process.argv[2]) : recipesDir;
const isRecipe = (dir: string) => existsSync(join(dir, "plan.json"));
const recipeDirs = isRecipe(target)
  ? [target]
  : readdirSync(target)
      .map((name) => join(target, name))
      .filter(isRecipe);

const grade = async (command: string, cwd: string, planDir: string) => {
  const child = Bun.spawn(["sh", "-c", command], {
    cwd,
    env: { ...process.env, ASSAY_PLAN_DIR: planDir },
    stdout: "pipe",
    stderr: "pipe",
  });
  await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
  return (await child.exited) === 0;
};

const failures: string[] = [];
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures.push(name);
};

for (const planDir of recipeDirs) {
  const name = basename(planDir);
  const planFile = join(planDir, "plan.json");
  const proofFile = join(planDir, "proof.json");
  check(`${name}: proof.json names a known good fix for each seat`, existsSync(proofFile));
  const proof: Proof = existsSync(proofFile) ? JSON.parse(readFileSync(proofFile, "utf8")) : {};
  const plan = decodePlan(JSON.parse(readFileSync(planFile, "utf8")));
  const seats = expandSeats(plan);
  const holds = plan.worstCaseUsdPerSeat * seats.length;
  check(`${name}: plan decodes, ${seats.length} agents, worst case $${holds.toFixed(2)}`, seats.length > 0);
  check(`${name}: README explains it`, existsSync(join(planDir, "README.md")));
  for (const hidden of plan.hidden ?? [])
    check(`${name}: hidden ${hidden} exists`, existsSync(resolve(planDir, hidden)));

  for (const seat of plan.seats) {
    check(`${name}/${seat.id}: task exists`, existsSync(resolve(planDir, seat.task)));
    const untouched = mkdtempSync(join(tmpdir(), `recipe-${name}-`));
    cpSync(resolve(planDir, plan.repo), untouched, { recursive: true });
    check(
      `${name}/${seat.id}: untouched repo fails the grader`,
      !(await grade(seat.grade, untouched, planDir)),
    );

    const fixed = mkdtempSync(join(tmpdir(), `recipe-${name}-fixed-`));
    cpSync(resolve(planDir, plan.repo), fixed, { recursive: true });
    for (const fix of proof[seat.id] ?? []) cpSync(resolve(planDir, fix.from), join(fixed, fix.to));
    check(`${name}/${seat.id}: reference fix passes the grader`, await grade(seat.grade, fixed, planDir));
  }
}

console.log(failures.length === 0 ? "RECIPES PASS" : `RECIPES FAIL: ${failures.join(", ")}`);
process.exit(failures.length === 0 ? 0 : 1);
