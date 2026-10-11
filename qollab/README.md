# 🌊 Grover's Ocean

A pearl is hiding under one of sixteen shells. Grover's Ocean is a game that teaches you — by playing, not reading — how a quantum computer finds it faster than any ordinary computer ever could. You earn three "spells" (spread, mark, mirror), discover that they chain into Grover's algorithm, forge them from raw gates, learn when to stop, discover √N scaling by hand, and finish by landing a fish on a noisy machine with nothing but measurement tallies. Zero quantum background needed: Coral the crab explains every click.

This effort is supported by Qollab & IonQ.

🎬 **Demo video (2–3 min):** _add your public video link here_
💻 **Source:** https://github.com/Riztofu/grover-ocean

We entered **Quantum Unlocked**. The game teaches Grover's search algorithm end to end — including the parts explainers skip: overwinding, √N scaling, multiple targets, and what real hardware actually hands you.

## Try it

1. Press **Run** and pick a backend in **Select QPU** — the free **Built-in simulator** starts instantly; an **IonQ simulator** lets the last level cast the net on IonQ's cloud. The game loads above the console.
2. Play from **Level 1**. Each level ends with a 📓 **field note**; the journal of notes is a complete plain-language explanation of Grover's algorithm, written by you playing. Levels unlock in order; progress is kept in your browser.
3. Open **🔧 Under the hood** on any level to see the live Qiskit circuit whose statevector you are looking at.
4. In **Level 11 (The Real Ocean)**, press **☁️ Cast on IonQ**: the same expedition is sent as **one job** to the backend you picked, and the real shots land on the tally grid next to the simulated ones. IonQ allows one job per Run — press **Stop**, then **Run**, to cast again.

## The levels

| Act | # | Level | The one idea it teaches |
|---|---|---|---|
| I · Learn | 1 | The Old Way | Blind classical search costs ~N/2 flips. |
| | 2 | Spread the Net | Superposition; probability = amplitude²; superposition alone is fancy randomness. |
| | 3 | Invisible Ink | The oracle flips the target's sign — and measurement can't see it. |
| | 4 | The Mirror | Diffusion = reflect across the average. You predict it before the reveal. |
| | 5 | Ping! | mark + mirror = one Grover iteration; ~3 pings beat ~8 flips. |
| II · Build | 6 | Qubit Complete | No recipe, just the spells — you reinvent Grover's chain. |
| | 7 | The Spellsmith | Forge the spells from raw H, X, Z, CZ gates; verified as full unitaries. |
| III · Master | 8 | Don't Overwind | 96% → 58% → 2%: the Grover compass and the ping curve. |
| | 9 | Bigger Oceans | 16 → 3, 64 → 6, 256 → 12 pings: √N, found by hand. |
| | 10 | Two Fish | More answers need fewer pings; four fish = a certain catch in one ping. |
| | 11 | The Real Ocean | Boss: no heatmap, limited shots, choppy seas (a real depolarizing model) — and a cast on IonQ. |

## How it works

- **Every amplitude on screen is a real Qiskit circuit.** The game's JavaScript computes no quantum math. On Qollab, `ocean/quantum.py` (the same file as the project's FastAPI backend) runs in the browser's Python: it builds each circuit (spread = H on every qubit; mark = a multi-controlled Z per fish; mirror = the diffusion operator), evolves the exact statevector, and samples honest shots. An exact fast evaluator applies the multi-controlled gate as its permutation matrix, verified identical to Qiskit's reference simulator, so even 256-tile oceans update instantly.
- **The Grover compass** (Levels 8–10) reads its angle straight off the statevector: each ping is a rotation by 2θ with sin θ = √(M/N), and the catch chance is sin² of the needle. The **ping curve** is computed from one statevector pass.
- **Choppy seas** (Level 11) is a global depolarizing channel per iteration — the textbook model — which drags the sweet spot from 6 pings to ~5 and the peak from 99.7% to ~64% on 64 tiles.
- **One job per Run on IonQ:** the boss level's cast builds one measured Grover circuit (spread, then your pings, then measure) and sends it once; the host refuses a second IonQ job in the same Run and tells you to Stop and Run again.

## Files

| File | Role |
| --- | --- |
| `index.html` | The page; the game mounts into `#root` |
| `main.js` | Qollab entry: connects Qiskit (`ocean.bridge`) and the selected backend, then loads the game |
| `host.js` | Answers the game's backend API inside the page; enforces one IonQ job per Run |
| `assets/app.js`, `assets/index.css` | The game (React), built from `frontend/` in the source repo |
| `ocean/quantum.py` | The entire quantum side: spells, exact evaluator, ping curves, noise model, the Level 7 gate-bench verifier |
| `ocean/bridge.py` | JSON bridge from JavaScript; runs the one-job cast on the selected backend |
| `main.py` | Text-mode version of the whole curriculum (`python main.py`), ending with one IonQ job via qiskit-ionq |

Dependencies: Qiskit and NumPy (preinstalled on Qollab). No API keys or secrets.

## Credits and disclosure

- **Team:** _add names_.
- **Built during the hackathon window** (Oct 10–11, 2026 ET; the window opened Oct 9, 19:00 ET). No prior repository, template or tutorial code. Development was assisted by an AI coding tool (Anthropic Claude Code); all design, verification and testing decisions are the team's. Full history: https://github.com/Riztofu/grover-ocean
- **License:** MIT (see `LICENSE`).
