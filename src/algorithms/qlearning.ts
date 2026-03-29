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

// ─── Grid World Environment ─────────────────────────────────────────────────

export interface GridWorldConfig {
  rows: number;
  cols: number;
  walls: number[];
  traps: number[];
  treasures: number[];
  start: number;
  exit: number;
}

export interface GridStepResult {
  nextState: number;
  reward: number;
  done: boolean;
}

/**
 * A simple grid world environment.
 * Actions: 0=up, 1=right, 2=down, 3=left
 * State: flat index (row * cols + col)
 */
export class GridWorldEnvironment {
  readonly rows: number;
  readonly cols: number;
  readonly config: GridWorldConfig;
  private collectedTreasures: Set<number>;

  constructor(config: GridWorldConfig) {
    this.rows = config.rows;
    this.cols = config.cols;
    this.config = config;
    this.collectedTreasures = new Set();
  }

  /** Total number of cells in the grid. */
  get numStates(): number {
    return this.rows * this.cols;
  }

  /** Reset and return the start state. */
  reset(): number {
    this.collectedTreasures = new Set();
    return this.config.start;
  }

  /** Convert flat index to (row, col). */
  toRC(state: number): [number, number] {
    return [Math.floor(state / this.cols), state % this.cols];
  }

  /** Convert (row, col) to flat index. */
  toFlat(row: number, col: number): number {
    return row * this.cols + col;
  }

  /** Check if a flat index is a wall. */
  isWall(state: number): boolean {
    return this.config.walls.includes(state);
  }

  /** Take an action from a state. Returns { nextState, reward, done }. */
  step(state: number, action: number): GridStepResult {
    const [row, col] = this.toRC(state);

    // Direction deltas: up, right, down, left
    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];

    const newRow = row + dr[action];
    const newCol = col + dc[action];

    // Boundary check
    if (newRow < 0 || newRow >= this.rows || newCol < 0 || newCol >= this.cols) {
      return { nextState: state, reward: -0.3, done: false };
    }

    const newState = this.toFlat(newRow, newCol);

    // Wall check
    if (this.isWall(newState)) {
      return { nextState: state, reward: -0.3, done: false };
    }

    // Exit
    if (newState === this.config.exit) {
      return { nextState: newState, reward: 10, done: true };
    }

    // Trap
    if (this.config.traps.includes(newState)) {
      return { nextState: newState, reward: -5, done: false };
    }

    // Treasure (one-time pickup per episode)
    if (
      this.config.treasures.includes(newState) &&
      !this.collectedTreasures.has(newState)
    ) {
      this.collectedTreasures.add(newState);
      return { nextState: newState, reward: 5, done: false };
    }

    // Normal step
    return { nextState: newState, reward: -0.1, done: false };
  }

  /**
   * Compute the shortest possible path length from start to exit
   * using BFS, ignoring traps/treasures but respecting walls.
   * Returns Infinity if no path exists.
   */
  optimalPathLength(): number {
    const visited = new Set<number>();
    const queue: Array<[number, number]> = [[this.config.start, 0]];
    visited.add(this.config.start);
    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];

    while (queue.length > 0) {
      const [current, dist] = queue.shift()!;
      if (current === this.config.exit) return dist;

      const [r, c] = this.toRC(current);
      for (let a = 0; a < 4; a++) {
        const nr = r + dr[a];
        const nc = c + dc[a];
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
        const ns = this.toFlat(nr, nc);
        if (visited.has(ns) || this.isWall(ns)) continue;
        visited.add(ns);
        queue.push([ns, dist + 1]);
      }
    }

    return Infinity;
  }
}

// ─── Q-Learning Algorithm ───────────────────────────────────────────────────

/**
 * Tabular Q-Learning agent.
 * State = number (flat grid index), Action = number (0-3).
 */
export class QLearningAlgorithm implements RLAlgorithm<number, number> {
  readonly name = 'Q-Learning';

  private rng: SeededRandom;
  private qTable: number[][];
  private visitCounts: number[];
  private numStates: number;
  private numActions: number;
  private totalSteps: number;
  private episodeCount: number;
  private lastAction: number;
  private lastReward: number;
  private rewardHistory: number[];
  private episodeRewards: number[];
  private currentEpisodeReward: number;

  // Hyperparameters
  private learningRate: number;
  private discountFactor: number;
  private epsilon: number;

  constructor(numStates: number, numActions = 4, seed = 42) {
    this.rng = new SeededRandom(seed);
    this.numStates = numStates;
    this.numActions = numActions;
    this.learningRate = 0.1;
    this.discountFactor = 0.95;
    this.epsilon = 0.15;
    this.qTable = [];
    this.visitCounts = [];
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.lastAction = -1;
    this.lastReward = 0;
    this.rewardHistory = [];
    this.episodeRewards = [];
    this.currentEpisodeReward = 0;
    this.reset();
  }

  reset(): void {
    this.qTable = Array.from({ length: this.numStates }, () =>
      new Array(this.numActions).fill(0),
    );
    this.visitCounts = new Array(this.numStates).fill(0);
    this.totalSteps = 0;
    this.episodeCount = 0;
    this.lastAction = -1;
    this.lastReward = 0;
    this.rewardHistory = [];
    this.episodeRewards = [];
    this.currentEpisodeReward = 0;
  }

  /**
   * Epsilon-greedy action selection.
   */
  step(state: number): { action: number; metadata: StepMetadata } {
    let action: number;

    if (this.rng.chance(this.epsilon)) {
      // Explore: pick a random action
      action = this.rng.nextInt(0, this.numActions - 1);
    } else {
      // Exploit: pick the best known action
      action = argmax(this.qTable[state]);
    }

    this.lastAction = action;
    this.visitCounts[state] += 1;

    return {
      action,
      metadata: {
        reward: 0,
        done: false,
        info: {
          explored: this.rng.next() < this.epsilon,
          state,
          qValues: [...this.qTable[state]],
        },
      },
    };
  }

