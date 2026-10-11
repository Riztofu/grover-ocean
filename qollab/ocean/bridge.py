"""JSON bridge between the game's JavaScript and ocean/quantum.py, on Qollab.

The game normally talks to a FastAPI backend (backend/main.py). On Qollab
there is no server: qollab/main.js installs a host (qollab/host.js) that
routes the very same API paths to the functions below, which run in
Qollab's in-browser Python with Qiskit preinstalled. ocean/quantum.py is a
verbatim copy of backend/quantum.py — every amplitude is still a real
Qiskit circuit, now computed inside the page.

Every function takes and returns JSON text, {"ok": true, "data": ...} or
{"ok": false, "status": 400, "detail": "..."}, so nothing depends on proxy
conversion and errors surface in the game instead of breaking it.

`backend` is the Qiskit backend Qollab pre-creates from the Select QPU
dialog. IonQ backends accept ONE job per Run, so run_on_backend() sends a
single measured Grover circuit — the boss level's "cast on IonQ".
"""

import json
import time

from qiskit import __version__ as QISKIT_VERSION
from qiskit import transpile

from . import quantum

QIS_BASIS = ["x", "y", "z", "h", "s", "sdg", "t", "tdg", "rx", "ry", "rz", "cx", "swap"]


def _respond(function, payload_json="{}"):
    try:
        return json.dumps({"ok": True, "data": function(json.loads(payload_json))})
    except ValueError as error:  # bad request, or malformed JSON
        return json.dumps({"ok": False, "status": 400, "detail": str(error)})
    except Exception as error:  # noqa: BLE001 — report, never break the game
        return json.dumps({"ok": False, "status": 502, "detail": "{}: {}".format(type(error).__name__, error)[:400]})


def _ops(data):
    ops = data.get("ops", [])
    if not isinstance(ops, list) or not all(isinstance(o, str) for o in ops):
        raise ValueError("ops must be a list of spell names")
    return ops


# ---- the game's API, 1:1 with backend/main.py ---------------------------------

def state(payload_json):
    return _respond(lambda d: quantum.state(int(d.get("num_tiles", 16)), d["target"], _ops(d)), payload_json)


def sample(payload_json):
    return _respond(
        lambda d: quantum.sample(int(d.get("num_tiles", 16)), d["target"], _ops(d), int(d.get("shots", 1)), float(d.get("noise", 0.0))),
        payload_json,
    )


def trajectory(payload_json):
    return _respond(
        lambda d: quantum.trajectory(int(d.get("num_tiles", 16)), d["target"], int(d.get("max_pings", 8)), float(d.get("noise", 0.0))),
        payload_json,
    )


def bench(payload_json):
    return _respond(lambda d: quantum.bench(d.get("columns", []), d.get("puzzle", "free"), d.get("shots")), payload_json)


# ---- the Qollab-selected backend --------------------------------------------

def _name(backend):
    name = getattr(backend, "name", "backend")
    return str(name() if callable(name) else name)


def _info(backend):
    name = _name(backend)
    lowered = name.lower()
    ionq = "ionq" in lowered
    paid = ionq and "qpu" in lowered and "sim" not in lowered
    noise = None
    if ionq and not paid:
        try:
            noise = getattr(backend.options, "noise_model", None)
        except AttributeError:
            noise = None
    if paid:
        label = "IonQ " + name.split(".", 1)[-1].replace("-", " ").title() + " QPU"
    elif ionq:
        label = "IonQ simulator" + (" · {} noise model".format(noise) if noise and noise != "ideal" else "")
    else:
        label = name.replace("_", " ")
    short = ("IonQ " + name.split(".", 1)[-1].replace("-", " ").title()) if paid else "IonQ" if ionq else "simulator"
    return {"name": name, "label": label, "short": short, "ionq": ionq, "paid": paid, "noise_model": noise, "qiskit": QISKIT_VERSION}


def describe(backend):
    return _respond(lambda _: _info(backend))


def _measured_circuit(d):
    num_tiles = int(d.get("num_tiles", 16))
    qc = quantum.build_circuit(num_tiles, d["target"], _ops(d))
    qc.measure_all()
    return qc, num_tiles


def _run(backend, d):
    info = _info(backend)
    shots = int(d.get("shots", 8))
    if not (1 <= shots <= 1000):
        raise ValueError("shots must be between 1 and 1000")
    qc, num_tiles = _measured_circuit(d)
    if info["ionq"]:
        tqc = transpile(qc, basis_gates=QIS_BASIS, optimization_level=1)
    else:
        try:
            tqc = transpile(qc, backend=backend, optimization_level=1)
        except Exception:  # noqa: BLE001
            tqc = transpile(qc, basis_gates=QIS_BASIS, optimization_level=1)
    started = time.time()
    job = backend.run(tqc, shots=shots)
    raw = job.result().get_counts()
    if isinstance(raw, list):
        raw = raw[0]
    counts = {}
    for key, value in raw.items():
        text = str(key).replace(" ", "")
        tile = int(text, 2) if text and set(text) <= {"0", "1"} else int(text, 0)
        if 0 <= tile < num_tiles:
            counts[int(tile)] = counts.get(int(tile), 0) + int(round(value))
    return {"counts": counts, "shots": shots, "backend": info["label"], "seconds": round(time.time() - started, 2)}


def run_on_backend(backend, payload_json):
    """ONE measured Grover circuit as ONE job on the Qollab-selected backend."""
    return _respond(lambda d: _run(backend, d), payload_json)
