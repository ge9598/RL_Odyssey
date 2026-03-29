import { useTranslation } from 'react-i18next';
import { TutorialGrid } from './TutorialGrid';
import { PixelButton } from '@/components/ui';
import type { TutorialState } from './useTutorial';

interface TutorialStep2Props {
  state: TutorialState;
  onCellClick: (x: number, y: number) => void;
  onAdvance: () => void;
}

export function TutorialStep2({
  state,
  onCellClick,
  onAdvance,
}: TutorialStep2Props) {
  const { t } = useTranslation();
  const hasFoundTreat = state.message === 'step2_found';

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Step header */}
      <div className="text-center">
        <h3 className="font-pixel text-base text-[#ffd700] glow-gold mb-1">
          {/* i18n key: tutorial.step2.stepLabel */}
          {t('tutorial.step2.stepLabel', { defaultValue: 'Step 2' })}
        </h3>
        <h2 className="font-pixel text-lg text-[#00d4ff] glow-accent">
          {t('tutorial.step2.title')}
        </h2>
      </div>

      {/* Instructions */}
      <p className="font-body text-xl text-[#e2e8f0] text-center max-w-lg">
        {t('tutorial.step2.desc')}
      </p>

      {/* Blindfold indicator */}
      <div className="flex items-center gap-2 font-pixel text-[10px]">
        <span className="text-xl">{'\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F'}</span>
        <span className="text-[#f87171]">
          {/* i18n key: tutorial.step2.blindfolded */}
          {t('tutorial.step2.blindfolded', { defaultValue: 'You can only see nearby cells!' })}
        </span>
      </div>

      {/* Grid with fog */}
      <div className="relative">
        <TutorialGrid
          gridState={state.gridState}
          petPosition={state.petPosition}
          treatPosition={state.treatPosition}
          petEmoji={state.pet ?? '\uD83D\uDC15'}
          fogEnabled={true}
          onCellClick={hasFoundTreat ? undefined : onCellClick}
        />

        {/* Success overlay */}
        {hasFoundTreat && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(10,14,39,0.75)] rounded-sm">
            <div className="text-5xl mb-3 animate-bounce">{'\uD83D\uDCA1'}</div>
            <p className="font-pixel text-base text-[#4ade80] glow-accent mb-1">
              {/* i18n key: tutorial.step2.found */}
              {t('tutorial.step2.found', { defaultValue: 'You found it in the dark!' })}
            </p>
            <p className="font-body text-lg text-[#e2e8f0] mb-2 text-center max-w-sm">
              {/* i18n key: tutorial.step2.foundSub */}
              {t('tutorial.step2.foundSub', {
                defaultValue: 'That was harder, right? What if your pet could LEARN which direction is usually good?',
              })}
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
              s <= 2
                ? s === 2
                  ? 'bg-[#00d4ff] shadow-[0_0_6px_rgba(0,212,255,0.5)]'
                  : 'bg-[#00d4ff50]'
                : 'bg-[#1e2448]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
