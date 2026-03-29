/**
 * SARSA (State-Action-Reward-State-Action) — On-Policy Q-Learning.
 *
 * Key difference from Q-Learning:
 *   - Q-Learning (off-policy): Q(s,a) += lr * [r + γ * max Q(s',a') - Q(s,a)]
 *   - SARSA (on-policy):       Q(s,a) += lr * [r + γ * Q(s',a') - Q(s,a)]
 *     where a' is the ACTUAL next action chosen by the current policy.
 *
 * Effect: SARSA is more "cautious" — it accounts for the exploration noise
 * in its updates, so near dangerous states it learns to stay away from them.
 */

import { SeededRandom } from '@/utils/seededRandom';
import { argmax } from '@/utils/math';
import type {
  RLAlgorithm,
  Experience,
  StepMetadata,
  UpdateMetadata,
  HyperParameter,
  VisualizationData,
} from '@/types/algorithm';

export class SARSAAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'SARSA';

  private rng: SeededRandom;
  private qTable: number[][];
  private visitCounts: number[];
  private numStates: number;
  private numActions: number;
  private totalSteps: number;
  private episodeCount: number;
  private lastAction: number;
  private lastReward: number;
  private rewardHistory: number[];
  private episodeRewards: number[];
  private currentEpisodeReward: number;

  // The on-policy "pending" next action (needed for SARSA)
  private pendingNextAction: number;

  // Hyperparameters
  private learningRate: number;
  private discountFactor: number;
  private epsilon: number;

  constructor(numStates: number, numActions = 4, seed = 43) {
    this.rng = new SeededRandom(seed);
    this.numStates = numStates;
    this.numActions = numActions;
    this.learningRate = 0.1;
    this.discountFactor = 0.95;
    this.epsilon = 0.15;
    this.qTable = [];
    this.visitCounts = [];
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.lastAction = -1;
    this.lastReward = 0;
    this.rewardHistory = [];
    this.episodeRewards = [];
    this.currentEpisodeReward = 0;
    this.pendingNextAction = -1;
    this.reset();
  }

  reset(): void {
    this.qTable = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.visitCounts = new Array(this.numStates).fill(0);
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.lastAction = -1;
    this.lastReward = 0;
    this.rewardHistory = [];
    this.episodeRewards = [];
    this.currentEpisodeReward = 0;
    this.pendingNextAction = -1;
  }

  /** Epsilon-greedy action selection. */
  step(state: number): { action: number; metadata: StepMetadata } {
    let action: number;

    // If we already picked the next action in a previous update, reuse it
    if (this.pendingNextAction >= 0) {
      action = this.pendingNextAction;
      this.pendingNextAction = -1;
    } else {
      action = this.selectAction(state);
    }

    this.lastAction = action;
    this.visitCounts[state] += 1;

    return {
      action,
      metadata: {
        reward: 0,
        done: false,
        info: { state, qValues: [...this.qTable[state]] },
      },
    };
  }

  private selectAction(state: number): number {
    if (this.rng.chance(this.epsilon)) {
      return this.rng.nextInt(0, this.numActions - 1);
    }
    return argmax(this.qTable[state]);
  }

  /**
   * SARSA update: Q(s,a) += lr * (r + γ * Q(s',a') - Q(s,a))
   * a' is chosen by the current epsilon-greedy policy from s'.
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;

    const oldQ = this.qTable[state][action];

    let target: number;
    if (done) {
      target = reward;
    } else {
      // Pick the ACTUAL next action using current policy (on-policy)
      const nextAction = this.selectAction(nextState);
      this.pendingNextAction = nextAction; // reuse in next step()
      target = reward + this.discountFactor * this.qTable[nextState][nextAction];
    }

    const tdError = target - oldQ;
    this.qTable[state][action] = oldQ + this.learningRate * tdError;

    this.lastReward = reward;
    this.totalSteps += 1;
    this.currentEpisodeReward += reward;
    this.rewardHistory.push(reward);

    if (done) {
      this.episodeRewards.push(this.currentEpisodeReward);
      this.episodeCount += 1;
      this.currentEpisodeReward = 0;
      this.pendingNextAction = -1;
    }

    return {
      qValues: [...this.qTable[state]],
      oldQValues: (() => {
        const old = [...this.qTable[state]];
        old[action] = oldQ;
        return old;
      })(),
      tdError,
    };
  }

  startEpisode(): void {
    this.currentEpisodeReward = 0;
    this.pendingNextAction = -1;
  }

  getVisualizationData(): VisualizationData {
    const stateValues = this.qTable.map((actions) => Math.max(...actions));
    return {
      type: 'qtable',
      data: {
        qTable: this.qTable.map((row) => [...row]),
        stateValues,
        visitCounts: [...this.visitCounts],
        totalSteps: this.totalSteps,
        episodeCount: this.episodeCount,
        lastAction: this.lastAction,
        lastReward: this.lastReward,
        rewardHistory: [...this.rewardHistory],
        episodeRewards: [...this.episodeRewards],
        currentEpisodeReward: this.currentEpisodeReward,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate',
        label: 'Learning Rate (alpha)',
        value: this.learningRate,
        min: 0.01,
        max: 1.0,
        step: 0.01,
        description: 'How fast the agent updates its knowledge',
      },
      {
        key: 'discountFactor',
        label: 'Discount Factor (gamma)',
        value: this.discountFactor,
        min: 0,
        max: 1.0,
        step: 0.01,
        description: 'How much future rewards matter',
      },
      {
        key: 'epsilon',
        label: 'Epsilon (exploration)',
        value: this.epsilon,
        min: 0,
        max: 1.0,
        step: 0.01,
        description: 'Chance of exploring a random direction',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'learningRate': this.learningRate = value; break;
      case 'discountFactor': this.discountFactor = value; break;
      case 'epsilon': this.epsilon = value; break;
    }
  }

  getBestAction(state: number): number {
    return argmax(this.qTable[state]);
  }

  serialize(): string {
    return JSON.stringify({
      qTable: this.qTable,
      visitCounts: this.visitCounts,
      numStates: this.numStates,
      numActions: this.numActions,
      totalSteps: this.totalSteps,
      episodeCount: this.episodeCount,
      lastAction: this.lastAction,
      lastReward: this.lastReward,
      rewardHistory: this.rewardHistory,
      episodeRewards: this.episodeRewards,
      currentEpisodeReward: this.currentEpisodeReward,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      epsilon: this.epsilon,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.qTable = parsed.qTable;
    this.visitCounts = parsed.visitCounts;
    this.numStates = parsed.numStates;
    this.numActions = parsed.numActions;
    this.totalSteps = parsed.totalSteps;
    this.episodeCount = parsed.episodeCount;
    this.lastAction = parsed.lastAction;
    this.lastReward = parsed.lastReward;
    this.rewardHistory = parsed.rewardHistory;
    this.episodeRewards = parsed.episodeRewards;
    this.currentEpisodeReward = parsed.currentEpisodeReward;
    this.learningRate = parsed.learningRate;
    this.discountFactor = parsed.discountFactor;
    this.epsilon = parsed.epsilon;
    this.rng.setState(parsed.rngState);
  }
}
