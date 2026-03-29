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

// ─── Bandit Environment (non-stationary) ───────────────────────────────────
/**
 * Multi-armed bandit environment where each arm has a Gaussian payout.
 * Supports non-stationary mode: call shift() to re-randomize means.
 */
export class BanditEnvironment {
  private rng: SeededRandom;
  private means: number[];
  private readonly stddev: number;
  readonly numArms: number;

  constructor(numArms: number, seed: number, stddev = 2) {
    this.numArms = numArms;
    this.stddev = stddev;
    this.rng = new SeededRandom(seed);
    this.means = this.generateMeans();
  }

  private generateMeans(): number[] {
    const means: number[] = [];
    for (let i = 0; i < this.numArms; i++) {
      means.push(this.rng.nextFloat(1, 10));
    }
    return means;
  }

  /** Pull an arm, returns a reward drawn from N(mean[arm], stddev). */
  pull(arm: number): number {
    const reward = this.rng.nextGaussian(this.means[arm], this.stddev);
    return Math.max(0, Math.round(reward * 10) / 10); // clamp to non-negative, 1 decimal
  }

  /** Re-randomize arm means (non-stationary shift). */
  shift(): void {
    this.means = this.generateMeans();
  }

  /** Reveal the true means (for display after quest). */
  getTrueMeans(): number[] {
    return [...this.means];
  }
}

// ─── Bandit Algorithm ───────────────────────────────────────────────────────
/**
 * Multi-Armed Bandit agent with epsilon-greedy and UCB strategies.
 * State is always 0 (context-free bandit). Action is the arm index.
 */
