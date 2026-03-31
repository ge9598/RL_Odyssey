import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';
import { NarrativeDialogue } from '@/components/ui/NarrativeDialogue';
import type { DialogueLine } from '@/components/ui/NarrativeDialogue';

// ---------------------------------------------------------------------------
// StoryStep — Supports both legacy text format and new dialogue format
//
// If `meta.dialogue` exists: renders NarrativeDialogue (Archie + NPC).
// Otherwise: falls back to `meta.storyKey` plain text display.
// ---------------------------------------------------------------------------

function StoryStep({ portId, onComplete, onSkip, onBack }: PortStepProps) {
  const { t } = useTranslation();
  const [dialogueDone, setDialogueDone] = useState(false);

  const portConfig = getPortConfig(portId);
  const storyStepConfig = portConfig?.steps.find((s) => s.type === 'story');
  const meta = storyStepConfig?.meta ?? {};

  const storyKey = (meta.storyKey as string) ?? `port.${portId}.story`;
  const emoji = (meta.emoji as string) ?? '\uD83D\uDCDC';

  // New dialogue format: array of { speaker, portrait, textKey }
  const rawDialogue = meta.dialogue as Array<{ speaker: string; portrait: string; textKey: string }> | undefined;

  const dialogueLines: DialogueLine[] | undefined = rawDialogue?.map((d) => ({
    speaker: t(`${d.speaker}`, d.speaker),
    portrait: d.portrait,
    text: t(d.textKey),
  }));

  const useDialogue = Boolean(dialogueLines && dialogueLines.length > 0);

  return (
    <PortStepShell
      title={t('port.steps.story', 'Story')}
      durationHint={storyStepConfig?.durationHint}
      onNext={useDialogue && !dialogueDone ? undefined : onComplete}
      onSkip={onSkip}
      onBack={onBack}
      nextLabel={t('common.continue', 'Continue')}
    >
      <div className="flex flex-col items-center text-center py-6 gap-6">
        {useDialogue && dialogueLines ? (
          <NarrativeDialogue
            lines={dialogueLines}
            onComplete={() => {
              setDialogueDone(true);
              onComplete();
            }}
          />
        ) : (
          <>
            {/* Legacy: animated emoji + text */}
            <div className="text-6xl animate-float select-none">{emoji}</div>
            <p
              className="font-body text-xl leading-relaxed max-w-2xl text-[#e2e8f0]"
              style={{ animation: 'portStepFadeIn 0.8s ease-out' }}
            >
              {t(storyKey)}
            </p>
          </>
        )}
      </div>
    </PortStepShell>
  );
}

export default StoryStep;
