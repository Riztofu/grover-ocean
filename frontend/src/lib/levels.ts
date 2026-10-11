// Level metadata + the "field notes" the player collects into the journal.
// Read the journal top to bottom after Level 5 and it is a complete
// plain-language explanation of Grover's algorithm; Levels 6-11 then turn
// that explanation into mastery.

export interface LevelMeta {
  id: number;
  title: string;
  subtitle: string;
  fieldNote: string;
}

/** The three acts of the curriculum, for the level nav. */
export const ACTS: { title: string; blurb: string; levels: number[] }[] = [
  { title: "Act I · Learn", blurb: "the complete conceptual arc", levels: [1, 2, 3, 4, 5] },
  { title: "Act II · Build", blurb: "the player takes the wheel", levels: [6, 7] },
  { title: "Act III · Master", blurb: "the dial, the scaling, the real world", levels: [8, 9, 10, 11] },
];

export const LEVELS: LevelMeta[] = [
  {
    id: 1,
    title: "The Old Way",
    subtitle: "Classical search — flip shells one at a time",
    fieldNote:
      "Searching blindly, finding one pearl among 16 shells costs about 8 flips on average — for N shells, about N/2. Every search method must beat this number to matter.",
  },
  {
    id: 2,
    title: "Spread the Net",
    subtitle: "Superposition & amplitudes",
    fieldNote:
      "The 'spread' spell puts all 16 shells into equal superposition: every shell gets the same amplitude, and probability = amplitude². But measuring just picks a random shell — superposition alone is only fancy randomness.",
  },
  {
    id: 3,
    title: "Invisible Ink",
    subtitle: "The oracle marks the pearl — and nothing changes",
    fieldNote:
      "The 'mark' spell (the oracle) flips the pearl's amplitude to negative. Probability is amplitude squared, so the minus sign is invisible to measurement — a quantum computer that merely 'checks everything at once' has learned nothing it can show you.",
  },
  {
    id: 4,
    title: "The Mirror",
    subtitle: "Diffusion — reflect every bar across the average",
    fieldNote:
      "The 'mirror' spell reflects every amplitude across the average of all amplitudes. The 15 positive bars sit near the average and barely move; the one negative bar is far below it and vaults high above everything. The invisible mark has become visible.",
  },
  {
    id: 5,
    title: "Ping!",
    subtitle: "mark + mirror = one Grover iteration",
    fieldNote:
      "mark + mirror together make one 'sonar ping' — one Grover iteration. Each ping pumps amplitude into the target. For 16 tiles, about 3 pings give a ~96% catch: quantum search costs about √N tries where classical search costs N/2.",
  },
  {
    id: 6,
    title: "Qubit Complete",
    subtitle: "Free build — rediscover the algorithm yourself",
    fieldNote:
      "Given only the raw spells and no recipe, the winning chain is: spread once, then (mark → mirror) repeated ~3 times, then measure. That chain has a name — Grover's algorithm — and the shortest route to it isn't memorizing; it's understanding what each piece does.",
  },
  {
    id: 7,
    title: "The Spellsmith",
    subtitle: "Forge the spells themselves from raw quantum gates",
    fieldNote:
      "Every spell is itself a tiny circuit of raw gates: spread = a Hadamard on each wire, mark = a controlled-Z wrapped in X's, mirror = H's and X's wrapped around one controlled-Z. A quantum algorithm isn't a magic box — it's wiring. On a 4-shell ocean, the circuit I built by hand caught the fish with 100% certainty.",
  },
  {
    id: 8,
    title: "Don't Overwind",
    subtitle: "More pings is not more better — the sweet spot",
    fieldNote:
      "Every ping rotates the ocean's state by the same fixed angle toward the fish — so pinging past the top swings it right back out. On 16 tiles, 3 pings give 96%; a 4th drops it to 58%, a 6th to 2%. Grover's algorithm is a dial, not a ratchet: the sweet spot is about (π/4)·√N pings, and the catch chance is sin² of the compass angle.",
  },
  {
    id: 9,
    title: "Bigger Oceans",
    subtitle: "Discover √N scaling by hand",
    fieldNote:
      "Quadrupling the ocean only doubled the pings: 16 tiles → 3, 64 → 6, 256 → 12. Classical search grows like N (half the tiles, on average); quantum search grows like √N. For a million tiles that's ~800 pings against ~500,000 flips — and the gap only widens as the ocean grows.",
  },
  {
    id: 10,
    title: "Two Fish",
    subtitle: "More answers need fewer pings",
    fieldNote:
      "More correct answers make the search easier, not harder: with M fish the oracle marks all of them and each ping rotates by a bigger angle (sin θ = √(M/N)), so the sweet spot is about (π/4)·√(N/M) pings. Two fish in 16 tiles peak at 2 pings; four fish peak at exactly 1 ping — with a guaranteed catch.",
  },
  {
    id: 11,
    title: "The Real Ocean",
    subtitle: "Boss: no heatmap, limited shots, choppy seas",
    fieldNote:
      "Real quantum hardware never shows you amplitudes — only measurement results, one shot at a time, from an imperfect machine. The algorithm's output is a probability distribution; you read it by repeating the run, counting, and checking the most common answer. Noise rots a little of every ping, pulling the sweet spot earlier and lower — so on real hardware the dial matters even more.",
  },
];

export const NUM_TILES = 16;

export function randomTarget(numTiles = NUM_TILES): number {
  return Math.floor(Math.random() * numTiles);
}

/** `count` distinct random tiles — a school of fish (Level 10). */
export function randomTargets(count: number, numTiles = NUM_TILES): number[] {
  const picked = new Set<number>();
  while (picked.size < Math.min(count, numTiles)) picked.add(randomTarget(numTiles));
  return [...picked].sort((a, b) => a - b);
}
