import { useEffect, useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import LevelFrame from "../components/LevelFrame";
import GuideBox, { Do } from "../components/Guide";
import IonQCast from "../components/IonQCast";
import OceanGrid from "../components/OceanGrid";
import UnderTheHood from "../components/UnderTheHood";
import { castNet, fetchState, pingOps, type QuantumState } from "../lib/api";
import { NUM_TILES, randomTarget } from "../lib/levels";
import { ViewToggle } from "./Level2";

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const MAX_CASTS = 3;
const TOTAL_STEPS = 4;

export default function Level5({ noteCollected, onCollectNote, onApiError }: Props) {
  const [fish, setFish] = useState(randomTarget);
  const [pings, setPings] = useState(0);
  const [state, setState] = useState<QuantumState | null>(null);
  const [view, setView] = useState<ChartView>("probability");
  const [casts, setCasts] = useState<number[]>([]);
  const [caught, setCaught] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load(t: number, k: number) {
    setBusy(true);
    try {
      setState(await fetchState(NUM_TILES, t, pingOps(k)));
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load(fish, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ping() {
    const k = pings + 1;
    setPings(k);
    await load(fish, k);
  }

  async function cast() {
    if (caught || casts.length >= MAX_CASTS) return;
    setBusy(true);
    try {
      const landed = await castNet(NUM_TILES, fish, pingOps(pings));
      setCasts((c) => [...c, landed]);
      if (landed === fish) setCaught(true);
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    const t = randomTarget();
    setFish(t);
    setPings(0);
    setCasts([]);
    setCaught(false);
    void load(t, 0);
  }

  const escaped = !caught && casts.length >= MAX_CASTS;
  const pFish = state?.probabilities[fish] ?? 0;
  const pct = (pFish * 100).toFixed(1);

  const step = caught || escaped ? 3 : pings === 0 ? 0 : pings === 1 ? 1 : 2;

  return (
    <LevelFrame
      levelId={5}
      story={
        <>
          Everything assembles. A fish is hiding somewhere in the grid — this
          time you can't see where. You own two spells, and together they make
          a weapon.
        </>
      }
      noteReady={caught}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          One <strong>sonar ping = Mark + Mirror</strong>, back to back — the
          invisible-ink spell from Level 3 fused with the reflection spell
          from Level 4. Each ping pumps probability toward the fish. You get{" "}
          <strong>{MAX_CASTS} net casts</strong>, so don't cast blind.
          <Do>
            Press the glowing <strong>Sonar ping</strong> and watch both the
            heatmap and the bar chart.
          </Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          One tile is already glowing hotter — your catch chance is{" "}
          <strong>{pct}%</strong> after a single ping. Would you bet one of
          your {MAX_CASTS} nets on that?
          <Do>Ping again and watch the hot tile pull away from the pack.</Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS}>
          Catch chance: <strong>{pct}%</strong> after {pings} pings. You're
          the captain now — ping again to sharpen further, or cast when you
          like the odds. (Classical search from Level 1 averaged 8 flips.
          Count what this costs you.)
        </GuideBox>
      )}
      {step === 3 && caught && (
        <GuideBox step={3} total={TOTAL_STEPS} done>
          🐟 Caught — in <strong>{pings} pings + {casts.length} cast
          {casts.length > 1 ? "s" : ""}</strong>, against a classical average
          of 8 flips. And here's the part worth saying out loud: nobody showed
          you Grover's algorithm. You built it — spread, then mark + mirror
          repeated, then measure. That IS the algorithm, and it beats blind
          search by √N: 16 shells → ~3 pings; a million shells → ~1000 pings
          instead of 500,000.
          <Do>Collect the final field note — then open your journal and read it top to bottom.</Do>
        </GuideBox>
      )}
      {step === 3 && escaped && (
        <GuideBox step={3} total={TOTAL_STEPS}>
          The fish escaped — all {MAX_CASTS} nets used. The lesson hiding in
          the failure: casting early, at low probability, wastes nets. Ping
          until the chance is high, <em>then</em> cast.
          <Do>Hit "reset level" (top right) and go again.</Do>
        </GuideBox>
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <button
          onClick={ping}
          disabled={busy || caught || escaped}
          className={`rounded-lg bg-violet-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40 ${
            step === 0 || step === 1 ? "pulse-glow" : ""
          }`}
        >
          📡 Sonar ping (mark + mirror)
        </button>
        <button
          onClick={cast}
          disabled={busy || caught || escaped || pings === 0}
          className="rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40"
        >
          🕸️ Cast the net ({MAX_CASTS - casts.length} left)
        </button>
        <ViewToggle view={view} setView={setView} />
      </div>

      {/* real hardware: the same circuit, measured on IonQ (only when a backend is available) */}
      <IonQCast
        numTiles={NUM_TILES}
        target={fish}
        ops={pingOps(pings)}
        shots={20}
        disabled={pings === 0 || busy}
        revealTarget={caught || escaped}
      />

      <div className="flex flex-wrap gap-4 items-start mt-3">
        <div className="flex-1 min-w-[260px]">
          <div className="text-xs text-cyan-200/60 mb-1">
            Ocean heatmap (probability per tile) — training wheels: on real
            hardware you'd never get this god's-eye view.
          </div>
          <OceanGrid
            tiles={NUM_TILES}
            heat={state?.probabilities ?? null}
            target={fish}
            lastCast={casts.length ? casts[casts.length - 1] : null}
            labels="wave"
          />
          <div className="mt-2 text-sm space-y-1">
            <div>
              Pings: <span className="text-violet-300 font-bold">{pings}</span>{" "}
              <span className="text-cyan-200/60">· catch chance ≈ {pct}%</span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-3">
          <AmplitudeChart
            amplitudes={state?.amplitudes ?? null}
            view={view}
            highlight={caught || escaped ? fish : null}
          />
          <div className="text-xs text-cyan-200/60 px-2">
            Watch one bar grow with each ping — amplitude amplification, live.
          </div>
        </div>
      </div>

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}
