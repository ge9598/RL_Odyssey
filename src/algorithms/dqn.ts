/**
 * DQN (Deep Q-Network) — Q-Learning with a Neural Network.
 *
 * Key components:
 * - SimpleNN as Q-function approximator
 * - Experience Replay buffer (circular)
 * - Target Network (periodic hard update)
 * - Epsilon-greedy exploration with decay
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

interface DQNExperience {
  state: number[];
  action: number;
  reward: number;
  nextState: number[];
  done: boolean;
}

export class DQN implements RLAlgorithm<number[], number> {
  name = 'DQN';

  private qNetwork: SimpleNN;
  private targetNetwork: SimpleNN;
  private replayBuffer: DQNExperience[] = [];
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

  private stateSize: number;
  private actionSize: number;
  private hiddenSize: number;

  constructor(
    stateSize: number,
    actionSize: number,
    hiddenSize = 32,
    seed = 42,
  ) {
    this.stateSize = stateSize;
    this.actionSize = actionSize;
    this.hiddenSize = hiddenSize;
    this.rng = new SeededRandom(seed);

    this.qNetwork = new SimpleNN([stateSize, hiddenSize, actionSize], seed);
    this.targetNetwork = new SimpleNN(
      [stateSize, hiddenSize, actionSize],
      seed + 1,
    );
    this.targetNetwork.copyFrom(this.qNetwork);
  }

  reset(): void {
    const seed = this.rng.nextInt(0, 100000);
    this.qNetwork = new SimpleNN(
      [this.stateSize, this.hiddenSize, this.actionSize],
      seed,
    );
    this.targetNetwork = new SimpleNN(
      [this.stateSize, this.hiddenSize, this.actionSize],
      seed + 1,
    );
    this.targetNetwork.copyFrom(this.qNetwork);

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
  }

  /** Select action using epsilon-greedy policy */
  step(state: number[]): { action: number; metadata: StepMetadata } {
    const qValues = this.qNetwork.predict(state);
    this.lastQValues = qValues;

    let action: number;
    if (this.rng.next() < this.epsilon) {
      action = this.rng.nextInt(0, this.actionSize - 1);
    } else {
      action = argmax(qValues);
    }

    return {
      action,
      metadata: {
        reward: 0,
        done: false,
        info: { qValues, epsilon: this.epsilon },
      },
    };
  }

  /** Store experience and train on a batch from replay buffer */
  update(experience: Experience<number[], number>): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;

    // Track rewards
    this.rewardHistory.push(reward);
    this.currentEpisodeReward += reward;
    const cumulative =
      this.cumulativeRewards.length > 0
        ? this.cumulativeRewards[this.cumulativeRewards.length - 1] + reward
        : reward;
    this.cumulativeRewards.push(cumulative);

    if (done) {
      this.episodeRewards.push(this.currentEpisodeReward);
      this.currentEpisodeReward = 0;
    }

    // Store in replay buffer (circular)
    const exp: DQNExperience = { state, action, reward, nextState, done };
    if (this.replayBuffer.length < this.replayBufferSize) {
      this.replayBuffer.push(exp);
    } else {
      this.replayBuffer[this.bufferIndex] = exp;
    }
    this.bufferIndex = (this.bufferIndex + 1) % this.replayBufferSize;

    this.stepCount++;

    // Only train when we have enough samples
    if (this.replayBuffer.length < this.batchSize) {
      return { loss: 0, qValues: this.lastQValues };
    }

    // Sample random batch
    const batch = this.sampleBatch();

    // Compute targets
    const inputs: number[][] = [];
    const targets: number[][] = [];

    for (const sample of batch) {
      const currentQ = this.qNetwork.predict(sample.state);
      const targetQ = [...currentQ];

      if (sample.done) {
        targetQ[sample.action] = sample.reward;
      } else {
        const nextQ = this.targetNetwork.predict(sample.nextState);
        const maxNextQ = Math.max(...nextQ);
        targetQ[sample.action] =
          sample.reward + this.discountFactor * maxNextQ;
      }

      inputs.push(sample.state);
      targets.push(targetQ);
    }

    // Train
    this.lastLoss = this.qNetwork.trainBatch(
      inputs,
      targets,
      this.learningRate,
    );

    // Update target network periodically
    if (this.stepCount % this.targetUpdateFreq === 0) {
      this.targetNetwork.copyFrom(this.qNetwork);
    }

    // Decay epsilon
    this.epsilon = Math.max(
      this.epsilonMin,
      this.epsilon * this.epsilonDecay,
    );

    return {
      loss: this.lastLoss,
      qValues: this.lastQValues,
      tdError: this.lastLoss,
    };
  }

  private sampleBatch(): DQNExperience[] {
    const batch: DQNExperience[] = [];
    const len = this.replayBuffer.length;
    for (let i = 0; i < this.batchSize; i++) {
      const idx = this.rng.nextInt(0, len - 1);
      batch.push(this.replayBuffer[idx]);
    }
    return batch;
  }

  /** Get a random sample from replay buffer for visualization */
  getReplaySample(count = 5): DQNExperience[] {
    const sample: DQNExperience[] = [];
    const len = this.replayBuffer.length;
    if (len === 0) return sample;
    for (let i = 0; i < Math.min(count, len); i++) {
      const idx = this.rng.nextInt(0, len - 1);
      sample.push(this.replayBuffer[idx]);
    }
    return sample;
  }

  /** Get Q-values for a given state without side effects */
  getQValues(state: number[]): number[] {
    return this.qNetwork.predict(state);
  }

  getVisualizationData(): VisualizationData {
    return {
      type: 'dqn',
      data: {
        qValues: this.lastQValues,
        replayBufferSize: this.replayBuffer.length,
        epsilon: this.epsilon,
        loss: this.lastLoss,
        rewardHistory: this.rewardHistory,
        cumulativeRewards: this.cumulativeRewards,
        episodeRewards: this.episodeRewards,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate',
        label: 'Learning Rate',
        value: this.learningRate,
        min: 0.001,
        max: 0.01,
        step: 0.001,
        description: 'How fast the network learns from each batch',
      },
      {
        key: 'discountFactor',
        label: 'Discount Factor',
        value: this.discountFactor,
        min: 0.5,
        max: 1.0,
        step: 0.01,
        description: 'How much the agent cares about future rewards',
      },
      {
        key: 'epsilon',
        label: 'Epsilon (Exploration)',
        value: this.epsilon,
        min: 0,
        max: 1.0,
        step: 0.01,
        description: 'Chance of picking a random action to explore',
      },
      {
        key: 'epsilonDecay',
        label: 'Epsilon Decay',
        value: this.epsilonDecay,
        min: 0.99,
        max: 1.0,
        step: 0.001,
        description: 'How quickly exploration decreases',
      },
      {
        key: 'batchSize',
        label: 'Batch Size',
        value: this.batchSize,
        min: 8,
        max: 64,
        step: 8,
        description: 'Number of memories to study at once',
      },
      {
        key: 'replayBufferSize',
        label: 'Replay Buffer Size',
        value: this.replayBufferSize,
        min: 100,
        max: 5000,
        step: 100,
        description: 'How many memories to keep in the notebook',
      },
      {
        key: 'targetUpdateFreq',
        label: 'Target Update Freq',
        value: this.targetUpdateFreq,
        min: 5,
        max: 100,
        step: 5,
        description: 'How often the stable teacher copies the student',
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
      case 'epsilonDecay':
        this.epsilonDecay = value;
        break;
      case 'batchSize':
        this.batchSize = Math.round(value);
        break;
      case 'replayBufferSize':
        this.replayBufferSize = Math.round(value);
        break;
      case 'targetUpdateFreq':
        this.targetUpdateFreq = Math.round(value);
        break;
    }
  }

  serialize(): string {
    return JSON.stringify({
      qNetwork: this.qNetwork.serialize(),
      targetNetwork: this.targetNetwork.serialize(),
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
      cumulativeRewards: this.cumulativeRewards,
      episodeRewards: this.episodeRewards,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const obj = JSON.parse(data);
    this.qNetwork = SimpleNN.deserialize(obj.qNetwork);
    this.targetNetwork = SimpleNN.deserialize(obj.targetNetwork);
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
    this.cumulativeRewards = obj.cumulativeRewards ?? [];
    this.episodeRewards = obj.episodeRewards ?? [];
    this.rng.setState(obj.rngState);
  }
}
