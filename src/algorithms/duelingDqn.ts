/**
 * Dueling DQN (Dueling Deep Q-Network)
 *
 * Key idea: Split the Q-value estimation into two separate components:
 *   Q(s, a) = V(s) + A(s, a) - mean(A(s, a'))
 *
 *   V(s)    = State Value   — "How good is this state in general?"
 *   A(s, a) = Advantage     — "How much better is action a compared to average?"
 *
 * Educational implementation:
 * - Uses TWO separate SimpleNN networks: valueNet and advantageNet
 * - Combines them: Q(s,a) = V(s) + A(s,a) - mean_a(A(s,a'))
 * - Visualization shows V(s) and A(s,a) separately for each state
 *
 * Benefit: In states where all actions are equally good/bad, the value stream
 * V(s) can learn faster without needing to distinguish between actions.
 * Analogy: Separating "How good is this restaurant area?" (V) from
 * "How much better is the sushi place vs the burger place?" (A)
 */

import { SimpleNN } from '@/nn/SimpleNN';
import { SeededRandom } from '@/utils/seededRandom';
import { argmax } from '@/utils/math';
import type {
  RLAlgorithm,
  StepMetadata,
  UpdateMetadata,
  Experience,
  HyperParameter,
  VisualizationData,
} from '@/types/algorithm';

interface ReplayExp {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

export class DuelingDQN implements RLAlgorithm<number[], number> {
  name = 'Dueling DQN';

  // Two networks: one for state value V(s), one for advantage A(s,a)
  private valueNet: SimpleNN;      // outputs: [1] — the scalar V(s)
  private advantageNet: SimpleNN;  // outputs: [actionSize] — A(s,a) per action
  // Combined target network pair
  private targetValueNet: SimpleNN;
  private targetAdvantageNet: SimpleNN;

  private replayBuffer: ReplayExp[] = [];
  private bufferIndex = 0;
  private rng: SeededRandom;

  // Hyperparameters
  private learningRate = 0.005;
  private discountFactor = 0.99;
  private epsilon = 1.0;
  private epsilonDecay = 0.995;
  private epsilonMin = 0.05;
  private batchSize = 16;
  private replayBufferSize = 2000;
  private targetUpdateFreq = 50;

  // Tracking
  private stepCount = 0;
  private lastLoss = 0;
  private rewardHistory: number[] = [];
  private cumulativeRewards: number[] = [];
  private episodeRewards: number[] = [];
  private currentEpisodeReward = 0;
  private lastQValues: number[] = [];
  private lastStateValue = 0;
  private lastAdvantages: number[] = [];

  // For visualization: per-state decomposition
  private stateValueHistory: number[] = [];

  private stateSize: number;
  private actionSize: number;
  private hiddenSize: number;

  constructor(stateSize: number, actionSize: number, hiddenSize = 32, seed = 45) {
    this.stateSize = stateSize;
    this.actionSize = actionSize;
    this.hiddenSize = hiddenSize;
    this.rng = new SeededRandom(seed);

    this.valueNet = new SimpleNN([stateSize, hiddenSize, 1], seed);
    this.advantageNet = new SimpleNN([stateSize, hiddenSize, actionSize], seed + 2);
    this.targetValueNet = new SimpleNN([stateSize, hiddenSize, 1], seed + 1);
    this.targetAdvantageNet = new SimpleNN([stateSize, hiddenSize, actionSize], seed + 3);
    this.targetValueNet.copyFrom(this.valueNet);
    this.targetAdvantageNet.copyFrom(this.advantageNet);
  }

  reset(): void {
    const seed = this.rng.nextInt(0, 100000);
    this.valueNet = new SimpleNN([this.stateSize, this.hiddenSize, 1], seed);
    this.advantageNet = new SimpleNN([this.stateSize, this.hiddenSize, this.actionSize], seed + 2);
    this.targetValueNet = new SimpleNN([this.stateSize, this.hiddenSize, 1], seed + 1);
    this.targetAdvantageNet = new SimpleNN([this.stateSize, this.hiddenSize, this.actionSize], seed + 3);
    this.targetValueNet.copyFrom(this.valueNet);
    this.targetAdvantageNet.copyFrom(this.advantageNet);

    this.replayBuffer = [];
    this.bufferIndex = 0;
    this.stepCount = 0;
    this.lastLoss = 0;
    this.epsilon = 1.0;
    this.rewardHistory = [];
    this.cumulativeRewards = [];
    this.episodeRewards = [];
    this.currentEpisodeReward = 0;
    this.lastQValues = [];
    this.lastStateValue = 0;
    this.lastAdvantages = [];
    this.stateValueHistory = [];
  }

