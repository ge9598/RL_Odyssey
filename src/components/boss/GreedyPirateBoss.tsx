/**
 * GreedyPirateBoss
 *
 * The Phase 1 MVP mini-boss for the Value Archipelago.
 * "The Greedy Pirate" always picks the highest immediate reward.
 * The player must train a Q-Learning agent that outperforms pure greed
 * on a delayed-reward maze.
 *
 * Flow:
 *   Phase 1 - Briefing (pirate NPC dialogue)
 *   Phase 2 - Watch the Pirate (greedy run demo)
 *   Phase 3 - Train Your Agent (Q-Learning with hyperparameter tuning)
 *   Phase 4 - The Race (side-by-side comparison)
 *   Phase 5 - Results (rank, gold, card)
 *   Phase 6 - Victory / Retry
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { SpeedControl } from '@/components/ui/SpeedControl';
import { DelayedRewardMaze } from '@/environments/DelayedRewardMaze';
import type { MazeReward } from '@/environments/DelayedRewardMaze';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GreedyPirateAgent } from '@/algorithms/greedyPirate';
import { QLearningAgent } from '@/algorithms/qlearningAgent';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import type { BountyRank } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';

// ---------------------------------------------------------------------------
// Maze Configuration
// ---------------------------------------------------------------------------

const ROWS = 6;
const COLS = 8;
const TOTAL_CELLS = ROWS * COLS;
const START = 0;
const EXIT = TOTAL_CELLS - 1; // cell 47

/**
 * Walls form a barrier in the middle of the maze, forcing two paths:
 *   - Top "greedy" path: goes right along the top rows
 *   - Bottom "patient" path: goes down-left, finds big treasure, then to exit
 *
 * Layout conceptually (8x6):
 *   Row 0: S . . . . . . .    (greedy path along top)
 *   Row 1: . W W W W W . .    (wall barrier)
 *   Row 2: . W W W W W . .    (wall barrier)
 *   Row 3: . . . . W . . .    (partial wall)
 *   Row 4: . . . . W . . .    (partial wall)
 *   Row 5: . . . . . . . E    (patient path along bottom)
 */
const WALLS: number[] = [
  // Row 1: cols 1-5
  9, 10, 11, 12, 13,
  // Row 2: cols 1-5
  17, 18, 19, 20, 21,
  // Row 3: col 4
  28,
  // Row 4: col 4
  36,
];

/**
 * Rewards:
 *   Greedy path (top): small coins at cells 1, 3, 5, 7, 15, 23 (+1 each)
 *   Exit bonus: +2
 *   Patient path (bottom): big treasure at cell 43 (+15), step penalty -0.1 implicit
 */
const INITIAL_REWARDS: MazeReward[] = [
  // Greedy path breadcrumbs
  { pos: 1, value: 1 },
  { pos: 3, value: 1 },
  { pos: 5, value: 1 },
  { pos: 7, value: 1 },
  { pos: 15, value: 1 },
  { pos: 23, value: 1 },
  // Patient path big treasure
  { pos: 43, value: 15 },
  // Exit reward
  { pos: EXIT, value: 2 },
];

const NUM_ACTIONS = 4; // up, right, down, left
const STEP_PENALTY = -0.1;
const MAX_STEPS_PER_EPISODE = 80;
const BASE_GOLD = 1000;
const CARD_ID = 'patient-strategist';

type BossPhase =
  | 'briefing'
  | 'watch-pirate'
  | 'train'
  | 'race'
  | 'results'
  | 'victory';

// ---------------------------------------------------------------------------
// Maze simulation helpers
// ---------------------------------------------------------------------------

const DIR_OFFSETS: Record<number, number> = {
  0: -COLS, // up
  1: 1,     // right
  2: COLS,  // down
  3: -1,    // left
};

function isValidMove(pos: number, action: number, wallSet: Set<number>): boolean {
  const x = pos % COLS;
  const y = Math.floor(pos / COLS);

  switch (action) {
    case 0: return y > 0 && !wallSet.has(pos - COLS);
    case 1: return x < COLS - 1 && !wallSet.has(pos + 1);
    case 2: return y < ROWS - 1 && !wallSet.has(pos + COLS);
    case 3: return x > 0 && !wallSet.has(pos - 1);
    default: return false;
  }
}

function getValidActions(pos: number, wallSet: Set<number>): number[] {
  const actions: number[] = [];
  for (let a = 0; a < NUM_ACTIONS; a++) {
    if (isValidMove(pos, a, wallSet)) actions.push(a);
  }
  return actions;
}

interface RunResult {
  path: number[];
  totalReward: number;
  collected: number[];
}

