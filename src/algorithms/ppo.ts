/**
 * PPO — Proximal Policy Optimization (Schulman et al., 2017).
 *
 * PPO is one of the most widely used deep RL algorithms. It extends
 * policy gradient methods by preventing updates from being "too large",
 * which stabilizes training.
 *
 * The core innovation: the "clipped surrogate objective".
 *
 * Standard policy gradient would update:
 *   logProbs[s][a] += α * A  (where A = advantage)
 *
 * This can cause large, destabilizing updates. PPO instead computes:
 *   ratio = π(a|s) / π_old(a|s) = exp(logProbs[s][a] - oldLogProbs[s][a])
 *
 * And clips the ratio so it can't stray too far from 1:
 *   ratio_clipped = clamp(ratio, 1 - ε, 1 + ε)
 *   L_PPO = min(ratio * A, ratio_clipped * A)
 *
 * The update is then:
 *   logProbs[s][a] += actorLR * L_PPO
 *
 * The min() ensures that:
 *   - If A > 0 (good action): don't increase the action's probability too much.
 *   - If A < 0 (bad action): don't decrease it too much either.
 *
 * This acts like a "learning speed limit" — improve the policy, but not
 * so aggressively that you destroy what you've already learned.
 *
 * Episode-based (like REINFORCE, not online like Actor-Critic):
 *   1. Collect a full episode into episodeBuffer.
 *   2. At episode end (endEpisode()), compute Monte Carlo returns G[t].
 *   3. Compute advantages A[t] = G[t] - V(s[t]).
 *   4. Snapshot old policy: oldLogProbs = copy(logProbs).
 *   5. For numEpochs epochs, iterate over the buffer and apply clipped updates.
 *   6. Track clipping statistics for visualization.
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
interface PPOTransition {
  state: number;
  action: number;
  reward: number;
  /** log π_current(a|s) at the time of the step (before any endEpisode update). */
  logProbOld: number;
  /** V(s) at the time of the step, used for advantage estimation. */
  value: number;
}

