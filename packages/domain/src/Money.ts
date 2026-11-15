import * as Schema from "effect/Schema";

export const MicroUsd = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
export type MicroUsd = typeof MicroUsd.Type;
