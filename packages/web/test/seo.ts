import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5290";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/`, { waitUntil: "networkidle" });
const report = await page.evaluate(() => ({
  title: document.title,
  h1Count: document.querySelectorAll("h1").length,
  fallbackGone: !document.body.innerText.includes("Four rules\nThe plan is frozen. Each receipt"),
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
  twitter: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content"),
  manifest: document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
  jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
}));
const worker = await page.evaluate(async () => {
  const registration = await navigator.serviceWorker.ready;
  return registration.active?.scriptURL ?? "none";
});
console.log(JSON.stringify({ ...report, worker }, null, 2));
await browser.close();
