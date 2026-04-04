import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { usePortFlow } from '@/hooks/usePortFlow';
import { getPortConfig } from '@/config/ports';
import { PixelButton } from '@/components/ui';
import { soundManager } from '@/systems/SoundManager';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PortFlowControllerProps {
  portId: string;
}

// ---------------------------------------------------------------------------
// Progress bar sub-component
// ---------------------------------------------------------------------------

function StepProgressBar({
  steps,
  currentIndex,
}: {
  steps: { id: string; type: string }[];
  currentIndex: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 w-full max-w-4xl mx-auto mb-4 px-2">
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        const label = t(`port.steps.${step.type}`, step.type);

        return (
          <div key={step.id} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`
                h-1.5 w-full rounded-full transition-all duration-300
                ${isDone ? 'bg-[#4ade80]' : isActive ? 'bg-[#00d4ff] glow-box-accent' : 'bg-[rgba(255,255,255,0.08)]'}
              `}
            />
            <span
              className={`
                font-pixel text-[9px] leading-none whitespace-nowrap
                hidden sm:block
                ${isDone ? 'text-[#4ade80]' : isActive ? 'text-[#00d4ff] glow-accent' : 'text-[#708090]'}
              `}
            >
              {label}
            </span>
            {isActive && (
              <span className="font-pixel text-[9px] text-[#00d4ff] glow-accent block sm:hidden">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading fallback
// ---------------------------------------------------------------------------

function StepLoadingFallback() {
  return (
    <div className="glass-panel pixel-border rounded-sm w-full max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-3xl mb-3 animate-float">
          ⚓
        </div>
        <p className="font-pixel text-xs text-[#708090] animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PortFlowController({ portId }: PortFlowControllerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const portConfig = getPortConfig(portId);

  const {
    currentStepIndex,
    currentStepConfig,
    totalSteps,
    allSteps,
    goNext,
    goBack,
    canSkipToQuest,
    skipToQuest,
    isComplete,
  } = usePortFlow(portId);

  // ---- Slide transition state ----
  const [visible, setVisible] = useState(true);
  const [direction, setDirection] = useState<'enter' | 'exit'>('enter');
  const pendingActionRef = useRef<(() => void) | null>(null);

  const animatedGoNext = () => {
    soundManager.playSfx('step_transition');
    setDirection('exit');
    setVisible(false);
    pendingActionRef.current = goNext;
  };

  const animatedGoBack = () => {
    soundManager.playSfx('button_click');
    setDirection('exit');
    setVisible(false);
    pendingActionRef.current = goBack;
  };

  const animatedSkip = () => {
    soundManager.playSfx('step_transition');
    setDirection('exit');
    setVisible(false);
    pendingActionRef.current = skipToQuest;
  };

  // When exit animation ends, fire action then trigger enter
  const handleTransitionEnd = () => {
    if (!visible && pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
      setDirection('enter');
      // Brief gap so new content mounts before fade-in
      requestAnimationFrame(() => setVisible(true));
    }
  };

  // Navigate away when the port flow finishes (after UnlockStep)
  useEffect(() => {
    if (!isComplete) return;
    const config = getPortConfig(portId);
    if (config?.unlocks) {
      navigate(`/port/${config.unlocks}`);
    } else if (config?.island) {
      navigate(`/island/${config.island}`);
    } else {
      navigate('/map');
    }
  }, [isComplete, portId, navigate]);

  // Guard: unknown port
  if (!portConfig || !currentStepConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="font-pixel text-sm text-[#f87171]">
          Unknown port: {portId}
        </p>
      </div>
    );
  }

  const StepComponent = currentStepConfig.component;
  const isFirstStep = currentStepIndex === 0;
  const isQuestStep = currentStepConfig.type === 'quest';

  return (
    <div className="flex flex-col items-center w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        {/* Back button — not on first step or quest */}
        {!isFirstStep && !isQuestStep && (
          <PixelButton variant="secondary" size="sm" onClick={animatedGoBack}>
            ← {t('common.back')}
          </PixelButton>
        )}
        <span className="font-pixel text-[10px] text-[#708090]">
          {currentStepIndex + 1} / {totalSteps}
        </span>
        {canSkipToQuest && (
          <PixelButton variant="secondary" size="sm" onClick={animatedSkip}>
            {t('common.skip')}
          </PixelButton>
        )}
      </div>

      {/* Progress bar */}
      <StepProgressBar steps={allSteps} currentIndex={currentStepIndex} />

      {/* Current step — with slide transition */}
      <div
        className="w-full transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? 'translateX(0)'
            : direction === 'exit'
              ? 'translateX(-24px)'
              : 'translateX(24px)',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <Suspense fallback={<StepLoadingFallback />}>
          <StepComponent
            portId={portId}
            onComplete={animatedGoNext}
            onSkip={currentStepConfig.skippable ? animatedGoNext : undefined}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default PortFlowController;
