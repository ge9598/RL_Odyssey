import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { DEFAULT_PET } from '@/config/pets';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CoinParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface TreasureChestsProps {
  numChests: number;
  selectedChest: number | null;
  chestRewards: number[];
  chestCounts: number[];
  chestValues: number[];
  isAnimating: boolean;
  onChestClick?: (index: number) => void;
  mode: 'manual' | 'auto' | 'quest';
  highlightChest?: number;
}

// ─── Colors ─────────────────────────────────────────────────────────────────
const BG = '#0a0e27';
const CHEST_BODY = '#8B5E3C';
const CHEST_BODY_DARK = '#6B3F1F';
const CHEST_LID = '#A0724A';
const CHEST_LID_DARK = '#7A5232';
const CHEST_LOCK = '#ffd700';
const CHEST_OPEN_INNER = '#2a1a0a';
const ACCENT = '#00d4ff';
const GOLD = '#ffd700';
const GOLD_DIM = 'rgba(255, 215, 0, 0.3)';
const TEXT_DIM = '#708090';
const BAR_BG = 'rgba(30, 36, 72, 0.8)';
const HIGHLIGHT_GLOW = 'rgba(0, 212, 255, 0.4)';
const COIN_COLORS = ['#ffd700', '#ffe44d', '#ffcc00', '#e6b800'];

// ─── Drawing Helpers ────────────────────────────────────────────────────────

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string, borderColor?: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
}

function drawClosedChest(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size;
  const h = size * 0.7;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Body
  drawPixelRect(ctx, x, y + h * 0.35, w, h * 0.65, CHEST_BODY, CHEST_BODY_DARK);

  // Lid
  drawPixelRect(ctx, x - 2, y, w + 4, h * 0.4, CHEST_LID, CHEST_LID_DARK);

  // Lid bevel highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(x, y + 2, w, 3);

  // Lock
  const lockSize = size * 0.12;
  ctx.fillStyle = CHEST_LOCK;
  ctx.fillRect(cx - lockSize, y + h * 0.3, lockSize * 2, lockSize * 2);

  // Lock keyhole
  ctx.fillStyle = CHEST_BODY_DARK;
  ctx.fillRect(cx - 2, y + h * 0.3 + lockSize * 0.5, 4, lockSize);
}

