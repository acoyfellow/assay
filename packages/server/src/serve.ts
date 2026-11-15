import { AssayApi } from "@assay/domain/AssayApi.api";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as Effect from "effect/Effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import * as Layer from "effect/Layer";
import { AssayInMemory } from "./host.ts";

const port = Number(process.env.ASSAY_PORT ?? 8788);

const Routes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const api = yield* AssayApi;
    yield* router.add("GET", "/health", HttpServerResponse.text("ok"));
    yield* router.add("*", "/api/*", api.fetch);
  }),
);

HttpRouter.serve(Routes).pipe(
  Layer.provide(AssayInMemory),
  Layer.provide(BunHttpServer.layer({ port })),
  Layer.launch,
  BunRuntime.runMain,
);
