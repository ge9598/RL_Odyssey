/**
 * Activation functions and their derivatives for neural network layers.
 */

/** ReLU — Rectified Linear Unit */
export function relu(x: number): number {
  return x > 0 ? x : 0;
}

export function reluDerivative(x: number): number {
  return x > 0 ? 1 : 0;
}

/** Sigmoid — squashes to (0, 1) */
export function sigmoid(x: number): number {
  if (x > 500) return 1;
  if (x < -500) return 0;
  return 1 / (1 + Math.exp(-x));
}

export function sigmoidDerivative(x: number): number {
  const s = sigmoid(x);
  return s * (1 - s);
}

/** Tanh — squashes to (-1, 1). Underscore avoids collision with Math.tanh. */
export function tanh_(x: number): number {
  return Math.tanh(x);
}

export function tanhDerivative(x: number): number {
  const t = Math.tanh(x);
  return 1 - t * t;
}

/** Linear — identity, used for output layers */
export function linear(x: number): number {
  return x;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function linearDerivative(_x: number): number {
  return 1;
}

export type ActivationFn = (x: number) => number;

export interface ActivationPair {
  fn: ActivationFn;
  derivative: ActivationFn;
}

export const ACTIVATIONS: Record<string, ActivationPair> = {
  relu: { fn: relu, derivative: reluDerivative },
  sigmoid: { fn: sigmoid, derivative: sigmoidDerivative },
  tanh: { fn: tanh_, derivative: tanhDerivative },
  linear: { fn: linear, derivative: linearDerivative },
};
