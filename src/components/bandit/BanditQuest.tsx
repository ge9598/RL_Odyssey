import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider, SpeedControl } from '@/components/ui';
import { TreasureChests } from '@/environments/TreasureChests';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { BanditAlgorithm, BanditEnvironment } from '@/algorithms/bandit';
import { SeededRandom } from '@/utils/seededRandom';
import type { BountyRank, QuestResult } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';
import type { PortStepProps } from '@/config/ports';

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestPhase = 'briefing' | 'config' | 'running' | 'shift' | 'results';

// ─── Constants ──────────────────────────────────────────────────────────────
const NUM_CHESTS = 5;
const TOTAL_TURNS = 100;
const SHIFT_AT = 50;
const RANDOM_RUNS = 10;
const BASE_GOLD = 300; // base gold for B rank

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepDelay(speed: number): number {
  switch (speed) {
    case 1: return 300;
    case 2: return 120;
    case 5: return 40;
    case 10: return 10;
    default: return 300;
  }
}

function computeRandomBaseline(seed: number): number {
  // Run RANDOM_RUNS simulations of a random strategy and average the total rewards
  let totalSum = 0;
  for (let run = 0; run < RANDOM_RUNS; run++) {
    const rng = new SeededRandom(seed + run * 1000);
    const env = new BanditEnvironment(NUM_CHESTS, seed + run * 2000);
    let runTotal = 0;
    for (let t = 0; t < TOTAL_TURNS; t++) {
      if (t === SHIFT_AT) env.shift();
      const arm = rng.nextInt(0, NUM_CHESTS - 1);
      runTotal += env.pull(arm);
    }
    totalSum += runTotal;
  }
  return totalSum / RANDOM_RUNS;
}

