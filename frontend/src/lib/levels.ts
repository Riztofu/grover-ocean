// Level metadata + the "field notes" the player collects into the journal.
// Read the journal top to bottom after Level 5 and it is a complete
// plain-language explanation of Grover's algorithm.

export interface LevelMeta {
  id: number;
  title: string;
  subtitle: string;
  fieldNote: string;
}

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
];

export const NUM_TILES = 16;

export function randomTarget(): number {
  return Math.floor(Math.random() * NUM_TILES);
}
