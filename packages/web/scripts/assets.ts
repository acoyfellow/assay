import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const publicDir = new URL("../public/", import.meta.url);
const alloDataUrl = `data:font/woff2;base64,${readFileSync(new URL("fonts/Allo.woff2", publicDir)).toString("base64")}`;
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
  return `<!doctype html><html><head><style>@font-face{font-family:"Allo";src:url("${alloDataUrl}") format("woff2");font-weight:100 900}html,body{margin:0}body{width:1200px;height:630px;background:#ececeb;font-family:"Allo",sans-serif;color:#111112;position:relative;overflow:hidden}.frame{position:absolute;left:40px;top:40px;width:1120px;height:550px;background:#fff;border-radius:40px;box-shadow:0 40px 80px -40px rgba(10,10,12,.18)}.word{position:absolute;left:72px;top:70px;display:flex;align-items:center;gap:14px;font-size:30px;letter-spacing:-.02em}h1{position:absolute;left:72px;top:190px;width:470px;margin:0;font-size:66px;line-height:1.04;font-weight:400;font-variation-settings:"wght" 380,"opsz" 32;letter-spacing:-.03em}h1 span{color:#a3a3a0}p{position:absolute;left:72px;bottom:60px;margin:0;font-size:22px;color:#6e6e6b}.run{position:absolute;left:600px;top:56px;width:544px;height:518px;box-sizing:border-box;padding:34px 38px;border-radius:24px;background:linear-gradient(180deg,#19191a,#080809);box-shadow:0 24px 48px -18px rgba(10,10,12,.45);font-family:ui-monospace,Menlo,monospace;color:#f2f2f0}.cmd{font-size:18px;color:#9a9a97;margin:0 0 16px}ul{list-style:none;margin:0;padding:0}li{display:flex;align-items:center;gap:16px;font-size:21px;padding:11px 0;border-bottom:1px solid #262628}i{width:13px;height:13px;flex:none;border-radius:2px}i.pass{background:#ffa45c}i.fail{border:2px solid #6e6e6b;box-sizing:border-box}.seat{flex:1}.ok{color:#ffa45c;width:58px}.no{color:#6e6e6b;width:58px}.cost{color:#9a9a97;width:70px;text-align:right}.score{margin-top:22px;display:inline-flex;align-items:center;gap:10px;padding:9px 16px;border-radius:999px;background:#24150b;color:#ffa45c;font-size:18px}.score b{width:10px;height:10px;background:#ffa45c;border-radius:2px;transform:rotate(45deg)}</style></head><body><div class="frame"></div><div class="word"><svg width="40" height="40" viewBox="0 0 48 48" shape-rendering="crispEdges">${tubeRects(0, 4)}</svg>assay</div><h1><span>Spin up a fleet</span> of coding agents.</h1><p>assay.coey.dev</p><div class="run"><div class="cmd">$ assay run plan.json</div><ul>${rows}</ul><div class="score"><b></b>${fleetRun.receipts.filter((receipt) => receipt.passed).length} of ${fleetRun.receipts.length} passed</div></div></body></html>`;
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
