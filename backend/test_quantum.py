"""Sanity tests for the Qiskit core. Run with:  python test_quantum.py"""

import math

import quantum


def close(a, b, tol=1e-9):
    return abs(a - b) < tol


def main():
    N, T = 16, 7

    # 1. Spread: equal superposition, every amplitude = 1/4
    s = quantum.state(N, T, ["spread"])
    assert all(close(a, 0.25) for a in s["amplitudes"]), "spread should give 1/sqrt(16) everywhere"
    assert all(close(p, 1 / 16) for p in s["probabilities"])

    # 2. Mark: target amplitude flips sign, probabilities UNCHANGED (the whole point of Level 3)
    s = quantum.state(N, T, ["spread", "mark"])
    assert close(s["amplitudes"][T], -0.25), "oracle should flip the target's sign"
    assert all(close(s["amplitudes"][i], 0.25) for i in range(N) if i != T)
    assert all(close(p, 1 / 16) for p in s["probabilities"]), "marking must be invisible to measurement"

    # 3. Mirror: reflect across the average. mean = 14/64; target -> 2*mean+0.25 = 0.6875
    s = quantum.state(N, T, ["spread", "mark", "mirror"])
    assert close(s["amplitudes"][T], 0.6875), f"got {s['amplitudes'][T]}"
    assert all(close(s["amplitudes"][i], 0.1875) for i in range(N) if i != T)
    assert close(s["probabilities"][T], 0.6875**2)

    # 4. Three pings on 16 tiles: success probability ~ 96.1%
    ops = ["spread"] + ["mark", "mirror"] * 3
    s = quantum.state(N, T, ops)
    assert s["probabilities"][T] > 0.96, f"3 iterations should give ~96%, got {s['probabilities'][T]}"

    # 5. Normalization always holds
    assert close(sum(s["probabilities"]), 1.0, tol=1e-6)

    # 6. Sampling: counts sum to shots; after 3 pings most shots hit the target
    r = quantum.sample(N, T, ops, shots=1000)
    assert sum(r["counts"].values()) == 1000
    assert r["counts"].get(T, 0) > 900, f"expected ~961 hits on target, got {r['counts'].get(T, 0)}"

    # 7. Works for a 64-tile ocean too (6 qubits): optimal ~6 pings
    ops64 = ["spread"] + ["mark", "mirror"] * 6
    s = quantum.state(64, 42, ops64)
    assert s["probabilities"][42] > 0.99, f"got {s['probabilities'][42]}"

    # 8. Diagram is a real circuit drawing
    assert "H" in quantum.state(N, T, ["spread"])["diagram"]

    print("All tests passed ✔")
    print(f"  after 1 ping : P(target) = {quantum.state(N, T, ['spread', 'mark', 'mirror'])['probabilities'][T]:.4f}")
    p2 = quantum.state(N, T, ["spread"] + ["mark", "mirror"] * 2)["probabilities"][T]
    p3 = quantum.state(N, T, ["spread"] + ["mark", "mirror"] * 3)["probabilities"][T]
    p4 = quantum.state(N, T, ["spread"] + ["mark", "mirror"] * 4)["probabilities"][T]
    print(f"  after 2 pings: P(target) = {p2:.4f}")
    print(f"  after 3 pings: P(target) = {p3:.4f}   <- the sweet spot for 16 tiles")
    print(f"  after 4 pings: P(target) = {p4:.4f}   <- overwound! (Level 6 material)")


if __name__ == "__main__":
    main()
