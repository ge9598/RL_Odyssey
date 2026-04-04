import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider, SpeedControl } from '@/components/ui';
import { TreasureChests } from '@/environments/TreasureChests';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { BanditAlgorithm, BanditEnvironment } from '@/algorithms/bandit';
import type { PortStepProps } from '@/config/ports';

// ─── Types ──────────────────────────────────────────────────────────────────

// ─── Constants ──────────────────────────────────────────────────────────────
const NUM_CHESTS = 5;
const MAX_STEPS = 200;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepDelay(speed: number): number {
  switch (speed) {
    case 1: return 400;
    case 2: return 200;
    case 5: return 80;
    case 10: return 20;
    default: return 400;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BanditWatch({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();

  // Algorithm and environment
  const agentRef = useRef(new BanditAlgorithm(99));
  const envRef = useRef(new BanditEnvironment(NUM_CHESTS, 54321));

  // Playback state
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [stepCount, setStepCount] = useState(0);
  const isRunningRef = useRef(false);
  const speedRef = useRef(1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Viz state from algorithm
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [chestRewards, setChestRewards] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [chestCounts, setChestCounts] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [chestValues, setChestValues] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);
  const [cumulativeRewards, setCumulativeRewards] = useState<number[]>([]);

  // Hyperparameters (mirrored for UI)
  const [strategy, setStrategy] = useState(0);
  const [epsilon, setEpsilon] = useState(0.1);
  const [ucbC, setUcbC] = useState(2.0);

  // Keep speedRef in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Sync viz state from the algorithm
  const syncState = useCallback(() => {
    const viz = agentRef.current.getVisualizationData();
    const d = viz.data as {
      values: number[];
      counts: number[];
      totalSteps: number;
      lastAction: number;
      lastReward: number;
      rewardHistory: number[];
      cumulativeRewards: number[];
    };
    setChestValues(d.values);
    setChestCounts(d.counts);
    setStepCount(d.totalSteps);
    setSelectedChest(d.lastAction >= 0 ? d.lastAction : null);
    setRewardHistory(d.rewardHistory);
    setCumulativeRewards(d.cumulativeRewards);
    if (d.lastAction >= 0) {
      setChestRewards((prev) => {
        const next = [...prev];
        next[d.lastAction] = d.lastReward;
        return next;
      });
    }
  }, []);

  // Execute a single step
  const doStep = useCallback(() => {
    const agent = agentRef.current;
    const env = envRef.current;

    const viz = agent.getVisualizationData();
    const currentSteps = (viz.data as { totalSteps: number }).totalSteps;
    if (currentSteps >= MAX_STEPS) {
      setIsRunning(false);
      isRunningRef.current = false;
      return;
    }

    const { action } = agent.step(0);
    const reward = env.pull(action);
    agent.update({ state: 0, action, reward, nextState: 0, done: false });
    syncState();
  }, [syncState]);

  // Auto-run loop — store the loop body in a ref so we can recurse safely
  const doStepRef = useRef(doStep);
  useEffect(() => { doStepRef.current = doStep; }, [doStep]);

  const runLoopRef = useRef<() => void>(() => {});
  useEffect(() => {
    runLoopRef.current = () => {
      if (!isRunningRef.current) return;
      doStepRef.current();
      const viz = agentRef.current.getVisualizationData();
      const currentSteps = (viz.data as { totalSteps: number }).totalSteps;
      if (currentSteps >= MAX_STEPS) {
        setIsRunning(false);
        isRunningRef.current = false;
        return;
      }
      timeoutRef.current = setTimeout(() => runLoopRef.current(), getStepDelay(speedRef.current));
    };
  }, [doStep]);

  // Toggle play/pause
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

  // Single step
  const handleStep = useCallback(() => {
    doStep();
  }, [doStep]);

  // Reset
  const handleReset = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    agentRef.current = new BanditAlgorithm(99);
    agentRef.current.setHyperparameter('strategy', strategy);
    agentRef.current.setHyperparameter('epsilon', epsilon);
    agentRef.current.setHyperparameter('ucbC', ucbC);

    envRef.current = new BanditEnvironment(NUM_CHESTS, 54321);

    setSelectedChest(null);
    setChestRewards(new Array(NUM_CHESTS).fill(0));
    setChestCounts(new Array(NUM_CHESTS).fill(0));
    setChestValues(new Array(NUM_CHESTS).fill(0));
    setRewardHistory([]);
    setCumulativeRewards([]);
    setStepCount(0);
  }, [strategy, epsilon, ucbC]);

  // Hyperparameter change handlers
  const handleStrategyChange = useCallback((val: number) => {
    setStrategy(val);
    agentRef.current.setHyperparameter('strategy', val);
  }, []);

  const handleEpsilonChange = useCallback((val: number) => {
    setEpsilon(val);
    agentRef.current.setHyperparameter('epsilon', val);
  }, []);

  const handleUcbCChange = useCallback((val: number) => {
    setUcbC(val);
    agentRef.current.setHyperparameter('ucbC', val);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reachedEnd = stepCount >= MAX_STEPS;

  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
      {/* Header */}
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">
              {t('bandit.watch.title')}
            </h3>
            <p className="font-body text-base text-[#e2e8f0]">
              {t('bandit.watch.desc')}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('common.step')}
              </span>
              <span className="font-pixel text-sm text-[#00d4ff] glow-accent">
                {stepCount}/{MAX_STEPS}
              </span>
            </div>
          </div>
        </div>
      </PixelPanel>

      {/* Main area: chests + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chests - takes 2 cols */}
        <div className="lg:col-span-2">
          <PixelPanel className="!p-2">
            <TreasureChests
              numChests={NUM_CHESTS}
              selectedChest={selectedChest}
              chestRewards={chestRewards}
              chestCounts={chestCounts}
              chestValues={chestValues}
              isAnimating={false}
              mode="auto"
              highlightChest={selectedChest ?? undefined}
            />
          </PixelPanel>
        </div>

        {/* Controls panel */}
        <div className="flex flex-col gap-4">
          <PixelPanel title={t('bandit.watch.controls')}>
            <div className="flex flex-col gap-3">
              {/* Strategy toggle */}
              <div>
                <span className="font-pixel text-[10px] text-[#708090] block mb-1">
                  {t('bandit.watch.strategy')}
                </span>
                <div className="flex gap-2">
                  <PixelButton
                    size="sm"
                    variant={strategy === 0 ? 'primary' : 'secondary'}
                    onClick={() => handleStrategyChange(0)}
                  >
                    {t('bandit.watch.epsilonGreedy')}
                  </PixelButton>
                  <PixelButton
                    size="sm"
                    variant={strategy === 1 ? 'primary' : 'secondary'}
                    onClick={() => handleStrategyChange(1)}
                  >
                    UCB
                  </PixelButton>
                </div>
              </div>

              {/* Epsilon slider (only for epsilon-greedy) */}
              {strategy === 0 && (
                <PixelSlider
                  label={`Epsilon (\u03B5)`}
                  value={epsilon}
                  min={0.01}
                  max={1.0}
                  step={0.01}
                  onChange={handleEpsilonChange}
                />
              )}

              {/* UCB-c slider (only for UCB) */}
              {strategy === 1 && (
                <PixelSlider
                  label="UCB c"
                  value={ucbC}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onChange={handleUcbCChange}
                />
              )}
            </div>
          </PixelPanel>
        </div>
      </div>

      {/* Reward Chart */}
      <PixelPanel title={t('bandit.watch.rewardChart')}>
        <RewardChart
          data={rewardHistory}
          cumulativeData={cumulativeRewards}
          showCumulative
          showAverage
          height={180}
        />
      </PixelPanel>

      {/* Speed controls */}
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
              {t('bandit.watch.seenEnough')} →
            </PixelButton>
          )}
          {!reachedEnd && (
            <PixelButton variant="secondary" onClick={onComplete}>
              {t('bandit.watch.seenEnough')} →
            </PixelButton>
          )}
        </div>
      </div>
    </div>
  );
}

/*
 * ── i18n KEYS NEEDED ──
 *
 * English:
 * bandit.watch.title        = "Watch It Learn"
 * bandit.watch.desc         = "The algorithm picks chests on its own. Watch the values update in real-time!"
 * bandit.watch.controls     = "Controls"
 * bandit.watch.strategy     = "Strategy"
 * bandit.watch.epsilonGreedy = "ε-Greedy"
 * bandit.watch.rewardChart  = "Reward Chart"
 * bandit.watch.seenEnough   = "I've Seen Enough"
 *
 * Chinese:
 * bandit.watch.title        = "观察学习"
 * bandit.watch.desc         = "算法自己选择宝箱。实时观察价值更新！"
 * bandit.watch.controls     = "控制"
 * bandit.watch.strategy     = "策略"
 * bandit.watch.epsilonGreedy = "ε-贪心"
 * bandit.watch.rewardChart  = "奖励图表"
 * bandit.watch.seenEnough   = "我看够了"
 */
