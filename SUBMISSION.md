# Qollab × IonQ Hackathon — submission notes

Everything the captain needs to paste into the Qollab submission form, plus
the demo-video narration. Track: **Quantum Unlocked** (teach a hard topic
through a demo, visualization or GUI).

## Tagline

> **Grover's Ocean** — a game where you *build* Grover's quantum search with
> your own hands, one spell at a time. Every number on screen is a real
> Qiskit circuit; the finale casts the net on IonQ's simulator.

## Description (short)

Grover's Ocean teaches Grover's search algorithm by having the player
assemble it from parts they understand. A pearl hides under one of 16
shells. Level 1 shows blind classical search costs ~8 flips. Then the
player earns three "spells" — **spread** (Hadamard on every qubit),
**mark** (the oracle, a multi-controlled Z) and **mirror** (diffusion) —
one per level, each level killing one specific misconception: superposition
alone is just randomness; the oracle's mark is invisible to measurement;
reflection about the mean is what makes it visible. By Level 5 the player
has *reinvented* Grover's iteration; by Level 7 they have forged each spell
out of raw H, X, Z and CZ gates on a circuit bench, verified as full
unitaries. Act III goes where tutorials stop: **overwinding** (3 pings = 96%,
4 pings = 58%, 6 pings = 2%, shown on a "Grover compass"), **√N scaling**
discovered by hand on 64- and 256-tile oceans, **multiple targets** (a
school of four fish is a certain catch in one ping), and a **boss level** on
a "real" machine: no amplitudes, only shots, a budget, and a depolarizing
noise model that drags the sweet spot earlier.

The frontend computes zero quantum math. A FastAPI backend builds every
circuit in Qiskit, computes exact statevectors, and samples honest shots.
"Under the hood" shows the live circuit diagram on every level. The
Qollab-runnable script (`main.py`) condenses the whole
curriculum into one file and ends by submitting one measured Grover circuit
as one job to IonQ's simulator — optionally through a real device noise
model.

## How it maps to the judging traits

- **Novelty & creativity** — not a visualization *of* the algorithm but a
  game in which the player reinvents it; the journal of "field notes" is a
  complete textbook the player wrote by playing. The Grover compass and
  ping curve make overwinding and √N tangible. A gate-level forge verifies
  the player's circuits as unitaries.
- **Technical execution** — every amplitude from Qiskit; an exact fast
  evaluator (mcx as its permutation matrix) verified against Qiskit's
  reference simulator; multi-target oracles; a trajectory endpoint; an
  honest depolarizing noise model; one-job IonQ runs; three test groups;
  a headless-browser playthrough of all 11 levels.
- **Impact potential** — zero-prerequisite on-ramp to the single most
  explained-and-misunderstood quantum algorithm; usable in classrooms and
  outreach; the "textbook you wrote by playing" idea generalizes to other
  algorithms (amplitude amplification, phase estimation).
- **Documentation quality** — README as project page, per-level table of
  "the one idea it teaches", architecture map, run instructions for the
  game and for Qollab/IonQ, this file, and in-game plain-language glossary.

## Built during the hackathon / prior work

All code was written inside the build window (Oct 10–11, 2026 ET): Levels
1–7 and the Qiskit backend on Oct 10; Act III (Levels 8–11), the fast
evaluator, trajectory/noise APIs, the Qollab/IonQ script and this
documentation on Oct 11. No prior repo, template or tutorial code was
used. Dependencies: Qiskit, qiskit-ionq, NumPy, FastAPI, uvicorn, React,
Vite, Tailwind. An AI coding assistant (Claude Code) was used as a pair
programmer throughout; all design, verification and testing decisions are
the team's.

## Links to fill in

- Repository: https://github.com/Riztofu/grover-ocean
- Demo video (2–3 min, public): **TODO — upload `docs/demo/grovers-ocean-demo.webm` to YouTube/Loom and paste the link**
- Qollab project: the runnable entry point is `main.py`

## Demo-video narration (≈ 2½ minutes)

Read this over the screen recording in `docs/demo/`.

1. *(welcome screen, 0:00)* "A pearl is hiding under one of sixteen
   shells. Grover's Ocean teaches you — by playing — how a quantum computer
   finds it faster than any classical search. You need zero background."
2. *(Level 1, 0:10)* "First, the old way: flip shells one at a time. About
   eight flips on average. That's the number to beat."
3. *(Level 2, 0:20)* "Spread the net — a Hadamard on each of four qubits.
   Every shell gets the same amplitude. But casting the net just picks a
   random shell. Superposition alone is fancy randomness."
4. *(Level 3, 0:35)* "The oracle marks the pearl by flipping its amplitude
   negative — and probability is amplitude squared, so the mark is
   invisible. A quantum computer does not 'check everything at once'."
5. *(Level 4–5, 0:50)* "The mirror reflects every bar across the average.
   The negative bar vaults. Mark plus mirror is one sonar ping; three pings
   and the fish is at 96 percent. You just built Grover's algorithm."
6. *(Level 7, 1:05)* "Then you forge the spells from raw gates on a circuit
   bench. Your circuit is verified as a full unitary — any correct build
   passes."
7. *(Level 8, 1:20)* "Now where tutorials stop. Ping a fourth time: it
   drops. A sixth: two percent, worse than guessing. The compass shows why
   — every ping is the same fixed rotation, and past the top it swings
   back out."
8. *(Level 9, 1:40)* "Sixty-four tiles need six pings, 256 need twelve.
   Four times the ocean, twice the pings. That's square-root-N, found by
   hand."
9. *(Level 10, 1:55)* "Four fish in sixteen tiles: one ping, a certain
   catch. More answers, fewer pings."
10. *(Level 11, 2:05)* "The boss: no heatmap, only shots and a budget, then
    choppy seas with a real noise model. Tally marks, declare, caught."
11. *(Qollab script, 2:25)* "Every amplitude came from a Qiskit circuit —
    open 'under the hood' on any level — and the standalone script casts the
    final net as one job on IonQ's simulator. Grover's Ocean."
