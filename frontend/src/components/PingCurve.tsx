/**
 * The ping curve: P(catch) as a function of how many sonar pings you've
 * done. This is the instrument for Levels 8-10 — it is what makes
 * "overwinding" visible, and overlaying curves for different ocean sizes
 * (or schools of fish) is how the player discovers the √N law.
 *
 * Points beyond `revealed` are hidden: the player uncovers the curve by
 * pinging, so the drop after the peak lands as a surprise, not a spoiler.
 */

export interface CurveSeries {
  label: string;
  color: string;
  /** probabilities[k] = chance of a catch after k pings (from /api/trajectory) */
  probabilities: number[];
  /** draw k = 0..revealed (pass Infinity to show the whole curve) */
  revealed: number;
}

interface Props {
  series: CurveSeries[];
  /** x-axis extent (in pings) */
  maxK: number;
  /** highlight this k on every series */
  currentK?: number | null;
  /** dashed horizontal guide, e.g. a catch-chance goal */
  goal?: number | null;
  /** star the maximum of each series once the player has seen past it */
  markPeaks?: boolean;
}

const W = 680;
const H = 230;
const PAD = { top: 18, right: 18, bottom: 34, left: 48 };

export default function PingCurve({
  series,
  maxK,
  currentK = null,
  goal = null,
  markPeaks = true,
}: Props) {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xOf = (k: number) => PAD.left + (k / Math.max(1, maxK)) * plotW;
  const yOf = (p: number) => PAD.top + (1 - p) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xStep = maxK > 16 ? 4 : maxK > 8 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
      {/* gridlines */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} stroke="#1b4a63" strokeWidth={1} />
          <text x={PAD.left - 6} y={yOf(t) + 4} textAnchor="end" fontSize={11} fill="#7fb8d4">
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {Array.from({ length: maxK + 1 }, (_, k) => k).map((k) => (
        <g key={k}>
          <line
            x1={xOf(k)}
            x2={xOf(k)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke={k === currentK ? "#ffd166" : "#1b4a63"}
            strokeWidth={k === currentK ? 1.5 : 0.5}
            strokeDasharray={k === currentK ? "4 3" : undefined}
          />
          {k % xStep === 0 && (
            <text
              x={xOf(k)}
              y={H - 14}
              textAnchor="middle"
              fontSize={11}
              fill={k === currentK ? "#ffd166" : "#7fb8d4"}
              fontWeight={k === currentK ? 700 : 400}
            >
              {k}
            </text>
          )}
        </g>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="#7fb8d4aa">
        sonar pings →
      </text>

      {/* goal line */}
      {goal !== null && (
        <g>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yOf(goal)}
            y2={yOf(goal)}
            stroke="#6ee7b7"
            strokeWidth={1}
            strokeDasharray="6 4"
            opacity={0.7}
          />
          <text x={W - PAD.right} y={yOf(goal) - 5} textAnchor="end" fontSize={10} fill="#6ee7b7">
            goal {(goal * 100).toFixed(0)}%
          </text>
        </g>
      )}

      {/* curves */}
      {series.map((s, si) => {
        const upto = Math.min(s.revealed, s.probabilities.length - 1, maxK);
        if (upto < 0) return null;
        const pts = s.probabilities.slice(0, upto + 1);
        const path = pts.map((p, k) => `${k === 0 ? "M" : "L"}${xOf(k).toFixed(1)},${yOf(p).toFixed(1)}`).join(" ");
        let peakK = -1;
        if (markPeaks) {
          const bestOverall = s.probabilities.indexOf(Math.max(...s.probabilities.slice(0, maxK + 1)));
          if (upto > bestOverall) peakK = bestOverall;
        }
        return (
          <g key={si}>
            <path d={path} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" opacity={0.95} />
            {pts.map((p, k) => (
              <circle
                key={k}
                cx={xOf(k)}
                cy={yOf(p)}
                r={k === currentK ? 6 : 4}
                fill={k === currentK ? "#ffd166" : s.color}
                stroke="#06283d"
                strokeWidth={1.5}
              />
            ))}
            {peakK >= 0 && (
              <text x={xOf(peakK)} y={yOf(s.probabilities[peakK]) - 10} textAnchor="middle" fontSize={13}>
                ⭐
              </text>
            )}
            {/* legend */}
            <g transform={`translate(${PAD.left + 10 + si * 150}, ${PAD.top + 6})`}>
              <rect width={10} height={10} rx={2} fill={s.color} />
              <text x={14} y={9} fontSize={11} fill="#dff6ff">
                {s.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
