import { useTranslation } from 'react-i18next';
import { TutorialGrid } from './TutorialGrid';
import { PixelButton, SpeedControl } from '@/components/ui';
import type { TutorialState } from './useTutorial';

interface TutorialStep3Props {
  state: TutorialState;
  onAdvance: () => void;
  onToggleAutoRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

// Map reward emoji key to display
function rewardDisplay(emoji: string | null): { icon: string; label: string; color: string } {
  switch (emoji) {
    case 'happy': return { icon: '\uD83D\uDE0A', label: 'Treat!', color: '#4ade80' };
    case 'wall': return { icon: '\uD83D\uDE24', label: 'Wall!', color: '#f87171' };
    case 'neutral': return { icon: '\uD83D\uDE10', label: 'Nothing', color: '#708090' };
    default: return { icon: '\u2026', label: '...', color: '#708090' };
  }
}

export function TutorialStep3({
  state,
  onAdvance,
  onToggleAutoRun,
  onStep,
  onReset,
  onSpeedChange,
}: TutorialStep3Props) {
  const { t } = useTranslation();
  const reward = rewardDisplay(state.rewardEmoji);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Step header */}
      <div className="text-center">
        <h3 className="font-pixel text-base text-[#ffd700] glow-gold mb-1">
          {/* i18n key: tutorial.step3.stepLabel */}
          {t('tutorial.step3.stepLabel', { defaultValue: 'Step 3' })}
        </h3>
        <h2 className="font-pixel text-lg text-[#00d4ff] glow-accent">
          {t('tutorial.step3.title')}
        </h2>
      </div>

      {/* Instructions */}
      <p className="font-body text-xl text-[#e2e8f0] text-center max-w-xl">
        {t('tutorial.step3.desc')}
      </p>

      {/* Main content: Grid + RL Cycle panel */}
      <div className="flex flex-wrap gap-6 items-start justify-center">
        {/* Grid with heatmap */}
        <div className="flex flex-col items-center gap-3">
          <TutorialGrid
            gridState={state.gridState}
            petPosition={state.petPosition}
            treatPosition={state.treatPosition}
            petEmoji={state.pet ?? '\uD83D\uDC15'}
            heatmap={state.heatmap}
          />

          {/* Speed controls */}
          <SpeedControl
            speed={state.speed}
            isRunning={state.autoRunning}
            onSpeedChange={onSpeedChange}
            onToggle={onToggleAutoRun}
            onStep={onStep}
            onReset={onReset}
          />
        </div>

        {/* RL cycle visualization */}
        <div className="flex flex-col gap-3 min-w-[220px] max-w-[260px]">
          {/* The RL Loop diagram */}
          <div className="glass-panel pixel-border rounded-sm p-4">
            <h4 className="font-pixel text-[10px] text-[#ffd700] mb-3 text-center">
              {/* i18n key: tutorial.step3.rlLoop */}
              {t('tutorial.step3.rlLoop', { defaultValue: 'The Learning Loop' })}
            </h4>

