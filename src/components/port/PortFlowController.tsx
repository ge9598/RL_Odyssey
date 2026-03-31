import { Suspense, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { usePortFlow } from '@/hooks/usePortFlow';
import { getPortConfig } from '@/config/ports';
import { PixelButton } from '@/components/ui';
import { SoundManager } from '@/systems/SoundManager';

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
            {/* Bar segment */}
            <div
              className={`
                h-1.5 w-full rounded-full transition-all duration-300
                ${isDone ? 'bg-[#4ade80]' : isActive ? 'bg-[#00d4ff] glow-box-accent' : 'bg-[rgba(255,255,255,0.08)]'}
              `}
            />
            {/* Label — only show for active step on small screens, all on larger */}
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
          \u2693
        </div>
        <p className="font-pixel text-xs text-[#708090] animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

// Transition state for slide animation
type TransitionState = 'idle' | 'exiting' | 'entering';

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
    isFirstStep,
  } = usePortFlow(portId);

  const [transition, setTransition] = useState<TransitionState>('idle');
  const directionRef = useRef<'forward' | 'back'>('forward');

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

  const handleNext = () => {
    directionRef.current = 'forward';
    SoundManager.playSfx('step_transition');
    setTransition('exiting');
    setTimeout(() => {
      goNext();
      setTransition('entering');
      setTimeout(() => setTransition('idle'), 300);
    }, 300);
  };

  const handleBack = () => {
    directionRef.current = 'back';
    SoundManager.playSfx('step_transition');
    setTransition('exiting');
    setTimeout(() => {
      goBack();
      setTransition('entering');
      setTimeout(() => setTransition('idle'), 300);
    }, 300);
  };

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
  const isQuestStep = currentStepConfig.type === 'quest';

  // Transition CSS
  let stepStyle: React.CSSProperties = {};
  if (transition === 'exiting') {
    stepStyle = {
      opacity: 0,
      transform: directionRef.current === 'forward' ? 'translateX(-30px)' : 'translateX(30px)',
      transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
    };
  } else if (transition === 'entering') {
    stepStyle = {
      opacity: 0,
      transform: directionRef.current === 'forward' ? 'translateX(30px)' : 'translateX(-30px)',
      transition: 'none',
    };
  } else {
    stepStyle = {
      opacity: 1,
      transform: 'translateX(0)',
      transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
    };
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-pixel text-[10px] text-[#708090]">
          {currentStepIndex + 1} / {totalSteps}
        </span>
        {canSkipToQuest && (
          <PixelButton variant="secondary" size="sm" onClick={skipToQuest}>
            {t('common.skip')}
          </PixelButton>
        )}
      </div>

      {/* Progress bar */}
      <StepProgressBar steps={allSteps} currentIndex={currentStepIndex} />

      {/* Current step (lazy-loaded with Suspense) with transition wrapper */}
      <div style={{ ...stepStyle, width: '100%' }}>
        <Suspense fallback={<StepLoadingFallback />}>
          <StepComponent
            portId={portId}
            onComplete={handleNext}
            onSkip={currentStepConfig.skippable ? handleNext : undefined}
            onBack={(!isFirstStep && !isQuestStep) ? handleBack : undefined}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default PortFlowController;
