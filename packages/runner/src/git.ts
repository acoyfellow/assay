import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export type GitResult = { readonly code: number; readonly out: string; readonly err: string };

export const git = async (cwd: string, args: ReadonlyArray<string>): Promise<GitResult> => {
  const child = Bun.spawn(["git", ...args], {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "assay",
      GIT_AUTHOR_EMAIL: "assay@localhost",
      GIT_COMMITTER_NAME: "assay",
      GIT_COMMITTER_EMAIL: "assay@localhost",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, out: out.trim(), err: err.trim() };
};

const must = async (cwd: string, args: ReadonlyArray<string>) => {
  const result = await git(cwd, args);
  if (result.code !== 0) throw new Error(`git ${args.join(" ")}: ${result.err}`);
  return result.out;
};

const noHooks = ["-c", "core.hooksPath=/dev/null"];

export const commitAll = (cwd: string, message: string) =>
  must(cwd, [...noHooks, "commit", "-q", "--allow-empty", "-m", message]);

export const seedRepo = async (source: string, into: string): Promise<string> => {
  rmSync(into, { recursive: true, force: true });
  mkdirSync(into, { recursive: true });
  cpSync(source, into, { recursive: true, filter: (path) => !path.endsWith("/.git") });
  await must(into, ["init", "-q", "-b", "main"]);
  await must(into, ["add", "-A"]);
  await commitAll(into, "seed");
  return must(into, ["rev-parse", "HEAD"]);
};

export const addWorktree = async (repo: string, path: string, base: string, branch: string) => {
  if (existsSync(path)) await git(repo, ["worktree", "remove", "--force", path]);
  await must(repo, ["worktree", "add", "-q", "-b", branch, path, base]);
};

export const commitSeat = async (worktree: string, seat: string) => {
  await must(worktree, ["add", "-A"]);
  const status = await must(worktree, ["status", "--porcelain"]);
  if (status === "" && (await git(worktree, ["diff", "--cached", "--quiet"])).code === 0) {
    return { changed: false, sha: await must(worktree, ["rev-parse", "HEAD"]) };
  }
  await commitAll(worktree, `assay seat ${seat}`);
  return { changed: true, sha: await must(worktree, ["rev-parse", "HEAD"]) };
};

export const diffStat = (worktree: string, base: string) =>
  must(worktree, ["diff", "--numstat", base, "HEAD"]).then((text) =>
    text
      .split("\n")
      .filter(Boolean)
      .reduce((total, line) => {
        const [added, removed] = line.split("\t");
        return total + Number(added || 0) + Number(removed || 0);
      }, 0),
  );

export const repoPath = (runDir: string) => join(runDir, "repo.git");
