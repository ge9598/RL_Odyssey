import { useTranslation } from 'react-i18next';
import { TutorialGrid } from './TutorialGrid';
import { PixelButton } from '@/components/ui';
import type { TutorialState } from './useTutorial';

interface TutorialStep1Props {
  state: TutorialState;
  onCellClick: (x: number, y: number) => void;
  onAdvance: () => void;
}

export function TutorialStep1({
  state,
  onCellClick,
  onAdvance,
}: TutorialStep1Props) {
  const { t } = useTranslation();
  const hasFoundTreat = state.message === 'step1_found';

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Step header */}
      <div className="text-center">
        <h3 className="font-pixel text-base text-[#ffd700] glow-gold mb-1">
          {/* i18n key: tutorial.step1.stepLabel */}
          {t('tutorial.step1.stepLabel', { defaultValue: 'Step 1' })}
        </h3>
        <h2 className="font-pixel text-lg text-[#00d4ff] glow-accent">
          {t('tutorial.step1.title')}
        </h2>
      </div>

      {/* Instructions */}
      <p className="font-body text-xl text-[#e2e8f0] text-center max-w-lg">
        {t('tutorial.step1.desc')}
      </p>

      {/* Control hint */}
      <div className="flex gap-3 items-center font-pixel text-[10px] text-[#708090]">
        <div className="flex flex-col items-center gap-0.5">
          <span className="pixel-border px-2 py-0.5 bg-[rgba(20,24,50,0.5)]">{'\u2191'}</span>
          <div className="flex gap-0.5">
            <span className="pixel-border px-2 py-0.5 bg-[rgba(20,24,50,0.5)]">{'\u2190'}</span>
            <span className="pixel-border px-2 py-0.5 bg-[rgba(20,24,50,0.5)]">{'\u2193'}</span>
            <span className="pixel-border px-2 py-0.5 bg-[rgba(20,24,50,0.5)]">{'\u2192'}</span>
          </div>
        </div>
        <span className="text-[#708090]">
          {/* i18n key: tutorial.step1.controlHint */}
          {t('tutorial.step1.controlHint', { defaultValue: 'or WASD or click' })}
        </span>
      </div>

      {/* Grid */}
      <div className="relative">
        <TutorialGrid
          gridState={state.gridState}
          petPosition={state.petPosition}
          treatPosition={state.treatPosition}
          petEmoji={state.pet ?? '\uD83D\uDC15'}
          onCellClick={hasFoundTreat ? undefined : onCellClick}
        />

        {/* Success overlay */}
        {hasFoundTreat && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(10,14,39,0.7)] rounded-sm">
            <div className="text-5xl mb-3 animate-bounce">{'\uD83C\uDF89'}</div>
            <p className="font-pixel text-base text-[#4ade80] glow-accent mb-1">
              {/* i18n key: tutorial.step1.found */}
              {t('tutorial.step1.found', { defaultValue: 'Great! You found it!' })}
            </p>
            <p className="font-body text-lg text-[#e2e8f0] mb-4">
              {/* i18n key: tutorial.step1.foundSub */}
              {t('tutorial.step1.foundSub', { defaultValue: 'That was easy when you can see everything, right?' })}
            </p>
            <PixelButton onClick={onAdvance}>
              {t('common.next')} {'\u2192'}
            </PixelButton>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mt-2">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              s === 1
                ? 'bg-[#00d4ff] shadow-[0_0_6px_rgba(0,212,255,0.5)]'
                : 'bg-[#1e2448]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
