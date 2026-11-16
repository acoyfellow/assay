import * as Schema from "effect/Schema";

export const Seat = Schema.Struct({
  id: Schema.String,
  task: Schema.String.annotate({ description: "Path to the task prompt, relative to the plan file." }),
  writable: Schema.Array(Schema.String).annotate({
    description: "Paths the agent may write, relative to the repo. A trailing / allows a whole folder.",
  }),
  grade: Schema.String.annotate({
    description:
      "Shell command run in the agent's copy after it stops. Exit 0 means pass. The agent never sees it.",
  }),
  model: Schema.optional(Schema.String),
});
export type Seat = typeof Seat.Type;

export const Plan = Schema.Struct({
  name: Schema.String,
  repo: Schema.String.annotate({
    description: "Folder copied into each agent's workspace, relative to the plan file.",
  }),
  model: Schema.String,
  provider: Schema.optional(Schema.String),
  parallel: Schema.optional(Schema.Number),
  minutesPerSeat: Schema.optional(Schema.Number),
  worstCaseUsdPerSeat: Schema.Number,
  budgetUsd: Schema.Number,
  repeat: Schema.optional(Schema.Number).annotate({ description: "Run every seat this many times." }),
  seats: Schema.Array(Seat),
});
export type Plan = typeof Plan.Type;

export const decodePlan = Schema.decodeUnknownSync(Plan);

export type ExpandedSeat = Seat & { readonly runId: string };

export const expandSeats = (plan: Plan): ReadonlyArray<ExpandedSeat> => {
  const copies = plan.repeat ?? 1;
  return plan.seats.flatMap((seat) =>
    Array.from({ length: copies }, (_, index) => ({
      ...seat,
      runId: copies === 1 ? seat.id : `${seat.id}-${index + 1}`,
    })),
  );
};
