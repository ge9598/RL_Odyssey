/**
 * DelayedRewardMaze
 *
 * A Canvas-rendered grid maze designed so that the greedy (short-term) path
 * is suboptimal. The "patient" path yields higher total reward.
 *
 * Visual style: dark navy base with pixel-art treasure, walls, and characters.
 */

import { useRef, useEffect, useCallback } from 'react';

export interface MazeReward {
  pos: number;
  value: number;
}

export interface DelayedRewardMazeProps {
  rows: number;
  cols: number;
  walls: number[];
  rewards: MazeReward[];
  exit: number;
  start: number;
  playerPos: number;
  piratePos?: number;
  playerPath?: number[];
  piratePath?: number[];
  playerCollected?: number[];
  pirateCollected?: number[];
  showValues?: boolean;
  mode: 'race' | 'replay' | 'static';
  onCellClick?: (index: number) => void;
  className?: string;
}

// Colors
const COLOR_BG = '#0a0e27';
const COLOR_WALL = '#36454f';
const COLOR_WALL_TOP = '#4a5d6f';
const COLOR_GRID = 'rgba(0,212,255,0.06)';
const COLOR_EXIT = '#4ade80';
const COLOR_START = 'rgba(0,212,255,0.15)';
const COLOR_PLAYER = '#00d4ff';
const COLOR_PLAYER_TRAIL = 'rgba(0,212,255,0.25)';
const COLOR_PIRATE = '#f87171';
const COLOR_PIRATE_TRAIL = 'rgba(248,113,113,0.25)';
const COLOR_COIN_SMALL = '#ffd700';
const COLOR_COIN_BIG = '#ffa500';
const COLOR_COLLECTED = 'rgba(255,215,0,0.15)';
const COLOR_TEXT = '#e2e8f0';

function drawPixelCoin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  big: boolean,
) {
  const r = size * (big ? 0.35 : 0.25);
  ctx.fillStyle = big ? COLOR_COIN_BIG : COLOR_COIN_SMALL;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = big
    ? 'rgba(255,255,200,0.5)'
    : 'rgba(255,255,200,0.4)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Big treasure gets a chest outline
  if (big) {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    const hw = r * 0.7;
    const hh = r * 0.5;
    ctx.strokeRect(cx - hw, cy - hh + r * 0.4, hw * 2, hh * 1.2);
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(cx - hw, cy - hh + r * 0.4, hw * 2, hh * 1.2);
    // Gold on top
    ctx.fillStyle = COLOR_COIN_BIG;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.1, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,200,0.5)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.15, cy - r * 0.05, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  isPirate: boolean,
) {
  const s = size * 0.3;

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(cx - s, cy - s, s * 2, s * 2);

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(cx - s * 0.5, cy - s * 0.4, s * 0.4, s * 0.4);
  ctx.fillRect(cx + s * 0.1, cy - s * 0.4, s * 0.4, s * 0.4);

  // Pupil
  ctx.fillStyle = '#0a0e27';
  ctx.fillRect(cx - s * 0.3, cy - s * 0.2, s * 0.2, s * 0.2);
  ctx.fillRect(cx + s * 0.3, cy - s * 0.2, s * 0.2, s * 0.2);

  if (isPirate) {
    // Pirate hat
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cx - s * 1.2, cy - s * 1.5, s * 2.4, s * 0.6);
    ctx.fillRect(cx - s * 0.8, cy - s * 1.9, s * 1.6, s * 0.5);
    // Skull on hat
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - s * 0.2, cy - s * 1.7, s * 0.4, s * 0.3);
  } else {
    // Explorer hat
    ctx.fillStyle = '#00b4d8';
    ctx.fillRect(cx - s * 1.1, cy - s * 1.4, s * 2.2, s * 0.5);
    ctx.fillRect(cx - s * 0.7, cy - s * 1.7, s * 1.4, s * 0.4);
  }
}

