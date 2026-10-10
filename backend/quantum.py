"""
The ENTIRE quantum side of Grover's Ocean lives in this one file.

Every "spell" in the game is a real Qiskit sub-circuit:

  - "spread" = Hadamard on every qubit  -> equal superposition
  - "mark"   = the oracle               -> flips the SIGN of the target's amplitude
  - "mirror" = the diffusion operator   -> reflects every amplitude across the average

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
from qiskit.quantum_info import Statevector

VALID_OPS = ("spread", "mark", "mirror")
MAX_TILES = 256  # 8 qubits is plenty for the game


def _validate(num_tiles: int, target: int, ops: list[str]) -> int:
    """Validate a request and return the number of qubits."""
    if num_tiles < 4 or num_tiles > MAX_TILES:
        raise ValueError(f"num_tiles must be between 4 and {MAX_TILES}")
    n = int(np.log2(num_tiles))
    if 2**n != num_tiles:
        raise ValueError("num_tiles must be a power of 2")
    if not (0 <= target < num_tiles):
        raise ValueError("target must be a valid tile index")
    for op in ops:
        if op not in VALID_OPS:
            raise ValueError(f"unknown op {op!r}; valid ops are {VALID_OPS}")
    if len(ops) > 64:
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


def build_circuit(num_tiles: int, target: int, ops: list[str]) -> QuantumCircuit:
    """Build the circuit for a sequence of game ops."""
    n = _validate(num_tiles, target, ops)
    qc = QuantumCircuit(n)
    for op in ops:
        if op == "spread":
            qc.h(range(n))
        elif op == "mark":
            _oracle(qc, n, target)
        elif op == "mirror":
            _diffusion(qc, n)
        qc.barrier()
    return qc


def real_amplitudes(qc: QuantumCircuit) -> np.ndarray:
    """Exact statevector as real amplitudes (global phase canonicalized)."""
    vec = Statevector.from_instruction(qc).data
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


def state(num_tiles: int, target: int, ops: list[str]) -> dict:
    """Amplitudes, probabilities and the circuit diagram for a sequence of ops."""
    qc = build_circuit(num_tiles, target, ops)
    amps = real_amplitudes(qc)
    return {
        "amplitudes": [float(a) for a in amps],
        "probabilities": [float(a * a) for a in amps],
        "num_qubits": qc.num_qubits,
        "diagram": str(qc.draw(output="text", fold=110)),
    }


def sample(num_tiles: int, target: int, ops: list[str], shots: int) -> dict:
    """Sample measurement outcomes (shots) from the circuit's true distribution."""
    if not (1 <= shots <= 10000):
        raise ValueError("shots must be between 1 and 10000")
    qc = build_circuit(num_tiles, target, ops)
    probs = real_amplitudes(qc) ** 2
    probs = probs / probs.sum()  # guard against float drift
    rng = np.random.default_rng()
    counts = rng.multinomial(shots, probs)
    return {
        "counts": {int(i): int(c) for i, c in enumerate(counts) if c > 0},
        "shots": shots,
    }
