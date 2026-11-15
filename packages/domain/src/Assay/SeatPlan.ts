import * as Schema from "effect/Schema";

export const SeatPlan = Schema.Struct({
  seat: Schema.String,
  shape: Schema.String,
  goal: Schema.String,
  worstCaseMicroUsd: Schema.Int,
});
export type SeatPlan = typeof SeatPlan.Type;
