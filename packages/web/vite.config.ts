import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const publicDir = fileURLToPath(new URL("./public", import.meta.url));

const docsIndex = (): Plugin => ({
  name: "assay-docs-index",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = (request.url ?? "").split("?")[0] ?? "";
      if (!path.startsWith("/docs")) return next();
      const file = join(publicDir, path.endsWith("/") ? path : `${path}/`, "index.html");
      if (!existsSync(file)) return next();
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(readFileSync(file));
    });
  },
});

export default defineConfig({
  plugins: [docsIndex(), foldkit(), tailwindcss()],
  server: { port: 5290, strictPort: true },
  preview: { port: 4174, strictPort: true },
});
