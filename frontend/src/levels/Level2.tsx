import { useState } from "react";
import AmplitudeChart, { type ChartView } from "../components/AmplitudeChart";
import LevelFrame from "../components/LevelFrame";
import GuideBox, { Do, Term } from "../components/Guide";
import UnderTheHood from "../components/UnderTheHood";
import { castNet, fetchState, type QuantumState } from "../lib/api";
import { NUM_TILES, randomTarget } from "../lib/levels";

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

const TOTAL_STEPS = 6;

export default function Level2({ noteCollected, onCollectNote, onApiError }: Props) {
  const [target] = useState(randomTarget); // irrelevant this level, but the circuit needs one
  const [state, setState] = useState<QuantumState | null>(null);
  const [view, setView] = useState<ChartView>("amplitude");
  const [casts, setCasts] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  async function spread() {
    setBusy(true);
    try {
      setState(await fetchState(NUM_TILES, target, ["spread"]));
      setStep((s) => Math.max(s, 1));
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  async function cast() {
    if (!state) return;
    setBusy(true);
    try {
      const landed = await castNet(NUM_TILES, target, ["spread"]);
      setCasts((c) => {
        const next = [...c, landed];
        setStep((s) => (next.length >= 2 ? Math.max(s, 5) : Math.max(s, 4)));
        return next;
      });
    } catch (e) {
      onApiError(e);
    } finally {
      setBusy(false);
    }
  }

  function switchView(v: ChartView) {
    setView(v);
    if (v === "probability") setStep((s) => (s === 2 ? 3 : s));
  }

  return (
    <LevelFrame
      levelId={2}
      story={
        <>
          Welcome to the quantum ocean. Meet the instrument you'll use for the
          whole rest of the game: the bar chart below, one bar per shell.
        </>
      }
      noteReady={step >= 5}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={() => {
        setState(null);
        setCasts([]);
        setStep(0);
      }}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          Each of the 16 bars below is one shell. A bar's height is that
          shell's <Term t="amplitude" /> — a number the quantum computer keeps
          for every shell at once. Right now the ocean is empty: no state has
          been prepared, so there's nothing to see.
          <Do>
            Press the glowing <strong>Spread the net</strong> button — it puts
            a <Term t="Hadamard gate" /> on each of the 4{" "}
            <Term t="qubit">qubits</Term>.
          </Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS} onNext={() => setStep(2)}>
          Every bar rose to the exact same height: 0.25. All 16 shells are now
          in <Term t="superposition" /> — the ocean holds every possibility at
          once, and no shell is special. Now the one equation this entire game
          runs on: <strong>probability = amplitude²</strong>. A shell with
          amplitude 0.25 has a 0.25² = 1/16 chance of being the one you find
          when you look.
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS}>
          Don't take my word for it — the chart has two lenses.
          <Do>
            Flip the glowing view toggle to <strong>probability</strong> to see
            every amplitude squared.
          </Do>
        </GuideBox>
      )}
      {step === 3 && (
        <GuideBox step={3} total={TOTAL_STEPS}>
          Same ocean, squared lens: all 16 bars at 1/16 ≈ 0.06. One more thing
          to know: amplitudes, unlike probabilities, can go{" "}
          <strong>negative</strong> — file that away, it becomes the whole plot
          in Level 3. Now let's actually try to catch the pearl.
          <Do>
            Press <strong>Cast the net</strong> — that's a{" "}
            <Term t="measurement" />: it forces the ocean to pick ONE shell.
          </Do>
        </GuideBox>
      )}
      {step === 4 && (
        <GuideBox step={4} total={TOTAL_STEPS}>
          The net landed on shell <strong>{casts[casts.length - 1]}</strong> —
          picked completely at random, 1-in-16, like rolling a 16-sided die.
          <Do>Cast once more. See if anything about it feels less random.</Do>
        </GuideBox>
      )}
      {step >= 5 && (
        <GuideBox step={5} total={TOTAL_STEPS} done>
          Random again. That's the honest, deflating truth of this level:{" "}
          <Term t="superposition" /> alone is just fancy randomness — holding
          all 16 possibilities at once bought you <em>nothing</em> over
          guessing. To beat the 8-flip average from Level 1, you'll need to
          bend the amplitudes themselves. That starts next level.
          <Do>Collect your field note below.</Do>
        </GuideBox>
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <button
          onClick={spread}
          disabled={busy || state !== null}
          className={`rounded-lg bg-cyan-400 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-cyan-300 disabled:opacity-40 ${
            step === 0 ? "pulse-glow" : ""
          }`}
        >
          🌊 Spread the net (H⊗H⊗H⊗H)
        </button>
        <button
          onClick={cast}
          disabled={busy || state === null || step < 3}
          className={`rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200 disabled:opacity-40 ${
            step === 3 || step === 4 ? "pulse-glow" : ""
          }`}
        >
          🕸️ Cast the net (measure)
        </button>
        <ViewToggle view={view} setView={switchView} pulse={step === 2} />
      </div>

      <div className="rounded-xl border border-cyan-800/50 bg-black/20 p-3">
        <AmplitudeChart
          amplitudes={state?.amplitudes ?? null}
          view={view}
          highlight={casts.length ? casts[casts.length - 1] : null}
        />
        <div className="text-xs text-cyan-200/60 px-2">
          {state === null
            ? "Nothing here yet — spread the net to prepare the quantum state."
            : view === "amplitude"
              ? "Amplitude view — each bar is 1/√16 = 0.25 after the spread."
              : "Probability view — amplitude² = 1/16 ≈ 0.0625 per shell."}
        </div>
      </div>

      {casts.length > 0 && (
        <div className="mt-3 text-sm">
          Net landed on:{" "}
          {casts.map((c, i) => (
            <span key={i} className="inline-block bg-cyan-800/50 rounded px-2 py-0.5 mr-1">
              shell {c}
            </span>
          ))}
        </div>
      )}

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}

export function ViewToggle({
  view,
  setView,
  pulse = false,
}: {
  view: ChartView;
  setView: (v: ChartView) => void;
  pulse?: boolean;
}) {
  return (
    <div
      className={`ml-auto flex rounded-lg overflow-hidden border border-cyan-700/60 text-xs ${
        pulse ? "pulse-glow" : ""
      }`}
    >
      {(["amplitude", "probability"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-3 py-1.5 font-semibold ${
            view === v ? "bg-cyan-400 text-[#06283d]" : "text-cyan-200 hover:bg-cyan-900/60"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
