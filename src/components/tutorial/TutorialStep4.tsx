import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton, PixelPanel } from '@/components/ui';

interface TutorialStep4Props {
  petEmoji: string;
}

const RL_CONCEPTS = [
  { emoji: '\uD83D\uDC15', key: 'agent', fallbackLabel: 'Agent', fallbackDesc: 'Your pet — the learner who makes decisions' },
  { emoji: '\uD83D\uDDFA\uFE0F', key: 'state', fallbackLabel: 'State', fallbackDesc: 'Where you are — the current situation' },
  { emoji: '\uD83E\uDDED', key: 'action', fallbackLabel: 'Action', fallbackDesc: 'What you do — the choice you make' },
  { emoji: '\u2B50', key: 'reward', fallbackLabel: 'Reward', fallbackDesc: 'Feedback — did it work well or badly?' },
] as const;

export function TutorialStep4({ petEmoji }: TutorialStep4Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completeTutorial } = useGameStore();

  const handleSetSail = () => {
    completeTutorial();
    navigate('/map');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Step header */}
      <div className="text-center">
        <h3 className="font-pixel text-base text-[#ffd700] glow-gold mb-1">
          {/* i18n key: tutorial.step4.stepLabel */}
          {t('tutorial.step4.stepLabel', { defaultValue: 'Step 4' })}
        </h3>
        <h2 className="font-pixel text-lg text-[#00d4ff] glow-accent">
          {t('tutorial.step4.title')}
        </h2>
      </div>

      {/* Summary message */}
      <div className="text-center max-w-xl">
        <p className="font-body text-2xl text-[#ffd700] glow-gold mb-2">
          {/* i18n key: tutorial.step4.congrats */}
          {t('tutorial.step4.congrats', {
            defaultValue: 'You just saw the core of ALL reinforcement learning!',
          })}
        </p>
      </div>

      {/* 4 concepts recap */}
      <PixelPanel className="max-w-lg w-full">
        <div className="grid grid-cols-2 gap-4">
          {RL_CONCEPTS.map((concept) => (
            <div
              key={concept.key}
              className="flex items-start gap-3 p-3 rounded-sm bg-[rgba(15,21,53,0.5)]"
            >
              <span className="text-3xl">
                {concept.key === 'agent' ? petEmoji : concept.emoji}
              </span>
              <div>
                <p className="font-pixel text-[10px] text-[#00d4ff]">
                  {/* i18n key: tutorial.step4.concept_{key} */}
                  {t(`tutorial.step4.concept_${concept.key}`, { defaultValue: concept.fallbackLabel })}
                </p>
                <p className="font-body text-sm text-[#e2e8f0]">
                  {/* i18n key: tutorial.step4.concept_{key}_desc */}
                  {t(`tutorial.step4.concept_${concept.key}_desc`, { defaultValue: concept.fallbackDesc })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>

      {/* The Big Question */}
      <div className="text-center max-w-lg">
        <p className="font-body text-xl text-[#e2e8f0]">
          {t('tutorial.step4.desc')}
        </p>
      </div>

      {/* Route preview icons */}
      <div className="flex gap-6 justify-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">{'\uD83C\uDFDD\uFE0F'}</span>
          <span className="font-pixel text-[10px] text-[#40e0d0]">
            {t('map.valueArchipelago', { defaultValue: 'Value Archipelago' })}
          </span>
          <span className="font-body text-xs text-[#708090]">{'\u2B50'}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">{'\uD83C\uDF0B'}</span>
          <span className="font-pixel text-[10px] text-[#ff6347]">
            {t('map.policyVolcanic', { defaultValue: 'Policy Volcanic Isle' })}
          </span>
          <span className="font-body text-xs text-[#708090]">{'\u2B50\u2B50'}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl">{'\u2744\uFE0F'}</span>
          <span className="font-pixel text-[10px] text-[#87ceeb]">
            {t('map.continuousGlacier', { defaultValue: 'Continuous Glacier' })}
          </span>
          <span className="font-body text-xs text-[#708090]">{'\u2B50\u2B50\u2B50'}</span>
        </div>
      </div>

      {/* Set Sail button */}
      <PixelButton variant="gold" size="lg" onClick={handleSetSail}>
        {t('common.start')} {'\u2693'}
      </PixelButton>

      {/* Step indicator */}
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              s === 4
                ? 'bg-[#ffd700] shadow-[0_0_6px_rgba(255,215,0,0.5)]'
                : 'bg-[#00d4ff50]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
