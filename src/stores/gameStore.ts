import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortId, PortProgress, BountyRank } from '@/types/algorithm';
import { NAVIGATOR_RANKS, BOUNTY_MULTIPLIERS } from '@/types/algorithm';

interface GameState {
  // Character
  playerName: string | null;
  selectedPet: string | null;

  // Progress
  tutorialCompleted: boolean;
  currentLocation: string;
  unlockedPorts: PortId[];
  portProgress: Record<string, PortProgress>;

  // Currency & Rank
  totalGold: number;
  navigatorLevel: number;

  // Actions
  createCharacter: (name: string, pet: string) => void;
  setSelectedPet: (emoji: string) => void;
  completeTutorial: () => void;
  setLocation: (location: string) => void;
  unlockPort: (portId: PortId) => void;
  updatePortProgress: (portId: PortId, step: PortProgress['currentStep']) => void;
  completeQuest: (portId: PortId, rank: BountyRank, baseGold: number) => void;
  getNavigatorRank: () => typeof NAVIGATOR_RANKS[number];
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      playerName: null,
      selectedPet: null,
      tutorialCompleted: false,
      currentLocation: 'harbor',
      unlockedPorts: [],
      portProgress: {},
      totalGold: 0,
      navigatorLevel: 1,

      createCharacter: (name, pet) =>
        set({ playerName: name, selectedPet: pet }),

      setSelectedPet: (emoji) =>
        set({ selectedPet: emoji }),

      completeTutorial: () =>
        set({
          tutorialCompleted: true,
          currentLocation: 'map',
          unlockedPorts: ['bandit'],
        }),

      setLocation: (location) => set({ currentLocation: location }),

      unlockPort: (portId) =>
        set((state) => ({
          unlockedPorts: state.unlockedPorts.includes(portId)
            ? state.unlockedPorts
            : [...state.unlockedPorts, portId],
        })),

      updatePortProgress: (portId, step) =>
        set((state) => ({
          portProgress: {
            ...state.portProgress,
            [portId]: {
              ...state.portProgress[portId],
              portId,
              currentStep: step,
              completed: step === 'unlock',
              attempts: (state.portProgress[portId]?.attempts ?? 0),
            },
          },
        })),

      completeQuest: (portId, rank, baseGold) =>
        set((state) => {
          const gold = Math.floor(baseGold * BOUNTY_MULTIPLIERS[rank]);
          const newTotal = state.totalGold + gold;
          const newLevel = NAVIGATOR_RANKS
            .filter((r) => newTotal >= r.minGold)
            .pop()?.level ?? 1;

          const existing = state.portProgress[portId];
          const isBetter = !existing?.bestRank ||
            'SABC'.indexOf(rank) < 'SABC'.indexOf(existing.bestRank);

          return {
            totalGold: newTotal,
            navigatorLevel: newLevel,
            portProgress: {
              ...state.portProgress,
              [portId]: {
                portId,
                currentStep: 'summary' as const,
                completed: true,
                bestRank: isBetter ? rank : existing?.bestRank,
                bestGold: isBetter ? gold : existing?.bestGold,
                attempts: (existing?.attempts ?? 0) + 1,
              },
            },
          };
        }),

      getNavigatorRank: () => {
        const { totalGold } = get();
        return NAVIGATOR_RANKS
          .filter((r) => totalGold >= r.minGold)
          .pop() ?? NAVIGATOR_RANKS[0];
      },
    }),
    {
      name: 'rl-odyssey-game',
    }
  )
);