function drawOpenChest(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, glow: number) {
  const w = size;
  const h = size * 0.7;
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Glow from inside
  if (glow > 0) {
    const gradient = ctx.createRadialGradient(cx, cy - h * 0.1, 0, cx, cy - h * 0.1, size * 0.8);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.3 * glow})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  }

  // Body
  drawPixelRect(ctx, x, y + h * 0.35, w, h * 0.65, CHEST_BODY, CHEST_BODY_DARK);

  // Open interior
  drawPixelRect(ctx, x + 4, y + h * 0.35 + 3, w - 8, h * 0.3, CHEST_OPEN_INNER);

  // Lid (angled open)
  ctx.save();
  ctx.translate(cx, y + h * 0.35);
  ctx.rotate(-0.7);
  drawPixelRect(ctx, -w / 2 - 2, -h * 0.38, w + 4, h * 0.4, CHEST_LID, CHEST_LID_DARK);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(-w / 2, -h * 0.38 + 2, w, 3);
  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TreasureChests({
  numChests,
  selectedChest,
  chestRewards,
  chestCounts,
  chestValues,
  isAnimating,
  onChestClick,
  mode,
  highlightChest,
}: TreasureChestsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<CoinParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const openAnimRef = useRef<number>(0);     // 0..1 animation progress for open
  const openChestRef = useRef<number | null>(null);
  const rewardFlashRef = useRef<number>(0);
  const petEmoji = useGameStore((s) => s.selectedPet || DEFAULT_PET);
  const petEmojiRef = useRef(petEmoji);
  useEffect(() => { petEmojiRef.current = petEmoji; }, [petEmoji]);

  // Track last selectedChest to trigger open animation
  const lastSelectedRef = useRef<number | null>(null);

  // Responsive sizing
  const getLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { w: 600, h: 300, chestSize: 64, spacing: 100, baseY: 120, barY: 200 };
    const w = canvas.parentElement?.clientWidth ?? 600;
    const h = 300;
    const margin = 40;
    const available = w - margin * 2;
    const spacing = Math.min(120, available / numChests);
    const chestSize = Math.min(64, spacing * 0.65);
    const startX = (w - spacing * (numChests - 1)) / 2;
    return { w, h, chestSize, spacing, startX, baseY: 110, barY: 210 };
  }, [numChests]);

  // Spawn coin particles when a chest opens
  const spawnCoins = useCallback((chestIdx: number) => {
    const layout = getLayout();
    const cx = (layout.startX ?? 0) + chestIdx * layout.spacing;
    const cy = layout.baseY;
    const particles: CoinParticle[] = [];
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy - 10,
        vx: (Math.random() - 0.5) * 3,
        vy: -(Math.random() * 4 + 2),
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
      });
    }
    particlesRef.current = [...particlesRef.current, ...particles];
  }, [getLayout]);

  // Detect new chest selection -> trigger animation
  useEffect(() => {
    if (selectedChest !== null && selectedChest !== lastSelectedRef.current) {
      openChestRef.current = selectedChest;
      openAnimRef.current = 0;
      rewardFlashRef.current = 1;
      spawnCoins(selectedChest);
    }
    lastSelectedRef.current = selectedChest;
  }, [selectedChest, spawnCoins]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = 300;
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
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = 0;

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const layout = getLayout();
      const { w, h, chestSize, spacing, baseY, barY } = layout;
      const startX = layout.startX ?? (w - spacing * (numChests - 1)) / 2;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Update open animation
      if (openAnimRef.current < 1 && openChestRef.current !== null) {
        openAnimRef.current = Math.min(1, openAnimRef.current + dt * 4);
      }
      rewardFlashRef.current = Math.max(0, rewardFlashRef.current - dt * 2);

      // Draw chests
      for (let i = 0; i < numChests; i++) {
        const cx = startX + i * spacing;
        const isOpen = i === openChestRef.current && openAnimRef.current > 0.3;
        const isHighlighted = i === highlightChest;
        const isSelected = i === selectedChest;

        // Highlight glow
        if (isHighlighted || isSelected) {
          const gradient = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, chestSize * 1.2);
          gradient.addColorStop(0, isHighlighted ? HIGHLIGHT_GLOW : 'rgba(255, 215, 0, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(cx - chestSize * 1.2, baseY - chestSize * 1.2, chestSize * 2.4, chestSize * 2.4);
        }

        if (isOpen) {
          drawOpenChest(ctx, cx, baseY, chestSize, rewardFlashRef.current);
        } else {
          drawClosedChest(ctx, cx, baseY, chestSize);
        }

        // Reward number floating above (when just opened)
        if (i === openChestRef.current && rewardFlashRef.current > 0 && chestRewards[i] !== undefined) {
          ctx.save();
          ctx.globalAlpha = rewardFlashRef.current;
          ctx.font = `bold ${Math.round(chestSize * 0.35)}px "Silkscreen", monospace`;
          ctx.textAlign = 'center';
          ctx.fillStyle = GOLD;
          ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
          ctx.shadowBlur = 10;
          const floatY = baseY - chestSize * 0.6 - (1 - rewardFlashRef.current) * 20;
          ctx.fillText(`+${chestRewards[i].toFixed(1)}`, cx, floatY);
          ctx.restore();
        }

        // Chest number label
        ctx.font = '12px "Silkscreen", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = TEXT_DIM;
        ctx.fillText(`#${i + 1}`, cx, baseY + chestSize * 0.55);

        // Value bars (shown in auto and quest modes, or when counts > 0 in manual)
        if (mode !== 'manual' || chestCounts[i] > 0) {
          const maxVal = Math.max(1, ...chestValues);
          const barMaxH = 50;
          const barW = Math.min(30, spacing * 0.4);
          const barH = (chestValues[i] / maxVal) * barMaxH;
          const barX = cx - barW / 2;
          const barBaseY = barY + barMaxH;

          // Bar background
          drawPixelRect(ctx, barX, barY, barW, barMaxH, BAR_BG);

          // Bar fill
          if (barH > 0) {
            const grad = ctx.createLinearGradient(barX, barBaseY - barH, barX, barBaseY);
            grad.addColorStop(0, ACCENT);
            grad.addColorStop(1, 'rgba(0, 212, 255, 0.4)');
            ctx.fillStyle = grad;
            ctx.fillRect(barX + 1, barBaseY - barH, barW - 2, barH);
          }

          // Value label
          ctx.font = '10px "Silkscreen", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = ACCENT;
          if (chestValues[i] > 0) {
            ctx.fillText(chestValues[i].toFixed(1), cx, barY - 4);
          }

          // Count label
          ctx.fillStyle = GOLD_DIM;
          ctx.fillText(`${chestCounts[i]}`, cx, barBaseY + 14);
        }
      }

      // Pet emoji — shown above the highlighted/selected chest
      const petTargetChest = highlightChest ?? (selectedChest ?? -1);
      if (petTargetChest >= 0 && petTargetChest < numChests) {
        const cx = startX + petTargetChest * layout.spacing;
        const petSize = Math.min(28, layout.chestSize * 0.55);
        ctx.save();
        ctx.font = `${petSize}px "Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(petEmojiRef.current, cx, layout.baseY - layout.chestSize * 0.55);
        ctx.restore();
      }

      // Update and draw coin particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 6 * dt; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt / p.maxLife;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = COIN_COLORS[Math.floor(Math.random() * COIN_COLORS.length)];
        ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
        ctx.shadowBlur = 4;
        // Draw pixel-style coin (small square)
        ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [numChests, selectedChest, chestRewards, chestCounts, chestValues, isAnimating, mode, highlightChest, getLayout]);

  // Click handler
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onChestClick || isAnimating) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const layout = getLayout();
      const startX = layout.startX ?? 0;

      for (let i = 0; i < numChests; i++) {
        const cx = startX + i * layout.spacing;
        if (Math.abs(x - cx) < layout.chestSize * 0.7) {
          onChestClick(i);
          return;
        }
      }
    },
    [onChestClick, isAnimating, numChests, getLayout]
  );

  // Keyboard support for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!onChestClick || isAnimating) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= numChests) {
        onChestClick(num - 1);
      }
    },
    [onChestClick, isAnimating, numChests]
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label={`${numChests} treasure chests. Click or press 1-${numChests} to open.`}
      className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00d4ff] rounded"
      style={{ height: 300, background: BG }}
    />
  );
}

/*
 * ── i18n KEYS NEEDED ──
 * (No new keys required — all labels use numbers/symbols. Aria labels are English-only
 *  as a baseline; full aria i18n can be added in a follow-up pass.)
 */
