import { defineMessageUnion } from "foldkit/message";
import { Surface } from "./model.ts";

export const Message = defineMessageUnion({
  ChoseSurface: { surface: Surface },
  ClickedCopy: {},
  Copied: {},
});
export type Message = typeof Message.Type;
