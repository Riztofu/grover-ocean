import { useEffect, useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import GroverCompass from "../components/GroverCompass";
import GuideBox, { Do, Term } from "../components/Guide";
import LevelFrame from "../components/LevelFrame";
import OceanGrid from "../components/OceanGrid";
import PingCurve from "../components/PingCurve";
import UnderTheHood from "../components/UnderTheHood";
import {
  castNet,
  fetchState,
  fetchTrajectory,
  pingOps,
  type QuantumState,
  type Trajectory,
} from "../lib/api";
import { NUM_TILES, randomTargets } from "../lib/levels";
import { ViewToggle } from "./Level2";

/**
 * Level 10 — Two Fish.
 *
 * Intuition says more correct answers = a harder search. Grover says the
 * opposite: with M fish the oracle marks all of them, the compass starts
 * higher (sin θ = √(M/N)), each ping turns further, and the sweet spot comes
 * sooner. Two fish in 16 tiles peak at 2 pings; a school of four peaks at
 * exactly ONE ping — with a certain catch.
 */

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

type Stage = "two" | "four";
const MAX_PINGS: Record<Stage, number> = { two: 5, four: 3 };
const TOTAL_STEPS = 6;

export default function Level10({ noteCollected, onCollectNote, onApiError }: Props) {
  const [stage, setStage] = useState<Stage>("two");
  const [school, setSchool] = useState<number[]>(() => randomTargets(2));
  const [traj, setTraj] = useState<Trajectory | null>(null);
  const [trajOne, setTrajOne] = useState<Trajectory | null>(null);
  const [trajTwo, setTrajTwo] = useState<Trajectory | null>(null);
  const [pings, setPings] = useState(0);
  const [state, setState] = useState<QuantumState | null>(null);
  const [view, setView] = useState<ChartView>("probability");
  const [landed, setLanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(targets: number[], k: number) {
    setBusy(true);
    try {
      setState(await fetchState(NUM_TILES, targets, pingOps(k)));
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function begin(st: Stage, targets: number[]) {
    setStage(st);
    setSchool(targets);
    setTraj(null);
    setPings(0);
    setLanded(null);
    fetchTrajectory(NUM_TILES, targets, MAX_PINGS[st]).then(setTraj).catch(onApiError);
    if (st === "two") {
      // the single-fish curve, for comparison
      fetchTrajectory(NUM_TILES, targets[0], 5).then(setTrajOne).catch(onApiError);
    }
    void load(targets, 0);
  }

  useEffect(() => {
    begin("two", school);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ping() {
    if (pings >= MAX_PINGS[stage]) return;
    const k = pings + 1;
    setPings(k);
    await load(school, k);
  }

  async function respread() {
    setPings(0);
    setLanded(null);
    await load(school, 0);
  }

  async function cast() {
    setBusy(true);
    try {
      setLanded(await castNet(NUM_TILES, school, pingOps(pings)));
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function toFour() {
    if (traj) setTrajTwo(traj);
    begin("four", randomTargets(4));
  }

  function reset() {
    setTrajOne(null);
    setTrajTwo(null);
    begin("two", randomTargets(2));
  }

  const best = traj?.bestPings ?? (stage === "two" ? 2 : 1);
  const found = traj !== null && pings > best;
  const p = traj?.probabilities[pings] ?? 0;
  const pct = (p * 100).toFixed(1);
  const caught = landed !== null && school.includes(landed);

  const step =
    stage === "two"
      ? pings === 0
        ? 0
        : !found
          ? 1
          : 2
      : pings === 0
        ? 3
        : landed === null
          ? 4
          : 5;

  const series = [
    ...(trajOne
      ? [{ label: "1 fish", color: "#7fb8d4", probabilities: trajOne.probabilities, revealed: Infinity }]
      : []),
    ...(stage === "two" && traj
      ? [{ label: "2 fish", color: "#3fc1c9", probabilities: traj.probabilities, revealed: pings }]
      : []),
    ...(stage === "four" && trajTwo
      ? [{ label: "2 fish", color: "#3fc1c9", probabilities: trajTwo.probabilities, revealed: Infinity }]
      : []),
    ...(stage === "four" && traj
      ? [{ label: "4 fish", color: "#ffd166", probabilities: traj.probabilities, revealed: pings }]
      : []),
  ];

  return (
    <LevelFrame
      levelId={10}
      story={
        <>
          A real search usually has <em>more than one</em> right answer. This
          ocean has <strong className="text-amber-200">{school.length} fish</strong> —
          at tiles {school.join(", ")} — and you can see all of them. The{" "}
          <Term t="oracle" /> now marks every fish. Any one of them counts as a catch.
        </>
      }
      noteReady={stage === "four" && caught}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          Two fish instead of one. Before you touch anything, commit to a
          guess: will the sweet spot need <strong>more</strong> pings than the
          3 you know, or <strong>fewer</strong>? (Most people say more — two
          targets to pump up, twice the work.) The grey curve is the 1-fish
          answer for reference.
          <Do>Ping, and watch where the needle starts.</Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          Catch chance <strong>{pct}%</strong> after {pings} ping{pings > 1 ? "s" : ""} —
          already ahead of the 1-fish curve. Notice the compass: the needle{" "}
          <em>started</em> higher (sin θ = √(2/16)), and every ping turns it
          by that bigger 2θ.
          <Do>Keep pinging until the curve turns down.</Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS} onNext={toFour} nextLabel="Release a school of four →">
          The sweet spot is <strong>{best} pings</strong> — <em>fewer</em>, not
          more. More right answers = a bigger slice of the ocean is "fish" = a
          bigger starting angle = fewer turns to the top. The rule: about
          (π/4)·√(N/M) pings for M fish. For 16 tiles and 2 fish that's ≈ 2.2.
          <span className="block mt-2">
            So what about <strong>four</strong> fish? √(16/4) = 2, times π/4 ≈ 1.6. Hmm.
          </span>
        </GuideBox>
      )}
      {step === 3 && (
        <GuideBox step={3} total={TOTAL_STEPS}>
          Four fish in 16 tiles — a quarter of the ocean. sin θ = √(4/16) = 1/2,
          so θ = 30° exactly, and one ping turns the needle by 60°: from 30° to… 90°.
          <Do>Ping once. Just once.</Do>
        </GuideBox>
      )}
      {step === 4 && pings === 1 && (
        <GuideBox step={4} total={TOTAL_STEPS}>
          <strong>{pct}%</strong>. Not "very likely" — <em>certain</em>. Every
          non-fish bar is exactly zero; the needle points straight up. One ping,
          and a measurement cannot miss.
          <Do>Cast the net.</Do>
        </GuideBox>
      )}
      {step === 4 && pings > 1 && (
        <GuideBox step={4} total={TOTAL_STEPS}>
          📉 {pct}% — you overwound past the certain catch at 1 ping (the
          needle swept 60° past vertical). Level 8's lesson, sharper than ever.
          <Do>Re-spread and ping exactly once.</Do>
        </GuideBox>
      )}
      {step === 5 && caught && (
        <GuideBox step={5} total={TOTAL_STEPS} done>
          🐟 Tile {landed} — a fish, as it had to be. You found the other half
          of the scaling law: pings grow with √N but shrink with √M. A search
          with many acceptable answers is a quantum computer's favourite kind.
          (And if you don't know M in advance? There's a trick — you run with
          random ping counts and it still works — but that's a story for the
          journal's margins.)
          <Do>Collect your field note.</Do>
        </GuideBox>
      )}
      {step === 5 && !caught && (
        <GuideBox step={5} total={TOTAL_STEPS}>
          Tile {landed} — not a fish. That was only possible because the dial was
          on {pings}, not 1. Re-spread, ping once, cast again.
        </GuideBox>
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <button
          onClick={ping}
          disabled={busy || pings >= MAX_PINGS[stage] || landed !== null}
          className={`rounded-lg bg-violet-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40 ${
            step === 0 || step === 1 || step === 3 ? "pulse-glow" : ""
          }`}
        >
          📡 Sonar ping ({pings}/{MAX_PINGS[stage]})
        </button>
        {stage === "four" && (
          <button
            onClick={cast}
            disabled={busy || pings === 0 || landed !== null}
            className={`rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 ${
              step === 4 && pings === 1 ? "pulse-glow" : ""
            }`}
          >
            🕸️ Cast the net
          </button>
        )}
        {pings > 0 && (
          <button
            onClick={() => void respread()}
            disabled={busy}
            className="text-xs underline text-cyan-300 hover:text-white disabled:opacity-40"
          >
            ↺ re-spread (same fish)
          </button>
        )}
        <ViewToggle view={view} setView={setView} />
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        <div className="w-[260px] shrink-0 rounded-xl border border-cyan-800/50 bg-black/20 p-2">
          <div className="text-xs text-cyan-200/60 px-1 mb-1">
            Grover compass · {school.length} fish · θ = {traj ? traj.thetaDeg.toFixed(1) : "…"}°
          </div>
          <GroverCompass
            angleDeg={traj?.angles[pings] ?? null}
            thetaDeg={traj?.thetaDeg ?? null}
            history={traj ? traj.angles.slice(0, pings) : []}
            ticks={MAX_PINGS[stage]}
          />
        </div>
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-2">
          <div className="text-xs text-cyan-200/60 px-1 mb-1">Ping curves — more fish, earlier peak</div>
          <PingCurve series={series} maxK={5} currentK={pings} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-start mt-4">
        <div className="flex-1 min-w-[240px]">
          <div className="text-xs text-cyan-200/60 mb-1">Ocean heatmap — every fish is marked by the oracle</div>
          <OceanGrid
            tiles={NUM_TILES}
            heat={state?.probabilities ?? null}
            targets={school}
            revealTarget
            lastCast={landed}
            labels="wave"
          />
        </div>
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-3">
          <AmplitudeChart amplitudes={state?.amplitudes ?? null} view={view} highlights={school} />
          <div className="text-xs text-cyan-200/60 px-2">
            Gold bars are fish. Flip to amplitude view after a mark to see every fish's bar go negative at once.
          </div>
        </div>
      </div>

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}
