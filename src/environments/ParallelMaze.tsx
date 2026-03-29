import { useMemo } from 'react';
import { GridWorld } from '@/environments/GridWorld';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParallelMazeProps {
  rows: number;
  cols: number;
  walls: number[];
  traps: number[];
  treasures: number[];
  exit: number;
  workerPositions: number[];
  sharedQValues?: number[][];
  showHeatmap?: boolean;
  workerColors?: string[];
  workerEpisodeCounts?: number[];
  maxWorkersToShow?: number;
  mode?: 'auto';
  className?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_WORKER_COLORS = [
  '#00d4ff', // cyan
  '#4ade80', // green
  '#ffd700', // gold
  '#f87171', // red
  '#c084fc', // purple
  '#fb923c', // orange
  '#22d3ee', // sky
  '#a3e635', // lime
];

// ─── Sub-component: single worker panel ──────────────────────────────────────

interface WorkerPanelProps {
  workerId: number;
  rows: number;
  cols: number;
  walls: number[];
  traps: number[];
  treasures: number[];
  exit: number;
  playerPos: number;
  sharedQValues?: number[][];
  showHeatmap: boolean;
  color: string;
  episodeCount: number;
}

function WorkerPanel({
  workerId,
  rows,
  cols,
  walls,
  traps,
  treasures,
  exit,
  playerPos,
  sharedQValues,
  showHeatmap,
  color,
  episodeCount,
}: WorkerPanelProps) {
  // CSS hue-rotate approximation: compute a hue shift to tint the cyan player
  // toward the target worker color. We derive a rough hue-rotate degree from
  // the color's hex value — it's a visual approximation, not colorimetrically exact.
  const hueRotateDeg = useMemo(() => colorToHueRotate(color), [color]);

  return (
    <div
      className="flex flex-col rounded-sm overflow-hidden"
      style={{
        border: `1.5px solid ${color}44`,
        background: '#0a0e27',
        boxShadow: `0 0 8px ${color}22`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{
          background: `linear-gradient(90deg, ${color}18 0%, transparent 100%)`,
          borderBottom: `1px solid ${color}33`,
        }}
      >
        <div className="flex items-center gap-1.5">
          {/* Colored worker dot */}
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 4px ${color}` }}
          />
          <span
            className="font-pixel text-[9px] uppercase tracking-wider"
            style={{ color }}
          >
            W{workerId + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-pixel text-[9px] text-[#708090]">ep:</span>
          <span
            className="font-pixel text-[9px]"
            style={{ color }}
          >
            {episodeCount}
          </span>
        </div>
      </div>

      {/* Grid — hue-rotated container to tint the player dot */}
      <div
        style={{ filter: `hue-rotate(${hueRotateDeg}deg) saturate(1.1)` }}
      >
        <GridWorld
          rows={rows}
          cols={cols}
          walls={walls}
          traps={traps}
          treasures={treasures}
          exit={exit}
          playerPos={playerPos}
          qValues={showHeatmap ? sharedQValues : undefined}
          showHeatmap={showHeatmap}
          mode="auto"
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ParallelMaze({
  rows,
  cols,
  walls,
  traps,
  treasures,
  exit,
  workerPositions,
  sharedQValues,
  showHeatmap = false,
  workerColors = DEFAULT_WORKER_COLORS,
  workerEpisodeCounts = [],
  maxWorkersToShow = 4,
  mode: _mode = 'auto',
  className = '',
}: ParallelMazeProps) {
  const totalWorkers = workerPositions.length;
  const displayCount = Math.min(totalWorkers, maxWorkersToShow);
  const hiddenCount = totalWorkers - displayCount;

  // Which grid layout to use
  // 1–2 workers: single column
  // 3–4 workers: 2 columns
  // 5–8 workers: 2 columns (smaller)
  const gridCols = displayCount <= 2 ? 1 : 2;
  const gridColsClass = gridCols === 1 ? 'grid-cols-1' : 'grid-cols-2';

  // Aggregate stats across all workers
  const totalEpisodes = workerEpisodeCounts.reduce((s, n) => s + n, 0);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Worker grids */}
      <div className={`grid ${gridColsClass} gap-2`}>
        {Array.from({ length: displayCount }, (_, i) => (
          <WorkerPanel
            key={i}
            workerId={i}
            rows={rows}
            cols={cols}
            walls={walls}
            traps={traps}
            treasures={treasures}
            exit={exit}
            playerPos={workerPositions[i] ?? 0}
            sharedQValues={sharedQValues}
            showHeatmap={showHeatmap}
            color={workerColors[i % workerColors.length]}
            episodeCount={workerEpisodeCounts[i] ?? 0}
          />
        ))}

        {/* "+N more" badge if workers exceed maxWorkersToShow */}
        {hiddenCount > 0 && (
          <div
            className="flex items-center justify-center rounded-sm"
            style={{
              border: '1.5px dashed rgba(112, 128, 144, 0.4)',
              background: 'rgba(30, 36, 72, 0.3)',
              minHeight: 60,
            }}
          >
            <span className="font-pixel text-[11px] text-[#708090]">
              +{hiddenCount} more
            </span>
          </div>
        )}
      </div>

      {/* Shared policy indicator + aggregate stats */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-sm"
        style={{
          border: '1px solid rgba(0, 212, 255, 0.25)',
          background: 'rgba(0, 212, 255, 0.05)',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Heatmap color scale strip */}
          <div
            className="w-16 h-2.5 rounded-sm"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,200,0.6) 0%, rgba(0,255,0,0.6) 50%, rgba(255,0,0,0.6) 100%)',
            }}
          />
          <span className="font-pixel text-[10px] text-[#00d4ff] uppercase tracking-wider">
            Shared Policy
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-[10px] text-[#708090]">Workers:</span>
            <span className="font-pixel text-[10px] text-[#00d4ff]">{totalWorkers}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-[10px] text-[#708090]">Total ep:</span>
            <span className="font-pixel text-[10px] text-[#4ade80]">{totalEpisodes}</span>
          </div>
          {/* Sync pulse dot */}
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80]"
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
            />
            <span className="font-pixel text-[10px] text-[#4ade80]">Syncing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Approximate a CSS hue-rotate degree for a target hex color, relative to the
 * default cyan player color (#00d4ff, hue ≈ 192°). We compute the hue of the
 * target and return the difference so the player dot appears tinted toward it.
 *
 * This is a visual approximation — exact colorimetric accuracy is not required.
 */
function colorToHueRotate(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return 0;

  let hue: number;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  // The default GridWorld player is cyan (#00d4ff), hue ≈ 192°.
  // Return the delta so hue-rotate shifts from cyan to the target.
  const CYAN_HUE = 192;
  return hue - CYAN_HUE;
}
