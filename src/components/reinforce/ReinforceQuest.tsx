import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { REINFORCEAlgorithm } from '@/algorithms/reinforce';
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
const MAX_STEPS_PER_EP = 100;
const BASE_GOLD = 500;
const CARD_ID = 'instinct-thrower';

const THRESHOLDS: Record<BountyRank, number> = { S: -3, A: -5, B: -8, C: -12 };
const TRAIN_EPISODES = 200;

function getStepDelay(speed: number) {
  return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1;
}

function computeRank(avgReward: number): BountyRank {
  if (avgReward >= THRESHOLDS.S) return 'S';
  if (avgReward >= THRESHOLDS.A) return 'A';
  if (avgReward >= THRESHOLDS.B) return 'B';
  return 'C';
}

function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#00d4ff' : r === 'B' ? '#4ade80' : '#708090';
}

export function ReinforceQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore(s => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [learningRate, setLearningRate] = useState(0.02);
  const [isRunning, setIsRunning] = useState(false);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const agentRef = useRef(new REINFORCEAlgorithm(NUM_STATES, 4, 77777));
  const envRef = useRef(new GridWorldEnvironment(CONFIG));
  const [playerPos, setPlayerPos] = useState(CONFIG.start);
  const [episode, setEpisode] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);

  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(CONFIG.start);
  const epRef = useRef(0);
  const stepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;
    if (epRef.current >= TRAIN_EPISODES) {
      isRunningRef.current = false;
      setIsRunning(false);

      const viz = agentRef.current.getVisualizationData();
      const d = viz.data as { rewardHistory: number[] };
      const lastN = d.rewardHistory.slice(-30);
      const avgReward = lastN.length ? lastN.reduce((a, b) => a + b, 0) / lastN.length : -99;
      const passed = avgReward >= THRESHOLDS.C;
      const rank = computeRank(avgReward);
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);

      if (passed) { completeQuest('reinforce', rank, BASE_GOLD); collectCard(CARD_ID, rank); }
      setQuestResult({ passed, rank, score: Math.round(avgReward * 10) / 10, gold });
      setPhase('results');
      return;
    }

    const { action } = agentRef.current.step(stateRef.current);
    const result = envRef.current.step(stateRef.current, action);
    agentRef.current.update({
      state: stateRef.current, action,
      reward: result.reward, nextState: result.nextState, done: result.done,
    });
    stateRef.current = result.nextState;
    stepRef.current++;
    setPlayerPos(stateRef.current);

    if (result.done || stepRef.current >= MAX_STEPS_PER_EP) {
      agentRef.current.endEpisode();
      stateRef.current = envRef.current.reset();
      epRef.current++;
      stepRef.current = 0;
      agentRef.current.startEpisode();
      const viz = agentRef.current.getVisualizationData();
      const d = viz.data as { rewardHistory: number[] };
      setRewardHistory([...d.rewardHistory]);
      setEpisode(epRef.current);
    }

    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, [completeQuest, collectCard]);

  const startTraining = useCallback(() => {
    agentRef.current = new REINFORCEAlgorithm(NUM_STATES, 4, 77777);
    agentRef.current.setHyperparameter('learningRate', learningRate);
    stateRef.current = envRef.current.reset();
    epRef.current = 0; stepRef.current = 0;
    setPlayerPos(CONFIG.start); setEpisode(0); setRewardHistory([]);
    isRunningRef.current = true; setIsRunning(true);
    setPhase('training');
    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, [learningRate, tick]);

  const togglePause = useCallback(() => {
    if (isRunningRef.current) {
      isRunningRef.current = false; setIsRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      isRunningRef.current = true; setIsRunning(true);
      timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
    }
  }, [tick]);

  useEffect(() => () => {
    isRunningRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  if (phase === 'briefing') return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel className="text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="font-pixel text-sm text-[#f97316] mb-3">{t('reinforce.quest.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('reinforce.quest.briefing')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('reinforce.quest.rule1'), t('reinforce.quest.rule2'), t('reinforce.quest.rule3')].map((r, i) => (
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
        <h3 className="font-pixel text-sm text-[#f97316] mb-4">{t('reinforce.quest.configTitle')}</h3>
        <div className="flex flex-col gap-4 mb-6">
          <PixelSlider label={t('reinforce.quest.learningRate')} value={learningRate}
            min={0.001} max={0.1} step={0.001} onChange={setLearningRate} />
        </div>
        <p className="font-body text-sm text-[#708090] mb-4">{t('reinforce.quest.tip')}</p>
        <PixelButton onClick={startTraining}>{t('reinforce.quest.startTraining')}</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'training') return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#f97316]">{t('reinforce.quest.trainingTitle')}</h3>
            <p className="font-body text-sm text-[#708090]">
              {t('reinforce.quest.trainingDesc', { ep: episode, total: TRAIN_EPISODES })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePause}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
          </div>
        </div>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <span className="font-pixel text-xs text-[#f97316] block mb-2">{t('reinforce.quest.agentLabel', { ep: episode })}</span>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={playerPos} mode="auto"
          />
        </PixelPanel>
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#f97316] mb-2">{t('reinforce.quest.rewardChart')}</p>
          <RewardChart data={rewardHistory} accentColor="#f97316" height={180} />
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
          {r.passed ? t('reinforce.quest.passed') : t('reinforce.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('reinforce.quest.avgReward')}</span>
            <span className="font-pixel text-sm text-[#f97316]">{r.score}</span>
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