function runGreedyPirate(
  pirate: GreedyPirateAgent,
  rewardsList: MazeReward[],
): RunResult {
  const remaining = rewardsList.map((r) => ({ ...r }));
  let pos = START;
  const path: number[] = [pos];
  const collected: number[] = [];
  let totalReward = 0;

  for (let step = 0; step < MAX_STEPS_PER_EPISODE; step++) {
    const action = pirate.selectAction(pos, COLS, ROWS, WALLS, remaining, EXIT);

    const wallSet = new Set(WALLS);
    if (!isValidMove(pos, action, wallSet)) break;

    pos += DIR_OFFSETS[action];
    path.push(pos);
    totalReward += STEP_PENALTY;

    // Check reward
    const rIdx = remaining.findIndex((r) => r.pos === pos);
    if (rIdx !== -1) {
      totalReward += remaining[rIdx].value;
      collected.push(remaining[rIdx].pos);
      remaining.splice(rIdx, 1);
    }

    if (pos === EXIT) break;
  }

  return { path, totalReward: Math.round(totalReward * 100) / 100, collected };
}

function runQLearningAgent(
  agent: QLearningAgent,
): RunResult {
  const remaining = INITIAL_REWARDS.map((r) => ({ ...r }));
  const wallSet = new Set(WALLS);
  let pos = START;
  const path: number[] = [pos];
  const collected: number[] = [];
  let totalReward = 0;

  // Use the trained agent greedily (epsilon=0)
  const savedEpsilon = agent.getHyperparameters().find((h) => h.key === 'epsilon')?.value ?? 0.1;
  agent.setHyperparameter('epsilon', 0);

  for (let step = 0; step < MAX_STEPS_PER_EPISODE; step++) {
    const { action } = agent.step(pos);

    if (!isValidMove(pos, action, wallSet)) {
      // If chosen action is invalid, pick a random valid one
      const valid = getValidActions(pos, wallSet);
      if (valid.length === 0) break;
      const fallback = valid[Math.floor(Math.random() * valid.length)];
      pos += DIR_OFFSETS[fallback];
    } else {
      pos += DIR_OFFSETS[action];
    }

    path.push(pos);
    totalReward += STEP_PENALTY;

    const rIdx = remaining.findIndex((r) => r.pos === pos);
    if (rIdx !== -1) {
      totalReward += remaining[rIdx].value;
      collected.push(remaining[rIdx].pos);
      remaining.splice(rIdx, 1);
    }

    if (pos === EXIT) break;
  }

  agent.setHyperparameter('epsilon', savedEpsilon);
  return { path, totalReward: Math.round(totalReward * 100) / 100, collected };
}

// ---------------------------------------------------------------------------
// Training helpers
// ---------------------------------------------------------------------------