  /**
   * Q-Learning update: Q(s,a) += lr * (r + gamma * max_a' Q(s',a') - Q(s,a))
   */
  update(experience: Experience<number, number>): UpdateMetadata {
    const { state, action, reward, nextState, done } = experience;

    const oldQ = this.qTable[state][action];

    // Target: r + gamma * max Q(s', a') — or just r if terminal
    const maxNextQ = done ? 0 : Math.max(...this.qTable[nextState]);
    const target = reward + this.discountFactor * maxNextQ;
    const tdError = target - oldQ;

    // Update Q-value
    this.qTable[state][action] = oldQ + this.learningRate * tdError;

    this.lastReward = reward;
    this.totalSteps += 1;
    this.currentEpisodeReward += reward;
    this.rewardHistory.push(reward);

    if (done) {
      this.episodeRewards.push(this.currentEpisodeReward);
      this.episodeCount += 1;
      this.currentEpisodeReward = 0;
    }

    return {
      qValues: [...this.qTable[state]],
      oldQValues: (() => {
        const old = [...this.qTable[state]];
        old[action] = oldQ;
        return old;
      })(),
      tdError,
    };
  }

  /** Start a new episode (reset episode reward tracker). */
  startEpisode(): void {
    this.currentEpisodeReward = 0;
  }

  getVisualizationData(): VisualizationData {
    // Compute max Q-value per state (state values)
    const stateValues = this.qTable.map((actions) => Math.max(...actions));

    return {
      type: 'qtable',
      data: {
        qTable: this.qTable.map((row) => [...row]),
        stateValues,
        visitCounts: [...this.visitCounts],
        totalSteps: this.totalSteps,
        episodeCount: this.episodeCount,
        lastAction: this.lastAction,
        lastReward: this.lastReward,
        rewardHistory: [...this.rewardHistory],
        episodeRewards: [...this.episodeRewards],
        currentEpisodeReward: this.currentEpisodeReward,
      },
    };
  }

  getHyperparameters(): HyperParameter[] {
    return [
      {
        key: 'learningRate',
        label: 'Learning Rate (alpha)',
        value: this.learningRate,
        min: 0.01,
        max: 1.0,
        step: 0.01,
        description: 'How fast the agent updates its knowledge',
      },
      {
        key: 'discountFactor',
        label: 'Discount Factor (gamma)',
        value: this.discountFactor,
        min: 0,
        max: 1.0,
        step: 0.01,
        description: 'How much future rewards matter vs immediate rewards',
      },
      {
        key: 'epsilon',
        label: 'Epsilon (exploration)',
        value: this.epsilon,
        min: 0,
        max: 1.0,
        step: 0.01,
        description: 'Chance of exploring a random direction',
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
    }
  }

  /** Get the greedy (best) action for a given state. */
  getBestAction(state: number): number {
    return argmax(this.qTable[state]);
  }

  /** Extract the greedy path from a given start state, max maxLen steps. */
  getGreedyPath(startState: number, env: GridWorldEnvironment, maxLen = 100): number[] {
    const path = [startState];
    let state = startState;
    const visited = new Set<number>();
    visited.add(state);

    for (let i = 0; i < maxLen; i++) {
      const action = this.getBestAction(state);
      const { nextState, done } = env.step(state, action);
      path.push(nextState);
      if (done || visited.has(nextState)) break;
      visited.add(nextState);
      state = nextState;
    }

    return path;
  }

  serialize(): string {
    return JSON.stringify({
      qTable: this.qTable,
      visitCounts: this.visitCounts,
      numStates: this.numStates,
      numActions: this.numActions,
      totalSteps: this.totalSteps,
      episodeCount: this.episodeCount,
      lastAction: this.lastAction,
      lastReward: this.lastReward,
      rewardHistory: this.rewardHistory,
      episodeRewards: this.episodeRewards,
      currentEpisodeReward: this.currentEpisodeReward,
      learningRate: this.learningRate,
      discountFactor: this.discountFactor,
      epsilon: this.epsilon,
      rngState: this.rng.getState(),
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data) as {
      qTable: number[][];
      visitCounts: number[];
      numStates: number;
      numActions: number;
      totalSteps: number;
      episodeCount: number;
      lastAction: number;
      lastReward: number;
      rewardHistory: number[];
      episodeRewards: number[];
      currentEpisodeReward: number;
      learningRate: number;
      discountFactor: number;
      epsilon: number;
      rngState: number;
    };
    this.qTable = parsed.qTable;
    this.visitCounts = parsed.visitCounts;
    this.numStates = parsed.numStates;
    this.numActions = parsed.numActions;
    this.totalSteps = parsed.totalSteps;
    this.episodeCount = parsed.episodeCount;
    this.lastAction = parsed.lastAction;
    this.lastReward = parsed.lastReward;
    this.rewardHistory = parsed.rewardHistory;
    this.episodeRewards = parsed.episodeRewards;
    this.currentEpisodeReward = parsed.currentEpisodeReward;
    this.learningRate = parsed.learningRate;
    this.discountFactor = parsed.discountFactor;
    this.epsilon = parsed.epsilon;
    this.rng.setState(parsed.rngState);
  }
}

/*
 * -- i18n KEYS NEEDED --
 * (No new keys needed -- this is a pure algorithm file with no UI text.)
 */
