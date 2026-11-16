import * as Domain from "@alchemy.run/domain";
import { Story } from "@alchemy.run/domain/Story";
import { expect, it } from "@effect/vitest";
import { Assay } from "../src/Assay/Assay.aggregate.ts";
import { AssayId } from "../src/Assay/Assay.id.ts";
import { AssayScore } from "../src/Assay/AssayScore.view.ts";
import { AssayCancelled, CancelAssay } from "../src/Assay/CancelAssay.command.ts";
import {
  AlreadyClaimed,
  ClaimSeat,
  OverBudget,
  SeatClaimed,
  UnknownSeat,
} from "../src/Assay/ClaimSeat.command.ts";
import { NotRunning } from "../src/Assay/NotRunning.rejection.ts";
import { SeatSettled } from "../src/Assay/SettleSeat.command.ts";
import { NotOpen, SeatSkipped, SkipSeat } from "../src/Assay/SkipSeat.command.ts";
import {
  AlreadyStarted,
  AssayStarted,
  DuplicateSeat,
  NoBudget,
  NoSeats,
  StartAssay,
} from "../src/Assay/StartAssay.command.ts";
import { AssayHandlers, AssayModel } from "../src/Assay.model.ts";
import { AlreadyGraded, NoReceipt, RecordGrade, SeatGraded } from "../src/Seat/RecordGrade.command.ts";
import {
  AlreadyRecorded,
  ReceiptRecorded,
  RecordReceipt,
  WrongPlan,
} from "../src/Seat/RecordReceipt.command.ts";
import { Seat } from "../src/Seat/Seat.aggregate.ts";
import { seatIdOf } from "../src/Seat/Seat.id.ts";

const story = Story.make(AssayModel, { layer: AssayHandlers });

const id = AssayId.make("a-1");
const run = Assay.ref(id);
const plan = (seat: string, worstCaseMicroUsd = 100_000) => ({
  seat,
  shape: "haiku-pi",
  goal: "cart-merge",
  worstCaseMicroUsd,
});
const started = new AssayStarted({
  planHash: "p1",
  budgetMicroUsd: 250_000,
  seats: [plan("s1"), plan("s2")],
});
const claim = (seat: string) => new SeatClaimed({ seat, runner: "local", reservedMicroUsd: 100_000 });
const s1 = Seat.ref(seatIdOf(id, "s1"));
const s2 = Seat.ref(seatIdOf(id, "s2"));
const receipt = (
  seat: string,
  outcome: "stopped" | "died" | "killed",
  spentMicroUsd: number,
  total = spentMicroUsd,
) =>
  new ReceiptRecorded({
    assayId: id,
    seat,
    planHash: "p1",
    outcome,
    turns: 3,
    steers: 0,
    spentMicroUsd,
    totalSpentMicroUsd: total,
  });
const stop = (seat: string, spentMicroUsd: number, outcome: "stopped" | "died" | "killed" = "stopped") =>
  new RecordReceipt({
    assayId: id,
    seat,
    planHash: "p1",
    outcome,
    turns: 3,
    spentMicroUsd,
  });

it("the model has no definition errors", () => {
  expect(Domain.verify(AssayModel)).toEqual([]);
});

it.effect("a plan starts once, with seats and a budget", () =>
  story(
    Story.when(
      run,
      new StartAssay({
        planHash: "p1",
        budgetMicroUsd: 250_000,
        seats: [plan("s1"), plan("s2")],
      }),
    ),
    Story.then(run, started),
    Story.view(AssayScore, run, {
      seats: 2,
      status: "running",
      budgetMicroUsd: 250_000,
    }),
    Story.when(
      run,
      new StartAssay({
        planHash: "p2",
        budgetMicroUsd: 1,
        seats: [plan("s1")],
      }),
    ),
    Story.rejected(new AlreadyStarted()),
  ),
);

