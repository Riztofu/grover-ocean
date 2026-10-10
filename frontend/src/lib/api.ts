// Thin client for the FastAPI/Qiskit backend. Nothing quantum is computed
// in the browser — every amplitude on screen came from a real Qiskit circuit.

export type Op = "spread" | "mark" | "mirror";

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

async function post<T>(path: string, body: unknown): Promise<T> {
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
  target: number,
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
  target: number,
  ops: Op[],
  shots = 1
): Promise<SampleResult> {
  return post<SampleResult>("/api/sample", {
    num_tiles: numTiles,
    target,
    ops,
    shots,
  });
}

/** Draw a single measurement outcome (one "net cast"). */
export async function castNet(
  numTiles: number,
  target: number,
  ops: Op[]
): Promise<number> {
  const r = await fetchSample(numTiles, target, ops, 1);
  return Number(Object.keys(r.counts)[0]);
}

export async function backendUp(): Promise<boolean> {
  try {
    const res = await fetch("/api/health");
    return res.ok;
  } catch {
    return false;
  }
}

/** Ops for k full Grover iterations ("sonar pings") after a spread. */
export function pingOps(k: number): Op[] {
  const ops: Op[] = ["spread"];
  for (let i = 0; i < k; i++) ops.push("mark", "mirror");
  return ops;
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
