import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const extension = resolve(here, "../src/index.ts");
const agentDir = mkdtempSync(join(tmpdir(), "assay-pi-load-"));

const child = Bun.spawn(
  [
    process.env.ASSAY_REAL_PI ?? "pi",
    "--mode",
    "rpc",
    "--no-session",
    "--no-skills",
    "--no-extensions",
    "-e",
    extension,
  ],
  { env: { ...process.env, PI_CODING_AGENT_DIR: agentDir }, stdin: "pipe", stdout: "pipe", stderr: "pipe" },
);

const send = (record: Record<string, unknown>) => {
  child.stdin.write(`${JSON.stringify(record)}\n`);
  child.stdin.flush();
};

const replies = new Map<string, Record<string, unknown>>();
const errors: string[] = [];
const read = (async () => {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of child.stdout) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.startsWith("{")) {
        const record = JSON.parse(line);
        if (record.type === "response" && record.id) replies.set(record.id, record);
        if (record.type === "extension_error") errors.push(String(record.error));
      }
      newline = buffer.indexOf("\n");
    }
  }
})();

const ask = async (id: string, record: Record<string, unknown>) => {
  send({ id, ...record });
  for (let tries = 0; tries < 200 && !replies.has(id); tries++) await Bun.sleep(50);
  return replies.get(id);
};

const commands = (await ask("c", { type: "get_commands" })) as
  | { data?: { commands?: Array<{ name: string }> } }
  | undefined;
const names = (commands?.data?.commands ?? []).map((command) => command.name);
child.kill();
await read.catch(() => {});

const want = ["fleet", "fleet-off", "fleet-card"];
const missing = want.filter((name) => !names.includes(name));
console.log(`commands: ${names.filter((name) => name.startsWith("fleet")).join(", ")}`);
if (errors.length) console.log(`extension errors: ${errors.join("; ")}`);
const ok = missing.length === 0 && errors.length === 0;
console.log(ok ? "LOAD PASS: pi loads the extension" : `LOAD FAIL: missing ${missing.join(", ")}`);
process.exit(ok ? 0 : 1);
