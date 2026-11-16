import { Subscription } from "foldkit";
import { Message } from "./message.ts";
import type { Model } from "./model.ts";

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  frame: Subscription.animationFrameEntry<Model, Message>({
    isActive: (model) => model.playing,
    toMessage: (deltaTime) => Message.Ticked({ deltaTime }),
  }),
}));
