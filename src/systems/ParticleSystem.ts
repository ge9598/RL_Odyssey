// ---------------------------------------------------------------------------
// ParticleSystem — lightweight Canvas particle engine
// Provides 4 presets: confetti, sparkle, brickShatter, goldBurst
// ---------------------------------------------------------------------------

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation?: number;
  rotSpeed?: number;
}

export type ParticlePreset = 'confetti' | 'sparkle' | 'brickShatter' | 'goldBurst';

const CONFETTI_COLORS = ['#ffd700', '#00d4ff', '#f87171', '#4ade80', '#a78bfa', '#fb923c'];
const SPARKLE_COLORS = ['#ffffff', '#00d4ff', '#40e0d0'];

// ---- Particle factories ----------------------------------------------------

export function createConfetti(cx: number, cy: number): Particle[] {
  return Array.from({ length: 30 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    return {
      x: cx + (Math.random() - 0.5) * 80,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: -(2 + Math.random() * 3),
      size: 4 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      alpha: 1,
      decay: 0.008 + Math.random() * 0.006,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    };
  });
}

export function createSparkle(cx: number, cy: number): Particle[] {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 3,
      color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
      alpha: 1,
      decay: 0.025,
    };
  });
}

export function createBrickShatter(cx: number, cy: number, color: string): Particle[] {
  return Array.from({ length: 6 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    return {
      x: cx + (Math.random() - 0.5) * 20,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      size: 4 + Math.random() * 4,
      color,
      alpha: 1,
      decay: 0.03,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 15,
    };
  });
}

export function createGoldBurst(cx: number, cy: number): Particle[] {
  return Array.from({ length: 12 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 5 + Math.random() * 5,
      color: Math.random() > 0.5 ? '#ffd700' : '#ffb700',
      alpha: 1,
      decay: 0.018 + Math.random() * 0.01,
    };
  });
}

// ---- Particle update + draw ------------------------------------------------

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.15, // gravity
      alpha: p.alpha - p.decay,
      rotation: p.rotation !== undefined ? p.rotation + (p.rotSpeed ?? 0) : undefined,
    }))
    .filter((p) => p.alpha > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    if (p.rotation !== undefined) ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });
}

// ---- ParticleSystem class (stateful helper) --------------------------------

export class ParticleSystem {
  private particles: Particle[] = [];

  emit(preset: ParticlePreset, cx: number, cy: number, color?: string) {
    switch (preset) {
      case 'confetti':
        this.particles.push(...createConfetti(cx, cy));
        break;
      case 'sparkle':
        this.particles.push(...createSparkle(cx, cy));
        break;
      case 'brickShatter':
        this.particles.push(...createBrickShatter(cx, cy, color ?? '#00d4ff'));
        break;
      case 'goldBurst':
        this.particles.push(...createGoldBurst(cx, cy));
        break;
    }
  }

  update() {
    this.particles = updateParticles(this.particles);
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawParticles(ctx, this.particles);
  }

  get count() { return this.particles.length; }

  clear() { this.particles = []; }
}
