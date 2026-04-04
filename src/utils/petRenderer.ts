/**
 * petRenderer — draws a pet emoji on a Canvas 2D context.
 *
 * Usage:
 *   drawPetEmoji(ctx, '🐕', centerX, centerY, 32, { glow: true });
 */

export interface PetDrawOptions {
  glow?: boolean;
  opacity?: number;
}

export function drawPetEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  size: number,
  opts: PetDrawOptions = {},
): void {
  const { glow = false, opacity = 1 } = opts;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (glow) {
    ctx.shadowColor = 'rgba(0, 212, 255, 0.8)';
    ctx.shadowBlur = size * 0.5;
  }

  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);

  ctx.restore();
}
