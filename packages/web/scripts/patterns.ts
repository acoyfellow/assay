import { mkdirSync, writeFileSync } from "node:fs";

type Tone = "light" | "dark";
type Pixel = { x: number; y: number; w?: number; h?: number; signal?: boolean };
type Pattern = { name: string; size: number; pixels: Pixel[]; opacity: number; signalOpacity?: number };

const outDir = new URL("../public/brand/patterns/", import.meta.url);
const inkFor: Record<Tone, string> = { light: "#121212", dark: "#ffffff" };
const signal = "#f26b1d";

const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

const tube = [
  "..######..",
  "...#..#...",
  "...#..#...",
  "...#..#...",
  "...#++#...",
  "...#++#...",
  "...#++#...",
  "....##....",
];

const grid: Pattern = {
  name: "grid",
  size: 48,
  opacity: 0.07,
  pixels: range(4).flatMap((index) => [
    { x: index * 12, y: 0, w: 1, h: 48 },
    { x: 0, y: index * 12, w: 48, h: 1 },
  ]),
};

const dots: Pattern = {
  name: "dots",
  size: 12,
  opacity: 0.16,
  pixels: [{ x: 0, y: 0 }],
};

const rack: Pattern = {
  name: "rack",
  size: 64,
  opacity: 0.07,
  signalOpacity: 0.3,
  pixels: [0, 16, 32, 48].flatMap((offset, row) =>
    tube.flatMap((line, y) =>
      [...line].flatMap((cell, x) =>
        cell === "."
          ? []
          : [0, 32].map((column) => ({
              x: (x + 3 + column + (row % 2) * 16) % 64,
              y: y + offset + 4,
              signal: cell === "+" && row === 1 && column === 32,
            })),
      ),
    ),
  ),
};

const scatter: Pattern = (() => {
  const random = seeded(7);
  const pixels = range(96 * 96)
    .map((index) => ({ x: index % 96, y: Math.floor(index / 96), roll: random() }))
    .filter(({ roll }) => roll < 0.022)
    .map(({ x, y, roll }) => ({ x, y, signal: roll < 0.0006 }));
  return { name: "scatter", size: 96, opacity: 0.22, pixels };
})();

const receipt: Pattern = (() => {
  const random = seeded(11);
  const pixels = range(8).flatMap((row) => {
    const length = 6 + Math.floor(random() * 30);
    const start = 4 + Math.floor(random() * 6);
    return [{ x: start, y: 4 + row * 6, w: length, h: 1 }];
  });
  return { name: "receipt", size: 48, opacity: 0.08, pixels };
})();

const plate: Pattern = {
  name: "plate",
  size: 16,
  opacity: 0.08,
  pixels: [
    { x: 4, y: 4, w: 6, h: 1 },
    { x: 4, y: 9, w: 6, h: 1 },
    { x: 4, y: 5, w: 1, h: 4 },
    { x: 9, y: 5, w: 1, h: 4 },
  ],
};

const svgFor = (pattern: Pattern, tone: Tone) => {
  const rect = ({ x, y, w = 1, h = 1 }: Pixel) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const plain = pattern.pixels
    .filter((pixel) => !pixel.signal)
    .map(rect)
    .join("");
  const marked = pattern.pixels
    .filter((pixel) => pixel.signal)
    .map(rect)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pattern.size}" height="${pattern.size}" viewBox="0 0 ${pattern.size} ${pattern.size}" shape-rendering="crispEdges"><g fill="${inkFor[tone]}" opacity="${pattern.opacity}">${plain}</g><g fill="${signal}" opacity="${pattern.signalOpacity ?? 0.55}">${marked}</g></svg>\n`;
};

mkdirSync(outDir, { recursive: true });
for (const pattern of [grid, dots, rack, scatter, receipt, plate]) {
  for (const tone of ["light", "dark"] as const) {
    writeFileSync(new URL(`${pattern.name}-${tone}.svg`, outDir), svgFor(pattern, tone));
  }
}
console.log("patterns written");
