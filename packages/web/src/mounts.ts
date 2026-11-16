import * as Effect from "effect/Effect";
import { Mount } from "foldkit";
import { Message } from "./message.ts";

const peekAmount = (peek: HTMLElement) => {
  const box = peek.getBoundingClientRect();
  const shown = Math.min(1, Math.max(0, (innerHeight - box.bottom + 40) / (box.height + 40)));
  const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  return atEnd ? 1 : shown;
};

export const Peek = Mount.define("Peek", {
  messages: [Message.MountedPeek],
  execute: ({ element }) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const peek = element as HTMLElement;
        const refresh = () => peek.style.setProperty("--peek", String(peekAmount(peek)));
        addEventListener("scroll", refresh, { passive: true });
        addEventListener("resize", refresh);
        refresh();
        return () => {
          removeEventListener("scroll", refresh);
          removeEventListener("resize", refresh);
        };
      }),
      (stop) => Effect.sync(stop),
    ).pipe(Effect.as(Message.MountedPeek())),
});
