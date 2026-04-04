import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider, SpeedControl } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { QTableHeatmap } from '@/components/visualizations/QTableHeatmap';
import { GridWorldEnvironment, QLearningAlgorithm } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Constants ──────────────────────────────────────────────────────────────

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_EPISODES = 200;
const MAX_STEPS_PER_EP = 100;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepDelay(speed: number): number {
  switch (speed) {
    case 1: return 120;
    case 2: return 50;
    case 5: return 15;
    case 10: return 2;
    default: return 120;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QTableWatch({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();

  // Algorithm and environment
  const agentRef = useRef(new QLearningAlgorithm(NUM_STATES, 4, 77777));
  const envRef = useRef(new GridWorldEnvironment(CONFIG));

  // Playback state
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current episode state
  const currentStateRef = useRef(CONFIG.start);
  const episodeStepsRef = useRef(0);

  // Viz state
  const [playerPos, setPlayerPos] = useState(CONFIG.start);
  const [qTable, setQTable] = useState<number[][]>(
    Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]),
  );
  const [visitCounts, setVisitCounts] = useState<number[]>(new Array(NUM_STATES).fill(0));
  const [episodeCount, setEpisodeCount] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [episodeRewards, setEpisodeRewards] = useState<number[]>([]);
  const [collectedTreasures, setCollectedTreasures] = useState<Set<number>>(new Set());

  // Hyperparameters
  const [learningRate, setLearningRate] = useState(0.1);
  const [discountFactor, setDiscountFactor] = useState(0.95);
  const [epsilon, setEpsilon] = useState(0.15);

  // Toggle modes
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [showQTable, setShowQTable] = useState(false);

  // Keep speedRef in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Sync viz state from algorithm
  const syncState = useCallback(() => {
    const viz = agentRef.current.getVisualizationData();
    const d = viz.data as {
      qTable: number[][];
      visitCounts: number[];
      totalSteps: number;
      episodeCount: number;
      episodeRewards: number[];
    };
    setQTable(d.qTable.map((row) => [...row]));
    setVisitCounts([...d.visitCounts]);
    setTotalSteps(d.totalSteps);
    setEpisodeCount(d.episodeCount);
    setEpisodeRewards([...d.episodeRewards]);
  }, []);

  // Single step: advance agent by one action within current episode
  const doStep = useCallback((): boolean => {
    const agent = agentRef.current;
    const env = envRef.current;

    const viz = agent.getVisualizationData();
    const currentEpCount = (viz.data as { episodeCount: number }).episodeCount;
    if (currentEpCount >= MAX_EPISODES) return false;

    const state = currentStateRef.current;
    const { action } = agent.step(state);
    const result = env.step(state, action);

    agent.update({
      state,
      action,
      reward: result.reward,
      nextState: result.nextState,
      done: result.done,
    });

    currentStateRef.current = result.nextState;
    episodeStepsRef.current += 1;
    setPlayerPos(result.nextState);

    // Track collected treasures visually
    if (CONFIG.treasures.includes(result.nextState) && result.reward >= 5) {
      setCollectedTreasures((prev) => {
        const next = new Set(prev);
        next.add(result.nextState);
        return next;
      });
    }

    // Episode done or max steps
    if (result.done || episodeStepsRef.current >= MAX_STEPS_PER_EP) {
      // Reset environment for next episode
      const newStart = env.reset();
      currentStateRef.current = newStart;
      episodeStepsRef.current = 0;
      agent.startEpisode();
      setPlayerPos(newStart);
      setCollectedTreasures(new Set());
    }

    syncState();
    return true;
  }, [syncState]);

  // Mutable ref for doStep
  const doStepRef = useRef(doStep);
  useEffect(() => { doStepRef.current = doStep; }, [doStep]);

  // Auto-run loop
  const runLoopRef = useRef<() => void>(() => {});
  useEffect(() => {
    runLoopRef.current = () => {
      if (!isRunningRef.current) return;
      const canContinue = doStepRef.current();
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

  const handleStep = useCallback(() => {
    doStep();
  }, [doStep]);

  const handleReset = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const agent = new QLearningAlgorithm(NUM_STATES, 4, 77777);
    agent.setHyperparameter('learningRate', learningRate);
    agent.setHyperparameter('discountFactor', discountFactor);
    agent.setHyperparameter('epsilon', epsilon);
    agentRef.current = agent;

    envRef.current = new GridWorldEnvironment(CONFIG);
    currentStateRef.current = CONFIG.start;
    episodeStepsRef.current = 0;

    setPlayerPos(CONFIG.start);
    setQTable(Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]));
    setVisitCounts(new Array(NUM_STATES).fill(0));
    setEpisodeCount(0);
    setTotalSteps(0);
    setEpisodeRewards([]);
    setCollectedTreasures(new Set());
  }, [learningRate, discountFactor, epsilon]);

  // Hyperparameter change handlers
  const handleLRChange = useCallback((val: number) => {
    setLearningRate(val);
    agentRef.current.setHyperparameter('learningRate', val);
  }, []);

  const handleGammaChange = useCallback((val: number) => {
    setDiscountFactor(val);
    agentRef.current.setHyperparameter('discountFactor', val);
  }, []);

  const handleEpsilonChange = useCallback((val: number) => {
    setEpsilon(val);
    agentRef.current.setHyperparameter('epsilon', val);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reachedEnd = episodeCount >= MAX_EPISODES;

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto">
      {/* Header */}
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">
              {t('qtable.watch.title')}
            </h3>
            <p className="font-body text-base text-[#e2e8f0]">
              {t('qtable.watch.desc')}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('qtable.watch.episode')}
              </span>
              <span className="font-pixel text-sm text-[#00d4ff] glow-accent">
                {episodeCount}/{MAX_EPISODES}
              </span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('common.step')}
              </span>
              <span className="font-pixel text-sm text-[#e2e8f0]">
                {totalSteps}
              </span>
            </div>
          </div>
        </div>
      </PixelPanel>

      {/* Main area: grid + controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grid World — takes 2 cols */}
        <div className="lg:col-span-2">
          <PixelPanel className="!p-2">
            <GridWorld
              rows={CONFIG.rows}
              cols={CONFIG.cols}
              walls={CONFIG.walls}
              traps={CONFIG.traps}
              treasures={CONFIG.treasures}
              exit={CONFIG.exit}
              playerPos={playerPos}
              qValues={qTable}
              visitCounts={visitCounts}
              showHeatmap={showHeatmap}
              showArrows={showArrows}
              collectedTreasures={collectedTreasures}
              mode="auto"
            />
          </PixelPanel>
        </div>

        {/* Controls panel */}
        <div className="flex flex-col gap-4">
          <PixelPanel title={t('qtable.watch.hyperparams')}>
            <div className="flex flex-col gap-3">
              <PixelSlider
                label={t('qtable.watch.learningRate')}
                value={learningRate}
                min={0.01}
                max={1.0}
                step={0.01}
                onChange={handleLRChange}
              />
              <PixelSlider
                label={t('qtable.watch.discount')}
                value={discountFactor}
                min={0}
                max={1.0}
                step={0.01}
                onChange={handleGammaChange}
              />
              <PixelSlider
                label={`Epsilon (\u03B5)`}
                value={epsilon}
                min={0}
                max={1.0}
                step={0.01}
                onChange={handleEpsilonChange}
              />
            </div>
          </PixelPanel>

          <PixelPanel title={t('qtable.watch.display')}>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="accent-[#00d4ff]"
                />
                <span className="font-body text-sm text-[#e2e8f0]">{t('qtable.watch.heatmap')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArrows}
                  onChange={(e) => setShowArrows(e.target.checked)}
                  className="accent-[#00d4ff]"
                />
                <span className="font-body text-sm text-[#e2e8f0]">{t('qtable.watch.arrows')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showQTable}
                  onChange={(e) => setShowQTable(e.target.checked)}
                  className="accent-[#00d4ff]"
                />
                <span className="font-body text-sm text-[#e2e8f0]">{t('qtable.watch.qtableViz')}</span>
              </label>
            </div>
          </PixelPanel>
        </div>
      </div>

      {/* Q-Table heatmap (toggle) */}
      {showQTable && (
        <PixelPanel title={t('qtable.watch.qtableTitle')}>
          <QTableHeatmap
            qTable={qTable}
            rows={CONFIG.rows}
            cols={CONFIG.cols}
            walls={CONFIG.walls}
            highlightCell={playerPos}
            height={200}
          />
          <p className="font-body text-xs text-[#708090] mt-2 text-center">
            {t('qtable.watch.qtableDesc')}
          </p>
        </PixelPanel>
      )}

      {/* Reward chart */}
      <PixelPanel title={t('qtable.watch.rewardChart')}>
        <RewardChart
          data={episodeRewards}
          showAverage
          height={160}
        />
        <p className="font-body text-xs text-[#708090] mt-1 text-center">
          {t('qtable.watch.rewardDesc')}
        </p>
      </PixelPanel>

      {/* Speed controls + navigation */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <SpeedControl
          speed={speed}
          isRunning={isRunning}
          onSpeedChange={setSpeed}
          onToggle={handleToggle}
          onStep={handleStep}
          onReset={handleReset}
        />

        <div className="flex gap-3">
          {onSkip && (
            <PixelButton size="sm" variant="secondary" onClick={onSkip}>
              {t('common.skip')}
            </PixelButton>
          )}
          {reachedEnd && (
            <PixelButton onClick={onComplete}>
              {t('qtable.watch.seenEnough')} →
            </PixelButton>
          )}
          {!reachedEnd && (
            <PixelButton variant="secondary" onClick={onComplete}>
              {t('qtable.watch.seenEnough')} →
            </PixelButton>
          )}
        </div>
      </div>
    </div>
  );
}

