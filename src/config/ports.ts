import { lazy, type ComponentType } from 'react';

import type { PortId, PortStep, BountyRank } from '@/types/algorithm';

// ---------------------------------------------------------------------------
// Port Step Props — every step component receives these
// ---------------------------------------------------------------------------

export interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

// ---------------------------------------------------------------------------
// Step-level config carried inside each PortConfig.steps[] entry
// ---------------------------------------------------------------------------

export interface PortStepConfig {
  /** Unique step id (may be the same as `type` for generic steps). */
  id: string;
  /** Canonical step type — maps to the PortStep union. */
  type: PortStep;
  /** React component that renders this step. */
  component: ComponentType<PortStepProps>;
  /** Whether the user can skip this step. */
  skippable?: boolean;
  /** Human-readable duration hint for the progress bar UI (e.g. "30s"). */
  durationHint?: string;
  /** Extra data bag consumed by generic step components. */
  meta?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Quest config embedded in each port
// ---------------------------------------------------------------------------

export interface QuestConfig {
  /** Base gold reward before bounty multiplier. */
  baseGold: number;
  /** Score thresholds per bounty rank (higher = harder). */
  thresholds: Record<BountyRank, number>;
  /** Card id awarded on quest completion. */
  cardId: string;
}

// ---------------------------------------------------------------------------
// Top-level port definition
// ---------------------------------------------------------------------------

export interface PortConfig {
  /** Unique port identifier. */
  id: PortId;
  /** Parent island id. */
  island: string;
  /** i18n key for the port display name. */
  nameKey: string;
  /** i18n key for the algorithm name. */
  algorithmKey: string;
  /** Emoji shown in headers and the world map. */
  emoji: string;
  /** i18n key for the one-line metaphor. */
  metaphorKey: string;
  /** Display order within its island (0-based). */
  order: number;
  /** Ordered list of steps the player walks through. */
  steps: PortStepConfig[];
  /** Quest evaluation parameters. */
  quest: QuestConfig;
  /** Port id to unlock when this port is completed, or null if none. */
  unlocks: PortId | null;
}

// ---------------------------------------------------------------------------
// Generic step component imports (lazy — they live in this framework)
// ---------------------------------------------------------------------------

const StoryStep = lazy(() => import('@/components/port/StoryStep'));
const PrimerStep = lazy(() => import('@/components/port/PrimerStep'));
const SummaryStep = lazy(() => import('@/components/port/SummaryStep'));
const UnlockStep = lazy(() => import('@/components/port/UnlockStep'));

// ---------------------------------------------------------------------------
// Bandit-specific step components (lazy)
// ---------------------------------------------------------------------------

const BanditFeel = lazy(() => import('@/components/bandit/BanditFeel').then(m => ({ default: m.BanditFeel })));
const BanditMeet = lazy(() => import('@/components/bandit/BanditMeet').then(m => ({ default: m.BanditMeet })));
const BanditWatch = lazy(() => import('@/components/bandit/BanditWatch').then(m => ({ default: m.BanditWatch })));
const BanditQuest = lazy(() => import('@/components/bandit/BanditQuest').then(m => ({ default: m.BanditQuest })));

// ---------------------------------------------------------------------------
// Q-Table (Q-Learning) step components (lazy)
// ---------------------------------------------------------------------------

const QTableFeel = lazy(() => import('@/components/qtable/QTableFeel').then(m => ({ default: m.QTableFeel })));
const QTableMeet = lazy(() => import('@/components/qtable/QTableMeet').then(m => ({ default: m.QTableMeet })));
const QTableWatch = lazy(() => import('@/components/qtable/QTableWatch').then(m => ({ default: m.QTableWatch })));
const QTableQuest = lazy(() => import('@/components/qtable/QTableQuest').then(m => ({ default: m.QTableQuest })));

// ---------------------------------------------------------------------------
// DQN (Deep Q-Network) step components (lazy)
// ---------------------------------------------------------------------------

const DQNFeel = lazy(() => import('@/components/dqn/DQNFeel').then(m => ({ default: m.DQNFeel })));
const DQNMeet = lazy(() => import('@/components/dqn/DQNMeet').then(m => ({ default: m.DQNMeet })));
const DQNWatch = lazy(() => import('@/components/dqn/DQNWatch').then(m => ({ default: m.DQNWatch })));
const DQNQuest = lazy(() => import('@/components/dqn/DQNQuest').then(m => ({ default: m.DQNQuest })));

// ---------------------------------------------------------------------------
// SARSA step components (lazy)
// ---------------------------------------------------------------------------

const SARSAFeel = lazy(() => import('@/components/sarsa/SARSAFeel').then(m => ({ default: m.SARSAFeel })));
const SARSAMeet = lazy(() => import('@/components/sarsa/SARSAMeet').then(m => ({ default: m.SARSAMeet })));
const SARSAWatch = lazy(() => import('@/components/sarsa/SARSAWatch').then(m => ({ default: m.SARSAWatch })));
const SARSAQuest = lazy(() => import('@/components/sarsa/SARSAQuest').then(m => ({ default: m.SARSAQuest })));

// ---------------------------------------------------------------------------
// Double DQN step components (lazy)
// ---------------------------------------------------------------------------

const DoubleDQNFeel = lazy(() => import('@/components/doubledqn/DoubleDQNFeel').then(m => ({ default: m.DoubleDQNFeel })));
const DoubleDQNMeet = lazy(() => import('@/components/doubledqn/DoubleDQNMeet').then(m => ({ default: m.DoubleDQNMeet })));
const DoubleDQNWatch = lazy(() => import('@/components/doubledqn/DoubleDQNWatch').then(m => ({ default: m.DoubleDQNWatch })));
const DoubleDQNQuest = lazy(() => import('@/components/doubledqn/DoubleDQNQuest').then(m => ({ default: m.DoubleDQNQuest })));

// ---------------------------------------------------------------------------
// Dueling DQN step components (lazy)
// ---------------------------------------------------------------------------

const DuelingDQNFeel = lazy(() => import('@/components/duelingdqn/DuelingDQNFeel').then(m => ({ default: m.DuelingDQNFeel })));
const DuelingDQNMeet = lazy(() => import('@/components/duelingdqn/DuelingDQNMeet').then(m => ({ default: m.DuelingDQNMeet })));
const DuelingDQNWatch = lazy(() => import('@/components/duelingdqn/DuelingDQNWatch').then(m => ({ default: m.DuelingDQNWatch })));
const DuelingDQNQuest = lazy(() => import('@/components/duelingdqn/DuelingDQNQuest').then(m => ({ default: m.DuelingDQNQuest })));

// ---------------------------------------------------------------------------
// Port Registry
// ---------------------------------------------------------------------------

const PORT_REGISTRY: Map<PortId, PortConfig> = new Map();

function registerPort(config: PortConfig): void {
  PORT_REGISTRY.set(config.id, config);
}

// ---- Value Archipelago: Port Bandit ----------------------------------------

registerPort({
  id: 'bandit',
  island: 'value',
  nameKey: 'value.bandit.name',
  algorithmKey: 'value.bandit.algorithm',
  emoji: '\uD83C\uDFB0', // slot machine
  metaphorKey: 'value.bandit.metaphor',
  order: 0,
  steps: [
    {
      id: 'bandit-story',
      type: 'story',
      component: StoryStep,
      skippable: true,
      durationHint: '30s',
      meta: {
        storyKey: 'port.bandit.story',
        emoji: '\uD83C\uDFB0',
      },
    },
    {
      id: 'bandit-primer',
      type: 'primer',
      component: PrimerStep,
      skippable: true,
      durationHint: '30s',
      meta: {
        primerKey: 'port.bandit.primer',
      },
    },
    {
      id: 'bandit-feel',
      type: 'feel',
      component: BanditFeel,
      skippable: true,
      durationHint: '2 min',
    },
    {
      id: 'bandit-meet',
      type: 'meet',
      component: BanditMeet,
      skippable: true,
      durationHint: '3 min',
    },
    {
      id: 'bandit-watch',
      type: 'watch',
      component: BanditWatch,
      skippable: true,
      durationHint: '2 min',
    },
    {
      id: 'bandit-quest',
      type: 'quest',
      component: BanditQuest,
      skippable: false,
      durationHint: '5 min',
    },
    {
      id: 'bandit-summary',
      type: 'summary',
      component: SummaryStep,
      skippable: false,
      durationHint: '1 min',
      meta: {
        cardId: 'explorers-instinct',
        summaryKey: 'port.bandit.summary',
      },
    },
    {
      id: 'bandit-unlock',
      type: 'unlock',
      component: UnlockStep,
      skippable: false,
      durationHint: '30s',
      meta: {
        nextPortId: 'qtable',
        nextPortNameKey: 'value.qtable.name',
      },
    },
  ],
  quest: {
    baseGold: 300,
    thresholds: { S: 2.5, A: 2.0, B: 1.5, C: 1.1 },
    cardId: 'explorers-instinct',
  },
  unlocks: 'qtable',
});

// ---- Value Archipelago: Port Q-Table ----------------------------------------

registerPort({
  id: 'qtable',
  island: 'value',
  nameKey: 'value.qtable.name',
  algorithmKey: 'value.qtable.algorithm',
  emoji: '\uD83D\uDDFA\uFE0F', // world map
  metaphorKey: 'value.qtable.metaphor',
  order: 1,
  steps: [
    {
      id: 'qtable-story',
      type: 'story',
      component: StoryStep,
      skippable: true,
      durationHint: '30s',
      meta: {
        storyKey: 'port.qtable.story',
        emoji: '\uD83D\uDDFA\uFE0F',
      },
    },
    {
      id: 'qtable-primer',
      type: 'primer',
      component: PrimerStep,
      skippable: true,
      durationHint: '30s',
      meta: {
        primerKey: 'port.qtable.primer',
      },
    },
    {
      id: 'qtable-feel',
      type: 'feel',
      component: QTableFeel,
      skippable: true,
      durationHint: '2 min',
    },
    {
      id: 'qtable-meet',
      type: 'meet',
      component: QTableMeet,
      skippable: true,
      durationHint: '3 min',
    },
    {
      id: 'qtable-watch',
      type: 'watch',
      component: QTableWatch,
      skippable: true,
      durationHint: '2 min',
    },
    {
      id: 'qtable-quest',
      type: 'quest',
      component: QTableQuest,
      skippable: false,
      durationHint: '5 min',
    },
    {
      id: 'qtable-summary',
      type: 'summary',
      component: SummaryStep,
      skippable: false,
      durationHint: '1 min',
      meta: {
        cardId: 'the-cartographer',
        summaryKey: 'port.qtable.summary',
      },
    },
    {
      id: 'qtable-unlock',
      type: 'unlock',
      component: UnlockStep,
      skippable: false,
      durationHint: '30s',
      meta: {
        nextPortId: 'sarsa',
        nextPortNameKey: 'value.sarsa.name',
      },
    },
  ],
  quest: {
    baseGold: 500,
    // Thresholds: ratio = Q-learning path / player path (lower is better)
    thresholds: { S: 0.6, A: 0.7, B: 0.85, C: 1.0 },
    cardId: 'the-cartographer',
  },
  unlocks: 'sarsa',
});

// ---- Value Archipelago: Port SARSA -----------------------------------------

registerPort({
  id: 'sarsa',
  island: 'value',
  nameKey: 'value.sarsa.name',
  algorithmKey: 'value.sarsa.algorithm',
  emoji: '\uD83E\uDDED', // compass
  metaphorKey: 'value.sarsa.metaphor',
  order: 2,
  steps: [
    {
      id: 'sarsa-story',
      type: 'story',
      component: StoryStep,
      skippable: true,
      durationHint: '30s',
      meta: { storyKey: 'port.sarsa.story', emoji: '\uD83E\uDDED' },
    },
    {
      id: 'sarsa-primer',
      type: 'primer',
      component: PrimerStep,
      skippable: true,
      durationHint: '30s',
      meta: { primerKey: 'port.sarsa.primer' },
    },
    { id: 'sarsa-feel', type: 'feel', component: SARSAFeel, skippable: true, durationHint: '2 min' },
    { id: 'sarsa-meet', type: 'meet', component: SARSAMeet, skippable: true, durationHint: '3 min' },
    { id: 'sarsa-watch', type: 'watch', component: SARSAWatch, skippable: true, durationHint: '2 min' },
    { id: 'sarsa-quest', type: 'quest', component: SARSAQuest, skippable: false, durationHint: '5 min' },
    {
      id: 'sarsa-summary',
      type: 'summary',
      component: SummaryStep,
      skippable: false,
      durationHint: '1 min',
      meta: { cardId: 'the-cautious-one', summaryKey: 'port.sarsa.summary' },
    },
    {
      id: 'sarsa-unlock',
      type: 'unlock',
      component: UnlockStep,
      skippable: false,
      durationHint: '30s',
      meta: { nextPortId: 'deep', nextPortNameKey: 'value.deep.name' },
    },
  ],
  quest: {
    baseGold: 400,
    thresholds: { S: 0.9, A: 0.7, B: 0.5, C: 0.3 },
    cardId: 'the-cautious-one',
  },
  unlocks: 'deep',
});

// ---- Value Archipelago: Port Deep (DQN) ------------------------------------

registerPort({
  id: 'deep',
  island: 'value',
  nameKey: 'value.deep.name',
  algorithmKey: 'value.deep.algorithm',
  emoji: '\uD83E\uDDE0', // brain
  metaphorKey: 'value.deep.metaphor',
  order: 3,
  steps: [
    {
      id: 'deep-story',
      type: 'story',
      component: StoryStep,
      skippable: true,
      durationHint: '30s',
      meta: {
        storyKey: 'port.deep.story',
        emoji: '\uD83E\uDDE0',
      },
    },
    {
      id: 'deep-primer',
      type: 'primer',
      component: PrimerStep,
      skippable: true,
      durationHint: '30s',
      meta: {
        primerKey: 'port.deep.primer',
      },
    },
    {
      id: 'deep-feel',
      type: 'feel',
      component: DQNFeel,
      skippable: true,
      durationHint: '2 min',
    },
    {
      id: 'deep-meet',
      type: 'meet',
      component: DQNMeet,
      skippable: true,
      durationHint: '3 min',
    },
    {
      id: 'deep-watch',
      type: 'watch',
      component: DQNWatch,
      skippable: true,
      durationHint: '2 min',
    },
    {
      id: 'deep-quest',
      type: 'quest',
      component: DQNQuest,
      skippable: false,
      durationHint: '5 min',
    },
    {
      id: 'deep-summary',
      type: 'summary',
      component: SummaryStep,
      skippable: false,
      durationHint: '1 min',
      meta: {
        cardId: 'neural-navigator',
        summaryKey: 'port.deep.summary',
      },
    },
    {
      id: 'deep-unlock',
      type: 'unlock',
      component: UnlockStep,
      skippable: false,
      durationHint: '30s',
      meta: { nextPortId: 'double-dqn', nextPortNameKey: 'value.doubledqn.name' },
    },
  ],
  quest: {
    baseGold: 800,
    thresholds: { S: 2.0, A: 1.5, B: 1.2, C: 1.0 },
    cardId: 'neural-navigator',
  },
  unlocks: 'double-dqn',
});

// ---- Value Archipelago: Port Double DQN ------------------------------------

registerPort({
  id: 'double-dqn',
  island: 'value',
  nameKey: 'value.doubledqn.name',
  algorithmKey: 'value.doubledqn.algorithm',
  emoji: '\uD83D\uDD0D', // magnifying glass
  metaphorKey: 'value.doubledqn.metaphor',
  order: 4,
  steps: [
    {
      id: 'doubledqn-story',
      type: 'story',
      component: StoryStep,
      skippable: true,
      durationHint: '30s',
      meta: { storyKey: 'port.doubledqn.story', emoji: '\uD83D\uDD0D' },
    },
    {
      id: 'doubledqn-primer',
      type: 'primer',
      component: PrimerStep,
      skippable: true,
      durationHint: '30s',
      meta: { primerKey: 'port.doubledqn.primer' },
    },
    { id: 'doubledqn-feel', type: 'feel', component: DoubleDQNFeel, skippable: true, durationHint: '2 min' },
    { id: 'doubledqn-meet', type: 'meet', component: DoubleDQNMeet, skippable: true, durationHint: '3 min' },
    { id: 'doubledqn-watch', type: 'watch', component: DoubleDQNWatch, skippable: true, durationHint: '2 min' },
    { id: 'doubledqn-quest', type: 'quest', component: DoubleDQNQuest, skippable: false, durationHint: '5 min' },
    {
      id: 'doubledqn-summary',
      type: 'summary',
      component: SummaryStep,
      skippable: false,
      durationHint: '1 min',
      meta: { cardId: 'the-skeptic', summaryKey: 'port.doubledqn.summary' },
    },
    {
      id: 'doubledqn-unlock',
      type: 'unlock',
      component: UnlockStep,
      skippable: false,
      durationHint: '30s',
      meta: { nextPortId: 'dueling-dqn', nextPortNameKey: 'value.duelingdqn.name' },
    },
  ],
  quest: {
    baseGold: 500,
    thresholds: { S: 0.15, A: 0.10, B: 0.05, C: 0.0 },
    cardId: 'the-skeptic',
  },
  unlocks: 'dueling-dqn',
});

// ---- Value Archipelago: Port Dueling DQN -----------------------------------

registerPort({
  id: 'dueling-dqn',
  island: 'value',
  nameKey: 'value.duelingdqn.name',
  algorithmKey: 'value.duelingdqn.algorithm',
  emoji: '\u2694\uFE0F', // crossed swords
  metaphorKey: 'value.duelingdqn.metaphor',
  order: 5,
  steps: [
    {
      id: 'duelingdqn-story',
      type: 'story',
      component: StoryStep,
      skippable: true,
      durationHint: '30s',
      meta: { storyKey: 'port.duelingdqn.story', emoji: '\u2694\uFE0F' },
    },
    {
      id: 'duelingdqn-primer',
      type: 'primer',
      component: PrimerStep,
      skippable: true,
      durationHint: '30s',
      meta: { primerKey: 'port.duelingdqn.primer' },
    },
    { id: 'duelingdqn-feel', type: 'feel', component: DuelingDQNFeel, skippable: true, durationHint: '2 min' },
    { id: 'duelingdqn-meet', type: 'meet', component: DuelingDQNMeet, skippable: true, durationHint: '3 min' },
    { id: 'duelingdqn-watch', type: 'watch', component: DuelingDQNWatch, skippable: true, durationHint: '2 min' },
    { id: 'duelingdqn-quest', type: 'quest', component: DuelingDQNQuest, skippable: false, durationHint: '5 min' },
    {
      id: 'duelingdqn-summary',
      type: 'summary',
      component: SummaryStep,
      skippable: false,
      durationHint: '1 min',
      meta: { cardId: 'the-analyst', summaryKey: 'port.duelingdqn.summary' },
    },
    {
      id: 'duelingdqn-unlock',
      type: 'unlock',
      component: UnlockStep,
      skippable: false,
      durationHint: '30s',
      meta: { nextPortId: null, nextPortNameKey: '' },
    },
  ],
  quest: {
    baseGold: 500,
    thresholds: { S: 0.20, A: 0.10, B: 0.0, C: -0.1 },
    cardId: 'the-analyst',
  },
  unlocks: null,
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getPortConfig(portId: string): PortConfig | undefined {
  return PORT_REGISTRY.get(portId as PortId);
}

export function getPortsForIsland(islandId: string): PortConfig[] {
  const ports: PortConfig[] = [];
  for (const config of PORT_REGISTRY.values()) {
    if (config.island === islandId) {
      ports.push(config);
    }
  }
  return ports.sort((a, b) => a.order - b.order);
}

export function getAllPorts(): PortConfig[] {
  return Array.from(PORT_REGISTRY.values()).sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// i18n keys required by this port registry (add to en.json / zh.json):
//
// "port": {
//   "bandit": {
//     "story": "You arrive at a mysterious cove lined with treasure chests...",
//     "primer": "What is probability? Think of it like a weather forecast...",
//     "summary": "You learned the Multi-Armed Bandit problem..."
//   },
//   "qtable": {
//     "story": "You reach a cursed island covered in fog. An old sailor warns you: 'This island shifts and traps those who wander blindly. Only a true cartographer — one who maps every path — can escape.'",
//     "primer": "What is a table of values? Think of a spreadsheet where each row is a location and each column is a direction. The numbers tell you how good each choice is.",
//     "summary": "You learned Q-Learning — an algorithm that builds a complete map of how good every action is at every location. By balancing exploration and exploitation, it finds the optimal path through any grid world. The key insight: ask your future self for advice (the Bellman equation)."
//   },
//   "steps": {
//     "story": "Story",
//     "primer": "Concept Primer",
//     "feel": "Feel the Problem",
//     "meet": "Meet the Algorithm",
//     "watch": "Watch It Learn",
//     "quest": "Quest Challenge",
//     "summary": "Summary & Reward",
//     "unlock": "Set Sail!"
//   }
// }
//
// Chinese equivalents:
// "port": {
//   "qtable": {
//     "story": "你来到一座被迷雾笼罩的诅咒之岛。一个老水手警告你：'这座岛会变幻莫测，盲目行走只会落入陷阱。只有真正的制图师——能绘制每条路径的人——才能逃脱。'",
//     "primer": "什么是价值表？想象一个表格，每一行是一个位置，每一列是一个方向。里面的数字告诉你每个选择有多好。",
//     "summary": "你学会了 Q-Learning——一种为每个位置的每个动作构建完整评分地图的算法。通过平衡探索和利用，它能找到任何网格世界的最优路径。核心洞察：向未来的自己求助（贝尔曼方程）。"
//   }
// }
// ---------------------------------------------------------------------------
