import { useRef, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DartThrowProps {
  numSectors?: number;
  probs: number[];
  lastThrowSector?: number;
  lastThrowHit?: boolean;
  isLearning?: boolean;
  throwCount?: number;
  hitCount?: number;
  onManualThrow?: (sector: number) => void;
  mode?: 'manual' | 'auto';
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BG = '#0a0e27';

// Sector colors: Up=cyan, Right=green, Down=red, Left=gold
const SECTOR_COLORS = ['#00d4ff', '#4ade80', '#f87171', '#ffd700'];
const SECTOR_LABELS = ['↑ Up', '→ Right', '↓ Down', '← Left'];
// Richer glow colors per sector
const SECTOR_GLOWS = [
  'rgba(0, 212, 255, 0.5)',
  'rgba(74, 222, 128, 0.5)',
  'rgba(248, 113, 113, 0.5)',
  'rgba(255, 215, 0, 0.5)',
];

const TARGET_RING_COLORS = [
  '#00d4ff',  // bullseye — innermost
  'rgba(0, 212, 255, 0.35)',
  'rgba(0, 212, 255, 0.15)',
];
const GRID_COLOR = 'rgba(30, 36, 72, 0.8)';

// How many degrees each sector spans (4 sectors = 90° each)
// Sectors are oriented so "Up" is the top slice, "Right" the right slice, etc.
// Using the same cardinal-direction mapping as the actions (0=up, 1=right, 2=down, 3=left)
// For a pie chart:  angle 0 = right, so we offset by -90° for the "Up" sector to be at top.
const SECTOR_START_ANGLES = [
  -Math.PI / 2 - Math.PI / 4,  // Up: -135° to -45°
  -Math.PI / 4,                 // Right: -45° to 45°
  Math.PI / 4,                  // Down: 45° to 135°
  3 * Math.PI / 4,              // Left: 135° to 225°
];
const SECTOR_SWEEP = Math.PI / 2; // 90° per sector

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return which sector index a point (relative to center) belongs to. */
function sectorFromPoint(dx: number, dy: number): number {
  const angle = Math.atan2(dy, dx); // -π to π, 0 = right
  // Normalize into 0..2π
  const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Sectors: Right=0..90, Down=90..180, Left=180..270, Up=270..360
  // But our action mapping is 0=Up 1=Right 2=Down 3=Left, so remap:
  if (a >= (7 * Math.PI) / 4 || a < Math.PI / 4) return 1; // Right
  if (a >= Math.PI / 4 && a < (3 * Math.PI) / 4) return 2;  // Down
  if (a >= (3 * Math.PI) / 4 && a < (5 * Math.PI) / 4) return 3; // Left
  return 0; // Up
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DartThrow({
  numSectors = 4,
  probs,
  lastThrowSector = -1,
  lastThrowHit = false,
  isLearning = false,
  throwCount = 0,
  hitCount = 0,
  onManualThrow,
  mode = 'manual',
  className = '',
}: DartThrowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef(0);

  // Dart fly-in animation state
  const dartAnimRef = useRef({
    active: false,
    sector: -1,
    progress: 1.0, // 0 = at center, 1 = fully extended
    hit: false,
    flashTimer: 0,  // countdown frames for the reward flash
  });

  // Trigger dart animation when lastThrowSector changes to a valid value
  const prevThrowSectorRef = useRef(lastThrowSector);
  useEffect(() => {
    if (lastThrowSector !== prevThrowSectorRef.current && lastThrowSector >= 0) {
      dartAnimRef.current = {
        active: true,
        sector: lastThrowSector,
        progress: 0.0,
        hit: lastThrowHit,
        flashTimer: 90,
      };
    }
    prevThrowSectorRef.current = lastThrowSector;
  }, [lastThrowSector, lastThrowHit]);

  // Canvas click → detect sector
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual' || !onManualThrow) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalW = canvas.width / dpr;
    const logicalH = canvas.height / dpr;
    const cx = logicalW / 2;
    const cy = logicalH * 0.46; // target center Y

    const mouseX = (e.clientX - rect.left) * (logicalW / rect.width);
    const mouseY = (e.clientY - rect.top) * (logicalH / rect.height);

    const radius = Math.min(logicalW, logicalH * 0.9) * 0.44;
    const dx = mouseX - cx;
    const dy = mouseY - cy;
    if (dx * dx + dy * dy > radius * radius) return; // outside circle

    const sector = sectorFromPoint(dx, dy);
    if (sector < numSectors) onManualThrow(sector);
  }, [mode, onManualThrow, numSectors]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parentW = container.clientWidth;
      const size = Math.min(parentW, 300);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let frameCount = 0;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      frameCount++;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      // Target area occupies upper ~88% of canvas; probability bars take the bottom strip
      const targetAreaH = h * 0.88;
      const cx = w / 2;
      const cy = targetAreaH * 0.52;
      const outerR = Math.min(w, targetAreaH) * 0.44;

      // Advance dart animation
      const dart = dartAnimRef.current;
      if (dart.active && dart.progress < 1) {
        dart.progress = Math.min(1, dart.progress + 0.07);
      }
      if (dart.flashTimer > 0) {
        dart.flashTimer--;
      }

      // ── Clear ──────────────────────────────────────────────────────────────
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      // ── Draw target sectors ──────────────────────────────────────────────
      const activeSector = dart.active && dart.progress > 0.3 ? dart.sector : -1;

      for (let i = 0; i < numSectors; i++) {
        const start = SECTOR_START_ANGLES[i % 4];
        const end = start + SECTOR_SWEEP;
        const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
        const isActive = activeSector === i;
        const prob = probs[i] ?? 0;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, start, end);
        ctx.closePath();

        // Fill with alpha based on probability, brightened if active
        const baseAlpha = 0.08 + prob * 0.22;
        const alpha = isActive ? Math.min(0.6, baseAlpha + 0.3) : baseAlpha;
        ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
        // For hex colors, do a simple manual override:
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Sector border line
        ctx.strokeStyle = isActive
          ? color
          : `rgba(${hexToRgb(color)}, 0.3)`;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.stroke();

        // Sector label (close to outer edge)
        const midAngle = start + SECTOR_SWEEP / 2;
        const labelR = outerR * 0.72;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.font = `bold ${Math.floor(outerR * 0.13)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isActive ? color : `rgba(${hexToRgb(color)}, 0.6)`;
        if (isActive) {
          ctx.shadowColor = SECTOR_GLOWS[i % SECTOR_GLOWS.length];
          ctx.shadowBlur = 8;
        }
        ctx.fillText(SECTOR_LABELS[i % SECTOR_LABELS.length], lx, ly);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Dividing lines between sectors ──────────────────────────────────
      ctx.save();
      ctx.strokeStyle = 'rgba(30, 36, 72, 0.9)';
      ctx.lineWidth = 2;
      for (let i = 0; i < numSectors; i++) {
        const angle = SECTOR_START_ANGLES[i % 4];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      ctx.restore();

      // ── Target rings (concentric circles) ────────────────────────────────
      const ringRadii = [outerR * 0.25, outerR * 0.55, outerR];
      for (let ri = ringRadii.length - 1; ri >= 0; ri--) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadii[ri], 0, Math.PI * 2);
        ctx.strokeStyle = TARGET_RING_COLORS[ri];
        ctx.lineWidth = ri === 0 ? 2.5 : 1.5;
        if (ri === 0) {
          ctx.shadowColor = '#00d4ff';
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Outer ring tick marks ────────────────────────────────────────────
      ctx.save();
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const inner = i % 9 === 0 ? outerR - 8 : outerR - 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * (outerR + 2), cy + Math.sin(a) * (outerR + 2));
        ctx.stroke();
      }
      ctx.restore();

      // ── Dart animation ────────────────────────────────────────────────────
      if (dart.active && dart.progress > 0) {
        const sectorIdx = dart.sector;
        const midAngle = SECTOR_START_ANGLES[sectorIdx % 4] + SECTOR_SWEEP / 2;

        // Ease-out cubic for smooth deceleration
        const ease = 1 - Math.pow(1 - dart.progress, 3);

        // Stabilize landing position using a fixed offset per sector
        const landingOffsets = [0.18, 0.55, 0.18, 0.55];
        const land = dart.hit ? outerR * 0.15 : outerR * landingOffsets[sectorIdx % 4];
        const dartR = ease * land;

        const dartX = cx + Math.cos(midAngle) * dartR;
        const dartY = cy + Math.sin(midAngle) * dartR;

        const color = SECTOR_COLORS[sectorIdx % SECTOR_COLORS.length];

        ctx.save();
        // Dart shaft
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = SECTOR_GLOWS[sectorIdx % SECTOR_GLOWS.length];
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(dartX, dartY);
        ctx.stroke();

        // Dart tip circle
        ctx.beginPath();
        ctx.arc(dartX, dartY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Reward flash text ─────────────────────────────────────────────────
      if (dart.flashTimer > 0 && dart.progress >= 1) {
        const alpha = dart.flashTimer / 90;
        const riseY = cy - 30 - (1 - alpha) * 20;
        const text = dart.hit ? '+ Reward!' : '~ Miss';
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(outerR * 0.17)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = dart.hit ? '#4ade80' : '#708090';
        ctx.shadowColor = dart.hit ? 'rgba(74, 222, 128, 0.6)' : 'transparent';
        ctx.shadowBlur = 10;
        ctx.fillText(text, cx, riseY);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Learning pulse ring ───────────────────────────────────────────────
      if (isLearning) {
        const pulseScale = 1 + 0.04 * Math.sin(frameCount * 0.15);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, outerR * pulseScale, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(frameCount * 0.15);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // ── Probability bars ──────────────────────────────────────────────────
      const barAreaTop = targetAreaH + 4;
      const barH = (h - barAreaTop - 4) / numSectors;
      const barMaxW = w - 12;

      for (let i = 0; i < numSectors; i++) {
        const prob = probs[i] ?? 0;
        const by = barAreaTop + i * barH + 1;
        const barW = prob * barMaxW;
        const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
        const isHighProb = prob > 0.4;

        // Bar background track
        ctx.fillStyle = 'rgba(30, 36, 72, 0.6)';
        ctx.fillRect(6, by, barMaxW, barH - 2);

        // Bar fill
        ctx.save();
        if (isHighProb) {
          ctx.shadowColor = SECTOR_GLOWS[i % SECTOR_GLOWS.length];
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = color;
        ctx.globalAlpha = isHighProb ? 0.85 : 0.55;
        if (barW > 0) {
          ctx.fillRect(6, by, barW, barH - 2);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();

        // Probability percentage label
        ctx.font = `${Math.floor(barH * 0.65)}px monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(`${(prob * 100).toFixed(0)}%`, w - 4, by + (barH - 2) / 2);
      }

      // ── Manual-mode hover hint ────────────────────────────────────────────
      if (mode === 'manual') {
        ctx.save();
        ctx.font = `${Math.floor(outerR * 0.11)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(112, 128, 144, 0.7)';
        ctx.fillText('Click a sector to throw', cx, 4);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [numSectors, probs, isLearning, mode]);

  // Stats strip below
  const accuracy = throwCount > 0 ? ((hitCount / throwCount) * 100).toFixed(1) : '0.0';

  return (
    <div ref={containerRef} className={`flex flex-col items-center gap-3 ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Dart throw target environment"
        className={`rounded pixel-render ${mode === 'manual' ? 'cursor-crosshair' : ''}`}
        onClick={handleCanvasClick}
      />

      {/* Stats row */}
      <div className="flex gap-6 items-center">
        <div className="flex flex-col items-center">
          <span className="font-pixel text-[10px] text-[#708090] uppercase">Throws</span>
          <span className="font-pixel text-sm text-[#00d4ff]">{throwCount}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-pixel text-[10px] text-[#708090] uppercase">Hits</span>
          <span className="font-pixel text-sm text-[#4ade80]">{hitCount}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-pixel text-[10px] text-[#708090] uppercase">Accuracy</span>
          <span className="font-pixel text-sm text-[#ffd700]">{accuracy}%</span>
        </div>
        {isLearning && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full bg-[#00d4ff]"
              style={{ animation: 'pulse 1s ease-in-out infinite' }}
            />
            <span className="font-pixel text-[10px] text-[#00d4ff] uppercase">Learning</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Utility ────────────────────────────────────────────────────────────────

/** Convert a 6-digit hex color string to "r, g, b" for use in rgba(). */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