function computeRank(ratio: number): BountyRank {
  if (ratio >= 2.5) return 'S';
  if (ratio >= 2.0) return 'A';
  if (ratio >= 1.5) return 'B';
  if (ratio >= 1.1) return 'C';
  return 'C'; // even below 1.1 gives C, but passed = false below
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

export function BanditQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();

  // Quest seed for reproducibility (initialized once on mount via effect)
  const questSeed = useRef(0);

  // Phase
  const [phase, setPhase] = useState<QuestPhase>('briefing');

  // Configuration
  const [strategy, setStrategy] = useState(0);
  const [epsilon, setEpsilon] = useState(0.15);
  const [ucbC, setUcbC] = useState(2.0);

  // Runtime state
  const agentRef = useRef<BanditAlgorithm | null>(null);
  const envRef = useRef<BanditEnvironment | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [hasShifted, setHasShifted] = useState(false);
  const [showShiftBanner, setShowShiftBanner] = useState(false);

  // Viz state
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [chestRewards, setChestRewards] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [chestCounts, setChestCounts] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [chestValues, setChestValues] = useState<number[]>(new Array(NUM_CHESTS).fill(0));
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);
  const [cumulativeRewards, setCumulativeRewards] = useState<number[]>([]);

  // Results
  const [result, setResult] = useState<QuestResult | null>(null);
  const [randomBaseline, setRandomBaseline] = useState(0);

  // Keep refs in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Initialize seed and compute baseline on mount
  useEffect(() => {
    questSeed.current = Date.now();
    const baseline = computeRandomBaseline(questSeed.current);
    setRandomBaseline(baseline);
  }, []);

  // Sync viz from algorithm
  const syncState = useCallback(() => {
    const agent = agentRef.current;
    if (!agent) return;
    const viz = agent.getVisualizationData();
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

  // Single step
  const doStep = useCallback((): boolean => {
    const agent = agentRef.current;
    const env = envRef.current;
    if (!agent || !env) return false;

    const viz = agent.getVisualizationData();
    const currentSteps = (viz.data as { totalSteps: number }).totalSteps;
    if (currentSteps >= TOTAL_TURNS) return false;

    // Shift at turn 50
    if (currentSteps === SHIFT_AT && !hasShifted) {
      env.shift();
      setHasShifted(true);
      setShowShiftBanner(true);
      // Auto-hide banner after 2 seconds
      setTimeout(() => setShowShiftBanner(false), 2500);
    }

    const { action } = agent.step(0);
    const reward = env.pull(action);
    agent.update({ state: 0, action, reward, nextState: 0, done: false });
    syncState();

    // Check if quest is done
    const newViz = agent.getVisualizationData();
    const newSteps = (newViz.data as { totalSteps: number }).totalSteps;
    if (newSteps >= TOTAL_TURNS) {
      // Compute results
      const cumData = newViz.data as { cumulativeRewards: number[] };
      const totalReward = cumData.cumulativeRewards[cumData.cumulativeRewards.length - 1] ?? 0;
      const ratio = randomBaseline > 0 ? totalReward / randomBaseline : 1;
      const rank = computeRank(ratio);
      const passed = ratio >= 1.1;
      const gold = Math.floor(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);

      setResult({ passed, rank, score: totalReward, gold });
      setPhase('results');
      isRunningRef.current = false;
      setIsRunning(false);
      return false;
    }

    return true;
  }, [hasShifted, randomBaseline, syncState]);

  // mutable ref for doStep so the loop always uses latest
  const doStepRef = useRef(doStep);
  useEffect(() => { doStepRef.current = doStep; }, [doStep]);

  // Auto-run loop — store the loop body in a ref so we can recurse safely
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
  }, [doStep]);

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
    doStep();
  }, [doStep]);

  const handleReset = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase('config');
    setStepCount(0);
    setHasShifted(false);
    setShowShiftBanner(false);
    setSelectedChest(null);
    setChestRewards(new Array(NUM_CHESTS).fill(0));
    setChestCounts(new Array(NUM_CHESTS).fill(0));
    setChestValues(new Array(NUM_CHESTS).fill(0));
    setRewardHistory([]);
    setCumulativeRewards([]);
    setResult(null);
    agentRef.current = null;
    envRef.current = null;
  }, []);

  // Start the quest run
  const startQuest = useCallback(() => {
    questSeed.current = Date.now();
    const baseline = computeRandomBaseline(questSeed.current);
    setRandomBaseline(baseline);

    const agent = new BanditAlgorithm(questSeed.current + 999);
    agent.setHyperparameter('strategy', strategy);
    agent.setHyperparameter('epsilon', epsilon);
    agent.setHyperparameter('ucbC', ucbC);
    agentRef.current = agent;

    envRef.current = new BanditEnvironment(NUM_CHESTS, questSeed.current);

    setStepCount(0);
    setHasShifted(false);
    setShowShiftBanner(false);
    setSelectedChest(null);
    setChestRewards(new Array(NUM_CHESTS).fill(0));
    setChestCounts(new Array(NUM_CHESTS).fill(0));
    setChestValues(new Array(NUM_CHESTS).fill(0));
    setRewardHistory([]);
    setCumulativeRewards([]);
    setResult(null);
    setPhase('running');
  }, [strategy, epsilon, ucbC]);

  // Retry the quest
  const handleRetry = useCallback(() => {
    handleReset();
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
          <div className="text-5xl mb-4 animate-float">
            <span role="img" aria-label="treasure">🏴‍☠️</span>
          </div>
          <h3 className="font-pixel text-base text-[#ffd700] glow-gold mb-3">
            {t('value.bandit.quest')}
          </h3>
          <p className="font-body text-xl text-[#e2e8f0] mb-4 max-w-lg mx-auto">
            {t('bandit.quest.briefing')}
          </p>
          <div className="glass-panel pixel-border p-4 max-w-md mx-auto mb-4">
            <ul className="text-left font-body text-base text-[#e2e8f0] space-y-2">
              <li>
                <span className="text-[#ffd700]">{'>'}</span> {t('bandit.quest.rule1')}
              </li>
              <li>
                <span className="text-[#ffd700]">{'>'}</span> {t('bandit.quest.rule2')}
              </li>
              <li>
                <span className="text-[#f87171]">{'!'}</span> {t('bandit.quest.rule3')}
              </li>
            </ul>
          </div>
          <PixelButton onClick={() => setPhase('config')}>
            {t('bandit.quest.configure')} →
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  // ─── RENDER: CONFIG ───────────────────────────────────────────────────

  if (phase === 'config') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
        <PixelPanel title={t('bandit.quest.configTitle')}>
          <p className="font-body text-base text-[#e2e8f0] mb-4">
            {t('bandit.quest.configDesc')}
          </p>

          {/* Strategy toggle */}
          <div className="mb-4">
            <span className="font-pixel text-[11px] text-[#708090] block mb-2">
              {t('bandit.watch.strategy')}
            </span>
            <div className="flex gap-2">
              <PixelButton
                size="sm"
                variant={strategy === 0 ? 'primary' : 'secondary'}
                onClick={() => setStrategy(0)}
              >
                {t('bandit.watch.epsilonGreedy')}
              </PixelButton>
              <PixelButton
                size="sm"
                variant={strategy === 1 ? 'primary' : 'secondary'}
                onClick={() => setStrategy(1)}
              >
                UCB
              </PixelButton>
            </div>
          </div>

          {/* Hyperparameter sliders */}
          <div className="max-w-sm space-y-3 mb-6">
            {strategy === 0 && (
              <PixelSlider
                label={`Epsilon (\u03B5)`}
                value={epsilon}
                min={0.01}
                max={1.0}
                step={0.01}
                onChange={setEpsilon}
              />
            )}
            {strategy === 1 && (
              <PixelSlider
                label="UCB Exploration (c)"
                value={ucbC}
                min={0.1}
                max={5.0}
                step={0.1}
                onChange={setUcbC}
              />
            )}
          </div>

          {/* Tip */}
          <div className="glass-panel pixel-border p-3 mb-6">
            <p className="font-body text-sm text-[#00d4ff]">
              {strategy === 0
                ? t('bandit.quest.tipEpsilon')
                : t('bandit.quest.tipUCB')}
            </p>
          </div>

          <div className="flex justify-center">
            <PixelButton size="lg" variant="gold" onClick={startQuest}>
              {t('bandit.quest.startQuest')}
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    );
  }

  // ─── RENDER: RUNNING ──────────────────────────────────────────────────

  if (phase === 'running') {
    // Per-step average for the baseline line
    const avgRandomPerStep = randomBaseline > 0 ? randomBaseline / TOTAL_TURNS : 5;

    return (
      <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto relative">
        {/* Shift banner overlay */}
        {showShiftBanner && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="glass-panel pixel-border-gold p-8 text-center animate-float glow-box-gold">
              <p className="font-pixel text-base text-[#ffd700] glow-gold">
                {t('bandit.quest.shiftBanner')}
              </p>
              <p className="font-body text-lg text-[#e2e8f0] mt-2">
                {t('bandit.quest.shiftDesc')}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <PixelPanel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-pixel text-sm text-[#ffd700] glow-gold">
                {t('value.bandit.quest')}
              </h3>
            </div>
            <div className="flex gap-6 items-center">
              <div className="text-center">
                <span className="font-pixel text-[10px] text-[#708090] block">
                  {t('bandit.quest.turn')}
                </span>
                <span className={`font-pixel text-sm ${stepCount >= SHIFT_AT ? 'text-[#f87171]' : 'text-[#00d4ff]'} glow-accent`}>
                  {stepCount}/{TOTAL_TURNS}
                </span>
              </div>
              <div className="text-center">
                <span className="font-pixel text-[10px] text-[#708090] block">
                  {t('common.gold')}
                </span>
                <span className="font-pixel text-sm text-[#ffd700] glow-gold">
                  {cumulativeRewards.length > 0
                    ? cumulativeRewards[cumulativeRewards.length - 1].toFixed(1)
                    : '0'}
                </span>
              </div>
              {hasShifted && (
                <div className="text-center">
                  <span className="font-pixel text-[10px] text-[#f87171] block">
                    {t('bandit.quest.shifted')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </PixelPanel>

        {/* Chests */}
        <PixelPanel className="!p-2">
          <TreasureChests
            numChests={NUM_CHESTS}
            selectedChest={selectedChest}
            chestRewards={chestRewards}
            chestCounts={chestCounts}
            chestValues={chestValues}
            isAnimating={false}
            mode="quest"
            highlightChest={selectedChest ?? undefined}
          />
        </PixelPanel>

        {/* Chart */}
        <PixelPanel title={t('bandit.watch.rewardChart')}>
          <RewardChart
            data={rewardHistory}
            cumulativeData={cumulativeRewards}
            showCumulative
            showAverage
            baselineScore={avgRandomPerStep}
            height={160}
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
    const ratio = randomBaseline > 0 ? result.score / randomBaseline : 1;

    return (
      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
        <PixelPanel variant={result.rank === 'S' || result.rank === 'A' ? 'gold' : 'default'} className="text-center">
          {/* Big rank display */}
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
              ? t('bandit.quest.passed')
              : t('bandit.quest.failed')}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="glass-panel pixel-border p-3 text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('bandit.quest.yourScore')}
              </span>
              <span className="font-pixel text-sm text-[#ffd700] glow-gold">
                {result.score.toFixed(1)}
              </span>
            </div>
            <div className="glass-panel pixel-border p-3 text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('bandit.quest.randomScore')}
              </span>
              <span className="font-pixel text-sm text-[#708090]">
                {randomBaseline.toFixed(1)}
              </span>
            </div>
            <div className="glass-panel pixel-border p-3 text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">
                {t('bandit.quest.ratio')}
              </span>
              <span className="font-pixel text-sm text-[#00d4ff] glow-accent">
                {ratio.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Gold earned */}
          <div className="glass-panel pixel-border-gold p-4 max-w-xs mx-auto mb-6">
            <span className="font-pixel text-[10px] text-[#708090] block">
              {t('bandit.quest.goldEarned')}
            </span>
            <span className="font-pixel text-xl text-[#ffd700] glow-gold">
              +{result.gold}
            </span>
          </div>

          {/* Reward chart recap */}
          <div className="mb-6">
            <RewardChart
              data={rewardHistory}
              cumulativeData={cumulativeRewards}
              showCumulative
              showAverage
              baselineScore={randomBaseline > 0 ? randomBaseline / TOTAL_TURNS : undefined}
              height={140}
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

  // Fallback
  return null;
}

/*
 * ── i18n KEYS NEEDED ──
 *
 * English:
 * bandit.quest.briefing     = "Your quest: Earn as much gold as possible in 100 turns! Choose your strategy wisely — the chests hide a secret..."
 * bandit.quest.rule1        = "5 treasure chests, each with a hidden payout rate"
 * bandit.quest.rule2        = "100 turns to maximize your total gold"
 * bandit.quest.rule3        = "TWIST: Chest payouts CHANGE at turn 50!"
 * bandit.quest.configure    = "Choose Your Strategy"
 * bandit.quest.configTitle  = "Configure Your Algorithm"
 * bandit.quest.configDesc   = "Pick a strategy and tune its settings. Then send your algorithm on the quest!"
 * bandit.quest.tipEpsilon   = "Tip: A moderate epsilon (10-20%) balances exploration and exploitation. Too low and you'll miss changes at turn 50!"
 * bandit.quest.tipUCB       = "Tip: UCB automatically explores uncertain chests. A moderate c (1-3) usually works well."
 * bandit.quest.startQuest   = "Start Quest!"
 * bandit.quest.turn         = "Turn"
 * bandit.quest.shifted      = "Shifted!"
 * bandit.quest.shiftBanner  = "The tides have changed!"
 * bandit.quest.shiftDesc    = "Chest payouts have shifted! Can your algorithm adapt?"
 * bandit.quest.passed       = "Quest Complete! Your algorithm outsmarted random chance."
 * bandit.quest.failed       = "Not quite there. Try different settings and retry — it's free!"
 * bandit.quest.yourScore    = "Your Score"
 * bandit.quest.randomScore  = "Random"
 * bandit.quest.ratio        = "Ratio"
 * bandit.quest.goldEarned   = "Gold Earned"
 *
 * Chinese:
 * bandit.quest.briefing     = "你的任务：在100回合内赚取尽可能多的金币！明智地选择你的策略——宝箱藏着秘密..."
 * bandit.quest.rule1        = "5个宝箱，每个有隐藏的支付率"
 * bandit.quest.rule2        = "100回合来最大化总金币"
 * bandit.quest.rule3        = "转折：宝箱支付率在第50回合会改变！"
 * bandit.quest.configure    = "选择你的策略"
 * bandit.quest.configTitle  = "配置你的算法"
 * bandit.quest.configDesc   = "选一个策略并调整参数。然后让你的算法去冒险！"
 * bandit.quest.tipEpsilon   = "提示：适中的 epsilon（10-20%）能平衡探索和利用。太低的话在第50回合变化时会吃亏！"
 * bandit.quest.tipUCB       = "提示：UCB 会自动探索不确定的宝箱。适中的 c（1-3）通常效果很好。"
 * bandit.quest.startQuest   = "开始任务！"
 * bandit.quest.turn         = "回合"
 * bandit.quest.shifted      = "已变化！"
 * bandit.quest.shiftBanner  = "风向变了！"
 * bandit.quest.shiftDesc    = "宝箱的支付率已经改变了！你的算法能适应吗？"
 * bandit.quest.passed       = "任务完成！你的算法打败了随机策略。"
 * bandit.quest.failed       = "还差一点。试试不同的设置，重试是免费的！"
 * bandit.quest.yourScore    = "你的分数"
 * bandit.quest.randomScore  = "随机"
 * bandit.quest.ratio        = "倍率"
 * bandit.quest.goldEarned   = "获得金币"
 */
