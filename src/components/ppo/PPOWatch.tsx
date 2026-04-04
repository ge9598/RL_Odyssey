import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { PPOAlgorithm } from '@/algorithms/ppo';
import { REINFORCEAlgorithm } from '@/algorithms/reinforce';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_EPISODES = 200;
const MAX_STEPS_PER_EP = 60;

function getDelay(speed: number) { return speed === 1 ? 80 : speed === 2 ? 30 : speed === 5 ? 8 : 1; }

export function PPOWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const [speed, setSpeed] = useState(2);
  const [clipEpsilon, setClipEpsilon] = useState(0.2);
  const [isRunning, setIsRunning] = useState(false);

  const ppoRef = useRef<PPOAlgorithm | null>(null);
  const rfRef = useRef<REINFORCEAlgorithm | null>(null);
  const ppoEnvRef = useRef<GridWorldEnvironment | null>(null);
  const rfEnvRef = useRef<GridWorldEnvironment | null>(null);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ppoStateRef = useRef(0);
  const rfStateRef = useRef(0);
  const ppoStepsRef = useRef(0);
  const rfStepsRef = useRef(0);
  const ppoEpRef = useRef(0);
  const rfEpRef = useRef(0);

  const ppoEpBufRef = useRef<{ state: number; action: number; reward: number }[]>([]);
  const rfEpBufRef = useRef<{ state: number; action: number; reward: number }[]>([]);

  const [ppoPos, setPpoPos] = useState(0);
  const [rfPos, setRfPos] = useState(0);
  const [ppoEp, setPpoEp] = useState(0);
  const [rfEp, setRfEp] = useState(0);
  const [ppoRewards, setPpoRewards] = useState<number[]>([]);
  const [rfRewards, setRfRewards] = useState<number[]>([]);
  const [clipFraction, setClipFraction] = useState(0);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const init = useCallback((eps: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false; setIsRunning(false);

    ppoRef.current = new PPOAlgorithm(NUM_STATES, 4, 44001);
    ppoRef.current.setHyperparameter('clipEpsilon', eps);
    rfRef.current = new REINFORCEAlgorithm(NUM_STATES, 4, 44002);
    ppoEnvRef.current = new GridWorldEnvironment(CONFIG);
    rfEnvRef.current = new GridWorldEnvironment(CONFIG);

    ppoStateRef.current = ppoEnvRef.current.reset();
    rfStateRef.current = rfEnvRef.current.reset();
    ppoStepsRef.current = 0; rfStepsRef.current = 0;
    ppoEpRef.current = 0; rfEpRef.current = 0;
    ppoEpBufRef.current = []; rfEpBufRef.current = [];
    setPpoPos(ppoStateRef.current); setRfPos(rfStateRef.current);
    setPpoEp(0); setRfEp(0); setPpoRewards([]); setRfRewards([]); setClipFraction(0);
  }, []);

  useEffect(() => { init(clipEpsilon); }, [init]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    // Step PPO
    if (ppoEpRef.current < MAX_EPISODES && ppoRef.current && ppoEnvRef.current) {
      const s = ppoStateRef.current;
      const { action } = ppoRef.current.step(s);
      const res = ppoEnvRef.current.step(s, action);
      ppoEpBufRef.current.push({ state: s, action, reward: res.reward });
      ppoStateRef.current = res.nextState;
      ppoStepsRef.current++;

      if (res.done || ppoStepsRef.current >= MAX_STEPS_PER_EP) {
        // Replay episode into PPO
        const buf = ppoEpBufRef.current;
        for (let i = 0; i < buf.length; i++) {
          ppoRef.current.update({ state: buf[i].state, action: buf[i].action, reward: buf[i].reward, nextState: i + 1 < buf.length ? buf[i + 1].state : res.nextState, done: i === buf.length - 1 });
        }
        ppoEpBufRef.current = [];
        ppoStateRef.current = ppoEnvRef.current.reset();
        ppoEpRef.current++;
        ppoStepsRef.current = 0;

        const viz = ppoRef.current.getVisualizationData();
        const d = viz.data as { rewardHistory: number[]; lastClipCount: number; lastTotalCount: number };
        setPpoRewards([...(d.rewardHistory ?? [])]);
        const cf = d.lastTotalCount > 0 ? d.lastClipCount / d.lastTotalCount : 0;
        setClipFraction(cf);
      }
      setPpoPos(ppoStateRef.current);
      setPpoEp(ppoEpRef.current);
    }

    // Step REINFORCE
    if (rfEpRef.current < MAX_EPISODES && rfRef.current && rfEnvRef.current) {
      const s = rfStateRef.current;
      const { action } = rfRef.current.step(s);
      const res = rfEnvRef.current.step(s, action);
      rfEpBufRef.current.push({ state: s, action, reward: res.reward });
      rfStateRef.current = res.nextState;
      rfStepsRef.current++;

      if (res.done || rfStepsRef.current >= MAX_STEPS_PER_EP) {
        const buf = rfEpBufRef.current;
        for (let i = 0; i < buf.length; i++) {
          rfRef.current.update({ state: buf[i].state, action: buf[i].action, reward: buf[i].reward, nextState: i + 1 < buf.length ? buf[i + 1].state : res.nextState, done: i === buf.length - 1 });
        }
        rfEpBufRef.current = [];
        rfStateRef.current = rfEnvRef.current.reset();
        rfEpRef.current++;
        rfStepsRef.current = 0;

        const viz = rfRef.current.getVisualizationData();
        const d = viz.data as { rewardHistory: number[] };
        setRfRewards([...(d.rewardHistory ?? [])]);
      }
      setRfPos(rfStateRef.current);
      setRfEp(rfEpRef.current);
    }

    const bothDone = ppoEpRef.current >= MAX_EPISODES && rfEpRef.current >= MAX_EPISODES;
    if (bothDone) { isRunningRef.current = false; setIsRunning(false); return; }

    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, []);

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
            <h3 className="font-pixel text-sm text-[#fb923c] mb-1">{t('ppo.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">
              {t('ppo.watch.desc', { ppoEp, rfEp, total: MAX_EPISODES })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
          </div>
        </div>
        <div className="mt-4">
          <PixelSlider label={`${t('ppo.watch.clipEpsilon')} ε = ${clipEpsilon.toFixed(2)}`} value={clipEpsilon} min={0.05} max={0.5} step={0.05}
            onChange={v => { setClipEpsilon(v); init(v); }} />
          <div className="mt-2 flex items-center gap-2">
            <span className="font-pixel text-[9px] text-[#708090]">{t('ppo.watch.clipFraction')}</span>
            <div className="flex-1 h-2 bg-[#0a0e27] rounded overflow-hidden">
              <div className="h-full bg-[#f87171] transition-all duration-300" style={{ width: `${Math.round(clipFraction * 100)}%` }} />
            </div>
            <span className="font-pixel text-[9px] text-[#f87171]">{Math.round(clipFraction * 100)}%</span>
          </div>
        </div>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[10px] text-[#fb923c]">PPO ep {ppoEp}</span>
          </div>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={ppoPos} mode="auto" />
        </PixelPanel>
        <PixelPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-[10px] text-[#f97316]">REINFORCE ep {rfEp}</span>
          </div>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols} walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit} playerPos={rfPos} mode="auto" />
        </PixelPanel>
      </div>

      <PixelPanel>
        <p className="font-pixel text-[10px] text-[#fb923c] mb-1">{t('ppo.watch.ppoRewards')}</p>
        <RewardChart data={ppoRewards} accentColor="#fb923c" height={70} />
        <p className="font-pixel text-[10px] text-[#f97316] mb-1 mt-3">{t('ppo.watch.rfRewards')}</p>
        <RewardChart data={rfRewards} accentColor="#f97316" height={70} />
      </PixelPanel>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('ppo.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
