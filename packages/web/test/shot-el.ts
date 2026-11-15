import { chromium } from "playwright";

const [path, selector, name] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:5290${path}`, { waitUntil: "networkidle" });
await page
  .locator(selector)
  .first()
  .screenshot({ path: `.tmp/shots/${name}.png` });
await browser.close();
