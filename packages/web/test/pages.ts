import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.WEB_URL ?? "http://localhost:4174";
const shots = new URL("../../../.tmp/shots/", import.meta.url).pathname;
const routes = ["/", "/docs/", "/docs/quick-start/", "/docs/model/", "/docs/cli-and-mcp/", "/docs/bench/"];
const widths = [375, 1280];
const numbers = JSON.parse(readFileSync(new URL("../src/numbers.json", import.meta.url), "utf8"));
const result = readFileSync(new URL("../../../bench/cli-vs-mcp/RESULT.md", import.meta.url), "utf8");
const internal = [/cfdata/i, /opencode/i, /customer0/i, /jcoeyman/i];
const problems: Array<string> = [];

mkdirSync(shots, { recursive: true });

for (const route of [...routes, "/llms.txt"]) {
  const response = await fetch(`${base}${route}`);
  const body = await response.text();
  console.log(`route ${route} ${response.status}`);
  if (response.status !== 200) problems.push(`${route} returned ${response.status}`);
  for (const pattern of internal) if (pattern.test(body)) problems.push(`${route} contains ${pattern}`);
}

for (const arm of numbers.run2.arms) {
  const expected = `| ${arm.arm} | ${arm.passed}/${arm.seats} | ${arm.meanTurns} | ${arm.meanToolCalls} | ${arm.meanCost} |`;
  const line = result.split("\n").find((row) => row.startsWith(expected));
  const ok = line !== undefined;
  console.log(
    `numbers ${arm.arm}: site ${arm.passed}/${arm.seats} turns=${arm.meanTurns} cost=${arm.meanCost} matches RESULT.md=${ok}`,
  );
  if (!ok) problems.push(`${arm.arm} numbers differ from RESULT.md: ${line}`);
}

const browser = await chromium.launch();
try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const route of routes) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      if (route === "/") await page.waitForSelector('[data-bench="run1-vs-run2"]');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const name = `${width}${route === "/" ? "-home" : route.replaceAll("/", "-").replace(/-$/, "")}.png`;
      await page.screenshot({ path: join(shots, name), fullPage: true });
      console.log(`shot ${width} ${route} overflow=${overflow}px`);
      if (overflow > 0) problems.push(`${route} at ${width}px scrolls sideways by ${overflow}px`);
    }
    if (width === 375) {
      await page.goto(base, { waitUntil: "networkidle" });
      const first = await page.textContent("[data-surface-call]");
      if (!first?.includes("ASSAY CONTRACT")) problems.push("the Pi chat tab is not shown first");
      await page.getByRole("button", { name: "MCP", exact: true }).click();
      await page.waitForFunction(() =>
        document.querySelector("[data-surface-call]")?.textContent?.includes("AssayApi_"),
      );
      const shown = await page.textContent("[data-surface-call]");
      const ok = shown?.includes("AssayApi_ClaimSeat_send") === true;
      console.log(`toggle MCP shows tool call=${ok}`);
      if (!ok) problems.push("the CLI/MCP toggle does not switch");
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`problems ${problems.length}`);
for (const problem of problems) console.log(`PROBLEM ${problem}`);
process.exit(problems.length === 0 ? 0 : 1);
