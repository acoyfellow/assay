import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Isolation = "sandbox-exec" | "bubblewrap" | "none";

const quote = (path: string) => JSON.stringify(realpathSync(path));

const onPath = (command: string) => Bun.which(command) !== null;

export const isolation = (): Isolation => {
  if (process.env.ASSAY_NO_SANDBOX === "1") return "none";
  if (process.platform === "darwin" && onPath("sandbox-exec")) return "sandbox-exec";
  if (process.platform === "linux" && onPath("bwrap")) return "bubblewrap";
  return "none";
};

export const sandboxProfile = (hidden: ReadonlyArray<string>) =>
  `(version 1)(allow default)${hidden.map((path) => `(deny file-read* (subpath ${quote(path)}))`).join("")}`;

const emptyDir = () => mkdtempSync(join(tmpdir(), "assay-hidden-"));

export const bubblewrapArgs = (hidden: ReadonlyArray<string>) => [
  "bwrap",
  "--dev-bind",
  "/",
  "/",
  ...hidden.flatMap((path) => ["--bind", emptyDir(), realpathSync(path)]),
  "--",
];

export const sandboxed = (
  command: ReadonlyArray<string>,
  hidden: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  if (hidden.length === 0) return command;
  const kind = isolation();
  if (kind === "sandbox-exec") return ["sandbox-exec", "-p", sandboxProfile(hidden), ...command];
  if (kind === "bubblewrap") return [...bubblewrapArgs(hidden), ...command];
  return command;
};
