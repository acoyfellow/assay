import * as Schema from "effect/Schema";

export const Surface = Schema.Literals(["cli", "mcp"]);
export type Surface = typeof Surface.Type;

export const Model = Schema.Struct({
  surface: Surface,
  copied: Schema.Boolean,
  clock: Schema.Number,
  playing: Schema.Boolean,
});
export type Model = typeof Model.Type;
