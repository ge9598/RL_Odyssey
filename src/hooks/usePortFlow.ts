import { useState, useCallback, useMemo } from 'react';

import { useGameStore } from '@/stores/gameStore';
import { getPortConfig } from '@/config/ports';
import type { PortStepConfig } from '@/config/ports';
import type { PortStep, PortId } from '@/types/algorithm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsePortFlowReturn {
  /** Index of the current step in the steps array. */
  currentStepIndex: number;
  /** Config object for the current step. */
  currentStepConfig: PortStepConfig | null;
  /** Total number of steps. */
  totalSteps: number;
  /** All step configs for building a progress bar. */
  allSteps: PortStepConfig[];
  /** Advance to the next step. Marks completion if last step. */
  goNext: () => void;
  /** Return to the previous step (if allowed). */
  goBack: () => void;
  /** Jump directly to the first quest-type step. */
  skipToQuest: () => void;
  /** Whether the entire port flow has been completed. */
  isComplete: boolean;
  /** Whether there is a quest step that can be skipped-to. */
  canSkipToQuest: boolean;
  /** Whether the current step is the very first step. */
  isFirstStep: boolean;
  /** Whether the current step is the very last step. */
  isLastStep: boolean;
}

// ---------------------------------------------------------------------------
// Hook — usePortFlow
// ---------------------------------------------------------------------------

/**
 * Manages stepping through a port's ordered list of steps.
 * Persists progress to the game store so the player can resume.
 */
const EMPTY_STEPS: PortStepConfig[] = [];

export function usePortFlow(portId: string): UsePortFlowReturn {
  const portConfig = getPortConfig(portId);
  const steps = portConfig?.steps ?? EMPTY_STEPS;

  // Read saved progress to determine starting step index.
  const portProgress = useGameStore((s) => s.portProgress[portId]);
  const updatePortProgress = useGameStore((s) => s.updatePortProgress);

  const savedStepType = portProgress?.currentStep as PortStep | undefined;

  const initialIndex = useMemo(() => {
    if (!savedStepType || !steps.length) return 0;
    const idx = steps.findIndex((s) => s.type === savedStepType);
    return idx >= 0 ? idx : 0;
  }, [savedStepType, steps]);

  const [currentStepIndex, setCurrentStepIndex] = useState(initialIndex);
  const [isComplete, setIsComplete] = useState(false);

  // Derived values ---------------------------------------------------------

  const currentStepConfig = steps[currentStepIndex] ?? null;

  const questIndex = useMemo(
    () => steps.findIndex((s) => s.type === 'quest'),
    [steps],
  );

  const canSkipToQuest = questIndex >= 0 && currentStepIndex < questIndex;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Navigation helpers -----------------------------------------------------

  const persistStep = useCallback(
    (index: number) => {
      const step = steps[index];
      if (step && portConfig) {
        updatePortProgress(portConfig.id as PortId, step.type);
      }
    },
    [steps, portConfig, updatePortProgress],
  );

  const goNext = useCallback(() => {
    if (isComplete) return;

    if (currentStepIndex >= steps.length - 1) {
      // Mark complete — the UnlockStep component handles store side-effects.
      setIsComplete(true);
      persistStep(currentStepIndex);
      return;
    }

    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    persistStep(nextIndex);
  }, [currentStepIndex, steps.length, isComplete, persistStep]);

  const goBack = useCallback(() => {
    if (currentStepIndex <= 0) return;
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    persistStep(prevIndex);
  }, [currentStepIndex, persistStep]);

  const skipToQuest = useCallback(() => {
    if (questIndex < 0) return;
    setCurrentStepIndex(questIndex);
    persistStep(questIndex);
  }, [questIndex, persistStep]);

  // Return value -----------------------------------------------------------

  return {
    currentStepIndex,
    currentStepConfig,
    totalSteps: steps.length,
    allSteps: steps,
    goNext,
    goBack,
    skipToQuest,
    isComplete,
    canSkipToQuest,
    isFirstStep,
    isLastStep,
  };
}
