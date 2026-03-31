export interface StepMetadata {
  reward: number;
  done: boolean;
  info: Record<string, unknown>;
}

export interface UpdateMetadata {
  loss?: number;
  qValues?: number[];
  oldQValues?: number[];
  tdError?: number;
}

export interface Experience<S, A> {
  state: S;
  action: A;
  reward: number;
  nextState: S;
  done: boolean;
}

export interface HyperParameter {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

export interface VisualizationData {
  type: string;
  data: Record<string, unknown>;
}

export interface RLAlgorithm<S, A> {
  name: string;
  reset(): void;
  step(state: S): { action: A; metadata: StepMetadata };
  update(experience: Experience<S, A>): UpdateMetadata;
  getVisualizationData(): VisualizationData;
  getHyperparameters(): HyperParameter[];
  setHyperparameter(key: string, value: number): void;
  serialize(): string;
  deserialize(data: string): void;
}

export type BountyRank = 'S' | 'A' | 'B' | 'C';

export interface QuestResult {
  passed: boolean;
  rank: BountyRank;
  score: number;
  gold: number;
}

export type PortId =
  | 'bandit'
  | 'qtable'
  | 'sarsa'
  | 'deep'
  | 'double-dqn'
  | 'dueling-dqn'
  | 'reinforce'
  | 'actor-critic'
  | 'a2c'
  | 'ppo'
  | 'ddpg'
  | 'td3'
  | 'sac';

export type IslandId = 'value' | 'policy' | 'continuous' | 'convergence';

export type BossId = 'greedy-pirate' | 'chaos-volcano';

export type PortStep =
  | 'story'
  | 'primer'
  | 'feel'
  | 'meet'
  | 'watch'
  | 'quest'
  | 'summary'
  | 'unlock';

export interface PortProgress {
  portId: PortId;
  currentStep: PortStep;
  completed: boolean;
  bestRank?: BountyRank;
  bestGold?: number;
  attempts: number;
}

export interface NavigatorRank {
  level: number;
  title: string;
  titleZh: string;
  minGold: number;
}

export const NAVIGATOR_RANKS: NavigatorRank[] = [
  { level: 1, title: 'Apprentice Sailor', titleZh: '见习水手', minGold: 0 },
  { level: 2, title: 'Navigator', titleZh: '航海士', minGold: 2001 },
  { level: 3, title: 'First Mate', titleZh: '大副', minGold: 8001 },
  { level: 4, title: 'Captain', titleZh: '船长', minGold: 20001 },
  { level: 5, title: 'Admiral of Intelligence', titleZh: '智慧提督', minGold: 40001 },
];

export const BOUNTY_MULTIPLIERS: Record<BountyRank, number> = {
  S: 3,
  A: 2,
  B: 1,
  C: 0.5,
};
