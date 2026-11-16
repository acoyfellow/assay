import * as Schema from "effect/Schema";
import { defineMessageUnion } from "foldkit/message";
import { Surface } from "./model.ts";

export const Message = defineMessageUnion({
  ChoseSurface: { surface: Surface },
  ClickedCopy: {},
  Copied: {},
  Ticked: { deltaTime: Schema.Number },
  ToggledPlay: {},
});
export type Message = typeof Message.Type;
