import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const publicDir = new URL("../public/", import.meta.url);
const numbers = JSON.parse(readFileSync(new URL("../src/numbers.json", import.meta.url), "utf8"));

const tube = [
  "..########..",
  "...#....#...",
  "...#....#...",
  "...#....#...",
  "...#....#...",
  "...#++++#...",
  "...#++++#...",
  "...#++++#...",
  "...#++++#...",
  "...#++++#...",
  "....#++#....",
  ".....##.....",
];

const ink = "#121212";
const signal = "#f26b1d";
const paper = "#ffffff";

const tubeRects = (offset: number, scale: number) =>
  tube
    .flatMap((row, y) =>
      [...row].map((cell, x) =>
        cell === "."
          ? ""
          : `<rect x="${offset + x * scale}" y="${offset + y * scale}" width="${scale}" height="${scale}" fill="${cell === "+" ? signal : ink}"/>`,
      ),
    )
    .join("");

const iconSvg = (size: number, padding: number) => {
  const scale = Math.floor((size - padding * 2) / 12);
  const offset = Math.floor((size - scale * 12) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${paper}"/>${tubeRects(offset, scale)}</svg>`;
};

const bars = [numbers.run1, numbers.run2].flatMap(
  (run: { arms: { arm: string; passed: number; seats: number }[] }, round: number) =>
    run.arms.map((arm, index) => ({ ...arm, round, index, focus: round === 1 && arm.arm === "mcp" })),
);

const ogHtml = () => {
  const unit = 44;
  const floor = 470;
  const columns = bars
    .map((bar) => {
      const height = Math.round((bar.passed / bar.seats) * 5) * unit;
      const x = 700 + bar.round * 240 + bar.index * 96;
      return `<rect x="${x}" y="${floor - height}" width="64" height="${height}" fill="${bar.focus ? signal : ink}"/><text x="${x + 32}" y="${floor + 34}" text-anchor="middle" font-size="22" font-family="Google Sans Code, monospace" fill="#62625f">${bar.arm.toUpperCase()}</text>`;
    })
    .join("");
  return `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans+Code:wght@300..800&display=swap"><style>html,body{margin:0}body{width:1200px;height:630px;background:${paper};font-family:"Google Sans Flex",sans-serif;color:${ink};position:relative;overflow:hidden}.word{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px;font-size:36px;letter-spacing:-.02em}h1{position:absolute;left:72px;top:170px;width:560px;margin:0;font-size:58px;line-height:1.06;font-weight:500;letter-spacing:-.03em}p{position:absolute;left:72px;bottom:64px;margin:0;font-size:22px;color:#62625f}svg.c{position:absolute;left:0;top:0}</style></head><body><div class="word"><svg width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges">${tubeRects(0, 4)}</svg>assay</div><h1>Run many agents on one goal. Grade each one with a check it cannot see.</h1><p>assay.coey.dev</p><svg class="c" width="1200" height="630" shape-rendering="crispEdges"><rect x="680" y="${floor}" width="460" height="3" fill="${ink}"/>${columns}<text x="780" y="150" text-anchor="middle" font-size="22" font-family="Google Sans Code, monospace" fill="#9b9b97">round 1</text><text x="1020" y="150" text-anchor="middle" font-size="22" font-family="Google Sans Code, monospace" fill="#9b9b97">round 2</text></svg></body></html>`;
};

const icoFromPngs = (pngs: { size: number; data: Buffer }[]) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(({ data }) => data)]);
};

const browser = await chromium.launch();

const renderSvg = async (svg: string, size: number) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  const data = await page.screenshot({ type: "png", omitBackground: false });
  await page.close();
  return data;
};

const icons = [
  { file: "icon-192.png", size: 192, padding: 24 },
  { file: "icon-512.png", size: 512, padding: 64 },
  { file: "icon-maskable-512.png", size: 512, padding: 112 },
  { file: "apple-touch-icon.png", size: 180, padding: 24 },
];
for (const { file, size, padding } of icons) {
  writeFileSync(new URL(file, publicDir), await renderSvg(iconSvg(size, padding), size));
}

const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) icoPngs.push({ size, data: await renderSvg(iconSvg(size, 0), size) });
writeFileSync(new URL("favicon.ico", publicDir), icoFromPngs(icoPngs));

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(ogHtml(), { waitUntil: "networkidle" });
await og.evaluate(() => document.fonts.ready);
writeFileSync(new URL("og.png", publicDir), await og.screenshot({ type: "png" }));
await browser.close();
console.log("assets written");
