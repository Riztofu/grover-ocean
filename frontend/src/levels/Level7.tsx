import { useEffect, useRef, useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import CircuitBench from "../components/CircuitBench";
import GuideBox, { Do, Term } from "../components/Guide";
import LevelFrame from "../components/LevelFrame";
import OceanGrid from "../components/OceanGrid";
import UnderTheHood from "../components/UnderTheHood";
import {
  emptyBench,
  fetchBench,
  type BenchColumn,
  type BenchResult,
} from "../lib/api";
import { ViewToggle } from "./Level2";

/**
 * Level 7 — The Spellsmith.
 *
 * Until now the three spells were sealed boxes. Here the player forges each
 * one out of RAW quantum gates (H, X, Z, CZ) on a 2-wire bench — a 4-shell
 * training pool — then hunts a fish with circuits built entirely by hand.
 * mark and mirror are verified as full unitaries server-side: any correct
 * construction passes, and a build that only works on one ocean doesn't.
 */

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const COLS = 6;
const BENCH_TILES = 4;

const PUZZLES = ["flip", "spread", "mark3", "mark1", "mirror"];

const HINTS: string[][] = [
  [
    "X is the quantum NOT gate: it flips one wire's bit. Shell 2 written in bits is B=1, A=0 — which wire needs flipping?",
    "Place X on wire B (the 2s bit). That's the whole circuit.",
  ],
  [
    "H (the Hadamard) turns one wire's definite 0 into an equal mix of 0 and 1. One H spreads you over two shells — you need all four.",
    "One H on EACH wire. 2 × 2 = 4 shells, all equal. That's the entire spread spell.",
  ],
  [
    "Z flips the sign wherever its own wire reads 1 — but that marks TWO shells at once. Too greedy.",
    "Shell 3 is the only shell where BOTH wires read 1. You need a Z that fires only when the wires agree: the controlled-Z (●─●).",
  ],
  [
    "CZ only fires where both wires read 1, but shell 1 has B=0. Can you make shell 1 LOOK like shell 3 to the CZ — and then undo the disguise?",
    "The sandwich trick: X on wire B, then CZ, then X on wire B again. Rule: wrap the CZ in X on every wire whose bit is 0.",
  ],
  [
    "The mirror is a sandwich too: transform, do something simple in the middle, transform back. The outer layers are H on every wire.",
    "Full recipe, five columns: H·H → X·X → ●─● → X·X → H·H. (The checker accepts ANY equivalent circuit — if you find a shorter one, it counts.)",
  ],
  [
    "Same sandwich rule as before: wrap your CZ in X on every wire whose bit is 0 in the fish's shell number.",
  ],
];

type HuntPhase = "forge" | "armed" | "done";

function snapshot(cols: BenchColumn[]): BenchColumn[] {
  return cols.map((c) => ({ cz: c.cz, wires: [...c.wires] }));
}

export default function Level7({ noteCollected, onCollectNote, onApiError }: Props) {
  const [stage, setStage] = useState(0);
  const [columns, setColumns] = useState<BenchColumn[]>(() => emptyBench(COLS));
  const [result, setResult] = useState<BenchResult | null>(null);
  const [view, setView] = useState<ChartView>("amplitude");
  const [hintsShown, setHintsShown] = useState(0);
  const [busy, setBusy] = useState(false);

  // verified builds, saved as the player advances
  const [spreadCols, setSpreadCols] = useState<BenchColumn[] | null>(null);
  const [markCols, setMarkCols] = useState<BenchColumn[] | null>(null);
  const [mirrorCols, setMirrorCols] = useState<BenchColumn[] | null>(null);

  // the hunt
  const [fish, setFish] = useState(() => Math.floor(Math.random() * BENCH_TILES));
  const [phase, setPhase] = useState<HuntPhase>("forge");
  const [hunt, setHunt] = useState<BenchResult | null>(null);
  const [chainCols, setChainCols] = useState<BenchColumn[] | null>(null);
  const [landed, setLanded] = useState<number | null>(null);

  const puzzle = stage === 5 ? `mark${fish}` : PUZZLES[stage];
  const solved = result?.solved ?? false;
  const caught = phase === "done" && landed === fish;

  // live check: every edit re-runs (and re-verifies) the circuit in Qiskit
  const seq = useRef(0);
  useEffect(() => {
    if (stage === 5 && phase !== "forge") return;
    const id = ++seq.current;
    const t = setTimeout(() => {
      fetchBench(columns, puzzle)
        .then((r) => {
          if (seq.current === id) setResult(r);
        })
        .catch(onApiError);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, puzzle, stage, phase]);

  function advance() {
    const snap = snapshot(columns);
    if (stage === 1) setSpreadCols(snap);
    if (stage === 3) setMarkCols(snap);
    if (stage === 4) setMirrorCols(snap);
    const next = stage + 1;
    setStage(next);
    setResult(null);
    setHintsShown(0);
    if (next === 5) {
      setColumns(markCols ? snapshot(markCols) : emptyBench(COLS));
    } else if (next !== 3) {
      // entering stage 3 keeps the CZ build on the bench to extend;
      // every other stage starts clean
      setColumns(emptyBench(COLS));
    }
  }

  async function arm() {
    if (!spreadCols || !mirrorCols || !solved) return;
    setBusy(true);
    try {
      const chain = [...snapshot(spreadCols), ...snapshot(columns), ...snapshot(mirrorCols)];
      const r = await fetchBench(chain, "free");
      setChainCols(chain);
      setHunt(r);
      setPhase("armed");
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  async function cast() {
    if (!chainCols) return;
    setBusy(true);
    try {
      const r = await fetchBench(chainCols, "free", 1);
      setLanded(Number(Object.keys(r.counts ?? { 0: 1 })[0]));
      setPhase("done");
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStage(0);
    setColumns(emptyBench(COLS));
    setResult(null);
    setView("amplitude");
    setHintsShown(0);
    setSpreadCols(null);
    setMarkCols(null);
    setMirrorCols(null);
    setFish(Math.floor(Math.random() * BENCH_TILES));
    setPhase("forge");
    setHunt(null);
    setChainCols(null);
    setLanded(null);
  }

  const hints = HINTS[stage] ?? [];
  const benchLocked = stage === 5 && phase !== "forge";

  return (
    <LevelFrame
      levelId={7}
      story={
        <>
          The spells were never magic — each one is a tiny circuit of raw{" "}
          <Term t="quantum gate">quantum gates</Term>, wired together. Welcome
          to the forge: a 2-wire bench over a 4-shell training pool. Each wire
          carries one bit of the shell number (shell # = 2×B + A). One thing
          you can't do: split a wire. The{" "}
          <Term t="no-cloning theorem" /> says a qubit can never be copied —
          so quantum circuits are rails, not spaghetti.
        </>
      }
      noteReady={caught}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {/* ——— Coral's script ——— */}
      {stage === 0 && !solved && (
        <GuideBox step={0} total={6}>
          First forging: the pearl sits at shell 0, but sonar says it's at{" "}
          <strong>shell 2</strong>. Build a circuit that moves it there.
          <Do>Pick a gate from the palette and click a spot on a wire. Watch the pearl bar.</Do>
        </GuideBox>
      )}
      {stage === 0 && solved && (
        <GuideBox step={0} total={6} onNext={advance} nextLabel="Next forging →">
          ⚒️ That gate is <strong>X — the quantum NOT</strong>: it flips one
          wire's bit, and flipping the 2s bit turns shell 0 into shell 2. You
          just built your first quantum circuit. (If you used H·Z·H instead:
          also correct — the checker accepts any circuit that produces the
          right state.)
        </GuideBox>
      )}

      {stage === 1 && !solved && (
        <GuideBox step={1} total={6}>
          Now forge the <strong>spread</strong> spell from scratch: make all
          four bars rise to the <em>same height</em> —{" "}
          <Term t="superposition" /> over every shell.
          <Do>One gate type does it. Which — and where?</Do>
        </GuideBox>
      )}
      {stage === 1 && solved && (
        <GuideBox step={1} total={6} onNext={advance} nextLabel="Next forging →">
          ⚒️ One <Term t="Hadamard gate">H on each wire</Term> — that is the{" "}
          <em>entire</em> spread spell, for any ocean size: n wires, n
          Hadamards, 2ⁿ shells covered. Saved to your spellbook.
        </GuideBox>
      )}

      {stage === 2 && !solved && (
        <GuideBox step={2} total={6}>
          Forge the <strong>mark</strong> spell (the <Term t="oracle" />) for{" "}
          <strong>shell 3</strong>. The bench starts on a spread ocean; your
          circuit must flip the <em>sign</em> of shell 3's bar and touch
          nothing else. One rule of the forge: your circuit is{" "}
          <strong>tested on every possible ocean</strong>, not just the one on
          screen — a real spell works everywhere.
          <Do>Try Z somewhere and watch which bars flip. Then get choosier.</Do>
        </GuideBox>
      )}
      {stage === 2 && solved && (
        <GuideBox step={2} total={6} onNext={advance} nextLabel="Next forging →">
          ⚒️ The <strong>controlled-Z</strong>: a Z that only fires where{" "}
          <em>both</em> wires read 1 — and shell 3 is the only such shell. Now
          flip to probability view: the ink is still invisible, and now you
          know why from the wiring — squaring eats the minus sign.
        </GuideBox>
      )}

      {stage === 3 && !solved && (
        <GuideBox step={3} total={6}>
          Sonar update: the pearl moved to <strong>shell 1</strong> (B=0,
          A=1). Your CZ only fires where both wires read 1... and shell 1's B
          bit is 0. Retarget the oracle.
          <Do>Keep the CZ. Add something around it.</Do>
        </GuideBox>
      )}
      {stage === 3 && solved && (
        <GuideBox step={3} total={6} onNext={advance} nextLabel="Final forging →">
          ⚒️ The <strong>X sandwich</strong>: X makes shell 1 look like shell
          3 to the CZ, then X undoes the disguise. Wrap in X on every wire
          whose bit is 0 — that is exactly how real oracles retarget, on
          hardware too.
        </GuideBox>
      )}

      {stage === 4 && !solved && (
        <GuideBox step={4} total={6}>
          The final forging: the <strong>mirror</strong> (<Term t="diffusion" />
          ). The bench starts on a marked ocean — shell 3's bar hangs
          negative. Build the reflection across the average. Five columns,
          three gate types. Hardest build on the bench; hints are honorable.
          <Do>Think in sandwiches — you've built two already.</Do>
        </GuideBox>
      )}
      {stage === 4 && solved && (
        <GuideBox step={4} total={6} onNext={advance} nextLabel="To the hunt →">
          ⚒️ Look at the chart: the marked shell's bar is now at{" "}
          <strong>1.0 — a 100% catch</strong>. On a 4-shell ocean, one ping
          isn't just better than guessing, it's <em>certain</em>. And your
          mirror was verified as a full circuit: it works on every ocean, not
          just this one. The spellbook is complete.
        </GuideBox>
      )}

      {stage === 5 && phase === "forge" && !solved && (
        <GuideBox step={5} total={6}>
          The hunt — with <strong>your</strong> spells. A fish hides at{" "}
          <strong>shell {fish}</strong> (in bits: B={Math.floor(fish / 2)},
          A={fish % 2}). Your spread and mirror are already loaded in the
          sonar; the bench holds your mark circuit from before.
          <Do>Retarget your mark to shell {fish}, spellsmith.</Do>
        </GuideBox>
      )}
      {stage === 5 && phase === "forge" && solved && (
        <GuideBox step={5} total={6}>
          Oracle locked on shell {fish}. ✓
          <Do>Arm the sonar — the game will chain your three circuits: spread → mark → mirror.</Do>
        </GuideBox>
      )}
      {stage === 5 && phase === "armed" && (
        <GuideBox step={5} total={6}>
          Sonar armed. The heatmap below comes from <em>your</em> gates —
          open "Under the hood" to see the full chained circuit, every gate
          placed by you. The fish's shell reads{" "}
          <strong>{((hunt?.probabilities[fish] ?? 0) * 100).toFixed(1)}%</strong>.
          <Do>Cast. No luck required.</Do>
        </GuideBox>
      )}
      {stage === 5 && phase === "done" && caught && (
        <GuideBox step={5} total={6} done>
          🏆 A guaranteed catch, from gates you placed by hand. You didn't{" "}
          <em>use</em> Grover's algorithm this time — you <strong>forged
          it</strong>: spread = H's, mark = an X-wrapped CZ, mirror = H's and
          X's around one CZ. Algorithms are wiring, and you can wire.
          <Do>Collect the final field note.</Do>
        </GuideBox>
      )}
      {stage === 5 && phase === "done" && !caught && (
        <GuideBox step={5} total={6}>
          The net came up at shell {landed} — which should be impossible with
          a verified build. Reset the level and tell the devs a fish broke
          mathematics.
        </GuideBox>
      )}

      {/* ——— the bench ——— */}
      <CircuitBench columns={columns} onChange={setColumns} disabled={benchLocked || busy} />

      <div className="flex gap-2 mt-3 mb-1 flex-wrap items-center">
        {stage === 5 && phase === "forge" && (
          <button
            onClick={() => void arm()}
            disabled={!solved || busy}
            className={`rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 ${
              solved ? "pulse-glow" : ""
            }`}
          >
            🧭 Arm the sonar
          </button>
        )}
        {stage === 5 && phase === "armed" && (
          <button
            onClick={() => void cast()}
            disabled={busy}
            className="rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 pulse-glow"
          >
            🕸️ Cast the net
          </button>
        )}
        <ViewToggle view={view} setView={setView} />
        {!solved && phase === "forge" && hints.length > 0 && (
          <button
            onClick={() => setHintsShown((h) => Math.min(h + 1, hints.length))}
            className="ml-auto text-xs underline text-amber-300/80 hover:text-amber-200"
          >
            🧭 stuck? hint {hintsShown}/{hints.length}
          </button>
        )}
      </div>

      {hintsShown > 0 && !solved && (
        <div className="mb-3 space-y-1">
          {hints.slice(0, hintsShown).map((h, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-300/30 bg-amber-100/5 px-3 py-2 text-xs text-amber-50/90"
            >
              Hint {i + 1}: {h}
            </div>
          ))}
        </div>
      )}

      {/* ——— readouts ——— */}
      <div className="flex flex-wrap gap-4 items-start mt-3">
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-3">
          <AmplitudeChart
            amplitudes={(phase === "forge" ? result?.amplitudes : hunt?.amplitudes) ?? null}
            view={view}
            highlight={stage === 5 && phase !== "forge" ? fish : null}
            showMean={stage === 4 && view === "amplitude"}
          />
          <div className="text-xs text-cyan-200/60 px-2">
            {solved && phase === "forge" ? (
              <span className="text-emerald-300 font-semibold">
                ✓ verified by Qiskit{stage >= 2 && stage !== 5 ? " — on every possible ocean" : ""}
              </span>
            ) : (
              "Every edit re-runs your circuit in Qiskit — the bars are its real output."
            )}
          </div>
        </div>
        {stage === 5 && phase !== "forge" && (
          <div className="flex-1 min-w-[200px] max-w-[280px]">
            <div className="text-xs text-cyan-200/60 mb-1">Training pool — your algorithm's catch chances</div>
            <OceanGrid
              tiles={BENCH_TILES}
              heat={hunt?.probabilities ?? null}
              target={fish}
              lastCast={landed}
              labels="wave"
            />
          </div>
        )}
      </div>

      <UnderTheHood diagram={(phase === "forge" ? result?.diagram : hunt?.diagram) ?? null} />
    </LevelFrame>
  );
}
