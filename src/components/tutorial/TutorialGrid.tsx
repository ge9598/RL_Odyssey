import { useRef, useEffect, useCallback } from 'react';
import { lerp } from '@/utils/math';
import type { CellState, Position } from './useTutorial';

// --- Constants ---

const GRID_SIZE = 4;
const CELL_SIZE = 80;
const GRID_TOTAL = GRID_SIZE * CELL_SIZE;
const PADDING = 16;
const CANVAS_SIZE = GRID_TOTAL + PADDING * 2;

// Colors
const COLOR_BG = '#0a0e27';
const COLOR_CELL_NORMAL = '#0f1535';
const COLOR_CELL_VISITED = '#161e45';
const COLOR_CELL_CURRENT = '#1a2550';
const COLOR_GRID_LINE = 'rgba(0, 212, 255, 0.15)';
const COLOR_CURRENT_BORDER = 'rgba(0, 212, 255, 0.6)';
const COLOR_FOG = 'rgba(5, 7, 20, 0.92)';
const COLOR_ADJACENT_HINT = 'rgba(0, 212, 255, 0.08)';

// Heatmap gradient: dark blue -> cyan -> green -> yellow -> orange
function heatmapColor(value: number): string {
  if (value <= 0) return 'rgba(0, 0, 0, 0)';
  const v = Math.min(1, Math.max(0, value));
  if (v < 0.25) {
    const t = v / 0.25;
    return `rgba(${Math.floor(lerp(20, 0, t))}, ${Math.floor(lerp(40, 140, t))}, ${Math.floor(lerp(80, 200, t))}, ${lerp(0.15, 0.35, t)})`;
  }
  if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    return `rgba(${Math.floor(lerp(0, 40, t))}, ${Math.floor(lerp(140, 220, t))}, ${Math.floor(lerp(200, 100, t))}, ${lerp(0.35, 0.5, t)})`;
  }
  if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    return `rgba(${Math.floor(lerp(40, 255, t))}, ${Math.floor(lerp(220, 215, t))}, ${Math.floor(lerp(100, 0, t))}, ${lerp(0.5, 0.6, t)})`;
  }
  const t = (v - 0.75) / 0.25;
  return `rgba(${Math.floor(lerp(255, 255, t))}, ${Math.floor(lerp(215, 120, t))}, ${Math.floor(lerp(0, 0, t))}, ${lerp(0.6, 0.75, t)})`;
}

// --- Props ---

export interface TutorialGridProps {
  gridState: CellState[][];
  petPosition: Position;
  treatPosition: Position;
  petEmoji: string;
  fogEnabled?: boolean;
  heatmap?: number[][];
  onCellClick?: (x: number, y: number) => void;
  showTreat?: boolean;
}

// --- Component ---