/*
 * -- i18n KEYS NEEDED --
 *
 * English:
 * qtable.watch.title        = "Watch It Learn"
 * qtable.watch.desc         = "Q-Learning explores the grid and builds its treasure map. Watch the Q-values update in real-time!"
 * qtable.watch.episode      = "Episode"
 * qtable.watch.hyperparams  = "Hyperparameters"
 * qtable.watch.learningRate = "Learning Rate (alpha)"
 * qtable.watch.discount     = "Discount Factor (gamma)"
 * qtable.watch.display      = "Display Options"
 * qtable.watch.heatmap      = "Value Heatmap"
 * qtable.watch.arrows       = "Best Action Arrows"
 * qtable.watch.qtableViz    = "Q-Table Detail View"
 * qtable.watch.qtableTitle  = "Q-Table Heatmap"
 * qtable.watch.qtableDesc   = "Each cell is split into 4 triangles (up/right/down/left). Brighter = higher Q-value."
 * qtable.watch.rewardChart  = "Episode Reward"
 * qtable.watch.rewardDesc   = "Total reward per episode. Higher is better — watch it improve over time!"
 * qtable.watch.seenEnough   = "I've Seen Enough"
 *
 * Chinese:
 * qtable.watch.title        = "观察学习"
 * qtable.watch.desc         = "Q-Learning 探索网格并构建寻宝图。实时观察 Q 值更新！"
 * qtable.watch.episode      = "轮次"
 * qtable.watch.hyperparams  = "超参数"
 * qtable.watch.learningRate = "学习率 (alpha)"
 * qtable.watch.discount     = "折扣因子 (gamma)"
 * qtable.watch.display      = "显示选项"
 * qtable.watch.heatmap      = "价值热力图"
 * qtable.watch.arrows       = "最佳动作箭头"
 * qtable.watch.qtableViz    = "Q 表详细视图"
 * qtable.watch.qtableTitle  = "Q 表热力图"
 * qtable.watch.qtableDesc   = "每个格子分为 4 个三角形（上/右/下/左）。越亮 = Q 值越高。"
 * qtable.watch.rewardChart  = "每轮奖励"
 * qtable.watch.rewardDesc   = "每轮的总奖励。越高越好——看它随时间改进！"
 * qtable.watch.seenEnough   = "我看够了"
 */
