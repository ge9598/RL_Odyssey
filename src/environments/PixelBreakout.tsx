/**
 * PixelBreakout — A simplified Breakout game rendered on Canvas.
 *
 * 8 columns x 3 rows of bricks, a paddle, and a bouncing ball.
 * State encoding for DQN: [ballX/w, ballY/h, ballVx, ballVy, paddleX/w]
 * Actions: 0 = left, 1 = stay, 2 = right
 */

import { useRef, useEffect, useCallback } from 'react';
import { clamp } from '@/utils/math';
import { useGameStore } from '@/stores/gameStore';
import { drawPetEmoji } from '@/utils/petRenderer';
import { DEFAULT_PET } from '@/config/pets';

// -- Game constants --
const COLS = 8;
const ROWS = 3;
const BRICK_PADDING = 2;
const BRICK_TOP_OFFSET = 40;
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH_FRAC = 0.15; // fraction of canvas width
const BALL_SIZE = 6;
const PADDLE_SPEED = 5;
const BALL_BASE_SPEED = 3;

const BRICK_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#4ade80'];

export interface BreakoutState {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  paddleX: number;
  bricks: boolean[][]; // true = alive
  score: number;
  lives: number;
  gameOver: boolean;
  won: boolean;
}

export interface PixelBreakoutProps {
  onStep?: (state: number[], reward: number, done: boolean, score: number) => void;
  onGameOver?: (score: number) => void;
  action?: number;
  mode: 'manual' | 'auto';
  speed?: number;
  showQValues?: boolean;
  qValues?: number[];
  width?: number;
  height?: number;
  paused?: boolean;
}

function initBricks(): boolean[][] {
  const bricks: boolean[][] = [];
  for (let r = 0; r < ROWS; r++) {
    bricks.push(new Array(COLS).fill(true));
  }
  return bricks;
}

function countBricks(bricks: boolean[][]): number {
  let count = 0;
  for (const row of bricks) {
    for (const b of row) {
      if (b) count++;
    }
  }
  return count;
}

function createInitialState(w: number, h: number): BreakoutState {
  return {
    ballX: w / 2,
    ballY: h - 50,
    ballVx: BALL_BASE_SPEED * (Math.random() > 0.5 ? 1 : -1),
    ballVy: -BALL_BASE_SPEED,
    paddleX: w / 2,
    bricks: initBricks(),
    score: 0,
    lives: 1,
    gameOver: false,
    won: false,
  };
}

/** Encode game state as normalized vector for DQN */
function encodeState(state: BreakoutState, w: number, h: number): number[] {
  return [
    state.ballX / w,
    state.ballY / h,
    state.ballVx / (BALL_BASE_SPEED * 2),
    state.ballVy / (BALL_BASE_SPEED * 2),
    state.paddleX / w,
  ];
}

function drawQValueOverlay(
  ctx: CanvasRenderingContext2D,
  qVals: number[],
  paddleLeft: number,
  paddleTop: number,
  paddleW: number,
) {
  const barWidth = paddleW / 3 - 2;
  const maxQ = Math.max(...qVals.map(Math.abs), 0.001);
  const labels = ['<', '-', '>'];
  const colors = ['#f87171', '#fbbf24', '#4ade80'];

  for (let i = 0; i < 3; i++) {
    const x = paddleLeft + i * (barWidth + 2);
    const barHeight = (Math.abs(qVals[i]) / maxQ) * 30;
    const y = paddleTop - 8 - barHeight;

    ctx.fillStyle = colors[i];
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barWidth / 2, paddleTop - 2);
  }
}