  /** Compute Q(s,a) = V(s) + A(s,a) - mean_a(A(s,a')) */
  private computeQ(state: number[], useTarget = false): {
    qValues: number[];
    stateValue: number;
    advantages: number[];
  } {
    const vNet = useTarget ? this.targetValueNet : this.valueNet;
    const aNet = useTarget ? this.targetAdvantageNet : this.advantageNet;

    const stateValue = vNet.predict(state)[0];
    const advantages = aNet.predict(state);
    const meanAdv = advantages.reduce((s, v) => s + v, 0) / advantages.length;
    const qValues = advantages.map((adv) => stateValue + adv - meanAdv);

    return { qValues, stateValue, advantages };
  }

  step(state: number[]): { action: number; metadata: StepMetadata } {
    const { qValues, stateValue, advantages } = this.computeQ(state);
    this.lastQValues = qValues;
    this.lastStateValue = stateValue;
    this.lastAdvantages = advantages;

    const action = this.rng.next() < this.epsilon
      ? this.rng.nextInt(0, this.actionSize - 1)
      : argmax(qValues);

    return {
      action,
      metadata: {
        reward: 0,
        done: false,
        info: { qValues, stateValue, advantages, epsilon: this.epsilon },
      },
    };
  }

  update(experience: Experience<number[], number>): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;

    this.rewardHistory.push(reward);
    this.currentEpisodeReward += reward;
    const cumulative = this.cumulativeRewards.length > 0
      ? this.cumulativeRewards[this.cumulativeRewards.length - 1] + reward
      : reward;
    this.cumulativeRewards.push(cumulative);
    this.stateValueHistory.push(this.lastStateValue);
    if (this.stateValueHistory.length > 500) this.stateValueHistory = this.stateValueHistory.slice(-200);

    if (done) {
      this.episodeRewards.push(this.currentEpisodeReward);
      this.currentEpisodeReward = 0;
    }

    const exp: ReplayExp = { state, action, reward, nextState, done };
    if (this.replayBuffer.length < this.replayBufferSize) {
      this.replayBuffer.push(exp);
    } else {
      this.replayBuffer[this.bufferIndex] = exp;
    }
    this.bufferIndex = (this.bufferIndex + 1) % this.replayBufferSize;
    this.stepCount++;

    if (this.replayBuffer.length < this.batchSize) {
      return { loss: 0, qValues: this.lastQValues };
    }

    const batch = this.sampleBatch();
    const valueInputs: number[][] = [];
    const valueTargets: number[][] = [];
    const advInputs: number[][] = [];
    const advTargets: number[][] = [];

    for (const sample of batch) {
      const { qValues: currentQ, stateValue: sv, advantages: adv } = this.computeQ(sample.state);
      const targetQValues = [...currentQ];

      if (sample.done) {
        targetQValues[sample.action] = sample.reward;
      } else {
        // Double DQN style: online selects, target evaluates
        const { qValues: onlineNextQ } = this.computeQ(sample.nextState, false);
        const { qValues: targetNextQ } = this.computeQ(sample.nextState, true);
        const bestAction = argmax(onlineNextQ);
        targetQValues[sample.action] = sample.reward + this.discountFactor * targetNextQ[bestAction];
      }

      // Recompute V and A targets from Q targets
      const targetV = targetQValues.reduce((s, v) => s + v, 0) / this.actionSize;
      const targetA = targetQValues.map((q) => q - targetV);

      // Current residuals for loss computation
      const currentV = sv;
      const currentA = adv;

      // We train value net to predict mean Q, advantage net to predict Q - mean(Q)
      valueInputs.push(sample.state);
      valueTargets.push([targetV + (currentV - sv) * 0.0]); // target for V
      advInputs.push(sample.state);
      const advTarget = currentA.map((a, i) =>
        a + (targetA[i] - a) // gradient step toward target advantage
      );
      advTargets.push(advTarget);

      void targetV; void targetA; void currentA;
    }

    // Train both networks
    const vLoss = this.valueNet.trainBatch(valueInputs, valueTargets, this.learningRate);
    const aLoss = this.advantageNet.trainBatch(advInputs, advTargets, this.learningRate);
    this.lastLoss = (vLoss + aLoss) / 2;

    if (this.stepCount % this.targetUpdateFreq === 0) {
      this.targetValueNet.copyFrom(this.valueNet);
      this.targetAdvantageNet.copyFrom(this.advantageNet);
    }

    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

