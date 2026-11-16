import { chromium } from "playwright";

const base = process.argv[2] ?? "https://assay.coey.dev";
const paths = ["/", "/docs/", "/docs/quick-start/", "/docs/model/", "/docs/cli-and-mcp/", "/docs/bench/"];
const problems: string[] = [];
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

for (const path of paths) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  const facts = await page.evaluate(() => {
    const meta = (selector: string) => document.querySelector(selector)?.getAttribute("content") ?? "";
    const images = [...document.querySelectorAll("img")].filter((image) => !image.hasAttribute("alt")).length;
    const emptyLinks = [...document.querySelectorAll("a")].filter(
      (link) => !link.textContent?.trim() && !link.getAttribute("aria-label"),
    ).length;
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
      h1: document.querySelectorAll("h1").length,
      lang: document.documentElement.lang,
      viewport: meta('meta[name="viewport"]'),
      ogImage: meta('meta[property="og:image"]'),
      jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
      imagesWithoutAlt: images,
      emptyLinks,
    };
  });
  const flags = [
    facts.title.length >= 10 && facts.title.length <= 65 ? "" : `title length ${facts.title.length}`,
    facts.description.length >= 50 && facts.description.length <= 160
      ? ""
      : `description length ${facts.description.length}`,
    facts.canonical === `${base}${path}` ? "" : `canonical ${facts.canonical}`,
    facts.h1 === 1 ? "" : `h1 count ${facts.h1}`,
    facts.lang === "en" ? "" : "lang missing",
    facts.viewport ? "" : "viewport missing",
    facts.ogImage ? "" : "og:image missing",
    facts.jsonLd > 0 ? "" : "json-ld missing",
    facts.imagesWithoutAlt === 0 ? "" : `${facts.imagesWithoutAlt} images without alt`,
    facts.emptyLinks === 0 ? "" : `${facts.emptyLinks} empty links`,
  ].filter(Boolean);
  console.log(
    `${path}  title=${facts.title.length} desc=${facts.description.length} ${flags.length ? `FLAGS: ${flags.join("; ")}` : "ok"}`,
  );
  problems.push(...flags.map((flag) => `${path}: ${flag}`));
}

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.evaluate(() => navigator.serviceWorker.ready);
const manifest = await cdp.send("Page.getAppManifest");
const installability = await cdp.send("Page.getInstallabilityErrors");
console.log(
  "manifest errors",
  manifest.errors.length,
  manifest.errors.map((error) => error.message).join("; "),
);
console.log(
  "installability errors",
  installability.installabilityErrors.length,
  JSON.stringify(installability.installabilityErrors),
);
if (manifest.errors.length) problems.push("manifest has errors");
if (installability.installabilityErrors.length) problems.push("not installable");

await context.setOffline(true);
const offline = await page.reload({ waitUntil: "domcontentloaded" }).then(
  (response) => response?.status() ?? 0,
  () => 0,
);
console.log("offline reload status", offline);
if (offline !== 200) problems.push("offline reload failed");

await browser.close();
console.log(problems.length ? `PROBLEMS ${problems.length}` : "AUDIT PASS");
process.exit(problems.length ? 1 : 0);
