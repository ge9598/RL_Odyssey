import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel, PixelSlider } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { ActorCriticAlgorithm } from '@/algorithms/actorCritic';
import { REINFORCEAlgorithm } from '@/algorithms/reinforce';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { PortStepProps } from '@/config/ports';

const CONFIG = GRID_CONFIGS.feel;
const NUM_STATES = CONFIG.rows * CONFIG.cols;
const MAX_EPISODES = 200;
const MAX_STEPS_PER_EP = 80;

function getDelay(speed: number) { return speed === 1 ? 120 : speed === 2 ? 50 : speed === 5 ? 15 : 2; }

export function ActorCriticWatch({ onComplete }: PortStepProps) {
  const { t } = useTranslation();
  const acRef = useRef(new ActorCriticAlgorithm(NUM_STATES, 4, 88001));
  const rfRef = useRef(new REINFORCEAlgorithm(NUM_STATES, 4, 88002));
  const acEnvRef = useRef(new GridWorldEnvironment(CONFIG));
  const rfEnvRef = useRef(new GridWorldEnvironment(CONFIG));

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [actorLR, setActorLR] = useState(0.01);
  const [criticLR, setCriticLR] = useState(0.05);
  const isRunningRef = useRef(false);
  const speedRef = useRef(2);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const acStateRef = useRef(CONFIG.start);
  const rfStateRef = useRef(CONFIG.start);
  const acEpRef = useRef(0); const rfEpRef = useRef(0);
  const acStepRef = useRef(0); const rfStepRef = useRef(0);

  const [acPos, setAcPos] = useState(CONFIG.start);
  const [rfPos, setRfPos] = useState(CONFIG.start);
  const [acEpisodes, setAcEpisodes] = useState(0);
  const [rfEpisodes, setRfEpisodes] = useState(0);
  const [acRewards, setAcRewards] = useState<number[]>([]);
  const [rfRewards, setRfRewards] = useState<number[]>([]);
  const [values, setValues] = useState<number[]>(new Array(NUM_STATES).fill(0));
  const tdErrorsRef = useRef<number[]>([]);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const resetAll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isRunningRef.current = false; setIsRunning(false);
    acRef.current = new ActorCriticAlgorithm(NUM_STATES, 4, 88001);
    rfRef.current = new REINFORCEAlgorithm(NUM_STATES, 4, 88002);
    acRef.current.setHyperparameter('actorLR', actorLR);
    acRef.current.setHyperparameter('criticLR', criticLR);
    const as = acEnvRef.current.reset(); const rs = rfEnvRef.current.reset();
    acStateRef.current = as; rfStateRef.current = rs;
    acEpRef.current = 0; rfEpRef.current = 0;
    acStepRef.current = 0; rfStepRef.current = 0;
    setAcPos(as); setRfPos(rs);
    setAcEpisodes(0); setRfEpisodes(0);
    setAcRewards([]); setRfRewards([]);
    setValues(new Array(NUM_STATES).fill(0)); tdErrorsRef.current = [];
  }, [actorLR, criticLR]);

  const tick = useCallback(() => {
    if (!isRunningRef.current) return;

    if (acEpRef.current < MAX_EPISODES) {
      const { action } = acRef.current.step(acStateRef.current);
      const res = acEnvRef.current.step(acStateRef.current, action);
      const meta = acRef.current.update({ state: acStateRef.current, action, reward: res.reward, nextState: res.nextState, done: res.done });
      acStateRef.current = res.nextState; acStepRef.current++;
      setAcPos(acStateRef.current);
      if (meta.tdError !== undefined)
        tdErrorsRef.current = [...tdErrorsRef.current.slice(-49), meta.tdError!];
      if (res.done || acStepRef.current >= MAX_STEPS_PER_EP) {
        acStateRef.current = acEnvRef.current.reset(); acEpRef.current++; acStepRef.current = 0; acRef.current.startEpisode();
        const d = acRef.current.getVisualizationData().data as { rewardHistory: number[]; values: number[] };
        setAcRewards([...d.rewardHistory]); setAcEpisodes(acEpRef.current); setValues([...d.values]);
      }
    }

    if (rfEpRef.current < MAX_EPISODES) {
      const { action } = rfRef.current.step(rfStateRef.current);
      const res = rfEnvRef.current.step(rfStateRef.current, action);
      rfRef.current.update({ state: rfStateRef.current, action, reward: res.reward, nextState: res.nextState, done: res.done });
      rfStateRef.current = res.nextState; rfStepRef.current++;
      setRfPos(rfStateRef.current);
      if (res.done || rfStepRef.current >= MAX_STEPS_PER_EP) {
        rfRef.current.endEpisode();
        rfStateRef.current = rfEnvRef.current.reset(); rfEpRef.current++; rfStepRef.current = 0; rfRef.current.startEpisode();
        const d = rfRef.current.getVisualizationData().data as { rewardHistory: number[] };
        setRfRewards([...d.rewardHistory]); setRfEpisodes(rfEpRef.current);
      }
    }

    if (acEpRef.current >= MAX_EPISODES && rfEpRef.current >= MAX_EPISODES) {
      isRunningRef.current = false; setIsRunning(false); return;
    }
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

  // Value function as Q proxy for visualization
  const qProxy = Array.from({ length: NUM_STATES }, (_, s) => [values[s], values[s], values[s], values[s]]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-pixel text-sm text-[#c084fc] mb-1">{t('actorcritic.watch.title')}</h3>
            <p className="font-body text-base text-[#708090]">{t('actorcritic.watch.desc')}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            <PixelButton size="sm" onClick={togglePlay}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={resetAll}>{t('common.reset')}</PixelButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <PixelSlider label={t('actorcritic.watch.actorLR')} value={actorLR} min={0.001} max={0.1} step={0.001} onChange={setActorLR} />
          <PixelSlider label={t('actorcritic.watch.criticLR')} value={criticLR} min={0.001} max={0.2} step={0.001} onChange={setCriticLR} />
        </div>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-xs text-[#f97316]">REINFORCE</span>
            <span className="font-pixel text-xs text-[#708090]">ep {rfEpisodes}</span>
          </div>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={rfPos} mode="auto" />
        </PixelPanel>
        <PixelPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="font-pixel text-xs text-[#c084fc]">Actor-Critic</span>
            <span className="font-pixel text-xs text-[#708090]">ep {acEpisodes}</span>
          </div>
          <GridWorld rows={CONFIG.rows} cols={CONFIG.cols}
            walls={CONFIG.walls} traps={CONFIG.traps}
            treasures={CONFIG.treasures} exit={CONFIG.exit}
            playerPos={acPos}
            qValues={qProxy} showHeatmap
            mode="auto" />
        </PixelPanel>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#f97316] mb-2">REINFORCE {t('actorcritic.watch.rewards')}</p>
          <RewardChart data={rfRewards} accentColor="#f97316" height={80} />
        </PixelPanel>
        <PixelPanel>
          <p className="font-pixel text-[10px] text-[#c084fc] mb-2">Actor-Critic {t('actorcritic.watch.rewards')}</p>
          <RewardChart data={acRewards} accentColor="#c084fc" height={80} />
        </PixelPanel>
      </div>

      <div className="text-center">
        <PixelButton onClick={onComplete}>{t('actorcritic.watch.seenEnough')}</PixelButton>
      </div>
    </div>
  );
}
