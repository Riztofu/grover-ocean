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


def stretch_main():
    """Levels 8-11: fast evaluator, ping curves, schools of fish, noisy seas."""
    import numpy as np
    from qiskit.quantum_info import Statevector

    # 1. The fast evaluator is EXACTLY Qiskit's reference simulation, incl. multi-fish
    for N, T, k in [(16, 7, 3), (64, 42, 6), (16, [3, 9], 2), (16, [0, 5, 10, 15], 1), (4, 2, 1)]:
        qc = quantum.build_circuit(N, T, ["spread"] + ["mark", "mirror"] * k)
        ref = Statevector.from_instruction(qc).data
        assert np.allclose(ref, quantum.statevector(qc), atol=1e-10), (N, T, k)

    # 2. Level 8 — Don't Overwind: 16 tiles peaks at 3 pings, then FALLS
    tr = quantum.trajectory(16, 7, 8)
    p = tr["probabilities"]
    assert tr["best_pings"] == 3
    assert p[3] > 0.96 and p[4] < 0.6 and p[6] < 0.03, "overwinding must hurt"
    assert all(close(sum(quantum.state(16, 7, ["spread"] + ["mark", "mirror"] * k)["probabilities"][7:8]), p[k]) for k in range(9)), (
        "trajectory must agree with state() at every k"
    )
    # the compass turns by exactly 2θ per ping and sweeps smoothly past 90°
    a = tr["angles"]
    th = tr["theta_deg"]
    assert close(th, 14.4775, tol=1e-3)
    assert close(a[0], th, tol=1e-6), "after the spread, the needle sits at θ"
    assert all(close(a[k + 1] - a[k], 2 * th, tol=1e-6) for k in range(8)), "each ping rotates by 2θ"
    assert all(close(p[k], math.sin(math.radians(a[k])) ** 2, tol=1e-9) for k in range(9)), "P = sin²(angle)"

    # 3. Level 9 — Bigger Oceans: optimal pings scale like √N, not N
    assert quantum.trajectory(64, 42, 12)["best_pings"] == 6
    assert quantum.trajectory(256, 200, 16)["best_pings"] == 12
    assert quantum.trajectory(256, 200, 16)["probabilities"][12] > 0.999

    # 4. Level 10 — Two Fish: the oracle marks every fish; more fish = FEWER pings
    s = quantum.state(16, [3, 9], ["spread", "mark"])
    assert close(s["amplitudes"][3], -0.25) and close(s["amplitudes"][9], -0.25)
    assert all(close(s["amplitudes"][i], 0.25) for i in range(16) if i not in (3, 9))
    two = quantum.trajectory(16, [3, 9], 5)
    assert two["best_pings"] == 2 and two["probabilities"][2] > 0.94
    four = quantum.trajectory(16, [0, 5, 10, 15], 3)
    assert four["best_pings"] == 1 and close(four["probabilities"][1], 1.0, tol=1e-9), "4 of 16: one ping is certain"
    # sampling a school lands on SOME fish
    r = quantum.sample(16, [0, 5, 10, 15], ["spread", "mark", "mirror"], shots=200)
    assert set(r["counts"]) <= {0, 5, 10, 15} and sum(r["counts"].values()) == 200

    # 5. Level 11 — noise: depolarizing per ping lowers AND shifts the peak earlier
    clean = quantum.trajectory(64, 1, 12)["probabilities"]
    rough = quantum.trajectory(64, 1, 12, noise=0.08)
    # noise pulls every probability toward uniform (1/64): down where the clean
    # chance is above average, UP where overwinding pushed it below
    for k in range(1, 13):
        if clean[k] > 1 / 64 + 1e-9:
            assert rough["probabilities"][k] < clean[k], k
        elif clean[k] < 1 / 64 - 1e-9:
            assert rough["probabilities"][k] > clean[k], k
    assert rough["best_pings"] < 6, "a noisy machine should overwind sooner"
    dist = np.array(quantum.state(64, 1, ["spread"] + ["mark", "mirror"] * 3)["probabilities"])
    assert close(sum(quantum.noisy_probabilities(dist, 3, 0.3)), 1.0, tol=1e-9), "noise keeps it a distribution"
    assert np.allclose(quantum.noisy_probabilities(np.ones(4) / 4, 5, 0.5), 0.25), "uniform stays uniform"
    r = quantum.sample(64, 1, ["spread"] + ["mark", "mirror"] * 6, shots=2000, noise=0.08)
    hits = r["counts"].get(1, 0)
    assert 1100 < hits < 1350, f"expected ~61% hits in choppy seas, got {hits / 20:.1f}%"

    # 6. junk is rejected
    for bad in (
        lambda: quantum.trajectory(16, 7, 99),
        lambda: quantum.trajectory(16, [], 3),
        lambda: quantum.trajectory(16, list(range(9)), 3),
        lambda: quantum.sample(16, 7, ["spread"], 10, noise=1.5),
        lambda: quantum.state(16, [3, 16], ["spread"]),
    ):
        try:
            bad()
            raise AssertionError("should have been rejected")
        except ValueError:
            pass

    print("Stretch-level tests passed ✔")
    print(f"  64 tiles : best = {quantum.trajectory(64, 1, 12)['best_pings']} pings (√64 = 8, N/2 = 32)")
    print(f"  256 tiles: best = {quantum.trajectory(256, 1, 16)['best_pings']} pings (√256 = 16, N/2 = 128)")
    print(f"  2 fish/16: best = {two['best_pings']} pings;  4 fish/16: best = {four['best_pings']} ping (certain)")
    print(f"  64 tiles, choppy sea: best = {rough['best_pings']} pings, P = {max(rough['probabilities']):.3f}")


if __name__ == "__main__":
    main()
    bench_main()
    stretch_main()
