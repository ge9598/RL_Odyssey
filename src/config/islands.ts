import type { IslandId } from '@/types/algorithm';

// ---------------------------------------------------------------------------
// Island-level configuration
// ---------------------------------------------------------------------------

export interface IslandBossConfig {
  nameKey: string;
  descKey: string;
  emoji: string;
}

export interface IslandConfig {
  /** Unique island identifier. */
  id: IslandId;
  /** i18n key for the island display name. */
  nameKey: string;
  /** i18n key for the island theme tagline. */
  themeKey: string;
  /** Emoji shown in the world map. */
  emoji: string;
  /** Difficulty rating 1-3 (star count on the map). */
  difficulty: number;
  /** URL route segment (e.g. "/island/value"). */
  route: string;
  /** CSS glow color for map highlights. */
  glowColor: string;
  /** Whether this island is currently playable. */
  available: boolean;
  /** Ordered list of port ids on this island. */
  portIds: string[];
  /** Optional boss encounter at the end of the island. */
  bossConfig?: IslandBossConfig;
}

// ---------------------------------------------------------------------------
// Island Registry
// ---------------------------------------------------------------------------

const ISLAND_REGISTRY: Map<IslandId, IslandConfig> = new Map();

function registerIsland(config: IslandConfig): void {
  ISLAND_REGISTRY.set(config.id, config);
}

// ---- Value Archipelago ----------------------------------------------------

registerIsland({
  id: 'value',
  nameKey: 'map.valueArchipelago',
  themeKey: 'value.theme',
  emoji: '\uD83C\uDFDD\uFE0F', // desert island
  difficulty: 1,
  route: '/island/value',
  glowColor: 'rgba(64, 224, 208, 0.4)',
  available: true,
  portIds: ['bandit', 'qtable', 'sarsa', 'deep', 'double-dqn', 'dueling-dqn'],
  bossConfig: {
    nameKey: 'value.boss.name',
    descKey: 'value.boss.desc',
    emoji: '\uD83C\uDFF4\u200D\u2620\uFE0F', // pirate flag
  },
});

// ---- Policy Volcanic Isle -------------------------------------------------

registerIsland({
  id: 'policy',
  nameKey: 'map.policyVolcanic',
  themeKey: 'policy.theme',
  emoji: '\uD83C\uDF0B', // volcano
  difficulty: 2,
  route: '/island/policy',
  glowColor: 'rgba(220, 20, 60, 0.4)',
  available: true,
  portIds: ['reinforce', 'actor-critic', 'a2c', 'ppo'],
  bossConfig: {
    nameKey: 'policy.boss.name',
    descKey: 'policy.boss.desc',
    emoji: '\uD83C\uDF0B',
  },
});

// ---- Continuous Glacier ---------------------------------------------------

registerIsland({
  id: 'continuous',
  nameKey: 'map.continuousGlacier',
  themeKey: 'continuous.theme',
  emoji: '\u2744\uFE0F', // snowflake
  difficulty: 3,
  route: '/island/continuous',
  glowColor: 'rgba(135, 206, 235, 0.4)',
  available: false,
  portIds: ['ddpg', 'td3', 'sac'],
  bossConfig: {
    nameKey: 'continuous.boss.name',
    descKey: 'continuous.boss.desc',
    emoji: '\u2744\uFE0F',
  },
});

// ---- Convergence Harbor ---------------------------------------------------

registerIsland({
  id: 'convergence',
  nameKey: 'map.convergenceHarbor',
  themeKey: 'convergence.theme',
  emoji: '\u2693', // anchor
  difficulty: 0,
  route: '/island/convergence',
  glowColor: 'rgba(255, 165, 0, 0.4)',
  available: false,
  portIds: [],
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getIslandConfig(islandId: string): IslandConfig | undefined {
  return ISLAND_REGISTRY.get(islandId as IslandId);
}

export function getAllIslands(): IslandConfig[] {
  return Array.from(ISLAND_REGISTRY.values());
}

// ---------------------------------------------------------------------------
// i18n keys required by islands (add to en.json / zh.json):
//
// Note: map.valueArchipelago, map.policyVolcanic, map.continuousGlacier,
// map.convergenceHarbor already exist in the i18n files.
//
// Additional keys needed:
//
// "policy": {
//   "theme": "The Intuition Brigade",
//   "boss": {
//     "name": "The Chaos Volcano",
//     "desc": "A volcanic eruption where the environment changes every N steps."
//   }
// },
// "continuous": {
//   "theme": "The World Isn't Black and White",
//   "boss": {
//     "name": "The Precision Gauntlet",
//     "desc": "A multi-stage obstacle course requiring the right algorithm for each phase."
//   }
// },
// "convergence": {
//   "theme": "Where All Routes Meet"
// }
//
// Chinese:
// "policy": {
//   "theme": "直觉旅团",
//   "boss": {
//     "name": "混沌火山",
//     "desc": "一座火山喷发，环境每N步就会改变。"
//   }
// },
// "continuous": {
//   "theme": "世界不是非黑即白",
//   "boss": {
//     "name": "精准挑战",
//     "desc": "多阶段障碍赛，每个阶段需要正确的算法。"
//   }
// },
// "convergence": {
//   "theme": "航线汇聚之地"
// }
// ---------------------------------------------------------------------------
