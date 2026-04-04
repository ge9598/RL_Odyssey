import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';

// ---------------------------------------------------------------------------
// PrimerStep — Concept primer with 3-stage progressive reveal
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

  // Split into 2 reveal chunks: first sentence, then the rest
  const sentenceBreak = primerText.indexOf('. ');
  const part1 = sentenceBreak > 0 ? primerText.slice(0, sentenceBreak + 1) : primerText;
  const part2 = sentenceBreak > 0 ? primerText.slice(sentenceBreak + 2) : '';

  const [revealStage, setRevealStage] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Auto-advance reveal stages
  useEffect(() => {
    const t1 = setTimeout(() => setRevealStage(1), 800);
    const t2 = setTimeout(() => setRevealStage(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <PortStepShell
      title={t('port.steps.primer', 'Concept Primer')}
      durationHint={primerStepConfig?.durationHint}
      onNext={revealStage >= 2 ? onComplete : undefined}
      onSkip={onSkip}
      onBack={onBack}
      nextLabel={t('port.primer.gotIt', 'Got it!')}
    >
      <div className="flex flex-col items-center text-center py-6 gap-6">
        {/* Light bulb icon */}
        <div className="text-5xl animate-float select-none">💡</div>

        {/* Heading — reveals at stage 0 */}
        <h4
          className="font-pixel text-xs text-[#ffd700] glow-gold uppercase tracking-wider"
          style={{ animation: 'portStepFadeIn 0.5s ease-out' }}
        >
          {t('port.primer.heading', 'Quick Concept')}
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

        {/* Part 2: rest of text — reveals at stage 2 */}
        {revealStage >= 2 && part2 && (
          <p
            className="font-body text-lg leading-relaxed max-w-2xl text-[#b8c4d0]"
            style={{ animation: 'portStepFadeIn 0.6s ease-out' }}
          >
            {part2}
          </p>
        )}

        {/* Expandable "Want to know more?" section */}
        {revealStage >= 2 && (
          <div
            className="w-full max-w-2xl"
            style={{ animation: 'portStepFadeIn 0.6s ease-out' }}
          >
            <button
              onClick={() => setDetailsOpen((prev) => !prev)}
              className="font-pixel text-[10px] text-[#00d4ff] hover:text-[#4df5ff] transition-colors flex items-center gap-1 mx-auto"
            >
              {detailsOpen ? '▲' : '▼'}{' '}
              {detailsOpen
                ? t('port.primer.lessDetail', 'Show less')
                : t('port.primer.moreDetail', 'Want to know more?')}
            </button>

            {detailsOpen && (
              <div
                className="mt-3 px-4 py-3 rounded-sm glass-panel pixel-border text-left"
                style={{ animation: 'portStepFadeIn 0.4s ease-out' }}
              >
                <p className="font-body text-base text-[#708090] leading-relaxed">
                  {t('port.primer.skipHint', 'Already know this? Feel free to skip ahead!')}
                </p>
              </div>
            )}
          </div>
        )}
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
