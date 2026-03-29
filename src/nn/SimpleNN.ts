/**
 * SimpleNN — A hand-coded tiny neural network for educational RL.
 *
 * Supports:
 * - Arbitrary layer sizes (e.g. [5, 32, 3] for Breakout DQN)
 * - ReLU hidden layers, linear output
 * - Xavier initialization with SeededRandom
 * - Forward pass, backpropagation, SGD weight updates
 * - Batch training, serialization, weight copying, soft updates
 *
 * ~200 lines of TypeScript. No external ML libraries.
 */

import { SeededRandom } from '@/utils/seededRandom';
import { relu, reluDerivative } from './layers';

export class SimpleNN {
  /** weights[layerIdx][inputIdx][outputIdx] */
  private weights: number[][][];
  /** biases[layerIdx][outputIdx] */
  private biases: number[][];
  private layerSizes: number[];

  // Stored during forward pass for backprop
  private preActivations: number[][] = [];
  private activations: number[][] = [];

  // Accumulated gradients
  private weightGrads: number[][][] = [];
  private biasGrads: number[][] = [];

  constructor(layerSizes: number[], seed = 42) {
    this.layerSizes = [...layerSizes];
    this.weights = [];
    this.biases = [];

    const rng = new SeededRandom(seed);

    // Xavier initialization: scale = sqrt(2 / (fanIn + fanOut))
    for (let l = 0; l < layerSizes.length - 1; l++) {
      const fanIn = layerSizes[l];
      const fanOut = layerSizes[l + 1];
      const scale = Math.sqrt(2 / (fanIn + fanOut));

      const layerWeights: number[][] = [];
      for (let i = 0; i < fanIn; i++) {
        const row: number[] = [];
        for (let j = 0; j < fanOut; j++) {
          row.push(rng.nextGaussian(0, scale));
        }
        layerWeights.push(row);
      }
      this.weights.push(layerWeights);
      this.biases.push(new Array(fanOut).fill(0));
    }

    this.initGrads();
  }

  private initGrads(): void {
    this.weightGrads = [];
    this.biasGrads = [];
    for (let l = 0; l < this.weights.length; l++) {
      const fanIn = this.layerSizes[l];
      const fanOut = this.layerSizes[l + 1];
      const wg: number[][] = [];
      for (let i = 0; i < fanIn; i++) {
        wg.push(new Array(fanOut).fill(0));
      }
      this.weightGrads.push(wg);
      this.biasGrads.push(new Array(fanOut).fill(0));
    }
  }

  /** Forward pass — returns output layer activations */
  forward(input: number[]): number[] {
    this.preActivations = [];
    this.activations = [input];

    let current = input;

    for (let l = 0; l < this.weights.length; l++) {
      const w = this.weights[l];
      const b = this.biases[l];
      const fanOut = this.layerSizes[l + 1];
      const isOutput = l === this.weights.length - 1;

      const pre: number[] = new Array(fanOut);
      const act: number[] = new Array(fanOut);

      for (let j = 0; j < fanOut; j++) {
        let sum = b[j];
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * w[i][j];
        }
        pre[j] = sum;
        // ReLU for hidden layers, linear for output
        act[j] = isOutput ? sum : relu(sum);
      }

      this.preActivations.push(pre);
      this.activations.push(act);
      current = act;
    }

