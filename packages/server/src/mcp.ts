import { toMcp } from "@alchemy.run/domain/Ai";
import { AssayApi } from "@assay/domain/AssayApi.api";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunStdio from "@effect/platform-bun/BunStdio";
import * as McpProtocol from "effect/ai/McpProtocol";
import * as McpServer from "effect/ai/McpServer";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import { AssayInMemory, calls } from "./host.ts";

toMcp(AssayApi, { expose: calls }).pipe(
  Layer.provide(
    McpServer.layerStdio({
      name: "assay",
      version: "0.0.1",
      protocols: [McpProtocol.v2025_11_25],
    }),
  ),
  Layer.provide(AssayInMemory),
  Layer.provide(BunStdio.layer),
  Layer.provide(Logger.layer([Logger.withConsoleError(Logger.formatLogFmt)])),
  Layer.launch,
  BunRuntime.runMain,
);
