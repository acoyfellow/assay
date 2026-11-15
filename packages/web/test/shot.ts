import { chromium } from "playwright";

const [path = "/", name = "shot", width = "1280"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
await page.goto(`http://localhost:5290${path}`, { waitUntil: "networkidle" });
await page.screenshot({ path: `.tmp/shots/${name}.png`, fullPage: true });
console.log(
  name,
  "overflow",
  await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
);
await browser.close();
