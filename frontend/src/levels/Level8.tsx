import { useEffect, useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import GroverCompass from "../components/GroverCompass";
import GuideBox, { Do, Term } from "../components/Guide";
import LevelFrame from "../components/LevelFrame";
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
import { NUM_TILES, randomTarget } from "../lib/levels";
import { ViewToggle } from "./Level2";

/**
 * Level 8 — Don't Overwind.
 *
 * Levels 5-6 let the player believe "more pings = better". This level breaks
 * that: the fish is visible, the player pings past the sweet spot and watches
 * the catch chance collapse. Two new instruments make the mechanism visible:
 * the Grover compass (each ping = a fixed rotation by 2θ) and the ping curve
 * (P vs pings). Then a challenge: fresh hidden fish, pick your pings, ONE net.
 */

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const MAX_PINGS = 8;
const TOTAL_STEPS = 6;

type Phase = "explore" | "challenge" | "cast";

export default function Level8({ noteCollected, onCollectNote, onApiError }: Props) {
  const [fish, setFish] = useState(randomTarget);
  const [traj, setTraj] = useState<Trajectory | null>(null);
  const [pings, setPings] = useState(0);
  const [state, setState] = useState<QuantumState | null>(null);
  const [view, setView] = useState<ChartView>("amplitude");
  const [busy, setBusy] = useState(false);

  const [phase, setPhase] = useState<Phase>("explore");
  const [choice, setChoice] = useState(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);

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
    fetchTrajectory(NUM_TILES, fish, MAX_PINGS).then(setTraj).catch(onApiError);
    void load(fish, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ping() {
    if (pings >= MAX_PINGS) return;
    const k = pings + 1;
    setPings(k);
    await load(fish, k);
  }

  function startChallenge() {
    const t = randomTarget();
    setFish(t);
    setPhase("challenge");
    setLanded(null);
    setChoice(0);
    setState(null);
    setPings(0);
  }

  async function pingAndCast() {
    setBusy(true);
    try {
      const hit = await castNet(NUM_TILES, fish, pingOps(choice));
      setLanded(hit);
      setPings(choice);
      setAttempts((a) => a + 1);
      setState(await fetchState(NUM_TILES, fish, pingOps(choice)));
      setPhase("cast");
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    const t = randomTarget();
    setFish(t);
    setTraj(null);
    setPings(0);
    setState(null);
    setPhase("explore");
    setChoice(0);
    setLanded(null);
    setAttempts(0);
    fetchTrajectory(NUM_TILES, t, MAX_PINGS).then(setTraj).catch(onApiError);
    void load(t, 0);
  }

  const best = traj?.bestPings ?? 3;
  const p = traj?.probabilities[pings] ?? 0;
  const pct = (p * 100).toFixed(1);
  const caught = phase === "cast" && landed === fish;
  const perfect = caught && choice === best;

  const step =
    phase === "explore"
      ? pings === 0
        ? 0
        : pings < 3
          ? 1
          : pings === 3
            ? 2
            : pings < 6
              ? 3
              : 4
      : 5;

  const curveRevealed = phase === "explore" ? pings : Infinity;
  const compassAngle = phase === "challenge" ? null : (traj?.angles[pings] ?? null);
  const compassHistory = traj ? traj.angles.slice(0, phase === "explore" ? pings : 0) : [];

  return (
    <LevelFrame
      levelId={8}
      story={
        <>
          You've been told "about 3 pings". Nobody's told you what happens on
          the 4th. This level, the fish is in plain sight — under{" "}
          <strong className="text-amber-200">tile {phase === "explore" ? fish : "?"}</strong>{" "}
          — and you have a new instrument: the <strong>Grover compass</strong>.
        </>
      }
      noteReady={perfect}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          The compass needle shows the whole ocean's state as one direction.
          Straight <strong>right</strong> = "everything but the fish". Straight{" "}
          <strong>up</strong> = "the fish, for certain". After the spread the
          needle sits just a little above the horizon — at angle θ, where sin θ
          = 1/√16 = 0.25. The catch chance is <strong>sin²</strong> of the
          needle's angle.
          <Do>Ping once and watch the needle turn.</Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          The needle turned by exactly <strong>2θ ≈ {traj ? (2 * traj.thetaDeg).toFixed(0) : 29}°</strong>.
          That is what one ping <em>is</em>: mark + mirror = two reflections = one
          fixed rotation toward the fish. Catch chance now {pct}%.
          <Do>Keep pinging. Watch the curve on the right fill in.</Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS}>
          <strong>{pct}%</strong> after 3 pings — the needle is almost straight
          up. Every tutorial stops here and says "about √N pings". We won't.
          <Do>Ping a 4th time. I dare you.</Do>
        </GuideBox>
      )}
      {step === 3 && (
        <GuideBox step={3} total={TOTAL_STEPS}>
          📉 It <strong>dropped</strong> to {pct}%. The needle sailed right past
          vertical and is now heading back toward the horizon on the far side.
          Look at the bar chart in amplitude view: the fish's bar has swung{" "}
          <em>negative</em> and is shrinking — the mirror keeps reflecting, it
          doesn't know you're done. This is <Term t="overwinding" />.
          <Do>Ping twice more and see how bad it gets.</Do>
        </GuideBox>
      )}
      {step === 4 && (
        <GuideBox step={4} total={TOTAL_STEPS} onNext={startChallenge} nextLabel="Take the challenge →">
          <strong>{pct}%</strong> — after 6 pings you are <em>worse off than
          blind guessing</em> (6.25%). The algorithm is a dial, not a ratchet.
          The sweet spot is where the needle points straight up: about
          (π/4)·√N pings, which for 16 tiles is {best}.
          {pings < MAX_PINGS && <> Ping on if you like — it comes back around, like a clock.</>}
          <span className="block mt-2">
            Ready? A <strong>fresh ocean, hidden fish, ONE net</strong>. You choose the pings.
          </span>
        </GuideBox>
      )}
      {step === 5 && phase === "challenge" && (
        <GuideBox step={5} total={TOTAL_STEPS}>
          New fish, hidden. Pick how many pings to run before the single cast
          — the curve is still on screen if you need it.
          <Do>Set the dial, then press <strong>Ping ×{choice} and cast</strong>.</Do>
        </GuideBox>
      )}
      {step === 5 && phase === "cast" && perfect && (
        <GuideBox step={5} total={TOTAL_STEPS} done>
          🎯 Caught at tile {fish} with the dial on <strong>{choice}</strong> —
          the sweet spot. You now know something most "quantum computers try
          everything at once" explainers get wrong: the algorithm must be{" "}
          <em>stopped at the right moment</em>, and the right moment is a
          formula, not a feeling.
          <Do>Collect your field note.</Do>
        </GuideBox>
      )}
      {step === 5 && phase === "cast" && caught && !perfect && (
        <GuideBox step={5} total={TOTAL_STEPS} onNext={startChallenge} nextLabel="Again, on the sweet spot →">
          🐟 Caught — but with the dial on {choice}, where the chance was only{" "}
          {pct}%. That was partly luck. The compass says the sweet spot is{" "}
          <strong>{best}</strong>; let's see you catch one on purpose.
        </GuideBox>
      )}
      {step === 5 && phase === "cast" && !caught && (
        <GuideBox step={5} total={TOTAL_STEPS} onNext={startChallenge} nextLabel="Try again →">
          The net came up at tile {landed}; the fish was at tile {fish}. With
          the dial on {choice} the chance was {pct}%
          {choice === best ? " — the right call, and the dice still said no. That's the 4%." : " — read the curve and turn the dial."}
          {attempts >= 2 && choice !== best && (
            <span className="block mt-1 text-amber-200">Hint: where is the ⭐ on the curve?</span>
          )}
        </GuideBox>
      )}

      {/* controls */}
      <div className="flex gap-3 mb-3 flex-wrap items-center">
        {phase === "explore" && (
          <button
            onClick={ping}
            disabled={busy || pings >= MAX_PINGS}
            className={`rounded-lg bg-violet-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40 ${
              step < 4 ? "pulse-glow" : ""
            }`}
          >
            📡 Sonar ping ({pings}/{MAX_PINGS})
          </button>
        )}
        {phase !== "explore" && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-700/60 px-3 py-1.5">
            <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold">pings dial</span>
            <button
              onClick={() => setChoice((c) => Math.max(0, c - 1))}
              disabled={phase !== "challenge" || busy}
              className="w-7 h-7 rounded bg-cyan-900/60 text-cyan-100 font-bold disabled:opacity-40"
            >
              −
            </button>
            <span className="w-6 text-center font-black text-amber-200 text-lg">{choice}</span>
            <button
              onClick={() => setChoice((c) => Math.min(MAX_PINGS, c + 1))}
              disabled={phase !== "challenge" || busy}
              className="w-7 h-7 rounded bg-cyan-900/60 text-cyan-100 font-bold disabled:opacity-40"
            >
              +
            </button>
          </div>
        )}
        {phase === "challenge" && (
          <button
            onClick={pingAndCast}
            disabled={busy}
            className="rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 pulse-glow"
          >
            🕸️ Ping ×{choice} and cast
          </button>
        )}
        <ViewToggle view={view} setView={setView} />
      </div>

      {/* instruments */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="w-[260px] shrink-0 rounded-xl border border-cyan-800/50 bg-black/20 p-2">
          <div className="text-xs text-cyan-200/60 px-1 mb-1">Grover compass</div>
          <GroverCompass
            angleDeg={compassAngle}
            thetaDeg={traj?.thetaDeg ?? null}
            history={compassHistory}
            ticks={MAX_PINGS}
          />
        </div>
        <div className="flex-1 min-w-[300px] rounded-xl border border-cyan-800/50 bg-black/20 p-2">
          <div className="text-xs text-cyan-200/60 px-1 mb-1">
            The ping curve — catch chance vs. number of pings
            {phase === "explore" && pings < MAX_PINGS && " (fills in as you ping)"}
          </div>
          {traj ? (
            <PingCurve
              series={[{ label: "16 tiles, 1 fish", color: "#3fc1c9", probabilities: traj.probabilities, revealed: curveRevealed }]}
              maxK={MAX_PINGS}
              currentK={phase === "challenge" ? choice : pings}
              markPeaks={phase !== "explore" || pings > best}
            />
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-cyan-200/50">computing the curve in Qiskit…</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-800/50 bg-black/20 p-3">
        <AmplitudeChart
          amplitudes={state?.amplitudes ?? null}
          view={view}
          highlight={phase === "challenge" ? null : fish}
        />
        <div className="text-xs text-cyan-200/60 px-2">
          {phase === "explore" && pings > 3 && view === "amplitude"
            ? "Overwound: the mirror keeps reflecting past the top — the fish's bar swings negative and shrinks while the others grow back."
            : phase === "challenge"
              ? "Hidden fish. The chart shows nothing until you cast."
              : "The fish's bar (gold) after each ping. Toggle to probability to see the catch chance directly."}
        </div>
      </div>

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}
