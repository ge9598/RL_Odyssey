/**
 * Managed animation loop — pausable, speed-adjustable, steppable.
 */
export class AnimationLoop {
  private rafId: number | null = null;
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private stepDuration: number; // ms per logical step
  private speed = 1;
  private onStep: (dt: number) => void;
  private onRender: (interpolation: number) => void;

  constructor(opts: {
    stepsPerSecond?: number;
    onStep: (dt: number) => void;
    onRender: (interpolation: number) => void;
  }) {
    this.stepDuration = 1000 / (opts.stepsPerSecond ?? 60);
    this.onStep = opts.onStep;
    this.onRender = opts.onRender;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Advance exactly one step (for single-step mode) */
  singleStep(): void {
    this.onStep(this.stepDuration);
    this.onRender(1);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    const dt = Math.min(now - this.lastTime, 100); // cap at 100ms
    this.lastTime = now;
    this.accumulator += dt * this.speed;

    let steps = 0;
    const maxSteps = this.speed >= 10 ? 50 : 10;

    while (this.accumulator >= this.stepDuration && steps < maxSteps) {
      this.onStep(this.stepDuration);
      this.accumulator -= this.stepDuration;
      steps++;
    }

    if (steps >= maxSteps) {
      this.accumulator = 0;
    }

    const interpolation = this.accumulator / this.stepDuration;
    this.onRender(interpolation);
  };

  destroy(): void {
    this.stop();
  }
}
