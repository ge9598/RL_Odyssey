/**
 * Q-Learning Algorithm
 *
 * Tabular Q-Learning for discrete state/action spaces.
 * Used in Port Q-Table and the Greedy Pirate boss fight.
 *
 * The Q-table maps (state, action) -> expected cumulative reward.
 * Update rule: Q(s,a) += alpha * (r + gamma * max_a' Q(s',a') - Q(s,a))
 */

import type {
  RLAlgorithm,
  StepMetadata,
  UpdateMetadata,
  Experience,
  HyperParameter,
  VisualizationData,
} from '@/types/algorithm';
import { SeededRandom } from '@/utils/seededRandom';

export interface QLearningConfig {
  numStates: number;
  numActions: number;
  learningRate?: number;
  discountFactor?: number;
  epsilon?: number;
  seed?: number;
}

export class QLearningAgent
  implements RLAlgorithm<number, number>
{
  name = 'Q-Learning';

  private qTable: Float64Array;
  private numStates: number;
  private numActions: number;
  private learningRate: number;
  private discountFactor: number;
  private epsilon: number;
  private rng: SeededRandom;
  private episodeReward: number;
  private totalSteps: number;

  constructor(config: QLearningConfig) {
    this.numStates = config.numStates;
    this.numActions = config.numActions;
    this.learningRate = config.learningRate ?? 0.1;
    this.discountFactor = config.discountFactor ?? 0.95;
    this.epsilon = config.epsilon ?? 0.1;
    this.rng = new SeededRandom(config.seed ?? 42);
    this.qTable = new Float64Array(this.numStates * this.numActions);
    this.episodeReward = 0;
    this.totalSteps = 0;
  }

  reset(): void {
    this.qTable.fill(0);
    this.episodeReward = 0;
    this.totalSteps = 0;
  }

  /** Epsilon-greedy action selection */
  step(state: number): { action: number; metadata: StepMetadata } {
    let action: number;

    if (this.rng.next() < this.epsilon) {
      // Explore: random action
      action = Math.floor(this.rng.next() * this.numActions);
    } else {
      // Exploit: best Q-value
      action = this.bestAction(state);
    }

    return {
      action,
      metadata: { reward: 0, done: false, info: {} },
    };
  }

  /** Q-Learning update: off-policy, uses max over next-state actions */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;
    const idx = state * this.numActions + action;

    const oldQ = this.qTable[idx];
    const maxNextQ = done ? 0 : this.maxQ(nextState);
    const tdError = reward + this.discountFactor * maxNextQ - oldQ;
    const newQ = oldQ + this.learningRate * tdError;

    this.qTable[idx] = newQ;
    this.episodeReward += reward;
    this.totalSteps++;

    return {
      loss: Math.abs(tdError),
      qValues: this.getQValues(state),
      oldQValues: [oldQ],
      tdError,
    };
  }

  /** Get the action with highest Q-value for a state */
  bestAction(state: number): number {
    let best = 0;
    let bestVal = -Infinity;
    const base = state * this.numActions;

    for (let a = 0; a < this.numActions; a++) {
      const val = this.qTable[base + a];
      if (val > bestVal) {
        bestVal = val;
        best = a;
      }
    }
    return best;
  }

  /** Get the maximum Q-value for a state */
  private maxQ(state: number): number {
    let max = -Infinity;
    const base = state * this.numActions;

    for (let a = 0; a < this.numActions; a++) {
      const val = this.qTable[base + a];
      if (val > max) max = val;
    }
    return max;
  }

  /** Get all Q-values for a state */
  getQValues(state: number): number[] {
    const base = state * this.numActions;
    const values: number[] = [];
    for (let a = 0; a < this.numActions; a++) {
      values.push(this.qTable[base + a]);
    }
    return values;
  }

  /** Get the full Q-table as a 2D-like structure for visualization */
  getVisualizationData(): VisualizationData {
    const table: number[][] = [];
    for (let s = 0; s < this.numStates; s++) {
      table.push(this.getQValues(s));
    }
    return {
      type: 'qtable-heatmap',
      data: {
        qTable: table,
        numStates: this.numStates,
        numActions: this.numActions,
        episodeReward: this.episodeReward,
        totalSteps: this.totalSteps,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate',
        label: 'Learning Rate',
        value: this.learningRate,
        min: 0.01,
        max: 1.0,
        step: 0.01,
        description: 'How fast the agent learns from new experiences',
      },
      {
        key: 'discountFactor',
        label: 'Discount Factor',
        value: this.discountFactor,
        min: 0.0,
        max: 1.0,
        step: 0.01,
        description:
          'How much the agent values future rewards vs immediate ones (higher = more patient)',
      },
      {
        key: 'epsilon',
        label: 'Exploration Rate',
        value: this.epsilon,
        min: 0.0,
        max: 1.0,
        step: 0.01,
        description:
          'How often the agent tries random actions to discover new things',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'learningRate':
        this.learningRate = value;
        break;
      case 'discountFactor':
        this.discountFactor = value;
        break;
      case 'epsilon':
        this.epsilon = value;
        break;
    }
  }

  /** Reset episode reward counter (call at start of each training episode) */
  resetEpisode(): void {
    this.episodeReward = 0;
  }

  getEpisodeReward(): number {
    return this.episodeReward;
  }

  serialize(): string {
    return JSON.stringify({
      qTable: Array.from(this.qTable),
      numStates: this.numStates,
      numActions: this.numActions,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      epsilon: this.epsilon,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.numStates = parsed.numStates;
    this.numActions = parsed.numActions;
    this.learningRate = parsed.learningRate;
    this.discountFactor = parsed.discountFactor;
    this.epsilon = parsed.epsilon;
    this.qTable = new Float64Array(parsed.qTable);
    this.rng.setState(parsed.rngState);
  }
}
