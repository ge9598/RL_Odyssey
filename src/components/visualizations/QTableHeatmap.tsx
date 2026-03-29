import { useRef, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QTableHeatmapProps {
  /** Q-table: qTable[state][action], where action is 0=up, 1=right, 2=down, 3=left */
  qTable: number[][];
  /** Grid dimensions. */
  rows: number;
  cols: number;
  /** Cells that are walls (drawn as solid dark). */
  walls?: number[];
  /** Currently highlighted cell (e.g., agent position). */
  highlightCell?: number;
  /** Height of the visualization in pixels. */
  height?: number;
  className?: string;
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const BG = '#0a0e27';
const GRID_LINE = 'rgba(30, 36, 72, 1)';
const WALL_COLOR = '#2a2f4a';
const HIGHLIGHT_BORDER = '#00d4ff';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map a Q-value to a color on a cold (blue) to hot (gold) gradient.
 */
function qValueColor(value: number, minVal: number, maxVal: number): string {
  if (maxVal <= minVal) return 'rgba(30, 36, 72, 0.6)';
  const t = Math.max(0, Math.min(1, (value - minVal) / (maxVal - minVal)));

  // Blue (negative) -> Dark (zero) -> Cyan -> Gold (positive)
  let r: number, g: number, b: number;
  if (t < 0.3) {
    const p = t / 0.3;
    r = Math.floor(20 * p);
    g = Math.floor(40 * p);
    b = Math.floor(100 + 50 * p);
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    r = Math.floor(20 + p * 0);
    g = Math.floor(40 + p * 172);
    b = Math.floor(150 + p * 105);
  } else {
    const p = (t - 0.6) / 0.4;
    r = Math.floor(20 + p * 235);
    g = Math.floor(212 + p * 3);
    b = Math.floor(255 - p * 255);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Renders a Q-table heatmap where each cell is divided into 4 triangular
 * sections, one per action direction. Color intensity represents Q-value magnitude.
 */
export function QTableHeatmap({
  qTable,
  rows,
  cols,
  walls,
  highlightCell,
  height = 250,
  className = '',
}: QTableHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const wallSet = new Set(walls ?? []);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parentW = container.clientWidth;
      const cellSize = Math.max(24, Math.floor(parentW / cols));
      const w = cellSize * cols;
      const h = cellSize * rows;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Compute global min/max across all Q-values for consistent coloring
    let globalMin = 0;
    let globalMax = 0;
    for (let s = 0; s < qTable.length; s++) {
      if (wallSet.has(s)) continue;
      for (let a = 0; a < 4; a++) {
        const v = qTable[s]?.[a] ?? 0;
        if (v < globalMin) globalMin = v;
        if (v > globalMax) globalMax = v;
      }
    }
    // Small padding to avoid division by zero
    if (globalMax <= globalMin) {
      globalMax = globalMin + 1;
    }

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cellW = w / cols;
      const cellH = h / rows;

      // Clear
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const x = c * cellW;
          const y = r * cellH;
          const cx = x + cellW / 2;
          const cy = y + cellH / 2;

          // Wall
          if (wallSet.has(idx)) {
            ctx.fillStyle = WALL_COLOR;
            ctx.fillRect(x, y, cellW, cellH);
            continue;
          }

          const q = qTable[idx] ?? [0, 0, 0, 0];

          // Draw four triangular sections
          // Up triangle (action 0)
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellW, y);
          ctx.lineTo(cx, cy);
          ctx.closePath();
          ctx.fillStyle = qValueColor(q[0], globalMin, globalMax);
          ctx.fill();

          // Right triangle (action 1)
          ctx.beginPath();
          ctx.moveTo(x + cellW, y);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.lineTo(cx, cy);
          ctx.closePath();
          ctx.fillStyle = qValueColor(q[1], globalMin, globalMax);
          ctx.fill();

          // Down triangle (action 2)
          ctx.beginPath();
          ctx.moveTo(x + cellW, y + cellH);
          ctx.lineTo(x, y + cellH);
          ctx.lineTo(cx, cy);
          ctx.closePath();
          ctx.fillStyle = qValueColor(q[2], globalMin, globalMax);
          ctx.fill();

          // Left triangle (action 3)
          ctx.beginPath();
          ctx.moveTo(x, y + cellH);
          ctx.lineTo(x, y);
          ctx.lineTo(cx, cy);
          ctx.closePath();
          ctx.fillStyle = qValueColor(q[3], globalMin, globalMax);
          ctx.fill();

          // Draw thin diagonal lines separating triangles
          ctx.strokeStyle = GRID_LINE;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.moveTo(x + cellW, y);
          ctx.lineTo(x, y + cellH);
          ctx.stroke();
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

      // Highlight current cell
      if (highlightCell !== undefined && highlightCell >= 0) {
        const hr = Math.floor(highlightCell / cols);
        const hc = highlightCell % cols;
        ctx.strokeStyle = HIGHLIGHT_BORDER;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 6;
        ctx.strokeRect(hc * cellW + 1, hr * cellH + 1, cellW - 2, cellH - 2);
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [qTable, rows, cols, walls, highlightCell]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex justify-center ${className}`}
      style={{ maxHeight: height }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Q-table heatmap visualization"
        className="rounded"
      />
    </div>
  );
}

/*
 * -- i18n KEYS NEEDED --
 * (No new keys needed -- this is a pure rendering component with no UI text.)
 */
