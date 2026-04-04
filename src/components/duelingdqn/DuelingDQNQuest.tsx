import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import { DQN } from '@/algorithms/dqn';
import { DuelingDQN } from '@/algorithms/duelingDqn';
import type { BountyRank, QuestResult } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import type { PortStepProps } from '@/config/ports';

type QuestPhase = 'briefing' | 'config' | 'training' | 'results';

const CONFIG = GRID_CONFIGS.quest;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const STATE_SIZE = 4;
const ACTION_SIZE = 4;
const MAX_STEPS = 100;
const BASE_GOLD = 700;
const CARD_ID = 'the-analyst';

function encodeState(state: number): number[] {
  const cols = CONFIG.cols;
  const rows = CONFIG.rows;
  const row = Math.floor(state / cols) / (rows - 1);
  const col = (state % cols) / (cols - 1);
  const exitR = Math.floor((NUM_STATES - 1) / cols) / (rows - 1);
  const exitC = ((NUM_STATES - 1) % cols) / (cols - 1);
  return [row, col, exitR - row, exitC - col];
}

function getStepDelay(speed: number): number {
  return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1;
}

function computeRank(duelingAvg: number, dqnAvg: number): BountyRank {
  if (dqnAvg === 0) return 'C';
  const improvement = (duelingAvg - dqnAvg) / Math.abs(dqnAvg);
  if (improvement >= 0.2) return 'S';
  if (improvement >= 0.1) return 'A';
  if (improvement >= 0) return 'B';
  return 'C';
}

function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#00d4ff' : r === 'B' ? '#4ade80' : '#708090';
}