export function PixelBreakout({
  onStep,
  onGameOver,
  action,
  mode,
  speed = 1,
  showQValues = false,
  qValues,
  width = 320,
  height = 400,
  paused = false,
}: PixelBreakoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BreakoutState>(createInitialState(width, height));
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const gameOverCalledRef = useRef(false);
  const petEmoji = useGameStore((s) => s.selectedPet || DEFAULT_PET);
  const petEmojiRef = useRef(petEmoji);
  useEffect(() => { petEmojiRef.current = petEmoji; }, [petEmoji]);

  // Pet emoji — via ref to avoid re-creating render loop
  const petEmoji = useGameStore((s) => s.selectedPet) ?? DEFAULT_PET;
  const petEmojiRef = useRef(petEmoji);
  useEffect(() => { petEmojiRef.current = petEmoji; }, [petEmoji]);

  const paddleW = width * PADDLE_WIDTH_FRAC;
  const brickW = (width - (COLS + 1) * BRICK_PADDING) / COLS;
  const brickH = 14;

  const resetGame = useCallback(() => {
    stateRef.current = createInitialState(width, height);
    gameOverCalledRef.current = false;
  }, [width, height]);

  // Keyboard input
  useEffect(() => {
    if (mode !== 'manual') return;
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [mode]);

  // Mouse/touch input
  useEffect(() => {
    if (mode !== 'manual') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      stateRef.current.paddleX = clamp(x, paddleW / 2, width - paddleW / 2);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [mode, paddleW, width]);

  // Tick game logic
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver) return;

    // Move paddle
    if (mode === 'manual') {
      if (keysRef.current.has('ArrowLeft')) {
        s.paddleX = clamp(s.paddleX - PADDLE_SPEED, paddleW / 2, width - paddleW / 2);
      }
      if (keysRef.current.has('ArrowRight')) {
        s.paddleX = clamp(s.paddleX + PADDLE_SPEED, paddleW / 2, width - paddleW / 2);
      }
    } else if (action !== undefined) {
      // AI control: 0=left, 1=stay, 2=right
      if (action === 0) {
        s.paddleX = clamp(s.paddleX - PADDLE_SPEED, paddleW / 2, width - paddleW / 2);
      } else if (action === 2) {
        s.paddleX = clamp(s.paddleX + PADDLE_SPEED, paddleW / 2, width - paddleW / 2);
      }
    }

    // Move ball
    s.ballX += s.ballVx;
    s.ballY += s.ballVy;

    let stepReward = 0;

    // Wall collisions
    if (s.ballX - BALL_SIZE / 2 <= 0) {
      s.ballX = BALL_SIZE / 2;
      s.ballVx = Math.abs(s.ballVx);
    }
    if (s.ballX + BALL_SIZE / 2 >= width) {
      s.ballX = width - BALL_SIZE / 2;
      s.ballVx = -Math.abs(s.ballVx);
    }
    if (s.ballY - BALL_SIZE / 2 <= 0) {
      s.ballY = BALL_SIZE / 2;
      s.ballVy = Math.abs(s.ballVy);
    }

    // Paddle collision
    const paddleTop = height - 30;
    const paddleLeft = s.paddleX - paddleW / 2;
    const paddleRight = s.paddleX + paddleW / 2;

    if (
      s.ballVy > 0 &&
      s.ballY + BALL_SIZE / 2 >= paddleTop &&
      s.ballY + BALL_SIZE / 2 <= paddleTop + PADDLE_HEIGHT + 4 &&
      s.ballX >= paddleLeft &&
      s.ballX <= paddleRight
    ) {
      s.ballVy = -Math.abs(s.ballVy);
      // Angle adjustment: hit left side = go left, right = go right
      const relativeHit = (s.ballX - s.paddleX) / (paddleW / 2);
      s.ballVx = relativeHit * BALL_BASE_SPEED * 1.5;
      // Ensure minimum vertical speed
      if (Math.abs(s.ballVy) < BALL_BASE_SPEED * 0.5) {
        s.ballVy = -BALL_BASE_SPEED;
      }
      stepReward += 0.1; // small reward for hitting paddle
    }

    // Ball falls below paddle
    if (s.ballY > height) {
      s.lives--;
      stepReward = -1;
      if (s.lives <= 0) {
        s.gameOver = true;
        if (!gameOverCalledRef.current) {
          gameOverCalledRef.current = true;
          onGameOver?.(s.score);
        }
      } else {
        // Reset ball position
        s.ballX = width / 2;
        s.ballY = height - 50;
        s.ballVx = BALL_BASE_SPEED * (Math.random() > 0.5 ? 1 : -1);
        s.ballVy = -BALL_BASE_SPEED;
      }
    }

    // Brick collisions
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!s.bricks[r][c]) continue;

        const bx = BRICK_PADDING + c * (brickW + BRICK_PADDING);
        const by = BRICK_TOP_OFFSET + r * (brickH + BRICK_PADDING);

        if (
          s.ballX + BALL_SIZE / 2 >= bx &&
          s.ballX - BALL_SIZE / 2 <= bx + brickW &&
          s.ballY + BALL_SIZE / 2 >= by &&
          s.ballY - BALL_SIZE / 2 <= by + brickH
        ) {
          s.bricks[r][c] = false;
          s.score++;
          stepReward += 1;
          s.ballVy = -s.ballVy;
          break; // Only one brick per tick
        }
      }
    }

    // Check win
    if (countBricks(s.bricks) === 0) {
      s.won = true;
      s.gameOver = true;
      stepReward += 5;
      if (!gameOverCalledRef.current) {
        gameOverCalledRef.current = true;
        onGameOver?.(s.score);
      }
    }

    // Callback
    if (onStep) {
      const encoded = encodeState(s, width, height);
      onStep(encoded, stepReward, s.gameOver, s.score);
    }
  }, [mode, action, width, height, paddleW, brickW, onStep, onGameOver]);

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const s = stateRef.current;

    // Background
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, width, height);

    // Draw bricks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!s.bricks[r][c]) continue;
        const bx = BRICK_PADDING + c * (brickW + BRICK_PADDING);
        const by = BRICK_TOP_OFFSET + r * (brickH + BRICK_PADDING);
        const colorIdx = Math.min(r, BRICK_COLORS.length - 1);
        ctx.fillStyle = BRICK_COLORS[colorIdx];
        ctx.fillRect(bx, by, brickW, brickH);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(bx, by, brickW, 2);
      }
    }

    // Draw paddle
    const paddleTop = height - 30;
    const paddleLeft = s.paddleX - paddleW / 2;
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(paddleLeft, paddleTop, paddleW, PADDLE_HEIGHT);
    // Paddle glow
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(paddleLeft, paddleTop, paddleW, PADDLE_HEIGHT);
    ctx.shadowBlur = 0;

    // Pet emoji above the paddle
    drawPetEmoji(ctx, petEmojiRef.current, s.paddleX, paddleTop - 16, 22, { glow: true });

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      s.ballX - BALL_SIZE / 2,
      s.ballY - BALL_SIZE / 2,
      BALL_SIZE,
      BALL_SIZE,
    );

    // Score
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px "Silkscreen", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${s.score}`, 8, 20);

    // Pet emoji above paddle
    const petSize = Math.min(22, paddleW * 0.5);
    ctx.font = `${petSize}px "Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(petEmojiRef.current, s.paddleX, paddleTop - (showQValues && qValues ? 38 : 4));

    // Q-value overlay
    if (showQValues && qValues && qValues.length === 3) {
      drawQValueOverlay(ctx, qValues, paddleLeft, paddleTop, paddleW);
    }

    // Game over text
    if (s.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, height / 2 - 30, width, 60);
      ctx.fillStyle = s.won ? '#4ade80' : '#f87171';
      ctx.font = '16px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.won ? 'YOU WIN!' : 'GAME OVER', width / 2, height / 2 + 5);
    }
  }, [width, height, paddleW, brickW, showQValues, qValues]);

  // Animation loop
  useEffect(() => {
    const stepMs = 1000 / 60;

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);

      if (paused) {
        render();
        lastTimeRef.current = now;
        return;
      }

      const dt = Math.min(now - (lastTimeRef.current || now), 100);
      lastTimeRef.current = now;
      accumulatorRef.current += dt * speed;

      let steps = 0;
      const maxSteps = speed >= 10 ? 30 : 10;
      while (accumulatorRef.current >= stepMs && steps < maxSteps) {
        tick();
        accumulatorRef.current -= stepMs;
        steps++;
      }
      if (steps >= maxSteps) accumulatorRef.current = 0;

      render();
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tick, render, speed, paused]);

  // Reset game when component mounts
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="rounded-sm pixel-border"
        style={{ width, height }}
        tabIndex={0}
        role="img"
        aria-label="Breakout game"
      />
    </div>
  );
}
