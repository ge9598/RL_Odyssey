import { useRef, useEffect, useCallback } from 'react';
import type { GridWorldConfig } from '@/algorithms/qlearning';
import { useGameStore } from '@/stores/gameStore';
import { drawPetEmoji } from '@/utils/petRenderer';
import { DEFAULT_PET } from '@/config/pets';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GridWorldProps {
  rows: number;
  cols: number;
  walls: number[];
  traps: number[];
  treasures: number[];
  exit: number;
  playerPos: number;
  qValues?: number[][];     // qTable[state][4] for heatmap/arrows
  visitCounts?: number[];
  showHeatmap?: boolean;
  showArrows?: boolean;
  highlightPath?: number[];
  collectedTreasures?: Set<number>;
  onCellClick?: (cellIndex: number) => void;
  onKeyAction?: (action: number) => void;
  mode: 'manual' | 'auto' | 'quest';
  className?: string;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const BG = '#0a0e27';
const GRID_LINE = 'rgba(30, 36, 72, 0.8)';
const WALL_COLOR = '#2a2f4a';
const WALL_HIGHLIGHT = '#3a3f5a';
const TRAP_BG = 'rgba(248, 113, 113, 0.15)';
const TRAP_ICON = '#f87171';
const TREASURE_BG = 'rgba(255, 215, 0, 0.15)';
const TREASURE_ICON = '#ffd700';
const TREASURE_COLLECTED_BG = 'rgba(255, 215, 0, 0.05)';
const TREASURE_COLLECTED_ICON = 'rgba(255, 215, 0, 0.3)';
const EXIT_BG = 'rgba(74, 222, 128, 0.2)';
const EXIT_ICON = '#4ade80';
// PLAYER_COLOR / PLAYER_GLOW replaced by pet emoji rendering
const ARROW_COLOR = 'rgba(255, 255, 255, 0.6)';
const PATH_COLOR = 'rgba(255, 215, 0, 0.4)';

// ─── Heatmap color helpers ──────────────────────────────────────────────────

function heatmapColor(value: number, minVal: number, maxVal: number): string {
  if (maxVal <= minVal) return 'rgba(0, 0, 0, 0)';
  const t = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));

  // Blue (cold) -> Cyan -> Green -> Yellow -> Red (hot)
  let r: number, g: number, b: number;
  if (t < 0.25) {
    const p = t / 0.25;
    r = 0; g = Math.floor(p * 128); b = Math.floor(200 - p * 100);
  } else if (t < 0.5) {
    const p = (t - 0.25) / 0.25;
    r = 0; g = Math.floor(128 + p * 127); b = Math.floor(100 - p * 100);
  } else if (t < 0.75) {
    const p = (t - 0.5) / 0.25;
    r = Math.floor(p * 255); g = 255; b = 0;
  } else {
    const p = (t - 0.75) / 0.25;
    r = 255; g = Math.floor(255 - p * 200); b = 0;
  }
  return `rgba(${r}, ${g}, ${b}, 0.35)`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GridWorld({
  rows,
  cols,
  walls,
  traps,
  treasures,
  exit,
  playerPos,
  qValues,
  visitCounts,
  showHeatmap = false,
  showArrows = false,
  highlightPath,
  collectedTreasures,
  onCellClick,
  onKeyAction,
  mode,
  className = '',
}: GridWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef(0);
  const petEmoji = useGameStore((s) => s.selectedPet || DEFAULT_PET);
  const petEmojiRef = useRef(petEmoji);
  useEffect(() => { petEmojiRef.current = petEmoji; }, [petEmoji]);

  // Pet emoji from store — via ref to avoid re-creating the animation loop
  const petEmoji = useGameStore((s) => s.selectedPet) ?? DEFAULT_PET;
  const petEmojiRef = useRef(petEmoji);
  useEffect(() => { petEmojiRef.current = petEmoji; }, [petEmoji]);

  // Animated player position for smooth movement
  const playerAnimRef = useRef({ x: playerPos % cols, y: Math.floor(playerPos / cols) });
  const prevPlayerPosRef = useRef(playerPos);

  // Track animation progress
  const animProgressRef = useRef(1);
  const animStartRef = useRef({ x: 0, y: 0 });
  const animEndRef = useRef({ x: 0, y: 0 });

  // When playerPos changes, start smooth animation
  useEffect(() => {
    if (playerPos !== prevPlayerPosRef.current) {
      const prevR = Math.floor(prevPlayerPosRef.current / cols);
      const prevC = prevPlayerPosRef.current % cols;
      const newR = Math.floor(playerPos / cols);
      const newC = playerPos % cols;
      animStartRef.current = { x: prevC, y: prevR };
      animEndRef.current = { x: newC, y: newR };
      animProgressRef.current = 0;
      prevPlayerPosRef.current = playerPos;
    }
  }, [playerPos, cols]);

  // Keyboard handler
  useEffect(() => {
    if (mode !== 'manual' || !onKeyAction) return;

    const handleKey = (e: KeyboardEvent) => {
      let action = -1;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': action = 0; break;
        case 'ArrowRight': case 'd': case 'D': action = 1; break;
        case 'ArrowDown': case 's': case 'S': action = 2; break;
        case 'ArrowLeft': case 'a': case 'A': action = 3; break;
      }
      if (action >= 0) {
        e.preventDefault();
        onKeyAction(action);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, onKeyAction]);

  // Click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / (rect.width * dpr);
    const scaleY = canvas.height / (rect.height * dpr);

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const cellW = (canvas.width / dpr) / cols;
    const cellH = (canvas.height / dpr) / rows;

    const col = Math.floor(mouseX / cellW);
    const row = Math.floor(mouseY / cellH);

    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      onCellClick(row * cols + col);
    }
  }, [onCellClick, rows, cols]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parentW = container.clientWidth;
      const cellSize = Math.max(32, Math.floor(parentW / cols));
      const w = cellSize * cols;
      const h = cellSize * rows;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Create sets for O(1) lookup
    const wallSet = new Set(walls);
    const trapSet = new Set(traps);
    const treasureSet = new Set(treasures);
    const pathSet = highlightPath ? new Set(highlightPath) : null;
    const collected = collectedTreasures ?? new Set<number>();

    // Compute heatmap range once per frame batch
    let heatMin = 0;
    let heatMax = 1;
    if (showHeatmap && qValues) {
      const stateVals = qValues.map((q) => Math.max(...q));
      const nonZero = stateVals.filter((v) => v !== 0);
      if (nonZero.length > 0) {
        heatMin = Math.min(...nonZero);
        heatMax = Math.max(...nonZero);
      }
    }

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cellW = w / cols;
      const cellH = h / rows;

      // Advance player animation
      if (animProgressRef.current < 1) {
        animProgressRef.current = Math.min(1, animProgressRef.current + 0.12);
        const t = animProgressRef.current;
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        playerAnimRef.current = {
          x: animStartRef.current.x + (animEndRef.current.x - animStartRef.current.x) * ease,
          y: animStartRef.current.y + (animEndRef.current.y - animStartRef.current.y) * ease,
        };
      } else {
        const targetR = Math.floor(playerPos / cols);
        const targetC = playerPos % cols;
        playerAnimRef.current = { x: targetC, y: targetR };
      }

      // Clear
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      // Draw cells
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * cellW;
          const y = r * cellH;

          // Heatmap overlay
          if (showHeatmap && qValues && !wallSet.has(idx)) {
            const stateVal = Math.max(...qValues[idx]);
            if (stateVal !== 0) {
              ctx.fillStyle = heatmapColor(stateVal, heatMin, heatMax);
              ctx.fillRect(x, y, cellW, cellH);
            }
          }

          // Path highlight
          if (pathSet && pathSet.has(idx)) {
            ctx.fillStyle = PATH_COLOR;
            ctx.fillRect(x, y, cellW, cellH);
          }

          // Wall
          if (wallSet.has(idx)) {
            ctx.fillStyle = WALL_COLOR;
            ctx.fillRect(x, y, cellW, cellH);
            // Wall bevel
            ctx.fillStyle = WALL_HIGHLIGHT;
            ctx.fillRect(x, y, cellW, 2);
            ctx.fillRect(x, y, 2, cellH);
          }

          // Trap
          if (trapSet.has(idx)) {
            ctx.fillStyle = TRAP_BG;
            ctx.fillRect(x, y, cellW, cellH);
            ctx.font = `${Math.floor(cellW * 0.45)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = TRAP_ICON;
            ctx.fillText('X', x + cellW / 2, y + cellH / 2);
          }

          // Treasure
          if (treasureSet.has(idx)) {
            const isCollected = collected.has(idx);
            ctx.fillStyle = isCollected ? TREASURE_COLLECTED_BG : TREASURE_BG;
            ctx.fillRect(x, y, cellW, cellH);
            ctx.font = `${Math.floor(cellW * 0.45)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isCollected ? TREASURE_COLLECTED_ICON : TREASURE_ICON;
            ctx.fillText('$', x + cellW / 2, y + cellH / 2);
          }

          // Exit
          if (idx === exit) {
            ctx.fillStyle = EXIT_BG;
            ctx.fillRect(x, y, cellW, cellH);
            ctx.font = `${Math.floor(cellW * 0.45)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = EXIT_ICON;
            ctx.fillText('F', x + cellW / 2, y + cellH / 2);
          }

          // Arrows showing best action per cell
          if (showArrows && qValues && !wallSet.has(idx)) {
            const maxQ = Math.max(...qValues[idx]);
            if (maxQ !== 0) {
              const bestA = qValues[idx].indexOf(maxQ);
              const cx = x + cellW / 2;
              const cy = y + cellH / 2;
              const arrowLen = cellW * 0.25;

              // Direction deltas for drawing arrows: up, right, down, left
              const adx = [0, 1, 0, -1];
              const ady = [-1, 0, 1, 0];

              ctx.save();
              ctx.strokeStyle = ARROW_COLOR;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              const tipX = cx + adx[bestA] * arrowLen;
              const tipY = cy + ady[bestA] * arrowLen;
              ctx.lineTo(tipX, tipY);
              ctx.stroke();

              // Arrow head
              const headSize = 3;
              ctx.beginPath();
              if (bestA === 0) {
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headSize, tipY + headSize);
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + headSize, tipY + headSize);
              } else if (bestA === 1) {
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headSize, tipY - headSize);
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headSize, tipY + headSize);
              } else if (bestA === 2) {
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX - headSize, tipY - headSize);
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + headSize, tipY - headSize);
              } else {
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + headSize, tipY - headSize);
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + headSize, tipY + headSize);
              }
              ctx.stroke();
              ctx.restore();
            }
          }

          // Visit count overlay (subtle)
          if (visitCounts && visitCounts[idx] > 0 && !wallSet.has(idx)) {
            const alpha = Math.min(0.3, visitCounts[idx] * 0.01);
            ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.fillRect(x, y, cellW, cellH);
          }
        }
      }

      // Grid lines
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 1;
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellH);
        ctx.lineTo(w, r * cellH);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, h);
        ctx.stroke();
      }

      // Player — rendered as pet emoji with cyan glow
      const px = playerAnimRef.current.x * cellW + cellW / 2;
      const py = playerAnimRef.current.y * cellH + cellH / 2;
      const petSize = Math.min(cellW, cellH) * 0.65;
      drawPetEmoji(ctx, petEmojiRef.current, px, py, petSize, { glow: true });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [
    rows, cols, walls, traps, treasures, exit, playerPos,
    qValues, visitCounts, showHeatmap, showArrows, highlightPath,
    collectedTreasures, mode,
  ]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex justify-center ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Grid world environment"
        className="rounded cursor-pointer"
        onClick={handleCanvasClick}
        tabIndex={mode === 'manual' ? 0 : undefined}
      />
    </div>
  );
}

/** Preset configs for reuse across components. */
export const GRID_CONFIGS = {
  feel: {
    rows: 6,
    cols: 6,
    walls: [7, 13, 19, 20, 26],
    traps: [10, 23],
    treasures: [15],
    start: 0,
    exit: 35,
  } satisfies GridWorldConfig,

  quest: {
    rows: 6,
    cols: 8,
    walls: [9, 10, 17, 25, 33, 34, 26, 40],
    traps: [11, 22, 37, 44],
    treasures: [20, 39],
    start: 0,
    exit: 47,
  } satisfies GridWorldConfig,

  miniDemo: {
    rows: 3,
    cols: 3,
    walls: [4],
    traps: [6],
    treasures: [],
    start: 0,
    exit: 8,
  } satisfies GridWorldConfig,
} as const;

/*
 * -- i18n KEYS NEEDED --
 * (No new keys needed -- this is a pure rendering component with no UI text.)
 */
