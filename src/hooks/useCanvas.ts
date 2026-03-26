import { useRef, useEffect, useCallback } from 'react';

interface UseCanvasOptions {
  width?: number;
  height?: number;
  pixelRatio?: number;
  onDraw?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
}

export function useCanvas(options: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height, pixelRatio = 1, onDraw } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = width ?? canvas.parentElement?.clientWidth ?? 800;
    const h = height ?? canvas.parentElement?.clientHeight ?? 600;

    canvas.width = w * pixelRatio;
    canvas.height = h * pixelRatio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingEnabled = false;

    if (onDraw) {
      onDraw(ctx, canvas);
    }
  }, [width, height, pixelRatio, onDraw]);

  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext('2d') ?? null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  return { canvasRef, getContext, clear };
}
