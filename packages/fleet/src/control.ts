import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Agent } from "./agent.ts";

export type SeatView = {
  readonly seat: string;
  readonly task: string;
  readonly stage: string;
  readonly turns: number;
  readonly usd: number;
  readonly steers: number;
  readonly lastTool: string;
  readonly passed: boolean | null;
};

export type Board = {
  readonly fleet: string;
  seats: () => ReadonlyArray<SeatView>;
  agent: (seat: string) => Agent | undefined;
  stop: (seat: string, by: string) => boolean;
};

export const controlDir = () => process.env.ASSAY_HOME ?? join(homedir(), ".assay");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "content-type": "application/json" } });

const readMessage = async (request: Request): Promise<string> => {
  const body = (await request.json().catch(() => ({}))) as { message?: unknown };
  return typeof body.message === "string" ? body.message : "";
};

const eventStream = (agent: Agent) => {
  let unsubscribe = () => {};
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        unsubscribe = agent.onEvent((event) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
        );
        agent.done.then(() => {
          unsubscribe();
          controller.close();
        });
      },
      cancel() {
        unsubscribe();
      },
    }),
    { headers: { "content-type": "application/x-ndjson" } },
  );
};

export const startControl = (board: Board) => {
  const server = Bun.serve({
    port: Number(process.env.ASSAY_CONTROL_PORT ?? 0),
    hostname: "127.0.0.1",
    idleTimeout: 0,
    fetch: async (request) => {
      const url = new URL(request.url);
      const parts = url.pathname.split("/").filter(Boolean);
      if (request.method === "GET" && url.pathname === "/seats")
        return json({ fleet: board.fleet, seats: board.seats() });
      if (request.method === "POST" && url.pathname === "/steer") {
        const message = await readMessage(request);
        if (!message) return json({ error: "send { message }" }, 400);
        const reached = board.seats().filter((seat) => seat.stage === "working");
        for (const seat of reached) board.agent(seat.seat)?.steer(message);
        return json({ steered: reached.map((seat) => seat.seat) });
      }
      if (parts[0] === "seats" && parts[1]) {
        const seat = decodeURIComponent(parts[1]);
        const agent = board.agent(seat);
        const known = board.seats().some((view) => view.seat === seat);
        if (!known)
          return json({ error: `no seat ${seat}`, seats: board.seats().map((view) => view.seat) }, 404);
        if (request.method === "GET" && parts[2] === "events") {
          return agent ? eventStream(agent) : json({ error: `${seat} is not running` }, 409);
        }
        if (request.method === "POST" && parts[2] === "steer") {
          const message = await readMessage(request);
          if (!message) return json({ error: "send { message }" }, 400);
          if (!agent || agent.state() !== "working") return json({ error: `${seat} is not working` }, 409);
          agent.steer(message);
          return json({ steered: [seat], steers: agent.steers() });
        }
        if (request.method === "POST" && parts[2] === "kill") {
          return board.stop(seat, "person")
            ? json({ killed: seat })
            : json({ error: `${seat} is not running` }, 409);
        }
      }
      return json({ error: "not found" }, 404);
    },
  });
  const dir = controlDir();
  mkdirSync(dir, { recursive: true });
  const url = `http://127.0.0.1:${server.port}`;
  writeFileSync(join(dir, "current.json"), JSON.stringify({ fleet: board.fleet, url, pid: process.pid }));
  writeFileSync(
    join(dir, `${board.fleet}.json`),
    JSON.stringify({ fleet: board.fleet, url, pid: process.pid }),
  );
  return { url, stop: () => server.stop(true) };
};
