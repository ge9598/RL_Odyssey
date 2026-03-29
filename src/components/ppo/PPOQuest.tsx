import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { PPOAlgorithm } from '@/algorithms/ppo';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { BountyRank, QuestResult } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

type QuestPhase = 'briefing' | 'config' | 'training' | 'results';

const CONFIG = GRID_CONFIGS.quest;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_STEPS_PER_EP = 80;
const TRAIN_EPISODES = 300;
const BASE_GOLD = 1100;
const CARD_ID = 'steady-hand';

function getDelay(speed: number) { return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1; }
function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#fb923c' : r === 'B' ? '#4ade80' : '#708090';
}

// Compute std deviation of last N rewards (stability metric)
function computeStability(rewards: number[], window = 30): number {
  const slice = rewards.slice(-window);
  if (slice.length < 5) return 999;
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

export function PPOQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore(s => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [clipEpsilon, setClipEpsilon] = useState(0.2);
  const [actorLR, setActorLR] = useState(0.01);
  const [isRunning, setIsRunning] = useState(false);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const agentRef = useRef<PPOAlgorithm | null>(null);
  const envRef = useRef<GridWorldEnvironment | null>(null);
  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef(0);
  const stepsRef = useRef(0);
  const epRef = useRef(0);
  const epBufRef = useRef<{ state: number; action: number; reward: number; nextState: number }[]>([]);
  const startTimeRef = useRef(0);

  const [playerPos, setPlayerPos] = useState(0);
  const [currentEp, setCurrentEp] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);
  const [clipFraction, setClipFraction] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current || !agentRef.current || !envRef.current) return;
    if (epRef.current >= TRAIN_EPISODES) {
      isRunningRef.current = false; setIsRunning(false);
      const viz = agentRef.current.getVisualizationData();
      const d = viz.data as { rewardHistory: number[] };
      const rewards = d.rewardHistory ?? [];
      const recent = rewards.slice(-30);
      const avgReward = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1);
      const stability = computeStability(rewards, 30);

      // Rank: combination of avg reward and stability
      const rank: BountyRank = avgReward >= -3 && stability <= 4 ? 'S'
        : avgReward >= -5 && stability <= 6 ? 'A'
        : avgReward >= -8 ? 'B' : 'C';
      const passed = avgReward >= -10;
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);
      if (passed) { completeQuest('ppo', rank, BASE_GOLD); collectCard(CARD_ID, rank); }
      setQuestResult({ passed, rank, score: Math.round(avgReward * 10) / 10, gold });
      setPhase('results');
      return;
    }

    const s = stateRef.current;
    const { action } = agentRef.current.step(s);
    const res = envRef.current.step(s, action);
    epBufRef.current.push({ state: s, action, reward: res.reward, nextState: res.nextState });
    stateRef.current = res.nextState;
    stepsRef.current++;

    if (res.done || stepsRef.current >= MAX_STEPS_PER_EP) {
      const buf = epBufRef.current;
      for (let i = 0; i < buf.length; i++) {
        agentRef.current.update({ state: buf[i].state, action: buf[i].action, reward: buf[i].reward, nextState: buf[i].nextState, done: i === buf.length - 1 });
      }
      epBufRef.current = [];
      stateRef.current = envRef.current.reset();
      epRef.current++;
      stepsRef.current = 0;

      const viz = agentRef.current.getVisualizationData();
      const d = viz.data as { rewardHistory: number[]; lastClipCount: number; lastTotalCount: number };
      setRewardHistory([...(d.rewardHistory ?? [])]);
      const cf = d.lastTotalCount > 0 ? d.lastClipCount / d.lastTotalCount : 0;
      setClipFraction(cf);
      setCurrentEp(epRef.current);
    }

    setPlayerPos(stateRef.current);
    setElapsedMs(Date.now() - startTimeRef.current);
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [completeQuest, collectCard]);

  const startTraining = useCallback(() => {
    agentRef.current = new PPOAlgorithm(NUM_STATES, 4, 77001);
    agentRef.current.setHyperparameter('clipEpsilon', clipEpsilon);
    agentRef.current.setHyperparameter('actorLR', actorLR);
    envRef.current = new GridWorldEnvironment(CONFIG);
    stateRef.current = envRef.current.reset();
    stepsRef.current = 0; epRef.current = 0;
    epBufRef.current = [];
    setPlayerPos(stateRef.current);
    setCurrentEp(0); setRewardHistory([]); setClipFraction(0); setElapsedMs(0);
    startTimeRef.current = Date.now();
    isRunningRef.current = true; setIsRunning(true);
    setPhase('training');
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [clipEpsilon, actorLR, tick]);

  const togglePause = useCallback(() => {
    if (isRunningRef.current) {
      isRunningRef.current = false; setIsRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      isRunningRef.current = true; setIsRunning(true);
      timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
    }
  }, [tick]);

  useEffect(() => () => { isRunningRef.current = false; if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  if (phase === 'briefing') return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel className="text-center">
        <div className="text-5xl mb-4">🛹</div>
        <h3 className="font-pixel text-sm text-[#fb923c] mb-3">{t('ppo.quest.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('ppo.quest.briefing')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('ppo.quest.rule1'), t('ppo.quest.rule2'), t('ppo.quest.rule3')].map((r, i) => (
            <p key={i} className="font-body text-base text-[#e2e8f0]">• {r}</p>
          ))}
        </div>
        <PixelButton onClick={() => setPhase('config')}>{t('common.next')} →</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'config') return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel>
        <h3 className="font-pixel text-sm text-[#fb923c] mb-4">{t('ppo.quest.configTitle')}</h3>
        <PixelSlider label={`${t('ppo.quest.clipEpsilon')} ε = ${clipEpsilon.toFixed(2)}`} value={clipEpsilon} min={0.05} max={0.5} step={0.05} onChange={setClipEpsilon} />
        <div className="mt-3 mb-4 text-center">
          {clipEpsilon <= 0.1 && <p className="font-body text-sm text-[#708090]">{t('ppo.quest.hintTooSmall')}</p>}
          {clipEpsilon >= 0.4 && <p className="font-body text-sm text-[#f87171]">{t('ppo.quest.hintTooLarge')}</p>}
          {clipEpsilon > 0.1 && clipEpsilon < 0.4 && <p className="font-body text-sm text-[#4ade80]">{t('ppo.quest.hintGood')}</p>}
        </div>
        <PixelSlider label={t('ppo.quest.actorLR')} value={actorLR} min={0.001} max={0.05} step={0.001} onChange={setActorLR} />
        <p className="font-body text-sm text-[#708090] mt-4 mb-4">{t('ppo.quest.tip')}</p>
        <PixelButton onClick={startTraining}>{t('ppo.quest.startTraining')}</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'training') return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#fb923c]">{t('ppo.quest.trainingTitle')}</h3>
            <p className="font-body text-sm text-[#708090]">
              {t('ppo.quest.trainingDesc', { ep: currentEp, total: TRAIN_EPISODES, time: (elapsedMs / 1000).toFixed(1) })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePause}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-pixel text-[9px] text-[#708090]">{t('ppo.quest.clipFraction')}</span>
          <div className="flex-1 h-2 bg-[#0a0e27] rounded overflow-hidden">
            <div className="h-full bg-[#f87171] transition-all duration-300" style={{ width: `${Math.round(clipFraction * 100)}%` }} />
          </div>
          <span className="font-pixel text-[9px] text-[#f87171]">{Math.round(clipFraction * 100)}%</span>
        </div>
        <div className="w-full bg-[#0a0e27] rounded-full h-2 mt-2">
          <div className="bg-[#fb923c] h-2 rounded-full transition-all duration-300" style={{ width: `${(currentEp / TRAIN_EPISODES) * 100}%` }} />
        </div>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={playerPos} mode="auto" />
        </PixelPanel>
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#fb923c] mb-2">{t('ppo.quest.rewardTitle')}</p>
          <RewardChart data={rewardHistory} accentColor="#fb923c" height={120} />
        </PixelPanel>
      </div>
    </div>
  );

  const r = questResult!;
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel variant={r.passed ? 'gold' : 'default'} className="text-center">
        <div className="text-5xl mb-4">{r.passed ? '🏆' : '💪'}</div>
        <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(r.rank) }}>
          {r.passed ? t('ppo.quest.passed') : t('ppo.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('ppo.quest.avgReward')}</span>
            <span className="font-pixel text-sm text-[#fb923c]">{r.score}</span>
          </div>
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('bounty.rank.' + r.rank)}</span>
            <span className="font-pixel text-sm" style={{ color: rankColor(r.rank) }}>{r.rank}</span>
          </div>
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('common.gold')}</span>
            <span className="font-pixel text-sm text-[#ffd700]">{r.passed ? r.gold : 0}</span>
          </div>
        </div>
        <div className="flex justify-center gap-3">
          {!r.passed && <PixelButton variant="secondary" onClick={() => setPhase('config')}>{t('common.retry')}</PixelButton>}
          <PixelButton onClick={onComplete}>{t('common.next')} →</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
