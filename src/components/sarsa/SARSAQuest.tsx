import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GridWorldEnvironment, QLearningAlgorithm } from '@/algorithms/qlearning';
import { SARSAAlgorithm } from '@/algorithms/sarsa';
import type { BountyRank, QuestResult } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import type { PortStepProps } from '@/config/ports';

type QuestPhase = 'briefing' | 'config' | 'training' | 'results';

const CONFIG = GRID_CONFIGS.quest;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_STEPS_PER_EP = 150;
const BASE_GOLD = 400;
const CARD_ID = 'the-cautious-one';
const THRESHOLDS: Record<BountyRank, number> = { S: 0.75, A: 0.9, B: 1.0, C: 1.1 };

function getStepDelay(speed: number): number {
  switch (speed) {
    case 1: return 60; case 2: return 25; case 5: return 5; case 10: return 1;
    default: return 60;
  }
}

function computeRank(ratio: number): BountyRank {
  if (ratio <= THRESHOLDS.S) return 'S';
  if (ratio <= THRESHOLDS.A) return 'A';
  if (ratio <= THRESHOLDS.B) return 'B';
  return 'C';
}

function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#00d4ff' : r === 'B' ? '#4ade80' : '#708090';
}

export function SARSAQuest({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore((s) => s.completeQuest);
  const { collectCard } = useCardStore();

  const [phase, setPhase] = useState<QuestPhase>('briefing');
  const [speed, setSpeed] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [learningRate, setLearningRate] = useState(0.1);
  const [epsilon, setEpsilon] = useState(0.2);
  const [trainEpisodes, setTrainEpisodes] = useState(150);

  // Agents
  const sarsaRef = useRef(new SARSAAlgorithm(NUM_STATES, 4, 66666));
  const qlRef = useRef(new QLearningAlgorithm(NUM_STATES, 4, 66667));
  const sarsaEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const qlEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [sarsaPos, setSarsaPos] = useState(CONFIG.start);
  const [qlPos, setQlPos] = useState(CONFIG.start);
  const [sarsaEp, setSarsaEp] = useState(0);
  const [qlEp, setQlEp] = useState(0);
  const [sarsaRewards, setSarsaRewards] = useState<number[]>([]);
  const [qlRewards, setQlRewards] = useState<number[]>([]);
  const [questResult, setQuestResult] = useState<QuestResult | null>(null);

  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sarsaStateRef = useRef(CONFIG.start);
  const qlStateRef = useRef(CONFIG.start);
  const sarsaEpRef = useRef(0);
  const qlEpRef = useRef(0);
  const sarsaStepRef = useRef(0);
  const qlStepRef = useRef(0);
  const totalEpsRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    const bothDone = sarsaEpRef.current >= trainEpisodes && qlEpRef.current >= trainEpisodes;
    if (bothDone) {
      isRunningRef.current = false;
      setIsRunning(false);
      // Compute results: compare average reward in last 20 episodes
      const sarsaViz = sarsaRef.current.getVisualizationData();
      const qlViz = qlRef.current.getVisualizationData();
      const sd = sarsaViz.data as { episodeRewards: number[] };
      const qd = qlViz.data as { episodeRewards: number[] };

      const lastN = 20;
      const sarsaLast = sd.episodeRewards.slice(-lastN);
      const qlLast = qd.episodeRewards.slice(-lastN);
      const sarsaAvg = sarsaLast.length > 0 ? sarsaLast.reduce((a, b) => a + b, 0) / sarsaLast.length : 0;
      const qlAvg = qlLast.length > 0 ? qlLast.reduce((a, b) => a + b, 0) / qlLast.length : 0;

      // Ratio: lower is better for safety (negative reward diff from cliffs)
      // We compare: SARSA has less negative penalty from cliffs
      const ratio = qlAvg !== 0 ? Math.abs(sarsaAvg) / Math.abs(qlAvg) : 1;
      const passed = sarsaAvg >= qlAvg; // SARSA >= Q-Learning in total reward
      const rank = passed ? computeRank(ratio) : 'C';
      const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[rank]);

      if (passed) {
        completeQuest('sarsa', rank, BASE_GOLD);
        collectCard(CARD_ID, rank);
      }

      setQuestResult({ passed, rank, score: Math.round(sarsaAvg * 10) / 10, gold });
      setPhase('results');
      return;
    }

    // SARSA step
    if (sarsaEpRef.current < trainEpisodes) {
      const { action } = sarsaRef.current.step(sarsaStateRef.current);
      const result = sarsaEnvRef.current.step(sarsaStateRef.current, action);
      sarsaRef.current.update({ state: sarsaStateRef.current, action, reward: result.reward, nextState: result.nextState, done: result.done });
      sarsaStateRef.current = result.nextState;
      sarsaStepRef.current++;
      setSarsaPos(sarsaStateRef.current);
      if (result.done || sarsaStepRef.current >= MAX_STEPS_PER_EP) {
        sarsaStateRef.current = sarsaEnvRef.current.reset();
        sarsaEpRef.current++;
        sarsaStepRef.current = 0;
        sarsaRef.current.startEpisode();
        const viz = sarsaRef.current.getVisualizationData();
        const d = viz.data as { episodeRewards: number[] };
        setSarsaRewards([...d.episodeRewards]);
        setSarsaEp(sarsaEpRef.current);
      }
    }

    // Q-Learning step
    if (qlEpRef.current < trainEpisodes) {
      const { action } = qlRef.current.step(qlStateRef.current);
      const result = qlEnvRef.current.step(qlStateRef.current, action);
      qlRef.current.update({ state: qlStateRef.current, action, reward: result.reward, nextState: result.nextState, done: result.done });
      qlStateRef.current = result.nextState;
      qlStepRef.current++;
      setQlPos(qlStateRef.current);
      if (result.done || qlStepRef.current >= MAX_STEPS_PER_EP) {
        qlStateRef.current = qlEnvRef.current.reset();
        qlEpRef.current++;
        qlStepRef.current = 0;
        qlRef.current.startEpisode();
        const viz = qlRef.current.getVisualizationData();
        const d = viz.data as { episodeRewards: number[] };
        setQlRewards([...d.episodeRewards]);
        setQlEp(qlEpRef.current);
      }
    }

    totalEpsRef.current++;
    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, [completeQuest, collectCard, trainEpisodes]);

  const startTraining = useCallback(() => {
    sarsaRef.current = new SARSAAlgorithm(NUM_STATES, 4, 66666);
    qlRef.current = new QLearningAlgorithm(NUM_STATES, 4, 66667);
    sarsaRef.current.setHyperparameter('learningRate', learningRate);
    sarsaRef.current.setHyperparameter('epsilon', epsilon);
    qlRef.current.setHyperparameter('learningRate', learningRate);
    qlRef.current.setHyperparameter('epsilon', epsilon);

    sarsaStateRef.current = sarsaEnvRef.current.reset();
    qlStateRef.current = qlEnvRef.current.reset();
    sarsaEpRef.current = 0;
    qlEpRef.current = 0;
    sarsaStepRef.current = 0;
    qlStepRef.current = 0;
    totalEpsRef.current = 0;

    setSarsaPos(CONFIG.start);
    setQlPos(CONFIG.start);
    setSarsaEp(0);
    setQlEp(0);
    setSarsaRewards([]);
    setQlRewards([]);

    isRunningRef.current = true;
    setIsRunning(true);
    setPhase('training');
    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, [learningRate, epsilon, tick]);

  const togglePause = useCallback(() => {
    if (isRunningRef.current) {
      isRunningRef.current = false;
      setIsRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      isRunningRef.current = true;
      setIsRunning(true);
      timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
    }
  }, [tick]);

  useEffect(() => () => {
    isRunningRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  if (phase === 'briefing') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
        <PixelPanel className="text-center">
          <div className="text-5xl mb-4">🏔️</div>
          <h3 className="font-pixel text-sm text-[#4ade80] glow-accent mb-3">{t('sarsa.quest.title')}</h3>
          <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('sarsa.quest.briefing')}</p>
          <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
            {[t('sarsa.quest.rule1'), t('sarsa.quest.rule2'), t('sarsa.quest.rule3')].map((r, i) => (
              <p key={i} className="font-body text-base text-[#e2e8f0]">• {r}</p>
            ))}
          </div>
          <PixelButton onClick={() => setPhase('config')}>{t('common.next')} →</PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (phase === 'config') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
        <PixelPanel>
          <h3 className="font-pixel text-sm text-[#4ade80] mb-4">{t('sarsa.quest.configTitle')}</h3>
          <div className="flex flex-col gap-4 mb-6">
            <PixelSlider label={t('sarsa.quest.learningRate')} value={learningRate} min={0.01} max={0.5} step={0.01} onChange={setLearningRate} />
            <PixelSlider label={t('sarsa.quest.epsilonRate')} value={epsilon} min={0.01} max={0.5} step={0.01} onChange={setEpsilon} />
            <PixelSlider label={t('sarsa.quest.episodes')} value={trainEpisodes} min={50} max={300} step={10} onChange={setTrainEpisodes} displayValue={String(trainEpisodes)} />
          </div>
          <p className="font-body text-sm text-[#708090] mb-4">{t('sarsa.quest.tip')}</p>
          <PixelButton onClick={startTraining}>{t('sarsa.quest.startTraining')}</PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (phase === 'training') {
    return (
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        <PixelPanel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-pixel text-sm text-[#4ade80]">{t('sarsa.quest.trainingTitle')}</h3>
              <p className="font-body text-sm text-[#708090]">{t('sarsa.quest.trainingDesc', { sarsa: sarsaEp, ql: qlEp, total: trainEpisodes })}</p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {[1, 2, 5, 10].map((s) => (
                <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
              ))}
              <PixelButton size="sm" onClick={togglePause}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
            </div>
          </div>
        </PixelPanel>

        <div className="grid grid-cols-2 gap-4">
          <PixelPanel>
            <span className="font-pixel text-xs text-[#00d4ff] block mb-2">Q-Learning (ep {qlEp})</span>
            <GridWorld
              rows={CONFIG.rows} cols={CONFIG.cols}
              walls={CONFIG.walls} traps={CONFIG.traps}
              treasures={CONFIG.treasures} exit={CONFIG.exit}
              playerPos={qlPos} showHeatmap mode="auto"
            />
          </PixelPanel>
          <PixelPanel>
            <span className="font-pixel text-xs text-[#4ade80] block mb-2">SARSA (ep {sarsaEp})</span>
            <GridWorld
              rows={CONFIG.rows} cols={CONFIG.cols}
              walls={CONFIG.walls} traps={CONFIG.traps}
              treasures={CONFIG.treasures} exit={CONFIG.exit}
              playerPos={sarsaPos} showHeatmap mode="auto"
            />
          </PixelPanel>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PixelPanel>
            <RewardChart data={qlRewards} accentColor="#00d4ff" height={100} />
          </PixelPanel>
          <PixelPanel>
            <RewardChart data={sarsaRewards} accentColor="#4ade80" height={100} />
          </PixelPanel>
        </div>
      </div>
    );
  }

  // Results
  const r = questResult!;
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel variant={r.passed ? 'gold' : 'default'} className="text-center">
        <div className="text-5xl mb-4">{r.passed ? '🏆' : '💪'}</div>
        <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(r.rank) }}>
          {r.passed ? t('sarsa.quest.passed') : t('sarsa.quest.failed')}
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4 max-w-xs mx-auto">
          <div className="text-center">
            <span className="font-pixel text-[10px] text-[#708090] block">{t('sarsa.quest.sarsaAvg')}</span>
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
          {!r.passed && (
            <PixelButton variant="secondary" onClick={() => setPhase('config')}>{t('common.retry')}</PixelButton>
          )}
          <PixelButton onClick={onComplete}>{t('common.next')} →</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
