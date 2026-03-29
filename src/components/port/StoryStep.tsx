import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';

// ---------------------------------------------------------------------------
// StoryStep — Generic story intro step
//
// Reads `meta.storyKey` and `meta.emoji` from the port step config.
// Displays an animated emoji, the story text, and a "Continue" button.
// ---------------------------------------------------------------------------

function StoryStep({ portId, onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  // Resolve meta from the port config's story step
  const portConfig = getPortConfig(portId);
  const storyStepConfig = portConfig?.steps.find((s) => s.type === 'story');
  const meta = storyStepConfig?.meta ?? {};

  const storyKey = (meta.storyKey as string) ?? `port.${portId}.story`;
  const emoji = (meta.emoji as string) ?? '\uD83D\uDCDC'; // scroll fallback

  const storyText = t(storyKey);

  return (
    <PortStepShell
      title={t('port.steps.story', 'Story')}
      durationHint={storyStepConfig?.durationHint}
      onNext={onComplete}
      onSkip={onSkip}
      nextLabel={t('common.continue', 'Continue')}
    >
      <div className="flex flex-col items-center text-center py-6 gap-6">
        {/* Animated emoji */}
        <div
          className="text-6xl animate-float cursor-pointer select-none"
          onClick={() => setRevealed(true)}
          role="presentation"
        >
          {emoji}
        </div>

        {/* Story text — typewriter-style reveal on first render */}
        <p
          className={`
            font-body text-xl leading-relaxed max-w-2xl text-[#e2e8f0]
            transition-opacity duration-700
            ${revealed ? 'opacity-100' : 'opacity-100'}
          `}
          style={{
            animation: 'portStepFadeIn 0.8s ease-out',
          }}
        >
          {storyText}
        </p>
      </div>
    </PortStepShell>
  );
}

export default StoryStep;
