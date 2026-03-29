import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { ActorCriticAlgorithm } from '@/algorithms/actorCritic';
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
const BASE_GOLD = 700;
const CARD_ID = 'dual-mind';
const TRAIN_EPISODES = 250;

// Rank: AC avg reward vs REINFORCE avg reward
const THRESHOLDS: Record<BountyRank, number> = { S: 0.3, A: 0.15, B: 0.0, C: -0.1 };

function getDelay(speed: number) { return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1; }

function computeRank(diff: number): BountyRank {
  if (diff >= THRESHOLDS.S) return 'S';
  if (diff >= THRESHOLDS.A) return 'A';
  if (diff >= THRESHOLDS.B) return 'B';
  return 'C';
}
function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#00d4ff' : r === 'B' ? '#4ade80' : '#708090';
}

export function ActorCriticQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore(s => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [actorLR, setActorLR] = useState(0.01);
  const [criticLR, setCriticLR] = useState(0.05);
  const [isRunning, setIsRunning] = useState(false);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const acRef = useRef(new ActorCriticAlgorithm(NUM_STATES, 4, 99001));
  const rfRef = useRef(new REINFORCEAlgorithm(NUM_STATES, 4, 99002));
  const acEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const rfEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [acPos, setAcPos] = useState(CONFIG.start);
  const [rfPos, setRfPos] = useState(CONFIG.start);
  const [acEp, setAcEp] = useState(0);
  const [rfEp, setRfEp] = useState(0);
  const [acRewards, setAcRewards] = useState<number[]>([]);
  const [rfRewards, setRfRewards] = useState<number[]>([]);

  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acStateRef = useRef(CONFIG.start); const rfStateRef = useRef(CONFIG.start);
  const acEpRef = useRef(0); const rfEpRef = useRef(0);
  const acStepRef = useRef(0); const rfStepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;
    if (acEpRef.current >= TRAIN_EPISODES && rfEpRef.current >= TRAIN_EPISODES) {
      isRunningRef.current = false; setIsRunning(false);
      const acD = acRef.current.getVisualizationData().data as { rewardHistory: number[] };
      const rfD = rfRef.current.getVisualizationData().data as { rewardHistory: number[] };
      const N = 30;
      const acAvg = acD.rewardHistory.slice(-N).reduce((a, b) => a + b, 0) / N;
      const rfAvg = rfD.rewardHistory.slice(-N).reduce((a, b) => a + b, 0) / N;
      const diff = acAvg - rfAvg;
      const passed = diff >= THRESHOLDS.C;
      const rank = computeRank(diff);
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);
      if (passed) { completeQuest('actor-critic', rank, BASE_GOLD); collectCard(CARD_ID, rank); }
      setQuestResult({ passed, rank, score: Math.round(diff * 100) / 100, gold });
      setPhase('results');
      return;
    }

    if (acEpRef.current < TRAIN_EPISODES) {
      const { action } = acRef.current.step(acStateRef.current);
      const res = acEnvRef.current.step(acStateRef.current, action);
      acRef.current.update({ state: acStateRef.current, action, reward: res.reward, nextState: res.nextState, done: res.done });
      acStateRef.current = res.nextState; acStepRef.current++;
      setAcPos(acStateRef.current);
      if (res.done || acStepRef.current >= MAX_STEPS_PER_EP) {
        acStateRef.current = acEnvRef.current.reset(); acEpRef.current++; acStepRef.current = 0; acRef.current.startEpisode();
        const d = acRef.current.getVisualizationData().data as { rewardHistory: number[] };
        setAcRewards([...d.rewardHistory]); setAcEp(acEpRef.current);
      }
    }

    if (rfEpRef.current < TRAIN_EPISODES) {
      const { action } = rfRef.current.step(rfStateRef.current);
      const res = rfEnvRef.current.step(rfStateRef.current, action);
      rfRef.current.update({ state: rfStateRef.current, action, reward: res.reward, nextState: res.nextState, done: res.done });
      rfStateRef.current = res.nextState; rfStepRef.current++;
      setRfPos(rfStateRef.current);
      if (res.done || rfStepRef.current >= MAX_STEPS_PER_EP) {
        rfRef.current.endEpisode();
        rfStateRef.current = rfEnvRef.current.reset(); rfEpRef.current++; rfStepRef.current = 0; rfRef.current.startEpisode();
        const d = rfRef.current.getVisualizationData().data as { rewardHistory: number[] };
        setRfRewards([...d.rewardHistory]); setRfEp(rfEpRef.current);
      }
    }

    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [completeQuest, collectCard]);

  const startTraining = useCallback(() => {
    acRef.current = new ActorCriticAlgorithm(NUM_STATES, 4, 99001);
    rfRef.current = new REINFORCEAlgorithm(NUM_STATES, 4, 99002);
    acRef.current.setHyperparameter('actorLR', actorLR);
    acRef.current.setHyperparameter('criticLR', criticLR);
    acStateRef.current = acEnvRef.current.reset(); rfStateRef.current = rfEnvRef.current.reset();
    acEpRef.current = 0; rfEpRef.current = 0;
    acStepRef.current = 0; rfStepRef.current = 0;
    setAcPos(CONFIG.start); setRfPos(CONFIG.start);
    setAcEp(0); setRfEp(0); setAcRewards([]); setRfRewards([]);
    isRunningRef.current = true; setIsRunning(true);
    setPhase('training');
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [actorLR, criticLR, tick]);

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
        <div className="text-5xl mb-4">🥋</div>
        <h3 className="font-pixel text-sm text-[#c084fc] mb-3">{t('actorcritic.quest.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('actorcritic.quest.briefing')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('actorcritic.quest.rule1'), t('actorcritic.quest.rule2'), t('actorcritic.quest.rule3')].map((r, i) => (
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
        <h3 className="font-pixel text-sm text-[#c084fc] mb-4">{t('actorcritic.quest.configTitle')}</h3>
        <div className="flex flex-col gap-4 mb-6">
          <PixelSlider label={t('actorcritic.quest.actorLR')} value={actorLR} min={0.001} max={0.1} step={0.001} onChange={setActorLR} />
          <PixelSlider label={t('actorcritic.quest.criticLR')} value={criticLR} min={0.001} max={0.2} step={0.001} onChange={setCriticLR} />
        </div>
        <p className="font-body text-sm text-[#708090] mb-4">{t('actorcritic.quest.tip')}</p>
        <PixelButton onClick={startTraining}>{t('actorcritic.quest.startTraining')}</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'training') return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#c084fc]">{t('actorcritic.quest.trainingTitle')}</h3>
            <p className="font-body text-sm text-[#708090]">
              AC ep {acEp} / RF ep {rfEp} (of {TRAIN_EPISODES})
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
          <span className="font-pixel text-xs text-[#f97316] block mb-2">REINFORCE (ep {rfEp})</span>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={rfPos} mode="auto" />
        </PixelPanel>
        <PixelPanel>
          <span className="font-pixel text-xs text-[#c084fc] block mb-2">Actor-Critic (ep {acEp})</span>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={acPos} mode="auto" />
        </PixelPanel>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel><RewardChart data={rfRewards} accentColor="#f97316" height={80} /></PixelPanel>
        <PixelPanel><RewardChart data={acRewards} accentColor="#c084fc" height={80} /></PixelPanel>
      </div>
    </div>
  );

  const r = questResult!;
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel variant={r.passed ? 'gold' : 'default'} className="text-center">
        <div className="text-5xl mb-4">{r.passed ? '🏆' : '💪'}</div>
        <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(r.rank) }}>
          {r.passed ? t('actorcritic.quest.passed') : t('actorcritic.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('actorcritic.quest.advantage')}</span>
            <span className="font-pixel text-sm text-[#c084fc]">{r.score > 0 ? '+' : ''}{r.score}</span>
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
