import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';

// ---------------------------------------------------------------------------
// PrimerStep — Concept primer with 3-stage progressive reveal
//
// Stage 0: Icon + heading appears
// Stage 1: First sentence reveals (after 0.8s)
// Stage 2: Rest of text + skip hint appears (after 1.8s)
// ---------------------------------------------------------------------------

function PrimerStep({ portId, onComplete, onSkip, onBack }: PortStepProps) {
  const { t } = useTranslation();

  const portConfig = getPortConfig(portId);
  const primerStepConfig = portConfig?.steps.find((s) => s.type === 'primer');
  const meta = primerStepConfig?.meta ?? {};

  const primerKey = (meta.primerKey as string) ?? `port.${portId}.primer`;
  const primerText = t(primerKey);

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
        {/* Icon — reveals at stage 0 */}
        <div
          className="text-5xl select-none"
          style={{ animation: 'portStepFadeIn 0.5s ease-out' }}
        >
          {'\uD83D\uDCA1'}
        </div>

        {/* Heading — reveals at stage 0 */}
        <h4
          className="font-pixel text-xs text-[#ffd700] glow-gold uppercase tracking-wider"
          style={{ animation: 'portStepFadeIn 0.5s ease-out' }}
        >
          {t('port.primer.heading', 'Quick Concept')}
        </h4>

        {/* Part 1: first sentence — reveals at stage 1 */}
        {revealStage >= 1 && (
          <p
            className="font-body text-xl leading-relaxed max-w-2xl text-[#e2e8f0]"
            style={{ animation: 'portStepFadeIn 0.6s ease-out' }}
          >
            {part1}
          </p>
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
    </PortStepShell>
  );
}

export default PrimerStep;
