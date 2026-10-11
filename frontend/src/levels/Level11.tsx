import { useState } from "react";
import GuideBox, { Do, Term } from "../components/Guide";
import LevelFrame from "../components/LevelFrame";
import OceanGrid from "../components/OceanGrid";
import { fetchSample, pingOps } from "../lib/api";
import { randomTarget } from "../lib/levels";

/**
 * Level 11 — The Real Ocean (boss).
 *
 * Training wheels off. No heatmap, no bar chart, no compass: on real hardware
 * you never see amplitudes, only measurement outcomes. The player sets the
 * ping dial, spends a limited shot budget on honest samples, reads the
 * tallies, and declares where the fish is. Then again in choppy seas, where
 * every ping rots 8% of the signal (a real depolarizing noise model) — which
 * moves the sweet spot earlier and lower.
 */

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const TILES = 64;
const MAX_PINGS = 12;
const SHOT_OPTIONS = [1, 4, 8];

type Sea = "calm" | "choppy";
const SEAS: Record<Sea, { noise: number; budget: number; label: string; blurb: string }> = {
  calm: { noise: 0, budget: 24, label: "🌤️ calm sea", blurb: "a perfect, noiseless machine" },
  choppy: { noise: 0.08, budget: 32, label: "🌊 choppy sea", blurb: "8% of the signal rots on every ping" },
};

interface Expedition {
  pings: number;
  shots: number;
  counts: Record<string, number>;
}

type Outcome = null | "win" | "lose";
const TOTAL_STEPS = 5;

