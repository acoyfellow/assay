import { realpathSync } from "node:fs";

const quote = (path: string) => JSON.stringify(realpathSync(path));

export const sandboxProfile = (hidden: ReadonlyArray<string>) =>
  `(version 1)(allow default)${hidden.map((path) => `(deny file-read* (subpath ${quote(path)}))`).join("")}`;

export const sandboxed = (
  command: ReadonlyArray<string>,
  hidden: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  if (process.platform !== "darwin" || hidden.length === 0 || process.env.ASSAY_NO_SANDBOX === "1")
    return command;
  return ["sandbox-exec", "-p", sandboxProfile(hidden), ...command];
};