    return { loss: this.lastLoss, qValues: this.lastQValues };
  }

  private sampleBatch(): ReplayExp[] {
    const batch: ReplayExp[] = [];
    const len = this.replayBuffer.length;
    for (let i = 0; i < this.batchSize; i++) {
      batch.push(this.replayBuffer[this.rng.nextInt(0, len - 1)]);
    }
    return batch;
  }

  getQValues(state: number[]): number[] {
    return this.computeQ(state).qValues;
  }

  getDecomposition(state: number[]): { qValues: number[]; stateValue: number; advantages: number[] } {
    return this.computeQ(state);
  }

  getVisualizationData(): VisualizationData {
    return {
      type: 'dueling-dqn',
      data: {
        qValues: this.lastQValues,
        stateValue: this.lastStateValue,
        advantages: this.lastAdvantages,
        replayBufferSize: this.replayBuffer.length,
        epsilon: this.epsilon,
        loss: this.lastLoss,
        rewardHistory: this.rewardHistory,
        cumulativeRewards: this.cumulativeRewards,
        episodeRewards: this.episodeRewards,
        stateValueHistory: [...this.stateValueHistory],
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate', label: 'Learning Rate', value: this.learningRate,
        min: 0.001, max: 0.01, step: 0.001, description: 'How fast both networks learn',
      },
      {
        key: 'discountFactor', label: 'Discount Factor', value: this.discountFactor,
        min: 0.5, max: 1.0, step: 0.01, description: 'How much future rewards matter',
      },
      {
        key: 'epsilon', label: 'Epsilon', value: this.epsilon,
        min: 0, max: 1.0, step: 0.01, description: 'Exploration rate',
      },
      {
        key: 'batchSize', label: 'Batch Size', value: this.batchSize,
        min: 8, max: 64, step: 8, description: 'Memories studied per update',
      },
      {
        key: 'targetUpdateFreq', label: 'Target Update Freq', value: this.targetUpdateFreq,
        min: 5, max: 100, step: 5, description: 'How often the stable teacher is copied',
      },
    ];
  }

  setHyperparameter(key: string, value: number): void {
    switch (key) {
      case 'learningRate': this.learningRate = value; break;
      case 'discountFactor': this.discountFactor = value; break;
      case 'epsilon': this.epsilon = value; break;
      case 'epsilonDecay': this.epsilonDecay = value; break;
      case 'batchSize': this.batchSize = Math.round(value); break;
      case 'replayBufferSize': this.replayBufferSize = Math.round(value); break;
      case 'targetUpdateFreq': this.targetUpdateFreq = Math.round(value); break;
    }
  }

  serialize(): string {
    return JSON.stringify({
      valueNet: this.valueNet.serialize(),
      advantageNet: this.advantageNet.serialize(),
      targetValueNet: this.targetValueNet.serialize(),
      targetAdvantageNet: this.targetAdvantageNet.serialize(),
      replayBuffer: this.replayBuffer,
      bufferIndex: this.bufferIndex,
      stepCount: this.stepCount,
      lastLoss: this.lastLoss,
      epsilon: this.epsilon,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      epsilonDecay: this.epsilonDecay,
      epsilonMin: this.epsilonMin,
      batchSize: this.batchSize,
      replayBufferSize: this.replayBufferSize,
      targetUpdateFreq: this.targetUpdateFreq,
      rewardHistory: this.rewardHistory,
      episodeRewards: this.episodeRewards,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const obj = JSON.parse(data);
    this.valueNet = SimpleNN.deserialize(obj.valueNet);
    this.advantageNet = SimpleNN.deserialize(obj.advantageNet);
    this.targetValueNet = SimpleNN.deserialize(obj.targetValueNet);
    this.targetAdvantageNet = SimpleNN.deserialize(obj.targetAdvantageNet);
    this.replayBuffer = obj.replayBuffer;
    this.bufferIndex = obj.bufferIndex;
    this.stepCount = obj.stepCount;
    this.lastLoss = obj.lastLoss;
    this.epsilon = obj.epsilon;
    this.learningRate = obj.learningRate;
    this.discountFactor = obj.discountFactor;
    this.epsilonDecay = obj.epsilonDecay;
    this.epsilonMin = obj.epsilonMin;
    this.batchSize = obj.batchSize;
    this.replayBufferSize = obj.replayBufferSize;
    this.targetUpdateFreq = obj.targetUpdateFreq;
    this.rewardHistory = obj.rewardHistory ?? [];
    this.episodeRewards = obj.episodeRewards ?? [];
    this.rng.setState(obj.rngState);
  }
}
