import { useState, useCallback, useRef, useEffect } from 'react';
import { SeededRandom } from '@/utils/seededRandom';
import { clamp } from '@/utils/math';
import { useGameStore } from '@/stores/gameStore';

// --- Types ---

export type CellState = 'normal' | 'visited' | 'current' | 'hidden';
export type TutorialStep = 0 | 1 | 2 | 3 | 4;

export interface Position {
  x: number;
  y: number;
}

export interface TutorialState {
  step: TutorialStep;
  pet: string | null;
  petPosition: Position;
  treatPosition: Position;
  gridState: CellState[][];
  heatmap: number[][];
  fogEnabled: boolean;
  message: string | null;
  isAnimating: boolean;
  autoRunning: boolean;
  speed: number;
  rewardEmoji: string | null;
  episodeCount: number;
  treatFoundCount: number;
}

// --- Constants ---

const GRID_SIZE = 4;
const DIRECTIONS: Position[] = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 },  // right
];

function createEmptyGrid<T>(fill: T): T[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => fill)
  );
}

function randomPosition(rng: SeededRandom, exclude?: Position): Position {
  let pos: Position;
  do {
    pos = { x: rng.nextInt(0, GRID_SIZE - 1), y: rng.nextInt(0, GRID_SIZE - 1) };
  } while (exclude && pos.x === exclude.x && pos.y === exclude.y);
  return pos;
}

function isAdjacent(a: Position, b: Position): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx + dy) === 1;
}

function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function isValidPos(p: Position): boolean {
  return p.x >= 0 && p.x < GRID_SIZE && p.y >= 0 && p.y < GRID_SIZE;
}

// Create initial state outside of component to avoid reading refs during render
const initialRng = new SeededRandom(42);
const initialPetPos = randomPosition(initialRng);
const initialTreatPos = randomPosition(initialRng, initialPetPos);
const initialGrid = createEmptyGrid<CellState>('normal');
initialGrid[initialPetPos.y][initialPetPos.x] = 'current';

const INITIAL_STATE: TutorialState = {
  step: 0,
  pet: null,
  petPosition: initialPetPos,
  treatPosition: initialTreatPos,
  gridState: initialGrid,
  heatmap: createEmptyGrid(0),
  fogEnabled: false,
  message: null,
  isAnimating: false,
  autoRunning: false,
  speed: 1,
  rewardEmoji: null,
  episodeCount: 0,
  treatFoundCount: 0,
};

// --- The Hook ---

