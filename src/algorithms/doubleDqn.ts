/**
 * Double DQN (Double Deep Q-Network)
 *
 * Key difference from standard DQN:
 *   DQN target:        r + γ * max_a Q_target(s', a)
 *   Double DQN target: r + γ * Q_target(s', argmax_a Q_online(s', a))
 *
 * Why it matters: DQN tends to overestimate Q-values because it picks the max
 * of noisy estimates. Double DQN decouples action *selection* (online network)
 * from action *evaluation* (target network), reducing overestimation bias.
 *
 * Analogy: Instead of asking "what's the highest grade any student got?" and
 * letting that same student grade their own work, Double DQN asks "which
 * student does the class think did best?" and then uses a different teacher
 * to grade that student's actual work.
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

export class DoubleDQN implements RLAlgorithm<number[], number> {
  name = 'Double DQN';

  private onlineNet: SimpleNN;
  private targetNet: SimpleNN;
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

  // For overestimation tracking (educational visualization)
  private dqnTargets: number[] = [];    // what standard DQN would compute
  private doubleDqnTargets: number[] = []; // what Double DQN computes
  private overestimationHistory: number[] = []; // difference

  private stateSize: number;
  private actionSize: number;
  private hiddenSize: number;

  constructor(stateSize: number, actionSize: number, hiddenSize = 32, seed = 44) {
    this.stateSize = stateSize;
    this.actionSize = actionSize;
    this.hiddenSize = hiddenSize;
    this.rng = new SeededRandom(seed);

    this.onlineNet = new SimpleNN([stateSize, hiddenSize, actionSize], seed);
    this.targetNet = new SimpleNN([stateSize, hiddenSize, actionSize], seed + 1);
    this.targetNet.copyFrom(this.onlineNet);
  }

  reset(): void {
    const seed = this.rng.nextInt(0, 100000);
    this.onlineNet = new SimpleNN([this.stateSize, this.hiddenSize, this.actionSize], seed);
    this.targetNet = new SimpleNN([this.stateSize, this.hiddenSize, this.actionSize], seed + 1);
    this.targetNet.copyFrom(this.onlineNet);

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
    this.dqnTargets = [];
    this.doubleDqnTargets = [];
    this.overestimationHistory = [];
  }

  step(state: number[]): { action: number; metadata: StepMetadata } {
    const qValues = this.onlineNet.predict(state);
    this.lastQValues = qValues;

    const action = this.rng.next() < this.epsilon
      ? this.rng.nextInt(0, this.actionSize - 1)
      : argmax(qValues);

    return {
      action,
      metadata: { reward: 0, done: false, info: { qValues, epsilon: this.epsilon } },
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

    if (done) {
      this.episodeRewards.push(this.currentEpisodeReward);
      this.currentEpisodeReward = 0;
    }

    // Store in replay buffer
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
    const inputs: number[][] = [];
    const targets: number[][] = [];

    let totalOverestimation = 0;

    for (const sample of batch) {
      const currentQ = this.onlineNet.predict(sample.state);
      const targetQ = [...currentQ];

      if (sample.done) {
        // Standard DQN would also use just reward — same here
        targetQ[sample.action] = sample.reward;
        this.dqnTargets.push(sample.reward);
        this.doubleDqnTargets.push(sample.reward);
      } else {
        // Standard DQN: use target network's max (tends to overestimate)
        const targetNextQ = this.targetNet.predict(sample.nextState);
        const dqnTarget = sample.reward + this.discountFactor * Math.max(...targetNextQ);

        // Double DQN: use online network to SELECT action, target network to EVALUATE
        const onlineNextQ = this.onlineNet.predict(sample.nextState);
        const bestNextAction = argmax(onlineNextQ);
        const doubleDqnTarget = sample.reward + this.discountFactor * targetNextQ[bestNextAction];

        targetQ[sample.action] = doubleDqnTarget;

        // Track overestimation difference for educational visualization
        totalOverestimation += dqnTarget - doubleDqnTarget;
        this.dqnTargets.push(dqnTarget);
        this.doubleDqnTargets.push(doubleDqnTarget);
      }

      inputs.push(sample.state);
      targets.push(targetQ);
    }

    this.overestimationHistory.push(totalOverestimation / batch.length);
    // Keep arrays bounded
    if (this.dqnTargets.length > 500) {
      this.dqnTargets = this.dqnTargets.slice(-200);
      this.doubleDqnTargets = this.doubleDqnTargets.slice(-200);
      this.overestimationHistory = this.overestimationHistory.slice(-200);
    }

    this.lastLoss = this.onlineNet.trainBatch(inputs, targets, this.learningRate);

    if (this.stepCount % this.targetUpdateFreq === 0) {
      this.targetNet.copyFrom(this.onlineNet);
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
    return this.onlineNet.predict(state);
  }

  getVisualizationData(): VisualizationData {
    return {
      type: 'double-dqn',
      data: {
        qValues: this.lastQValues,
        replayBufferSize: this.replayBuffer.length,
        epsilon: this.epsilon,
        loss: this.lastLoss,
        rewardHistory: this.rewardHistory,
        cumulativeRewards: this.cumulativeRewards,
        episodeRewards: this.episodeRewards,
        dqnTargets: [...this.dqnTargets],
        doubleDqnTargets: [...this.doubleDqnTargets],
        overestimationHistory: [...this.overestimationHistory],
        avgOverestimation: this.overestimationHistory.length > 0
          ? this.overestimationHistory.reduce((a, b) => a + b, 0) / this.overestimationHistory.length
          : 0,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate', label: 'Learning Rate', value: this.learningRate,
        min: 0.001, max: 0.01, step: 0.001, description: 'How fast the network learns',
      },
      {
        key: 'discountFactor', label: 'Discount Factor', value: this.discountFactor,
        min: 0.5, max: 1.0, step: 0.01, description: 'How much future rewards matter',
      },
      {
        key: 'epsilon', label: 'Epsilon (Exploration)', value: this.epsilon,
        min: 0, max: 1.0, step: 0.01, description: 'Chance of picking a random action',
      },
      {
        key: 'epsilonDecay', label: 'Epsilon Decay', value: this.epsilonDecay,
        min: 0.99, max: 1.0, step: 0.001, description: 'How quickly exploration decreases',
      },
      {
        key: 'batchSize', label: 'Batch Size', value: this.batchSize,
        min: 8, max: 64, step: 8, description: 'Number of memories to study at once',
      },
      {
        key: 'targetUpdateFreq', label: 'Target Update Freq', value: this.targetUpdateFreq,
        min: 5, max: 100, step: 5, description: 'How often the stable teacher is updated',
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
      onlineNet: this.onlineNet.serialize(),
      targetNet: this.targetNet.serialize(),
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
    this.onlineNet = SimpleNN.deserialize(obj.onlineNet);
    this.targetNet = SimpleNN.deserialize(obj.targetNet);
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
