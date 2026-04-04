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
// NEW: Reads `meta.dialogue` (array of {speaker, portrait, textKey, color?})
//      and renders RPG typewriter dialogue via NarrativeDialogue.
// FALLBACK: If no `meta.dialogue`, falls back to old `meta.storyKey` behavior.
// ---------------------------------------------------------------------------

interface DialogueMeta {
  speaker: string;
  portrait: string;
  textKey: string;
  color?: string;
}

function StoryStep({ portId, onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [dialogueDone, setDialogueDone] = useState(false);

  const portConfig = getPortConfig(portId);
  const storyStepConfig = portConfig?.steps.find((s) => s.type === 'story');
  const meta = storyStepConfig?.meta ?? {};

  const dialogueMeta = meta.dialogue as DialogueMeta[] | undefined;
  const storyKey = (meta.storyKey as string) ?? `port.${portId}.story`;
  const emoji = (meta.emoji as string) ?? '\uD83D\uDCDC';

  // Build dialogue lines by translating each textKey
  const dialogueLines: DialogueLine[] | null = dialogueMeta
    ? dialogueMeta.map((d) => ({
        speaker: t(d.speaker, d.speaker),
        portrait: d.portrait,
        text: t(d.textKey),
        color: d.color,
      }))
    : null;

  // With dialogue format — show NarrativeDialogue then a Continue button
  if (dialogueLines) {
    return (
      <PortStepShell
        title={t('port.steps.story', 'Story')}
        durationHint={storyStepConfig?.durationHint}
        onNext={dialogueDone ? onComplete : undefined}
        onSkip={onSkip}
        nextLabel={t('common.continue', 'Continue')}
      >
        <div className="flex flex-col items-center py-6 gap-6 w-full">
          {!dialogueDone ? (
            <NarrativeDialogue
              lines={dialogueLines}
              onComplete={() => setDialogueDone(true)}
            />
          ) : (
            <p
              className="font-body text-lg text-[#e2e8f0] text-center"
              style={{ animation: 'portStepFadeIn 0.5s ease-out' }}
            >
              {t('port.story.dialogueDone', 'Ready to learn how this works?')}
            </p>
          )}
        </div>
        <style>{`
          @keyframes portStepFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </PortStepShell>
    );
  }

  // Legacy format — old emoji + text paragraph
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
        <div className="text-6xl animate-float select-none">{emoji}</div>
        <p
          className="font-body text-xl leading-relaxed max-w-2xl text-[#e2e8f0]"
          style={{ animation: 'portStepFadeIn 0.8s ease-out' }}
        >
          {t(storyKey)}
        </p>
      </div>
      <style>{`
        @keyframes portStepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PortStepShell>
  );
}

export default StoryStep;
