import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PixelButton } from '@/components/ui';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PortStepShellProps {
  /** Step display name (already translated). */
  title: string;
  /** Optional duration hint shown beside the title. */
  durationHint?: string;
  /** Main content. */
  children: ReactNode;
  /** Show a "Next" / "Continue" button at the bottom. */
  onNext?: () => void;
  /** Label override for the next button (defaults to i18n "common.next"). */
  nextLabel?: string;
  /** Show a "Skip" button at the bottom. */
  onSkip?: () => void;
  /** Show a "Back" button at the bottom. */
  onBack?: () => void;
  /** Disable the next button (e.g. quest not yet complete). */
  nextDisabled?: boolean;
  /** Extra CSS classes on the outer wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PortStepShell({
  title,
  durationHint,
  children,
  onNext,
  onSkip,
  onBack,
  nextLabel,
  nextDisabled = false,
  className = '',
}: PortStepShellProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`
        glass-panel pixel-border rounded-sm
        flex flex-col w-full max-w-4xl mx-auto
        animate-[fadeIn_0.35s_ease-out]
        ${className}
      `}
      style={{
        /* Inline keyframes fallback — component-scoped fade */
        animation: 'portStepFadeIn 0.35s ease-out',
      }}
    >
      {/* ---- Title bar ---- */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
        <h3 className="font-pixel text-xs text-[#00d4ff] uppercase tracking-wider glow-accent">
          {title}
        </h3>
        {durationHint && (
          <span className="font-body text-sm text-[#708090]">
            ~ {durationHint}
          </span>
        )}
      </div>

      {/* ---- Content area ---- */}
      <div className="flex-1 p-5 overflow-y-auto">{children}</div>

      {/* ---- Bottom action bar ---- */}
      {(onBack || onNext || onSkip) && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.06)]">
          <div>
            {onBack && (
              <PixelButton variant="secondary" size="sm" onClick={onBack}>
                {t('common.back')}
              </PixelButton>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onSkip && (
              <PixelButton variant="secondary" size="sm" onClick={onSkip}>
                {t('common.skip')}
              </PixelButton>
            )}
            {onNext && (
              <PixelButton
                variant="primary"
                size="md"
                onClick={onNext}
                disabled={nextDisabled}
              >
                {nextLabel ?? t('common.next')}
              </PixelButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PortStepShell;
