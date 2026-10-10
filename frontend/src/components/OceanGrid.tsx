interface Props {
  tiles: number;
  /** heatmap intensities (e.g. probabilities), optional */
  heat?: number[] | null;
  /** indices already flipped/searched (Level 1) */
  flipped?: Set<number>;
  /** where the pearl/fish actually is — only shown when revealed */
  target?: number;
  /** show the target openly (Level 3 teaching mode) */
  revealTarget?: boolean;
  /** last measurement landed here */
  lastCast?: number | null;
  disabled?: boolean;
  onTileClick?: (i: number) => void;
  labels?: "shell" | "wave";
}

export default function OceanGrid({
  tiles,
  heat = null,
  flipped,
  target,
  revealTarget = false,
  lastCast = null,
  disabled = false,
  onTileClick,
  labels = "shell",
}: Props) {
  const cols = Math.ceil(Math.sqrt(tiles));
  const maxHeat = heat ? Math.max(...heat, 1e-9) : 1;

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: tiles }, (_, i) => {
        const isFlipped = flipped?.has(i) ?? false;
        const isTarget = i === target;
        const intensity = heat ? heat[i] / maxHeat : 0;
        const isCast = i === lastCast;

        let content = labels === "shell" ? "🐚" : "🌊";
        if (isFlipped) content = isTarget ? "🦪" : "·";
        if (revealTarget && isTarget) content = "🦪";
        if (isCast) content = isTarget ? "🦪" : "🕸️";

        const bg = heat
          ? `rgba(63, 193, 201, ${0.08 + intensity * 0.85})`
          : isFlipped
            ? "rgba(255,255,255,0.06)"
            : "rgba(63,193,201,0.14)";

        return (
          <button
            key={i}
            className={`shell relative aspect-square rounded-lg border text-xl sm:text-2xl flex items-center justify-center
              ${isCast ? "border-amber-300 ring-2 ring-amber-300/60" : "border-cyan-800/60"}
              ${disabled || !onTileClick ? "cursor-default" : "cursor-pointer"}`}
            style={{ backgroundColor: bg }}
            disabled={disabled || !onTileClick}
            onClick={() => onTileClick?.(i)}
          >
            <span>{content}</span>
            <span className="absolute bottom-0.5 right-1 text-[9px] text-cyan-200/50">{i}</span>
          </button>
        );
      })}
    </div>
  );
}
