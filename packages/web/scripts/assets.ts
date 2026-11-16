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

const fleetRun = JSON.parse(
  readFileSync(new URL("../../../examples/tally/runs/first-run.json", import.meta.url), "utf8"),
) as { receipts: { seat: string; passed: boolean; usd: number; ms: number }[] };

const ogHtml = () => {
  const rows = fleetRun.receipts
    .map(
      (receipt) =>
        `<li><i class="${receipt.passed ? "pass" : "fail"}"></i><span class="seat">${receipt.seat}</span><span class="${receipt.passed ? "ok" : "no"}">${receipt.passed ? "pass" : "fail"}</span><span class="cost">$${receipt.usd.toFixed(2)}</span></li>`,
    )
    .join("");
  return `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans+Code:wght@300..800&display=swap"><style>html,body{margin:0}body{width:1200px;height:630px;background:${paper};font-family:"Google Sans Flex",sans-serif;color:${ink};position:relative;overflow:hidden}.word{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px;font-size:36px;letter-spacing:-.02em}h1{position:absolute;left:72px;top:190px;width:520px;margin:0;font-size:68px;line-height:1.02;font-weight:500;letter-spacing:-.03em}p{position:absolute;left:72px;bottom:64px;margin:0;font-size:22px;color:#62625f}.run{position:absolute;left:660px;top:150px;width:470px;border-top:3px solid ${ink};padding-top:18px;font-family:"Google Sans Code",monospace}.cmd{font-size:19px;color:#62625f;margin:0 0 14px}ul{list-style:none;margin:0;padding:0}li{display:flex;align-items:center;gap:16px;font-size:22px;padding:11px 0;border-bottom:1px solid #e4e4e2}i{width:14px;height:14px;flex:none}i.pass{background:${signal}}i.fail{border:2px solid ${ink};box-sizing:border-box}.seat{flex:1}.ok{color:${signal};width:60px}.no{color:#62625f;width:60px}.cost{color:#62625f;width:70px;text-align:right}</style></head><body><div class="word"><svg width="48" height="48" viewBox="0 0 48 48" shape-rendering="crispEdges">${tubeRects(0, 4)}</svg>assay</div><h1>Spin up a fleet of coding agents.</h1><p>assay.coey.dev</p><div class="run"><div class="cmd">$ assay-fleet run plan.json</div><ul>${rows}</ul></div></body></html>`;
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
