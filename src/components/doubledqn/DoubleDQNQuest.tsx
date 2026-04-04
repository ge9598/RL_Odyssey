import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import { DQN } from '@/algorithms/dqn';
import { DoubleDQN } from '@/algorithms/doubleDqn';
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
const BASE_GOLD = 600;
const CARD_ID = 'the-skeptic';
const THRESHOLDS: Record<BountyRank, number> = { S: 0.8, A: 0.9, B: 1.0, C: 1.05 };

function encodeState(state: number): number[] {
  const cols = CONFIG.cols;
  const rows = CONFIG.rows;
  const row = Math.floor(state / cols) / (rows - 1);
  const col = (state % cols) / (cols - 1);
  const exitRow = Math.floor((NUM_STATES - 1) / cols) / (rows - 1);
  const exitCol = ((NUM_STATES - 1) % cols) / (cols - 1);
  return [row, col, exitRow - row, exitCol - col];
}

function getStepDelay(speed: number): number {
  return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1;
}

function computeRank(ddqnAvg: number, dqnAvg: number): BountyRank {
  if (dqnAvg === 0) return 'C';
  const ratio = ddqnAvg / dqnAvg;
  if (ratio >= 1 / THRESHOLDS.S) return 'S';
  if (ratio >= 1 / THRESHOLDS.A) return 'A';
  if (ratio >= 1 / THRESHOLDS.B) return 'B';
  return 'C';
}

function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#00d4ff' : r === 'B' ? '#4ade80' : '#708090';
}

