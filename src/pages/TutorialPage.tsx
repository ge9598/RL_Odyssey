import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelPanel } from '@/components/ui';
import { NarrativeDialogue } from '@/components/ui/NarrativeDialogue';
import type { DialogueLine } from '@/components/ui/NarrativeDialogue';
import { PetSelector } from '@/components/tutorial/PetSelector';
import { TutorialStep1 } from '@/components/tutorial/TutorialStep1';
import { TutorialStep2 } from '@/components/tutorial/TutorialStep2';
import { TutorialStep3 } from '@/components/tutorial/TutorialStep3';
import { TutorialStep4 } from '@/components/tutorial/TutorialStep4';
import { useTutorial } from '@/components/tutorial/useTutorial';

// ---------------------------------------------------------------------------
// Inner step -1: Archie's introduction
// ---------------------------------------------------------------------------

function ArchieIntro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();

  const lines: DialogueLine[] = [
    {
      speaker: 'Archie 🦜',
      portrait: '🦜',
      text: t('archie.intro'),
    },
    {
      speaker: 'Archie 🦜',
      portrait: '🦜',
      text: t('archie.petPrompt'),
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-6xl animate-float select-none">🦜</div>
      <NarrativeDialogue
        lines={lines}
        onComplete={onDone}
        speakerColor="#ffd700"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TutorialPage
// ---------------------------------------------------------------------------

export function TutorialPage() {
  const { t } = useTranslation();
  const {
    state,
    selectPet,
    handleCellClick,
    advanceStep,
    agentStep,
    toggleAutoRun,
    setSpeed,
    resetStep3,
  } = useTutorial();

  // archieIntroShown: step -1 equivalent — show Archie before pet selection
  const [archieIntroShown, setArchieIntroShown] = useState(false);
  const showArchieIntro = !archieIntroShown && state.step === 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      {/* Title — always visible */}
      <div className="text-center">
        <h1 className="font-pixel text-lg text-[#00d4ff] glow-accent">
          {t('tutorial.title')}
        </h1>
        {state.step === 0 && !showArchieIntro && (
          <p className="font-body text-2xl text-[#ffd700] glow-gold mt-2">
            {t('tutorial.choosePet')}
          </p>
        )}
      </div>

      {/* Main panel */}
      <PixelPanel className="max-w-4xl w-full min-h-[480px] flex items-center justify-center p-6">
        {/* Archie intro — before pet selection */}
        {showArchieIntro && (
          <ArchieIntro onDone={() => setArchieIntroShown(true)} />
        )}

        {/* Step 0 — Pet Selection */}
        {state.step === 0 && !showArchieIntro && (
          <PetSelector onSelect={selectPet} />
        )}

        {/* Step 1 — Manual control */}
        {state.step === 1 && (
          <TutorialStep1
            state={state}
            onCellClick={handleCellClick}
            onAdvance={advanceStep}
          />
        )}

        {/* Step 2 — Blindfolded */}
        {state.step === 2 && (
          <TutorialStep2
            state={state}
            onCellClick={handleCellClick}
            onAdvance={advanceStep}
          />
        )}

        {/* Step 3 — Learning loop */}
        {state.step === 3 && (
          <TutorialStep3
            state={state}
            onAdvance={advanceStep}
            onToggleAutoRun={toggleAutoRun}
            onStep={agentStep}
            onReset={resetStep3}
            onSpeedChange={setSpeed}
          />
        )}

        {/* Step 4 — Summary */}
        {state.step === 4 && (
          <TutorialStep4
            petEmoji={state.pet ?? '\uD83D\uDC15'}
          />
        )}
      </PixelPanel>
    </div>
  );
}
