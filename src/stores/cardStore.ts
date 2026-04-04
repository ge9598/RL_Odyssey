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
  strengthsZh: string[];
  weaknesses: string[];
  weaknessesZh: string[];
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
    strengthsZh: ['简单易懂', '决策速度快'],
    weaknesses: ['No memory of sequences', 'Single-step only'],
    weaknessesZh: ['无序列记忆', '只处理单步决策'],
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
    strengthsZh: ['学习最优路径', '简单且经过验证'],
    weaknesses: ["Can't handle large worlds", 'Needs many tries'],
    weaknessesZh: ['无法处理大型世界', '需要大量尝试'],
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
    strengthsZh: ['在悬崖边更安全', '同策略学习'],
    weaknesses: ['Slightly suboptimal on average', 'Slower convergence'],
    weaknessesZh: ['平均略次于最优', '收敛速度较慢'],
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
    strengthsZh: ['处理复杂输入', '可扩展到大型问题'],
    weaknesses: ['Needs lots of data', 'Can be unstable'],
    weaknessesZh: ['需要大量数据', '可能不稳定'],
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
    strengthsZh: ['减少过高估计', '更准确的Q值'],
    weaknesses: ['Slightly more complex', 'Marginal gain on simple tasks'],
    weaknessesZh: ['略微复杂', '在简单任务上提升有限'],
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
    strengthsZh: ['更好的状态评估', '在稀疏动作环境中更强'],
    weaknesses: ['More complex architecture', 'Small improvement on dense tasks'],
    weaknessesZh: ['架构更复杂', '在密集任务上提升有限'],
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
    strengthsZh: ['着眼大局', '延迟满足'],
    weaknesses: ['Requires patience', 'Needs training time'],
    weaknessesZh: ['需要耐心', '需要训练时间'],
    stats: { sampleEfficiency: 3, stability: 4, scalability: 4, simplicity: 3, flexibility: 4 },
  },
];
