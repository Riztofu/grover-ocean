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




def bench_main():
    """Level 7 workbench: gate-level building + verification."""
    H2 = [[{"g": "h", "q": 0}, {"g": "h", "q": 1}]]
    CZ = [[{"g": "cz"}]]
    X_WRAP_1 = [[{"g": "x", "q": 1}], [{"g": "cz"}], [{"g": "x", "q": 1}]]
    MIRROR = (
        H2
        + [[{"g": "x", "q": 0}, {"g": "x", "q": 1}]]
        + CZ
        + [[{"g": "x", "q": 0}, {"g": "x", "q": 1}]]
        + H2
    )

    # 1. flip: X on wire 1 moves the pearl |00> -> |10> (shell 2); HZH = X passes too
    assert quantum.bench([[{"g": "x", "q": 1}]], "flip")["solved"]
    assert quantum.bench(
        [[{"g": "h", "q": 1}], [{"g": "z", "q": 1}], [{"g": "h", "q": 1}]], "flip"
    )["solved"], "any circuit producing the right state must pass"
    assert not quantum.bench([[{"g": "x", "q": 0}]], "flip")["solved"]

    # 2. spread: H on each wire, in one column or two
    assert quantum.bench(H2, "spread")["solved"]
    assert quantum.bench([[{"g": "h", "q": 0}], [{"g": "h", "q": 1}]], "spread")["solved"]

    # 3. mark: CZ is the oracle for shell 3 — and marking is still invisible
    b = quantum.bench(CZ, "mark3")
    assert b["solved"]
    assert close(b["amplitudes"][3], -0.5), "sign flipped"
    assert all(close(p, 0.25) for p in b["probabilities"]), "probabilities unchanged"
    # mark is checked as a UNITARY: it must work on every ocean, so Z (which
    # happens to look right on some states) is rejected
    assert not quantum.bench([[{"g": "z", "q": 0}]], "mark3")["solved"]
    # retargeting: wrap CZ in X on the wires where the shell's bit is 0
    assert quantum.bench(X_WRAP_1, "mark1")["solved"]

    # 4. mirror: textbook diffusion; on the marked 4-shell state it gives certainty
    m = quantum.bench(MIRROR, "mirror")
    assert m["solved"]
    assert close(m["probabilities"][3], 1.0, tol=1e-9), "N=4, 1 iteration -> P=1 exactly"

    # 5. the hunt: chain the player's three builds; one ping = guaranteed catch
    chain = H2 + X_WRAP_1 + MIRROR
    h = quantum.bench(chain, "free", shots=20)
    assert close(h["probabilities"][1], 1.0, tol=1e-9)
    assert h["counts"] == {1: 20}, "every cast lands on the fish"

    # 6. junk is rejected
    for bad in ([[{"g": "t", "q": 0}]], [[{"g": "h", "q": 5}]], [[{"g": "cz"}, {"g": "h", "q": 0}]]):
        try:
            quantum.bench(bad, "free")
            raise AssertionError(f"should have rejected {bad}")
        except ValueError:
            pass

    print("Workbench tests passed \u2714")


if __name__ == "__main__":
    main()
    bench_main()