it.effect("a plan with no seats, no budget or the same seat twice is refused", () =>
  story(
    Story.when(run, new StartAssay({ planHash: "p1", budgetMicroUsd: 1, seats: [] })),
    Story.rejected(new NoSeats()),
    Story.when(
      run,
      new StartAssay({
        planHash: "p1",
        budgetMicroUsd: 0,
        seats: [plan("s1")],
      }),
    ),
    Story.rejected(new NoBudget()),
    Story.when(
      run,
      new StartAssay({
        planHash: "p1",
        budgetMicroUsd: 1,
        seats: [plan("s1"), plan("s1")],
      }),
    ),
    Story.rejected(new DuplicateSeat({ seat: "s1" })),
  ),
);

it.effect("a seat is claimed once, and only while its worst case fits the budget", () =>
  story(
    Story.given(
      run,
      new AssayStarted({
        ...started,
        seats: [plan("s1"), plan("s2"), plan("s3")],
      }),
    ),
    Story.when(run, new ClaimSeat({ seat: "s1", runner: "local" })),
    Story.then(run, claim("s1")),
    Story.replied({ reservedMicroUsd: 100_000 }),
    Story.when(run, new ClaimSeat({ seat: "s1", runner: "other" })),
    Story.rejected(new AlreadyClaimed({ runner: "local" })),
    Story.when(run, new ClaimSeat({ seat: "s2", runner: "local" })),
    Story.then(run, claim("s2")),
    Story.replied({ reservedMicroUsd: 100_000 }),
    Story.when(run, new ClaimSeat({ seat: "s3", runner: "local" })),
    Story.rejected(new OverBudget({ remainingMicroUsd: 50_000, neededMicroUsd: 100_000 })),
    Story.when(run, new ClaimSeat({ seat: "nope", runner: "local" })),
    Story.rejected(new UnknownSeat({ seat: "nope", seats: ["s1", "s2", "s3"] })),
  ),
);

it.effect("a seat that dies can be resumed; its spend adds up across attempts", () =>
  story(
    Story.when(s1, stop("s1", 20_000, "died")),
    Story.then(s1, receipt("s1", "died", 20_000)),
    Story.when(s1, stop("s1", 30_000)),
    Story.then(s1, receipt("s1", "stopped", 30_000, 50_000)),
    Story.state(s1, {
      _tag: "Stopped",
      attempts: 2,
      totalSpentMicroUsd: 50_000,
    }),
    Story.when(s1, stop("s1", 1)),
    Story.rejected(new AlreadyRecorded()),
  ),
);

it.effect("a resumed seat must keep the plan it started with", () =>
  story(
    Story.given(s1, receipt("s1", "died", 20_000)),
    Story.when(
      s1,
      new RecordReceipt({
        assayId: id,
        seat: "s1",
        planHash: "p2",
        outcome: "stopped",
        turns: 1,
        spentMicroUsd: 1,
      }),
    ),
    Story.rejected(new WrongPlan({ expected: "p1" })),
  ),
);

it.effect("a seat is graded once, and only after it stopped", () =>
  story(
    Story.when(s1, new RecordGrade({ passed: true, reason: "ok" })),
    Story.rejected(new NoReceipt()),
    Story.given(s1, receipt("s1", "died", 1)),
    Story.when(s1, new RecordGrade({ passed: true, reason: "ok" })),
    Story.rejected(new NoReceipt()),
  ),
);

