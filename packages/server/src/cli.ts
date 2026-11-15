import * as Domain from "@alchemy.run/domain";
import { toCli } from "@alchemy.run/domain/Cli";
import { AssayApi } from "@assay/domain/AssayApi.api";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import * as Command from "effect/cli/Command";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { calls } from "./host.ts";

const url = process.env.ASSAY_URL ?? "http://localhost:8788/api";

Command.run(toCli(AssayApi, { name: "assay", expose: calls }), {
  version: "0.0.1",
}).pipe(
  Effect.provide(Domain.protocolHttp(url)),
  Effect.provide(FetchHttpClient.layer),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain,
);
