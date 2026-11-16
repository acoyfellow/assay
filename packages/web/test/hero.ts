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
const paused = await graded();
await page.waitForTimeout(1200);
const stillPaused = (await graded()) === paused;

const still = await browser.newPage({ viewport: { width: 1280, height: 820 }, reducedMotion: "reduce" });
await still.goto(`${base}/`);
await still.waitForTimeout(600);
const restGraded = await still.locator('[data-stage="fleet"]').first().getAttribute("data-graded");
await browser.close();

const counts = [...seen].map(Number).sort((a, b) => a - b);
const ok =
  counts.includes(0) && counts.includes(6) && counts.length >= 4 && stillPaused && restGraded === "6";
console.log(
  `graded counts seen ${counts.join(",")}; pause holds ${stillPaused}; reduced motion shows final ${restGraded === "6"}`,
);
console.log(ok ? "HERO PASS" : "HERO FAIL");
process.exit(ok ? 0 : 1);
