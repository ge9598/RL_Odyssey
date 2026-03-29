/**
 * Actor-Critic — Online Policy Gradient with TD Baseline.
 *
 * Combines the strengths of REINFORCE (policy gradient) and TD learning
 * (value estimation) into a single algorithm that updates at EVERY STEP,
 * not at the end of an episode.
 *
 * Two components:
 *   - Actor:  Policy π(a|s), parameterized as logProbs[s][a] (tabular).
 *             Decides what action to take.
 *   - Critic: State-value function V(s), parameterized as V[s] (tabular).
 *             Evaluates how good the current state is.
 *
 * The Critic produces a TD error (δ), which tells the Actor whether
 * its action was better or worse than expected:
 *
 *   δ = r + γ * V(s') - V(s)     (non-terminal step)
 *   δ = r - V(s)                  (terminal step)
 *
 * Updates (applied every step):
 *   Critic: V(s) += criticLR * δ
 *   Actor:  logProbs[s][a] += actorLR * δ
 *
 * Key insight: δ acts as a "natural" baseline — if δ > 0, the action
 * led to a better-than-expected outcome, so make it more likely. If
 * δ < 0, the action underperformed, so make it less likely.
 *
 * Advantage over REINFORCE:
 *   - Online updates = faster learning, no need to wait for episode end.
 *   - Lower variance because the Critic provides a per-step baseline.
 *
 * Disadvantage:
 *   - Slight bias due to TD bootstrapping (V(s') may be inaccurate early on).
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

export class ActorCriticAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'Actor-Critic';

  private rng: SeededRandom;
  private numStates: number;
  private numActions: number;

  /** Actor: log-probabilities logProbs[state][action] */
  private logProbs: number[][];

  /** Critic: state-value estimates V[state] */
  private V: number[];

  /** Rolling history of TD errors (last 50), for visualization. */
  private tdErrorHistory: number[];
  private lastTdError: number;

  /** Per-episode total reward history. */
  private rewardHistory: number[];
  private currentEpisodeReward: number;

  private totalSteps: number;
  private episodeCount: number;

  // Hyperparameters
  private actorLR: number;   // α — Actor learning rate
  private criticLR: number;  // β — Critic learning rate
  private discountFactor: number; // γ

  constructor(numStates: number, numActions = 4, seed = 46) {
    this.rng = new SeededRandom(seed);
    this.numStates = numStates;
    this.numActions = numActions;
    this.actorLR = 0.01;
    this.criticLR = 0.05;
    this.discountFactor = 0.95;
    this.logProbs = [];
    this.V = [];
    this.tdErrorHistory = [];
    this.lastTdError = 0;
    this.rewardHistory = [];
    this.currentEpisodeReward = 0;
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.reset();
  }

  reset(): void {
    // Uniform initial policy, zero value estimates
    this.logProbs = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.V = new Array(this.numStates).fill(0);
    this.tdErrorHistory = [];
    this.lastTdError = 0;
    this.rewardHistory = [];
    this.currentEpisodeReward = 0;
    this.totalSteps = 0;
    this.episodeCount = 0;
  }

  /** Sample action from current policy π(·|state). */
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
          stateValue: this.V[state],
        },
      },
    };
  }

  /**
   * Immediate TD update — Actor-Critic learns every step, not episodically.
   *
   * TD error:  δ = r + γ*V(s') - V(s)    (or δ = r - V(s) if done)
   * Critic:    V(s)       += criticLR * δ
   * Actor:     logProbs[s][a] += actorLR * δ
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;

    // Compute TD error (δ)
    const vCurrent = this.V[state];
    const vNext = done ? 0 : this.V[nextState];
    const tdError = reward + this.discountFactor * vNext - vCurrent;

    // Critic update: move V(s) towards the TD target
    this.V[state] += this.criticLR * tdError;

    // Actor update: nudge the log-prob of the taken action by δ
    this.logProbs[state][action] += this.actorLR * tdError;

    // Clamp log-probs to prevent numerical overflow
    for (let a = 0; a < this.numActions; a++) {
      this.logProbs[state][a] = clamp(this.logProbs[state][a], -10, 10);
    }

    // Bookkeeping
    this.lastTdError = tdError;
    this.tdErrorHistory.push(tdError);
    if (this.tdErrorHistory.length > 50) {
      this.tdErrorHistory.shift();
    }

    this.totalSteps += 1;
    this.currentEpisodeReward += reward;

    if (done) {
      this.rewardHistory.push(this.currentEpisodeReward);
      if (this.rewardHistory.length > 200) {
        this.rewardHistory.shift();
      }
      this.episodeCount += 1;
      this.currentEpisodeReward = 0;
    }

    return {
      tdError,
      qValues: [...this.logProbs[state]],
    };
  }

  /** Reset episode-level tracking. Call before each episode begins. */
  startEpisode(): void {
    this.currentEpisodeReward = 0;
  }

  /** Expose the raw value table for external use (e.g., quest evaluation). */
  getValues(): number[] {
    return [...this.V];
  }

  getVisualizationData(): VisualizationData {
    const probs = this.logProbs.map((lp) => softmax(lp));
    return {
      type: 'actor-critic',
      data: {
        logProbs: this.logProbs.map((row) => [...row]),
        probs,
        values: [...this.V],
        tdErrors: [...this.tdErrorHistory],
        rewardHistory: [...this.rewardHistory],
        episodeCount: this.episodeCount,
        totalSteps: this.totalSteps,
        lastTdError: this.lastTdError,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'actorLR',
        label: 'Actor Learning Rate',
        value: this.actorLR,
        min: 0.001,
        max: 0.3,
        step: 0.001,
        description: 'How fast the Actor (policy) learns',
      },
      {
        key: 'criticLR',
        label: 'Critic Learning Rate',
        value: this.criticLR,
        min: 0.001,
        max: 0.3,
        step: 0.001,
        description: 'How fast the Critic (value estimate) learns',
      },
      {
        key: 'discountFactor',
        label: 'Discount Factor (γ)',
        value: this.discountFactor,
        min: 0.5,
        max: 1.0,
        step: 0.01,
        description: 'Discount for future rewards',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'actorLR':         this.actorLR = value;         break;
      case 'criticLR':        this.criticLR = value;        break;
      case 'discountFactor':  this.discountFactor = value;  break;
    }
  }

  serialize(): string {
    return JSON.stringify({
      logProbs: this.logProbs,
      V: this.V,
      tdErrorHistory: this.tdErrorHistory,
      lastTdError: this.lastTdError,
      rewardHistory: this.rewardHistory,
      currentEpisodeReward: this.currentEpisodeReward,
      totalSteps: this.totalSteps,
      episodeCount: this.episodeCount,
      numStates: this.numStates,
      numActions: this.numActions,
      actorLR: this.actorLR,
      criticLR: this.criticLR,
      discountFactor: this.discountFactor,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const p = JSON.parse(data);
    this.logProbs = p.logProbs;
    this.V = p.V;
    this.tdErrorHistory = p.tdErrorHistory;
    this.lastTdError = p.lastTdError;
    this.rewardHistory = p.rewardHistory;
    this.currentEpisodeReward = p.currentEpisodeReward;
    this.totalSteps = p.totalSteps;
    this.episodeCount = p.episodeCount;
    this.numStates = p.numStates;
    this.numActions = p.numActions;
    this.actorLR = p.actorLR;
    this.criticLR = p.criticLR;
    this.discountFactor = p.discountFactor;
    this.rng.setState(p.rngState);
  }
}
