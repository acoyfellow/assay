import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import type { ArmNumbers } from "./numbers.ts";

type Page = {
  readonly slug: string;
  readonly url: string;
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly body: string;
};

const web = new URL("..", import.meta.url).pathname;
const docsDir = join(web, "docs");
const out = join(web, "public/docs");
const numbers = JSON.parse(readFileSync(join(web, "src/numbers.json"), "utf8"));
const repo = "https://github.com/acoyfellow/assay";

const armTable = (arms: ReadonlyArray<ArmNumbers>) =>
  [
    "| Arm | Passed | Mean turns | Mean tool calls | Mean cost | Mean time |",
    "|---|---|---|---|---|---|",
    ...arms.map(
      (arm) =>
        `| ${arm.arm.toUpperCase()} | ${arm.passed}/${arm.seats} | ${arm.meanTurns} | ${arm.meanToolCalls} | ${arm.meanCost} | ${arm.meanSeconds} |`,
    ),
  ].join("\n");

const fill = (text: string) =>
  text
    .replaceAll("{{seatsPerArm}}", String(numbers.seatsPerArm))
    .replaceAll("{{model}}", numbers.model)
    .replaceAll("{{harness}}", numbers.harness)
    .replaceAll("{{run1}}", `${armTable(numbers.run1.arms)}\n\nTotal: ${numbers.run1.total}.`)
    .replaceAll("{{run2}}", `${armTable(numbers.run2.arms)}\n\nTotal: ${numbers.run2.total}.`);

const frontMatter = /^---\n([\s\S]*?)\n---\n/;

const parse = (file: string): Page => {
  const raw = readFileSync(join(docsDir, file), "utf8");
  const match = frontMatter.exec(raw);
  const meta = Object.fromEntries(
    (match?.[1] ?? "")
      .split("\n")
      .filter(Boolean)
      .map((line) => [line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]),
  );
  const slug = file.replace(/\.md$/, "").replace(/^index$/, "");
  return {
    slug,
    url: slug === "" ? "/docs/" : `/docs/${slug}/`,
    order: Number(meta.order ?? 99),
    title: meta.title ?? slug,
    description: meta.description ?? "",
    body: fill(match ? raw.slice(match[0].length) : raw),
  };
};

const pages = readdirSync(docsDir)
  .filter((file) => file.endsWith(".md"))
  .map(parse)
  .sort((first, second) => first.order - second.order);

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slugify(text)}">${text}</h${depth}>`;
    },
    table(token) {
      const head = token.header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join("");
      const rows = token.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    },
  },
});

const nav = (current: Page) =>
  pages
    .map(
      (page) =>
        `<li><a href="${page.url}"${page.url === current.url ? ' aria-current="page"' : ""}>${escapeHtml(page.title)}</a></li>`,
    )
    .join("");

const pager = (index: number) => {
  const previous = pages[index - 1];
  const next = pages[index + 1];
  return `<nav class="pager">${previous ? `<a href="${previous.url}">← ${escapeHtml(previous.title)}</a>` : "<span></span>"}${next ? `<a href="${next.url}">${escapeHtml(next.title)} →</a>` : ""}</nav>`;
};

const shell = (page: Page, index: number, html: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} · assay</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="theme-color" content="#ececeb">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght,ROND@6..144,1..1000,0..100&amp;family=Google+Sans+Code:wght@300..800&amp;display=swap">
<link rel="stylesheet" href="/docs.css">
</head>
<body>
<header class="top"><a class="brand" href="/"><img src="/logo.svg" alt="" width="24" height="24">assay</a><nav><a href="/docs/">Docs</a><a href="/docs/bench/">Bench</a><a href="${repo}">GitHub</a></nav></header>
<div class="shell"><div class="frame"><div class="layout">
<details class="side" open><summary>Docs</summary><ul>${nav(page)}</ul></details>
<main class="prose"><h1>${escapeHtml(page.title)}</h1><p class="lede">${escapeHtml(page.description)}</p>${html}${pager(index)}</main>
</div></div></div>
<footer class="foot">Open source, MIT. Runs on your machine or your own Cloudflare account.</footer>
</body>
</html>
`;

rmSync(out, { recursive: true, force: true });
pages.forEach((page, index) => {
  const dir = join(out, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shell(page, index, marked.parse(page.body, { async: false })));
});

const llms = [
  "# assay",
  "",
  "> Run many agents on one goal. Score each with a grader it never sees.",
  "",
  "Open source. Runs on your machine or your own Cloudflare account. No hosted service, no free model calls.",
  "",
  "## Docs",
  "",
  ...pages.map((page) => `- [${page.title}](${page.url}): ${page.description}`),
  "",
  ...pages.flatMap((page) => [`# ${page.title}`, "", page.body.trim(), ""]),
].join("\n");
writeFileSync(join(web, "public/llms.txt"), llms);
console.log(`docs: ${pages.length} pages, llms.txt ${llms.length} bytes`);