            <div className="flex flex-col gap-2.5">
              {/* Agent */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{state.pet ?? '\uD83D\uDC15'}</span>
                <div>
                  <span className="font-pixel text-[10px] text-[#00d4ff]">
                    {t('tutorial.step3.agent')}
                  </span>
                  <span className="font-body text-sm text-[#708090] ml-1">
                    {/* i18n key: tutorial.step3.agentDesc */}
                    {t('tutorial.step3.agentDesc', { defaultValue: '(your pet)' })}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="font-pixel text-[10px] text-[#708090] pl-4">{'\u2193'} looks around</div>

              {/* State */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{'\uD83D\uDDFA\uFE0F'}</span>
                <div>
                  <span className="font-pixel text-[10px] text-[#00d4ff]">
                    {t('tutorial.step3.state')}
                  </span>
                  <span className="font-body text-sm text-[#708090] ml-1">
                    ({state.petPosition.x}, {state.petPosition.y})
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="font-pixel text-[10px] text-[#708090] pl-4">{'\u2193'} picks a move</div>

              {/* Action */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{'\uD83E\uDDED'}</span>
                <div>
                  <span className="font-pixel text-[10px] text-[#00d4ff]">
                    {t('tutorial.step3.action')}
                  </span>
                  <span className="font-body text-sm text-[#708090] ml-1">
                    {/* i18n key: tutorial.step3.actionDesc */}
                    {t('tutorial.step3.actionDesc', { defaultValue: '(up/down/left/right)' })}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="font-pixel text-[10px] text-[#708090] pl-4">{'\u2193'} gets feedback</div>

              {/* Reward */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{reward.icon}</span>
                <div>
                  <span className="font-pixel text-[10px]" style={{ color: reward.color }}>
                    {t('tutorial.step3.reward')}
                  </span>
                  <span className="font-body text-sm" style={{ color: reward.color }}>
                    {' '}{reward.label}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="font-pixel text-[10px] text-[#708090] pl-4">{'\u2193'} remembers</div>

              {/* Learning */}
              <div className="flex items-center gap-2">
                <span className="text-2xl">{'\uD83E\uDDE0'}</span>
                <div>
                  <span className="font-pixel text-[10px] text-[#00d4ff]">
                    {t('tutorial.step3.learning')}
                  </span>
                </div>
              </div>

              {/* Loop arrow */}
              <div className="font-pixel text-[10px] text-[#ffd700] text-center">
                {'\u21BA'} repeat!
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-panel pixel-border rounded-sm p-3">
            <div className="flex justify-between font-body text-sm">
              <span className="text-[#708090]">
                {/* i18n key: tutorial.step3.treatsFound */}
                {t('tutorial.step3.treatsFound', { defaultValue: 'Treats found' })}
              </span>
              <span className="text-[#4ade80] font-pixel text-[10px]">
                {state.treatFoundCount}
              </span>
            </div>
            <div className="flex justify-between font-body text-sm mt-1">
              <span className="text-[#708090]">
                {/* i18n key: tutorial.step3.episodes */}
                {t('tutorial.step3.episodes', { defaultValue: 'Episodes' })}
              </span>
              <span className="text-[#00d4ff] font-pixel text-[10px]">
                {state.episodeCount}
              </span>
            </div>

            {/* Learning message */}
            {state.treatFoundCount >= 3 && (
              <div className="mt-3 text-center">
                <p className="font-pixel text-[10px] text-[#ffd700] glow-gold">
                  {/* i18n key: tutorial.step3.learning_msg */}
                  {t('tutorial.step3.learning_msg', { defaultValue: 'Your pet is learning!' })}
                </p>
              </div>
            )}
          </div>

          {/* Heatmap legend */}
          <div className="glass-panel pixel-border rounded-sm p-3">
            <p className="font-pixel text-[10px] text-[#708090] mb-2">
              {/* i18n key: tutorial.step3.memoryMap */}
              {t('tutorial.step3.memoryMap', { defaultValue: 'Memory Map' })}
            </p>
            <div className="flex items-center gap-1">
              <span className="font-body text-xs text-[#708090]">
                {/* i18n key: tutorial.step3.cold */}
                {t('tutorial.step3.cold', { defaultValue: 'low' })}
              </span>
              <div className="flex-1 h-3 rounded-sm" style={{
                background: 'linear-gradient(to right, rgba(20,40,80,0.4), rgba(0,140,200,0.5), rgba(40,220,100,0.5), rgba(255,215,0,0.6), rgba(255,120,0,0.7))',
              }} />
              <span className="font-body text-xs text-[#ffd700]">
                {/* i18n key: tutorial.step3.hot */}
                {t('tutorial.step3.hot', { defaultValue: 'high' })}
              </span>
            </div>
            <p className="font-body text-xs text-[#708090] mt-1 text-center">
              {/* i18n key: tutorial.step3.memoryDesc */}
              {t('tutorial.step3.memoryDesc', { defaultValue: 'Brighter = pet thinks this spot leads to treats' })}
            </p>
          </div>
        </div>
      </div>

      {/* Next button — appears after enough learning */}
      {state.treatFoundCount >= 3 && (
        <PixelButton variant="gold" size="lg" onClick={onAdvance}>
          {t('common.next')} {'\u2192'}
        </PixelButton>
      )}

      {/* Step indicator */}
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              s <= 3
                ? s === 3
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
