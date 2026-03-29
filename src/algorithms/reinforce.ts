/**
 * REINFORCE — Vanilla Policy Gradient (Williams, 1992).
 *
 * Core idea: Directly parameterize a stochastic policy and update it using
 * the gradient of expected return. "If an action led to high return, make
 * that action more likely. If it led to low return, make it less likely."
 *
 * Policy parameterization: tabular log-probabilities logProbs[s][a].
 *   π(a|s) = softmax(logProbs[s])[a]
 *
 * Update rule (per episode step, applied at episode end):
 *   logProbs[s][a] += α * (G_t - baseline) * 1_{A_t = a}
 *
 * where G_t is the discounted Monte Carlo return from timestep t:
 *   G[T-1] = r[T-1]
 *   G[t]   = r[t] + γ * G[t+1]
 *
 * Baseline: a running average of returns, subtracted to reduce variance
 * without introducing bias (it doesn't depend on the action taken).
 *
 * Key difference from Q-Learning / Actor-Critic:
 *   - No value table. No TD updates.
 *   - Waits until the whole episode is done, then updates in bulk.
 *   - Naturally handles stochastic policies (can represent mixed strategies).
 *   - High variance due to Monte Carlo returns — baseline helps a lot.
 */

import { SeededRandom } from '@/utils/seededRandom';
import { softmax, sampleFromDistribution, clamp } from '@/utils/math';
import type {
  RLAlgorithm,
  Experience,
  StepMetadata,
  UpdateMetadata,
  HyperParameter,
  VisualizationData,
} from '@/types/algorithm';

/** A single timestep recorded during an episode. */
interface Transition {
  state: number;
  action: number;
  reward: number;
}

