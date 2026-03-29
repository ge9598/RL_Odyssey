import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider, SpeedControl } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { QTableHeatmap } from '@/components/visualizations/QTableHeatmap';
import { GridWorldEnvironment, QLearningAlgorithm } from '@/algorithms/qlearning';
import type { BountyRank, QuestResult } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

type QuestPhase = 'briefing' | 'manual' | 'config' | 'running' | 'results';

// ─── Constants ──────────────────────────────────────────────────────────────

const CONFIG = GRID_CONFIGS.quest;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MANUAL_MOVES = 20;
const MAX_STEPS_PER_EP = 150;
const DEFAULT_TRAINING_EPISODES = 300;
const BASE_GOLD = 500;

// Quest thresholds: ratio = Q-learning path / player path.
// Lower ratio is better (Q-learning found a shorter path).
const THRESHOLDS: Record<BountyRank, number> = { S: 0.6, A: 0.7, B: 0.85, C: 1.0 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepDelay(speed: number): number {
  switch (speed) {
    case 1: return 80;
    case 2: return 30;
    case 5: return 8;
    case 10: return 1;
    default: return 80;
  }
}

function computeRank(ratio: number): BountyRank {
  if (ratio <= THRESHOLDS.S) return 'S';
  if (ratio <= THRESHOLDS.A) return 'A';
  if (ratio <= THRESHOLDS.B) return 'B';
  return 'C';
}

function getRankColor(rank: BountyRank): string {
  switch (rank) {
    case 'S': return '#ffd700';
    case 'A': return '#00d4ff';
    case 'B': return '#4ade80';
    case 'C': return '#708090';
  }
}

function getRankGlow(rank: BountyRank): string {
  switch (rank) {
    case 'S': return 'glow-gold';
    case 'A': return 'glow-accent';
    default: return '';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QTableQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();

  // Phase
  const [phase, setPhase] = useState<QuestPhase>('briefing');

  // ── Manual play state ────────────────────────────────────────────
  const manualEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const [manualPos, setManualPos] = useState(CONFIG.start);
  const [manualMoves, setManualMoves] = useState(0);
  const [_manualPath, setManualPath] = useState<number[]>([CONFIG.start]);
  const [_manualReward, setManualReward] = useState(0);
  const [manualFinished, setManualFinished] = useState(false);
  const [manualReachedExit, setManualReachedExit] = useState(false);
  const [manualCollected, setManualCollected] = useState<Set<number>>(new Set());
  const [playerPathLength, setPlayerPathLength] = useState(MANUAL_MOVES); // default if they didn't reach exit

  // ── Configuration state ──────────────────────────────────────────
  const [learningRate, setLearningRate] = useState(0.1);
  const [discountFactor, setDiscountFactor] = useState(0.95);
  const [epsilon, setEpsilon] = useState(0.15);
  const [trainingEpisodes, setTrainingEpisodes] = useState(DEFAULT_TRAINING_EPISODES);

  // ── Training state ───────────────────────────────────────────────
  const agentRef = useRef<QLearningAlgorithm | null>(null);
  const trainEnvRef = useRef<GridWorldEnvironment | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(5);
  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStateRef = useRef(CONFIG.start);
  const episodeStepsRef = useRef(0);

  // Viz state during training
  const [trainPlayerPos, setTrainPlayerPos] = useState(CONFIG.start);
  const [trainQTable, setTrainQTable] = useState<number[][]>(
    Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]),
  );
  const [trainEpisodeCount, setTrainEpisodeCount] = useState(0);
  const [trainEpisodeRewards, setTrainEpisodeRewards] = useState<number[]>([]);
  const [trainCollected, setTrainCollected] = useState<Set<number>>(new Set());

  // Results
  const [result, setResult] = useState<QuestResult | null>(null);
  const [qlPath, setQlPath] = useState<number[]>([]);

  // Keep refs in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ── Manual play handler ──────────────────────────────────────────

  const handleManualAction = useCallback((action: number) => {
    if (manualFinished) return;

    const res = manualEnvRef.current.step(manualPos, action);
    setManualPos(res.nextState);
    setManualMoves((p) => p + 1);
    setManualReward((p) => Math.round((p + res.reward) * 10) / 10);
    setManualPath((p) => [...p, res.nextState]);

    if (CONFIG.treasures.includes(res.nextState) && res.reward >= 5) {
      setManualCollected((prev) => {
        const next = new Set(prev);
        next.add(res.nextState);
        return next;
      });
    }

    if (res.done) {
      setManualFinished(true);
      setManualReachedExit(true);
      setPlayerPathLength(manualMoves + 1); // +1 for this move
    } else if (manualMoves + 1 >= MANUAL_MOVES) {
      setManualFinished(true);
      setPlayerPathLength(MANUAL_MOVES);
    }
  }, [manualFinished, manualPos, manualMoves]);

  const handleManualCellClick = useCallback((cellIndex: number) => {
    if (manualFinished) return;
    const env = manualEnvRef.current;
    const [pRow, pCol] = env.toRC(manualPos);
    const [tRow, tCol] = env.toRC(cellIndex);
    const dr = tRow - pRow;
    const dc = tCol - pCol;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    let action = -1;
    if (dr === -1) action = 0;
    else if (dc === 1) action = 1;
    else if (dr === 1) action = 2;
    else if (dc === -1) action = 3;
    if (action >= 0) handleManualAction(action);
  }, [manualFinished, manualPos, handleManualAction]);

  // ── Training step ────────────────────────────────────────────────

  const syncTrainState = useCallback(() => {
    const agent = agentRef.current;
    if (!agent) return;
    const viz = agent.getVisualizationData();
    const d = viz.data as {
      qTable: number[][];
      episodeCount: number;
      episodeRewards: number[];
    };
    setTrainQTable(d.qTable.map((row) => [...row]));
    setTrainEpisodeCount(d.episodeCount);
    setTrainEpisodeRewards([...d.episodeRewards]);
  }, []);

  const doTrainStep = useCallback((): boolean => {
    const agent = agentRef.current;
    const env = trainEnvRef.current;
    if (!agent || !env) return false;

    const viz = agent.getVisualizationData();
    const epCount = (viz.data as { episodeCount: number }).episodeCount;
    if (epCount >= trainingEpisodes) return false;

    const state = currentStateRef.current;
    const { action } = agent.step(state);
    const res = env.step(state, action);

    agent.update({
      state,
      action,
      reward: res.reward,
      nextState: res.nextState,
      done: res.done,
    });

    currentStateRef.current = res.nextState;
    episodeStepsRef.current += 1;
    setTrainPlayerPos(res.nextState);

    if (CONFIG.treasures.includes(res.nextState) && res.reward >= 5) {
      setTrainCollected((prev) => {
        const next = new Set(prev);
        next.add(res.nextState);
        return next;
      });
    }

    if (res.done || episodeStepsRef.current >= MAX_STEPS_PER_EP) {
      const newStart = env.reset();
      currentStateRef.current = newStart;
      episodeStepsRef.current = 0;
      agent.startEpisode();
      setTrainPlayerPos(newStart);
      setTrainCollected(new Set());
    }

    syncTrainState();

    // Check if done
    const newViz = agent.getVisualizationData();
    const newEpCount = (newViz.data as { episodeCount: number }).episodeCount;
    if (newEpCount >= trainingEpisodes) {
      // Training complete — compute results
      finishQuest(agent);
      return false;
    }

    return true;
  }, [trainingEpisodes, syncTrainState]);

  const doTrainStepRef = useRef(doTrainStep);
  useEffect(() => { doTrainStepRef.current = doTrainStep; }, [doTrainStep]);

  // Auto-run loop
  const runLoopRef = useRef<() => void>(() => {});
  useEffect(() => {
    runLoopRef.current = () => {
      if (!isRunningRef.current) return;
      const canContinue = doTrainStepRef.current();
      if (!canContinue) {
        isRunningRef.current = false;
        setIsRunning(false);
        return;
      }
      timeoutRef.current = setTimeout(() => runLoopRef.current(), getStepDelay(speedRef.current));
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (isRunningRef.current) {
      isRunningRef.current = false;
      setIsRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      isRunningRef.current = true;
      setIsRunning(true);
      runLoopRef.current();
    }
  }, []);

  const handleSingleStep = useCallback(() => {
    doTrainStep();
  }, [doTrainStep]);

  const handleReset = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase('config');
    agentRef.current = null;
    trainEnvRef.current = null;
    setTrainPlayerPos(CONFIG.start);
    setTrainQTable(Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]));
    setTrainEpisodeCount(0);
    setTrainEpisodeRewards([]);
    setTrainCollected(new Set());
    setResult(null);
    setQlPath([]);
  }, []);

  // ── Start training ───────────────────────────────────────────────

  const startTraining = useCallback(() => {
    const seed = Date.now();
    const agent = new QLearningAlgorithm(NUM_STATES, 4, seed);
    agent.setHyperparameter('learningRate', learningRate);
    agent.setHyperparameter('discountFactor', discountFactor);
    agent.setHyperparameter('epsilon', epsilon);
    agentRef.current = agent;

    const env = new GridWorldEnvironment(CONFIG);
    trainEnvRef.current = env;
    currentStateRef.current = env.reset();
    episodeStepsRef.current = 0;

    setTrainPlayerPos(CONFIG.start);
    setTrainQTable(Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]));
    setTrainEpisodeCount(0);
    setTrainEpisodeRewards([]);
    setTrainCollected(new Set());
    setResult(null);
    setQlPath([]);
    setPhase('running');
  }, [learningRate, discountFactor, epsilon]);

  // ── Finish quest and compute results ──────────────────────────

  const finishQuest = useCallback((agent: QLearningAlgorithm) => {
    // Get greedy path
    const testEnv = new GridWorldEnvironment(CONFIG);
    testEnv.reset();
    const path = agent.getGreedyPath(CONFIG.start, testEnv, 200);
    setQlPath(path);

    // Check if agent reached exit
    const reachedExit = path[path.length - 1] === CONFIG.exit;
    const qlPathLen = reachedExit ? path.length - 1 : 200; // penalty if didn't reach

    // Compute ratio: lower is better
    const ratio = qlPathLen / playerPathLength;

    // Determine if passed: Q-learning path must be <= player path
    const passed = ratio <= 1.0;
    const rank = computeRank(ratio);
    const gold = Math.floor(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);

    setResult({
      passed,
      rank,
      score: qlPathLen,
      gold: passed ? gold : Math.floor(gold * 0.25),
    });
    setPhase('results');
    isRunningRef.current = false;
    setIsRunning(false);
  }, [playerPathLength]);

  // ── Retry ────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    handleReset();
    // Also reset manual play
    manualEnvRef.current = new GridWorldEnvironment(CONFIG);
    setManualPos(CONFIG.start);
    setManualMoves(0);
    setManualPath([CONFIG.start]);
    setManualReward(0);
    setManualFinished(false);
    setManualReachedExit(false);
    setManualCollected(new Set());
    setPlayerPathLength(MANUAL_MOVES);
    setPhase('manual');
  }, [handleReset]);

  // Cleanup
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ─── RENDER: BRIEFING ─────────────────────────────────────────────────

  if (phase === 'briefing') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
        <PixelPanel variant="gold" className="text-center">
          <div className="text-5xl mb-4 animate-float">{'🏝️'}</div>
          <h3 className="font-pixel text-base text-[#ffd700] glow-gold mb-3">
            {t('value.qtable.quest')}
          </h3>
          <p className="font-body text-xl text-[#e2e8f0] mb-4 max-w-lg mx-auto">
            {t('qtable.quest.briefing')}
          </p>
          <div className="glass-panel pixel-border p-4 max-w-md mx-auto mb-4">
            <ul className="text-left font-body text-base text-[#e2e8f0] space-y-2">
              <li>
                <span className="text-[#ffd700]">{'>'}</span> {t('qtable.quest.rule1')}
              </li>
              <li>
                <span className="text-[#ffd700]">{'>'}</span> {t('qtable.quest.rule2')}
              </li>
              <li>
                <span className="text-[#00d4ff]">{'>'}</span> {t('qtable.quest.rule3')}
              </li>
            </ul>
          </div>
          <PixelButton onClick={() => setPhase('manual')}>
            {t('qtable.quest.startManual')} →
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  // ─── RENDER: MANUAL PLAY ──────────────────────────────────────────────

  if (phase === 'manual') {
    return (
      <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto">
        <PixelPanel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-pixel text-sm text-[#ffd700] glow-gold">
                {t('qtable.quest.manualTitle')}
              </h3>
              <p className="font-body text-base text-[#e2e8f0]">
                {t('qtable.quest.manualDesc')}
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <div className="text-center">
                <span className="font-pixel text-[10px] text-[#708090] block">
                  {t('qtable.feel.movesLeft')}
                </span>
                <span className="font-pixel text-base text-[#ffd700] glow-gold">
                  {MANUAL_MOVES - manualMoves}
                </span>
              </div>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel className="!p-2">
          <GridWorld
            rows={CONFIG.rows}
            cols={CONFIG.cols}
            walls={CONFIG.walls}
            traps={CONFIG.traps}
            treasures={CONFIG.treasures}
            exit={CONFIG.exit}
            playerPos={manualPos}
            collectedTreasures={manualCollected}
            onCellClick={!manualFinished ? handleManualCellClick : undefined}
            onKeyAction={!manualFinished ? handleManualAction : undefined}
            mode="manual"
          />
        </PixelPanel>

        {!manualFinished && (
          <p className="font-body text-sm text-[#708090] text-center">
            {t('qtable.feel.controls')}
          </p>
        )}

        {manualFinished && (
          <PixelPanel variant={manualReachedExit ? 'gold' : 'default'} className="text-center">
            {manualReachedExit ? (
              <p className="font-pixel text-sm text-[#4ade80] mb-2">
                {t('qtable.quest.manualEscaped', { moves: manualMoves })}
              </p>
            ) : (
              <p className="font-pixel text-sm text-[#f87171] mb-2">
                {t('qtable.quest.manualFailed')}
              </p>
            )}
            <p className="font-body text-lg text-[#e2e8f0] mb-4">
              {t('qtable.quest.manualBenchmark', { length: playerPathLength })}
            </p>
            <PixelButton onClick={() => setPhase('config')}>
              {t('qtable.quest.trainNow')} →
            </PixelButton>
          </PixelPanel>
        )}
      </div>
    );
  }

  // ─── RENDER: CONFIG ───────────────────────────────────────────────────

  if (phase === 'config') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
        <PixelPanel title={t('qtable.quest.configTitle')}>
          <p className="font-body text-base text-[#e2e8f0] mb-4">
            {t('qtable.quest.configDesc', { benchmark: playerPathLength })}
          </p>

          <div className="max-w-sm space-y-3 mb-6">
            <PixelSlider
              label={t('qtable.watch.learningRate')}
              value={learningRate}
              min={0.01}
              max={1.0}
              step={0.01}
              onChange={setLearningRate}
            />
            <PixelSlider
              label={t('qtable.watch.discount')}
              value={discountFactor}
              min={0}
              max={1.0}
              step={0.01}
              onChange={setDiscountFactor}
            />
            <PixelSlider
              label={`Epsilon (\u03B5)`}
              value={epsilon}
              min={0}
              max={1.0}
              step={0.01}
              onChange={setEpsilon}
            />
            <PixelSlider
              label={t('qtable.quest.episodes')}
              value={trainingEpisodes}
              min={50}
              max={1000}
              step={50}
              onChange={setTrainingEpisodes}
              displayValue={`${trainingEpisodes}`}
            />
          </div>

          <div className="glass-panel pixel-border p-3 mb-6">
            <p className="font-body text-sm text-[#00d4ff]">
              {t('qtable.quest.tip')}
            </p>
          </div>

          <div className="flex justify-center">
            <PixelButton size="lg" variant="gold" onClick={startTraining}>
              {t('qtable.quest.startTraining')}
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    );
  }

  // ─── RENDER: RUNNING ──────────────────────────────────────────────────

  if (phase === 'running') {
    return (
      <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto">
        {/* Header */}
        <PixelPanel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-pixel text-sm text-[#ffd700] glow-gold">
                {t('value.qtable.quest')}
              </h3>
              <p className="font-body text-sm text-[#e2e8f0]">
                {t('qtable.quest.trainingProgress')}
              </p>
            </div>
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <span className="font-pixel text-[10px] text-[#708090] block">
                  {t('qtable.watch.episode')}
                </span>
                <span className="font-pixel text-sm text-[#00d4ff] glow-accent">
                  {trainEpisodeCount}/{trainingEpisodes}
                </span>
              </div>
              <div className="text-center">
                <span className="font-pixel text-[10px] text-[#708090] block">
                  {t('qtable.quest.yourBenchmark')}
                </span>
                <span className="font-pixel text-sm text-[#ffd700] glow-gold">
                  {playerPathLength} {t('qtable.quest.steps')}
                </span>
              </div>
            </div>
          </div>
        </PixelPanel>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PixelPanel className="!p-2">
              <GridWorld
                rows={CONFIG.rows}
                cols={CONFIG.cols}
                walls={CONFIG.walls}
                traps={CONFIG.traps}
                treasures={CONFIG.treasures}
                exit={CONFIG.exit}
                playerPos={trainPlayerPos}
                qValues={trainQTable}
                showHeatmap
                showArrows
                collectedTreasures={trainCollected}
                mode="auto"
              />
            </PixelPanel>
          </div>

          <div>
            <PixelPanel title={t('qtable.watch.qtableTitle')}>
              <QTableHeatmap
                qTable={trainQTable}
                rows={CONFIG.rows}
                cols={CONFIG.cols}
                walls={CONFIG.walls}
                highlightCell={trainPlayerPos}
                height={180}
              />
            </PixelPanel>
          </div>
        </div>

        {/* Chart */}
        <PixelPanel title={t('qtable.watch.rewardChart')}>
          <RewardChart
            data={trainEpisodeRewards}
            showAverage
            height={140}
          />
        </PixelPanel>

        {/* Controls */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <SpeedControl
            speed={speed}
            isRunning={isRunning}
            onSpeedChange={setSpeed}
            onToggle={handleToggle}
            onStep={handleSingleStep}
            onReset={handleReset}
          />
        </div>
      </div>
    );
  }

  // ─── RENDER: RESULTS ──────────────────────────────────────────────────

  if (phase === 'results' && result) {
    const ratio = playerPathLength > 0 ? result.score / playerPathLength : 1;

    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
        <PixelPanel
          variant={result.rank === 'S' || result.rank === 'A' ? 'gold' : 'default'}
          className="text-center"
        >
          {/* Rank */}
          <div className="mb-4">
            <span
              className={`font-pixel text-6xl ${getRankGlow(result.rank)}`}
              style={{ color: getRankColor(result.rank) }}
            >
              {result.rank}
            </span>
          </div>
          <h3 className="font-pixel text-sm text-[#e2e8f0] mb-1">
            {t(`bounty.rank.${result.rank}`)}
          </h3>
          <p className="font-body text-base text-[#708090] mb-6">
            {result.passed
              ? t('qtable.quest.passed')
              : t('qtable.quest.failed')}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="glass-panel pixel-border p-3 text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('qtable.quest.yourPath')}
              </span>
              <span className="font-pixel text-sm text-[#ffd700] glow-gold">
                {playerPathLength}
              </span>
            </div>
            <div className="glass-panel pixel-border p-3 text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('qtable.quest.qlPath')}
              </span>
              <span className="font-pixel text-sm text-[#00d4ff] glow-accent">
                {result.score}
              </span>
            </div>
            <div className="glass-panel pixel-border p-3 text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('qtable.quest.ratio')}
              </span>
              <span className={`font-pixel text-sm ${ratio <= 1 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                {(ratio * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Gold */}
          <div className="glass-panel pixel-border-gold p-4 max-w-xs mx-auto mb-6">
            <span className="font-pixel text-[10px] text-[#708090] block">
              {t('qtable.quest.goldEarned')}
            </span>
            <span className="font-pixel text-xl text-[#ffd700] glow-gold">
              +{result.gold}
            </span>
          </div>

          {/* Show learned path on grid */}
          <PixelPanel className="!p-2 mb-4">
            <p className="font-body text-xs text-[#708090] mb-2 text-center">
              {t('qtable.quest.learnedPath')}
            </p>
            <GridWorld
              rows={CONFIG.rows}
              cols={CONFIG.cols}
              walls={CONFIG.walls}
              traps={CONFIG.traps}
              treasures={CONFIG.treasures}
              exit={CONFIG.exit}
              playerPos={CONFIG.start}
              qValues={trainQTable}
              showHeatmap
              showArrows
              highlightPath={qlPath}
              mode="auto"
            />
          </PixelPanel>

          {/* Chart */}
          <div className="mb-6">
            <RewardChart
              data={trainEpisodeRewards}
              showAverage
              height={130}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <PixelButton variant="secondary" onClick={handleRetry}>
              {t('common.retry')}
            </PixelButton>
            <PixelButton onClick={onComplete}>
              {t('common.next')} →
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    );
  }

  return null;
}

/*
 * -- i18n KEYS NEEDED --
 *
 * English:
 * qtable.quest.briefing        = "A cursed island with traps, treasure, and a hidden exit. First YOU try to escape, then Q-Learning gives it a shot. Can the algorithm beat your path?"
 * qtable.quest.rule1           = "6x8 grid with walls, traps (-5), treasures (+5), and an exit (+10)"
 * qtable.quest.rule2           = "You get 20 moves to try escaping manually"
 * qtable.quest.rule3           = "Then Q-Learning trains and tries to find a shorter path"
 * qtable.quest.startManual     = "Start Manual Play"
 * qtable.quest.manualTitle     = "Your Turn: Escape the Island!"
 * qtable.quest.manualDesc      = "Navigate to the exit (green F). Use arrow keys or click adjacent cells."
 * qtable.quest.manualEscaped   = "You escaped in {{moves}} moves!"
 * qtable.quest.manualFailed    = "Out of moves! You didn't reach the exit."
 * qtable.quest.manualBenchmark = "Your benchmark: {{length}} steps. Can Q-Learning do better?"
 * qtable.quest.trainNow        = "Train Q-Learning"
 * qtable.quest.configTitle     = "Configure Q-Learning"
 * qtable.quest.configDesc      = "Your benchmark is {{benchmark}} steps. Tune the hyperparameters and see if Q-Learning can find a shorter path!"
 * qtable.quest.episodes        = "Training Episodes"
 * qtable.quest.tip             = "Tip: A learning rate around 0.1-0.3 with discount 0.9-0.99 usually works well. More episodes = better results."
 * qtable.quest.startTraining   = "Start Training!"
 * qtable.quest.trainingProgress = "Q-Learning is training..."
 * qtable.quest.yourBenchmark   = "Your Benchmark"
 * qtable.quest.steps           = "steps"
 * qtable.quest.passed          = "Q-Learning found a shorter path than yours! The algorithm learned the optimal route."
 * qtable.quest.failed          = "Q-Learning couldn't beat your path. Try more episodes or different settings!"
 * qtable.quest.yourPath        = "Your Path"
 * qtable.quest.qlPath          = "Q-Learning Path"
 * qtable.quest.ratio           = "Ratio"
 * qtable.quest.goldEarned      = "Gold Earned"
 * qtable.quest.learnedPath     = "Q-Learning's learned path (highlighted in gold):"
 *
 * Chinese:
 * qtable.quest.briefing        = "一座被诅咒的岛屿，有陷阱、宝藏和隐藏出口。先你来试试逃脱，然后 Q-Learning 来挑战。算法能比你更快吗？"
 * qtable.quest.rule1           = "6x8 网格，有墙壁、陷阱（-5）、宝藏（+5）和出口（+10）"
 * qtable.quest.rule2           = "你有 20 步来尝试手动逃脱"
 * qtable.quest.rule3           = "然后 Q-Learning 训练并尝试找到更短的路径"
 * qtable.quest.startManual     = "开始手动操作"
 * qtable.quest.manualTitle     = "你的回合：逃离岛屿！"
 * qtable.quest.manualDesc      = "导航到出口（绿色 F）。用方向键或点击相邻格子。"
 * qtable.quest.manualEscaped   = "你用了 {{moves}} 步逃出来了！"
 * qtable.quest.manualFailed    = "步数用完了！你没到达出口。"
 * qtable.quest.manualBenchmark = "你的基准：{{length}} 步。Q-Learning 能做得更好吗？"
 * qtable.quest.trainNow        = "训练 Q-Learning"
 * qtable.quest.configTitle     = "配置 Q-Learning"
 * qtable.quest.configDesc      = "你的基准是 {{benchmark}} 步。调整超参数，看看 Q-Learning 能否找到更短的路径！"
 * qtable.quest.episodes        = "训练轮数"
 * qtable.quest.tip             = "提示：学习率 0.1-0.3 配合折扣因子 0.9-0.99 通常效果好。更多轮数 = 更好结果。"
 * qtable.quest.startTraining   = "开始训练！"
 * qtable.quest.trainingProgress = "Q-Learning 正在训练..."
 * qtable.quest.yourBenchmark   = "你的基准"
 * qtable.quest.steps           = "步"
 * qtable.quest.passed          = "Q-Learning 找到了比你更短的路径！算法学会了最优路线。"
 * qtable.quest.failed          = "Q-Learning 没能超过你。试试更多轮数或不同设置！"
 * qtable.quest.yourPath        = "你的路径"
 * qtable.quest.qlPath          = "Q-Learning 路径"
 * qtable.quest.ratio           = "倍率"
 * qtable.quest.goldEarned      = "获得金币"
 * qtable.quest.learnedPath     = "Q-Learning 学到的路径（金色高亮）："
 */
