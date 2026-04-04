import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { A2CAlgorithm } from '@/algorithms/a2c';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_EPISODES_PER_WORKER = 100;
const MAX_STEPS_PER_EP = 60;
const WORKER_COLORS = ['#00d4ff', '#4ade80', '#ffd700', '#f87171'];

function getDelay(speed: number) { return speed === 1 ? 80 : speed === 2 ? 30 : speed === 5 ? 8 : 1; }

export function A2CWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const [numWorkers, setNumWorkers] = useState(4);
  const [speed, setSpeed] = useState(2);
  const [actorLR, setActorLR] = useState(0.01);
  const [isRunning, setIsRunning] = useState(false);

  const agentRef = useRef<A2CAlgorithm | null>(null);
  const envsRef = useRef<GridWorldEnvironment[]>([]);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerStatesRef = useRef<number[]>([]);
  const workerEpsRef = useRef<number[]>([]);
  const workerStepsRef = useRef<number[]>([]);

  const [workerPositions, setWorkerPositions] = useState<number[]>([0, 0, 0, 0]);
  const [workerEps, setWorkerEps] = useState<number[]>([0, 0, 0, 0]);
  const [sharedRewards, setSharedRewards] = useState<number[]>([]);
  const [totalEps, setTotalEps] = useState(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const init = useCallback((n: number, lr: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false; setIsRunning(false);

    agentRef.current = new A2CAlgorithm(NUM_STATES, 4, n, 55001);
    agentRef.current.setHyperparameter('actorLR', lr);
    envsRef.current = Array.from({ length: n }, () => new GridWorldEnvironment(CONFIG));
    workerStatesRef.current = envsRef.current.map(e => e.reset());
    workerEpsRef.current = new Array(n).fill(0);
    workerStepsRef.current = new Array(n).fill(0);
    setWorkerPositions([...workerStatesRef.current.slice(0, 4)]);
    setWorkerEps(new Array(n).fill(0));
    setSharedRewards([]); setTotalEps(0);
  }, []);

  useEffect(() => { init(numWorkers, actorLR); }, [numWorkers, actorLR, init]);

  const tick = useCallback(() => {
    if (!isRunningRef.current || !agentRef.current) return;
    const n = agentRef.current.numWorkers ?? numWorkers;
    let anyActive = false;

    for (let w = 0; w < n; w++) {
      if (workerEpsRef.current[w] >= MAX_EPISODES_PER_WORKER) continue;
      anyActive = true;
      const state = workerStatesRef.current[w];
      const { action } = agentRef.current.step(state);
      const res = envsRef.current[w].step(state, action);
      agentRef.current.updateForWorker(w, {
        state, action, reward: res.reward, nextState: res.nextState, done: res.done,
      });
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
    setWorkerPositions([...workerStatesRef.current.slice(0, 4)]);
    setWorkerEps([...workerEpsRef.current]);
    setTotalEps(eps);

    if (!anyActive) {
      isRunningRef.current = false; setIsRunning(false);
      agentRef.current.getVisualizationData(); // finalize visualization state
      const allRewards: number[] = [];
      for (let w = 0; w < n; w++) {
        const wd = agentRef.current.getVisualizationData().data as { workerRecentRewards: number[] };
        allRewards.push(wd.workerRecentRewards[w] ?? 0);
      }
      setSharedRewards(allRewards);
      return;
    }

    const viz = agentRef.current.getVisualizationData();
    const d = viz.data as { workerRecentRewards: number[] };
    setSharedRewards([...(d.workerRecentRewards ?? [])]);

    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [numWorkers]);

  const togglePlay = useCallback(() => {
    if (isRunningRef.current) {
      isRunningRef.current = false; setIsRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      isRunningRef.current = true; setIsRunning(true);
      timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
    }
  }, [tick]);

  useEffect(() => () => { isRunningRef.current = false; if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-pixel text-sm text-[#22d3ee] mb-1">{t('a2c.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">
              {t('a2c.watch.desc', { total: totalEps })}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex gap-2 items-center">
            <span className="font-pixel text-[10px] text-[#708090]">{t('a2c.watch.workers')}</span>
            {[2, 4, 8].map(n => (
              <PixelButton key={n} size="sm" variant={numWorkers === n ? 'primary' : 'secondary'}
                onClick={() => setNumWorkers(n)}>{n}</PixelButton>
            ))}
          </div>
          <div className="flex-1 min-w-[180px]">
            <PixelSlider label={t('a2c.watch.actorLR')} value={actorLR} min={0.001} max={0.05} step={0.001} onChange={setActorLR} />
          </div>
        </div>
      </PixelPanel>

      {/* Worker grids */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: Math.min(numWorkers, 4) }).map((_, w) => (
          <PixelPanel key={w}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-[10px]" style={{ color: WORKER_COLORS[w] }}>
                {t('a2c.watch.worker')} {w + 1}
              </span>
              <span className="font-pixel text-[10px] text-[#708090]">ep {workerEps[w] ?? 0}</span>
            </div>
            <GridWorld
              rows={CONFIG.rows} cols={CONFIG.cols}
              walls={CONFIG.walls} traps={CONFIG.traps}
              treasures={CONFIG.treasures} exit={CONFIG.exit}
              playerPos={workerPositions[w] ?? 0}
              mode="auto"
            />
          </PixelPanel>
        ))}
      </div>

      {/* Shared reward chart */}
      <PixelPanel>
        <p className="font-pixel text-[10px] text-[#22d3ee] mb-2">{t('a2c.watch.sharedRewards')}</p>
        <RewardChart data={sharedRewards} accentColor="#22d3ee" height={80} />
      </PixelPanel>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('a2c.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
