import { useRef } from "react";

export type ChartView = "amplitude" | "probability";

export interface GhostControl {
  /** which bar is the marked one */
  markedIndex: number;
  /** predicted amplitude for the 15 ordinary bars (they move together) */
  ordinary: number;
  /** predicted amplitude for the marked bar */
  marked: number;
  onChange: (which: "ordinary" | "marked", value: number) => void;
}

interface Props {
  amplitudes: number[] | null;
  view: ChartView;
  highlight?: number | null;
  /** several highlighted bars at once (a school of fish, Level 10) */
  highlights?: number[];
  /** draw a dashed line at the average amplitude (amplitude view only) */
  showMean?: boolean;
  /** Level 4: draggable prediction bars */
  ghost?: GhostControl;
  /** how many bars to draw when there is no state yet */
  emptyBars?: number;
}

const W = 680;
const H = 300;
const PAD = { top: 16, right: 14, bottom: 30, left: 46 };

export default function AmplitudeChart({
  amplitudes,
  view,
  highlight = null,
  highlights,
  showMean = false,
  ghost,
  emptyBars = 16,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<"ordinary" | "marked" | null>(null);

  const n = amplitudes?.length ?? emptyBars;
  const values = amplitudes
    ? view === "amplitude"
      ? amplitudes
      : amplitudes.map((a) => a * a)
    : new Array(n).fill(0);
  const isHighlighted = (i: number) => i === highlight || (highlights?.includes(i) ?? false);

  // y-axis domain
  const maxAbs = Math.max(0.3, ...values.map((v) => Math.abs(v)), ...(ghost ? [Math.abs(ghost.ordinary), Math.abs(ghost.marked)] : []));
  const yMax = view === "amplitude" ? Math.min(1, maxAbs * 1.2) : Math.min(1, maxAbs * 1.2);
  const yMin = view === "amplitude" ? -yMax : 0;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yOf = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * plotH;
  const valOf = (y: number) => yMax - ((y - PAD.top) / plotH) * (yMax - yMin);
  const barW = plotW / n;
  const xOf = (i: number) => PAD.left + i * barW;
  // big oceans: thinner gaps so 256 bars still read as a solid skyline
  const inset = n <= 16 ? 0.12 : n <= 64 ? 0.15 : 0.05;
  // and only label every so-many bars
  const labelEvery = n <= 16 ? 1 : n <= 64 ? 4 : 16;

  const zeroY = yOf(0);
  const mean = amplitudes ? amplitudes.reduce((s, a) => s + a, 0) / n : 0;

  // --- ghost dragging ------------------------------------------------------
  function clientYToValue(clientY: number): number {
    const rect = svgRef.current!.getBoundingClientRect();
    const y = ((clientY - rect.top) / rect.height) * H;
    return Math.max(yMin, Math.min(yMax, valOf(y)));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !ghost) return;
    ghost.onChange(dragging.current, clientYToValue(e.clientY));
  }
  function startDrag(which: "ordinary" | "marked") {
    return (e: React.PointerEvent) => {
      dragging.current = which;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
  }
  function endDrag() {
    dragging.current = null;
  }

  // gridline values
  const ticks: number[] = [];
  const step = yMax > 0.5 ? 0.25 : 0.1;
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full select-none"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {/* gridlines + axis labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(t)}
            y2={yOf(t)}
            stroke={t === 0 ? "#9fd8ef" : "#1b4a63"}
            strokeWidth={t === 0 ? 1.5 : 1}
          />
          <text x={PAD.left - 6} y={yOf(t) + 4} textAnchor="end" fontSize={11} fill="#7fb8d4">
            {t.toFixed(2)}
          </text>
        </g>
      ))}

      {/* bars */}
      {values.map((v, i) => {
        const top = Math.min(yOf(v), zeroY);
        const h = Math.abs(yOf(v) - zeroY);
        const isHl = isHighlighted(i);
        const fill =
          v < 0 ? "#f59e9e" : isHl ? "#ffd166" : "#3fc1c9";
        return (
          <rect
            key={i}
            className="amp-bar"
            x={xOf(i) + barW * inset}
            width={barW * (1 - 2 * inset)}
            y={top}
            height={Math.max(h, 0.5)}
            rx={n <= 64 ? 3 : 0}
            fill={fill}
            opacity={isHl ? 1 : 0.88}
          />
        );
      })}

      {/* mean line */}
      {showMean && view === "amplitude" && amplitudes && (
        <g>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(mean)}
            y2={yOf(mean)}
            stroke="#ffd166"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text x={W - PAD.right} y={yOf(mean) - 6} textAnchor="end" fontSize={11} fill="#ffd166">
            average = {mean.toFixed(3)}
          </text>
        </g>
      )}

      {/* ghost prediction bars (Level 4) */}
      {ghost &&
        view === "amplitude" &&
        values.map((_, i) => {
          const gv = i === ghost.markedIndex ? ghost.marked : ghost.ordinary;
          const top = Math.min(yOf(gv), zeroY);
          const h = Math.abs(yOf(gv) - zeroY);
          return (
            <rect
              key={`g${i}`}
              x={xOf(i) + barW * 0.12}
              width={barW * 0.76}
              y={top}
              height={Math.max(h, 0.5)}
              fill="none"
              stroke={i === ghost.markedIndex ? "#ffd166" : "#dff6ff"}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.8}
            />
          );
        })}

      {/* drag handles for ghosts */}
      {ghost && view === "amplitude" && (
        <>
          <circle
            cx={PAD.left + plotW * 0.35}
            cy={yOf(ghost.ordinary)}
            r={9}
            fill="#dff6ff"
            stroke="#06283d"
            strokeWidth={2}
            style={{ cursor: "ns-resize" }}
            onPointerDown={startDrag("ordinary")}
          />
          <circle
            cx={xOf(ghost.markedIndex) + barW / 2}
            cy={yOf(ghost.marked)}
            r={9}
            fill="#ffd166"
            stroke="#06283d"
            strokeWidth={2}
            style={{ cursor: "ns-resize" }}
            onPointerDown={startDrag("marked")}
          />
        </>
      )}

      {/* x labels — highlighted bars always get one; regular labels step aside for them */}
      {values.map((_, i) =>
        isHighlighted(i) ||
        (i % labelEvery === 0 &&
          !(highlights ?? (highlight !== null ? [highlight] : [])).some(
            (h) => h !== i && Math.abs(h - i) < labelEvery / 2
          )) ? (
          <text
            key={`x${i}`}
            x={xOf(i) + barW / 2}
            y={H - 10}
            textAnchor="middle"
            fontSize={10}
            fontWeight={isHighlighted(i) ? 700 : 400}
            fill={isHighlighted(i) ? "#ffd166" : "#7fb8d4"}
          >
            {i}
          </text>
        ) : null
      )}
    </svg>
  );
}
