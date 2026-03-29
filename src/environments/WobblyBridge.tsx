import { useRef, useEffect, useMemo } from 'react';
import { GridWorld } from '@/environments/GridWorld';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WobblyBridgeProps {
  rows: number;
  cols: number;
  walls: number[];
  baseTraps: number[];
  wobblyTraps: number[];
  activeWobblyTraps: number[];
  treasures: number[];
  exit: number;
  playerPos: number;
  qValues?: number[][];
  showHeatmap?: boolean;
  mode: 'manual' | 'auto';
  onCellClick?: (cellIndex: number) => void;
  onKeyAction?: (action: number) => void;
  wobblePulse?: number;  // 0..1 — drives the pulsing amber overlay opacity
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WOBBLE_AMBER = 'rgba(251, 146, 60, ';   // orange-400 base
const WOBBLE_ACTIVE = 'rgba(239, 68, 68, ';   // red-500 for active wobble cells
const LEGEND_COLORS = {
  stable: '#f87171',
  wobbly: 'rgba(251, 146, 60, 0.8)',
  wobblyActive: 'rgba(239, 68, 68, 0.95)',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function WobblyBridge({
  rows,
  cols,
  walls,
  baseTraps,
  wobblyTraps,
  activeWobblyTraps,
  treasures,
  exit,
  playerPos,
  qValues,
  showHeatmap = false,
  mode,
  onCellClick,
  onKeyAction,
  wobblePulse = 0,
  className = '',
}: WobblyBridgeProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Combined traps passed to GridWorld — base + currently active wobbly ones
  const allTraps = useMemo(
    () => [...baseTraps, ...activeWobblyTraps],
    [baseTraps, activeWobblyTraps],
  );

  // Use a Set for fast lookup
  const wobblySet = useMemo(() => new Set(wobblyTraps), [wobblyTraps]);
  const activeWobblySet = useMemo(() => new Set(activeWobblyTraps), [activeWobblyTraps]);

  // Derive cell pixel size from the container's current layout
  // We do this in an animation loop so the overlay stays in sync even on resize
  useEffect(() => {
    const overlay = overlayRef.current;
    const container = gridContainerRef.current;
    if (!overlay || !container) return;

    let frameId = 0;

    const updateOverlay = () => {
      // GridWorld renders a <canvas> inside a flex container; measure the canvas
      const canvas = container.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const cellW = rect.width / cols;
        const cellH = rect.height / rows;

        // Offset of canvas relative to the outer container
        const offsetX = rect.left - containerRect.left;
        const offsetY = rect.top - containerRect.top;

        // Clear existing overlay children
        overlay.innerHTML = '';

        for (const cellIdx of wobblySet) {
          const col = cellIdx % cols;
          const row = Math.floor(cellIdx / cols);

          const x = offsetX + col * cellW;
          const y = offsetY + row * cellH;

          const isActive = activeWobblySet.has(cellIdx);

          // Outer amber pulsing border div
          const cell = document.createElement('div');
          cell.style.position = 'absolute';
          cell.style.left = `${x}px`;
          cell.style.top = `${y}px`;
          cell.style.width = `${cellW}px`;
          cell.style.height = `${cellH}px`;
          cell.style.boxSizing = 'border-box';
          cell.style.pointerEvents = 'none';

          if (isActive) {
            // Active wobble: solid bright-red pulsing border
            const borderAlpha = 0.5 + wobblePulse * 0.5;
            cell.style.border = `2px solid ${WOBBLE_ACTIVE}${borderAlpha})`;
            cell.style.boxShadow = `inset 0 0 ${8 + wobblePulse * 8}px ${WOBBLE_ACTIVE}${wobblePulse * 0.6})`;
            cell.style.background = `${WOBBLE_ACTIVE}${wobblePulse * 0.15})`;
          } else {
            // Inactive wobble: amber dashed border hint
            const borderAlpha = 0.2 + wobblePulse * 0.3;
            cell.style.border = `2px dashed ${WOBBLE_AMBER}${borderAlpha})`;
            cell.style.boxShadow = `inset 0 0 ${4 + wobblePulse * 4}px ${WOBBLE_AMBER}${wobblePulse * 0.2})`;
          }

          // Warning icon centered
          const icon = document.createElement('div');
          icon.style.position = 'absolute';
          icon.style.inset = '0';
          icon.style.display = 'flex';
          icon.style.alignItems = 'center';
          icon.style.justifyContent = 'center';
          icon.style.fontSize = `${Math.min(cellW, cellH) * 0.3}px`;
          icon.style.lineHeight = '1';
          icon.style.opacity = isActive ? String(0.6 + wobblePulse * 0.4) : String(0.25 + wobblePulse * 0.2);
          icon.textContent = '⚡';
          cell.appendChild(icon);

          overlay.appendChild(cell);
        }
      }

      frameId = requestAnimationFrame(updateOverlay);
    };

    frameId = requestAnimationFrame(updateOverlay);
    return () => cancelAnimationFrame(frameId);
  }, [rows, cols, wobblySet, activeWobblySet, wobblePulse]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Grid + overlay wrapper */}
      <div
        ref={gridContainerRef}
        className="relative w-full"
        style={{ minHeight: 80 }}
      >
        <GridWorld
          rows={rows}
          cols={cols}
          walls={walls}
          traps={allTraps}
          treasures={treasures}
          exit={exit}
          playerPos={playerPos}
          qValues={qValues}
          showHeatmap={showHeatmap}
          mode={mode === 'manual' ? 'manual' : 'auto'}
          onCellClick={onCellClick}
          onKeyAction={onKeyAction}
        />
        {/* Wobble overlay — absolutely positioned children added by the effect */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <span className="font-pixel text-[10px] text-[#708090] uppercase tracking-wider">
          Legend:
        </span>

        {/* Stable trap */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm border-2"
            style={{ borderColor: LEGEND_COLORS.stable, background: 'rgba(248,113,113,0.15)' }}
          />
          <span className="font-pixel text-[10px] text-[#e2e8f0]">Stable trap</span>
        </div>

        {/* Wobbly (inactive) */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm border-2 border-dashed"
            style={{ borderColor: LEGEND_COLORS.wobbly, background: 'rgba(251,146,60,0.1)' }}
          />
          <span className="font-pixel text-[10px] text-[#e2e8f0]">Unstable (dormant)</span>
        </div>

        {/* Wobbly (active) */}
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm border-2"
            style={{ borderColor: LEGEND_COLORS.wobblyActive, background: 'rgba(239,68,68,0.2)' }}
          />
          <span className="font-pixel text-[10px] text-[#f87171]">Unstable (active!)</span>
        </div>

        {/* Active count badge */}
        {activeWobblyTraps.length > 0 && (
          <div
            className="ml-auto font-pixel text-[10px] px-2 py-0.5 rounded-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#f87171',
            }}
          >
            {activeWobblyTraps.length} active
          </div>
        )}
      </div>
    </div>
  );
}
