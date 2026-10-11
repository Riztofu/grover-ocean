import { useEffect, useState } from "react";
import { hostBackend, isTarget, runOnHost, type HostBackend, type HostRunResult, type Op, type Target } from "../lib/api";

/**
 * "☁️ Cast on IonQ": the circuit the player just built, measured as ONE job
 * on a real backend — IonQ's cloud simulator (or hardware) — with the shots
 * tallied next to the game's exact numbers.
 *
 * Renders nothing unless a real backend is available: on Qollab that is the
 * Select-QPU backend (one IonQ job per Run), locally it is qiskit-ionq with
 * IONQ_API_KEY set. Never fakes a result: errors are shown as errors.
 */
interface Props {
  numTiles: number;
  target: Target;
  ops: Op[];
  shots?: number;
  disabled?: boolean;
  /** show which tallies are fish (after the level has revealed them) */
  revealTarget?: boolean;
  onResult?: (r: HostRunResult) => void;
}

export default function IonQCast({ numTiles, target, ops, shots = 20, disabled = false, revealTarget = false, onResult }: Props) {
  const [host, setHost] = useState<HostBackend | null>(null);
  const [result, setResult] = useState<HostRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hostBackend().then(setHost).catch(() => setHost(null));
  }, []);

  if (!host) return null;

  async function cast() {
    setBusy(true);
    setError(null);
    try {
      const r = await runOnHost(numTiles, target, ops, shots);
      setResult(r);
      onResult?.(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const tallies = result ? Object.entries(result.counts).sort((a, b) => b[1] - a[1]) : [];
  const fishHits = result ? tallies.reduce((s, [t, c]) => s + (isTarget(target, Number(t)) ? c : 0), 0) : 0;

  return (
    <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-900/10 p-3 text-sm">
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => void cast()}
          disabled={disabled || busy}
          title={`Send this exact circuit as ONE job to ${host.label}`}
          className="rounded-lg bg-emerald-300 text-[#06283d] font-semibold px-4 py-2 text-sm hover:bg-emerald-200 disabled:opacity-40"
        >
          ☁️ {busy ? "Casting on IonQ…" : `Cast ${shots} shots on ${host.short}`}
        </button>
        <span className="text-xs text-cyan-200/60">
          {host.label} · the same circuit, measured for real{host.ionq ? " · one job per Run on Qollab" : ""}
        </span>
      </div>
      {error && <div className="mt-2 text-rose-300 text-xs">⚠️ {error}</div>}
      {result && (
        <div className="mt-2">
          <div className="text-xs text-cyan-200/70 mb-1">
            {result.backend} returned {result.shots} shots in {result.seconds}s:
          </div>
          <div className="flex flex-wrap gap-1">
            {tallies.map(([t, c]) => (
              <span
                key={t}
                className={`inline-block rounded px-2 py-0.5 text-xs border ${
                  revealTarget && isTarget(target, Number(t))
                    ? "bg-emerald-700/60 border-emerald-300/60 font-bold"
                    : "bg-cyan-800/50 border-cyan-600/40"
                }`}
              >
                tile {t} ×{c}
              </span>
            ))}
          </div>
          {revealTarget && (
            <div className="mt-1 text-xs text-emerald-200">
              🐟 fish hit {fishHits}/{result.shots} shots ({((fishHits / result.shots) * 100).toFixed(0)}%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
