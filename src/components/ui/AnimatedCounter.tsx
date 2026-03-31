import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  /** Duration of count-up animation in ms (default 800) */
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Animates from old value → new value over `duration` ms using requestAnimationFrame.
 * Glows gold during the animation.
 */
export function AnimatedCounter({
  value,
  duration = 800,
  className = '',
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const prevValueRef = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    if (from === to) return;

    prevValueRef.current = to;
    setIsAnimating(true);

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(to);
        setIsAnimating(false);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  return (
    <span
      className={`transition-all duration-200 ${isAnimating ? 'glow-gold scale-110' : ''} ${className}`}
      style={{ display: 'inline-block' }}
    >
      {prefix}{displayValue}{suffix}
    </span>
  );
}
