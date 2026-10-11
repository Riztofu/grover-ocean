interface Props {
  tiles: number;
  /** heatmap intensities (e.g. probabilities), optional */
  heat?: number[] | null;
  /** indices already flipped/searched (Level 1) */
  flipped?: Set<number>;
  /** where the pearl/fish actually is — only shown when revealed */
  target?: number;
  /** a whole school of fish (Level 10) — same rules as `target` */
  targets?: number[];
  /** show the target openly (Level 3 teaching mode) */
  revealTarget?: boolean;
  /** last measurement landed here */
  lastCast?: number | null;
  /** Level 11: measurement tallies drawn on the tiles (index -> count) */
  tally?: Record<string, number> | null;
  /** Level 11: the tile the player is pointing at */
  selected?: number | null;
  disabled?: boolean;
  onTileClick?: (i: number) => void;
  labels?: "shell" | "wave";
}

export default function OceanGrid({
  tiles,
  heat = null,
  flipped,
  target,
  targets,
  revealTarget = false,
  lastCast = null,
  tally = null,
  selected = null,
  disabled = false,
  onTileClick,
  labels = "shell",
}: Props) {
  const cols = Math.ceil(Math.sqrt(tiles));
  const compact = tiles > 16; // 64- and 256-tile oceans: no emoji per tile, tighter grid
  const maxHeat = heat ? Math.max(...heat, 1e-9) : 1;
  const maxTally = tally ? Math.max(...Object.values(tally), 1) : 1;
  const prize = labels === "shell" ? "🦪" : "🐟";

  const isTarget = (i: number) => i === target || (targets?.includes(i) ?? false);

  return (
    <div
      className={`grid ${compact ? "gap-1" : "gap-2"}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: tiles }, (_, i) => {
        const isFlipped = flipped?.has(i) ?? false;
        const hit = isTarget(i);
        const isCast = i === lastCast;
        const isSel = i === selected;
        const count = tally?.[String(i)] ?? 0;

        let content = compact ? "" : labels === "shell" ? "🐚" : "🌊";
        if (isFlipped) content = hit ? prize : "·";
        if (revealTarget && hit) content = prize;
        if (isCast) content = hit ? prize : "🕸️";
        if (tally) content = count > 0 ? String(count) : "";
        if (tally && revealTarget && hit) content = `${prize}${count > 0 ? count : ""}`;

        const intensity = tally
          ? count / maxTally
          : heat
            ? heat[i] / maxHeat
            : 0;
        const bg =
          heat || tally
            ? `rgba(63, 193, 201, ${0.08 + intensity * 0.85})`
            : isFlipped
              ? "rgba(255,255,255,0.06)"
              : "rgba(63,193,201,0.14)";

        return (
          <button
            key={i}
            className={`shell relative aspect-square flex items-center justify-center border
              ${compact ? "rounded-md text-[11px] font-bold" : "rounded-lg text-xl sm:text-2xl"}
              ${tally && count > 0 ? (intensity > 0.45 ? "text-[#06283d]" : "text-cyan-100") : ""}
              ${isCast ? "border-amber-300 ring-2 ring-amber-300/60" : isSel ? "border-emerald-300 ring-2 ring-emerald-300/70" : "border-cyan-800/60"}
              ${disabled || !onTileClick ? "cursor-default" : "cursor-pointer"}`}
            style={{ backgroundColor: bg }}
            disabled={disabled || !onTileClick}
            onClick={() => onTileClick?.(i)}
            title={`tile ${i}${tally ? ` — ${count} hit${count === 1 ? "" : "s"}` : ""}`}
          >
            <span>{content}</span>
            {tiles <= 64 && (
              <span className={`absolute bottom-0.5 right-1 ${compact ? "text-[8px]" : "text-[9px]"} text-cyan-200/50`}>
                {i}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