function trainOneEpisode(agent: QLearningAgent): number {
  const wallSet = new Set(WALLS);
  const remaining = INITIAL_REWARDS.map((r) => ({ ...r }));
  let pos = START;
  agent.resetEpisode();

  for (let step = 0; step < MAX_STEPS_PER_EPISODE; step++) {
    const { action } = agent.step(pos);
    let nextPos = pos;

    if (isValidMove(pos, action, wallSet)) {
      nextPos = pos + DIR_OFFSETS[action];
    }
    // If not valid, agent stays in place (still gets step penalty)

    let reward = STEP_PENALTY;
    const rIdx = remaining.findIndex((r) => r.pos === nextPos);
    if (rIdx !== -1) {
      reward += remaining[rIdx].value;
      remaining.splice(rIdx, 1);
    }

    const done = nextPos === EXIT;
    agent.update({ state: pos, action, reward, nextState: nextPos, done });
    pos = nextPos;

    if (done) break;
  }

  return agent.getEpisodeReward();
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

interface GreedyPirateBossProps {
  onComplete: () => void;
  onReturn: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GreedyPirateBoss({ onComplete, onReturn }: GreedyPirateBossProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore((s) => s.completeQuest);
  const collectCard = useCardStore((s) => s.collectCard);

  // --- Phase state ---
  const [phase, setPhase] = useState<BossPhase>('briefing');

  // --- Pirate run state ---
  const [pirateResult, setPirateResult] = useState<RunResult | null>(null);
  const [pirateAnimStep, setPirateAnimStep] = useState(0);
  const [pirateAnimating, setPirateAnimating] = useState(false);

  // --- Training state ---
  const [learningRate, setLearningRate] = useState(0.1);
  const [discountFactor, setDiscountFactor] = useState(0.95);
  const [epsilon, setEpsilon] = useState(0.2);
  const [trainingEpisodes, setTrainingEpisodes] = useState(0);
  const [episodeRewards, setEpisodeRewards] = useState<number[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [speed, setSpeed] = useState(5);
  const agentRef = useRef<QLearningAgent | null>(null);
  const trainingRef = useRef<number | null>(null);

  // --- Race state ---
  const [agentResult, setAgentResult] = useState<RunResult | null>(null);
  const [raceAnimStep, setRaceAnimStep] = useState(0);
  const [raceAnimating, setRaceAnimating] = useState(false);

  // --- Results ---
  const [rank, setRank] = useState<BountyRank>('C');
  const [goldEarned, setGoldEarned] = useState(0);

  // Animation timer refs
  const pirateTimerRef = useRef<number | null>(null);
  const raceTimerRef = useRef<number | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pirateTimerRef.current) cancelAnimationFrame(pirateTimerRef.current);
      if (raceTimerRef.current) cancelAnimationFrame(raceTimerRef.current);
      if (trainingRef.current) cancelAnimationFrame(trainingRef.current);
    };
  }, []);

  // ------------------------------------------------------------------
  // Phase 2: Watch Pirate
  // ------------------------------------------------------------------

  const startPirateDemo = useCallback(() => {
    const pirate = new GreedyPirateAgent();
    const result = runGreedyPirate(pirate, INITIAL_REWARDS);
    setPirateResult(result);
    setPirateAnimStep(0);
    setPirateAnimating(true);
    setPhase('watch-pirate');
  }, []);

  // Animate pirate path
  useEffect(() => {
    if (!pirateAnimating || !pirateResult) return;

    const maxStep = pirateResult.path.length - 1;
    if (pirateAnimStep >= maxStep) {
      setPirateAnimating(false);
      return;
    }

    let lastTime = 0;
    const stepDelay = 250; // ms per step

    const animate = (time: number) => {
      if (time - lastTime >= stepDelay) {
        lastTime = time;
        setPirateAnimStep((prev) => {
          if (prev >= maxStep) {
            setPirateAnimating(false);
            return prev;
          }
          return prev + 1;
        });
      }
      pirateTimerRef.current = requestAnimationFrame(animate);
    };

    pirateTimerRef.current = requestAnimationFrame(animate);
    return () => {
      if (pirateTimerRef.current) cancelAnimationFrame(pirateTimerRef.current);
    };
  }, [pirateAnimating, pirateResult, pirateAnimStep]);

  // ------------------------------------------------------------------
  // Phase 3: Training
  // ------------------------------------------------------------------

  const initAgent = useCallback(() => {
    const agent = new QLearningAgent({
      numStates: TOTAL_CELLS,
      numActions: NUM_ACTIONS,
      learningRate,
      discountFactor,
      epsilon,
      seed: 42,
    });
    agentRef.current = agent;
    setTrainingEpisodes(0);
    setEpisodeRewards([]);
  }, [learningRate, discountFactor, epsilon]);

  const startTraining = useCallback(() => {
    if (!agentRef.current) initAgent();
    const agent = agentRef.current!;

    // Update hyperparameters before training
    agent.setHyperparameter('learningRate', learningRate);
    agent.setHyperparameter('discountFactor', discountFactor);
    agent.setHyperparameter('epsilon', epsilon);

    setIsTraining(true);

    const batchSize = speed >= 10 ? 20 : speed >= 5 ? 10 : speed >= 2 ? 5 : 1;

    const trainBatch = () => {
      const newRewards: number[] = [];
      for (let i = 0; i < batchSize; i++) {
        const reward = trainOneEpisode(agent);
        newRewards.push(reward);
      }
      setEpisodeRewards((prev) => [...prev, ...newRewards]);
      setTrainingEpisodes((prev) => prev + batchSize);
      trainingRef.current = requestAnimationFrame(trainBatch);
    };

    trainingRef.current = requestAnimationFrame(trainBatch);
  }, [initAgent, learningRate, discountFactor, epsilon, speed]);

  const stopTraining = useCallback(() => {
    setIsTraining(false);
    if (trainingRef.current) {
      cancelAnimationFrame(trainingRef.current);
      trainingRef.current = null;
    }
  }, []);

  const resetTraining = useCallback(() => {
    stopTraining();
    agentRef.current = null;
    setTrainingEpisodes(0);
    setEpisodeRewards([]);
    initAgent();
  }, [stopTraining, initAgent]);

  const stepTraining = useCallback(() => {
    if (!agentRef.current) initAgent();
    const agent = agentRef.current!;
    agent.setHyperparameter('learningRate', learningRate);
    agent.setHyperparameter('discountFactor', discountFactor);
    agent.setHyperparameter('epsilon', epsilon);

    const reward = trainOneEpisode(agent);
    setEpisodeRewards((prev) => [...prev, reward]);
    setTrainingEpisodes((prev) => prev + 1);
  }, [initAgent, learningRate, discountFactor, epsilon]);

  // Initialize agent when entering training phase
  useEffect(() => {
    if (phase === 'train' && !agentRef.current) {
      initAgent();
    }
  }, [phase, initAgent]);

  // ------------------------------------------------------------------
  // Phase 4: Race
  // ------------------------------------------------------------------

  const startRace = useCallback(() => {
    stopTraining();
    if (!agentRef.current) return;

    const result = runQLearningAgent(agentRef.current);
    setAgentResult(result);
    setRaceAnimStep(0);
    setRaceAnimating(true);
    setPhase('race');
  }, [stopTraining]);

  // Animate race
  useEffect(() => {
    if (!raceAnimating || !agentResult || !pirateResult) return;

    const maxStep = Math.max(
      agentResult.path.length - 1,
      pirateResult.path.length - 1,
    );
    if (raceAnimStep >= maxStep) {
      setRaceAnimating(false);
      return;
    }

    let lastTime = 0;
    const stepDelay = 200;

    const animate = (time: number) => {
      if (time - lastTime >= stepDelay) {
        lastTime = time;
        setRaceAnimStep((prev) => {
          if (prev >= maxStep) {
            setRaceAnimating(false);
            return prev;
          }
          return prev + 1;
        });
      }
      raceTimerRef.current = requestAnimationFrame(animate);
    };

    raceTimerRef.current = requestAnimationFrame(animate);
    return () => {
      if (raceTimerRef.current) cancelAnimationFrame(raceTimerRef.current);
    };
  }, [raceAnimating, agentResult, pirateResult, raceAnimStep]);

  // When race finishes, go to results
  useEffect(() => {
    if (phase === 'race' && !raceAnimating && agentResult && pirateResult) {
      // Short delay before showing results
      const timer = setTimeout(() => {
        calculateResults();
        setPhase('results');
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, raceAnimating]);

  // ------------------------------------------------------------------
  // Phase 5: Results
  // ------------------------------------------------------------------

  const calculateResults = useCallback(() => {
    if (!agentResult || !pirateResult) return;

    const ratio = pirateResult.totalReward > 0
      ? agentResult.totalReward / pirateResult.totalReward
      : agentResult.totalReward > 0
        ? 3 // agent positive, pirate zero or negative
        : 0;

    let r: BountyRank;
    if (ratio >= 2.0) r = 'S';
    else if (ratio >= 1.6) r = 'A';
    else if (ratio >= 1.3) r = 'B';
    else if (ratio > 1.0) r = 'C';
    else r = 'C'; // failed but still give C for attempt

    const passed = agentResult.totalReward > pirateResult.totalReward;
    if (!passed) {
      setRank('C');
      setGoldEarned(0);
      return;
    }

    setRank(r);
    const gold = Math.floor(BASE_GOLD * BOUNTY_MULTIPLIERS[r]);
    setGoldEarned(gold);
  }, [agentResult, pirateResult]);

  // ------------------------------------------------------------------
  // Phase 6: Victory / Retry
  // ------------------------------------------------------------------

  const handleClaim = useCallback(() => {
    if (!agentResult || !pirateResult) return;

    const passed = agentResult.totalReward > pirateResult.totalReward;
    if (passed) {
      // Use 'bandit' as a proxy PortId for the boss since boss doesn't have its own PortId
      // The game store will track this via portProgress keyed by string
      completeQuest('bandit' as any, rank, BASE_GOLD);
      collectCard(CARD_ID, rank);
    }

    setPhase('victory');
  }, [agentResult, pirateResult, rank, completeQuest, collectCard]);

  const handleRetry = useCallback(() => {
    setPirateResult(null);
    setPirateAnimStep(0);
    setAgentResult(null);
    setRaceAnimStep(0);
    setTrainingEpisodes(0);
    setEpisodeRewards([]);
    agentRef.current = null;
    setIsTraining(false);
    setPhase('briefing');
  }, []);

  // ------------------------------------------------------------------
  // Derived maze props per phase
  // ------------------------------------------------------------------

  const getPiratePos = (): number | undefined => {
    if (!pirateResult) return undefined;
    if (phase === 'watch-pirate') {
      return pirateResult.path[Math.min(pirateAnimStep, pirateResult.path.length - 1)];
    }
    if (phase === 'race' && pirateResult) {
      return pirateResult.path[Math.min(raceAnimStep, pirateResult.path.length - 1)];
    }
    return undefined;
  };

  const getPlayerPos = (): number => {
    if (phase === 'race' && agentResult) {
      return agentResult.path[Math.min(raceAnimStep, agentResult.path.length - 1)];
    }
    return START;
  };

  const getPiratePath = (): number[] => {
    if (!pirateResult) return [];
    if (phase === 'watch-pirate') {
      return pirateResult.path.slice(0, pirateAnimStep + 1);
    }
    if (phase === 'race') {
      return pirateResult.path.slice(0, Math.min(raceAnimStep + 1, pirateResult.path.length));
    }
    if (phase === 'results' || phase === 'victory') {
      return pirateResult.path;
    }
    return [];
  };

  const getPlayerPath = (): number[] => {
    if (phase === 'race' && agentResult) {
      return agentResult.path.slice(0, Math.min(raceAnimStep + 1, agentResult.path.length));
    }
    if ((phase === 'results' || phase === 'victory') && agentResult) {
      return agentResult.path;
    }
    return [];
  };

  const getPirateCollected = (): number[] => {
    if (!pirateResult) return [];
    if (phase === 'watch-pirate') {
      const currentPos = pirateResult.path[Math.min(pirateAnimStep, pirateResult.path.length - 1)];
      return pirateResult.collected.filter((c) =>
        pirateResult.path.indexOf(c) <= pirateResult.path.indexOf(currentPos),
      );
    }
    if (phase === 'race' || phase === 'results' || phase === 'victory') {
      return pirateResult.collected;
    }
    return [];
  };

  const getPlayerCollected = (): number[] => {
    if (!agentResult) return [];
    if (phase === 'race') {
      const currentIdx = Math.min(raceAnimStep, agentResult.path.length - 1);
      const currentPos = agentResult.path[currentIdx];
      return agentResult.collected.filter((c) =>
        agentResult.path.indexOf(c) <= agentResult.path.indexOf(currentPos),
      );
    }
    if (phase === 'results' || phase === 'victory') {
      return agentResult.collected;
    }
    return [];
  };

  const passed = agentResult && pirateResult
    ? agentResult.totalReward > pirateResult.totalReward
    : false;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      {/* Boss header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl animate-float">&#x1F3F4;&#x200D;&#x2620;&#xFE0F;</span>
        <h2
          className="font-pixel text-base text-[#f87171] uppercase tracking-wider"
          style={{ textShadow: '0 0 12px rgba(248,113,113,0.4)' }}
        >
          {t('boss.pirate.title')}
        </h2>
      </div>

      {/* Phase indicator */}
      <div className="flex gap-2 mb-6">
        {(['briefing', 'watch-pirate', 'train', 'race', 'results'] as BossPhase[]).map(
          (p, i) => (
            <div
              key={p}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                phase === p
                  ? 'bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                  : i < ['briefing', 'watch-pirate', 'train', 'race', 'results'].indexOf(phase)
                    ? 'bg-[#4ade80]'
                    : 'bg-[#1e2448]'
              }`}
            />
          ),
        )}
      </div>

      <div className="max-w-5xl w-full grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        {/* Left: Maze / Main view */}
        <div className="flex flex-col items-center gap-4">
          {phase !== 'briefing' && (
            <DelayedRewardMaze
              rows={ROWS}
              cols={COLS}
              walls={WALLS}
              rewards={INITIAL_REWARDS}
              exit={EXIT}
              start={START}
              playerPos={getPlayerPos()}
              piratePos={getPiratePos()}
              playerPath={getPlayerPath()}
              piratePath={getPiratePath()}
              playerCollected={getPlayerCollected()}
              pirateCollected={getPirateCollected()}
              showValues
              mode={phase === 'race' ? 'race' : phase === 'watch-pirate' ? 'replay' : 'static'}
            />
          )}

          {/* Phase-specific content below maze */}
          {phase === 'watch-pirate' && pirateResult && !pirateAnimating && (
            <PixelPanel className="w-full max-w-[480px]">
              <p className="font-body text-lg text-[#f87171]">
                {t('boss.pirate.pirateScore')}: <span className="font-pixel text-sm">{pirateResult.totalReward}</span>
              </p>
              <p className="font-body text-base text-[#e2e8f0] mt-2">
                {t('boss.pirate.pirateExplain')}
              </p>
              <PixelButton className="mt-4" onClick={() => setPhase('train')}>
                {t('boss.pirate.trainAgent')}
              </PixelButton>
            </PixelPanel>
          )}

          {phase === 'race' && (
            <div className="flex gap-6 text-center">
              <div>
                <span className="font-pixel text-[10px] text-[#00d4ff] uppercase">{t('boss.pirate.yourAgent')}</span>
                <p className="font-pixel text-sm text-[#e2e8f0]">
                  {agentResult
                    ? (agentResult.path.slice(0, raceAnimStep + 1)
                        .reduce((sum, pos) => {
                          const r = INITIAL_REWARDS.find((rw) => rw.pos === pos);
                          return sum + (r ? r.value : 0) + STEP_PENALTY;
                        }, 0)).toFixed(1)
                    : '0'
                  }
                </p>
              </div>
              <div className="font-pixel text-xs text-[#708090] self-center">VS</div>
              <div>
                <span className="font-pixel text-[10px] text-[#f87171] uppercase">{t('boss.pirate.thePirate')}</span>
                <p className="font-pixel text-sm text-[#e2e8f0]">
                  {pirateResult ? pirateResult.totalReward : 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls panel */}
        <div className="flex flex-col gap-4">
          {/* ---- BRIEFING ---- */}
          {phase === 'briefing' && (
            <PixelPanel className="border-l-4 border-l-[#f87171]">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">&#x1F3F4;&#x200D;&#x2620;&#xFE0F;</span>
                <div>
                  <p className="font-pixel text-[11px] text-[#f87171] mb-1">
                    {t('boss.pirate.name')}
                  </p>
                  <p className="font-body text-lg text-[#e2e8f0] leading-relaxed">
                    "{t('boss.pirate.dialogue1')}"
                  </p>
                  <p className="font-body text-base text-[#e2e8f0] mt-3 leading-relaxed">
                    "{t('boss.pirate.dialogue2')}"
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-[rgba(0,212,255,0.05)] rounded-sm">
                <p className="font-pixel text-[10px] text-[#00d4ff] uppercase mb-1">
                  {t('boss.pirate.challengeTitle')}
                </p>
                <p className="font-body text-base text-[#e2e8f0]">
                  {t('boss.pirate.challengeDesc')}
                </p>
              </div>

              <PixelButton className="mt-5 w-full" variant="danger" onClick={startPirateDemo}>
                {t('boss.pirate.watchPirate')}
              </PixelButton>
            </PixelPanel>
          )}

          {/* ---- WATCH PIRATE ---- */}
          {phase === 'watch-pirate' && pirateAnimating && (
            <PixelPanel>
              <p className="font-pixel text-[10px] text-[#f87171] uppercase mb-2">
                {t('boss.pirate.pirateRunning')}
              </p>
              <p className="font-body text-base text-[#e2e8f0]">
                {t('boss.pirate.pirateRunDesc')}
              </p>
              <div className="mt-3 font-pixel text-[10px] text-[#708090]">
                {t('boss.pirate.step')}: {pirateAnimStep} / {pirateResult ? pirateResult.path.length - 1 : 0}
              </div>
            </PixelPanel>
          )}

          {/* ---- TRAINING ---- */}
          {phase === 'train' && (
            <>
              <PixelPanel title={t('boss.pirate.hyperparameters')}>
                <div className="flex flex-col gap-3">
                  <PixelSlider
                    label={t('boss.pirate.learningRate')}
                    value={learningRate}
                    min={0.01}
                    max={1.0}
                    step={0.01}
                    onChange={(v) => {
                      setLearningRate(v);
                      agentRef.current?.setHyperparameter('learningRate', v);
                    }}
                  />
                  <PixelSlider
                    label={t('boss.pirate.discountFactor')}
                    value={discountFactor}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    onChange={(v) => {
                      setDiscountFactor(v);
                      agentRef.current?.setHyperparameter('discountFactor', v);
                    }}
                  />
                  <PixelSlider
                    label={t('boss.pirate.explorationRate')}
                    value={epsilon}
                    min={0.0}
                    max={1.0}
                    step={0.01}
                    onChange={(v) => {
                      setEpsilon(v);
                      agentRef.current?.setHyperparameter('epsilon', v);
                    }}
                  />
                </div>
              </PixelPanel>

              <PixelPanel title={t('boss.pirate.training')}>
                <SpeedControl
                  speed={speed}
                  isRunning={isTraining}
                  onSpeedChange={setSpeed}
                  onToggle={() => (isTraining ? stopTraining() : startTraining())}
                  onStep={stepTraining}
                  onReset={resetTraining}
                />
                <div className="mt-3 font-pixel text-[10px] text-[#708090]">
                  {t('boss.pirate.episodes')}: {trainingEpisodes}
                </div>

                <div className="mt-4">
                  <RewardChart
                    data={episodeRewards}
                    width={300}
                    height={160}
                    baselineScore={pirateResult ? pirateResult.totalReward : undefined}
                  />
                </div>

                <PixelButton
                  className="mt-4 w-full"
                  variant="gold"
                  onClick={startRace}
                  disabled={trainingEpisodes < 10}
                >
                  {t('boss.pirate.startRace')}
                </PixelButton>
                {trainingEpisodes < 10 && (
                  <p className="font-pixel text-[9px] text-[#708090] mt-1 text-center">
                    {t('boss.pirate.trainMin')}
                  </p>
                )}
              </PixelPanel>
            </>
          )}

          {/* ---- RESULTS ---- */}
          {phase === 'results' && agentResult && pirateResult && (
            <PixelPanel
              variant={passed ? 'gold' : 'default'}
              className={passed ? '' : 'border-l-4 border-l-[#f87171]'}
            >
              <h3
                className={`font-pixel text-sm mb-4 ${
                  passed ? 'text-[#4ade80]' : 'text-[#f87171]'
                }`}
                style={{
                  textShadow: passed
                    ? '0 0 10px rgba(74,222,128,0.4)'
                    : '0 0 10px rgba(248,113,113,0.4)',
                }}
              >
                {passed ? t('boss.pirate.victory') : t('boss.pirate.defeat')}
              </h3>

              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-pixel text-[10px] text-[#00d4ff]">{t('boss.pirate.yourAgent')}</span>
                  <span className="font-pixel text-sm text-[#e2e8f0]">{agentResult.totalReward}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-pixel text-[10px] text-[#f87171]">{t('boss.pirate.thePirate')}</span>
                  <span className="font-pixel text-sm text-[#e2e8f0]">{pirateResult.totalReward}</span>
                </div>
              </div>

              {passed ? (
                <>
                  <p className="font-body text-base text-[#e2e8f0] mb-3">
                    {t('boss.pirate.victoryMessage')}
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-pixel text-xs text-[#ffd700] glow-gold">
                      {t('bounty.rank.' + rank)} ({rank})
                    </span>
                    <span className="font-pixel text-xs text-[#ffd700]">
                      +{goldEarned} {t('common.gold')}
                    </span>
                  </div>
                  <div className="p-2 bg-[rgba(255,215,0,0.05)] rounded-sm mb-4">
                    <p className="font-pixel text-[10px] text-[#ffd700]">
                      {t('boss.pirate.cardUnlock')}: {t('boss.pirate.cardName')}
                    </p>
                  </div>
                  <PixelButton className="w-full" variant="gold" onClick={handleClaim}>
                    {t('boss.pirate.claimReward')}
                  </PixelButton>
                </>
              ) : (
                <>
                  <p className="font-body text-base text-[#e2e8f0] mb-3">
                    {t('boss.pirate.defeatMessage')}
                  </p>
                  <PixelButton className="w-full" variant="danger" onClick={handleRetry}>
                    {t('common.retry')}
                  </PixelButton>
                </>
              )}
            </PixelPanel>
          )}

          {/* ---- VICTORY ---- */}
          {phase === 'victory' && (
            <PixelPanel variant="gold">
              <h3
                className="font-pixel text-sm text-[#ffd700] mb-3 glow-gold text-center"
              >
                {t('boss.pirate.victoryFinal')}
              </h3>
              <p className="font-body text-base text-[#e2e8f0] text-center mb-4">
                {t('boss.pirate.lessonLearned')}
              </p>

              <div className="flex flex-col gap-2">
                <PixelButton className="w-full" variant="gold" onClick={onComplete}>
                  {t('boss.pirate.continue')}
                </PixelButton>
                <PixelButton className="w-full" variant="secondary" onClick={handleRetry}>
                  {t('boss.pirate.playAgain')}
                </PixelButton>
                <PixelButton className="w-full" variant="secondary" onClick={onReturn}>
                  {t('common.back')}
                </PixelButton>
              </div>
            </PixelPanel>
          )}

          {/* Legend (always show when maze is visible) */}
          {phase !== 'briefing' && (
            <PixelPanel>
              <p className="font-pixel text-[10px] text-[#708090] uppercase mb-2">
                {t('boss.pirate.legend')}
              </p>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-pixel">
                <span className="text-[#00d4ff]">&#9632; {t('boss.pirate.legendAgent')}</span>
                <span className="text-[#f87171]">&#9632; {t('boss.pirate.legendPirate')}</span>
                <span className="text-[#ffd700]">&#9679; {t('boss.pirate.legendCoin')}</span>
                <span className="text-[#4ade80]">&#9632; {t('boss.pirate.legendExit')}</span>
                <span className="text-[#4a5d6f]">&#9632; {t('boss.pirate.legendWall')}</span>
                <span className="text-[#ffa500]">&#9632; {t('boss.pirate.legendTreasure')}</span>
              </div>
            </PixelPanel>
          )}
        </div>
      </div>

      {/* Back button (always available) */}
      <PixelButton
        size="sm"
        variant="secondary"
        className="mt-8"
        onClick={onReturn}
      >
        &larr; {t('common.back')}
      </PixelButton>
    </div>
  );
}

/*
 * ====================================================================
 * i18n keys used by this component
 * Add these to src/i18n/en.json and src/i18n/zh.json under "boss.pirate"
 * ====================================================================
 *
 * EN:
 *   boss.pirate.title            = "BOSS: The Greedy Pirate"
 *   boss.pirate.name             = "The Greedy Pirate"
 *   boss.pirate.dialogue1        = "I always grab the closest gold! No one can out-earn me!"
 *   boss.pirate.dialogue2        = "You think your fancy 'learning' can beat my instincts? Bring it on!"
 *   boss.pirate.challengeTitle   = "The Challenge"
 *   boss.pirate.challengeDesc    = "Train a Q-Learning agent to earn more total gold than the Greedy Pirate on a maze with hidden treasure."
 *   boss.pirate.watchPirate      = "Watch the Pirate Go!"
 *   boss.pirate.pirateRunning    = "The Pirate is running..."
 *   boss.pirate.pirateRunDesc    = "Watch: the pirate grabs every nearby coin without thinking ahead."
 *   boss.pirate.step             = "Step"
 *   boss.pirate.pirateScore      = "Pirate's Total Reward"
 *   boss.pirate.pirateExplain    = "The pirate grabbed every nearby coin, but missed the big treasure. Can you do better?"
 *   boss.pirate.trainAgent       = "Time to Train Your Agent!"
 *   boss.pirate.hyperparameters  = "Hyperparameters"
 *   boss.pirate.learningRate     = "Learning Rate"
 *   boss.pirate.discountFactor   = "Discount Factor (Patience)"
 *   boss.pirate.explorationRate  = "Exploration Rate"
 *   boss.pirate.training         = "Training"
 *   boss.pirate.episodes         = "Episodes Trained"
 *   boss.pirate.reward           = "Reward"
 *   boss.pirate.episode          = "Episode"
 *   boss.pirate.pirateLine       = "Pirate"
 *   boss.pirate.startRace        = "Challenge the Pirate!"
 *   boss.pirate.trainMin         = "Train at least 10 episodes first"
 *   boss.pirate.yourAgent        = "Your Agent"
 *   boss.pirate.thePirate        = "Greedy Pirate"
 *   boss.pirate.victory          = "You Win!"
 *   boss.pirate.defeat           = "The Pirate Wins..."
 *   boss.pirate.victoryMessage   = "Your agent learned that patience beats greed! Long-term thinking led to the big treasure."
 *   boss.pirate.defeatMessage    = "The pirate wins this time. Try training longer, or increase the Discount Factor so your agent values future rewards more!"
 *   boss.pirate.cardUnlock       = "Card Unlocked"
 *   boss.pirate.cardName         = "The Patient Strategist"
 *   boss.pirate.claimReward      = "Claim Reward"
 *   boss.pirate.victoryFinal     = "Boss Defeated!"
 *   boss.pirate.lessonLearned    = "The secret: an agent that values the future can outperform one that only grabs what's right in front of it."
 *   boss.pirate.continue         = "Continue Voyage"
 *   boss.pirate.playAgain        = "Play Again (Free!)"
 *   boss.pirate.legend           = "Legend"
 *   boss.pirate.legendAgent      = "Your Agent"
 *   boss.pirate.legendPirate     = "Pirate"
 *   boss.pirate.legendCoin       = "Gold Coin"
 *   boss.pirate.legendExit       = "Exit"
 *   boss.pirate.legendWall       = "Wall"
 *   boss.pirate.legendTreasure   = "Big Treasure"
 *
 * ZH:
 *   boss.pirate.title            = "BOSS：贪婪海盗"
 *   boss.pirate.name             = "贪婪海盗"
 *   boss.pirate.dialogue1        = "我总是抓最近的金子！没人能比我赚更多！"
 *   boss.pirate.dialogue2        = "你觉得你那套花哨的'学习'能打败我的直觉？来吧！"
 *   boss.pirate.challengeTitle   = "挑战"
 *   boss.pirate.challengeDesc    = "训练一个Q学习智能体，在有隐藏宝藏的迷宫中赚取比贪婪海盗更多的金币。"
 *   boss.pirate.watchPirate      = "看海盗出发！"
 *   boss.pirate.pirateRunning    = "海盗正在跑..."
 *   boss.pirate.pirateRunDesc    = "看：海盗抓取每个附近的金币，完全不考虑长远。"
 *   boss.pirate.step             = "步数"
 *   boss.pirate.pirateScore      = "海盗总奖励"
 *   boss.pirate.pirateExplain    = "海盗抓了每个附近的金币，但错过了大宝藏。你能做得更好吗？"
 *   boss.pirate.trainAgent       = "训练你的智能体！"
 *   boss.pirate.hyperparameters  = "超参数"
 *   boss.pirate.learningRate     = "学习率"
 *   boss.pirate.discountFactor   = "折扣因子（耐心度）"
 *   boss.pirate.explorationRate  = "探索率"
 *   boss.pirate.training         = "训练"
 *   boss.pirate.episodes         = "已训练轮数"
 *   boss.pirate.reward           = "奖励"
 *   boss.pirate.episode          = "轮次"
 *   boss.pirate.pirateLine       = "海盗"
 *   boss.pirate.startRace        = "挑战海盗！"
 *   boss.pirate.trainMin         = "先训练至少10轮"
 *   boss.pirate.yourAgent        = "你的智能体"
 *   boss.pirate.thePirate        = "贪婪海盗"
 *   boss.pirate.victory          = "你赢了！"
 *   boss.pirate.defeat           = "海盗赢了..."
 *   boss.pirate.victoryMessage   = "你的智能体学会了耐心胜过贪婪！长远思考找到了大宝藏。"
 *   boss.pirate.defeatMessage    = "海盗这次赢了。试着训练更久，或者提高折扣因子让智能体更重视未来奖励！"
 *   boss.pirate.cardUnlock       = "卡牌解锁"
 *   boss.pirate.cardName         = "耐心的策略师"
 *   boss.pirate.claimReward      = "领取奖励"
 *   boss.pirate.victoryFinal     = "Boss已击败！"
 *   boss.pirate.lessonLearned    = "秘密：一个重视未来的智能体，能打败只看眼前的贪心者。"
 *   boss.pirate.continue         = "继续航行"
 *   boss.pirate.playAgain        = "再玩一次（免费！）"
 *   boss.pirate.legend           = "图例"
 *   boss.pirate.legendAgent      = "你的智能体"
 *   boss.pirate.legendPirate     = "海盗"
 *   boss.pirate.legendCoin       = "金币"
 *   boss.pirate.legendExit       = "出口"
 *   boss.pirate.legendWall       = "墙壁"
 *   boss.pirate.legendTreasure   = "大宝藏"
 */
