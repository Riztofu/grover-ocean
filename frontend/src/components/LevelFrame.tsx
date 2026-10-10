import type { ReactNode } from "react";
import { LEVELS } from "../lib/levels";

interface Props {
  levelId: number;
  story: ReactNode;
  children: ReactNode;
  /** when true, the field note is offered to the player */
  noteReady: boolean;
  noteCollected: boolean;
  onCollectNote: () => void;
  onReset?: () => void;
}

export default function LevelFrame({
  levelId,
  story,
  children,
  noteReady,
  noteCollected,
  onCollectNote,
  onReset,
}: Props) {
  const meta = LEVELS.find((l) => l.id === levelId)!;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-100">
          Level {meta.id} — {meta.title}
        </h1>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs text-cyan-300 hover:text-white border border-cyan-700/60 rounded-full px-3 py-1"
          >
            ↺ reset level
          </button>
        )}
      </div>
      <p className="text-cyan-300/80 text-sm mb-3">{meta.subtitle}</p>
      <div className="text-[15px] text-cyan-50/90 mb-5 leading-relaxed">{story}</div>

      {children}

      {noteReady && !noteCollected && (
        <div className="mt-6 rounded-xl border border-amber-300/50 bg-amber-100/10 p-4">
          <div className="text-sm font-semibold text-amber-200 mb-1">
            🖋️ Field note unlocked
          </div>
          <p className="text-sm text-amber-50/90 mb-3">{meta.fieldNote}</p>
          <button
            onClick={onCollectNote}
            className="rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-amber-200"
          >
            Add to journal & unlock next level →
          </button>
        </div>
      )}
      {noteCollected && (
        <div className="mt-6 text-sm text-emerald-300/90">
          ✓ Field note collected — next level unlocked.
        </div>
      )}
    </div>
  );
}
