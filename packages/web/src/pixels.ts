export type Drawing = "tube" | "plan" | "budget" | "grader" | "receipt";
export type Cell = { x: number; y: number; signal: boolean };

const drawings: Record<Drawing, readonly string[]> = {
  tube: [
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
  ],
  plan: [
    "....####....",
    "....####....",
    "...######...",
    "....#..#....",
    "....#..#....",
    "....#++#....",
    "....#++#....",
    "....#++#....",
    "....#++#....",
    "....#++#....",
    ".....##.....",
    "............",
  ],
  budget: [
    "............",
    "........+...",
    "........+...",
    "############",
    "#.......+..#",
    "#++++++.+..#",
    "#++++++.+..#",
    "#.......+..#",
    "############",
    "........+...",
    "........+...",
    "............",
  ],
  grader: [
    "............",
    "....####....",
    "...#....#...",
    "...#....#...",
    "..########..",
    "..#......#..",
    "..#..++..#..",
    "..#..++..#..",
    "..#...+..#..",
    "..#......#..",
    "..########..",
    "............",
  ],
  receipt: [
    ".#########..",
    ".#.......#..",
    ".#.#####.#..",
    ".#.......#..",
    ".#.####..#..",
    ".#.......#..",
    ".#.###...#..",
    ".#.......#..",
    ".#....++.#..",
    ".#.......#..",
    ".#.#.#.#.#..",
    "..#.#.#.#...",
  ],
};

export const cellsOf = (drawing: Drawing): readonly Cell[] =>
  drawings[drawing].flatMap((row, y) =>
    [...row].flatMap((mark, x) => (mark === "." ? [] : [{ x, y, signal: mark === "+" }])),
  );

export type Bar = { label: string; passed: number; seats: number; round: number; focus: boolean };

export type BarLayout = Bar & { x: number; top: number; height: number };

export const figureGeometry = { unit: 6, floor: 36, width: 96, height: 42, barWidth: 8 } as const;

export const layoutBars = (bars: readonly Bar[]): readonly BarLayout[] =>
  bars.map((bar, index) => {
    const height = Math.round((bar.passed / bar.seats) * 5) * figureGeometry.unit;
    const x = 8 + bar.round * 44 + (index % 2) * 13;
    return { ...bar, x, height, top: figureGeometry.floor - height };
  });
