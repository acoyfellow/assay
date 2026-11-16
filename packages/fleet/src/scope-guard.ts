import { isAbsolute, relative, resolve } from "node:path";

type ToolCall = { toolName: string; input?: { path?: unknown } };
type Blocked = { block: true; reason: string };
type PiExtension = {
  on: (event: "tool_call", handler: (call: ToolCall) => Promise<Blocked | undefined>) => void;
};

const root = resolve(process.env.ASSAY_WORKSPACE ?? process.cwd());
const writable = (process.env.ASSAY_WRITABLE ?? "")
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

const insideRoot = (path: string): string | null => {
  const rel = relative(root, resolve(root, path));
  return rel === "" || rel.startsWith("..") || isAbsolute(rel) ? null : rel;
};

export const allowsWrite = (path: string): boolean => {
  const rel = insideRoot(path);
  if (rel === null) return false;
  return writable.some((allowed) => (allowed.endsWith("/") ? rel.startsWith(allowed) : rel === allowed));
};

export default function scopeGuard(pi: PiExtension) {
  pi.on("tool_call", async (call) => {
    if (call.toolName !== "write" && call.toolName !== "edit") return undefined;
    const path = typeof call.input?.path === "string" ? call.input.path : "";
    if (allowsWrite(path)) return undefined;
    return {
      block: true,
      reason: `${path || "(no path)"} is not writable. You may write: ${writable.join(", ")}`,
    };
  });
}