export class BanditAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'Multi-Armed Bandit';

  private rng: SeededRandom;
  private values: number[];
  private counts: number[];
  private totalSteps: number;
  private lastAction: number;
  private lastReward: number;
  private rewardHistory: number[];
  private cumulativeRewards: number[];
  private cumulativeSum: number;

  // Hyperparameters
  private strategy: number; // 0 = epsilon-greedy, 1 = UCB
  private epsilon: number;
  private ucbC: number;
  private numArms: number;

  constructor(seed = 42) {
    this.rng = new SeededRandom(seed);
    this.strategy = 0;
    this.epsilon = 0.1;
    this.ucbC = 2.0;
    this.numArms = 5;
    this.values = [];
    this.counts = [];
    this.totalSteps = 0;
    this.lastAction = -1;
    this.lastReward = 0;
    this.rewardHistory = [];
    this.cumulativeRewards = [];
    this.cumulativeSum = 0;
    this.reset();
  }

  reset(): void {
    this.values = new Array(this.numArms).fill(0);
    this.counts = new Array(this.numArms).fill(0);
    this.totalSteps = 0;
    this.lastAction = -1;
    this.lastReward = 0;
    this.rewardHistory = [];
    this.cumulativeRewards = [];
    this.cumulativeSum = 0;
  }

  /**
   * Select an arm.
   * The `state` parameter is ignored for bandits (always 0).
   */
  step(_state?: number): { action: number; metadata: StepMetadata } {
    // _state is unused for bandits (context-free). Accept and ignore it.
    void _state;
    let action: number;

    if (this.strategy === 0) {
      // Epsilon-greedy
      action = this.epsilonGreedySelect();
    } else {
      // UCB
      action = this.ucbSelect();
    }

    this.lastAction = action;
    return {
      action,
      metadata: {
        reward: 0, // reward not yet known
        done: false,
        info: {
          strategy: this.strategy === 0 ? 'epsilon-greedy' : 'UCB',
          explored: this.strategy === 0 ? this.rng.next() < this.epsilon : false,
        },
      },
    };
  }

  private epsilonGreedySelect(): number {
    // If any arm hasn't been tried yet, try it first
    for (let i = 0; i < this.numArms; i++) {
      if (this.counts[i] === 0) return i;
    }

    if (this.rng.chance(this.epsilon)) {
      // Explore: pick a random arm
      return this.rng.nextInt(0, this.numArms - 1);
    }
    // Exploit: pick the best known arm
    return argmax(this.values);
  }

  private ucbSelect(): number {
    // If any arm hasn't been tried yet, try it first
    for (let i = 0; i < this.numArms; i++) {
      if (this.counts[i] === 0) return i;
    }

    const ucbValues = this.values.map((v, i) =>
      v + this.ucbC * Math.sqrt(Math.log(this.totalSteps) / this.counts[i])
    );
    return argmax(ucbValues);
  }

  /**
   * Update estimated values after receiving a reward.
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { action, reward } = experience;
    this.counts[action] += 1;
    this.totalSteps += 1;

    // Incremental mean update: Q_n+1 = Q_n + (1/n)(r - Q_n)
    const oldValue = this.values[action];
    this.values[action] = oldValue + (1 / this.counts[action]) * (reward - oldValue);

    this.lastReward = reward;
    this.rewardHistory.push(reward);
    this.cumulativeSum += reward;
    this.cumulativeRewards.push(this.cumulativeSum);

    return {
      qValues: [...this.values],
      oldQValues: (() => {
        const old = [...this.values];
        old[action] = oldValue;
        return old;
      })(),
    };
  }

  getVisualizationData(): VisualizationData {
    return {
      type: 'bandit',
      data: {
        values: [...this.values],
        counts: [...this.counts],
        totalSteps: this.totalSteps,
        lastAction: this.lastAction,
        lastReward: this.lastReward,
        rewardHistory: [...this.rewardHistory],
        cumulativeRewards: [...this.cumulativeRewards],
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'strategy',
        label: 'Strategy',
        value: this.strategy,
        min: 0,
        max: 1,
        step: 1,
        description: '0 = Epsilon-Greedy, 1 = UCB',
      },
      {
        key: 'epsilon',
        label: 'Epsilon (\u03B5)',
        value: this.epsilon,
        min: 0.01,
        max: 1.0,
        step: 0.01,
        description: 'Chance of exploring a random chest',
      },
      {
        key: 'ucbC',
        label: 'UCB Exploration (c)',
        value: this.ucbC,
        min: 0.1,
        max: 5.0,
        step: 0.1,
        description: 'How much to favor uncertain chests',
      },
      {
        key: 'numArms',
        label: 'Number of Chests',
        value: this.numArms,
        min: 3,
        max: 10,
        step: 1,
        description: 'How many treasure chests to choose from',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'strategy':
        this.strategy = value;
        break;
      case 'epsilon':
        this.epsilon = value;
        break;
      case 'ucbC':
        this.ucbC = value;
        break;
      case 'numArms':
        if (value !== this.numArms) {
          this.numArms = value;
          this.reset();
        }
        break;
    }
  }

  serialize(): string {
    return JSON.stringify({
      values: this.values,
      counts: this.counts,
      totalSteps: this.totalSteps,
      lastAction: this.lastAction,
      lastReward: this.lastReward,
      rewardHistory: this.rewardHistory,
      cumulativeRewards: this.cumulativeRewards,
      cumulativeSum: this.cumulativeSum,
      strategy: this.strategy,
      epsilon: this.epsilon,
      ucbC: this.ucbC,
      numArms: this.numArms,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data) as {
      values: number[];
      counts: number[];
      totalSteps: number;
      lastAction: number;
      lastReward: number;
      rewardHistory: number[];
      cumulativeRewards: number[];
      cumulativeSum: number;
      strategy: number;
      epsilon: number;
      ucbC: number;
      numArms: number;
      rngState: number;
    };
    this.values = parsed.values;
    this.counts = parsed.counts;
    this.totalSteps = parsed.totalSteps;
    this.lastAction = parsed.lastAction;
    this.lastReward = parsed.lastReward;
    this.rewardHistory = parsed.rewardHistory;
    this.cumulativeRewards = parsed.cumulativeRewards;
    this.cumulativeSum = parsed.cumulativeSum;
    this.strategy = parsed.strategy;
    this.epsilon = parsed.epsilon;
    this.ucbC = parsed.ucbC;
    this.numArms = parsed.numArms;
    this.rng.setState(parsed.rngState);
  }
}

/*
 * ── i18n KEYS NEEDED ──
 * (No new keys needed — this is a pure algorithm file with no UI text.)
 */
