import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlDir, type SeatView } from "./control.ts";
import { land } from "./land.ts";
import { runFleet } from "./run.ts";

const usage = `usage:
  assay-fleet run <plan.json> [--out runs]   start a fleet
  assay-fleet ps [--fleet <id>]              every agent: stage, turns, spend, last tool
  assay-fleet watch <seat>                   stream one agent's events
  assay-fleet steer <seat> "<message>"       send a message to one agent mid-task
  assay-fleet steer --all "<message>"        send a message to every working agent
  assay-fleet kill <seat>                    stop one agent; the others keep going
  assay-fleet land <run-dir>                 put one passing diff per task on branch assay/<run> and run the tests`;

const [command, ...args] = process.argv.slice(2);

const flag = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const controlUrl = () => {
  const fleet = flag("--fleet");
  const file = join(controlDir(), fleet ? `${fleet}.json` : "current.json");
  if (!existsSync(file)) throw new Error("no running fleet found; start one with assay-fleet run");
  return (JSON.parse(readFileSync(file, "utf8")) as { url: string }).url;
};

const call = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${controlUrl()}${path}`, init).catch(() => {
    throw new Error("the fleet is not running any more");
  });
  const body = await response.json();
  if (!response.ok) {
    console.error(JSON.stringify(body));
    process.exit(1);
  }
  return body;
};

const post = (path: string, message?: string) =>
  call(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message ? { message } : {}),
  });

const table = (seats: ReadonlyArray<SeatView>) => {
  console.log(
    ["seat".padEnd(22), "stage".padEnd(9), "turns", "spend".padStart(8), "steers", "last tool"].join("  "),
  );
  for (const seat of seats) {
    console.log(
      [
        seat.seat.padEnd(22),
        seat.stage.padEnd(9),
        String(seat.turns).padStart(5),
        `$${seat.usd.toFixed(4)}`.padStart(8),
        String(seat.steers).padStart(6),
        seat.lastTool,
      ].join("  "),
    );
  }
};

const main = async () => {
  if (command === "run" && args[0]) return void (await runFleet(args[0], flag("--out") ?? "runs"));
  if (command === "land" && args[0]) {
    const receipt = await land(args[0]);
    process.exit(receipt.test.passed ? 0 : 1);
  }
  if (command === "ps") {
    const body = (await call("/seats")) as { fleet: string; seats: SeatView[] };
    console.log(`fleet ${body.fleet}`);
    return table(body.seats);
  }
  if (command === "steer" && args[0] === "--all" && args[1])
    return console.log(JSON.stringify(await post("/steer", args[1])));
  if (command === "steer" && args[0] && args[1]) {
    return console.log(JSON.stringify(await post(`/seats/${encodeURIComponent(args[0])}/steer`, args[1])));
  }
  if (command === "kill" && args[0])
    return console.log(JSON.stringify(await post(`/seats/${encodeURIComponent(args[0])}/kill`)));
  if (command === "watch" && args[0]) {
    const response = await fetch(`${controlUrl()}/seats/${encodeURIComponent(args[0])}/events`);
    if (!response.ok || !response.body) {
      console.error(await response.text());
      process.exit(1);
    }
    const decoder = new TextDecoder();
    for await (const chunk of response.body) process.stdout.write(decoder.decode(chunk));
    return;
  }
  console.error(usage);
  process.exit(2);
};

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
