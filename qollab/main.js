// Grover's Ocean — Qollab entry point (JS / Qiskit project).
// The game is a React app (assets/app.js, built from frontend/); every amplitude it shows is
// computed by Qiskit running in Qollab's in-browser Python (ocean/bridge.py → ocean/quantum.py).
// The boss level's "cast on …" button sends ONE measured Grover circuit as ONE job to the
// backend you picked in Select QPU. The game stays live above this console until you press Stop.
import * as bridge from 'ocean.bridge';
import { createHost } from './host.js';

console.log("🌊 Grover's Ocean is loading Qiskit…");
window.groverOceanHost = createHost(bridge, backend);

const info = await window.groverOceanHost.request('/api/host', {});
await import('./assets/app.js');

console.log(`Ready — Qiskit ${info.qiskit}, backend: ${info.label}. Play in the page above.`);
console.log(info.ionq
  ? 'Level 11 (The Real Ocean) can cast the net on IonQ: one job per Run. Press Stop, then Run, to cast again.'
  : 'Pick an IonQ simulator in Select QPU (Stop, then Run) to cast Level 11’s net on IonQ’s cloud.');
console.log('Progress is kept in this browser’s localStorage; nothing else is saved between Runs. Press Stop to end.');

await new Promise(() => {}); // keep the Run (and Qiskit) alive while you play
