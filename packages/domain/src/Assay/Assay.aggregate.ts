import * as Domain from "@alchemy.run/domain";
import * as Schema from "effect/Schema";
import { MicroUsd } from "../Money.ts";
import { AssayId } from "./Assay.id.ts";
import { AssayCancelled, CancelAssay } from "./CancelAssay.command.ts";
import { AlreadyClaimed, ClaimSeat, OverBudget, SeatClaimed, UnknownSeat } from "./ClaimSeat.command.ts";
import { NotRunning } from "./NotRunning.rejection.ts";
import { SeatPlan } from "./SeatPlan.ts";
import { NotClaimed, SeatSettled, SettleSeat } from "./SettleSeat.command.ts";
import {
  AlreadyStarted,
  AssayStarted,
  DuplicateSeat,
  NoBudget,
  NoSeats,
  StartAssay,
} from "./StartAssay.command.ts";

const SeatSlot = Schema.Struct({
  plan: SeatPlan,
  stage: Schema.Literals(["open", "claimed", "settled"]),
  runner: Schema.String,
  reservedMicroUsd: MicroUsd,
});
type SeatSlot = typeof SeatSlot.Type;

const Running = Schema.TaggedStruct("Running", {
  planHash: Schema.String,
  budgetMicroUsd: MicroUsd,
  committedMicroUsd: MicroUsd,
  seats: Schema.Record(Schema.String, SeatSlot),
});

export const AssayState = Schema.Union([
  Schema.TaggedStruct("Unstarted", {}),
  Running,
  Schema.TaggedStruct("Finished", {
    planHash: Schema.String,
    budgetMicroUsd: MicroUsd,
    committedMicroUsd: MicroUsd,
    cancelled: Schema.Boolean,
  }),
]);
export type AssayState = typeof AssayState.Type;
type RunningState = Extract<AssayState, { _tag: "Running" }>;

const hintFor = (assayId: string): string =>
  assayId.includes("/")
    ? `"${assayId}" is a seat id. Send this command to the assay id "${assayId.split("/")[0]}" and name the seat in the input.`
    : `No running assay "${assayId}". Start it with StartAssay first, or check the id.`;

const runningFor = (state: AssayState, assayId: string): RunningState | NotRunning =>
  state._tag === "Running" ? state : new NotRunning({ hint: hintFor(assayId) });

const firstDuplicate = (seats: ReadonlyArray<SeatPlan>): string | null => {
  const seen = new Set<string>();
  for (const { seat } of seats) {
    if (seen.has(seat)) return seat;
    seen.add(seat);
  }
  return null;
};

const allSettled = (seats: Readonly<Record<string, SeatSlot>>) =>
  Object.values(seats).every((slot) => slot.stage === "settled");

const withSlot = (state: AssayState, seat: string, change: (slot: SeatSlot) => SeatSlot): AssayState => {
  if (state._tag !== "Running") return state;
  const slot = state.seats[seat];
  if (slot === undefined) return state;
  return { ...state, seats: { ...state.seats, [seat]: change(slot) } };
};

