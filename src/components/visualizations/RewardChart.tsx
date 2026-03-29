import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RewardChartProps {
  data: number[];
  cumulativeData?: number[];
  width?: number;
  height?: number;
  showCumulative?: boolean;
  showAverage?: boolean;
  baselineScore?: number;
  accentColor?: string;
}

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG = '#0a0e27';
const GRID_COLOR = 'rgba(30, 36, 72, 0.8)';
const AXIS_COLOR = 'rgba(112, 128, 144, 0.5)';
const AXIS_LABEL = '#708090';
const DEFAULT_ACCENT = '#00d4ff';
const CUMULATIVE_COLOR = '#ffd700';
const AVERAGE_COLOR = 'rgba(74, 222, 128, 0.5)';
const BASELINE_COLOR = '#f87171';

// ─── Legend helper ──────────────────────────────────────────────────────────

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {dashed ? (
        <svg width="18" height="8" style={{ flexShrink: 0 }}>
          <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="1.5" strokeDasharray="4,3" />
        </svg>
      ) : (
        <div className="h-0.5 w-4 rounded" style={{ backgroundColor: color, flexShrink: 0 }} />
      )}
      <span className="font-pixel text-[9px] text-[#708090] whitespace-nowrap">{label}</span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RewardChart({
  data,
  cumulativeData,
  width: fixedWidth,
  height: fixedHeight,
  showCumulative = false,
  showAverage = false,
  baselineScore,
  accentColor = DEFAULT_ACCENT,
}: RewardChartProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = fixedWidth ?? parent.clientWidth;
      const h = fixedHeight ?? 200;
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

    if (!fixedWidth) {
      window.addEventListener('resize', resize);
    }

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Padding for labels
      const padLeft = 50;
      const padRight = 20;
      const padTop = 15;
      const padBottom = 30;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      // Clear
      ctx.clearRect(0, 0, w, h);

      if (data.length === 0) {
        ctx.font = '12px "Silkscreen", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = AXIS_LABEL;
        ctx.fillText('Waiting for data...', w / 2, h / 2);
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Compute running average
      const avgData: number[] = [];
      if (showAverage) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
          avgData.push(sum / (i + 1));
        }
      }

      // Determine Y ranges for reward data
      const yMin = 0;
      let yMax = Math.max(1, ...data);
      if (showAverage && avgData.length > 0) {
        yMax = Math.max(yMax, ...avgData);
      }
      if (baselineScore !== undefined) {
        yMax = Math.max(yMax, baselineScore * 1.1);
      }
      // Add 10% padding at top
      yMax = yMax * 1.1;

      // Cumulative uses its own scale (draw on the right)
      const cumMin = 0;
      let cumMax = 1;
      if (showCumulative && cumulativeData && cumulativeData.length > 0) {
        cumMax = Math.max(1, ...cumulativeData) * 1.1;
      }

      const xScale = plotW / Math.max(1, data.length - 1);
      const yScale = (v: number) => padTop + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
      const cumYScale = (v: number) => padTop + plotH - ((v - cumMin) / (cumMax - cumMin)) * plotH;

      // ── Grid lines ──
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      const numGridLines = 4;
      for (let i = 0; i <= numGridLines; i++) {
        const y = padTop + (plotH / numGridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        // Y-axis labels
        const val = yMax - (yMax - yMin) * (i / numGridLines);
        ctx.font = '10px "Silkscreen", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = AXIS_LABEL;
        ctx.fillText(val.toFixed(1), padLeft - 6, y + 3);
      }

      // X-axis labels
      ctx.font = '10px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = AXIS_LABEL;
      const xLabelCount = Math.min(5, data.length);
      for (let i = 0; i <= xLabelCount; i++) {
        const dataIdx = Math.round((data.length - 1) * (i / xLabelCount));
        const x = padLeft + dataIdx * xScale;
        ctx.fillText(`${dataIdx}`, x, h - 8);
      }

      // Axis lines
      ctx.strokeStyle = AXIS_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, padTop);
      ctx.lineTo(padLeft, padTop + plotH);
      ctx.lineTo(w - padRight, padTop + plotH);
      ctx.stroke();

      // ── Baseline score (dashed horizontal line) ──
      if (baselineScore !== undefined) {
        const by = yScale(baselineScore);
        ctx.save();
        ctx.strokeStyle = BASELINE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, by);
        ctx.lineTo(w - padRight, by);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '10px "Silkscreen", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = BASELINE_COLOR;
        ctx.fillText('Random', w - padRight, by - 4);
        ctx.restore();
      }

      // ── Average line ──
      if (showAverage && avgData.length > 1) {
        ctx.save();
        ctx.strokeStyle = AVERAGE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, yScale(avgData[0]));
        for (let i = 1; i < avgData.length; i++) {
          ctx.lineTo(padLeft + i * xScale, yScale(avgData[i]));
        }
        ctx.stroke();
        ctx.restore();
      }

      // ── Cumulative reward line ──
      if (showCumulative && cumulativeData && cumulativeData.length > 1) {
        ctx.save();

        // Glow
        ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = CUMULATIVE_COLOR;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(padLeft, cumYScale(cumulativeData[0]));
        for (let i = 1; i < cumulativeData.length; i++) {
          ctx.lineTo(padLeft + i * xScale, cumYScale(cumulativeData[i]));
        }
        ctx.stroke();

        // Label
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.font = '10px "Silkscreen", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = CUMULATIVE_COLOR;
        const lastCum = cumulativeData[cumulativeData.length - 1];
        ctx.fillText(
          lastCum.toFixed(0),
          padLeft + (cumulativeData.length - 1) * xScale + 4,
          cumYScale(lastCum) - 4
        );
        ctx.restore();
      }

      // ── Main reward line with glow ──
      if (data.length > 1) {
        ctx.save();

        // Glow effect
        ctx.shadowColor = accentColor === DEFAULT_ACCENT
          ? 'rgba(0, 212, 255, 0.5)'
          : accentColor.replace(')', ', 0.5)').replace('rgb(', 'rgba(');
        ctx.shadowBlur = 10;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padLeft, yScale(data[0]));
        for (let i = 1; i < data.length; i++) {
          ctx.lineTo(padLeft + i * xScale, yScale(data[i]));
        }
        ctx.stroke();

        // Filled area beneath the line
        ctx.shadowBlur = 0;
        ctx.lineTo(padLeft + (data.length - 1) * xScale, padTop + plotH);
        ctx.lineTo(padLeft, padTop + plotH);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        gradient.addColorStop(0, accentColor.replace(')', ', 0.15)').replace('rgb(', 'rgba(').replace('#', ''));
        // Fallback gradient for hex colors
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.12)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
      }

      // Draw a dot on the latest point
      if (data.length > 0) {
        const lastX = padLeft + (data.length - 1) * xScale;
        const lastY = yScale(data[data.length - 1]);
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (!fixedWidth) {
        window.removeEventListener('resize', resize);
      }
    };
  }, [data, cumulativeData, fixedWidth, fixedHeight, showCumulative, showAverage, baselineScore, accentColor]);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Reward chart showing performance over time"
        className="w-full rounded"
        style={{ height: fixedHeight ?? 200, background: BG }}
      />
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 px-1">
        <LegendItem color={accentColor} label={t('chart.legend.reward', 'Step Reward')} />
        {showAverage && (
          <LegendItem color="rgba(74,222,128,0.8)" label={t('chart.legend.average', 'Avg Reward')} />
        )}
        {showCumulative && (
          <LegendItem color={CUMULATIVE_COLOR} label={t('chart.legend.cumulative', 'Cumulative')} />
        )}
        {baselineScore !== undefined && (
          <LegendItem color={BASELINE_COLOR} label={t('chart.legend.baseline', 'Random Baseline')} dashed />
        )}
      </div>
    </div>
  );
}

/*
 * ── i18n KEYS NEEDED ──
 * bandit.chart.waiting = "Waiting for data..."
 * bandit.chart.random  = "Random"
 * (Currently hardcoded; i18n hookup requires passing translated strings as props
 *  or wrapping in a container component. Deferred to integration pass.)
 */