export default function Level11({ noteCollected, onCollectNote, onApiError }: Props) {
  const [sea, setSea] = useState<Sea>("calm");
  const [fish, setFish] = useState(() => randomTarget(TILES));
  const [dial, setDial] = useState(0);
  const [shots, setShots] = useState(4);
  const [log, setLog] = useState<Expedition[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [wins, setWins] = useState<Record<Sea, number | null>>({ calm: null, choppy: null }); // shots used on the win
  const [busy, setBusy] = useState(false);

  const cfg = SEAS[sea];
  const used = log.reduce((s, e) => s + e.shots, 0);
  const left = cfg.budget - used;
  const locked = outcome !== null;

  async function expedition() {
    if (locked || shots > left) return;
    setBusy(true);
    try {
      const r = await fetchSample(TILES, fish, pingOps(dial), shots, cfg.noise);
      setLog((l) => [...l, { pings: dial, shots, counts: r.counts }]);
      setTally((t) => {
        const next = { ...t };
        for (const [tile, c] of Object.entries(r.counts)) next[tile] = (next[tile] ?? 0) + c;
        return next;
      });
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function declare() {
    if (selected === null || locked) return;
    const win = selected === fish;
    setOutcome(win ? "win" : "lose");
    if (win) setWins((w) => ({ ...w, [sea]: used }));
  }

  function newHunt(nextSea: Sea) {
    setSea(nextSea);
    setFish(randomTarget(TILES));
    setDial(0);
    setLog([]);
    setTally({});
    setSelected(null);
    setOutcome(null);
  }

  function reset() {
    setWins({ calm: null, choppy: null });
    newHunt("calm");
  }

  const topTile = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  const step = log.length === 0 ? 0 : outcome === null ? (used < 8 ? 1 : 2) : outcome === "win" ? 3 : 4;
  const rank = (n: number) => (n <= 8 ? "⚓ Legendary" : n <= 16 ? "🧭 Captain" : "🪣 Deckhand");

  return (
    <LevelFrame
      levelId={11}
      story={
        <>
          Everything so far had training wheels: a heatmap, a bar chart, a
          compass — a god's-eye view no real quantum computer ever gives you.
          Real hardware gives you <strong>one</strong> thing: a measurement
          result, one <Term t="shot" /> at a time, from a machine that isn't
          perfect. 64 tiles. A hidden fish. A shot budget. Go.
        </>
      }
      noteReady={wins.choppy !== null}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          An <strong>expedition</strong> = set the ping dial, choose how many
          shots to fire, and run. Each shot is one honest run of the whole
          circuit (spread, then your pings) followed by one measurement; the
          tile it lands on gets a tally mark. You have <strong>{cfg.budget} shots</strong> total
          {sea === "choppy" && <> — and in choppy seas, <Term t="noise" /> rots 8% of the signal on every ping</>}.
          <Do>
            Set the dial (you learned 64 tiles' sweet spot last level{sea === "choppy" ? "… but noise changes things" : ""}),
            pick a shot count, and run an expedition.
          </Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          Tallies. {topTile && <>Tile {topTile[0]} leads with {topTile[1]}.</>} Remember what a
          measurement is: the algorithm's output is a <em>probability
          distribution</em>, and one shot is one draw from it. A single hit is
          a weak hint; the <strong>same tile hit twice</strong> on a 64-tile
          ocean is strong evidence.
          <Do>Run more expeditions until a tile clearly leads — then declare. Shots left: {left}.</Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS}>
          {topTile && (
            <>
              Tile <strong>{topTile[0]}</strong> leads with {topTile[1]} of {used} shots.
            </>
          )}{" "}
          On real hardware you'd now <em>check</em> that answer classically —
          that's cheap, it's the whole reason the oracle exists. Here, checking
          means declaring.
          <Do>Click a tile, then <strong>Declare</strong>. Or spend more shots if you're not sure ({left} left).</Do>
        </GuideBox>
      )}
      {step === 3 && sea === "calm" && (
        <GuideBox step={3} total={TOTAL_STEPS} onNext={() => newHunt("choppy")} nextLabel="Into the choppy sea →">
          🐟 Tile {fish} — correct, in <strong>{used} shots</strong> ({rank(used)}). You just
          did what every real Grover run does: run, sample, read the
          histogram, verify the top answer. Now the real test: a machine with{" "}
          <Term t="noise" />. Every ping, 8% of the state is scrambled to
          random. More pings = more amplification <em>and</em> more rot. Think
          about where the sweet spot moves.
        </GuideBox>
      )}
      {step === 3 && sea === "choppy" && (
        <GuideBox step={3} total={TOTAL_STEPS} done>
          🏆 Tile {fish} — landed in choppy seas, in <strong>{used} shots</strong> ({rank(used)}).
          You caught a fish with no heatmap, no chart, no compass, on a noisy
          machine, using an algorithm you built from gates. On real hardware
          the sweet spot for 64 tiles slides from 6 pings down to about 5, and
          the peak falls from 99.7% to ~64% — which is exactly why engineers
          obsess over noise. You're a quantum fisherman now.
          <Do>Collect the final field note — then read your whole journal, top to bottom.</Do>
        </GuideBox>
      )}
      {step === 4 && (
        <GuideBox step={4} total={TOTAL_STEPS} onNext={() => newHunt(sea)} nextLabel="New hunt →">
          Tile {selected} was empty — the fish was at <strong>tile {fish}</strong>
          {tally[String(fish)] ? <> (it had {tally[String(fish)]} tall{tally[String(fish)] === 1 ? "y" : "ies"})</> : <> (zero tallies — the dial may have been off the sweet spot)</>}.
          {sea === "choppy" && dial >= 6 && (
            <span className="block mt-1 text-amber-200">In choppy seas, fewer pings than the clean sweet spot often wins.</span>
          )}
        </GuideBox>
      )}

      {/* sea picker + status */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold">Sea state:</span>
        {(Object.keys(SEAS) as Sea[]).map((s) => (
          <button
            key={s}
            onClick={() => (s !== sea ? newHunt(s) : undefined)}
            disabled={busy}
            title={SEAS[s].blurb}
            className={`rounded-full px-4 py-1.5 text-sm border transition ${
              sea === s ? "bg-cyan-400 text-[#06283d] border-cyan-400 font-bold" : "border-cyan-700/70 text-cyan-200 hover:bg-cyan-900/50"
            }`}
          >
            {wins[s] !== null ? "✓ " : ""}
            {SEAS[s].label}
          </button>
        ))}
        <span className="ml-auto text-sm">
          Shots left: <span className={`font-bold ${left <= 4 ? "text-rose-300" : "text-amber-200"}`}>{left}</span>
          <span className="text-cyan-200/60"> / {cfg.budget}</span>
        </span>
      </div>

      {/* expedition controls */}
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <div className="flex items-center gap-2 rounded-lg border border-cyan-700/60 px-3 py-1.5">
          <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold">pings dial</span>
          <button
            onClick={() => setDial((d) => Math.max(0, d - 1))}
            disabled={locked || busy}
            className="w-7 h-7 rounded bg-cyan-900/60 text-cyan-100 font-bold disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center font-black text-amber-200 text-lg">{dial}</span>
          <button
            onClick={() => setDial((d) => Math.min(MAX_PINGS, d + 1))}
            disabled={locked || busy}
            className="w-7 h-7 rounded bg-cyan-900/60 text-cyan-100 font-bold disabled:opacity-40"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-cyan-700/60 px-3 py-1.5">
          <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold mr-1">shots</span>
          {SHOT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setShots(n)}
              disabled={locked || busy || n > left}
              className={`w-8 h-7 rounded text-sm font-bold disabled:opacity-30 ${
                shots === n ? "bg-cyan-400 text-[#06283d]" : "bg-cyan-900/60 text-cyan-100"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => void expedition()}
          disabled={locked || busy || shots > left}
          className={`rounded-lg bg-violet-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40 ${
            step === 0 ? "pulse-glow" : ""
          }`}
        >
          📡 Run expedition ({dial} ping{dial === 1 ? "" : "s"} × {shots} shot{shots === 1 ? "" : "s"})
        </button>
        <button
          onClick={declare}
          disabled={locked || busy || selected === null}
          className={`rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 ${
            step === 2 && selected !== null ? "pulse-glow" : ""
          }`}
        >
          🎯 Declare{selected !== null ? `: tile ${selected}` : ""}
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-[300px]">
          <div className="text-xs text-cyan-200/60 mb-1">
            The real ocean — tally marks only. {outcome === null ? "Click a tile to point at it." : outcome === "win" ? "🐟 revealed." : "The fish is revealed."}
          </div>
          <OceanGrid
            tiles={TILES}
            tally={tally}
            target={fish}
            revealTarget={outcome !== null}
            selected={selected}
            labels="wave"
            disabled={locked}
            onTileClick={(i) => setSelected(i)}
          />
        </div>
        <div className="w-full sm:w-[260px] shrink-0 rounded-xl border border-cyan-800/50 bg-black/20 p-3 text-sm">
          <div className="text-xs text-cyan-200/60 mb-2">Ship's log</div>
          {log.length === 0 && <div className="text-cyan-200/40 italic text-xs">No expeditions yet.</div>}
          <ol className="space-y-1 text-xs">
            {log.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-cyan-200/50 w-6">#{i + 1}</span>
                <span>
                  {e.pings}p × {e.shots}s →{" "}
                  {Object.entries(e.counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, c]) => (c > 1 ? `${t}×${c}` : t))
                    .join(", ")}
                </span>
              </li>
            ))}
          </ol>
          {log.length > 0 && (
            <div className="mt-3 pt-2 border-t border-cyan-900/60 text-xs text-cyan-200/70">
              Circuit per shot: spread → (mark → mirror) × {log[log.length - 1].pings}, 6 qubits
              {cfg.noise > 0 && <>, depolarizing {cfg.noise * 100}% per ping</>}.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-cyan-200/50">
        Every shot is sampled by the backend from the exact output distribution of the real circuit
        {cfg.noise > 0 && " passed through a global depolarizing channel after each iteration"}. No heatmap was consulted — not even by the game.
      </div>
    </LevelFrame>
  );
}
