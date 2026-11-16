import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { foldkit } from "@foldkit/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { headTags, homeJsonLd, site } from "./scripts/head.ts";

const publicDir = fileURLToPath(new URL("./public", import.meta.url));

const docsIndex = (): Plugin => ({
  name: "assay-docs-index",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = (request.url ?? "").split("?")[0] ?? "";
      if (!path.startsWith("/docs") && !path.startsWith("/brand")) return next();
      const file = join(publicDir, path.endsWith("/") ? path : `${path}/`, "index.html");
      if (!existsSync(file)) return next();
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(readFileSync(file));
    });
  },
});

const homeHead = (): Plugin => ({
  name: "assay-home-head",
  transformIndexHtml: (html) =>
    html.replace(
      /<meta name="assay-head" ?\/?>/,
      headTags({ title: site.title, description: site.description, path: "/", jsonLd: homeJsonLd }),
    ),
});

export default defineConfig({
  plugins: [homeHead(), docsIndex(), foldkit(), tailwindcss()],
  server: { port: 5290, strictPort: true },
  preview: { port: 4174, strictPort: true },
});
