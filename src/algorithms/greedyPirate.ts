/**
 * GreedyPirateAgent
 *
 * A simple heuristic agent that always moves toward the nearest visible reward.
 * Not a proper RL algorithm -- just a greedy baseline to demonstrate that
 * short-term greed is suboptimal on delayed-reward mazes.
 */

/** Directions: 0=up, 1=right, 2=down, 3=left */
const DIR_OFFSETS: Record<number, (cols: number) => number> = {
  0: (cols) => -cols, // up
  1: () => 1,         // right
  2: (cols) => cols,   // down
  3: () => -1,         // left
};

function manhattanDistance(a: number, b: number, cols: number): number {
  const ax = a % cols;
  const ay = Math.floor(a / cols);
  const bx = b % cols;
  const by = Math.floor(b / cols);
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function getValidActions(
  pos: number,
  cols: number,
  rows: number,
  walls: Set<number>,
): number[] {
  const valid: number[] = [];
  const x = pos % cols;
  const y = Math.floor(pos / cols);

  // up
  if (y > 0 && !walls.has(pos - cols)) valid.push(0);
  // right
  if (x < cols - 1 && !walls.has(pos + 1)) valid.push(1);
  // down
  if (y < rows - 1 && !walls.has(pos + cols)) valid.push(2);
  // left
  if (x > 0 && !walls.has(pos - 1)) valid.push(3);

  return valid;
}

export class GreedyPirateAgent {
  /**
   * Select the action that moves toward the nearest reward.
   * If no rewards remain, move toward the exit.
   */
  selectAction(
    pos: number,
    cols: number,
    rows: number,
    walls: number[],
    rewards: { pos: number; value: number }[],
    exit: number,
  ): number {
    const wallSet = new Set(walls);
    const validActions = getValidActions(pos, cols, rows, wallSet);

    if (validActions.length === 0) return 0; // stuck

    // Find the nearest positive reward
    const positiveRewards = rewards.filter((r) => r.value > 0);
    let target: number;

    if (positiveRewards.length > 0) {
      // Sort by distance, pick the closest
      positiveRewards.sort(
        (a, b) =>
          manhattanDistance(pos, a.pos, cols) -
          manhattanDistance(pos, b.pos, cols),
      );
      target = positiveRewards[0].pos;
    } else {
      // No rewards left, head for the exit
      target = exit;
    }

    // Score each valid action by how much it reduces distance to the target
    let bestAction = validActions[0];
    let bestDist = Infinity;

    for (const action of validActions) {
      const offset = DIR_OFFSETS[action](cols);
      const nextPos = pos + offset;
      const dist = manhattanDistance(nextPos, target, cols);
      if (dist < bestDist) {
        bestDist = dist;
        bestAction = action;
      }
    }

    return bestAction;
  }
}
