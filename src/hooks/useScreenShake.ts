import { useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// useScreenShake — attaches a CSS transform shake to a ref element.
// Respects prefers-reduced-motion.
// ---------------------------------------------------------------------------

type ShakeIntensity = 'light' | 'medium' | 'heavy';

const INTENSITIES: Record<ShakeIntensity, { px: number; duration: number }> = {
  light:  { px: 3,  duration: 300 },
  medium: { px: 6,  duration: 400 },
  heavy:  { px: 10, duration: 500 },
};

export function useScreenShake() {
  const shakeRef = useRef<HTMLElement | null>(null);
  const animRef = useRef<number>(0);

  const triggerShake = useCallback((intensity: ShakeIntensity = 'medium') => {
    const el = shakeRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const { px, duration } = INTENSITIES[intensity];
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        el.style.transform = '';
        return;
      }
      const progress = elapsed / duration;
      const decay = 1 - progress;
      const x = (Math.random() * 2 - 1) * px * decay;
      const y = (Math.random() * 2 - 1) * px * decay;
      el.style.transform = `translate(${x}px, ${y}px)`;
      animRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  return { shakeRef, triggerShake };
}
