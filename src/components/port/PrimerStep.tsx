import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';

// ---------------------------------------------------------------------------
// PrimerStep — Generic concept primer step (skippable)
//
// Reads `meta.primerKey` from the port step config.
// Shows a brief animated explanation of a prerequisite concept.
// ---------------------------------------------------------------------------

function PrimerStep({ portId, onComplete, onSkip, onBack }: PortStepProps) {
  const { t } = useTranslation();

  const portConfig = getPortConfig(portId);
  const primerStepConfig = portConfig?.steps.find((s) => s.type === 'primer');
  const meta = primerStepConfig?.meta ?? {};

  const primerKey = (meta.primerKey as string) ?? `port.${portId}.primer`;
  const primerText = t(primerKey);

  return (
    <PortStepShell
      title={t('port.steps.primer', 'Concept Primer')}
      durationHint={primerStepConfig?.durationHint}
      onNext={onComplete}
      onSkip={onSkip}
      onBack={onBack}
      nextLabel={t('port.primer.gotIt', 'Got it!')}
    >
      <div className="flex flex-col items-center text-center py-6 gap-6">
        {/* Light bulb icon */}
        <div className="text-5xl animate-float select-none">
          {'\uD83D\uDCA1'}
        </div>

        {/* Primer heading */}
        <h4 className="font-pixel text-xs text-[#ffd700] glow-gold uppercase tracking-wider">
          {t('port.primer.heading', 'Before We Begin...')}
        </h4>

        {/* Primer text */}
        <p
          className="font-body text-xl leading-relaxed max-w-2xl text-[#e2e8f0]"
          style={{ animation: 'portStepFadeIn 0.8s ease-out' }}
        >
          {primerText}
        </p>

        {/* Skip hint */}
        <p className="font-body text-sm text-[#708090]">
          {t('port.primer.skipHint', 'Already know this? Feel free to skip ahead.')}
        </p>
      </div>
    </PortStepShell>
  );
}

export default PrimerStep;
