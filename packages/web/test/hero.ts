import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:5290";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
await page.goto(`${base}/`);
const graded = () => page.locator('[data-stage="fleet"]').first().getAttribute("data-graded");
const seen = new Set<string>();
for (let i = 0; i < 28; i++) {
  seen.add((await graded()) ?? "");
  await page.waitForTimeout(500);
}
await page.click('[data-control="play"]');
await page.waitForTimeout(200);
const overlayShown = (await page.locator('[data-control="play"]').getAttribute("data-playing")) === "false";
const paused = await graded();
await page.waitForTimeout(1200);
const stillPaused = (await graded()) === paused;
await page.locator('[data-control="play"]').click({ position: { x: 300, y: 200 } });
await page.waitForTimeout(400);
const resumed = (await page.locator('[data-control="play"]').getAttribute("data-playing")) === "true";

const still = await browser.newPage({ viewport: { width: 1280, height: 820 }, reducedMotion: "reduce" });
await still.goto(`${base}/`);
await still.waitForTimeout(600);
const restGraded = await still.locator('[data-stage="fleet"]').first().getAttribute("data-graded");
await browser.close();

const counts = [...seen].map(Number).sort((a, b) => a - b);
const ok =
  counts.includes(0) &&
  counts.includes(6) &&
  counts.length >= 4 &&
  stillPaused &&
  overlayShown &&
  resumed &&
  restGraded === "6";
console.log(
  `graded counts seen ${counts.join(",")}; pause holds ${stillPaused}; overlay ${overlayShown}; click resumes ${resumed}; reduced motion shows final ${restGraded === "6"}`,
);
console.log(ok ? "HERO PASS" : "HERO FAIL");
process.exit(ok ? 0 : 1);
