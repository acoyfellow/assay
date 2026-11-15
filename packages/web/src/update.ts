import type { Update } from "foldkit";
import { CopyInstall } from "./command.ts";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";

type Return = Update.Return<Model, Message, never>;

export const update = (model: Model, message: Message): Return =>
  Message.match(message, {
    ChoseSurface: ({ surface }) => ({ model: { ...model, surface }, commands: [] }),
    ClickedCopy: () => ({ model, commands: [CopyInstall({})] }),
    Copied: () => ({ model: { ...model, copied: true }, commands: [] }),
  });
