import type { ReactNode } from 'react';

interface PixelPanelProps {
  children: ReactNode;
  variant?: 'default' | 'gold';
  className?: string;
  title?: string;
}

export function PixelPanel({
  children,
  variant = 'default',
  className = '',
  title,
}: PixelPanelProps) {
  const borderClass = variant === 'gold' ? 'pixel-border-gold' : 'pixel-border';

  return (
    <div
      className={`
        ${borderClass} glass-panel rounded-sm p-5
        ${className}
      `}
    >
      {title && (
        <h3 className="font-pixel text-xs text-[#00d4ff] mb-3 uppercase tracking-wider glow-accent">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
