"""Optional IonQ backend for the local game, via qiskit-ionq.

Set IONQ_API_KEY and the game grows a "☁️ Cast on IonQ" button (Levels 5
and 11): the same Grover circuit the player built is measured as ONE job on
IonQ's cloud simulator, and the real shots land in the game next to the
exact ones. Set IONQ_NOISE_MODEL (e.g. "aria-1", "forte-1") to sample
through a real device's noise model — the boss level's "choppy sea", for
real. Set IONQ_BACKEND=ionq_qpu to use hardware (costs credits).

On Qollab the equivalent lives in qollab/ocean/bridge.py, using the backend
the judge picked in Select QPU.
"""

import os
import time

from qiskit import __version__ as QISKIT_VERSION
from qiskit import transpile

import quantum

# IonQ's QIS gate set; the multi-controlled gates decompose into it
QIS_BASIS = ["x", "y", "z", "h", "s", "sdg", "t", "tdg", "rx", "ry", "rz", "cx", "swap"]

_backend = None


def available() -> bool:
    if not os.environ.get("IONQ_API_KEY"):
        return False
    try:
        import qiskit_ionq  # noqa: F401
    except ImportError:
        return False
    return True


def _get_backend():
    global _backend
    if _backend is None:
        from qiskit_ionq import IonQProvider

        _backend = IonQProvider(os.environ["IONQ_API_KEY"]).get_backend(os.environ.get("IONQ_BACKEND", "ionq_simulator"))
    return _backend


def describe() -> dict:
    name = os.environ.get("IONQ_BACKEND", "ionq_simulator")
    noise = os.environ.get("IONQ_NOISE_MODEL", "ideal")
    paid = "qpu" in name
    label = ("IonQ QPU (" + name + ")") if paid else ("IonQ simulator" + (f" · {noise} noise model" if noise != "ideal" else ""))
    return {"name": name, "label": label, "short": "IonQ", "ionq": True, "paid": paid, "noise_model": None if paid else noise, "qiskit": QISKIT_VERSION}


def run(num_tiles: int, target, ops: list[str], shots: int) -> dict:
    """ONE measured Grover circuit as ONE IonQ job; counts keyed by tile index."""
    if not (1 <= shots <= 1000):
        raise ValueError("shots must be between 1 and 1000")
    qc = quantum.build_circuit(num_tiles, target, ops)
    qc.measure_all()
    tqc = transpile(qc, basis_gates=QIS_BASIS, optimization_level=1)
    backend = _get_backend()
    options = {"shots": shots}
    noise = os.environ.get("IONQ_NOISE_MODEL")
    if noise and not describe()["paid"]:
        options["noise_model"] = noise
    started = time.time()
    raw = backend.run(tqc, **options).result().get_counts()
    if isinstance(raw, list):
        raw = raw[0]
    counts: dict[int, int] = {}
    for key, value in raw.items():
        text = str(key).replace(" ", "")
        tile = int(text, 2) if text and set(text) <= {"0", "1"} else int(text, 0)
        if 0 <= tile < num_tiles:
            counts[tile] = counts.get(tile, 0) + int(round(value))
    return {"counts": counts, "shots": shots, "backend": describe()["label"], "seconds": round(time.time() - started, 2)}