export class Assay extends Domain.Aggregate("Assay", {
  id: AssayId,
  state: AssayState,
  initial: { _tag: "Unstarted" },
  commands: [StartAssay, ClaimSeat, SettleSeat, CancelAssay],
  decide: {
    StartAssay: (assay, cmd) => {
      if (assay._tag !== "Unstarted") return new AlreadyStarted();
      if (cmd.seats.length === 0) return new NoSeats();
      if (cmd.budgetMicroUsd <= 0) return new NoBudget();
      const duplicate = firstDuplicate(cmd.seats);
      if (duplicate !== null) return new DuplicateSeat({ seat: duplicate });
      return [
        new AssayStarted({
          planHash: cmd.planHash,
          budgetMicroUsd: cmd.budgetMicroUsd,
          seats: cmd.seats,
        }),
      ];
    },
    ClaimSeat: (assay, cmd, ctx) => {
      const running = runningFor(assay, ctx.id);
      if (running._tag !== "Running") return running;
      const slot = running.seats[cmd.seat];
      if (slot === undefined) return new UnknownSeat({ seat: cmd.seat, seats: Object.keys(running.seats) });
      if (slot.stage !== "open") return new AlreadyClaimed({ runner: slot.runner });
      const needed = slot.plan.worstCaseMicroUsd;
      const remaining = running.budgetMicroUsd - running.committedMicroUsd;
      if (needed > remaining) {
        return new OverBudget({
          remainingMicroUsd: remaining,
          neededMicroUsd: needed,
        });
      }
      return [
        new SeatClaimed({
          seat: cmd.seat,
          runner: cmd.runner,
          reservedMicroUsd: needed,
        }),
      ];
    },
    SettleSeat: (assay, cmd, ctx) => {
      const running = runningFor(assay, ctx.id);
      if (running._tag !== "Running") return running;
      const slot = running.seats[cmd.seat];
      if (slot === undefined || slot.stage !== "claimed") return new NotClaimed({ seat: cmd.seat });
      const others = Object.entries(running.seats).filter(([seat]) => seat !== cmd.seat);
      const finished = others.every(([, other]) => other.stage === "settled");
      return [
        new SeatSettled({
          seat: cmd.seat,
          spentMicroUsd: cmd.spentMicroUsd,
          passed: cmd.passed,
          finished,
        }),
      ];
    },
    CancelAssay: (assay, cmd, ctx) => {
      const running = runningFor(assay, ctx.id);
      if (running._tag !== "Running") return running;
      return [new AssayCancelled({ reason: cmd.reason })];
    },
  },
  evolve: {
    AssayStarted: (_, event) => ({
      _tag: "Running" as const,
      planHash: event.planHash,
      budgetMicroUsd: event.budgetMicroUsd,
      committedMicroUsd: 0,
      seats: Object.fromEntries(
        event.seats.map((plan) => [
          plan.seat,
          { plan, stage: "open" as const, runner: "", reservedMicroUsd: 0 },
        ]),
      ),
    }),
    SeatClaimed: (state, event) => {
      const claimed = withSlot(state, event.seat, (slot) => ({
        ...slot,
        stage: "claimed",
        runner: event.runner,
        reservedMicroUsd: event.reservedMicroUsd,
      }));
      return claimed._tag === "Running"
        ? {
            ...claimed,
            committedMicroUsd: claimed.committedMicroUsd + event.reservedMicroUsd,
          }
        : claimed;
    },
    SeatSettled: (state, event) => {
      if (state._tag !== "Running") return state;
      const reserved = state.seats[event.seat]?.reservedMicroUsd ?? 0;
      const settled = withSlot(state, event.seat, (slot) => ({
        ...slot,
        stage: "settled",
        reservedMicroUsd: 0,
      }));
      if (settled._tag !== "Running") return settled;
      const committedMicroUsd = settled.committedMicroUsd - reserved + event.spentMicroUsd;
      if (!event.finished || !allSettled(settled.seats)) return { ...settled, committedMicroUsd };
      return {
        _tag: "Finished" as const,
        planHash: settled.planHash,
        budgetMicroUsd: settled.budgetMicroUsd,
        committedMicroUsd,
        cancelled: false,
      };
    },
    AssayCancelled: (state) =>
      state._tag === "Running"
        ? {
            _tag: "Finished" as const,
            planHash: state.planHash,
            budgetMicroUsd: state.budgetMicroUsd,
            committedMicroUsd: state.committedMicroUsd,
            cancelled: true,
          }
        : state,
  },
  reply: {
    ClaimSeat: (_, events) => ({
      reservedMicroUsd: events.find((event) => event._tag === "SeatClaimed")?.reservedMicroUsd ?? 0,
    }),
  },
}) {}
