import numbers from "./numbers.json";

export const phases = ["plan", "spawn", "work", "grade", "score"] as const;
export type Phase = (typeof phases)[number];

const planIn = 1400;
const spawnIn = 1600;
const workStart = planIn + spawnIn;
const workSpan = 6400;
const gradeDelay = 500;
const scoreHold = 4200;
const fadeOut = 600;

export type Lane = {
  readonly seat: string;
  readonly passed: boolean;
  readonly turns: number;
  readonly usd: number;
  readonly seconds: number;
  readonly doneAt: number;
  readonly gradedAt: number;
};

const slowest = Math.max(...numbers.fleet.seats.map((seat) => seat.seconds));

export const lanes: ReadonlyArray<Lane> = numbers.fleet.seats.map((seat) => {
  const doneAt = workStart + (seat.seconds / slowest) * workSpan;
  return {
    seat: seat.seat,
    passed: seat.passed,
    turns: seat.turns,
    usd: Number(seat.cost.slice(1)),
    seconds: seat.seconds,
    doneAt,
    gradedAt: doneAt + gradeDelay,
  };
});

const lastGrade = Math.max(...lanes.map((lane) => lane.gradedAt));
export const scoreAt = lastGrade + 500;
export const cycleMs = scoreAt + scoreHold + fadeOut;
export const restMs = scoreAt + 1200;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const ease = (value: number) => 1 - (1 - clamp01(value)) ** 3;
export const between = (clock: number, start: number, span: number) => ease((clock - start) / span);

export const planShown = (clock: number) => between(clock, 0, 700);
export const laneShown = (clock: number, index: number) => between(clock, planIn + index * 180, 500);
export const wireDrawn = (clock: number, index: number) => between(clock, planIn + index * 180, 700);
export const laneProgress = (clock: number, lane: Lane) =>
  clamp01((clock - workStart) / (lane.doneAt - workStart));
export const graded = (clock: number, lane: Lane) => clock >= lane.gradedAt;
export const gradeShown = (clock: number, lane: Lane) => between(clock, lane.gradedAt, 350);
export const scoreShown = (clock: number) => between(clock, scoreAt, 600);
export const sceneFade = (clock: number) => 1 - between(clock, cycleMs - fadeOut, fadeOut);

export const spentAt = (clock: number) =>
  lanes.reduce((total, lane) => total + lane.usd * laneProgress(clock, lane), 0);

export const heldAt = (clock: number) => {
  const worstCase = 0.4;
  return lanes.reduce((total, lane, index) => {
    if (laneShown(clock, index) <= 0) return total;
    return total + (graded(clock, lane) ? 0 : worstCase);
  }, 0);
};

export const passedAt = (clock: number) => lanes.filter((lane) => graded(clock, lane) && lane.passed).length;
export const gradedCount = (clock: number) => lanes.filter((lane) => graded(clock, lane)).length;

export const phaseAt = (clock: number): Phase => {
  if (clock < planIn) return "plan";
  if (clock < workStart) return "spawn";
  if (clock >= scoreAt) return "score";
  if (lanes.some((lane) => graded(clock, lane))) return "grade";
  return "work";
};

export const wrap = (clock: number) => (clock >= cycleMs ? 0 : clock);
