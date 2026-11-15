type Score = {
  readonly planHash: string;
  readonly seats: number;
  readonly graded: number;
  readonly passed: number;
  readonly spentMicroUsd: number;
  readonly budgetMicroUsd: number;
  readonly status: string;
};

type SeatStatus = {
  readonly stage: string;
  readonly turns: number;
  readonly spentMicroUsd: number;
  readonly passed: boolean | null;
};

export type Grade = { readonly passed: boolean; readonly reason: string };

const expectedScore: Score = {
  planHash: "plan-a",
  seats: 2,
  graded: 2,
  passed: 1,
  spentMicroUsd: 33_000,
  budgetMicroUsd: 900_000,
  status: "finished",
};

const expectedSeats: Record<string, SeatStatus> = {
  alpha: { stage: "graded", turns: 4, spentMicroUsd: 12_000, passed: true },
  beta: { stage: "graded", turns: 6, spentMicroUsd: 21_000, passed: false },
};

const read = async <A>(api: string, path: string, key: string): Promise<A> => {
  const child = Bun.spawn(
    [
      "bun",
      new URL("../../packages/server/src/cli.ts", import.meta.url).pathname,
      ...path.split(" "),
      "--key",
      key,
    ],
    { env: { ...process.env, ASSAY_URL: api }, stdout: "pipe", stderr: "pipe" },
  );
  const [out, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  if (code !== 0) throw new Error(`read ${path} ${key} failed`);
  return JSON.parse(out) as A;
};

const differences = (label: string, actual: object, expected: object): ReadonlyArray<string> =>
  Object.entries(expected).flatMap(([field, want]) => {
    const got = (actual as Record<string, unknown>)[field];
    return got === want ? [] : [`${label}.${field} is ${JSON.stringify(got)}, want ${JSON.stringify(want)}`];
  });

export const grade = async (api: string): Promise<Grade> => {
  const score = await read<Score>(api, "assay-score get", "job-7");
  const seats = await Promise.all(
    Object.entries(expectedSeats).map(async ([seat, want]) =>
      differences(seat, await read<SeatStatus>(api, "seat-status get", `job-7/${seat}`), want),
    ),
  );
  const wrong = [...differences("score", score, expectedScore), ...seats.flat()];
  return wrong.length === 0
    ? { passed: true, reason: "server state matches the end state" }
    : { passed: false, reason: wrong.slice(0, 4).join("; ") };
};
