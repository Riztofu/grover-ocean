import { useState } from "react";
import type { BenchColumn, SingleGate } from "../lib/api";

/**
 * The Spellsmith's workbench (Level 7): a 2-wire quantum circuit builder.
 *
 * Real quantum circuits don't have free-form wires like digital logic —
 * the no-cloning theorem means a qubit's wire can never fan out. So the
 * canonical layout (used by every real quantum tool) is a grid: each qubit
 * is a horizontal rail, time flows left to right, and gates sit on the
 * rails. CZ spans both rails with a vertical connector.
 *
 * Interaction: pick a tool from the palette, click a cell to place it.
 * Clicking a placed gate with the same tool (or the eraser) removes it.
 */

type Tool = SingleGate | "cz" | "erase";

interface Props {
  columns: BenchColumn[];
  onChange: (columns: BenchColumn[]) => void;
  disabled?: boolean;
}

const TOOL_INFO: { tool: Tool; label: string; tip: string }[] = [
  { tool: "h", label: "H", tip: "Hadamard — spreads one wire's 0 into an equal mix of 0 and 1" },
  { tool: "x", label: "X", tip: "the quantum NOT — flips this wire's bit" },
  { tool: "z", label: "Z", tip: "phase flip — makes the amplitude negative wherever this wire reads 1" },
  { tool: "cz", label: "●─●", tip: "controlled-Z — flips the sign only where BOTH wires read 1" },
  { tool: "erase", label: "🧽", tip: "eraser — remove a gate" },
];

const GATE_COLOR: Record<SingleGate, string> = {
  h: "bg-cyan-400 text-[#06283d]",
  x: "bg-amber-300 text-[#06283d]",
  z: "bg-rose-300 text-[#06283d]",
};

// display rows top→bottom; wire 1 (the 2s bit) on top so shell # reads naturally
const WIRE_ROWS = [1, 0];
const WIRE_LABEL: Record<number, string> = { 1: "wire B · the 2s bit", 0: "wire A · the 1s bit" };

export default function CircuitBench({ columns, onChange, disabled = false }: Props) {
  const [tool, setTool] = useState<Tool>("h");

  function clickCell(col: number, wire: number) {
    if (disabled) return;
    const next = columns.map((c) => ({ cz: c.cz, wires: [...c.wires] }));
    const c = next[col];
    if (tool === "erase") {
      c.cz = false;
      c.wires[wire] = null;
    } else if (tool === "cz") {
      const was = c.cz;
      c.cz = !was;
      if (c.cz) c.wires = [null, null]; // CZ takes the whole column
    } else {
      if (c.cz) c.cz = false;
      c.wires[wire] = c.wires[wire] === tool ? null : tool;
    }
    onChange(next);
  }

  function clearAll() {
    if (disabled) return;
    onChange(columns.map(() => ({ cz: false, wires: [null, null] })));
  }

  return (
    <div className="rounded-xl border border-cyan-800/50 bg-black/25 p-3">
      {/* palette */}
      <div className="flex gap-2 items-center flex-wrap mb-3">
        <span className="text-xs uppercase tracking-wide text-cyan-300/70 font-bold">
          Gate palette:
        </span>
        {TOOL_INFO.map(({ tool: t, label, tip }) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            disabled={disabled}
            title={tip}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold border transition disabled:opacity-40 ${
              tool === t
                ? "bg-cyan-100 text-[#06283d] border-cyan-100"
                : "bg-cyan-900/40 text-cyan-100 border-cyan-700/60 hover:bg-cyan-800/60"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={clearAll}
          disabled={disabled}
          className="ml-auto text-xs underline text-cyan-300 hover:text-white disabled:opacity-40"
        >
          clear bench
        </button>
      </div>

      {/* the rails */}
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          {WIRE_ROWS.map((wire) => (
            <div key={wire} className="flex items-center gap-0">
              <div className="w-32 shrink-0 text-right pr-3 text-[11px] text-cyan-200/70 font-mono">
                {WIRE_LABEL[wire]}
              </div>
              {columns.map((col, i) => {
                const g = col.wires[wire];
                return (
                  <div key={i} className="relative flex-1 min-w-[52px] h-14 flex items-center justify-center">
                    {/* the qubit rail */}
                    <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-cyan-600/60" />
                    {/* CZ vertical connector (drawn once, from the top row) */}
                    {col.cz && wire === WIRE_ROWS[0] && (
                      <div className="absolute left-1/2 top-1/2 w-[2px] h-14 bg-amber-300 -translate-x-1/2" />
                    )}
                    <button
                      onClick={() => clickCell(i, wire)}
                      disabled={disabled}
                      className={`relative z-10 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black transition
                        ${
                          col.cz
                            ? "text-amber-300 text-2xl"
                            : g
                              ? `${GATE_COLOR[g]} shadow`
                              : "border border-dashed border-cyan-700/40 text-cyan-700/60 hover:border-cyan-400/70 hover:text-cyan-400/70"
                        } disabled:cursor-default`}
                      title={col.cz ? "controlled-Z" : (g ?? "empty — click to place the selected gate")}
                    >
                      {col.cz ? "●" : g ? g.toUpperCase() : "+"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          {/* time arrow */}
          <div className="flex items-center mt-1">
            <div className="w-32 shrink-0" />
            <div className="flex-1 text-[10px] text-cyan-200/40 text-center">
              time → (gates fire left to right; shell # = 2×B + A)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
