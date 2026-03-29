import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GridWorldEnvironment, QLearningAlgorithm } from '@/algorithms/qlearning';
import { SARSAAlgorithm } from '@/algorithms/sarsa';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_EPISODES = 200;
const MAX_STEPS_PER_EP = 100;

function getStepDelay(speed: number): number {
  switch (speed) {
    case 1: return 120;
    case 2: return 50;
    case 5: return 15;
    case 10: return 2;
    default: return 120;
  }
}

export function SARSAWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();

  const sarsaAgentRef = useRef(new SARSAAlgorithm(NUM_STATES, 4, 55555));
  const qlAgentRef = useRef(new QLearningAlgorithm(NUM_STATES, 4, 55556));
  const sarsaEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const qlEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sarsaStateRef = useRef(CONFIG.start);
  const qlStateRef = useRef(CONFIG.start);

  const [sarsaPos, setSarsaPos] = useState(CONFIG.start);
  const [qlPos, setQlPos] = useState(CONFIG.start);
  const [sarsaQTable, setSarsaQTable] = useState<number[][]>(
    Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]),
  );
  const [qlQTable, setQlQTable] = useState<number[][]>(
    Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]),
  );
  const [sarsaEpisodes, setSarsaEpisodes] = useState(0);
  const [qlEpisodes, setQlEpisodes] = useState(0);
  const [sarsaRewards, setSarsaRewards] = useState<number[]>([]);
  const [qlRewards, setQlRewards] = useState<number[]>([]);

  const [learningRate, setLearningRate] = useState(0.1);
  const [epsilon, setEpsilon] = useState(0.15);

  const sarsaEpRef = useRef(0);
  const qlEpRef = useRef(0);
  const sarsaStepRef = useRef(0);
  const qlStepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const resetAll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false;
    setIsRunning(false);

    sarsaAgentRef.current = new SARSAAlgorithm(NUM_STATES, 4, 55555);
    qlAgentRef.current = new QLearningAlgorithm(NUM_STATES, 4, 55556);
    sarsaAgentRef.current.setHyperparameter('learningRate', learningRate);
    qlAgentRef.current.setHyperparameter('learningRate', learningRate);
    sarsaAgentRef.current.setHyperparameter('epsilon', epsilon);
    qlAgentRef.current.setHyperparameter('epsilon', epsilon);

    const sStart = sarsaEnvRef.current.reset();
    const qStart = qlEnvRef.current.reset();
    sarsaStateRef.current = sStart;
    qlStateRef.current = qStart;
    sarsaEpRef.current = 0;
    qlEpRef.current = 0;
    sarsaStepRef.current = 0;
    qlStepRef.current = 0;

    setSarsaPos(sStart);
    setQlPos(qStart);
    setSarsaQTable(Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]));
    setQlQTable(Array.from({ length: NUM_STATES }, () => [0, 0, 0, 0]));
    setSarsaEpisodes(0);
    setQlEpisodes(0);
    setSarsaRewards([]);
    setQlRewards([]);
  }, [learningRate, epsilon]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    // SARSA step
    if (sarsaEpRef.current < MAX_EPISODES) {
      const { action } = sarsaAgentRef.current.step(sarsaStateRef.current);
      const result = sarsaEnvRef.current.step(sarsaStateRef.current, action);
      sarsaAgentRef.current.update({ state: sarsaStateRef.current, action, reward: result.reward, nextState: result.nextState, done: result.done });
      sarsaStateRef.current = result.nextState;
      sarsaStepRef.current++;
      if (result.done || sarsaStepRef.current >= MAX_STEPS_PER_EP) {
        sarsaStateRef.current = sarsaEnvRef.current.reset();
        sarsaEpRef.current++;
        sarsaStepRef.current = 0;
        sarsaAgentRef.current.startEpisode();
        const sViz = sarsaAgentRef.current.getVisualizationData();
        const sd = sViz.data as { qTable: number[][]; episodeRewards: number[] };
        setSarsaQTable(sd.qTable.map((r) => [...r]));
        setSarsaRewards([...sd.episodeRewards]);
        setSarsaEpisodes(sarsaEpRef.current);
      }
      setSarsaPos(sarsaStateRef.current);
    }

    // Q-Learning step
    if (qlEpRef.current < MAX_EPISODES) {
      const { action } = qlAgentRef.current.step(qlStateRef.current);
      const result = qlEnvRef.current.step(qlStateRef.current, action);
      qlAgentRef.current.update({ state: qlStateRef.current, action, reward: result.reward, nextState: result.nextState, done: result.done });
      qlStateRef.current = result.nextState;
      qlStepRef.current++;
      if (result.done || qlStepRef.current >= MAX_STEPS_PER_EP) {
        qlStateRef.current = qlEnvRef.current.reset();
        qlEpRef.current++;
        qlStepRef.current = 0;
        qlAgentRef.current.startEpisode();
        const qViz = qlAgentRef.current.getVisualizationData();
        const qd = qViz.data as { qTable: number[][]; episodeRewards: number[] };
        setQlQTable(qd.qTable.map((r) => [...r]));
        setQlRewards([...qd.episodeRewards]);
        setQlEpisodes(qlEpRef.current);
      }
      setQlPos(qlStateRef.current);
    }

    const done = sarsaEpRef.current >= MAX_EPISODES && qlEpRef.current >= MAX_EPISODES;
    if (done) {
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, []);

  const togglePlay = useCallback(() => {
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

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Controls */}
      <PixelPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-pixel text-sm text-[#4ade80] mb-1">{t('sarsa.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">{t('sarsa.watch.desc')}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 5, 10].map((s) => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={resetAll}>{t('common.reset')}</PixelButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <PixelSlider
            label={t('sarsa.watch.learningRate')}
            value={learningRate}
            min={0.01} max={0.5} step={0.01}
            onChange={setLearningRate}
          />
          <PixelSlider
            label={t('sarsa.watch.epsilon')}
            value={epsilon}
            min={0.01} max={0.5} step={0.01}
            onChange={setEpsilon}
          />
        </div>
      </PixelPanel>

      {/* Side-by-side grids */}
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-xs text-[#00d4ff]">{t('sarsa.watch.qlearning')}</span>
            <span className="font-pixel text-xs text-[#708090]">ep {qlEpisodes}</span>
          </div>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={qlPos}
            qValues={qlQTable} showHeatmap showArrows
            mode="auto"
          />
        </PixelPanel>
        <PixelPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-xs text-[#4ade80]">{t('sarsa.watch.sarsa')}</span>
            <span className="font-pixel text-xs text-[#708090]">ep {sarsaEpisodes}</span>
          </div>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={sarsaPos}
            qValues={sarsaQTable} showHeatmap showArrows
            mode="auto"
          />
        </PixelPanel>
      </div>

      {/* Reward charts */}
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#00d4ff] mb-2">Q-Learning</p>
          <RewardChart data={qlRewards} accentColor="#00d4ff" height={100} />
        </PixelPanel>
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#4ade80] mb-2">SARSA</p>
          <RewardChart data={sarsaRewards} accentColor="#4ade80" height={100} />
        </PixelPanel>
      </div>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('sarsa.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
