import { useRef, useCallback } from 'react';

type ShakeIntensity = 'light' | 'medium' | 'heavy';

const SHAKE_CONFIG: Record<ShakeIntensity, { magnitude: number; duration: number }> = {
  light:  { magnitude: 3,  duration: 300 },
  medium: { magnitude: 6,  duration: 400 },
  heavy:  { magnitude: 12, duration: 500 },
};

interface UseScreenShakeReturn {
  /** Attach this ref to the element you want to shake */
  shakeRef: React.RefObject<HTMLDivElement | null>;
  /** Call this to trigger a shake */
  triggerShake: (intensity?: ShakeIntensity) => void;
}

/**
 * CSS-based screen shake hook.
 * Respects prefers-reduced-motion.
 */
export function useScreenShake(): UseScreenShakeReturn {
  const shakeRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const triggerShake = useCallback((intensity: ShakeIntensity = 'medium') => {
    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!shakeRef.current) return;

    const { magnitude, duration } = SHAKE_CONFIG[intensity];
    const el = shakeRef.current;
    const startTime = performance.now();

    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= duration) {
        el.style.transform = '';
        animFrameRef.current = null;
        return;
      }
      const decay = 1 - elapsed / duration;
      const dx = (Math.random() - 0.5) * 2 * magnitude * decay;
      const dy = (Math.random() - 0.5) * 2 * magnitude * decay;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  return { shakeRef, triggerShake };
}
