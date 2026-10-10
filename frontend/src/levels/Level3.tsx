import { useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import LevelFrame from "../components/LevelFrame";
import GuideBox, { Do, Term } from "../components/Guide";
import UnderTheHood from "../components/UnderTheHood";
import { castNet, fetchState, type QuantumState } from "../lib/api";
import { NUM_TILES, randomTarget } from "../lib/levels";
import { ViewToggle } from "./Level2";

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const TOTAL_STEPS = 5;

export default function Level3({ noteCollected, onCollectNote, onApiError }: Props) {
  const [target, setTarget] = useState(randomTarget);
  const [state, setState] = useState<QuantumState | null>(null);
  const [marked, setMarked] = useState(false);
  const [view, setView] = useState<ChartView>("amplitude");
  const [casts, setCasts] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  function switchView(v: ChartView) {
    setView(v);
    if (v === "probability" && step === 2) setStep(3);
  }

  async function run(ops: ("spread" | "mark")[]) {
    setBusy(true);
    try {
      setState(await fetchState(NUM_TILES, target, ops));
      if (ops.includes("mark")) {
        setMarked(true);
        setStep((s) => Math.max(s, 2));
      } else {
        setStep((s) => Math.max(s, 1));
      }
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  async function cast() {
    setBusy(true);
    try {
      const landed = await castNet(NUM_TILES, target, marked ? ["spread", "mark"] : ["spread"]);
      setCasts((c) => [...c, landed]);
      setStep((s) => Math.max(s, 4));
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <LevelFrame
      levelId={3}
      story={
        <>
          This level you get X-ray vision: the pearl is under{" "}
          <strong className="text-amber-200">shell {target}</strong>, and you
          get a brand-new spell. Prepare to be annoyed by it.
        </>
      }
      noteReady={step >= 4}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={() => {
        setTarget(randomTarget());
        setState(null);
        setMarked(false);
        setCasts([]);
        setStep(0);
      }}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          Start the same way as last level.
          <Do>
            Press <strong>Spread the net</strong> to put all 16 shells into{" "}
            <Term t="superposition" />.
          </Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          16 equal bars, like before. Now the new spell:{" "}
          <strong>Mark</strong>, known in the textbooks as the{" "}
          <Term t="oracle" />. It's a circuit that recognizes the pearl's shell
          and flips the <strong>sign</strong> of its <Term t="amplitude" /> —
          positive becomes negative. Remember: amplitudes are allowed to be
          negative.
          <Do>
            Press <strong>Mark the pearl</strong> and keep your eyes on shell{" "}
            {target}'s bar.
          </Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS}>
          There it is — shell {target}'s bar swung <em>downward</em>. Its
          amplitude is now −0.25 while everyone else sits at +0.25. The answer
          is marked! We must be done, right?
          <Do>
            Flip the glowing toggle to <strong>probability</strong> view and
            see what a <Term t="measurement" /> would actually see.
          </Do>
        </GuideBox>
      )}
      {step === 3 && (
        <GuideBox step={3} total={TOTAL_STEPS}>
          <strong>Nothing changed.</strong> Probability is amplitude squared,
          and squaring erases minus signs: (−0.25)² is exactly the same as
          (0.25)². The mark is written in invisible ink — a measurement cannot
          see it at all.
          <Do>
            Don't believe me? Press <strong>Cast the net</strong> and try to
            catch the pearl you can literally see.
          </Do>
        </GuideBox>
      )}
      {step >= 4 && (
        <GuideBox step={4} total={TOTAL_STEPS} done>
          Still a 1-in-16 lottery — marking the answer told the measurement{" "}
          <em>nothing</em>. This is the level that kills the biggest quantum
          myth: a quantum computer does NOT "just check everything at once."
          It can mark the right answer secretly, but it needs one more trick
          to drag that mark into the open. That trick is Level 4.
          <Do>Cast again if you like, then collect your field note.</Do>
        </GuideBox>
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <button
          onClick={() => run(["spread"])}
          disabled={busy || state !== null}
          className={`rounded-lg bg-cyan-400 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-cyan-300 disabled:opacity-40 ${
            step === 0 ? "pulse-glow" : ""
          }`}
        >
          🌊 Spread the net
        </button>
        <button
          onClick={() => run(["spread", "mark"])}
          disabled={busy || state === null || marked}
          className={`rounded-lg bg-rose-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-rose-200 disabled:opacity-40 ${
            step === 1 ? "pulse-glow" : ""
          }`}
        >
          ✒️ Mark the pearl (oracle)
        </button>
        <button
          onClick={cast}
          disabled={busy || !marked || step < 3}
          className={`rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 ${
            step === 3 ? "pulse-glow" : ""
          }`}
        >
          🕸️ Cast the net
        </button>
        <ViewToggle view={view} setView={switchView} pulse={step === 2} />
      </div>

      <div className="rounded-xl border border-cyan-800/50 bg-black/20 p-3">
        <AmplitudeChart
          amplitudes={state?.amplitudes ?? null}
          view={view}
          highlight={target}
        />
        <div className="text-xs text-cyan-200/60 px-2">
          {state === null && "Spread the net to begin."}
          {state !== null && !marked && `Shell ${target} (gold) is where the pearl hides.`}
          {marked && view === "amplitude" && (
            <>Shell {target}'s bar swung <span className="text-rose-300">negative</span>. The mark is written…</>
          )}
          {marked && view === "probability" && (
            <>…but squaring erases the sign: <strong>nothing changed</strong>. The ink is invisible.</>
          )}
        </div>
      </div>

      {casts.length > 0 && (
        <div className="mt-3 text-sm">
          Casts:{" "}
          {casts.map((c, i) => (
            <span
              key={i}
              className={`inline-block rounded px-2 py-0.5 mr-1 ${
                c === target ? "bg-emerald-700/60" : "bg-cyan-800/50"
              }`}
            >
              shell {c} {c === target ? "🦪 (lucky 1-in-16!)" : ""}
            </span>
          ))}
        </div>
      )}

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}
