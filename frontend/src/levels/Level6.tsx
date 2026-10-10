import { useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import LevelFrame from "../components/LevelFrame";
import GuideBox, { Do } from "../components/Guide";
import OceanGrid from "../components/OceanGrid";
import UnderTheHood from "../components/UnderTheHood";
import { castNet, fetchState, type Op, type QuantumState } from "../lib/api";
import { NUM_TILES, randomTarget } from "../lib/levels";
import { ViewToggle } from "./Level2";

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const MAX_CASTS = 2;
const MAX_OPS = 12;
const GOAL = 0.9;

const HINTS = [
  "A measurement sees amplitude². Before anything else, every shell needs SOME amplitude to square. Which spell hands amplitude to all 16 shells at once?",
  "Mark alone is invisible (Level 3). Mirror alone has nothing interesting to reflect. But what happened when they ran back-to-back in Level 5?",
  "The full recipe: spread once, then mark → mirror, three times over. Seven spells. That sequence has a name — Grover's algorithm — and you just rebuilt it.",
];

const OP_LABEL: Record<Op, string> = {
  spread: "🌊 spread",
  mark: "✒️ mark",
  mirror: "🪞 mirror",
};

export default function Level6({ noteCollected, onCollectNote, onApiError }: Props) {
  const [fish, setFish] = useState(randomTarget);
  const [ops, setOps] = useState<Op[]>([]);
  const [state, setState] = useState<QuantumState | null>(null);
  const [prevP, setPrevP] = useState(0);
  const [view, setView] = useState<ChartView>("probability");
  const [casts, setCasts] = useState<number[]>([]);
  const [caught, setCaught] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);

  const pFish = state?.probabilities[fish] ?? 0;
  const escaped = !caught && casts.length >= MAX_CASTS;
  const locked = caught || escaped;

  async function runOps(next: Op[]) {
    setBusy(true);
    try {
      if (next.length === 0) {
        setState(null);
        setPrevP(0);
      } else {
        setPrevP(pFish);
        setState(await fetchState(NUM_TILES, fish, next));
      }
      setOps(next);
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function addOp(op: Op) {
    if (locked || busy || ops.length >= MAX_OPS) return;
    void runOps([...ops, op]);
  }

  async function cast() {
    if (locked || ops.length === 0) return;
    setBusy(true);
    try {
      const landed = await castNet(NUM_TILES, fish, ops);
      setCasts((c) => [...c, landed]);
      if (landed === fish) setCaught(true);
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFish(randomTarget());
    setOps([]);
    setState(null);
    setPrevP(0);
    setCasts([]);
    setCaught(false);
    setHintsShown(0);
  }

  const gotWorse = state !== null && ops.length > 1 && pFish < prevP - 0.01;
  const step = caught || escaped ? 2 : pFish >= GOAL ? 1 : 0;

  return (
    <LevelFrame
      levelId={6}
      story={
        <>
          No guide rails this time, captain. A fish hides in the grid, and you
          get the three spells as raw pieces — in any order, as many as you
          like. Nobody will tell you the recipe.
        </>
      }
      noteReady={caught}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={3}>
          Your goal: chain spells until the <strong>catch chance reaches{" "}
          {GOAL * 100}%</strong>, then cast. You have{" "}
          <strong>{MAX_CASTS} casts</strong> and bragging rights go to the
          shortest spell chain (par is 7). Everything you need, you learned in
          Levels 2–5.
          <Do>Click spells from the palette and watch what each one does to the chart.</Do>
          {gotWorse && (
            <span className="block mt-2 text-rose-300">
              📉 That last spell made your catch chance <em>drop</em> (
              {(prevP * 100).toFixed(1)}% → {(pFish * 100).toFixed(1)}%).
              Order matters — undo it?
            </span>
          )}
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={3}>
          <strong>{(pFish * 100).toFixed(1)}%</strong> with {ops.length} spells
          — that's a confident ocean.
          <Do>Cast the net.</Do>
        </GuideBox>
      )}
      {step === 2 && caught && (
        <GuideBox step={2} total={3} done>
          🏆 Caught it with your own hands: <strong>
          {ops.map((o) => OP_LABEL[o].split(" ")[1]).join(" → ")}</strong>
          {" "}({ops.length} spells{ops.length <= 7 ? " — par or better!" : ""}).
          Compare that chain to the textbook: spread, then (mark → mirror) × 3.
          If they match, you didn't learn Grover's algorithm — you{" "}
          <em>reinvented</em> it. That's the whole point of this game.
          <Do>Collect the final field note.</Do>
        </GuideBox>
      )}
      {step === 2 && escaped && (
        <GuideBox step={2} total={3}>
          Out of nets. Your chain reached {(pFish * 100).toFixed(1)}% — the
          ocean wasn't confident enough when you cast. Reset and build the
          chance higher before spending a net.
        </GuideBox>
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold">
          Spell palette:
        </span>
        {(["spread", "mark", "mirror"] as Op[]).map((op) => (
          <button
            key={op}
            onClick={() => addOp(op)}
            disabled={busy || locked || ops.length >= MAX_OPS}
            className="rounded-lg bg-cyan-400 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-cyan-300 disabled:opacity-40"
          >
            {OP_LABEL[op]}
          </button>
        ))}
        <button
          onClick={cast}
          disabled={busy || locked || ops.length === 0}
          className={`rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 ${
            step === 1 ? "pulse-glow" : ""
          }`}
        >
          🕸️ Cast ({MAX_CASTS - casts.length} left)
        </button>
        <ViewToggle view={view} setView={setView} />
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center text-sm">
        <span className="text-cyan-200/60 text-xs">Your chain:</span>
        {ops.length === 0 && <span className="text-cyan-200/40 text-xs italic">empty — the ocean is unprepared</span>}
        {ops.map((o, i) => (
          <span key={i} className="inline-block bg-cyan-800/60 border border-cyan-600/40 rounded px-2 py-0.5 text-xs">
            {i + 1}. {OP_LABEL[o]}
          </span>
        ))}
        {ops.length > 0 && !locked && (
          <>
            <button
              onClick={() => void runOps(ops.slice(0, -1))}
              disabled={busy}
              className="text-xs underline text-cyan-300 hover:text-white disabled:opacity-40"
            >
              undo last
            </button>
            <button
              onClick={() => void runOps([])}
              disabled={busy}
              className="text-xs underline text-cyan-300 hover:text-white disabled:opacity-40"
            >
              clear
            </button>
          </>
        )}
        {!locked && (
          <button
            onClick={() => setHintsShown((h) => Math.min(h + 1, HINTS.length))}
            className="ml-auto text-xs underline text-amber-300/80 hover:text-amber-200"
          >
            🧭 stuck? hint {hintsShown}/{HINTS.length}
          </button>
        )}
      </div>

      {hintsShown > 0 && !locked && (
        <div className="mb-3 space-y-1">
          {HINTS.slice(0, hintsShown).map((h, i) => (
            <div key={i} className="rounded-lg border border-amber-300/30 bg-amber-100/5 px-3 py-2 text-xs text-amber-50/90">
              Hint {i + 1}: {h}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-[260px]">
          <div className="text-xs text-cyan-200/60 mb-1">
            Ocean heatmap — catch chance ≈{" "}
            <span className={pFish >= GOAL ? "text-emerald-300 font-bold" : "text-amber-200 font-bold"}>
              {(pFish * 100).toFixed(1)}%
            </span>{" "}
            (goal: {GOAL * 100}%)
          </div>
          <OceanGrid
            tiles={NUM_TILES}
            heat={state?.probabilities ?? null}
            target={fish}
            lastCast={casts.length ? casts[casts.length - 1] : null}
            labels="wave"
          />
        </div>
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-3">
          <AmplitudeChart
            amplitudes={state?.amplitudes ?? null}
            view={view}
            highlight={caught || escaped ? fish : null}
          />
          <div className="text-xs text-cyan-200/60 px-2">
            Every spell you click re-runs the whole circuit in Qiskit.
          </div>
        </div>
      </div>

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}