export class REINFORCEAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'REINFORCE';

  private rng: SeededRandom;
  private numStates: number;
  private numActions: number;

  /** Tabular log-probabilities: logProbs[state][action] */
  private logProbs: number[][];

  /** Episode buffer — filled by update(), consumed by endEpisode(). */
  private episodeBuffer: Transition[];

  /** Running baseline: exponential moving average of episode returns. */
  private baselineEma: number;

  /** History of total reward per completed episode. */
  private rewardHistory: number[];

  /** Last completed episode's total return. */
  private lastEpisodeReturn: number;

  private totalSteps: number;
  private episodeCount: number;

  // Hyperparameters
  private learningRate: number;  // α
  private discountFactor: number; // γ
  private baseline: number;       // strength of baseline subtraction [0,1]

  constructor(numStates: number, numActions = 4, seed = 45) {
    this.rng = new SeededRandom(seed);
    this.numStates = numStates;
    this.numActions = numActions;
    this.learningRate = 0.01;
    this.discountFactor = 0.99;
    this.baseline = 0.5;
    this.logProbs = [];
    this.episodeBuffer = [];
    this.baselineEma = 0;
    this.rewardHistory = [];
    this.lastEpisodeReturn = 0;
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.reset();
  }

  reset(): void {
    // Initialize log-probs to 0 → uniform policy (softmax of zeros = uniform)
    this.logProbs = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.episodeBuffer = [];
    this.baselineEma = 0;
    this.rewardHistory = [];
    this.lastEpisodeReturn = 0;
    this.totalSteps = 0;
    this.episodeCount = 0;
  }

  /** Sample an action from the current policy π(·|state). */
  step(state: number): { action: number; metadata: StepMetadata } {
    const probs = softmax(this.logProbs[state]);
    const action = sampleFromDistribution(probs, () => this.rng.next());

    return {
      action,
      metadata: {
        reward: 0,
        done: false,
        info: {
          state,
          probs,
          logProbs: [...this.logProbs[state]],
        },
      },
    };
  }

  /**
   * Push experience into the episode buffer.
   * REINFORCE does NOT update logProbs here — it waits until endEpisode().
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { state, action, reward, done } = experience;

    this.episodeBuffer.push({ state, action, reward });
    this.totalSteps += 1;

    if (done) {
      this.endEpisode();
    }

    return {};
  }

  /**
   * Signal the start of a new episode. Clears the buffer.
   * Should be called before the first step of every episode.
   */
  startEpisode(): void {
    this.episodeBuffer = [];
  }

  /**
   * Compute Monte Carlo returns and apply policy gradient updates.
   * Called automatically by update() when done=true, but can also be
   * called manually.
   *
   * Algorithm:
   *   1. Compute G[t] backwards from episode end.
   *   2. Subtract baseline from each G[t] to reduce variance.
   *   3. logProbs[s][a] += α * (G[t] - b)  for the action actually taken.
   *   4. Clamp log-probs to [-10, 10] to prevent numerical explosion.
   *   5. Update the baseline EMA with total episode return.
   */
  endEpisode(): void {
    const T = this.episodeBuffer.length;
    if (T === 0) return;

    // Step 1: Compute Monte Carlo returns G[t] = r[t] + γ*r[t+1] + γ²*r[t+2] + ...
    const returns = new Array(T).fill(0);
    returns[T - 1] = this.episodeBuffer[T - 1].reward;
    for (let t = T - 2; t >= 0; t--) {
      returns[t] = this.episodeBuffer[t].reward + this.discountFactor * returns[t + 1];
    }

    const episodeReturn = returns[0];
    this.lastEpisodeReturn = episodeReturn;

    // Step 2: Update baseline EMA (exponential moving average)
    // EMA update: b ← (1 - β) * b + β * G_episode
    const emaDecay = 0.1; // β for the EMA
    this.baselineEma = (1 - emaDecay) * this.baselineEma + emaDecay * episodeReturn;

    // Step 3 & 4: Policy gradient update
    for (let t = 0; t < T; t++) {
      const { state, action } = this.episodeBuffer[t];
      const G = returns[t];

      // Advantage estimate: G - baseline. `this.baseline` scales how aggressively
      // we subtract. 0 = no baseline (pure REINFORCE), 1 = full baseline subtraction.
      const advantage = G - this.baseline * this.baselineEma;

      // Increase log-prob of the taken action proportional to its advantage
      this.logProbs[state][action] += this.learningRate * advantage;

      // Clamp to prevent numerical explosion of log-probabilities
      for (let a = 0; a < this.numActions; a++) {
        this.logProbs[state][a] = clamp(this.logProbs[state][a], -10, 10);
      }
    }

    // Track reward history (keep last 200 episodes)
    this.rewardHistory.push(episodeReturn);
    if (this.rewardHistory.length > 200) {
      this.rewardHistory.shift();
    }

    this.episodeCount += 1;
    this.episodeBuffer = [];
  }

  /**
   * Compute average policy entropy across all states.
   * Entropy H(π(·|s)) = -Σ_a π(a|s) * log(π(a|s))
   * High entropy = uniform/exploratory; low entropy = deterministic.
   */
  private computeAverageEntropy(): number {
    let totalEntropy = 0;
    for (let s = 0; s < this.numStates; s++) {
      const probs = softmax(this.logProbs[s]);
      let h = 0;
      for (const p of probs) {
        if (p > 1e-9) h -= p * Math.log(p);
      }
      totalEntropy += h;
    }
    return totalEntropy / this.numStates;
  }

  getVisualizationData(): VisualizationData {
    const probs = this.logProbs.map((lp) => softmax(lp));
    return {
      type: 'policy',
      data: {
        logProbs: this.logProbs.map((row) => [...row]),
        probs,
        episodeBufferSize: this.episodeBuffer.length,
        rewardHistory: [...this.rewardHistory],
        episodeCount: this.episodeCount,
        totalSteps: this.totalSteps,
        entropy: this.computeAverageEntropy(),
        lastEpisodeReturn: this.lastEpisodeReturn,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate',
        label: 'Learning Rate (α)',
        value: this.learningRate,
        min: 0.001,
        max: 0.5,
        step: 0.001,
        description: 'How fast policy updates after each episode',
      },
      {
        key: 'discountFactor',
        label: 'Discount Factor (γ)',
        value: this.discountFactor,
        min: 0.5,
        max: 1.0,
        step: 0.01,
        description: 'How much future rewards count',
      },
      {
        key: 'baseline',
        label: 'Baseline Strength',
        value: this.baseline,
        min: 0.0,
        max: 1.0,
        step: 0.1,
        description: 'Baseline subtraction strength for variance reduction (0 = no baseline)',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'learningRate':    this.learningRate = value;    break;
      case 'discountFactor':  this.discountFactor = value;  break;
      case 'baseline':        this.baseline = value;        break;
    }
  }

  serialize(): string {
    return JSON.stringify({
      logProbs: this.logProbs,
      episodeBuffer: this.episodeBuffer,
      baselineEma: this.baselineEma,
      rewardHistory: this.rewardHistory,
      lastEpisodeReturn: this.lastEpisodeReturn,
      totalSteps: this.totalSteps,
      episodeCount: this.episodeCount,
      numStates: this.numStates,
      numActions: this.numActions,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      baseline: this.baseline,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const p = JSON.parse(data);
    this.logProbs = p.logProbs;
    this.episodeBuffer = p.episodeBuffer;
    this.baselineEma = p.baselineEma;
    this.rewardHistory = p.rewardHistory;
    this.lastEpisodeReturn = p.lastEpisodeReturn;
    this.totalSteps = p.totalSteps;
    this.episodeCount = p.episodeCount;
    this.numStates = p.numStates;
    this.numActions = p.numActions;
    this.learningRate = p.learningRate;
    this.discountFactor = p.discountFactor;
    this.baseline = p.baseline;
    this.rng.setState(p.rngState);
  }
}
