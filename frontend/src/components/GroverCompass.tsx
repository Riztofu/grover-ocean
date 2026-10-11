/**
 * The Grover compass — the textbook two-dimensional picture of the algorithm.
 *
 * Whatever the ocean size, the state always lives in a plane spanned by two
 * directions: "the fish" (straight up) and "everything else" (straight
 * right). The spread puts the needle at a small angle θ above the horizon
 * (sin θ = √(M/N)); every ping rotates it by exactly 2θ toward the fish. The
 * catch chance is sin² of the needle's angle — so straight up is 100%, and
 * pinging past vertical swings the needle away again. That is overwinding.
 *
 * Angles come from the backend, read off the real statevector.
 */

interface Props {
  /** current needle angle in degrees (null = ocean not prepared) */
  angleDeg: number | null;
  /** the half-step θ — used to draw the clock-face tick marks */
  thetaDeg?: number | null;
  /** earlier needle positions, drawn faded */
  history?: number[];
  /** how many tick marks (one per ping) to draw on the dial */
  ticks?: number;
}

const S = 260;
const C = S / 2;
const R = 100;

function pt(deg: number, r = R): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C - r * Math.sin(a)];
}

export default function GroverCompass({ angleDeg, thetaDeg = null, history = [], ticks = 0 }: Props) {
  const p = angleDeg === null ? null : Math.sin((angleDeg * Math.PI) / 180) ** 2;
  const overwound = angleDeg !== null && ((angleDeg % 360) + 360) % 360 > 90 && ((angleDeg % 360) + 360) % 360 < 270;

  // the 2θ arc swept by the most recent ping
  const prev = history.length ? history[history.length - 1] : null;
  let arc: string | null = null;
  if (angleDeg !== null && prev !== null && Math.abs(angleDeg - prev) > 0.01) {
    const [x0, y0] = pt(prev, R * 0.55);
    const [x1, y1] = pt(angleDeg, R * 0.55);
    const sweep = angleDeg > prev ? 0 : 1; // SVG y is flipped: increasing angle = counter-clockwise on screen = sweep flag 0
    const large = Math.abs(angleDeg - prev) > 180 ? 1 : 0;
    arc = `M${x0.toFixed(1)},${y0.toFixed(1)} A${(R * 0.55).toFixed(1)},${(R * 0.55).toFixed(1)} 0 ${large} ${sweep} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[260px] select-none">
      {/* dial */}
      <circle cx={C} cy={C} r={R} fill="#06283d" stroke="#1b4a63" strokeWidth={2} />
      {/* good quadrant (up-right) tinted; overwound (up-left) tinted red */}
      <path d={`M${C},${C} L${C + R},${C} A${R},${R} 0 0 0 ${C},${C - R} Z`} fill="#3fc1c9" opacity={0.08} />
      <path d={`M${C},${C} L${C},${C - R} A${R},${R} 0 0 0 ${C - R},${C} Z`} fill="#f59e9e" opacity={0.08} />

      {/* axes */}
      <line x1={C} y1={C} x2={C + R} y2={C} stroke="#7fb8d4" strokeWidth={1.5} />
      <line x1={C} y1={C} x2={C} y2={C - R} stroke="#ffd166" strokeWidth={1.5} />
      <text x={C + R - 2} y={C + 14} textAnchor="end" fontSize={10} fill="#7fb8d4">
        everything else
      </text>
      <text x={C + 6} y={C - R + 12} fontSize={10} fill="#ffd166">
        the fish · 100%
      </text>
      <text x={C - 6} y={C + 14} textAnchor="end" fontSize={9} fill="#f59e9e">
        overwound →
      </text>

      {/* clock-face ticks: where the needle lands after each ping */}
      {thetaDeg !== null &&
        Array.from({ length: ticks + 1 }, (_, k) => thetaDeg + 2 * thetaDeg * k).map((a, k) => {
          const [x, y] = pt(a, R);
          const [lx, ly] = pt(a, R + 11);
          // on big oceans the ticks crowd together; label every other one
          const showLabel = ticks <= 12 || k % 2 === 0;
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={2.5} fill="#7fb8d4" opacity={0.7} />
              {showLabel && (
                <text x={lx} y={ly + 3} textAnchor="middle" fontSize={8} fill="#7fb8d4" opacity={0.8}>
                  {k}
                </text>
              )}
            </g>
          );
        })}

      {/* history needles */}
      {history.map((a, i) => {
        const [x, y] = pt(a, R * 0.9);
        return (
          <line
            key={i}
            x1={C}
            y1={C}
            x2={x}
            y2={y}
            stroke="#dff6ff"
            strokeWidth={1.5}
            opacity={0.12 + (0.3 * (i + 1)) / (history.length + 1)}
          />
        );
      })}

      {/* the 2θ arc of the last ping */}
      {arc && <path d={arc} fill="none" stroke="#c4b5fd" strokeWidth={2} strokeDasharray="3 3" />}

      {/* the needle */}
      {angleDeg !== null ? (
        <g className="compass-needle">
          <line
            x1={C}
            y1={C}
            x2={pt(angleDeg, R * 0.9)[0]}
            y2={pt(angleDeg, R * 0.9)[1]}
            stroke={overwound ? "#f59e9e" : "#ffd166"}
            strokeWidth={3.5}
            strokeLinecap="round"
          />
          <circle cx={pt(angleDeg, R * 0.9)[0]} cy={pt(angleDeg, R * 0.9)[1]} r={5} fill={overwound ? "#f59e9e" : "#ffd166"} />
        </g>
      ) : (
        <text x={C} y={C + 4} textAnchor="middle" fontSize={11} fill="#7fb8d4">
          ocean not prepared
        </text>
      )}
      <circle cx={C} cy={C} r={4} fill="#dff6ff" />

      {/* readout */}
      {angleDeg !== null && p !== null && (
        <text x={C} y={S - 6} textAnchor="middle" fontSize={11} fill="#dff6ff">
          needle at {angleDeg.toFixed(1)}° · catch = sin² = {(p * 100).toFixed(1)}%
        </text>
      )}
    </svg>
  );
}
