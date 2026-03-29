import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { A2CAlgorithm } from '@/algorithms/a2c';
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
const BASE_GOLD = 900;
const CARD_ID = 'hivemind-captain';
const TRAIN_EPS_EACH = 150;
const WORKER_COLORS = ['#00d4ff', '#4ade80', '#ffd700', '#f87171', '#c084fc', '#fb923c', '#22d3ee', '#a3e635'];

function getDelay(speed: number) { return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1; }
function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#00d4ff' : r === 'B' ? '#4ade80' : '#708090';
}

export function A2CQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore(s => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [numWorkers, setNumWorkers] = useState(8);
  const [actorLR, setActorLR] = useState(0.01);
  const [isRunning, setIsRunning] = useState(false);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const agentRef = useRef<A2CAlgorithm | null>(null);
  const envsRef = useRef<GridWorldEnvironment[]>([]);
  const [workerPositions, setWorkerPositions] = useState<number[]>([]);
  const [workerEps, setWorkerEps] = useState<number[]>([]);
  const [recentRewards, setRecentRewards] = useState<number[]>([]);
  const [totalEps, setTotalEps] = useState(0);

  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerStatesRef = useRef<number[]>([]);
  const workerEpsRef = useRef<number[]>([]);
  const workerStepsRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current || !agentRef.current) return;
    const n = numWorkers;
    let anyActive = false;

    for (let w = 0; w < n; w++) {
      if (workerEpsRef.current[w] >= TRAIN_EPS_EACH) continue;
      anyActive = true;
      const state = workerStatesRef.current[w];
      const { action } = agentRef.current.step(state);
      const res = envsRef.current[w].step(state, action);
      agentRef.current.updateForWorker(w, { state, action, reward: res.reward, nextState: res.nextState, done: res.done });
      workerStatesRef.current[w] = res.nextState;
      workerStepsRef.current[w]++;

      if (res.done || workerStepsRef.current[w] >= MAX_STEPS_PER_EP) {
        workerStatesRef.current[w] = envsRef.current[w].reset();
        workerEpsRef.current[w]++;
        workerStepsRef.current[w] = 0;
        agentRef.current.startEpisode();
      }
    }

    const eps = workerEpsRef.current.reduce((a, b) => a + b, 0);
    setWorkerPositions([...workerStatesRef.current]);
    setWorkerEps([...workerEpsRef.current]);
    setTotalEps(eps);

    if (!anyActive) {
      isRunningRef.current = false; setIsRunning(false);
      void (Date.now() - startTimeRef.current); // elapsed time not displayed in results
      const viz = agentRef.current.getVisualizationData();
      const d = viz.data as { workerRecentRewards: number[] };
      const avgReward = (d.workerRecentRewards ?? []).reduce((a, b) => a + b, 0) / n;

      // Rank based on avg reward across workers
      const rank: BountyRank = avgReward >= -3 ? 'S' : avgReward >= -5 ? 'A' : avgReward >= -8 ? 'B' : 'C';
      const passed = avgReward >= -10;
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);
      if (passed) { completeQuest('a2c', rank, BASE_GOLD); collectCard(CARD_ID, rank); }
      setQuestResult({ passed, rank, score: Math.round(avgReward * 10) / 10, gold });
      setPhase('results');
      return;
    }

    const viz = agentRef.current.getVisualizationData();
    const d = viz.data as { workerRecentRewards: number[] };
    setRecentRewards([...(d.workerRecentRewards ?? [])]);
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [numWorkers, completeQuest, collectCard]);

  const startTraining = useCallback(() => {
    agentRef.current = new A2CAlgorithm(NUM_STATES, 4, numWorkers, 66001);
    agentRef.current.setHyperparameter('actorLR', actorLR);
    envsRef.current = Array.from({ length: numWorkers }, () => new GridWorldEnvironment(CONFIG));
    workerStatesRef.current = envsRef.current.map(e => e.reset());
    workerEpsRef.current = new Array(numWorkers).fill(0);
    workerStepsRef.current = new Array(numWorkers).fill(0);
    setWorkerPositions([...workerStatesRef.current]);
    setWorkerEps(new Array(numWorkers).fill(0));
    setRecentRewards([]); setTotalEps(0);
    startTimeRef.current = Date.now();
    isRunningRef.current = true; setIsRunning(true);
    setPhase('training');
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [numWorkers, actorLR, tick]);

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
        <div className="text-5xl mb-4">⚔️</div>
        <h3 className="font-pixel text-sm text-[#22d3ee] mb-3">{t('a2c.quest.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('a2c.quest.briefing')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('a2c.quest.rule1'), t('a2c.quest.rule2'), t('a2c.quest.rule3')].map((r, i) => (
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
        <h3 className="font-pixel text-sm text-[#22d3ee] mb-4">{t('a2c.quest.configTitle')}</h3>
        <div className="mb-4">
          <p className="font-pixel text-[10px] text-[#708090] mb-2">{t('a2c.quest.selectWorkers')}</p>
          <div className="flex gap-2">
            {[2, 4, 8].map(n => (
              <PixelButton key={n} size="sm" variant={numWorkers === n ? 'primary' : 'secondary'}
                onClick={() => setNumWorkers(n)}>{n} {t('a2c.quest.workersLabel')}</PixelButton>
            ))}
          </div>
        </div>
        <PixelSlider label={t('a2c.quest.actorLR')} value={actorLR} min={0.001} max={0.05} step={0.001} onChange={setActorLR} />
        <p className="font-body text-sm text-[#708090] mt-4 mb-4">{t('a2c.quest.tip')}</p>
        <PixelButton onClick={startTraining}>{t('a2c.quest.startTraining')}</PixelButton>
      </PixelPanel>
    </div>
  );

  if (phase === 'training') return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm text-[#22d3ee]">{t('a2c.quest.trainingTitle')}</h3>
            <p className="font-body text-sm text-[#708090]">
              {t('a2c.quest.trainingDesc', { workers: numWorkers, eps: totalEps, total: numWorkers * TRAIN_EPS_EACH })}
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

      <div className={`grid gap-3 ${numWorkers <= 4 ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {Array.from({ length: numWorkers }).map((_, w) => (
          <PixelPanel key={w} className="!p-2">
            <p className="font-pixel text-[9px] mb-1" style={{ color: WORKER_COLORS[w % WORKER_COLORS.length] }}>
              W{w + 1} ep{workerEps[w] ?? 0}
            </p>
            <GridWorld
              rows={CONFIG.rows} cols={CONFIG.cols}
              walls={CONFIG.walls} traps={CONFIG.traps}
              treasures={CONFIG.treasures} exit={CONFIG.exit}
              playerPos={workerPositions[w] ?? 0}
              mode="auto"
              className="scale-75 origin-top-left"
            />
          </PixelPanel>
        ))}
      </div>

      <PixelPanel>
        <p className="font-pixel text-[10px] text-[#22d3ee] mb-2">{t('a2c.quest.workerRewards')}</p>
        <RewardChart data={recentRewards} accentColor="#22d3ee" height={80} />
      </PixelPanel>
    </div>
  );

  const r = questResult!;
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel variant={r.passed ? 'gold' : 'default'} className="text-center">
        <div className="text-5xl mb-4">{r.passed ? '🏆' : '💪'}</div>
        <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(r.rank) }}>
          {r.passed ? t('a2c.quest.passed') : t('a2c.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('a2c.quest.avgReward')}</span>
            <span className="font-pixel text-sm text-[#22d3ee]">{r.score}</span>
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
