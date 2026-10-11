"""
🌊 Grover's Ocean — the quantum core, as one runnable Qiskit script.

This is the Qollab-runnable entry point for the project. It is the same
circuit family that powers the game (backend/quantum.py), condensed into one
file with no dependencies beyond Qiskit, NumPy and (optionally) qiskit-ionq:

    pip install qiskit numpy qiskit-ionq
    python grovers_ocean.py

What it does, in order — each section is one level of the game, in text:

  1. SPREAD / MARK / MIRROR      the three "spells", as an amplitude chart
  2. DON'T OVERWIND              the ping curve: catch chance vs pings
  3. BIGGER OCEANS & TWO FISH    √N scaling, and why more fish = fewer pings
  4. CAST THE NET ON IONQ        ONE measured circuit, ONE IonQ job, real shots

The IonQ run uses qiskit-ionq. If IONQ_API_KEY is set (Qollab sets it for
you; locally, export it), the net is cast on IonQ's simulator — optionally
with a real device noise model. If it is not set, the script falls back to
local exact sampling and says so. Nothing in this file is faked: every number
is computed by a Qiskit circuit.
"""

from __future__ import annotations

import math
import os
import sys

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector

# ---------------------------------------------------------------------------
# The three spells
# ---------------------------------------------------------------------------


def spread(qc: QuantumCircuit) -> None:
    """🌊 Hadamard on every qubit: every tile gets the same amplitude 1/√N."""
    qc.h(range(qc.num_qubits))


def mark(qc: QuantumCircuit, target: int) -> None:
    """✒️ The oracle: flip the SIGN of one tile's amplitude.

    A multi-controlled Z, wrapped in X gates on the qubits where the target's
    bit is 0 so it fires on the target bitstring instead of |11...1>.
    """
    n = qc.num_qubits
    bits = format(target, f"0{n}b")[::-1]  # bit i <-> qubit i
    zeros = [i for i, b in enumerate(bits) if b == "0"]
    if zeros:
        qc.x(zeros)
    qc.h(n - 1)
    qc.mcx(list(range(n - 1)), n - 1)
    qc.h(n - 1)
    if zeros:
        qc.x(zeros)


def mirror(qc: QuantumCircuit) -> None:
    """🪞 Diffusion: reflect every amplitude across the average (2|s><s| - I)."""
    n = qc.num_qubits
    qc.h(range(n))
    qc.x(range(n))
    qc.h(n - 1)
    qc.mcx(list(range(n - 1)), n - 1)
    qc.h(n - 1)
    qc.x(range(n))
    qc.h(range(n))


def grover(num_tiles: int, targets: list[int], pings: int, measure: bool = False) -> QuantumCircuit:
    """spread, then (mark every fish → mirror) × pings. Optionally measure."""
    n = int(math.log2(num_tiles))
    qc = QuantumCircuit(n, n if measure else 0)
    spread(qc)
    for _ in range(pings):
        for t in targets:
            mark(qc, t)
        mirror(qc)
    if measure:
        qc.measure(range(n), range(n))
    return qc


# ---------------------------------------------------------------------------
# Exact simulation helpers (the game's "god's-eye view")
# ---------------------------------------------------------------------------


def amplitudes(qc: QuantumCircuit) -> np.ndarray:
    """Real amplitudes with the unobservable global phase removed (mean > 0)."""
    vec = Statevector.from_instruction(qc).data
    s = vec.sum()
    phase = s / abs(s) if abs(s) > 1e-9 else vec[np.argmax(np.abs(vec))] / abs(vec[np.argmax(np.abs(vec))])
    return (vec / phase).real


def ping_curve(num_tiles: int, targets: list[int], max_pings: int) -> list[float]:
    """P(catch) after 0..max_pings pings — one statevector, evolved ping by ping."""
    n = int(math.log2(num_tiles))
    prep = QuantumCircuit(n)
    spread(prep)
    one_ping = QuantumCircuit(n)
    for t in targets:
        mark(one_ping, t)
    mirror(one_ping)
    sv = Statevector.from_instruction(prep)
    curve = [sum(abs(sv.data[t]) ** 2 for t in targets)]
    for _ in range(max_pings):
        sv = sv.evolve(one_ping)
        curve.append(sum(abs(sv.data[t]) ** 2 for t in targets))
    return curve


# ---------------------------------------------------------------------------
# Text charts
# ---------------------------------------------------------------------------


def bar_chart(values, highlight=(), width=36, fmt="{:+.3f}") -> None:
    m = max(abs(v) for v in values) or 1.0
    for i, v in enumerate(values):
        n = int(round(abs(v) / m * width))
        bar = ("█" if v >= 0 else "▒") * n
        tag = " ◀ fish" if i in highlight else ""
        print(f"  {i:>3} {fmt.format(v)}  {bar}{tag}")


def curve_chart(curve, width=40) -> None:
    best = int(np.argmax(curve))
    for k, p in enumerate(curve):
        n = int(round(p * width))
        star = "  ⭐ sweet spot" if k == best else ""
        print(f"  {k:>2} pings  {p * 100:5.1f}%  {'█' * n}{star}")


def banner(title: str) -> None:
    print("\n" + "═" * 70)
    print(f"  {title}")
    print("═" * 70)


# ---------------------------------------------------------------------------
# The script
# ---------------------------------------------------------------------------