export function useTutorial() {
  const setSelectedPet = useGameStore((s) => s.setSelectedPet);
  const rngRef = useRef(new SeededRandom(42));
  const autoIntervalRef = useRef<number>(0);
  const valueTableRef = useRef<number[][]>(createEmptyGrid(0));
  const epsilonRef = useRef(0.5);
  const stepCountRef = useRef(0);

  const [state, setState] = useState<TutorialState>(INITIAL_STATE);

  // Cleanup on unmount
  useEffect(() => {
    const intervalRef = autoIntervalRef;
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // --- Pet Selection ---
  const selectPet = useCallback((emoji: string) => {
    // Persist to game store so it's visible in TopBar and throughout the game
    setSelectedPet(emoji);

    const rng = rngRef.current;
    const petPos = randomPosition(rng);
    const treatPos = randomPosition(rng, petPos);
    const grid = createEmptyGrid<CellState>('normal');
    grid[petPos.y][petPos.x] = 'current';

    setState(prev => ({
      ...prev,
      step: 1 as TutorialStep,
      pet: emoji,
      petPosition: petPos,
      treatPosition: treatPos,
      gridState: grid,
      message: null,
      fogEnabled: false,
    }));
  }, []);

  // --- Movement (Steps 1 & 2) ---
  const movePet = useCallback((dx: number, dy: number) => {
    setState(prev => {
      if (prev.isAnimating || prev.step > 2) return prev;

      const newPos: Position = {
        x: clamp(prev.petPosition.x + dx, 0, GRID_SIZE - 1),
        y: clamp(prev.petPosition.y + dy, 0, GRID_SIZE - 1),
      };

      // No movement if already at boundary
      if (posEqual(newPos, prev.petPosition)) return prev;

      const grid = prev.gridState.map(row => [...row]);

      // Mark old position as visited
      grid[prev.petPosition.y][prev.petPosition.x] = 'visited';
      grid[newPos.y][newPos.x] = 'current';

      const foundTreat = posEqual(newPos, prev.treatPosition);

      return {
        ...prev,
        petPosition: newPos,
        gridState: grid,
        message: foundTreat ? (prev.step === 1 ? 'step1_found' : 'step2_found') : null,
        isAnimating: foundTreat,
      };
    });
  }, []);

  const handleCellClick = useCallback((x: number, y: number) => {
    setState(prev => {
      if (prev.isAnimating || prev.step > 2) return prev;
      const target: Position = { x, y };
      if (!isAdjacent(prev.petPosition, target)) return prev;

      const grid = prev.gridState.map(row => [...row]);
      grid[prev.petPosition.y][prev.petPosition.x] = 'visited';
      grid[target.y][target.x] = 'current';

      const foundTreat = posEqual(target, prev.treatPosition);

      return {
        ...prev,
        petPosition: target,
        gridState: grid,
        message: foundTreat ? (prev.step === 1 ? 'step1_found' : 'step2_found') : null,
        isAnimating: foundTreat,
      };
    });
  }, []);

  // --- Advance to Next Step ---
  const advanceStep = useCallback(() => {
    const rng = rngRef.current;

    // Reset value table for step 3 (safe to mutate refs in event handlers)
    valueTableRef.current = createEmptyGrid(0);
    epsilonRef.current = 0.5;
    stepCountRef.current = 0;

    setState(prev => {
      const nextStep = (prev.step + 1) as TutorialStep;
      if (nextStep > 4) return prev;

      const petPos = randomPosition(rng);
      const treatPos = randomPosition(rng, petPos);
      const grid = createEmptyGrid<CellState>('normal');
      grid[petPos.y][petPos.x] = 'current';

      return {
        ...prev,
        step: nextStep,
        petPosition: petPos,
        treatPosition: treatPos,
        gridState: grid,
        heatmap: createEmptyGrid(0),
        fogEnabled: nextStep === 2,
        message: null,
        isAnimating: false,
        autoRunning: false,
        rewardEmoji: null,
        episodeCount: 0,
        treatFoundCount: 0,
      };
    });
  }, []);

  // --- Step 3: Auto Learning Agent ---
  const agentStep = useCallback(() => {
    setState(prev => {
      if (prev.step !== 3) return prev;

      const rng = rngRef.current;
      const vt = valueTableRef.current;
      const eps = epsilonRef.current;
      const pos = prev.petPosition;
      const alpha = 0.3;
      const gamma = 0.9;

      // Epsilon-greedy action selection
      let bestDir = 0;
      let bestVal = -Infinity;

      const validDirs: number[] = [];
      for (let d = 0; d < DIRECTIONS.length; d++) {
        const nx = pos.x + DIRECTIONS[d].x;
        const ny = pos.y + DIRECTIONS[d].y;
        if (isValidPos({ x: nx, y: ny })) {
          validDirs.push(d);
          if (vt[ny][nx] > bestVal) {
            bestVal = vt[ny][nx];
            bestDir = d;
          }
        }
      }

      let chosenDir: number;
      if (rng.next() < eps) {
        chosenDir = rng.pick(validDirs);
      } else {
        chosenDir = bestDir;
      }

      const dir = DIRECTIONS[chosenDir];
      const newPos: Position = {
        x: clamp(pos.x + dir.x, 0, GRID_SIZE - 1),
        y: clamp(pos.y + dir.y, 0, GRID_SIZE - 1),
      };

      const foundTreat = posEqual(newPos, prev.treatPosition);
      const reward = foundTreat ? 10 : (posEqual(newPos, pos) ? -1 : -0.1);

      // TD(0) update: V(s) = V(s) + alpha * (reward + gamma * V(s') - V(s))
      const oldVal = vt[pos.y][pos.x];
      const nextVal = foundTreat ? 0 : vt[newPos.y][newPos.x];
      vt[pos.y][pos.x] = oldVal + alpha * (reward + gamma * nextVal - oldVal);

      // Set treat cell to high value
      if (foundTreat) {
        vt[prev.treatPosition.y][prev.treatPosition.x] = 10;
      }

      // Normalize heatmap for display
      let maxVal = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          maxVal = Math.max(maxVal, Math.abs(vt[r][c]));
        }
      }
      const heatmap = vt.map(row =>
        row.map(v => maxVal > 0 ? clamp(v / maxVal, 0, 1) : 0)
      );

      const grid = prev.gridState.map(row => [...row]);
      grid[pos.y][pos.x] = 'visited';
      grid[newPos.y][newPos.x] = 'current';

      // Decay epsilon
      stepCountRef.current++;
      if (stepCountRef.current % 10 === 0) {
        epsilonRef.current = Math.max(0.1, epsilonRef.current * 0.95);
      }

      let emoji: string | null = null;
      if (foundTreat) emoji = 'happy';
      else if (posEqual(newPos, pos)) emoji = 'wall';
      else emoji = 'neutral';

      // If treat found, reset position for next episode
      let nextPetPos = newPos;
      let nextTreatPos = prev.treatPosition;
      let nextGrid = grid;
      let newEpisodeCount = prev.episodeCount;
      let newTreatFoundCount = prev.treatFoundCount;

      if (foundTreat) {
        newTreatFoundCount = prev.treatFoundCount + 1;
        newEpisodeCount = prev.episodeCount + 1;
        nextPetPos = randomPosition(rng);
        // Keep same treat position so learning is effective
        // But after a few finds, move it to show adaptability
        if (newTreatFoundCount % 5 === 0 && newTreatFoundCount > 0) {
          nextTreatPos = randomPosition(rng, nextPetPos);
        }
        nextGrid = prev.gridState.map(row => [...row]);
        nextGrid[nextPetPos.y][nextPetPos.x] = 'current';
      }

      return {
        ...prev,
        petPosition: nextPetPos,
        treatPosition: nextTreatPos,
        gridState: nextGrid,
        heatmap,
        rewardEmoji: emoji,
        episodeCount: newEpisodeCount,
        treatFoundCount: newTreatFoundCount,
      };
    });
  }, []);

  // --- Auto-run controller for step 3 ---
  const toggleAutoRun = useCallback(() => {
    setState(prev => ({ ...prev, autoRunning: !prev.autoRunning }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  const resetStep3 = useCallback(() => {
    const rng = rngRef.current;
    valueTableRef.current = createEmptyGrid(0);
    epsilonRef.current = 0.5;
    stepCountRef.current = 0;

    const petPos = randomPosition(rng);
    const treatPos = randomPosition(rng, petPos);
    const grid = createEmptyGrid<CellState>('normal');
    grid[petPos.y][petPos.x] = 'current';

    setState(prev => ({
      ...prev,
      petPosition: petPos,
      treatPosition: treatPos,
      gridState: grid,
      heatmap: createEmptyGrid(0),
      autoRunning: false,
      rewardEmoji: null,
      episodeCount: 0,
      treatFoundCount: 0,
    }));
  }, []);

  // Manage auto-run interval
  useEffect(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = 0;
    }

    if (state.autoRunning && state.step === 3) {
      const interval = Math.max(30, 300 / state.speed);
      autoIntervalRef.current = window.setInterval(() => {
        agentStep();
      }, interval);
    }

    const intervalRef = autoIntervalRef;
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = 0;
      }
    };
  }, [state.autoRunning, state.step, state.speed, agentStep]);

  // --- Keyboard handler ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    let dx = 0;
    let dy = 0;

    switch (key) {
      case 'arrowup': case 'w': dy = -1; break;
      case 'arrowdown': case 's': dy = 1; break;
      case 'arrowleft': case 'a': dx = -1; break;
      case 'arrowright': case 'd': dx = 1; break;
      default: return;
    }

    e.preventDefault();
    movePet(dx, dy);
  }, [movePet]);

  // Register keyboard listener for steps 1 and 2
  useEffect(() => {
    if (state.step === 1 || state.step === 2) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [state.step, handleKeyDown]);

  // Clear message
  const dismissMessage = useCallback(() => {
    setState(prev => ({
      ...prev,
      message: null,
      isAnimating: false,
    }));
  }, []);

  return {
    state,
    selectPet,
    movePet,
    handleCellClick,
    advanceStep,
    agentStep,
    toggleAutoRun,
    setSpeed,
    resetStep3,
    dismissMessage,
  };
}
