import { useState, useCallback, useMemo } from 'react';

import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import { getPortConfig } from '@/config/ports';
import type { BountyRank, QuestResult, PortId } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestState {
  /** Whether the quest is currently in progress. */
  isActive: boolean;
  /** Running score accumulated during the quest. */
  score: number;
  /** Number of turns the player has used so far. */
  turnsUsed: number;
  /** Maximum turns allowed (set at start). */
  maxTurns: number;
  /** Final result, populated after endQuest(). */
  result: QuestResult | null;
}

export interface UseQuestReturn {
  /** Current quest state. */
  questState: QuestState;
  /** Begin the quest. Resets state and sets max turns. */
  startQuest: (maxTurns: number) => void;
  /** Record a single turn (adds to score and increments turnsUsed). */
  recordTurn: (turnScore: number) => void;
  /** Manually set the score (useful for quests that compute score differently). */
  setScore: (score: number) => void;
  /** End the quest. Computes rank, awards gold & card, persists to stores. */
  endQuest: (finalScore?: number) => QuestResult;
  /** Pure utility: compute the bounty rank for a given score. */
  calculateRank: (score: number) => BountyRank;
  /** Gold that would be awarded for a given rank (before adding to store). */
  computeGold: (rank: BountyRank) => number;
}

// ---------------------------------------------------------------------------
// Hook — useQuest
// ---------------------------------------------------------------------------

/**
 * Manages quest lifecycle: start, record turns, compute rank, award rewards.
 * Integrates with gameStore (gold / progress) and cardStore (card collection).
 */
export function useQuest(portId: string): UseQuestReturn {
  const portConfig = getPortConfig(portId);
  const questConfig = portConfig?.quest;

  const completeQuest = useGameStore((s) => s.completeQuest);
  const collectCard = useCardStore((s) => s.collectCard);

  // Quest state -------------------------------------------------------------

  const [questState, setQuestState] = useState<QuestState>({
    isActive: false,
    score: 0,
    turnsUsed: 0,
    maxTurns: 0,
    result: null,
  });

  // Rank calculation --------------------------------------------------------

  const thresholds = useMemo(
    () => questConfig?.thresholds ?? { S: 2.5, A: 2.0, B: 1.5, C: 1.1 },
    [questConfig],
  );

  const calculateRank = useCallback(
    (score: number): BountyRank => {
      // Thresholds are in descending order of difficulty: S > A > B > C
      if (score >= thresholds.S) return 'S';
      if (score >= thresholds.A) return 'A';
      if (score >= thresholds.B) return 'B';
      return 'C';
    },
    [thresholds],
  );

  const baseGold = questConfig?.baseGold ?? 300;

  const computeGold = useCallback(
    (rank: BountyRank): number => {
      return Math.floor(baseGold * BOUNTY_MULTIPLIERS[rank]);
    },
    [baseGold],
  );

  // Quest lifecycle ---------------------------------------------------------

  const startQuest = useCallback((maxTurns: number) => {
    setQuestState({
      isActive: true,
      score: 0,
      turnsUsed: 0,
      maxTurns,
      result: null,
    });
  }, []);

  const recordTurn = useCallback((turnScore: number) => {
    setQuestState((prev) => ({
      ...prev,
      score: prev.score + turnScore,
      turnsUsed: prev.turnsUsed + 1,
    }));
  }, []);

  const setScore = useCallback((score: number) => {
    setQuestState((prev) => ({
      ...prev,
      score,
    }));
  }, []);

  const endQuest = useCallback(
    (finalScore?: number): QuestResult => {
      const score = finalScore ?? questState.score;
      const rank = calculateRank(score);
      const gold = computeGold(rank);

      const result: QuestResult = {
        passed: true,
        rank,
        score,
        gold,
      };

      // Persist to stores
      if (portConfig) {
        completeQuest(portConfig.id as PortId, rank, baseGold);
      }
      if (questConfig?.cardId) {
        collectCard(questConfig.cardId, rank);
      }

      setQuestState((prev) => ({
        ...prev,
        isActive: false,
        score,
        result,
      }));

      return result;
    },
    [
      questState.score,
      calculateRank,
      computeGold,
      portConfig,
      questConfig,
      baseGold,
      completeQuest,
      collectCard,
    ],
  );

  // Return value ------------------------------------------------------------

  return {
    questState,
    startQuest,
    recordTurn,
    setScore,
    endQuest,
    calculateRank,
    computeGold,
  };
}
