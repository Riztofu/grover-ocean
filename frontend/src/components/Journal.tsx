import { LEVELS } from "../lib/levels";

interface Props {
  collected: number[]; // level ids whose field notes are collected
  open: boolean;
  onClose: () => void;
}

export default function Journal({ collected, open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-xl w-full max-h-[80vh] overflow-y-auto rounded-2xl bg-[#07344e] border border-cyan-700/50 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-amber-200">📓 Field Journal</h2>
          <button
            onClick={onClose}
            className="text-cyan-300 hover:text-white px-2 text-lg"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-cyan-200/70 mb-4">
          One note per level. Read top to bottom, this journal is a complete
          plain-language explanation of Grover's algorithm — the game writes
          its own textbook as you play.
        </p>
        {LEVELS.map((lvl) => {
          const got = collected.includes(lvl.id);
          return (
            <div
              key={lvl.id}
              className={`mb-3 rounded-lg border p-3 ${
                got
                  ? "border-amber-300/40 bg-amber-100/5"
                  : "border-cyan-800/40 bg-white/0 opacity-50"
              }`}
            >
              <div className="text-sm font-semibold text-amber-100">
                Level {lvl.id} — {lvl.title}
              </div>
              <div className="text-sm mt-1 text-cyan-50/90">
                {got ? lvl.fieldNote : "Not collected yet…"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