export function DoubleDQNQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore((s) => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [learningRate, setLearningRate] = useState(0.005);
  const [trainEpisodes, setTrainEpisodes] = useState(100);

  const dqnRef = useRef(new DQN(STATE_SIZE, ACTION_SIZE, 16, 99));
  const ddqnRef = useRef(new DoubleDQN(STATE_SIZE, ACTION_SIZE, 16, 100));
  const dqnEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const ddqnEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [dqnPos, setDqnPos] = useState(CONFIG.start);
  const [ddqnPos, setDdqnPos] = useState(CONFIG.start);
  const [dqnEp, setDqnEp] = useState(0);
  const [ddqnEp, setDdqnEp] = useState(0);
  const [dqnRewards, setDqnRewards] = useState<number[]>([]);
  const [ddqnRewards, setDdqnRewards] = useState<number[]>([]);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dqnStateRef = useRef(CONFIG.start);
  const ddqnStateRef = useRef(CONFIG.start);
  const dqnEpRef = useRef(0);
  const ddqnEpRef = useRef(0);
  const dqnStepRef = useRef(0);
  const ddqnStepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    if (dqnEpRef.current >= trainEpisodes && ddqnEpRef.current >= trainEpisodes) {
      isRunningRef.current = false;
      setIsRunning(false);

      const dqnViz = dqnRef.current.getVisualizationData();
      const ddqnViz = ddqnRef.current.getVisualizationData();
      const dqnD = dqnViz.data as { episodeRewards: number[] };
      const ddqnD = ddqnViz.data as { episodeRewards: number[] };

      const lastN = 20;
      const dqnLast = dqnD.episodeRewards.slice(-lastN);
      const ddqnLast = ddqnD.episodeRewards.slice(-lastN);
      const dqnAvg = dqnLast.length > 0 ? dqnLast.reduce((a, b) => a + b, 0) / dqnLast.length : 0;
      const ddqnAvg = ddqnLast.length > 0 ? ddqnLast.reduce((a, b) => a + b, 0) / ddqnLast.length : 0;

      const passed = ddqnAvg >= dqnAvg * 0.95; // Double DQN at least as good
      const rank = computeRank(ddqnAvg, dqnAvg);
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);

      if (passed) { completeQuest('double-dqn', rank, BASE_GOLD); collectCard(CARD_ID, rank); }
      setQuestResult({ passed, rank, score: Math.round(ddqnAvg * 10) / 10, gold });
      setPhase('results');
      return;
    }

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

    if (ddqnEpRef.current < trainEpisodes) {
      const s = encodeState(ddqnStateRef.current);
      const { action } = ddqnRef.current.step(s);
      const res = ddqnEnvRef.current.step(ddqnStateRef.current, action);
      ddqnRef.current.update({ state: s, action, reward: res.reward, nextState: encodeState(res.nextState), done: res.done });
      ddqnStateRef.current = res.nextState;
      ddqnStepRef.current++;
      setDdqnPos(ddqnStateRef.current);
      if (res.done || ddqnStepRef.current >= MAX_STEPS) {
        ddqnStateRef.current = ddqnEnvRef.current.reset();
        ddqnEpRef.current++;
        ddqnStepRef.current = 0;
        const viz = ddqnRef.current.getVisualizationData();
        setDdqnRewards([...(viz.data as { episodeRewards: number[] }).episodeRewards]);
        setDdqnEp(ddqnEpRef.current);
      }
    }

    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, [completeQuest, collectCard, trainEpisodes]);

  const startTraining = useCallback(() => {
    dqnRef.current = new DQN(STATE_SIZE, ACTION_SIZE, 16, 99);
    ddqnRef.current = new DoubleDQN(STATE_SIZE, ACTION_SIZE, 16, 100);
    dqnRef.current.setHyperparameter('learningRate', learningRate);
    ddqnRef.current.setHyperparameter('learningRate', learningRate);

    dqnStateRef.current = dqnEnvRef.current.reset();
    ddqnStateRef.current = ddqnEnvRef.current.reset();
    dqnEpRef.current = 0; ddqnEpRef.current = 0;
    dqnStepRef.current = 0; ddqnStepRef.current = 0;
    setDqnPos(CONFIG.start); setDdqnPos(CONFIG.start);
    setDqnEp(0); setDdqnEp(0);
    setDqnRewards([]); setDdqnRewards([]);

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
        <div className="text-5xl mb-4">🔬</div>
        <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">{t('doubledqn.quest.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('doubledqn.quest.briefing')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('doubledqn.quest.rule1'), t('doubledqn.quest.rule2'), t('doubledqn.quest.rule3')].map((r, i) => (
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
        <h3 className="font-pixel text-sm text-[#ffd700] mb-4">{t('doubledqn.quest.configTitle')}</h3>
        <div className="flex flex-col gap-4 mb-6">
          <PixelSlider label={t('doubledqn.quest.learningRate')} value={learningRate} min={0.001} max={0.01} step={0.001} onChange={setLearningRate} />
          <PixelSlider label={t('doubledqn.quest.episodes')} value={trainEpisodes} min={50} max={200} step={10} onChange={setTrainEpisodes} displayValue={String(trainEpisodes)} />
        </div>
        <PixelButton onClick={startTraining}>{t('doubledqn.quest.startTraining')}</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'training') return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#ffd700]">{t('doubledqn.quest.trainingTitle')}</h3>
            <p className="font-body text-sm text-[#708090]">DQN: {dqnEp} / {trainEpisodes} | Double DQN: {ddqnEp} / {trainEpisodes}</p>
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
          <span className="font-pixel text-xs text-[#4ade80] block mb-2">Double DQN (ep {ddqnEp})</span>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={ddqnPos} mode="auto" />
        </PixelPanel>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel><RewardChart data={dqnRewards} accentColor="#f87171" height={100} /></PixelPanel>
        <PixelPanel><RewardChart data={ddqnRewards} accentColor="#4ade80" height={100} /></PixelPanel>
      </div>
    </div>
  );

  const r = questResult!;
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel variant={r.passed ? 'gold' : 'default'} className="text-center">
        <div className="text-5xl mb-4">{r.passed ? '🏆' : '💪'}</div>
        <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(r.rank) }}>
          {r.passed ? t('doubledqn.quest.passed') : t('doubledqn.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('doubledqn.quest.ddqnAvg')}</span>
            <span className="font-pixel text-sm text-[#4ade80]">{r.score}</span>
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
