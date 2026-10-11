"""
The ENTIRE quantum side of Grover's Ocean lives in this one file.

Every "spell" in the game is a real Qiskit sub-circuit:

  - "spread" = Hadamard on every qubit  -> equal superposition
  - "mark"   = the oracle               -> flips the SIGN of the target's amplitude
  - "mirror" = the diffusion operator   -> reflects every amplitude across the average

Oceans may hold several fish at once (Level 10): the oracle then flips the
sign of every target. The ping-curve levels (8-10) use `trajectory()`, and
the boss level (11) adds an honest noise model — see `noisy_probabilities()`.

The frontend never fakes any quantum math: it sends a list of ops,
and this module builds the circuit, computes the exact statevector,
and (for measurements) samples real shots from it.

A note on phases: Grover's algorithm keeps the statevector real at every
step, but the standard gate decompositions introduce a physically
meaningless GLOBAL phase (often -1). Since a global phase is unobservable,
we canonicalize it so the *average* amplitude is positive — which makes the
amplitudes match the textbook picture (15 positive bars, one negative bar
after the mark). Probabilities are completely unaffected by this choice.
"""

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator, Statevector

VALID_OPS = ("spread", "mark", "mirror")
MAX_TILES = 256  # 8 qubits is plenty for the game
MAX_TARGETS = 8
MAX_PINGS = 32  # longest ping curve we will compute


def _targets(target) -> list[int]:
    """Normalize a target spec (one index or a list of indices) to a sorted list."""
    if isinstance(target, (int, np.integer)) and not isinstance(target, bool):
        return [int(target)]
    if not isinstance(target, (list, tuple)):
        raise ValueError("target must be an index or a list of indices")
    out = sorted({int(t) for t in target})
    if not out:
        raise ValueError("at least one target is required")
    if len(out) > MAX_TARGETS:
        raise ValueError(f"at most {MAX_TARGETS} targets")
    return out


def _validate(num_tiles: int, target, ops: list[str]) -> int:
    """Validate a request and return the number of qubits."""
    if num_tiles < 4 or num_tiles > MAX_TILES:
        raise ValueError(f"num_tiles must be between 4 and {MAX_TILES}")
    n = int(np.log2(num_tiles))
    if 2**n != num_tiles:
        raise ValueError("num_tiles must be a power of 2")
    for t in _targets(target):
        if not (0 <= t < num_tiles):
            raise ValueError("target must be a valid tile index")
    for op in ops:
        if op not in VALID_OPS:
            raise ValueError(f"unknown op {op!r}; valid ops are {VALID_OPS}")
    if len(ops) > 2 * MAX_PINGS + 1:
        raise ValueError("too many ops")
    return n


def _oracle(qc: QuantumCircuit, n: int, target: int) -> None:
    """Flip the sign of the amplitude of basis state |target>.

    Implemented as a multi-controlled Z, conjugated with X gates so that
    it fires on the target bitstring instead of |11...1>.
    """
    bits = format(target, f"0{n}b")[::-1]  # bit i of target <-> qubit i
    zeros = [i for i, b in enumerate(bits) if b == "0"]
    if zeros:
        qc.x(zeros)
    # multi-controlled Z = H on last qubit, multi-controlled X, H again
    qc.h(n - 1)
    qc.mcx(list(range(n - 1)), n - 1)
    qc.h(n - 1)
    if zeros:
        qc.x(zeros)


def _diffusion(qc: QuantumCircuit, n: int) -> None:
    """Reflect all amplitudes across their average (2|s><s| - I, up to global phase)."""
    qc.h(range(n))
    qc.x(range(n))
    qc.h(n - 1)
    qc.mcx(list(range(n - 1)), n - 1)
    qc.h(n - 1)
    qc.x(range(n))
    qc.h(range(n))


def build_circuit(num_tiles: int, target, ops: list[str]) -> QuantumCircuit:
    """Build the circuit for a sequence of game ops.

    `target` is one tile index or a list of them. With several fish the
    oracle is one multi-controlled Z per fish — they all commute, so the
    order is irrelevant and the net effect is "flip the sign of every fish".
    """
    n = _validate(num_tiles, target, ops)
    targets = _targets(target)
    qc = QuantumCircuit(n)
    for op in ops:
        if op == "spread":
            qc.h(range(n))
        elif op == "mark":
            for t in targets:
                _oracle(qc, n, t)
        elif op == "mirror":
            _diffusion(qc, n)
        qc.barrier()
    return qc


