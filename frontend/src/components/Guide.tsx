import { useState, type ReactNode } from "react";

/**
 * Coral the crab — the in-game guide. Every level runs a small step-by-step
 * script through this box: it tells the player exactly what to click next
 * (the matching button glows), and explains what just happened right after
 * they do it. Jargon words are <Term>s — tap to get a plain definition.
 */

const GLOSSARY: Record<string, string> = {
  amplitude:
    "A number the quantum computer keeps for every possible answer (every shell). The bigger its size, the more likely that answer is when you look. Unlike a probability, an amplitude can be negative — and that's the loophole this whole game exploits.",
  superposition:
    "Holding all possibilities at once — the system hasn't committed to one answer yet. Each possibility carries its own amplitude. It is NOT 'being in all places at once' in any useful sense: on its own it's just fancy randomness.",
  measurement:
    "Looking. It forces the quantum state to stop being a maybe and pick ONE answer at random — each answer's chance is its amplitude squared. Looking also destroys the superposition, so you only get one try per setup.",
  oracle:
    "A small circuit that recognizes the answer you're searching for and flips the SIGN of its amplitude (positive → negative). It can mark the answer, but the mark can't be read directly — squaring erases minus signs.",
  diffusion:
    "The 'mirror' operation: reflect every amplitude across the average of all amplitudes. Bars near the average barely move; a negative bar far below it gets launched high. This is what turns the oracle's hidden mark into something you can actually see.",
  "Hadamard gate":
    "The basic quantum gate that puts one qubit into an equal mix of 0 and 1. Applying one to each of the 4 qubits spreads the state evenly over all 16 shells — that's the whole 'spread' spell.",
  qubit:
    "A quantum bit. One qubit covers 2 possibilities; 4 qubits together cover 2×2×2×2 = 16 — one for each shell in this ocean.",
};

export function Term({ t, children }: { t: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[t] ?? t;
  return (
    <span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="underline decoration-dotted decoration-amber-300/80 underline-offset-2 text-amber-100 hover:text-amber-300 cursor-help font-medium"
        title="tap for a plain-language definition"
      >
        {children ?? t}
      </button>
      {open && (
        <span className="block my-2 rounded-lg border border-amber-300/40 bg-amber-100/10 px-3 py-2 text-[13px] leading-relaxed text-amber-50/95">
          <strong className="text-amber-200">{t}</strong> — {def}{" "}
          <button
            type="button"
            className="underline text-amber-300/80 ml-1"
            onClick={() => setOpen(false)}
          >
            got it
          </button>
        </span>
      )}
    </span>
  );
}

interface GuideBoxProps {
  /** 0-based current step */
  step: number;
  /** total steps in this level's script */
  total: number;
  children: ReactNode;
  /** when set, this step advances via an explicit button instead of a game action */
  onNext?: () => void;
  nextLabel?: string;
  /** green styling for the level-complete message */
  done?: boolean;
}

export default function GuideBox({
  step,
  total,
  children,
  onNext,
  nextLabel = "Got it →",
  done = false,
}: GuideBoxProps) {
  return (
    <div
      className={`mb-4 flex gap-3 items-start rounded-xl border p-4 ${
        done
          ? "border-emerald-400/50 bg-emerald-900/25"
          : "border-amber-300/40 bg-[#0a3a55]"
      }`}
    >
      <div className="text-3xl leading-none select-none" aria-hidden>
        🦀
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wide text-amber-300/90">
            Coral the guide
          </span>
          <span className="text-[10px] text-cyan-200/50">
            step {Math.min(step + 1, total)} of {total}
          </span>
          <span className="text-[10px] text-cyan-200/40">
            · tap any <span className="underline decoration-dotted">dotted word</span> for a definition
          </span>
        </div>
        <div className="text-[15px] leading-relaxed text-cyan-50">{children}</div>
        {onNext && (
          <button
            onClick={onNext}
            className="mt-3 rounded-lg bg-amber-300 text-[#06283d] font-semibold px-4 py-1.5 text-sm hover:bg-amber-200"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Convenience: the "click this" pointer line inside a guide message. */
export function Do({ children }: { children: ReactNode }) {
  return (
    <span className="block mt-2 font-semibold text-amber-200">👉 {children}</span>
  );
}
