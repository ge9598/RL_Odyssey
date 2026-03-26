import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: `bg-gradient-to-b from-[#00e4ff] to-[#00b4d8] text-[#0a0e27] font-bold
    hover:from-[#33eaff] hover:to-[#00d4ff] hover:shadow-[0_0_16px_rgba(0,212,255,0.4)]`,
  secondary: `bg-gradient-to-b from-[#1e2448] to-[#161b3a] text-[#e2e8f0]
    border border-[rgba(0,212,255,0.3)] hover:border-[rgba(0,212,255,0.6)]
    hover:shadow-[0_0_12px_rgba(0,212,255,0.15)]`,
  gold: `bg-gradient-to-b from-[#ffd700] to-[#e6b800] text-[#0a0e27] font-bold
    hover:from-[#ffdf33] hover:to-[#ffd700] hover:shadow-[0_0_16px_rgba(255,215,0,0.4)]`,
  danger: `bg-gradient-to-b from-[#f87171] to-[#dc2626] text-white font-bold
    hover:from-[#fca5a5] hover:to-[#f87171] hover:shadow-[0_0_16px_rgba(248,113,113,0.4)]`,
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-1.5 text-xs',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-10 py-3.5 text-base',
};

export function PixelButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={`
        font-pixel cursor-pointer rounded-sm
        transition-all duration-150 ease-out
        active:translate-y-0.5 active:brightness-90
        shadow-[0_3px_10px_rgba(0,0,0,0.3)]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-40 cursor-not-allowed active:translate-y-0 saturate-50' : ''}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
