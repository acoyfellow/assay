import * as Effect from "effect/Effect";
import { Command } from "foldkit";
import { Message } from "./message.ts";

export const installLine = "git clone https://github.com/acoyfellow/assay && cd assay && bun install";

export const CopyInstall = Command.define("CopyInstall", {
  args: {},
  messages: [Message.Copied],
  execute: () =>
    Effect.tryPromise(() => navigator.clipboard.writeText(installLine)).pipe(
      Effect.as(Message.Copied()),
      Effect.orElseSucceed(() => Message.Copied()),
    ),
});
