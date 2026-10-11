import { useEffect, useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import GroverCompass from "../components/GroverCompass";
import GuideBox, { Do, Term } from "../components/Guide";
import LevelFrame from "../components/LevelFrame";
import PingCurve from "../components/PingCurve";
import UnderTheHood from "../components/UnderTheHood";
import { fetchState, fetchTrajectory, pingOps, type QuantumState, type Trajectory } from "../lib/api";
import { randomTarget } from "../lib/levels";
import { ViewToggle } from "./Level2";

/**
 * Level 9 — Bigger Oceans.
 *
 * The player already knows 16 tiles → 3 pings. Here they find the sweet spot
 * for 64 and 256 tiles by hand and discover the pattern themselves: 4× the
 * tiles, only 2× the pings. That is √N scaling, and the table at the bottom
 * sets it against the classical N/2 so the gap is impossible to miss.
 */

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const OCEANS = [
  { tiles: 16, maxPings: 8, color: "#3fc1c9" },
  { tiles: 64, maxPings: 12, color: "#c4b5fd" },
  { tiles: 256, maxPings: 20, color: "#ffd166" },
] as const;

interface Run {
  fish: number;
  traj: Trajectory | null;
  pings: number;
  state: QuantumState | null;
}

function freshRuns(): Record<number, Run> {
  const r: Record<number, Run> = {};
  for (const o of OCEANS) {
    // 16 tiles is known from Level 8 — pre-revealed so the player starts on 64
    r[o.tiles] = { fish: randomTarget(o.tiles), traj: null, pings: o.tiles === 16 ? 8 : 0, state: null };
  }
  return r;
}

const TOTAL_STEPS = 3;

export default function Level9({ noteCollected, onCollectNote, onApiError }: Props) {
  const [runs, setRuns] = useState<Record<number, Run>>(freshRuns);
  const [selected, setSelected] = useState<number>(64);
  const [view, setView] = useState<ChartView>("probability");
  const [busy, setBusy] = useState(false);

  function patch(tiles: number, upd: Partial<Run>) {
    setRuns((r) => ({ ...r, [tiles]: { ...r[tiles], ...upd } }));
  }

  async function loadState(tiles: number, fish: number, k: number) {
    setBusy(true);
    try {
      const s = await fetchState(tiles, fish, pingOps(k));
      patch(tiles, { state: s });
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function loadTrajectories(rs: Record<number, Run>) {
    for (const o of OCEANS) {
      fetchTrajectory(o.tiles, rs[o.tiles].fish, o.maxPings)
        .then((t) => patch(o.tiles, { traj: t }))
        .catch(onApiError);
    }
  }

  useEffect(() => {
    loadTrajectories(runs);
    void loadState(64, runs[64].fish, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ocean = OCEANS.find((o) => o.tiles === selected)!;
  const run = runs[selected];
  const found = (tiles: number) => {
    const r = runs[tiles];
    return r.traj !== null && r.pings > r.traj.bestPings;
  };

  async function ping(n: number) {
    const k = Math.min(run.pings + n, ocean.maxPings);
    if (k === run.pings) return;
    patch(selected, { pings: k });
    await loadState(selected, run.fish, k);
  }

  function select(tiles: number) {
    setSelected(tiles);
    const r = runs[tiles];
    if (!r.state) void loadState(tiles, r.fish, r.pings);
  }

  function reset() {
    const rs = freshRuns();
    setRuns(rs);
    setSelected(64);
    loadTrajectories(rs);
    void loadState(64, rs[64].fish, 0);
  }

  const step = !found(64) ? 0 : !found(256) ? 1 : 2;
  const p = run.traj?.probabilities[run.pings] ?? 0;

  return (
    <LevelFrame
      levelId={9}
      story={
        <>
          16 tiles needed 3 pings. Classical search needed ~8 flips. Fine —
          but a 16-tile ocean is a puddle. The question that decides whether
          quantum search matters at all is: <strong>how does the ping count
          grow as the ocean grows?</strong> Find out by hand.
        </>
      }
      noteReady={step === 2}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          You're on the <strong>64-tile</strong> ocean — four times bigger.
          Classical blind search now averages 32 flips. Make a guess before you
          ping: four times the tiles, so… four times the pings? Twelve?
          <Do>Ping until the curve turns down, and read off the sweet spot.</Do>
          {selected !== 64 && <span className="block mt-1 text-amber-200">(switch to the 64-tile ocean above)</span>}
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          <strong>{runs[64].traj?.bestPings} pings</strong> for 64 tiles — not 12.
          Four times the tiles, only <em>twice</em> the pings. Look at the
          compass: the needle's starting angle θ halved (sin θ = 1/√64 = 1/8),
          so each ping turns it by half as much, so it takes twice as many pings
          to reach the top. Now predict 256 tiles: another 4×, so…?
          <Do>Switch to the <strong>256-tile</strong> ocean and find its sweet spot. (The ⏩ button saves clicks.)</Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS} done>
          <strong>{runs[256].traj?.bestPings} pings</strong> for 256 tiles. 3 → 6 → 12
          while the ocean went 16 → 64 → 256. The pings grow like the{" "}
          <strong>square root</strong> of the tiles: that is <Term t="√N scaling" />, the
          entire reason Grover's algorithm is famous. Blind search grows like N
          itself. Read the table — then imagine a million tiles.
          <Do>Collect your field note.</Do>
        </GuideBox>
      )}

      {/* ocean picker */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold">Ocean:</span>
        {OCEANS.map((o) => (
          <button
            key={o.tiles}
            onClick={() => select(o.tiles)}
            disabled={busy}
            className={`rounded-full px-4 py-1.5 text-sm border transition ${
              selected === o.tiles
                ? "bg-cyan-400 text-[#06283d] border-cyan-400 font-bold"
                : "border-cyan-700/70 text-cyan-200 hover:bg-cyan-900/50"
            } ${step === 1 && o.tiles === 256 && selected !== 256 ? "pulse-glow" : ""}`}
          >
            {found(o.tiles) ? "✓ " : ""}
            {o.tiles} tiles
          </button>
        ))}
        <span className="ml-auto text-xs text-cyan-200/60">
          {Math.log2(selected)} qubits · fish at tile {run.fish}
        </span>
      </div>

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <button
          onClick={() => void ping(1)}
          disabled={busy || run.pings >= ocean.maxPings}
          className={`rounded-lg bg-violet-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40 ${
            !found(selected) && selected !== 16 ? "pulse-glow" : ""
          }`}
        >
          📡 Sonar ping
        </button>
        <button
          onClick={() => void ping(selected === 256 ? 4 : 2)}
          disabled={busy || run.pings >= ocean.maxPings}
          className="rounded-lg bg-violet-300/70 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40"
        >
          ⏩ ping ×{selected === 256 ? 4 : 2}
        </button>
        <span className="text-sm">
          Pings: <span className="text-violet-300 font-bold">{run.pings}</span>{" "}
          <span className="text-cyan-200/60">· catch chance ≈ {(p * 100).toFixed(1)}%</span>
        </span>
        <ViewToggle view={view} setView={setView} />
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        <div className="w-[260px] shrink-0 rounded-xl border border-cyan-800/50 bg-black/20 p-2">
          <div className="text-xs text-cyan-200/60 px-1 mb-1">
            Grover compass · θ = {run.traj ? run.traj.thetaDeg.toFixed(2) : "…"}°
          </div>
          <GroverCompass
            angleDeg={run.traj?.angles[run.pings] ?? null}
            thetaDeg={run.traj?.thetaDeg ?? null}
            history={run.traj ? run.traj.angles.slice(0, run.pings) : []}
            ticks={ocean.maxPings}
          />
        </div>
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-2">
          <div className="text-xs text-cyan-200/60 px-1 mb-1">Ping curves — one per ocean, overlaid</div>
          <PingCurve
            series={OCEANS.flatMap((o) =>
              runs[o.tiles].traj
                ? [
                    {
                      label: `${o.tiles} tiles`,
                      color: o.color,
                      probabilities: runs[o.tiles].traj!.probabilities,
                      revealed: runs[o.tiles].pings,
                    },
                  ]
                : []
            )}
            maxK={20}
            currentK={run.pings}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-800/50 bg-black/20 p-3">
        <AmplitudeChart
          amplitudes={run.state?.amplitudes ?? null}
          view={view}
          highlight={run.fish}
          emptyBars={selected}
        />
        <div className="text-xs text-cyan-200/60 px-2">
          {selected} bars — one per tile. The fish's bar is gold. Each ping re-runs a {Math.log2(selected)}-qubit Qiskit circuit.
        </div>
      </div>

      {/* the scaling table */}
      <div className="mt-4 rounded-xl border border-cyan-800/50 bg-black/20 p-3 overflow-x-auto">
        <div className="text-xs text-cyan-200/60 mb-2">The scoreboard</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-cyan-300/70">
            <tr>
              <th className="text-left py-1">tiles (N)</th>
              <th className="text-right py-1">blind search ≈ N/2</th>
              <th className="text-right py-1">√N</th>
              <th className="text-right py-1">your sweet spot</th>
              <th className="text-right py-1">catch chance there</th>
            </tr>
          </thead>
          <tbody>
            {OCEANS.map((o) => {
              const r = runs[o.tiles];
              const f = found(o.tiles);
              return (
                <tr key={o.tiles} className="border-t border-cyan-900/60">
                  <td className="py-1 font-semibold" style={{ color: o.color }}>
                    {o.tiles}
                  </td>
                  <td className="text-right">{o.tiles / 2} flips</td>
                  <td className="text-right">{Math.sqrt(o.tiles)}</td>
                  <td className="text-right font-bold text-amber-200">{f ? `${r.traj!.bestPings} pings` : "?"}</td>
                  <td className="text-right">{f ? `${(r.traj!.probabilities[r.traj!.bestPings] * 100).toFixed(1)}%` : "?"}</td>
                </tr>
              );
            })}
            <tr className={`border-t border-cyan-700/60 ${step === 2 ? "" : "opacity-30"}`}>
              <td className="py-1 font-semibold text-emerald-300">1,000,000</td>
              <td className="text-right">500,000 flips</td>
              <td className="text-right">1,000</td>
              <td className="text-right font-bold text-emerald-300">{step === 2 ? "≈ 785 pings" : "?"}</td>
              <td className="text-right">{step === 2 ? "≈ 100%" : "?"}</td>
            </tr>
          </tbody>
        </table>
        <div className="text-xs text-cyan-200/50 mt-2">
          Sweet spot ≈ (π/4)·√N pings. The last row is extrapolated — but you now know the rule it follows.
        </div>
      </div>

      <UnderTheHood diagram={run.state?.diagram ?? null} />
    </LevelFrame>
  );
}
