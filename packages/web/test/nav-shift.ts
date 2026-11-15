import { chromium } from "playwright";

const base = "http://localhost:5290";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const boxes = async (path: string) => {
  await page.goto(base + path, { waitUntil: "networkidle" });
  return page.$$eval(".side li a", (links) =>
    links.map((link) => {
      const box = link.getBoundingClientRect();
      return `${link.textContent}:${box.x},${box.y},${box.width},${box.height}`;
    }),
  );
};

const first = await boxes("/docs/");
const second = await boxes("/docs/bench/");
const shifted = first.filter((box, index) => box !== second[index]);
console.log("links", first.length, "shifted", shifted.length);
for (const box of shifted) console.log("shift", box);

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.screenshot({ path: ".tmp/shots/home-full.png", fullPage: true });
await page.goto(`${base}/docs/quick-start/`, { waitUntil: "networkidle" });
await page.screenshot({ path: ".tmp/shots/docs-top.png" });
await browser.close();
process.exit(shifted.length === 0 ? 0 : 1);
