import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortId, BountyRank } from '@/types/algorithm';

export interface AlgorithmCard {
  id: string;
  portId: PortId | 'boss-greedy-pirate' | 'sarsa' | 'double-dqn' | 'dueling-dqn';
  name: string;
  nameZh: string;
  signatureMove: string;
  signatureMoveZh: string;
  strengths: string[];
  weaknesses: string[];
  stats: {
    sampleEfficiency: number;
    stability: number;
    scalability: number;
    simplicity: number;
    flexibility: number;
  };
}

interface CardState {
  collectedCards: string[];
  cardRanks: Record<string, BountyRank>;
  collectCard: (cardId: string, rank: BountyRank) => void;
  hasCard: (cardId: string) => boolean;
}

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      collectedCards: [],
      cardRanks: {},

      collectCard: (cardId, rank) =>
        set((state) => ({
          collectedCards: state.collectedCards.includes(cardId)
            ? state.collectedCards
            : [...state.collectedCards, cardId],
          cardRanks: {
            ...state.cardRanks,
            [cardId]: rank,
          },
        })),

      hasCard: (cardId) => get().collectedCards.includes(cardId),
    }),
    {
      name: 'rl-odyssey-cards',
    }
  )
);

export const ALGORITHM_CARDS: AlgorithmCard[] = [
  {
    id: 'explorers-instinct',
    portId: 'bandit',
    name: "Explorer's Instinct",
    nameZh: '探险家的直觉',
    signatureMove: 'Balance trying new things vs. sticking with the best',
    signatureMoveZh: '在尝试新事物和坚持最佳选择之间找到平衡',
    strengths: ['Simple to understand', 'Fast decisions'],
    weaknesses: ['No memory of sequences', 'Single-step only'],
    stats: { sampleEfficiency: 4, stability: 4, scalability: 2, simplicity: 5, flexibility: 2 },
  },
  {
    id: 'the-cartographer',
    portId: 'qtable',
    name: 'The Cartographer',
    nameZh: '制图师',
    signatureMove: 'Build a map of how good every choice is at every location',
    signatureMoveZh: '构建一张地图，记录每个位置每种选择的价值',
    strengths: ['Learns optimal paths', 'Simple and proven'],
    weaknesses: ["Can't handle large worlds", 'Needs many tries'],
    stats: { sampleEfficiency: 3, stability: 4, scalability: 2, simplicity: 4, flexibility: 3 },
  },
  {
    id: 'the-cautious-one',
    portId: 'sarsa',
    name: 'The Cautious One',
    nameZh: '谨慎者',
    signatureMove: 'Learn from what you actually do, not what you could have done',
    signatureMoveZh: '从你实际采取的行动中学习，而不是假设的行动',
    strengths: ['Safe near cliffs', 'On-policy learning'],
    weaknesses: ['Slightly suboptimal on average', 'Slower convergence'],
    stats: { sampleEfficiency: 3, stability: 5, scalability: 2, simplicity: 4, flexibility: 2 },
  },
  {
    id: 'neural-navigator',
    portId: 'deep',
    name: 'Neural Navigator',
    nameZh: '神经领航员',
    signatureMove: 'Use a neural network to estimate values in huge worlds',
    signatureMoveZh: '用神经网络在巨大的世界中估算价值',
    strengths: ['Handles complex inputs', 'Scales to big problems'],
    weaknesses: ['Needs lots of data', 'Can be unstable'],
    stats: { sampleEfficiency: 2, stability: 3, scalability: 5, simplicity: 2, flexibility: 4 },
  },
  {
    id: 'the-skeptic',
    portId: 'double-dqn',
    name: 'The Skeptic',
    nameZh: '怀疑论者',
    signatureMove: "Don't trust a single opinion — check the other network too",
    signatureMoveZh: '不要相信单一意见——也听听另一个网络怎么说',
    strengths: ['Reduces overestimation', 'More accurate Q-values'],
    weaknesses: ['Slightly more complex', 'Marginal gain on simple tasks'],
    stats: { sampleEfficiency: 3, stability: 4, scalability: 5, simplicity: 3, flexibility: 4 },
  },
  {
    id: 'the-analyst',
    portId: 'dueling-dqn',
    name: 'The Analyst',
    nameZh: '分析师',
    signatureMove: 'Separate "how good is this place?" from "how good is this action here?"',
    signatureMoveZh: '把"这个地方有多好"和"在这里做这个动作有多好"分开',
    strengths: ['Better state evaluation', 'Stronger in action-sparse environments'],
    weaknesses: ['More complex architecture', 'Small improvement on dense tasks'],
    stats: { sampleEfficiency: 3, stability: 4, scalability: 5, simplicity: 2, flexibility: 5 },
  },
  {
    id: 'patient-strategist',
    portId: 'boss-greedy-pirate',
    name: 'The Patient Strategist',
    nameZh: '耐心的策略师',
    signatureMove: 'Long-term thinking beats short-term greed',
    signatureMoveZh: '长远思考胜过短视贪婪',
    strengths: ['Sees the big picture', 'Delayed gratification'],
    weaknesses: ['Requires patience', 'Needs training time'],
    stats: { sampleEfficiency: 3, stability: 4, scalability: 4, simplicity: 3, flexibility: 4 },
  },
];
