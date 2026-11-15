import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("http://localhost:5290/", { waitUntil: "networkidle" });
console.log("title", await page.title());
await page.screenshot({
  path: ".tmp/shots/hero-1280.png",
  clip: { x: 0, y: 0, width: 1280, height: 860 },
});
await page.setViewportSize({ width: 375, height: 800 });
console.log(
  "overflow375",
  await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
);
await browser.close();