export function TutorialGrid({
  gridState,
  petPosition,
  treatPosition,
  petEmoji,
  fogEnabled = false,
  heatmap,
  onCellClick,
  showTreat = true,
}: TutorialGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animPosRef = useRef({ x: petPosition.x, y: petPosition.y });
  const prevPosRef = useRef({ x: petPosition.x, y: petPosition.y });
  const animProgressRef = useRef(1);
  const rafRef = useRef<number>(0);
  const treatPulseRef = useRef(0);

  // Store latest props in a ref so the rAF loop always sees fresh data
  const propsRef = useRef({
    gridState, petPosition, treatPosition, petEmoji, fogEnabled, heatmap, onCellClick, showTreat,
  });
  useEffect(() => {
    propsRef.current = {
      gridState, petPosition, treatPosition, petEmoji, fogEnabled, heatmap, onCellClick, showTreat,
    };
  });

  // Track position changes for animation
  useEffect(() => {
    if (
      petPosition.x !== prevPosRef.current.x ||
      petPosition.y !== prevPosRef.current.y
    ) {
      animPosRef.current = { ...prevPosRef.current };
      prevPosRef.current = { x: petPosition.x, y: petPosition.y };
      animProgressRef.current = 0;
    }
  }, [petPosition.x, petPosition.y]);

  // Setup canvas resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
  }, []);

  // Animation loop using ref to avoid self-reference issues
  useEffect(() => {
    let running = true;

    function drawFrame() {
      if (!running) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const p = propsRef.current;
      const dpr = window.devicePixelRatio || 1;

      // Advance animation
      if (animProgressRef.current < 1) {
        animProgressRef.current = Math.min(1, animProgressRef.current + 0.12);
      }
      treatPulseRef.current += 0.04;

      // Interpolated pet position
      const t = animProgressRef.current;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const drawPetX = lerp(animPosRef.current.x, p.petPosition.x, eased);
      const drawPetY = lerp(animPosRef.current.y, p.petPosition.y, eased);

      // Clear
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Background
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw cells
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const cx = PADDING + col * CELL_SIZE;
          const cy = PADDING + row * CELL_SIZE;
          const cellState = p.gridState[row]?.[col] ?? 'normal';

          // Cell background
          let cellColor = COLOR_CELL_NORMAL;
          if (cellState === 'visited') cellColor = COLOR_CELL_VISITED;
          if (cellState === 'current') cellColor = COLOR_CELL_CURRENT;

          ctx.fillStyle = cellColor;
          ctx.fillRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          // Heatmap overlay
          if (p.heatmap && p.heatmap[row]?.[col] > 0) {
            ctx.fillStyle = heatmapColor(p.heatmap[row][col]);
            ctx.fillRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }

          // Adjacent cell hint (clickable indicator)
          if (p.onCellClick && !p.fogEnabled) {
            const isPetCell = col === p.petPosition.x && row === p.petPosition.y;
            const dx = Math.abs(col - p.petPosition.x);
            const dy = Math.abs(row - p.petPosition.y);
            if (!isPetCell && dx + dy === 1) {
              ctx.fillStyle = COLOR_ADJACENT_HINT;
              ctx.fillRect(cx + 1, cy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
          }

          // Current cell highlight border
          if (cellState === 'current') {
            ctx.strokeStyle = COLOR_CURRENT_BORDER;
            ctx.lineWidth = 2;
            ctx.strokeRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          }
        }
      }

      // Grid lines
      ctx.strokeStyle = COLOR_GRID_LINE;
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        const x = PADDING + i * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(x, PADDING);
        ctx.lineTo(x, PADDING + GRID_TOTAL);
        ctx.stroke();

        const y = PADDING + i * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(PADDING, y);
        ctx.lineTo(PADDING + GRID_TOTAL, y);
        ctx.stroke();
      }

      // Draw treat (with pulse animation)
      if (p.showTreat) {
        const treatVisible = !p.fogEnabled || (
          Math.abs(p.treatPosition.x - p.petPosition.x) + Math.abs(p.treatPosition.y - p.petPosition.y) <= 1
        );

        if (treatVisible) {
          const tx = PADDING + p.treatPosition.x * CELL_SIZE + CELL_SIZE / 2;
          const ty = PADDING + p.treatPosition.y * CELL_SIZE + CELL_SIZE / 2;
          const pulse = 1 + Math.sin(treatPulseRef.current) * 0.08;

          ctx.save();
          ctx.translate(tx, ty);
          ctx.scale(pulse, pulse);
          ctx.font = '32px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Glow behind treat
          ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
          ctx.shadowBlur = 12;
          ctx.fillText('\u2B50', 0, 1);
          ctx.shadowBlur = 0;

          ctx.restore();
        }
      }

      // Draw pet (interpolated position)
      const petScreenX = PADDING + drawPetX * CELL_SIZE + CELL_SIZE / 2;
      const petScreenY = PADDING + drawPetY * CELL_SIZE + CELL_SIZE / 2;

      ctx.save();
      ctx.translate(petScreenX, petScreenY);

      // Subtle bounce when idle
      const bounce = animProgressRef.current >= 1
        ? Math.sin(treatPulseRef.current * 1.5) * 2
        : 0;
      ctx.translate(0, bounce);

      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Pet shadow
      ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
      ctx.shadowBlur = 8;
      ctx.fillText(p.petEmoji, 0, 1);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Fog overlay (step 2)
      if (p.fogEnabled) {
        for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
            // Don't fog the current cell
            const isPetCell = col === p.petPosition.x && row === p.petPosition.y;
            if (isPetCell) continue;

            // Show adjacent cells with lighter fog
            const dx = Math.abs(col - p.petPosition.x);
            const dy = Math.abs(row - p.petPosition.y);
            const dist = dx + dy;

            const cx = PADDING + col * CELL_SIZE;
            const cy = PADDING + row * CELL_SIZE;

            if (dist === 1) {
              ctx.fillStyle = 'rgba(5, 7, 20, 0.65)';
            } else {
              ctx.fillStyle = COLOR_FOG;
            }
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

            // Question mark on fogged cells
            if (dist > 1) {
              ctx.fillStyle = 'rgba(100, 120, 160, 0.25)';
              ctx.font = '20px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('?', cx + CELL_SIZE / 2, cy + CELL_SIZE / 2);
            }
          }
        }
      }

      // Outer border glow
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(PADDING - 1, PADDING - 1, GRID_TOTAL + 2, GRID_TOTAL + 2);

      ctx.restore();

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // Stable loop — reads props from ref

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mx = (e.clientX - rect.left) * scaleX - PADDING;
    const my = (e.clientY - rect.top) * scaleY - PADDING;
    const col = Math.floor(mx / CELL_SIZE);
    const row = Math.floor(my / CELL_SIZE);
    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
      onCellClick(col, row);
    }
  }, [onCellClick]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="rounded-sm cursor-pointer"
      style={{
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        imageRendering: 'pixelated',
      }}
      role="grid"
      aria-label="Tutorial grid - use arrow keys or click adjacent cells to move"
      tabIndex={0}
    />
  );
}
