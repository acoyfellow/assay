import type { Update } from "foldkit";
import { CopyInstall } from "./command.ts";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";
import { cycleMs, wrap } from "./timeline.ts";

type Return = Update.Return<Model, Message, never>;

const maxFrameMs = 48;

export const update = (model: Model, message: Message): Return =>
  Message.match(message, {
    ChoseSurface: ({ surface }) => ({ model: { ...model, surface }, commands: [] }),
    ClickedCopy: () => ({ model, commands: [CopyInstall({})] }),
    Copied: () => ({ model: { ...model, copied: true }, commands: [] }),
    Ticked: ({ deltaTime }) => ({
      model: { ...model, clock: wrap(model.clock + Math.min(deltaTime, maxFrameMs)) },
      commands: [],
    }),
    ToggledPlay: () => ({
      model: { ...model, playing: !model.playing, clock: model.clock >= cycleMs ? 0 : model.clock },
      commands: [],
    }),
  });
