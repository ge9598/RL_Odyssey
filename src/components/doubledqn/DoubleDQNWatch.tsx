import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import { DQN } from '@/algorithms/dqn';
import { DoubleDQN } from '@/algorithms/doubleDqn';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const STATE_SIZE = 4; // one-hot encoded position features
const ACTION_SIZE = 4;
const MAX_EPISODES = 100;
const MAX_STEPS = 80;

function encodeState(state: number, numStates: number): number[] {
  // Simple position encoding: normalized row and col
  const cols = 6;
  const row = Math.floor(state / cols) / (numStates / cols - 1);
  const col = (state % cols) / (cols - 1);
  // Add distance-to-exit
  const exit = numStates - 1;
  const exitRow = Math.floor(exit / cols) / (numStates / cols - 1);
  const exitCol = (exit % cols) / (cols - 1);
  return [row, col, exitRow - row, exitCol - col];
}

function getStepDelay(speed: number): number {
  return speed === 1 ? 100 : speed === 2 ? 40 : speed === 5 ? 10 : 1;
}

export function DoubleDQNWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();

  const dqnRef = useRef(new DQN(STATE_SIZE, ACTION_SIZE, 16, 77));
  const ddqnRef = useRef(new DoubleDQN(STATE_SIZE, ACTION_SIZE, 16, 78));
  const dqnEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const ddqnEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dqnPos, setDqnPos] = useState(CONFIG.start);
  const [ddqnPos, setDdqnPos] = useState(CONFIG.start);
  const [dqnEp, setDqnEp] = useState(0);
  const [ddqnEp, setDdqnEp] = useState(0);
  const [dqnRewards, setDqnRewards] = useState<number[]>([]);
  const [ddqnRewards, setDdqnRewards] = useState<number[]>([]);
  const [overestimation, setOverestimation] = useState<number[]>([]);

  const dqnStateRef = useRef(CONFIG.start);
  const ddqnStateRef = useRef(CONFIG.start);
  const dqnEpRef = useRef(0);
  const ddqnEpRef = useRef(0);
  const dqnStepRef = useRef(0);
  const ddqnStepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const resetAll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false;
    setIsRunning(false);
    dqnRef.current = new DQN(STATE_SIZE, ACTION_SIZE, 16, 77);
    ddqnRef.current = new DoubleDQN(STATE_SIZE, ACTION_SIZE, 16, 78);
    dqnStateRef.current = dqnEnvRef.current.reset();
    ddqnStateRef.current = ddqnEnvRef.current.reset();
    dqnEpRef.current = 0; ddqnEpRef.current = 0;
    dqnStepRef.current = 0; ddqnStepRef.current = 0;
    setDqnPos(CONFIG.start); setDdqnPos(CONFIG.start);
    setDqnEp(0); setDdqnEp(0);
    setDqnRewards([]); setDdqnRewards([]);
    setOverestimation([]);
  }, []);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    if (dqnEpRef.current >= MAX_EPISODES && ddqnEpRef.current >= MAX_EPISODES) {
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    // DQN step
    if (dqnEpRef.current < MAX_EPISODES) {
      const state = encodeState(dqnStateRef.current, NUM_STATES);
      const { action } = dqnRef.current.step(state);
      const result = dqnEnvRef.current.step(dqnStateRef.current, action);
      const nextState = encodeState(result.nextState, NUM_STATES);
      dqnRef.current.update({ state, action, reward: result.reward, nextState, done: result.done });
      dqnStateRef.current = result.nextState;
      dqnStepRef.current++;
      setDqnPos(dqnStateRef.current);
      if (result.done || dqnStepRef.current >= MAX_STEPS) {
        dqnStateRef.current = dqnEnvRef.current.reset();
        dqnEpRef.current++;
        dqnStepRef.current = 0;
        const viz = dqnRef.current.getVisualizationData();
        const d = viz.data as { episodeRewards: number[] };
        setDqnRewards([...d.episodeRewards]);
        setDqnEp(dqnEpRef.current);
      }
    }

    // Double DQN step
    if (ddqnEpRef.current < MAX_EPISODES) {
      const state = encodeState(ddqnStateRef.current, NUM_STATES);
      const { action } = ddqnRef.current.step(state);
      const result = ddqnEnvRef.current.step(ddqnStateRef.current, action);
      const nextState = encodeState(result.nextState, NUM_STATES);
      ddqnRef.current.update({ state, action, reward: result.reward, nextState, done: result.done });
      ddqnStateRef.current = result.nextState;
      ddqnStepRef.current++;
      setDdqnPos(ddqnStateRef.current);
      if (result.done || ddqnStepRef.current >= MAX_STEPS) {
        ddqnStateRef.current = ddqnEnvRef.current.reset();
        ddqnEpRef.current++;
        ddqnStepRef.current = 0;
        const viz = ddqnRef.current.getVisualizationData();
        const d = viz.data as { episodeRewards: number[]; avgOverestimation: number };
        setDdqnRewards([...d.episodeRewards]);
        setDdqnEp(ddqnEpRef.current);
        setOverestimation((prev) => [...prev, d.avgOverestimation]);
      }
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

  useEffect(() => () => {
    isRunningRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const avgOver = overestimation.length > 0
    ? (overestimation.reduce((a, b) => a + b, 0) / overestimation.length).toFixed(3)
    : '0.000';

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-pixel text-sm text-[#ffd700] mb-1">{t('doubledqn.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">{t('doubledqn.watch.desc')}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 5, 10].map((s) => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={resetAll}>{t('common.reset')}</PixelButton>
          </div>
        </div>
      </PixelPanel>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <PixelPanel className="text-center">
          <span className="font-pixel text-[10px] text-[#f87171] block">{t('doubledqn.watch.dqnEp')}</span>
          <span className="font-pixel text-lg text-[#f87171]">{dqnEp}</span>
        </PixelPanel>
        <PixelPanel className="text-center">
          <span className="font-pixel text-[10px] text-[#ffd700] block">{t('doubledqn.watch.overestimation')}</span>
          <span className="font-pixel text-lg text-[#ffd700]">{avgOver}</span>
        </PixelPanel>
        <PixelPanel className="text-center">
          <span className="font-pixel text-[10px] text-[#4ade80] block">{t('doubledqn.watch.ddqnEp')}</span>
          <span className="font-pixel text-lg text-[#4ade80]">{ddqnEp}</span>
        </PixelPanel>
      </div>

      {/* Grids */}
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <span className="font-pixel text-xs text-[#f87171] block mb-2">{t('doubledqn.watch.dqnLabel')}</span>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={dqnPos} mode="auto"
          />
        </PixelPanel>
        <PixelPanel>
          <span className="font-pixel text-xs text-[#4ade80] block mb-2">{t('doubledqn.watch.ddqnLabel')}</span>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={ddqnPos} mode="auto"
          />
        </PixelPanel>
      </div>

      {/* Reward charts */}
      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <RewardChart data={dqnRewards} accentColor="#f87171" height={100} />
        </PixelPanel>
        <PixelPanel>
          <RewardChart data={ddqnRewards} accentColor="#4ade80" height={100} />
        </PixelPanel>
      </div>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('doubledqn.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
