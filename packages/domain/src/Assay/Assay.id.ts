import * as Schema from "effect/Schema";

export const AssayId = Schema.String.pipe(Schema.brand("AssayId"));
export type AssayId = typeof AssayId.Type;