export function DelayedRewardMaze({
  rows,
  cols,
  walls,
  rewards,
  exit,
  start,
  playerPos,
  piratePos,
  playerPath = [],
  piratePath = [],
  playerCollected = [],
  pirateCollected = [],
  showValues = true,
  mode,
  onCellClick,
  className = '',
}: DelayedRewardMazeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const wallSet = useRef(new Set(walls));
  useEffect(() => {
    wallSet.current = new Set(walls);
  }, [walls]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const containerW = container.clientWidth;
    const cellSize = Math.floor(containerW / cols);
    const canvasW = cellSize * cols;
    const canvasH = cellSize * rows;

    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid lines
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize);
      ctx.lineTo(canvasW, r * cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize, 0);
      ctx.lineTo(c * cellSize, canvasH);
      ctx.stroke();
    }

    const playerCollectedSet = new Set(playerCollected);
    const pirateCollectedSet = new Set(pirateCollected);
    const playerPathSet = new Set(playerPath);
    const piratePathSet = new Set(piratePath);

    // Render each cell
    for (let i = 0; i < rows * cols; i++) {
      const cx = (i % cols) * cellSize;
      const cy = Math.floor(i / cols) * cellSize;
      const centerX = cx + cellSize / 2;
      const centerY = cy + cellSize / 2;

      // Start cell
      if (i === start) {
        ctx.fillStyle = COLOR_START;
        ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
      }

      // Walls
      if (wallSet.current.has(i)) {
        ctx.fillStyle = COLOR_WALL;
        ctx.fillRect(cx, cy, cellSize, cellSize);
        // Top bevel
        ctx.fillStyle = COLOR_WALL_TOP;
        ctx.fillRect(cx, cy, cellSize, cellSize * 0.3);
        // Brick pattern
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        const row = Math.floor(i / cols);
        const brickH = cellSize / 3;
        for (let b = 0; b < 3; b++) {
          const by = cy + b * brickH;
          ctx.beginPath();
          ctx.moveTo(cx, by);
          ctx.lineTo(cx + cellSize, by);
          ctx.stroke();
          const offset = (b + row) % 2 === 0 ? cellSize / 2 : 0;
          ctx.beginPath();
          ctx.moveTo(cx + offset, by);
          ctx.lineTo(cx + offset, by + brickH);
          ctx.stroke();
        }
        continue;
      }

      // Exit cell
      if (i === exit) {
        ctx.fillStyle = 'rgba(74,222,128,0.12)';
        ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        ctx.strokeStyle = COLOR_EXIT;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + 3, cy + 3, cellSize - 6, cellSize - 6);
        // Flag icon
        ctx.fillStyle = COLOR_EXIT;
        const flagX = centerX - cellSize * 0.15;
        const flagY = cy + cellSize * 0.2;
        ctx.fillRect(flagX, flagY, 2, cellSize * 0.6);
        ctx.fillRect(flagX + 2, flagY, cellSize * 0.25, cellSize * 0.25);
      }

      // Trails
      if (playerPathSet.has(i) && i !== playerPos) {
        ctx.fillStyle = COLOR_PLAYER_TRAIL;
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (piratePathSet.has(i) && i !== piratePos) {
        ctx.fillStyle = COLOR_PIRATE_TRAIL;
        ctx.beginPath();
        ctx.arc(
          centerX + cellSize * 0.15,
          centerY + cellSize * 0.15,
          cellSize * 0.1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Collected reward markers
      if (playerCollectedSet.has(i) || pirateCollectedSet.has(i)) {
        ctx.fillStyle = COLOR_COLLECTED;
        ctx.fillRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);
      }

      // Rewards (only show if not collected by anyone)
      const reward = rewards.find((r) => r.pos === i);
      if (
        reward &&
        !playerCollectedSet.has(i) &&
        !pirateCollectedSet.has(i)
      ) {
        const isBig = reward.value >= 10;
        drawPixelCoin(ctx, centerX, centerY, cellSize, isBig);

        if (showValues) {
          ctx.fillStyle = COLOR_TEXT;
          ctx.font = `${Math.max(10, cellSize * 0.22)}px "Silkscreen", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const sign = reward.value > 0 ? '+' : '';
          ctx.fillText(
            `${sign}${reward.value}`,
            centerX,
            cy + cellSize - 3,
          );
        }
      }
    }

    // Draw characters on top
    if (piratePos !== undefined && !wallSet.current.has(piratePos)) {
      const px = (piratePos % cols) * cellSize + cellSize / 2;
      const py = Math.floor(piratePos / cols) * cellSize + cellSize / 2;
      drawCharacter(ctx, px, py, cellSize, COLOR_PIRATE, true);
    }

    if (!wallSet.current.has(playerPos)) {
      const px = (playerPos % cols) * cellSize + cellSize / 2;
      const py = Math.floor(playerPos / cols) * cellSize + cellSize / 2;
      drawCharacter(ctx, px, py, cellSize, COLOR_PLAYER, false);
    }
  }, [
    rows,
    cols,
    walls,
    rewards,
    exit,
    start,
    playerPos,
    piratePos,
    playerPath,
    piratePath,
    playerCollected,
    pirateCollected,
    showValues,
    mode,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onCellClick || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cellSize = rect.width / cols;
      const col = Math.floor((e.clientX - rect.left) / cellSize);
      const row = Math.floor((e.clientY - rect.top) / cellSize);
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        onCellClick(row * cols + col);
      }
    },
    [onCellClick, cols, rows],
  );

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-[480px] ${className}`}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full cursor-default rounded-sm"
        role="img"
        aria-label="Delayed reward maze grid"
      />
    </div>
  );
}
