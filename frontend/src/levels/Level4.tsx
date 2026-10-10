import { useEffect, useState } from "react";
import AmplitudeChart from "../components/AmplitudeChart";
import LevelFrame from "../components/LevelFrame";
import GuideBox, { Do, Term } from "../components/Guide";
import UnderTheHood from "../components/UnderTheHood";
import { fetchState, type QuantumState } from "../lib/api";
import { NUM_TILES, randomTarget } from "../lib/levels";

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
  onApiError: (e: unknown) => void;
}

type Phase = "loading" | "predict" | "revealed";

const TOTAL_STEPS = 3;

export default function Level4({ noteCollected, onCollectNote, onApiError }: Props) {
  const [target, setTarget] = useState(randomTarget);
  const [state, setState] = useState<QuantumState | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [ghostOrdinary, setGhostOrdinary] = useState(0.25);
  const [ghostMarked, setGhostMarked] = useState(-0.25);
  const [dragged, setDragged] = useState(false);
  const [score, setScore] = useState<string | null>(null);

  async function load(t: number) {
    setPhase("loading");
    try {
      const s = await fetchState(NUM_TILES, t, ["spread", "mark"]);
      setState(s);
      setGhostOrdinary(s.amplitudes[(t + 1) % NUM_TILES]);
      setGhostMarked(s.amplitudes[t]);
      setPhase("predict");
    } catch (e) {
      onApiError(e);
    }
  }

  useEffect(() => {
    void load(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mirror() {
    try {
      const s = await fetchState(NUM_TILES, target, ["spread", "mark", "mirror"]);
      const trueOrdinary = s.amplitudes[(target + 1) % NUM_TILES];
      const trueMarked = s.amplitudes[target];
      const errO = Math.abs(ghostOrdinary - trueOrdinary);
      const errM = Math.abs(ghostMarked - trueMarked);
      const grade =
        errO < 0.05 && errM < 0.1
          ? "🎯 Spot on — you out-predicted most physics undergrads."
          : errM < 0.25
            ? "Close! The surprise is how far the marked bar vaults."
            : "Surprised? Almost everyone underestimates the vault. That's the point.";
      setScore(
        `Your prediction: ordinary ${ghostOrdinary.toFixed(2)}, marked ${ghostMarked.toFixed(2)}. ` +
          `Truth: ordinary ${trueOrdinary.toFixed(3)}, marked ${trueMarked.toFixed(3)}. ${grade}`
      );
      setState(s);
      setPhase("revealed");
    } catch (e) {
      onApiError(e);
    }
  }

  function reset() {
    const t = randomTarget();
    setTarget(t);
    setScore(null);
    setDragged(false);
    void load(t);
  }

  const step = phase === "revealed" ? 2 : dragged ? 1 : 0;

  return (
    <LevelFrame
      levelId={4}
      story={
        <>
          I've set the table for you: the ocean is already spread AND marked —
          shell <strong className="text-amber-200">{target}</strong>'s bar
          points down. Time for the final spell, and this one you have to
          predict before you're allowed to cast it.
        </>
      }
      noteReady={phase === "revealed"}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={reset}
    >
      {step === 0 && (
        <GuideBox step={0} total={TOTAL_STEPS}>
          The <strong>Mirror</strong> spell — the{" "}
          <Term t="diffusion">diffusion operator</Term> — does one geometric
          thing: it draws a line at the <strong>average</strong> height of all
          16 bars (the dashed gold line), then reflects every bar across that
          line. The rule is: new height = 2 × average − old height. So: bars
          sitting <em>near</em> the average barely move. Bars <em>far</em> from
          it travel far. Where is the one negative bar relative to that
          average line…?
          <Do>
            Predict before you look: drag the <strong>white handle</strong> to
            where you think the 15 ordinary bars will land, and the{" "}
            <strong>gold handle</strong> to where the marked bar will land.
          </Do>
        </GuideBox>
      )}
      {step === 1 && (
        <GuideBox step={1} total={TOTAL_STEPS}>
          Prediction placed (you can keep adjusting the dashed ghost bars).
          When you're confident:
          <Do>
            Press the glowing <strong>Mirror</strong> button and see how close
            you were.
          </Do>
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={TOTAL_STEPS} done>
          Look at that vault. The 15 positive bars sat just barely above the
          average, so the reflection hardly moved them. The negative bar sat
          far <em>below</em> the average — and reflecting it launched it to{" "}
          {state?.amplitudes[target].toFixed(3)}, which squares to a{" "}
          {((state?.amplitudes[target] ?? 0) ** 2 * 100).toFixed(0)}% catch
          chance. The invisible ink from Level 3 is now the tallest thing in
          the ocean. Mark made the answer <em>different</em>; Mirror made
          different <em>visible</em>.
          <Do>Collect your field note — Level 5 is where it all assembles.</Do>
        </GuideBox>
      )}

      <div className="flex gap-3 mb-3 flex-wrap items-center">
        <button
          onClick={mirror}
          disabled={phase !== "predict" || !dragged}
          className={`rounded-lg bg-violet-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-violet-200 disabled:opacity-40 ${
            step === 1 ? "pulse-glow" : ""
          }`}
        >
          🪞 Lock in prediction & Mirror!
        </button>
        {phase === "predict" && !dragged && (
          <span className="text-xs text-amber-200/90">
            ⬍ drag both handles on the chart first — predicting is the price of casting
          </span>
        )}
      </div>

      <div className="rounded-xl border border-cyan-800/50 bg-black/20 p-3">
        <AmplitudeChart
          amplitudes={state?.amplitudes ?? null}
          view="amplitude"
          highlight={target}
          showMean={true}
          ghost={
            phase === "predict"
              ? {
                  markedIndex: target,
                  ordinary: ghostOrdinary,
                  marked: ghostMarked,
                  onChange: (which, v) => {
                    setDragged(true);
                    if (which === "ordinary") setGhostOrdinary(v);
                    else setGhostMarked(v);
                  },
                }
              : undefined
          }
        />
        <div className="text-xs text-cyan-200/60 px-2">
          Reflection rule: new height = 2 × average − old height. Bars near the
          average barely move. Bars far from it travel far.
        </div>
      </div>

      {score && (
        <div className="mt-3 rounded-lg border border-violet-300/40 bg-violet-100/5 p-3 text-sm">
          {score}
        </div>
      )}

      <UnderTheHood diagram={state?.diagram ?? null} />
    </LevelFrame>
  );
}
