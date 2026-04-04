import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// AnimatedCounter — counts up/down from old value to new value over ~800ms
// with a golden glow pulse on change.
// ---------------------------------------------------------------------------

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number; // ms, default 800
}

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  className = '',
  duration = 800,
}: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState(value);
  const [glowing, setGlowing] = useState(false);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    prevRef.current = to;
    setGlowing(true);

    const start = performance.now();
    const diff = to - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + diff * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(to);
        setTimeout(() => setGlowing(false), 400);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span
      className={`transition-all duration-300 ${className} ${glowing ? 'glow-gold scale-110' : ''}`}
      style={{ display: 'inline-block' }}
    >
      {prefix}{displayed.toLocaleString()}{suffix}
    </span>
  );
}