    return current;
  }

  /** Backpropagation — computes gradients from MSE loss given target */
  backward(target: number[]): void {
    const numLayers = this.weights.length;
    const output = this.activations[numLayers];

    // Output layer error: dL/da = 2*(a - target) / n  (MSE gradient)
    const n = target.length;
    let delta: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      // For linear output: dL/dpre = dL/da * da/dpre = 2*(a-t)/n * 1
      delta[j] = (2 * (output[j] - target[j])) / n;
    }

    // Backprop through layers in reverse
    for (let l = numLayers - 1; l >= 0; l--) {
      const input = this.activations[l];
      const fanOut = this.layerSizes[l + 1];

      // Accumulate gradients
      for (let j = 0; j < fanOut; j++) {
        this.biasGrads[l][j] += delta[j];
        for (let i = 0; i < input.length; i++) {
          this.weightGrads[l][i][j] += delta[j] * input[i];
        }
      }

      // Propagate delta to previous layer (skip if first layer)
      if (l > 0) {
        const fanIn = this.layerSizes[l];
        const newDelta: number[] = new Array(fanIn).fill(0);
        for (let i = 0; i < fanIn; i++) {
          let sum = 0;
          for (let j = 0; j < fanOut; j++) {
            sum += delta[j] * this.weights[l][i][j];
          }
          // Apply ReLU derivative for hidden layers
          newDelta[i] = sum * reluDerivative(this.preActivations[l - 1][i]);
        }
        delta = newDelta;
      }
    }
  }

  /** Apply accumulated gradients with learning rate, then zero grads */
  updateWeights(lr: number): void {
    for (let l = 0; l < this.weights.length; l++) {
      const fanIn = this.layerSizes[l];
      const fanOut = this.layerSizes[l + 1];
      for (let j = 0; j < fanOut; j++) {
        this.biases[l][j] -= lr * this.biasGrads[l][j];
        for (let i = 0; i < fanIn; i++) {
          this.weights[l][i][j] -= lr * this.weightGrads[l][i][j];
        }
      }
    }
    this.initGrads();
  }

  /** Train on a single sample. Returns MSE loss. */
  trainStep(input: number[], target: number[], lr: number): number {
    const output = this.forward(input);
    this.backward(target);
    this.updateWeights(lr);

    // Compute MSE loss
    let loss = 0;
    for (let i = 0; i < target.length; i++) {
      loss += (output[i] - target[i]) ** 2;
    }
    return loss / target.length;
  }

  /** Train on a batch. Returns average loss. */
  trainBatch(inputs: number[][], targets: number[][], lr: number): number {
    const batchSize = inputs.length;
    if (batchSize === 0) return 0;

    let totalLoss = 0;

    // Accumulate gradients across batch
    for (let b = 0; b < batchSize; b++) {
      const output = this.forward(inputs[b]);
      this.backward(targets[b]);

      // Compute loss
      let loss = 0;
      for (let i = 0; i < targets[b].length; i++) {
        loss += (output[i] - targets[b][i]) ** 2;
      }
      totalLoss += loss / targets[b].length;
    }

    // Average gradients
    for (let l = 0; l < this.weights.length; l++) {
      const fanIn = this.layerSizes[l];
      const fanOut = this.layerSizes[l + 1];
      for (let j = 0; j < fanOut; j++) {
        this.biasGrads[l][j] /= batchSize;
        for (let i = 0; i < fanIn; i++) {
          this.weightGrads[l][i][j] /= batchSize;
        }
      }
    }

    this.updateWeights(lr);
    return totalLoss / batchSize;
  }

  /** Predict without storing activations (no side effects) */
  predict(input: number[]): number[] {
    let current = input;
    for (let l = 0; l < this.weights.length; l++) {
      const w = this.weights[l];
      const b = this.biases[l];
      const fanOut = this.layerSizes[l + 1];
      const isOutput = l === this.weights.length - 1;
      const next: number[] = new Array(fanOut);
      for (let j = 0; j < fanOut; j++) {
        let sum = b[j];
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * w[i][j];
        }
        next[j] = isOutput ? sum : relu(sum);
      }
      current = next;
    }
    return current;
  }

  /** Serialize to JSON string */
  serialize(): string {
    return JSON.stringify({
      layerSizes: this.layerSizes,
      weights: this.weights,
      biases: this.biases,
    });
  }

  /** Deserialize from JSON string */
  static deserialize(data: string): SimpleNN {
    const obj = JSON.parse(data);
    const nn = new SimpleNN(obj.layerSizes, 0);
    nn.weights = obj.weights;
    nn.biases = obj.biases;
    return nn;
  }

  /** Copy all weights from another network (hard update) */
  copyFrom(other: SimpleNN): void {
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          this.weights[l][i][j] = other.weights[l][i][j];
        }
      }
      for (let j = 0; j < this.biases[l].length; j++) {
        this.biases[l][j] = other.biases[l][j];
      }
    }
  }

  /** Soft update: this = tau * other + (1 - tau) * this */
  softUpdate(other: SimpleNN, tau: number): void {
    for (let l = 0; l < this.weights.length; l++) {
      for (let i = 0; i < this.weights[l].length; i++) {
        for (let j = 0; j < this.weights[l][i].length; j++) {
          this.weights[l][i][j] =
            tau * other.weights[l][i][j] + (1 - tau) * this.weights[l][i][j];
        }
      }
      for (let j = 0; j < this.biases[l].length; j++) {
        this.biases[l][j] =
          tau * other.biases[l][j] + (1 - tau) * this.biases[l][j];
      }
    }
  }

  /** Get layer sizes for display */
  getLayerSizes(): number[] {
    return [...this.layerSizes];
  }
}