it.effect(
  "grading charges the real spend, frees the reservation, and finishes the assay at the last seat",
  () =>
    story(
      Story.given(run, started, claim("s1"), claim("s2")),
      Story.given(s1, receipt("s1", "stopped", 40_000)),
      Story.given(s2, receipt("s2", "stopped", 10_000)),
      Story.when(s1, new RecordGrade({ passed: true, reason: "hidden tests pass" })),
      Story.then(
        s1,
        new SeatGraded({
          assayId: id,
          seat: "s1",
          passed: true,
          reason: "hidden tests pass",
          totalSpentMicroUsd: 40_000,
        }),
      ),
      Story.then(
        run,
        new SeatSettled({
          seat: "s1",
          spentMicroUsd: 40_000,
          passed: true,
          finished: false,
        }),
      ),
      Story.state(run, { _tag: "Running", committedMicroUsd: 140_000 }),
      Story.when(s1, new RecordGrade({ passed: false, reason: "again" })),
      Story.rejected(new AlreadyGraded({ passed: true })),
      Story.when(s2, new RecordGrade({ passed: false, reason: "2 of 9 hidden tests fail" })),
      Story.then(
        s2,
        new SeatGraded({
          assayId: id,
          seat: "s2",
          passed: false,
          reason: "2 of 9 hidden tests fail",
          totalSpentMicroUsd: 10_000,
        }),
      ),
      Story.then(
        run,
        new SeatSettled({
          seat: "s2",
          spentMicroUsd: 10_000,
          passed: false,
          finished: true,
        }),
      ),
      Story.state(run, {
        _tag: "Finished",
        committedMicroUsd: 50_000,
        cancelled: false,
      }),
      Story.view(AssayScore, run, {
        graded: 2,
        passed: 1,
        spentMicroUsd: 50_000,
        status: "finished",
      }),
    ),
);

it.effect("a cancelled assay starts no more seats", () =>
  story(
    Story.given(run, started),
    Story.when(run, new CancelAssay({ reason: "budget review" })),
    Story.then(run, new AssayCancelled({ reason: "budget review" })),
    Story.view(AssayScore, run, { status: "cancelled" }),
    Story.when(run, new ClaimSeat({ seat: "s1", runner: "local" })),
    Story.rejected(
      new NotRunning({ hint: 'No running assay "a-1". Start it with StartAssay first, or check the id.' }),
    ),
  ),
);

it.effect("a late grade for a cancelled assay is kept on the seat and not charged", () =>
  story(
    Story.given(run, started, claim("s1"), new AssayCancelled({ reason: "stop" })),
    Story.given(s1, receipt("s1", "stopped", 5)),
    Story.when(s1, new RecordGrade({ passed: true, reason: "ok" })),
    Story.then(
      s1,
      new SeatGraded({
        assayId: id,
        seat: "s1",
        passed: true,
        reason: "ok",
        totalSpentMicroUsd: 5,
      }),
    ),
    Story.then(run),
  ),
);

it.effect("a claim sent to a seat id says to use the assay id", () =>
  story(
    Story.given(Assay.ref(AssayId.make("a-1/s1"))),
    Story.when(Assay.ref(AssayId.make("a-1/s1")), new ClaimSeat({ seat: "s1", runner: "local" })),
    Story.rejected(
      new NotRunning({
        hint: '"a-1/s1" is a seat id. Send this command to the assay id "a-1" and name the seat in the input.',
      }),
    ),
  ),
);

it.effect("a seat that no longer fits is skipped, and the assay still finishes", () =>
  story(
    Story.given(run, started, claim("s1")),
    Story.when(run, new SkipSeat({ seat: "s2", reason: "over budget" })),
    Story.then(run, new SeatSkipped({ seat: "s2", reason: "over budget", finished: false })),
    Story.when(run, new SkipSeat({ seat: "s1", reason: "again" })),
    Story.rejected(new NotOpen({ seat: "s1" })),
    Story.view(AssayScore, run, { skipped: 1, status: "running" }),
  ),
);

it.effect("a killed seat keeps its receipt and can still be graded", () =>
  story(
    Story.given(run, started, claim("s1")),
    Story.when(s1, stop("s1", 9, "killed")),
    Story.then(s1, receipt("s1", "killed", 9)),
    Story.when(s1, new RecordGrade({ passed: false, reason: "killed by a person" })),
    Story.then(
      s1,
      new SeatGraded({
        assayId: id,
        seat: "s1",
        passed: false,
        reason: "killed by a person",
        totalSpentMicroUsd: 9,
      }),
    ),
    Story.then(run, new SeatSettled({ seat: "s1", spentMicroUsd: 9, passed: false, finished: false })),
  ),
);
