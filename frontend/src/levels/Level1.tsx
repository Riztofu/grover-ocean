import { useState } from "react";
import OceanGrid from "../components/OceanGrid";
import LevelFrame from "../components/LevelFrame";
import GuideBox, { Do } from "../components/Guide";
import { NUM_TILES, randomTarget } from "../lib/levels";

interface Props {
  noteCollected: boolean;
  onCollectNote: () => void;
}

export default function Level1({ noteCollected, onCollectNote }: Props) {
  const [pearl, setPearl] = useState(randomTarget);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [found, setFound] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const flips = flipped.size;

  function flip(i: number) {
    if (found || flipped.has(i)) return;
    const next = new Set(flipped);
    next.add(i);
    setFlipped(next);
    if (i === pearl) {
      setFound(true);
      setHistory((h) => [...h, next.size]);
    }
  }

  function playAgain() {
    setPearl(randomTarget());
    setFlipped(new Set());
    setFound(false);
  }

  const avg =
    history.length > 0
      ? (history.reduce((a, b) => a + b, 0) / history.length).toFixed(1)
      : null;

  // Guided tutorial: which beat of this level are we on?
  const step = history.length === 0 ? 0 : history.length === 1 ? 1 : 2;

  return (
    <LevelFrame
      levelId={1}
      story={
        <>
          A pearl is hiding under one of these 16 shells. No quantum anything
          yet — this level is the ordinary world, and it exists so you can
          feel exactly what the quantum levels have to beat.
        </>
      }
      noteReady={history.length >= 2}
      noteCollected={noteCollected}
      onCollectNote={onCollectNote}
      onReset={() => {
        playAgain();
        setHistory([]);
      }}
    >
      {step === 0 && (
        <GuideBox step={0} total={3}>
          There's exactly one pearl 🦪 and 16 shells. The only strategy that
          exists is brute force: look under them one at a time. The counter on
          the right tracks how many looks it costs you.
          <Do>Click any shell to flip it. Keep going until you find the pearl.</Do>
        </GuideBox>
      )}
      {step === 1 && found && (
        <GuideBox step={1} total={3}>
          Found it in <strong>{history[0]}</strong> flip
          {history[0] === 1 ? "" : "s"}! But was that luck or skill? One round
          proves nothing — what matters is the <em>average</em> cost.
          <Do>Press the glowing "Play again" button and find it once more.</Do>
        </GuideBox>
      )}
      {step === 1 && !found && (
        <GuideBox step={1} total={3}>
          Round 2 — same deal, fresh pearl. Keep an eye on the flip counter.
        </GuideBox>
      )}
      {step === 2 && (
        <GuideBox step={2} total={3} done>
          Your average so far: <strong>{avg} flips</strong>. Play more rounds
          and it settles near <strong>8</strong> — with 16 shells and no clues,
          blind search costs about half the shells (N/2) on average, every
          time, forever. <strong>Remember that number.</strong> Every level
          after this one exists to beat it.
          <Do>Grab your field note below to unlock Level 2.</Do>
        </GuideBox>
      )}

      <div className="flex flex-wrap gap-6 items-start">
        <div className="flex-1 min-w-[280px]">
          <OceanGrid
            tiles={NUM_TILES}
            flipped={flipped}
            target={pearl}
            disabled={found}
            onTileClick={flip}
          />
        </div>
        <div className="w-56 shrink-0 rounded-xl border border-cyan-800/50 bg-black/20 p-4 text-sm space-y-2">
          <div>
            Flips this round:{" "}
            <span className="text-amber-200 font-bold text-lg">{flips}</span>
          </div>
          {found && (
            <div className="text-emerald-300">
              🦪 Found it in {flips} flips!
            </div>
          )}
          <div>
            Rounds played: <span className="font-semibold">{history.length}</span>
          </div>
          {avg && (
            <div>
              Average cost:{" "}
              <span className="text-amber-200 font-bold">{avg} flips</span>
              <div className="text-xs text-cyan-200/60 mt-1">
                Theory says ~8 for 16 shells (N/2).
              </div>
            </div>
          )}
          {found && (
            <button
              onClick={playAgain}
              className={`mt-2 w-full rounded-lg bg-cyan-400 text-[#06283d] font-semibold px-3 py-2 hover:bg-cyan-300 ${
                history.length === 1 ? "pulse-glow" : ""
              }`}
            >
              Play again
            </button>
          )}
        </div>
      </div>
    </LevelFrame>
  );
}
