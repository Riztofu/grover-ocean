# 🌊 Grover's Ocean

**A playable curriculum for Grover's quantum search algorithm.** Each level
isolates one conceptual ingredient; by Level 5 the player has assembled the
whole algorithm themselves out of spells they understand.

Built for the **Quantum Unlocked** track ("teach a hard topic through a demo,
visualization, or GUI") at the Qollab × IonQ quantum hackathon.

## The one thing to tell skeptical judges

**Every amplitude on screen comes from a real Qiskit circuit.** The frontend
computes zero quantum math. Each "spell" is a genuine sub-circuit
(`backend/quantum.py`, ~100 lines including comments):

- 🌊 **spread** — Hadamard on every qubit (equal superposition)
- ✒️ **mark** — the oracle: multi-controlled Z that flips the target's sign
- 🪞 **mirror** — the diffusion operator: reflection about the mean

Open **"Under the hood"** on any level to see the live Qiskit circuit diagram
for exactly the state on screen. Measurements ("casting the net") are honest
shots sampled from the circuit's true output distribution — no JavaScript
pretending.

## The levels (1–5 = the complete conceptual arc; 6–7 = the player takes the wheel)

| # | Level | The one idea it teaches |
|---|-------|------------------------|
| 1 | The Old Way | Classical baseline: blind search costs ~N/2 flips. The speedup has to mean something. |
| 2 | Spread the Net | Superposition + the amplitude bar chart. Probability = amplitude², and amplitudes can go negative. Superposition alone = fancy randomness. |
| 3 | Invisible Ink | The oracle flips the target's sign — and measurement can't see it. Kills the "checks everything at once" myth. |
| 4 | The Mirror | Diffusion = reflect across the average. Player *predicts* the reflection by dragging ghost bars before the reveal. |
| 5 | Ping! | mark + mirror = one Grover iteration. Player hunts a fish with sonar pings; ~3 pings beat ~8 classical flips. |
| 6 | Qubit Complete | Free build at the spell level: no recipe, just the three spells and a goal. The player *reinvents* Grover's chain themselves. |
| 7 | The Spellsmith | Free build at the **gate** level: forge spread/mark/mirror out of raw H, X, Z, CZ gates on a 2-wire bench, then hunt with circuits built entirely by hand. mark and mirror are verified as **full unitaries** server-side — any correct construction passes, and a build that only works on one ocean doesn't. On 4 shells, one hand-built ping = a guaranteed catch. |

Each level ends with a **field note** collected into a journal — read top to
bottom, the journal is a complete plain-language explanation of Grover's
algorithm. The game writes its own textbook as you play.

### Stretch roadmap (in priority order)

8. **Don't Overwind** — success probability peaks at ~3 pings for 16 tiles, then *falls* (it's 58% at 4 pings — the backend already computes this). Compass/rotation visualization.
9. **Bigger Oceans** — 64 tiles → ~6 pings, not 4×: discover √N scaling. (Backend already supports up to 256 tiles.)
10. **Two Fish** — multiple targets need *fewer* pings. Oracle change is a few lines.
11. **The Real Ocean (boss)** — no god's-eye heatmap, only a noisy histogram from limited shots. (`/api/sample` with `shots` already does this.)

## Run it

Two terminals:

```bash
# Terminal 1 — quantum backend
cd backend
python3 -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                       # first time only
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install                                           # first time only
npm run dev
```

Open http://localhost:5173. (The Vite dev server proxies `/api` to the
backend, so there's no CORS fuss.)

Or just run `./dev.sh` from the repo root once dependencies are installed.

### Verify the quantum core

```bash
cd backend && python test_quantum.py
```

Expected: after 1 ping P(target) ≈ 0.47, after 2 ≈ 0.91, after 3 ≈ 0.96
(the sweet spot), after 4 ≈ 0.58 (overwound — Level 6 material).

## Architecture

```
backend/
  quantum.py       the ENTIRE quantum side — one small circuit family
  main.py          FastAPI: POST /api/state (amplitudes, probabilities,
                   circuit diagram), POST /api/sample (honest shots)
  test_quantum.py  sanity tests for the math

frontend/          React + Vite + TypeScript + Tailwind
  src/lib/api.ts             backend client (no quantum math in JS!)
  src/lib/levels.ts          level metadata + journal field notes
  src/components/
    AmplitudeChart.tsx       the game's central instrument (amplitude ⇄
                             probability toggle, mean line, draggable
                             ghost-bar predictions for Level 4)
    OceanGrid.tsx            shells / heatmap grid
    Journal.tsx              collected field notes
    UnderTheHood.tsx         live Qiskit circuit diagram panel
    LevelFrame.tsx           shared level chrome + field-note flow
  src/levels/Level1–5.tsx    one file per level
```

A note on phases, for the curious: Grover keeps the statevector real, but
standard gate decompositions add an unobservable global phase. The backend
canonicalizes it so the average amplitude is positive, which makes the bars
match the textbook picture. Probabilities are unaffected (see the docstring
in `quantum.py`).
