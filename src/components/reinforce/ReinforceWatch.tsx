import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { REINFORCEAlgorithm } from '@/algorithms/reinforce';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_EPISODES = 150;
const MAX_STEPS_PER_EP = 80;

function getStepDelay(speed: number): number {
  return speed === 1 ? 120 : speed === 2 ? 50 : speed === 5 ? 15 : 2;
}

export function ReinforceWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const agentRef = useRef(new REINFORCEAlgorithm(NUM_STATES, 4, 77001));
  const envRef = useRef(new GridWorldEnvironment(CONFIG));

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [learningRate, setLearningRate] = useState(0.02);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(CONFIG.start);
  const epRef = useRef(0);
  const stepRef = useRef(0);

  const [playerPos, setPlayerPos] = useState(CONFIG.start);
  const [episodes, setEpisodes] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);
  const [probs, setProbs] = useState<number[][]>(
    Array.from({ length: NUM_STATES }, () => [0.25, 0.25, 0.25, 0.25])
  );

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const resetAll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false;
    setIsRunning(false);
    agentRef.current = new REINFORCEAlgorithm(NUM_STATES, 4, 77001);
    agentRef.current.setHyperparameter('learningRate', learningRate);
    const start = envRef.current.reset();
    stateRef.current = start;
    epRef.current = 0; stepRef.current = 0;
    setPlayerPos(start); setEpisodes(0); setRewardHistory([]);
    setProbs(Array.from({ length: NUM_STATES }, () => [0.25, 0.25, 0.25, 0.25]));
  }, [learningRate]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;
    if (epRef.current >= MAX_EPISODES) {
      isRunningRef.current = false; setIsRunning(false); return;
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
      const d = viz.data as { probs: number[][]; rewardHistory: number[] };
      setProbs(d.probs.map(r => [...r]));
      setRewardHistory([...d.rewardHistory]);
      setEpisodes(epRef.current);
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

  // Find highest-probability action per state for arrow overlay
  const qProxy = probs.map(p => p.map((v, i) => v * 10 - 2.5 + i * 0.01));

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-pixel text-sm text-[#f97316] mb-1">{t('reinforce.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">
              {t('reinforce.watch.desc', { ep: episodes, total: MAX_EPISODES })}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={resetAll}>{t('common.reset')}</PixelButton>
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <PixelSlider label={t('reinforce.watch.learningRate')} value={learningRate}
            min={0.001} max={0.1} step={0.001} onChange={setLearningRate} />
        </div>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#f97316] mb-2">{t('reinforce.watch.agentLabel', { ep: episodes })}</p>
          <GridWorld
            rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={playerPos}
            qValues={qProxy} showArrows
            mode="auto"
          />
        </PixelPanel>
        <PixelPanel className="flex flex-col gap-2">
          <p className="font-pixel text-[10px] text-[#708090] mb-1">{t('reinforce.watch.policyHint')}</p>
          {/* Show top-3 state probabilities */}
          {probs.slice(0, 6).map((p, s) => (
            <div key={s} className="flex items-center gap-1">
              <span className="font-pixel text-[9px] text-[#708090] w-12">s{s}:</span>
              {p.map((v, a) => (
                <div key={a} className="flex-1 h-2 bg-[#0a0e27] overflow-hidden rounded"
                  title={`${['⬆️', '➡️', '⬇️', '⬅️'][a]} ${(v * 100).toFixed(0)}%`}>
                  <div className="h-full" style={{
                    width: `${v * 100}%`,
                    background: ['#00d4ff', '#4ade80', '#f87171', '#ffd700'][a],
                    opacity: 0.8,
                  }} />
                </div>
              ))}
            </div>
          ))}
        </PixelPanel>
      </div>

      <PixelPanel>
        <p className="font-pixel text-[10px] text-[#f97316] mb-2">{t('reinforce.watch.rewardChart')}</p>
        <RewardChart data={rewardHistory} accentColor="#f97316" height={100} />
      </PixelPanel>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('reinforce.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
