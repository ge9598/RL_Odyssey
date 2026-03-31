// ---------------------------------------------------------------------------
// ParticleSystem — Canvas-based particle effects
// Generalized from the TreasureChests CoinParticle pattern
// ---------------------------------------------------------------------------

export type ParticlePreset = 'confetti' | 'sparkle' | 'brickShatter' | 'goldBurst';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;     // 0–1
  maxLife: number;  // seconds
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = ['#ffd700', '#00d4ff', '#ff6b6b', '#4ade80', '#a78bfa', '#fb923c'];
const SPARKLE_COLORS = ['#ffffff', '#00d4ff', '#7be8ff', '#e0f7ff'];

export function createParticles(
  preset: ParticlePreset,
  x: number,
  y: number,
  options?: { color?: string; count?: number },
): Particle[] {
  const particles: Particle[] = [];

  switch (preset) {
    case 'confetti': {
      const count = options?.count ?? 30;
      for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = 2 + Math.random() * 4;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          life: 0, maxLife: 1.5 + Math.random() * 0.5,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 4 + Math.random() * 4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          shape: 'rect',
        });
      }
      break;
    }
    case 'sparkle': {
      const count = options?.count ?? 8;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0, maxLife: 0.6 + Math.random() * 0.3,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          size: 3 + Math.random() * 3,
          rotation: 0, rotationSpeed: 0,
          shape: 'circle',
        });
      }
      break;
    }
    case 'brickShatter': {
      const baseColor = options?.color ?? '#ff6b6b';
      const count = options?.count ?? 6;
      for (let i = 0; i < count; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const speed = 3 + Math.random() * 4;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 0, maxLife: 0.5 + Math.random() * 0.3,
          color: baseColor,
          size: 3 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.5,
          shape: 'rect',
        });
      }
      break;
    }
    case 'goldBurst': {
      const count = options?.count ?? 12;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 0, maxLife: 0.8 + Math.random() * 0.4,
          color: Math.random() > 0.5 ? '#ffd700' : '#ffaa00',
          size: 4 + Math.random() * 4,
          rotation: 0, rotationSpeed: 0,
          shape: 'circle',
        });
      }
      break;
    }
  }

  return particles;
}

/**
 * Update particles by dt seconds. Returns false when all particles are dead.
 */
export function updateParticles(particles: Particle[], dt: number): boolean {
  let anyAlive = false;
  for (const p of particles) {
    p.life += dt / p.maxLife;
    if (p.life >= 1) continue;
    anyAlive = true;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // gravity
    p.rotation += p.rotationSpeed;
  }
  return anyAlive;
}

/**
 * Draw all live particles onto ctx.
 */
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    if (p.life >= 1) continue;
    const alpha = 1 - p.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
