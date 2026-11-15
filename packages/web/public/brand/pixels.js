const drawings = {
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

const palettes = {
  paper: { "#": "var(--ink)", "+": "var(--signal)" },
  ink: { "#": "var(--paper)", "+": "var(--signal)" },
};

const rectsFor = (rows, palette) =>
  rows
    .flatMap((row, y) =>
      [...row].map((cell, x) =>
        palette[cell] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[cell]}"/>` : "",
      ),
    )
    .join("");

for (const svg of document.querySelectorAll("svg[data-px]")) {
  const rows = drawings[svg.dataset.px];
  svg.setAttribute("viewBox", "0 0 12 12");
  svg.innerHTML = rectsFor(rows, palettes[svg.dataset.on ?? "paper"]);
}

const figure = document.getElementById("fig1");
if (figure) {
  const unit = 6;
  const floor = 36;
  const bars = [
    { x: 6, passed: 5, hit: false, label: "CLI" },
    { x: 18, passed: 1, hit: false, label: "MCP" },
    { x: 50, passed: 5, hit: false, label: "CLI" },
    { x: 62, passed: 5, hit: true, label: "MCP" },
  ];
  const ticks = [0, 1, 2, 3, 4, 5]
    .map((n) => `<rect x="0" y="${floor - n * unit}" width="2" height="0.5" fill="var(--quiet)"/>`)
    .join("");
  const columns = bars
    .map(({ x, passed, hit }) => {
      const height = passed * unit;
      return `<rect x="${x}" y="${floor - height}" width="8" height="${height}" fill="${hit ? "var(--signal)" : "var(--ink)"}"/>`;
    })
    .join("");
  const labels = bars
    .map(
      ({ x, label }) =>
        `<text x="${x + 4}" y="${floor + 3.4}" text-anchor="middle" font-size="2.6" font-family="Google Sans Code, monospace" fill="var(--graphite)">${label}</text>`,
    )
    .join("");
  const rounds = `<text x="18" y="2.6" text-anchor="middle" font-size="2.6" font-family="Google Sans Code, monospace" fill="var(--quiet)">round 1</text><text x="62" y="2.6" text-anchor="middle" font-size="2.6" font-family="Google Sans Code, monospace" fill="var(--quiet)">round 2</text>`;
  figure.innerHTML = `${ticks}<rect x="3" y="${floor}" width="90" height="0.5" fill="var(--ink)"/>${columns}${labels}${rounds}`;
}
