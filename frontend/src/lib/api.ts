// Thin client for the FastAPI/Qiskit backend. Nothing quantum is computed
// in the browser — every amplitude on screen came from a real Qiskit circuit.

export type Op = "spread" | "mark" | "mirror";

/** One fish (a tile index) or a whole school (Level 10). */
export type Target = number | number[];

export interface QuantumState {
  amplitudes: number[];
  probabilities: number[];
  numQubits: number;
  diagram: string;
}

export interface SampleResult {
  counts: Record<string, number>;
  shots: number;
}

/** Levels 8-10: P(catch) and the Grover compass angle after 0..maxPings pings. */
export interface Trajectory {
  /** probabilities[k] = chance of catching a fish after k pings */
  probabilities: number[];
  /** angles[k] = the state's angle (degrees) from the "everything else" axis */
  angles: number[];
  /** the half-step: sin θ = √(M/N); each ping rotates by 2θ */
  thetaDeg: number;
  /** the k that maximizes probabilities[k] */
  bestPings: number;
  numTargets: number;
}

/**
 * On Qollab the game runs inside the page with Qiskit in the browser's own
 * Python: qollab/main.js installs a host here that answers the same API
 * (see qollab/host.js + qollab/ocean/bridge.py). Locally this is undefined
 * and every call goes to the FastAPI backend over HTTP.
 */
export interface OceanHost {
  name: string;
  request: (path: string, body: unknown) => Promise<unknown>;
}
declare global {
  interface Window {
    groverOceanHost?: OceanHost;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (typeof window !== "undefined" && window.groverOceanHost) {
    return (await window.groverOceanHost.request(path, body)) as T;
  }
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Backend error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchState(
  numTiles: number,
  target: Target,
  ops: Op[]
): Promise<QuantumState> {
  const raw = await post<{
    amplitudes: number[];
    probabilities: number[];
    num_qubits: number;
    diagram: string;
  }>("/api/state", { num_tiles: numTiles, target, ops });
  return {
    amplitudes: raw.amplitudes,
    probabilities: raw.probabilities,
    numQubits: raw.num_qubits,
    diagram: raw.diagram,
  };
}

export async function fetchSample(
  numTiles: number,
  target: Target,
  ops: Op[],
  shots = 1,
  noise = 0
): Promise<SampleResult> {
  return post<SampleResult>("/api/sample", {
    num_tiles: numTiles,
    target,
    ops,
    shots,
    noise,
  });
}

/** Draw a single measurement outcome (one "net cast"). */
export async function castNet(
  numTiles: number,
  target: Target,
  ops: Op[],
  noise = 0
): Promise<number> {
  const r = await fetchSample(numTiles, target, ops, 1, noise);
  return Number(Object.keys(r.counts)[0]);
}

export async function fetchTrajectory(
  numTiles: number,
  target: Target,
  maxPings: number,
  noise = 0
): Promise<Trajectory> {
  const raw = await post<{
    probabilities: number[];
    angles: number[];
    theta_deg: number;
    best_pings: number;
    num_targets: number;
  }>("/api/trajectory", { num_tiles: numTiles, target, max_pings: maxPings, noise });
  return {
    probabilities: raw.probabilities,
    angles: raw.angles,
    thetaDeg: raw.theta_deg,
    bestPings: raw.best_pings,
    numTargets: raw.num_targets,
  };
}

export async function backendUp(): Promise<boolean> {
  if (typeof window !== "undefined" && window.groverOceanHost) return true;
  try {
    const res = await fetch("/api/health");
    return res.ok;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Qollab only: the backend the judge picked in "Select QPU" (IonQ or local)
// --------------------------------------------------------------------------

export interface HostBackend {
  label: string;
  short: string;
  ionq: boolean;
  paid: boolean;
  noiseModel: string | null;
  qiskit: string;
}

/** null when not running on Qollab (the FastAPI backend has no such route). */
export async function hostBackend(): Promise<HostBackend | null> {
  if (typeof window === "undefined" || !window.groverOceanHost) return null;
  try {
    const raw = (await window.groverOceanHost.request("/api/host", {})) as {
      label: string;
      short: string;
      ionq: boolean;
      paid: boolean;
      noise_model: string | null;
      qiskit: string;
    };
    return { label: raw.label, short: raw.short, ionq: raw.ionq, paid: raw.paid, noiseModel: raw.noise_model, qiskit: raw.qiskit };
  } catch {
    return null;
  }
}

export interface HostRunResult extends SampleResult {
  backend: string;
  seconds: number;
}

/** One measured Grover circuit as ONE job on the Qollab-selected backend. */
export async function runOnHost(
  numTiles: number,
  target: Target,
  ops: Op[],
  shots: number
): Promise<HostRunResult> {
  return post<HostRunResult>("/api/run-on-backend", { num_tiles: numTiles, target, ops, shots });
}

/** Ops for k full Grover iterations ("sonar pings") after a spread. */
export function pingOps(k: number): Op[] {
  const ops: Op[] = ["spread"];
  for (let i = 0; i < k; i++) ops.push("mark", "mirror");
  return ops;
}

/** Is this tile one of the fish? */
export function isTarget(target: Target, tile: number): boolean {
  return Array.isArray(target) ? target.includes(tile) : target === tile;
}

// --------------------------------------------------------------------------
// Level 7 — The Spellsmith: gate-level workbench
// --------------------------------------------------------------------------

export type SingleGate = "h" | "x" | "z";

/** One time-step on the workbench: either a CZ spanning both wires, or
 *  up to one single-qubit gate per wire. */
export interface BenchColumn {
  cz: boolean;
  wires: (SingleGate | null)[]; // index = wire number (0 = the 1s bit)
}

export const emptyBenchColumn = (): BenchColumn => ({ cz: false, wires: [null, null] });

export const emptyBench = (cols: number): BenchColumn[] =>
  Array.from({ length: cols }, emptyBenchColumn);

export function benchIsEmpty(columns: BenchColumn[]): boolean {
  return columns.every((c) => !c.cz && c.wires.every((w) => w === null));
}

/** Convert bench columns to the backend wire format (empty columns dropped). */
function columnsToApi(columns: BenchColumn[]): { g: string; q?: number }[][] {
  const out: { g: string; q?: number }[][] = [];
  for (const col of columns) {
    if (col.cz) {
      out.push([{ g: "cz" }]);
      continue;
    }
    const placements = col.wires.flatMap((g, q) => (g ? [{ g, q }] : []));
    if (placements.length > 0) out.push(placements);
  }
  return out;
}

export interface BenchResult {
  amplitudes: number[];
  probabilities: number[];
  numQubits: number;
  diagram: string;
  solved: boolean;
  counts?: Record<string, number>;
}

export async function fetchBench(
  columns: BenchColumn[],
  puzzle: string,
  shots?: number
): Promise<BenchResult> {
  const raw = await post<{
    amplitudes: number[];
    probabilities: number[];
    num_qubits: number;
    diagram: string;
    solved: boolean;
    counts?: Record<string, number>;
  }>("/api/bench", {
    columns: columnsToApi(columns),
    puzzle,
    ...(shots !== undefined ? { shots } : {}),
  });
  return {
    amplitudes: raw.amplitudes,
    probabilities: raw.probabilities,
    numQubits: raw.num_qubits,
    diagram: raw.diagram,
    solved: raw.solved,
    counts: raw.counts,
  };
}