def main() -> None:
    rng = np.random.default_rng()
    N = 16
    fish = int(rng.integers(N))

    # ---- 1. the three spells --------------------------------------------
    banner(f"1 · THE THREE SPELLS   (16 tiles, the pearl is under tile {fish})")
    qc = QuantumCircuit(4)
    spread(qc)
    print("\n🌊 spread — every tile gets amplitude 1/√16 = 0.25. Measuring now = a 1-in-16 lottery.")
    a = amplitudes(qc)
    print(f"   all 16 amplitudes = {a[0]:.3f}   (probability each = {a[0] ** 2:.4f})")

    mark(qc, fish)
    a = amplitudes(qc)
    print(f"\n✒️ mark — the oracle flips tile {fish}'s SIGN. Probabilities are amplitude², so…")
    print(f"   tile {fish}: amplitude {a[fish]:+.3f} → probability {a[fish] ** 2:.4f}   (unchanged! the ink is invisible)")

    mirror(qc)
    a = amplitudes(qc)
    print("\n🪞 mirror — reflect every bar across the average. The negative bar vaults:")
    bar_chart(a, highlight={fish})
    print(f"   catch chance after ONE ping (mark+mirror): {a[fish] ** 2 * 100:.1f}%")

    # ---- 2. don't overwind ------------------------------------------------
    banner("2 · DON'T OVERWIND   (16 tiles, 1 fish — catch chance vs. number of pings)")
    c16 = ping_curve(N, [fish], 8)
    curve_chart(c16)
    print("\n   Each ping rotates the state by a fixed 2θ (sin θ = 1/√N). Past the top it")
    print("   swings back out. Sweet spot ≈ (π/4)·√N =", f"{math.pi / 4 * math.sqrt(N):.1f}", "→ 3 pings.")

    # ---- 3. bigger oceans & two fish --------------------------------------
    banner("3 · BIGGER OCEANS & TWO FISH   (√N scaling, and more fish = fewer pings)")
    c64 = ping_curve(64, [42], 10)
    print("\n   64 tiles, 1 fish:")
    curve_chart(c64, width=30)
    print("\n   16 tiles, 4 fish (a quarter of the ocean):")
    c4 = ping_curve(16, [0, 5, 10, 15], 3)
    curve_chart(c4, width=30)
    print("\n   ┌────────┬──────────────┬─────┬──────────────┐")
    print("   │ tiles  │ blind ≈ N/2  │ √N  │ sweet spot   │")
    print("   ├────────┼──────────────┼─────┼──────────────┤")
    print(f"   │ 16     │ 8 flips      │ 4   │ {int(np.argmax(c16))} pings      │")
    print(f"   │ 64     │ 32 flips     │ 8   │ {int(np.argmax(c64))} pings      │")
    print("   │ 1e6    │ 500,000      │ 1000│ ≈ 785 pings  │")
    print("   └────────┴──────────────┴─────┴──────────────┘")
    print(f"   4 fish in 16 tiles: {c4[1] * 100:.0f}% after exactly ONE ping — a certain catch.")

    # ---- 4. cast the net on IonQ ------------------------------------------
    banner("4 · CAST THE NET ON IONQ   (one measured circuit, one job, real shots)")
    pings = int(np.argmax(c16))
    shots = 100
    hunt = grover(N, [fish], pings, measure=True)
    print(f"\n   Circuit: spread → (mark → mirror) × {pings} → measure, on 4 qubits.")
    print(f"   Depth {hunt.depth()}, {hunt.size()} ops before transpilation. Fish hidden at tile {fish}.")

    counts = cast_on_ionq(hunt, shots)
    print(f"\n   Tally of {shots} shots:")
    tallies = [counts.get(i, 0) for i in range(N)]
    bar_chart(tallies, highlight={fish}, fmt="{:>6}")
    top = int(np.argmax(tallies))
    print(f"\n   Most-hit tile: {top} with {tallies[top]} shots  →  {'🐟 CAUGHT' if top == fish else 'missed (noise or the 4%)'}")
    print(f"   Expected catch rate at {pings} pings: {c16[pings] * 100:.1f}%  ·  observed: {tallies[fish] / shots * 100:.0f}%")
    print("\n   That is Grover's algorithm, end to end: √N pings, honest shots, a verified answer.")
    print("   Play the full game (11 levels) — see the README.\n")


def cast_on_ionq(qc: QuantumCircuit, shots: int) -> dict[int, int]:
    """Run ONE job on the IonQ simulator via qiskit-ionq; fall back to local sampling.

    IonQ backends accept one job per run, so everything we measure is in this
    single circuit. Set IONQ_NOISE_MODEL (e.g. "aria-1") to sample through a
    real device's noise model — the game's "choppy sea", for real.
    """
    token = os.environ.get("IONQ_API_KEY")
    noise_model = os.environ.get("IONQ_NOISE_MODEL", "ideal")
    if token:
        try:
            from qiskit_ionq import IonQProvider

            backend = IonQProvider(token).get_backend("ionq_simulator")
            tqc = transpile(qc, backend, optimization_level=1)
            print(f"   → submitting to IonQ simulator (noise_model={noise_model}) …")
            job = backend.run(tqc, shots=shots, noise_model=noise_model)
            raw = job.result().get_counts()
            # keys are bitstrings, most-significant qubit first
            return {int(k.replace(" ", ""), 2): v for k, v in raw.items()}
        except Exception as e:  # noqa: BLE001 — report and fall back, never fake
            print(f"   ⚠ IonQ run failed ({type(e).__name__}: {e}); falling back to local sampling.", file=sys.stderr)
    else:
        print("   (IONQ_API_KEY not set — sampling locally from the exact distribution instead.)")
    probs = amplitudes(qc.remove_final_measurements(inplace=False)) ** 2
    probs = probs / probs.sum()
    draws = np.random.default_rng().multinomial(shots, probs)
    return {int(i): int(c) for i, c in enumerate(draws) if c > 0}


if __name__ == "__main__":
    main()