export function DuelingDQNQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore((s) => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [learningRate, setLearningRate] = useState(0.005);
  const [trainEpisodes, setTrainEpisodes] = useState(100);

  const dqnRef = useRef(new DQN(STATE_SIZE, ACTION_SIZE, 16, 301));
  const duelingRef = useRef(new DuelingDQN(STATE_SIZE, ACTION_SIZE, 16, 302));
  const dqnEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const duelingEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [dqnPos, setDqnPos] = useState(CONFIG.start);
  const [duelingPos, setDuelingPos] = useState(CONFIG.start);
  const [dqnEp, setDqnEp] = useState(0);
  const [duelingEp, setDuelingEp] = useState(0);
  const [dqnRewards, setDqnRewards] = useState<number[]>([]);
  const [duelingRewards, setDuelingRewards] = useState<number[]>([]);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dqnStateRef = useRef(CONFIG.start);
  const duelingStateRef = useRef(CONFIG.start);
  const dqnEpRef = useRef(0);
  const duelingEpRef = useRef(0);
  const dqnStepRef = useRef(0);
  const duelingStepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    if (dqnEpRef.current >= trainEpisodes && duelingEpRef.current >= trainEpisodes) {
      isRunningRef.current = false;
      setIsRunning(false);

      const dqnViz = dqnRef.current.getVisualizationData();
      const duelingViz = duelingRef.current.getVisualizationData();
      const dqnD = (dqnViz.data as { episodeRewards: number[] }).episodeRewards;
      const duelingD = (duelingViz.data as { episodeRewards: number[] }).episodeRewards;

      const n = 20;
      const dqnAvg = dqnD.slice(-n).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(n, dqnD.length));
      const duelingAvg = duelingD.slice(-n).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(n, duelingD.length));

      const passed = duelingAvg >= dqnAvg * 0.9;
      const rank = computeRank(duelingAvg, dqnAvg);
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);

      if (passed) { completeQuest('dueling-dqn', rank, BASE_GOLD); collectCard(CARD_ID, rank); }
      setQuestResult({ passed, rank, score: Math.round(duelingAvg * 10) / 10, gold });
      setPhase('results');
      return;
    }

    // DQN step
    if (dqnEpRef.current < trainEpisodes) {
      const s = encodeState(dqnStateRef.current);
      const { action } = dqnRef.current.step(s);
      const res = dqnEnvRef.current.step(dqnStateRef.current, action);
      dqnRef.current.update({ state: s, action, reward: res.reward, nextState: encodeState(res.nextState), done: res.done });
      dqnStateRef.current = res.nextState;
      dqnStepRef.current++;
      setDqnPos(dqnStateRef.current);
      if (res.done || dqnStepRef.current >= MAX_STEPS) {
        dqnStateRef.current = dqnEnvRef.current.reset();
        dqnEpRef.current++;
        dqnStepRef.current = 0;
        const viz = dqnRef.current.getVisualizationData();
        setDqnRewards([...(viz.data as { episodeRewards: number[] }).episodeRewards]);
        setDqnEp(dqnEpRef.current);
      }
    }

    // Dueling DQN step
    if (duelingEpRef.current < trainEpisodes) {
      const s = encodeState(duelingStateRef.current);
      const { action } = duelingRef.current.step(s);
      const res = duelingEnvRef.current.step(duelingStateRef.current, action);
      duelingRef.current.update({ state: s, action, reward: res.reward, nextState: encodeState(res.nextState), done: res.done });
      duelingStateRef.current = res.nextState;
      duelingStepRef.current++;
      setDuelingPos(duelingStateRef.current);
      if (res.done || duelingStepRef.current >= MAX_STEPS) {
        duelingStateRef.current = duelingEnvRef.current.reset();
        duelingEpRef.current++;
        duelingStepRef.current = 0;
        const viz = duelingRef.current.getVisualizationData();
        setDuelingRewards([...(viz.data as { episodeRewards: number[] }).episodeRewards]);
        setDuelingEp(duelingEpRef.current);
      }
    }

    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, [completeQuest, collectCard, trainEpisodes]);

  const startTraining = useCallback(() => {
    dqnRef.current = new DQN(STATE_SIZE, ACTION_SIZE, 16, 301);
    duelingRef.current = new DuelingDQN(STATE_SIZE, ACTION_SIZE, 16, 302);
    dqnRef.current.setHyperparameter('learningRate', learningRate);
    duelingRef.current.setHyperparameter('learningRate', learningRate);

    dqnStateRef.current = dqnEnvRef.current.reset();
    duelingStateRef.current = duelingEnvRef.current.reset();
    dqnEpRef.current = 0; duelingEpRef.current = 0;
    dqnStepRef.current = 0; duelingStepRef.current = 0;
    setDqnPos(CONFIG.start); setDuelingPos(CONFIG.start);
    setDqnEp(0); setDuelingEp(0);
    setDqnRewards([]); setDuelingRewards([]);

    isRunningRef.current = true;
    setIsRunning(true);
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
        <div className="text-5xl mb-4">📊</div>
        <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">{t('duelingdqn.quest.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('duelingdqn.quest.briefing')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('duelingdqn.quest.rule1'), t('duelingdqn.quest.rule2'), t('duelingdqn.quest.rule3')].map((r, i) => (
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
        <h3 className="font-pixel text-sm text-[#00d4ff] mb-4">{t('duelingdqn.quest.configTitle')}</h3>
        <div className="flex flex-col gap-4 mb-6">
          <PixelSlider label={t('duelingdqn.quest.learningRate')} value={learningRate} min={0.001} max={0.01} step={0.001} onChange={setLearningRate} />
          <PixelSlider label={t('duelingdqn.quest.episodes')} value={trainEpisodes} min={50} max={200} step={10} onChange={setTrainEpisodes} displayValue={String(trainEpisodes)} />
        </div>
        <PixelButton onClick={startTraining}>{t('duelingdqn.quest.startTraining')}</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'training') return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff]">{t('duelingdqn.quest.trainingTitle')}</h3>
            <p className="font-body text-sm text-[#708090]">DQN: {dqnEp} | Dueling: {duelingEp} / {trainEpisodes}</p>
          </div>
          <div className="flex gap-2 items-center">
            {[1, 2, 5, 10].map((s) => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePause}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
          </div>
        </div>
      </PixelPanel>
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <span className="font-pixel text-xs text-[#f87171] block mb-2">DQN (ep {dqnEp})</span>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={dqnPos} mode="auto" />
        </PixelPanel>
        <PixelPanel>
          <span className="font-pixel text-xs text-[#00d4ff] block mb-2">Dueling DQN (ep {duelingEp})</span>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={duelingPos} mode="auto" />
        </PixelPanel>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel><RewardChart data={dqnRewards} accentColor="#f87171" height={100} /></PixelPanel>
        <PixelPanel><RewardChart data={duelingRewards} accentColor="#00d4ff" height={100} /></PixelPanel>
      </div>
    </div>
  );

  const r = questResult!;
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel variant={r.passed ? 'gold' : 'default'} className="text-center">
        <div className="text-5xl mb-4">{r.passed ? '🏆' : '💪'}</div>
        <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(r.rank) }}>
          {r.passed ? t('duelingdqn.quest.passed') : t('duelingdqn.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('duelingdqn.quest.duelingAvg')}</span>
            <span className="font-pixel text-sm text-[#00d4ff]">{r.score}</span>
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
