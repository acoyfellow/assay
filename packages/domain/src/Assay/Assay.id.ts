import * as Schema from "effect/Schema";

export const AssayId = Schema.String.pipe(
  Schema.brand("AssayId"),
  Schema.annotate({
    description: "The assay id alone, for example `job-7`. Never a seat id: `job-7/alpha` is wrong here.",
  }),
);
export type AssayId = typeof AssayId.Type;