export class PPOAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'PPO';

  private rng: SeededRandom;
  private numStates: number;
  private numActions: number;

  /** Current Actor: log-probabilities logProbs[state][action] */
  private logProbs: number[][];

  /**
   * Old policy snapshot: taken at the start of each endEpisode() call.
   * Used to compute the probability ratio for clipping.
   */
  private oldLogProbs: number[][];

  /** Critic: state-value estimates V[state] */
  private V: number[];

  /** Episode buffer — filled by update(), consumed by endEpisode(). */
  private episodeBuffer: PPOTransition[];

  /** Total reward per completed episode. */
  private rewardHistory: number[];
  private lastEpisodeReturn: number;

  private totalSteps: number;
  private episodeCount: number;

  /** Clipping stats from the most recent endEpisode() call. */
  private lastClipCount: number;
  private lastTotalCount: number;

  /** Recent policy ratios (last 20), for visualization. */
  private ratioHistory: number[];

  /** Recent advantage values (last 20), for visualization. */
  private advantageHistory: number[];

  // Hyperparameters
  private actorLR: number;
  private criticLR: number;
  private discountFactor: number;
  private clipEpsilon: number;  // ε — the clipping boundary
  private numEpochs: number;    // how many times to reuse collected experience

  constructor(numStates: number, numActions = 4, seed = 47) {
    this.rng = new SeededRandom(seed);
    this.numStates = numStates;
    this.numActions = numActions;
    this.actorLR = 0.01;
    this.criticLR = 0.05;
    this.discountFactor = 0.99;
    this.clipEpsilon = 0.2;
    this.numEpochs = 3;
    this.logProbs = [];
    this.oldLogProbs = [];
    this.V = [];
    this.episodeBuffer = [];
    this.rewardHistory = [];
    this.lastEpisodeReturn = 0;
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.lastClipCount = 0;
    this.lastTotalCount = 0;
    this.ratioHistory = [];
    this.advantageHistory = [];
    this.reset();
  }

  reset(): void {
    this.logProbs = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.oldLogProbs = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.V = new Array(this.numStates).fill(0);
    this.episodeBuffer = [];
    this.rewardHistory = [];
    this.lastEpisodeReturn = 0;
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.lastClipCount = 0;
    this.lastTotalCount = 0;
    this.ratioHistory = [];
    this.advantageHistory = [];
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
          stateValue: this.V[state],
        },
      },
    };
  }

  /**
   * Push experience into the episode buffer.
   * Records the log-prob of the taken action AT THIS MOMENT (the "old" log-prob
   * for the clipping ratio computed later in endEpisode).
   * Actual learning happens in endEpisode(), not here.
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { state, action, reward, done } = experience;

    // Record the log-prob of the chosen action under the CURRENT policy.
    // This becomes the "old" log-prob when we compute the ratio in endEpisode().
    const logProbOld = this.logProbs[state][action];
    const value = this.V[state];

    this.episodeBuffer.push({ state, action, reward, logProbOld, value });
    this.totalSteps += 1;

    if (done) {
      this.endEpisode();
    }

    return {};
  }

  /** Reset episode-level state. Call before each episode begins. */
  startEpisode(): void {
    this.episodeBuffer = [];
  }

  /**
   * PPO training loop — called automatically when update() receives done=true.
   *
   * Steps:
   *   1. Compute Monte Carlo returns G[t] backwards from end of episode.
   *   2. Compute advantage estimates A[t] = G[t] - V(s[t]).
   *   3. Snapshot the current policy as oldLogProbs.
   *   4. For numEpochs epochs, iterate the buffer and apply clipped updates:
   *        ratio     = exp(logProbs[s][a] - oldLogProbs[s][a])
   *        clipped   = clamp(ratio, 1-ε, 1+ε)
   *        L_PPO     = min(ratio * A, clipped * A)
   *        logProbs[s][a] += actorLR * L_PPO
   *        V[s]           += criticLR * (G - V[s])
   *   5. Track clipping statistics.
   */
  endEpisode(): void {
    const T = this.episodeBuffer.length;
    if (T === 0) return;

    // ── Step 1: Monte Carlo returns ──────────────────────────────────────────
    const returns = new Array(T).fill(0);
    returns[T - 1] = this.episodeBuffer[T - 1].reward;
    for (let t = T - 2; t >= 0; t--) {
      returns[t] = this.episodeBuffer[t].reward + this.discountFactor * returns[t + 1];
    }

    this.lastEpisodeReturn = returns[0];

    // ── Step 2: Advantage estimates ──────────────────────────────────────────
    // A[t] = G[t] - V(s[t])  (using the value at the time of the step)
    const advantages = returns.map((G, t) => G - this.episodeBuffer[t].value);

    // ── Step 3: Snapshot old policy ──────────────────────────────────────────
    for (let s = 0; s < this.numStates; s++) {
      for (let a = 0; a < this.numActions; a++) {
        this.oldLogProbs[s][a] = this.logProbs[s][a];
      }
    }

    // ── Step 4: Multi-epoch clipped policy update ────────────────────────────
    let totalClipped = 0;
    let totalUpdates = 0;

    for (let epoch = 0; epoch < this.numEpochs; epoch++) {
      for (let t = 0; t < T; t++) {
        const { state, action } = this.episodeBuffer[t];
        const G = returns[t];
        const A = advantages[t];

        // Probability ratio between current and old policy
        //   ratio = π(a|s) / π_old(a|s)
        //         = exp(logProbs[s][a]) / exp(oldLogProbs[s][a])
        //         = exp(logProbs[s][a] - oldLogProbs[s][a])
        const logRatio = this.logProbs[state][action] - this.oldLogProbs[state][action];
        const ratio = Math.exp(logRatio);

        // Clipped ratio stays within [1-ε, 1+ε]
        const ratioClipped = clamp(ratio, 1 - this.clipEpsilon, 1 + this.clipEpsilon);

        // PPO objective: take the pessimistic (min) of clipped and unclipped
        const ppoObjective = Math.min(ratio * A, ratioClipped * A);

        // Track whether clipping activated
        const isClipped = ratio !== ratioClipped;
        if (isClipped) totalClipped++;
        totalUpdates++;

        // Only record ratio/advantage history on the last epoch to avoid noise
        if (epoch === this.numEpochs - 1) {
          this.ratioHistory.push(ratio);
          if (this.ratioHistory.length > 20) this.ratioHistory.shift();

          this.advantageHistory.push(A);
          if (this.advantageHistory.length > 20) this.advantageHistory.shift();
        }

        // Actor update: gradient step in the direction of the PPO objective
        this.logProbs[state][action] += this.actorLR * ppoObjective;

        // Clamp log-probs to prevent numerical overflow
        for (let a = 0; a < this.numActions; a++) {
          this.logProbs[state][a] = clamp(this.logProbs[state][a], -10, 10);
        }

        // Critic update: minimize (G - V(s))²  →  V(s) += criticLR * (G - V(s))
        // Note: we use the CURRENT V(s), not the snapshot, so V improves across epochs.
        this.V[state] += this.criticLR * (G - this.V[state]);
      }
    }

    // ── Step 5: Record clipping stats ────────────────────────────────────────
    this.lastClipCount = totalClipped;
    this.lastTotalCount = totalUpdates;

    this.rewardHistory.push(this.lastEpisodeReturn);
    if (this.rewardHistory.length > 200) {
      this.rewardHistory.shift();
    }

    this.episodeCount += 1;
    this.episodeBuffer = [];
  }

  /**
   * Returns clipping statistics from the most recent endEpisode() call.
   * clipFraction = clipped / total gives an intuition for how constrained
   * the policy updates were. High fraction = policy wanted to change a lot.
   */
  getClipStats(): { total: number; clipped: number } {
    return { total: this.lastTotalCount, clipped: this.lastClipCount };
  }

  getVisualizationData(): VisualizationData {
    const probs = this.logProbs.map((lp) => softmax(lp));
    const oldProbs = this.oldLogProbs.map((lp) => softmax(lp));

    return {
      type: 'ppo',
      data: {
        logProbs: this.logProbs.map((row) => [...row]),
        probs,
        values: [...this.V],
        oldProbs,
        rewardHistory: [...this.rewardHistory],
        episodeCount: this.episodeCount,
        totalSteps: this.totalSteps,
        lastClipCount: this.lastClipCount,
        lastTotalCount: this.lastTotalCount,
        ratioHistory: [...this.ratioHistory],
        advantageHistory: [...this.advantageHistory],
        clipEpsilon: this.clipEpsilon,
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
        max: 0.2,
        step: 0.001,
        description: 'How fast the Actor (policy) learns each epoch',
      },
      {
        key: 'criticLR',
        label: 'Critic Learning Rate',
        value: this.criticLR,
        min: 0.001,
        max: 0.2,
        step: 0.001,
        description: 'How fast the Critic (value estimate) learns each epoch',
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
        key: 'clipEpsilon',
        label: 'Clip Epsilon (ε)',
        value: this.clipEpsilon,
        min: 0.05,
        max: 0.5,
        step: 0.05,
        description: 'The clipping boundary — how much the policy can change per update',
      },
      {
        key: 'numEpochs',
        label: 'Update Epochs',
        value: this.numEpochs,
        min: 1,
        max: 10,
        step: 1,
        description: 'How many times to reuse collected experience',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'actorLR':         this.actorLR = value;         break;
      case 'criticLR':        this.criticLR = value;        break;
      case 'discountFactor':  this.discountFactor = value;  break;
      case 'clipEpsilon':     this.clipEpsilon = value;     break;
      case 'numEpochs':       this.numEpochs = Math.round(value); break;
    }
  }

  serialize(): string {
    return JSON.stringify({
      logProbs: this.logProbs,
      oldLogProbs: this.oldLogProbs,
      V: this.V,
      episodeBuffer: this.episodeBuffer,
      rewardHistory: this.rewardHistory,
      lastEpisodeReturn: this.lastEpisodeReturn,
      totalSteps: this.totalSteps,
      episodeCount: this.episodeCount,
      lastClipCount: this.lastClipCount,
      lastTotalCount: this.lastTotalCount,
      ratioHistory: this.ratioHistory,
      advantageHistory: this.advantageHistory,
      numStates: this.numStates,
      numActions: this.numActions,
      actorLR: this.actorLR,
      criticLR: this.criticLR,
      discountFactor: this.discountFactor,
      clipEpsilon: this.clipEpsilon,
      numEpochs: this.numEpochs,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const p = JSON.parse(data);
    this.logProbs = p.logProbs;
    this.oldLogProbs = p.oldLogProbs;
    this.V = p.V;
    this.episodeBuffer = p.episodeBuffer;
    this.rewardHistory = p.rewardHistory;
    this.lastEpisodeReturn = p.lastEpisodeReturn;
    this.totalSteps = p.totalSteps;
    this.episodeCount = p.episodeCount;
    this.lastClipCount = p.lastClipCount;
    this.lastTotalCount = p.lastTotalCount;
    this.ratioHistory = p.ratioHistory;
    this.advantageHistory = p.advantageHistory;
    this.numStates = p.numStates;
    this.numActions = p.numActions;
    this.actorLR = p.actorLR;
    this.criticLR = p.criticLR;
    this.discountFactor = p.discountFactor;
    this.clipEpsilon = p.clipEpsilon;
    this.numEpochs = p.numEpochs;
    this.rng.setState(p.rngState);
  }
}
