import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';

// ---------------------------------------------------------------------------
// PrimerStep — Generic concept primer step (skippable)
//
// Reads `meta.primerKey` from the port step config.
// Splits primer text into 1-3 sentences for staggered progressive reveal.
// Optional `meta.primerMoreKey` adds an expandable "Learn More" section.
// ---------------------------------------------------------------------------

/** Split text into up to 3 meaningful chunks (by sentence). */
function splitIntoChunks(text: string): string[] {
  // Split on '. ' boundaries, re-attach the period
  const raw = text.split(/(?<=\.)\s+/);
  if (raw.length <= 1) return [text];

  // Merge into at most 3 groups
  const chunks: string[] = [];
  const groupSize = Math.ceil(raw.length / 3);
  for (let i = 0; i < raw.length; i += groupSize) {
    chunks.push(raw.slice(i, i + groupSize).join(' '));
  }
  return chunks.slice(0, 3);
}

function PrimerStep({ portId, onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);

  const portConfig = getPortConfig(portId);
  const primerStepConfig = portConfig?.steps.find((s) => s.type === 'primer');
  const meta = primerStepConfig?.meta ?? {};

  const primerKey = (meta.primerKey as string) ?? `port.${portId}.primer`;
  const primerText = t(primerKey);
  const primerMoreKey = meta.primerMoreKey as string | undefined;
  const primerMoreText = primerMoreKey ? t(primerMoreKey) : null;

  const chunks = splitIntoChunks(primerText);

  return (
    <PortStepShell
      title={t('port.steps.primer', 'Concept Primer')}
      durationHint={primerStepConfig?.durationHint}
      onNext={onComplete}
      onSkip={onSkip}
      nextLabel={t('port.primer.gotIt', 'Got it!')}
    >
      <div className="flex flex-col items-center text-center py-6 gap-6">
        {/* Light bulb icon */}
        <div className="text-5xl animate-float select-none">💡</div>

        {/* Primer heading */}
        <h4 className="font-pixel text-xs text-[#ffd700] glow-gold uppercase tracking-wider">
          {t('port.primer.heading', 'Before We Begin...')}
        </h4>

        {/* Progressive reveal bullet points */}
        <div className="flex flex-col gap-3 max-w-2xl text-left w-full">
          {chunks.map((chunk, i) => (
            <div
              key={i}
              className="flex items-start gap-3"
              style={{ animation: `primerReveal 0.5s ease-out ${i * 0.4}s both` }}
            >
              <span className="text-[#ffd700] font-pixel text-sm mt-1 shrink-0">
                {i === 0 ? '▶' : i === 1 ? '▷' : '◇'}
              </span>
              <p className="font-body text-xl leading-relaxed text-[#e2e8f0]">{chunk}</p>
            </div>
          ))}
        </div>

        {/* Learn More expandable */}
        {primerMoreText && (
          <div className="w-full max-w-2xl">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="font-pixel text-[10px] text-[#00d4ff] glow-accent hover:text-[#ffd700] transition-colors"
            >
              {showMore
                ? `▲ ${t('port.primer.lessDetail', 'Less detail')}`
                : `▼ ${t('port.primer.moreDetail', 'Learn more...')}`}
            </button>
            {showMore && (
              <p
                className="font-body text-base leading-relaxed text-[#c8d0e0] mt-3 text-left"
                style={{ animation: 'primerReveal 0.3s ease-out' }}
              >
                {primerMoreText}
              </p>
            )}
          </div>
        )}

        {/* Skip hint */}
        <p className="font-body text-sm text-[#708090]">
          {t('port.primer.skipHint', 'Already know this? Feel free to skip ahead.')}
        </p>
      </div>

      <style>{`
        @keyframes primerReveal {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </PortStepShell>
  );
}

export default PrimerStep;