# ---------------------------------------------------------------------------
# Exact simulation.
#
# Qiskit's generic simulator expands a multi-controlled X into hundreds of
# elementary gates for 8 qubits, which made 256-tile oceans crawl (~0.5 s per
# circuit). The mcx matrix is just a permutation — swap the last two basis
# states — so we apply it directly. Same gate, same diagram, same numbers;
# only faster. Every other gate is applied via its own exact matrix.
# ---------------------------------------------------------------------------

_MCX_CACHE: dict[int, Operator] = {}


def _mcx_operator(k: int) -> Operator:
    """The exact matrix of a k-qubit multi-controlled X (k-1 controls, 1 target).

    Qiskit is little-endian: qargs[0] is the lowest bit of the basis index and
    the target (qargs[-1]) is the highest. "All controls on" picks out the two
    basis states whose low k-1 bits are all 1 — indices d/2-1 (target 0) and
    d-1 (target 1) — and the gate swaps exactly those two.
    """
    if k not in _MCX_CACHE:
        d = 2**k
        m = np.eye(d)
        m[[d // 2 - 1, d - 1]] = m[[d - 1, d // 2 - 1]]
        _MCX_CACHE[k] = Operator(m)
    return _MCX_CACHE[k]


def _evolve(sv: Statevector, qc: QuantumCircuit) -> Statevector:
    """Apply every gate of `qc` to `sv`, exactly."""
    for inst in qc.data:
        op = inst.operation
        if op.name == "barrier":
            continue
        qargs = [qc.find_bit(q).index for q in inst.qubits]
        mat = _mcx_operator(len(qargs)) if op.name == "mcx" else Operator(op.to_matrix())
        sv = sv.evolve(mat, qargs=qargs)
    return sv


def statevector(qc: QuantumCircuit) -> np.ndarray:
    """Exact final statevector of `qc` starting from |0...0>."""
    return _evolve(Statevector.from_int(0, 2**qc.num_qubits), qc).data


def _canonical_real(vec: np.ndarray) -> np.ndarray:
    """Divide out the global phase so the average amplitude is positive; return reals."""
    s = vec.sum()
    if abs(s) > 1e-9:
        phase = s / abs(s)
    else:  # degenerate case (e.g. fully overwound) — pin phase to largest component
        k = int(np.argmax(np.abs(vec)))
        phase = vec[k] / abs(vec[k])
    vec = vec / phase
    if np.max(np.abs(vec.imag)) > 1e-7:
        raise RuntimeError("statevector unexpectedly non-real — not a Grover circuit?")
    return vec.real


def real_amplitudes(qc: QuantumCircuit) -> np.ndarray:
    """Exact statevector as real amplitudes (global phase canonicalized)."""
    return _canonical_real(statevector(qc))


def state(num_tiles: int, target, ops: list[str]) -> dict:
    """Amplitudes, probabilities and the circuit diagram for a sequence of ops."""
    qc = build_circuit(num_tiles, target, ops)
    amps = real_amplitudes(qc)
    return {
        "amplitudes": [float(a) for a in amps],
        "probabilities": [float(a * a) for a in amps],
        "num_qubits": qc.num_qubits,
        "diagram": str(qc.draw(output="text", fold=110)),
    }


def noisy_probabilities(probs: np.ndarray, pings: int, noise: float) -> np.ndarray:
    """Output distribution after a global depolarizing channel per ping.

    This is the textbook noise model, not a fudge: after every Grover
    iteration, with probability `noise` the register is replaced by the
    maximally mixed state (every tile equally likely). After k pings the
    circuit's ideal distribution survives with probability (1-noise)^k and
    the rest is uniform. More pings = more amplification AND more rot — so
    on a noisy machine the sweet spot moves earlier and gets lower.
    """
    if not (0.0 <= noise <= 1.0):
        raise ValueError("noise must be between 0 and 1")
    if noise == 0.0 or pings == 0:
        return probs
    keep = (1.0 - noise) ** pings
    return keep * probs + (1.0 - keep) / len(probs)


def sample(num_tiles: int, target, ops: list[str], shots: int, noise: float = 0.0) -> dict:
    """Sample measurement outcomes (shots) from the circuit's true distribution.

    `noise` > 0 applies the depolarizing model in `noisy_probabilities`
    once per completed ping (i.e. per "mirror") — the boss level's choppy sea.
    """
    if not (1 <= shots <= 10000):
        raise ValueError("shots must be between 1 and 10000")
    qc = build_circuit(num_tiles, target, ops)
    probs = real_amplitudes(qc) ** 2
    probs = probs / probs.sum()  # guard against float drift
    probs = noisy_probabilities(probs, ops.count("mirror"), noise)
    rng = np.random.default_rng()
    counts = rng.multinomial(shots, probs)
    return {
        "counts": {int(i): int(c) for i, c in enumerate(counts) if c > 0},
        "shots": shots,
    }


def trajectory(num_tiles: int, target, max_pings: int, noise: float = 0.0) -> dict:
    """P(catch) and the Grover compass angle after 0, 1, ..., max_pings pings.

    Computed by evolving ONE statevector through the real circuit and taking
    a snapshot after every mirror — so a 20-ping curve costs one simulation,
    not twenty. Used by Levels 8-10 to draw the "don't overwind" curve.

    The compass angle is the textbook two-dimensional picture of Grover's
    algorithm: the state always lives in the plane spanned by |fish> (the
    equal mix of all targets) and |rest> (the equal mix of everything else).
    Each ping rotates it by a fixed 2θ, where sin θ = sqrt(M/N). We read the
    angle straight off the amplitudes — atan2(fish component, rest component)
    — so it is derived from the circuit, not from the formula.
    """
    if not (0 <= max_pings <= MAX_PINGS):
        raise ValueError(f"max_pings must be between 0 and {MAX_PINGS}")
    n = _validate(num_tiles, target, [])
    targets = _targets(target)
    m = len(targets)
    mask = np.zeros(num_tiles, dtype=bool)
    mask[targets] = True

    def snapshot(vec: np.ndarray, pings: int) -> tuple[float, float]:
        amps = _canonical_real(vec)
        fish_sign = -1.0 if np.all(amps[mask] <= 1e-12) and np.any(amps[mask] < 0) else 1.0
        rest_sign = -1.0 if np.all(amps[~mask] <= 1e-12) and np.any(amps[~mask] < 0) else 1.0
        fish = fish_sign * float(np.sqrt(np.sum(amps[mask] ** 2)))
        rest = rest_sign * float(np.sqrt(np.sum(amps[~mask] ** 2)))
        probs = noisy_probabilities(amps**2, pings, noise)
        return float(np.sum(probs[mask])), float(np.degrees(np.arctan2(fish, rest)))

    spread = QuantumCircuit(n)
    spread.h(range(n))
    ping = QuantumCircuit(n)
    for t in targets:
        _oracle(ping, n, t)
    _diffusion(ping, n)

    theta = float(np.degrees(np.arcsin(np.sqrt(m / num_tiles))))

    sv = _evolve(Statevector.from_int(0, num_tiles), spread)
    probs, angles = [], []
    p, a = snapshot(sv.data, 0)
    probs.append(p)
    angles.append(a)
    for k in range(1, max_pings + 1):
        sv = _evolve(sv, ping)
        p, a = snapshot(sv.data, k)
        # |ψ> and -|ψ> are the same state, so the measured angle is only
        # defined modulo 180°. Pick the representative that continues the
        # rotation smoothly (each ping turns the needle by 2θ) so the
        # compass sweeps past 90° instead of snapping back.
        expected = angles[-1] + 2 * theta
        a += 180.0 * round((expected - a) / 180.0)
        probs.append(p)
        angles.append(a)

    return {
        "probabilities": probs,
        "angles": angles,
        "theta_deg": theta,
        "best_pings": int(np.argmax(probs)),
        "num_targets": m,
    }


# ---------------------------------------------------------------------------
# The Spellsmith workbench (Level 7): gate-level circuit building.
#
# The player builds circuits out of RAW gates (H, X, Z, CZ) on a 2-qubit
# bench (a 4-shell training pool), and we verify their build against the
# real thing. Two kinds of check:
#
#   - "state"   : the player's circuit, run on |00>, must produce the target
#                 state (up to an unobservable global phase). Friendly — any
#                 construction that produces the right state passes.
#   - "unitary" : the player's circuit must equal the reference operation on
#                 EVERY input (up to global phase). This is the honest test
#                 for mark and mirror, which must work on any ocean, not just
#                 the one on screen. Qiskit compares the full unitary, so any
#                 correct construction passes — including ones we never
#                 thought of.
# ---------------------------------------------------------------------------

BENCH_QUBITS = 2  # 4 shells — big enough to be real, small enough to wire by hand
BENCH_MAX_COLS = 24  # generous: the final hunt chains three builds together
SINGLE_GATES = ("h", "x", "z")


def _bench_circuit(columns: list) -> QuantumCircuit:
    """Build a circuit from workbench columns.

    Each column is a list of placements: {"g": "h"|"x"|"z", "q": wire}
    for single-qubit gates, or [{"g": "cz"}] for a controlled-Z spanning
    the column. Gates in one column act at the same time step.
    """
    if not isinstance(columns, list) or len(columns) > BENCH_MAX_COLS:
        raise ValueError(f"columns must be a list of at most {BENCH_MAX_COLS} columns")
    qc = QuantumCircuit(BENCH_QUBITS)
    for col in columns:
        if not isinstance(col, list):
            raise ValueError("each column must be a list of gate placements")
        if not col:
            continue
        if any(isinstance(p, dict) and p.get("g") == "cz" for p in col):
            if len(col) != 1:
                raise ValueError("a controlled-Z takes its whole column")
            qc.cz(0, 1)
            qc.barrier()
            continue
        used: set[int] = set()
        for p in col:
            if not isinstance(p, dict):
                raise ValueError("bad gate placement")
            g, q = p.get("g"), p.get("q")
            if g not in SINGLE_GATES:
                raise ValueError(f"unknown gate {g!r}; bench gates are h, x, z, cz")
            if not isinstance(q, int) or not (0 <= q < BENCH_QUBITS):
                raise ValueError("gate placed on a wire that doesn't exist")
            if q in used:
                raise ValueError("one gate per wire per column")
            used.add(q)
            getattr(qc, g)(q)
        qc.barrier()
    return qc


def _reference_oracle(target: int) -> QuantumCircuit:
    qc = QuantumCircuit(BENCH_QUBITS)
    _oracle(qc, BENCH_QUBITS, target)
    return qc


def _reference_diffusion() -> QuantumCircuit:
    qc = QuantumCircuit(BENCH_QUBITS)
    _diffusion(qc, BENCH_QUBITS)
    return qc


def _bench_check(qc_player: QuantumCircuit, puzzle: str) -> bool:
    """Does the player's circuit solve the puzzle?"""
    if puzzle == "free":
        return False
    if puzzle == "flip":  # move the pearl |00> -> shell 2 (|10>)
        return Statevector.from_instruction(qc_player).equiv(Statevector.from_label("10"))
    if puzzle == "spread":  # |00> -> equal superposition
        ref = QuantumCircuit(BENCH_QUBITS)
        ref.h(range(BENCH_QUBITS))
        return Statevector.from_instruction(qc_player).equiv(Statevector.from_instruction(ref))
    if puzzle.startswith("mark"):
        target = int(puzzle[4:])
        if not (0 <= target < 2**BENCH_QUBITS):
            raise ValueError("bad mark target")
        return Operator(qc_player).equiv(Operator(_reference_oracle(target)))
    if puzzle == "mirror":
        return Operator(qc_player).equiv(Operator(_reference_diffusion()))
    raise ValueError(f"unknown puzzle {puzzle!r}")


def bench(columns: list, puzzle: str = "free", shots: int | None = None) -> dict:
    """Run (and optionally verify) a player-built gate circuit.

    The chart input depends on the puzzle: mark puzzles show the circuit
    acting on the spread state (so the sign flip is visible), the mirror
    puzzle shows it acting on a marked state (so the vault is visible);
    everything else starts from |00>.
    """
    qc_player = _bench_circuit(columns)

    prep = QuantumCircuit(BENCH_QUBITS)
    if puzzle.startswith("mark"):
        prep.h(range(BENCH_QUBITS))
    elif puzzle == "mirror":
        prep.h(range(BENCH_QUBITS))
        _oracle(prep, BENCH_QUBITS, 3)
    full = prep.compose(qc_player)

    amps = real_amplitudes(full)
    probs = amps**2
    out: dict = {
        "amplitudes": [float(a) for a in amps],
        "probabilities": [float(p) for p in probs],
        "num_qubits": BENCH_QUBITS,
        "diagram": str(qc_player.draw(output="text", fold=110)),
        "solved": bool(_bench_check(qc_player, puzzle)),
    }
    if shots is not None:
        if not (1 <= shots <= 10000):
            raise ValueError("shots must be between 1 and 10000")
        p = probs / probs.sum()
        rng = np.random.default_rng()
        counts = rng.multinomial(shots, p)
        out["counts"] = {int(i): int(c) for i, c in enumerate(counts) if c > 0}
        out["shots"] = shots
    return out
