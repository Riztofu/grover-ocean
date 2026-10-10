import { useEffect, useState } from "react";
import Journal from "./components/Journal";
import { backendUp } from "./lib/api";
import { LEVELS } from "./lib/levels";
import Level1 from "./levels/Level1";
import Level2 from "./levels/Level2";
import Level3 from "./levels/Level3";
import Level4 from "./levels/Level4";
import Level5 from "./levels/Level5";
import Level6 from "./levels/Level6";
import Level7 from "./levels/Level7";

interface Progress {
  collected: number[]; // level ids with field note collected
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem("grover-ocean-progress");
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    /* ignore */
  }
  return { collected: [] };
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [current, setCurrent] = useState(() => {
    const p = loadProgress();
    return Math.min(p.collected.length + 1, LEVELS.length);
  });
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem("grover-ocean-welcome") !== "done";
    } catch {
      return true;
    }
  });
  const [journalOpen, setJournalOpen] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    void backendUp().then(setApiOk);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("grover-ocean-progress", JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress]);

  const unlocked = progress.collected.length + 1; // next uncollected level is playable

  function collect(id: number) {
    setProgress((p) =>
      p.collected.includes(id) ? p : { collected: [...p.collected, id].sort((a, b) => a - b) }
    );
  }

  function onApiError(e: unknown) {
    setApiError(e instanceof Error ? e.message : String(e));
    void backendUp().then(setApiOk);
  }

  const levelProps = (id: number) => ({
    noteCollected: progress.collected.includes(id),
    onCollectNote: () => collect(id),
    onApiError,
  });

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-cyan-100">
              🌊 Grover's Ocean
            </h1>
            <p className="text-sm text-cyan-300/70">
              Build a quantum search algorithm with your own hands, one spell at a time.
            </p>
          </div>
          <button
            onClick={() => setJournalOpen(true)}
            className="rounded-lg border border-amber-300/50 text-amber-200 px-4 py-2 text-sm hover:bg-amber-100/10"
          >
            📓 Journal ({progress.collected.length}/{LEVELS.length})
          </button>
        </div>

        <nav className="flex gap-2 mt-4 flex-wrap">
          {LEVELS.map((lvl) => {
            const isUnlocked = lvl.id <= unlocked;
            const done = progress.collected.includes(lvl.id);
            return (
              <button
                key={lvl.id}
                disabled={!isUnlocked}
                onClick={() => setCurrent(lvl.id)}
                className={`rounded-full px-4 py-1.5 text-sm border transition
                  ${current === lvl.id ? "bg-cyan-400 text-[#06283d] border-cyan-400 font-bold" : ""}
                  ${current !== lvl.id && isUnlocked ? "border-cyan-700/70 text-cyan-200 hover:bg-cyan-900/50" : ""}
                  ${!isUnlocked ? "border-cyan-900/50 text-cyan-700 cursor-not-allowed" : ""}`}
              >
                {done ? "✓ " : !isUnlocked ? "🔒 " : ""}
                {lvl.id}. {lvl.title}
              </button>
            );
          })}
        </nav>

        {apiOk === false && current >= 2 && (
          <div className="mt-4 rounded-lg border border-rose-400/50 bg-rose-900/30 p-3 text-sm">
            ⚠️ Quantum backend not reachable. In a terminal:{" "}
            <code className="bg-black/40 px-1.5 py-0.5 rounded">
              cd backend && uvicorn main:app --reload --port 8000
            </code>{" "}
            <button className="underline ml-2" onClick={() => void backendUp().then((ok) => { setApiOk(ok); if (ok) setApiError(null); })}>
              retry
            </button>
          </div>
        )}
        {apiError && apiOk !== false && (
          <div className="mt-4 rounded-lg border border-rose-400/50 bg-rose-900/30 p-3 text-sm">
            ⚠️ {apiError}
            <button className="underline ml-2" onClick={() => setApiError(null)}>dismiss</button>
          </div>
        )}
      </header>

      <main>
        {current === 1 && <Level1 {...levelProps(1)} />}
        {current === 2 && <Level2 {...levelProps(2)} />}
        {current === 3 && <Level3 {...levelProps(3)} />}
        {current === 4 && <Level4 {...levelProps(4)} />}
        {current === 5 && <Level5 {...levelProps(5)} />}
        {current === 6 && <Level6 {...levelProps(6)} />}
        {current === 7 && <Level7 {...levelProps(7)} />}
      </main>

      {showWelcome && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-[#07344e] border border-cyan-600/50 p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-cyan-100 mb-3">
              🌊 Welcome aboard
            </h2>
            <div className="space-y-3 text-[15px] leading-relaxed text-cyan-50/90">
              <p>
                A pearl is hiding in the ocean, and this game teaches you — by
                playing, not reading — how a <strong>quantum computer</strong>{" "}
                finds it faster than any ordinary computer ever could. You
                need <strong>zero</strong> quantum background. Promise.
              </p>
              <p>
                🦀 <strong>Coral the crab</strong> guides every level: she
                tells you exactly what to click (the next button{" "}
                <strong className="text-amber-200">glows</strong>), and
                explains what just happened after you click it. Tap any{" "}
                <span className="underline decoration-dotted decoration-amber-300/80">
                  dotted word
                </span>{" "}
                for a plain-English definition.
              </p>
              <p>
                Finish a level to collect its 📓 field note — notes unlock the
                next level, and by the end your journal is a complete
                explanation of a real quantum algorithm, written by you
                playing.
              </p>
            </div>
            <button
              onClick={() => {
                setShowWelcome(false);
                try {
                  localStorage.setItem("grover-ocean-welcome", "done");
                } catch {
                  /* ignore */
                }
              }}
              className="mt-5 w-full rounded-lg bg-cyan-400 text-[#06283d] font-bold px-4 py-2.5 hover:bg-cyan-300"
            >
              Dive in 🤿
            </button>
          </div>
        </div>
      )}

      {progress.collected.length === LEVELS.length && (
        <div className="max-w-3xl mx-auto mt-8 rounded-xl border border-emerald-400/40 bg-emerald-900/20 p-4 text-sm">
          🏆 You didn't just watch Grover's algorithm — you assembled it from
          parts you understand. Open the journal: you wrote the textbook.
          (Stretch levels — overwinding, 64-tile oceans, two fish, noisy
          hardware — are in the README's roadmap.)
        </div>
      )}

      <Journal
        collected={progress.collected}
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
      />

      <footer className="max-w-3xl mx-auto mt-10 text-xs text-cyan-200/40">
        Every amplitude on this screen was computed by a real Qiskit circuit —
        open "Under the hood" on any level to see it.
      </footer>
    </div>
  );
}
