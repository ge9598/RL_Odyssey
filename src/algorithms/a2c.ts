/**
 * A2C — Advantage Actor-Critic (synchronous variant of A3C).
 *
 * A2C extends Actor-Critic by running multiple independent "workers"
 * (parallel environments) that all share the same policy and value
 * function. Each worker collects experience independently, computes
 * its own TD error, and updates the shared parameters.
 *
 * In production A3C (Mnih et al., 2016), workers run on separate CPU
 * threads and update asynchronously. A2C (Mnih et al., 2016 OpenAI
 * variant) synchronizes workers — all workers step, then all update
 * before stepping again.
 *
 * In this browser implementation, "parallelism" is simulated — workers
 * are logical entities that each call step()/update(), and we track
 * per-worker statistics for visualization. The math is identical to
 * Actor-Critic; what changes is the visualization and the notion of
 * multiple independent experiences flowing into the same parameters.
 *
 * Shared parameters:
 *   Actor:  logProbs[state][action]  (same π for all workers)
 *   Critic: V[state]                 (same V for all workers)
 *
 * Per-worker state (for visualization only):
 *   workerEpisodeRewards[workerIdx][episodeIdx]
 *   workerEpisodeCounts[workerIdx]
 *
 * Update rule (identical to Actor-Critic):
 *   δ = r + γ * V(s') - V(s)
 *   V(s)           += criticLR * δ
 *   logProbs[s][a] += actorLR * δ
 *
 * Why multiple workers help:
 *   - Decorrelated experience: different workers are at different parts
 *     of the environment at the same time, reducing temporal correlation
 *     in updates (analogous to experience replay in DQN, but without replay).
 *   - More updates per wall-clock second when truly parallel.
 *   - Better gradient estimates (averaging across workers reduces variance).
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

export class A2CAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'A2C';

  private rng: SeededRandom;
  private numStates: number;
  private numActions: number;
  readonly numWorkers: number;

  /** Shared Actor: log-probabilities logProbs[state][action] */
  private logProbs: number[][];

  /** Shared Critic: state-value estimates V[state] */
  private V: number[];

  /** Rolling history of TD errors (last 50), for visualization. */
  private tdErrorHistory: number[];
  private lastTdError: number;

  /**
   * Per-worker episode reward tracking.
   * workerEpisodeRewards[w] = array of total reward per completed episode for worker w.
   */
  private workerEpisodeRewards: number[][];

  /** How many episodes each worker has completed. */
  private workerEpisodeCounts: number[];

  /** Current in-progress episode reward for each worker. */
  private workerCurrentReward: number[];

  private totalSteps: number;

  // Hyperparameters
  private actorLR: number;
  private criticLR: number;
  private discountFactor: number;

  constructor(numStates: number, numActions = 4, numWorkers = 4, seed = 44) {
    this.rng = new SeededRandom(seed);
    this.numStates = numStates;
    this.numActions = numActions;
    this.numWorkers = numWorkers;
    this.actorLR = 0.01;
    this.criticLR = 0.05;
    this.discountFactor = 0.95;
    this.logProbs = [];
    this.V = [];
    this.tdErrorHistory = [];
    this.lastTdError = 0;
    this.workerEpisodeRewards = [];
    this.workerEpisodeCounts = [];
    this.workerCurrentReward = [];
    this.totalSteps = 0;
    this.reset();
  }

  reset(): void {
    this.logProbs = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.V = new Array(this.numStates).fill(0);
    this.tdErrorHistory = [];
    this.lastTdError = 0;
    this.workerEpisodeRewards = Array.from({ length: this.numWorkers }, () => []);
    this.workerEpisodeCounts = new Array(this.numWorkers).fill(0);
    this.workerCurrentReward = new Array(this.numWorkers).fill(0);
    this.totalSteps = 0;
  }

  /**
   * Sample an action from the shared policy π(·|state).
   * All workers use the same policy — this is called once per worker per step.
   */
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
   * Update the shared policy and value function using worker 0's experience.
   * For multi-worker updates, prefer updateForWorker().
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    return this.updateForWorker(0, experience);
  }

  /**
   * Update shared parameters from a specific worker's experience.
   * Tracks per-worker reward history for visualization.
   *
   * TD error:  δ = r + γ*V(s') - V(s)
   * Critic:    V(s)           += criticLR * δ
   * Actor:     logProbs[s][a] += actorLR * δ
   */
  updateForWorker(
    workerId: number,
    experience: Experience<number, number>,
  ): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;

    // Guard: clamp workerId to valid range
    const wid = Math.max(0, Math.min(workerId, this.numWorkers - 1));

    // Compute TD error (advantage estimate)
    const vCurrent = this.V[state];
    const vNext = done ? 0 : this.V[nextState];
    const tdError = reward + this.discountFactor * vNext - vCurrent;

    // Update shared Critic
    this.V[state] += this.criticLR * tdError;

    // Update shared Actor
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
    this.workerCurrentReward[wid] += reward;

    if (done) {
      this.workerEpisodeRewards[wid].push(this.workerCurrentReward[wid]);
      // Keep only last 50 episodes per worker
      if (this.workerEpisodeRewards[wid].length > 50) {
        this.workerEpisodeRewards[wid].shift();
      }
      this.workerEpisodeCounts[wid] += 1;
      this.workerCurrentReward[wid] = 0;
    }

    return { tdError };
  }

  /** Reset episode tracking for a specific worker. Call at episode start. */
  startEpisode(): void {
    // Reset all workers' current episode reward
    this.workerCurrentReward.fill(0);
  }

  /** Reset episode tracking for a single worker. */
  startWorkerEpisode(workerId: number): void {
    const wid = Math.max(0, Math.min(workerId, this.numWorkers - 1));
    this.workerCurrentReward[wid] = 0;
  }

  /** Total episodes completed across all workers. */
  get totalEpisodes(): number {
    return this.workerEpisodeCounts.reduce((sum, c) => sum + c, 0);
  }

  getVisualizationData(): VisualizationData {
    const probs = this.logProbs.map((lp) => softmax(lp));

    // Last completed episode reward per worker (-Infinity if no episodes yet)
    const workerRecentRewards = this.workerEpisodeRewards.map((history) =>
      history.length > 0 ? history[history.length - 1] : 0,
    );

    return {
      type: 'a2c',
      data: {
        logProbs: this.logProbs.map((row) => [...row]),
        probs,
        values: [...this.V],
        tdErrors: [...this.tdErrorHistory],
        workerEpisodeCounts: [...this.workerEpisodeCounts],
        workerRecentRewards,
        totalEpisodes: this.totalEpisodes,
        totalSteps: this.totalSteps,
        numWorkers: this.numWorkers,
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
      {
        key: 'numWorkers',
        label: 'Number of Workers',
        value: this.numWorkers,
        min: 1,
        max: 8,
        step: 1,
        description: 'Number of parallel workers (visual only — actual parallelism is simulated)',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'actorLR':         this.actorLR = value;        break;
      case 'criticLR':        this.criticLR = value;       break;
      case 'discountFactor':  this.discountFactor = value; break;
      // numWorkers is read-only after construction — changing it would require
      // resizing per-worker arrays. Silently ignore for now.
    }
  }

  serialize(): string {
    return JSON.stringify({
      logProbs: this.logProbs,
      V: this.V,
      tdErrorHistory: this.tdErrorHistory,
      lastTdError: this.lastTdError,
      workerEpisodeRewards: this.workerEpisodeRewards,
      workerEpisodeCounts: this.workerEpisodeCounts,
      workerCurrentReward: this.workerCurrentReward,
      totalSteps: this.totalSteps,
      numStates: this.numStates,
      numActions: this.numActions,
      numWorkers: this.numWorkers,
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
    this.workerEpisodeRewards = p.workerEpisodeRewards;
    this.workerEpisodeCounts = p.workerEpisodeCounts;
    this.workerCurrentReward = p.workerCurrentReward;
    this.totalSteps = p.totalSteps;
    this.numStates = p.numStates;
    this.numActions = p.numActions;
    // numWorkers is readonly — only restore if it matches; otherwise leave as-is.
    this.actorLR = p.actorLR;
    this.criticLR = p.criticLR;
    this.discountFactor = p.discountFactor;
    this.rng.setState(p.rngState);
  }
}
