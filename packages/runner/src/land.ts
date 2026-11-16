import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { addWorktree, git, repoPath } from "./git.ts";
import type { Receipt } from "./run.ts";

type FleetFile = {
  assayId: string;
  base: string;
  runDir: string;
  receipts: Receipt[];
  test: string;
};

export type LandTask = {
  task: string;
  seat: string | null;
  sha: string | null;
  applied: boolean;
  reason: string;
};

export type LandReceipt = {
  fleet: string;
  branch: string;
  base: string;
  head: string;
  tasks: LandTask[];
  landed: number;
  test: { command: string; passed: boolean; output: string };
};

const better = (a: Receipt, b: Receipt) => a.changedLines - b.changedLines || a.usd - b.usd;

export const pickWinners = (receipts: ReadonlyArray<Receipt>) => {
  const tasks = [...new Set(receipts.map((receipt) => receipt.task))];
  return tasks.map((task) => {
    const passing = receipts
      .filter((receipt) => receipt.task === task && receipt.passed && receipt.changedLines > 0)
      .sort(better);
    return { task, winner: passing[0] ?? null, tried: receipts.filter((receipt) => receipt.task === task) };
  });
};

const why = (tried: ReadonlyArray<Receipt>) =>
  tried
    .map((receipt) => {
      if (receipt.outcome === "skipped") return `${receipt.seat} skipped`;
      if (receipt.outcome === "killed") return `${receipt.seat} killed by ${receipt.killedBy}`;
      if (receipt.outcome === "died") return `${receipt.seat} died`;
      const last = receipt.gradeOutput.split("\n").filter(Boolean).pop() ?? "failed";
      return `${receipt.seat} ${last.slice(0, 80)}`;
    })
    .join("; ");

export const land = async (runPath: string): Promise<LandReceipt> => {
  const runDir = resolve(runPath);
  const fleet = JSON.parse(readFileSync(join(runDir, "assay.json"), "utf8")) as FleetFile;
  const repo = repoPath(runDir);
  const branch = `assay/${fleet.assayId}`;
  const landDir = join(runDir, "land");
  await git(repo, ["branch", "-D", branch]);
  await addWorktree(repo, landDir, fleet.base, branch);

  const tasks: LandTask[] = [];
  for (const { task, winner, tried } of pickWinners(fleet.receipts)) {
    if (!winner) {
      tasks.push({ task, seat: null, sha: null, applied: false, reason: `no passing seat: ${why(tried)}` });
      continue;
    }
    const picked = await git(landDir, [
      "-c",
      "core.hooksPath=/dev/null",
      "cherry-pick",
      "--allow-empty",
      winner.sha,
    ]);
    if (picked.code !== 0) {
      await git(landDir, ["cherry-pick", "--abort"]);
      tasks.push({
        task,
        seat: winner.seat,
        sha: winner.sha,
        applied: false,
        reason: `conflict: ${picked.err.slice(0, 160)}`,
      });
      continue;
    }
    tasks.push({
      task,
      seat: winner.seat,
      sha: winner.sha,
      applied: true,
      reason: `passed, ${winner.changedLines} lines, $${winner.usd.toFixed(4)}`,
    });
  }

  const command = fleet.test || "true";
  const child = Bun.spawn(["sh", "-c", command], { cwd: landDir, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const head = (await git(landDir, ["rev-parse", "HEAD"])).out;
  const receipt: LandReceipt = {
    fleet: fleet.assayId,
    branch,
    base: fleet.base,
    head,
    tasks,
    landed: tasks.filter((task) => task.applied).length,
    test: { command, passed: code === 0, output: `${out}${err}`.trim().slice(-600) },
  };
  writeFileSync(join(runDir, "land.json"), JSON.stringify(receipt, null, 2));
  for (const task of tasks)
    console.log(`${task.applied ? "LAND" : "SKIP"}  ${task.task.padEnd(20)} ${task.reason}`);
  console.log(
    `branch ${branch} at ${head.slice(0, 10)}: ${receipt.landed}/${tasks.length} tasks, tests ${receipt.test.passed ? "pass" : "FAIL"}`,
  );
  console.log(`repo ${repo}  (git -C ${repo} log ${branch})`);
  return receipt;
};
