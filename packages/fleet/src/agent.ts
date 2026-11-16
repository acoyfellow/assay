import { appendFileSync } from "node:fs";

export type AgentState = "starting" | "working" | "stopped" | "died" | "killed";

export type AgentUsage = {
  turns: number;
  toolCalls: number;
  usd: number;
  lastTool: string;
  lastText: string;
};

export type AgentEnd = { readonly state: "stopped" | "died" | "killed"; readonly killedBy: string };

export type AgentOptions = {
  readonly command: ReadonlyArray<string>;
  readonly cwd: string;
  readonly env: Record<string, string>;
  readonly prompt: string;
  readonly eventsFile: string;
  readonly capUsd: number;
  readonly minutes: number;
};

export type Agent = {
  readonly pid: number;
  state: () => AgentState;
  usage: () => AgentUsage;
  steers: () => number;
  steer: (message: string) => void;
  kill: (by: string) => void;
  done: Promise<AgentEnd>;
  onEvent: (listener: (event: unknown) => void) => () => void;
};

export const startAgent = (options: AgentOptions): Agent => {
  const child = Bun.spawn([...options.command], {
    cwd: options.cwd,
    env: options.env,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const status: { state: AgentState } = { state: "starting" };
  let killedBy = "";
  let steerCount = 0;
  let settled = false;
  const usage: AgentUsage = { turns: 0, toolCalls: 0, usd: 0, lastTool: "", lastText: "" };
  const listeners = new Set<(event: unknown) => void>();

  const send = (record: Record<string, unknown>) => {
    if (child.exitCode !== null) return;
    child.stdin.write(`${JSON.stringify(record)}\n`);
    child.stdin.flush();
  };

  const kill = (by: string) => {
    if (status.state === "stopped" || status.state === "died" || status.state === "killed") return;
    killedBy = by;
    status.state = "killed";
    send({ type: "abort" });
    setTimeout(() => child.kill("SIGTERM"), 300);
    setTimeout(() => child.kill("SIGKILL"), 3000);
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    child.stdin.end();
  };

  const handle = (event: Record<string, unknown>) => {
    appendFileSync(options.eventsFile, `${JSON.stringify(event)}\n`);
    for (const listener of listeners) listener(event);
    if (event.type === "tool_execution_start") {
      usage.toolCalls += 1;
      usage.lastTool = String(event.toolName ?? "");
    }
    const message = event.message as
      | {
          role?: string;
          usage?: { cost?: { total?: number } };
          content?: Array<{ type: string; text?: string }>;
        }
      | undefined;
    if (event.type === "message_end" && message?.role === "assistant") {
      usage.turns += 1;
      usage.usd += message.usage?.cost?.total ?? 0;
      const text = (message.content ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "");
      if (text.length > 0) usage.lastText = text.join("").slice(0, 300);
      if (usage.usd > options.capUsd) kill("spend cap");
    }
    if (event.type === "agent_settled" && status.state === "working") {
      status.state = "stopped";
      finish();
    }
  };

  const read = async () => {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of child.stdout) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.startsWith("{")) {
          try {
            handle(JSON.parse(line));
          } catch {}
        }
        newline = buffer.indexOf("\n");
      }
    }
  };

  const timer = setTimeout(() => kill("time limit"), options.minutes * 60_000);
  const reading = read();
  const stderr = new Response(child.stderr).text();

  send({ id: "start", type: "prompt", message: options.prompt });
  status.state = "working";

  const done = (async (): Promise<AgentEnd> => {
    const code = await child.exited;
    await reading;
    clearTimeout(timer);
    if (status.state === "killed") return { state: "killed", killedBy };
    if (status.state === "stopped") return { state: "stopped", killedBy: "" };
    appendFileSync(
      options.eventsFile,
      `${JSON.stringify({ type: "exit", code, stderr: (await stderr).slice(-400) })}\n`,
    );
    status.state = "died";
    return { state: "died", killedBy: "" };
  })();

  return {
    pid: child.pid,
    state: () => status.state,
    usage: () => ({ ...usage }),
    steers: () => steerCount,
    steer: (message) => {
      if (status.state !== "working") return;
      steerCount += 1;
      send({ type: "steer", message });
    },
    kill,
    done,
    onEvent: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
