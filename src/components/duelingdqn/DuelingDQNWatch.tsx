import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import { DuelingDQN } from '@/algorithms/duelingDqn';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const CONFIG = GRID_CONFIGS.feel;
const STATE_SIZE = 4;
const ACTION_SIZE = 4;
const MAX_EPISODES = 100;
const MAX_STEPS = 80;
const DIRS = ['Up', 'Right', 'Down', 'Left'];

function encodeState(state: number): number[] {
  const cols = 6;
  const rows = 6;
  const row = Math.floor(state / cols) / (rows - 1);
  const col = (state % cols) / (cols - 1);
  return [row, col, (rows - 1 - Math.floor(state / cols)) / (rows - 1), (cols - 1 - state % cols) / (cols - 1)];
}

function getStepDelay(speed: number): number {
  return speed === 1 ? 100 : speed === 2 ? 40 : speed === 5 ? 10 : 1;
}

export function DuelingDQNWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();

  const agentRef = useRef(new DuelingDQN(STATE_SIZE, ACTION_SIZE, 16, 201));
  const envRef = useRef(new GridWorldEnvironment(CONFIG));

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [agentPos, setAgentPos] = useState(CONFIG.start);
  const [episode, setEpisode] = useState(0);
  const [rewards, setRewards] = useState<number[]>([]);
  const [stateValue, setStateValue] = useState(0);
  const [advantages, setAdvantages] = useState<number[]>([0, 0, 0, 0]);
  const [qValues, setQValues] = useState<number[]>([0, 0, 0, 0]);
  const [_stateValueHistory, setStateValueHistory] = useState<number[]>([]);

  const stateRef = useRef(CONFIG.start);
  const epRef = useRef(0);
  const stepRef = useRef(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const resetAgent = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false;
    setIsRunning(false);
    agentRef.current = new DuelingDQN(STATE_SIZE, ACTION_SIZE, 16, 201);
    stateRef.current = envRef.current.reset();
    epRef.current = 0;
    stepRef.current = 0;
    setAgentPos(CONFIG.start);
    setEpisode(0);
    setRewards([]);
    setStateValue(0);
    setAdvantages([0, 0, 0, 0]);
    setQValues([0, 0, 0, 0]);
    setStateValueHistory([]);
  }, []);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    if (epRef.current >= MAX_EPISODES) {
      isRunningRef.current = false;
      setIsRunning(false);
      return;
    }

    const s = encodeState(stateRef.current);
    const { action, metadata } = agentRef.current.step(s);
    const info = metadata.info as { qValues?: number[]; stateValue?: number; advantages?: number[] };

    if (info.qValues) setQValues([...info.qValues]);
    if (info.stateValue !== undefined) {
      setStateValue(info.stateValue);
      setStateValueHistory((p) => [...p.slice(-99), info.stateValue!]);
    }
    if (info.advantages) setAdvantages([...info.advantages]);

    const result = envRef.current.step(stateRef.current, action);
    const nextS = encodeState(result.nextState);
    agentRef.current.update({ state: s, action, reward: result.reward, nextState: nextS, done: result.done });
    stateRef.current = result.nextState;
    stepRef.current++;
    setAgentPos(stateRef.current);

    if (result.done || stepRef.current >= MAX_STEPS) {
      stateRef.current = envRef.current.reset();
      epRef.current++;
      stepRef.current = 0;
      const viz = agentRef.current.getVisualizationData();
      const d = viz.data as { episodeRewards: number[] };
      setRewards([...d.episodeRewards]);
      setEpisode(epRef.current);
    }

    timeoutRef.current = setTimeout(tick, getStepDelay(speedRef.current));
  }, []);

  const togglePlay = useCallback(() => {
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

  const maxAdv = Math.max(...advantages.map(Math.abs), 0.01);
  const maxQ = Math.max(...qValues.map(Math.abs), 0.01);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-pixel text-sm text-[#00d4ff] mb-1">{t('duelingdqn.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">{t('duelingdqn.watch.desc')} — ep {episode}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 5, 10].map((s) => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={resetAgent}>{t('common.reset')}</PixelButton>
          </div>
        </div>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-4">
        {/* Grid */}
        <PixelPanel>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={agentPos} mode="auto"
          />
        </PixelPanel>

        {/* V(s) and A(s,a) decomposition */}
        <div className="flex flex-col gap-3">
          {/* State Value */}
          <PixelPanel>
            <p className="font-pixel text-[10px] text-[#4ade80] mb-2">{t('duelingdqn.watch.stateValue')}: V(s)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-6 bg-[#1e2448] rounded relative overflow-hidden">
                <div
                  className="h-6 rounded transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.abs(stateValue) * 10)}%`,
                    backgroundColor: stateValue >= 0 ? '#4ade80' : '#f87171',
                  }}
                />
              </div>
              <span className="font-pixel text-sm" style={{ color: stateValue >= 0 ? '#4ade80' : '#f87171' }}>
                {stateValue.toFixed(2)}
              </span>
            </div>
          </PixelPanel>

          {/* Advantages */}
          <PixelPanel>
            <p className="font-pixel text-[10px] text-[#ffd700] mb-2">{t('duelingdqn.watch.advantages')}: A(s,a)</p>
            {advantages.map((adv, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <span className="font-pixel text-[9px] text-[#708090] w-8">{DIRS[i]}</span>
                <div className="flex-1 h-3 bg-[#1e2448] rounded relative">
                  <div className="absolute left-1/2 top-0 h-3 w-px bg-[#708090]/50" />
                  <div
                    className="h-3 rounded absolute transition-all duration-200"
                    style={{
                      left: adv >= 0 ? '50%' : `${50 - Math.abs(adv) / maxAdv * 50}%`,
                      width: `${Math.abs(adv) / maxAdv * 50}%`,
                      backgroundColor: adv >= 0 ? '#ffd700' : '#f87171',
                    }}
                  />
                </div>
                <span className="font-pixel text-[9px] text-[#e2e8f0] w-8 text-right">{adv.toFixed(2)}</span>
              </div>
            ))}
          </PixelPanel>

          {/* Q values */}
          <PixelPanel>
            <p className="font-pixel text-[10px] text-[#00d4ff] mb-2">{t('duelingdqn.watch.qValues')}: Q = V + A − mean(A)</p>
            <div className="flex gap-1 h-12">
              {qValues.map((q, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="rounded transition-all duration-200"
                    style={{
                      height: `${Math.abs(q) / maxQ * 100}%`,
                      backgroundColor: q >= 0 ? '#00d4ff' : '#f87171',
                      opacity: 0.8,
                    }}
                  />
                  <span className="font-pixel text-[7px] text-center text-[#708090] mt-1 block">{DIRS[i][0]}</span>
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>
      </div>

      {/* Reward chart */}
      <PixelPanel>
        <RewardChart data={rewards} accentColor="#00d4ff" height={100} />
      </PixelPanel>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('duelingdqn.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
