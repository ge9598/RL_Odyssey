import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld, GRID_CONFIGS } from '@/environments/GridWorld';
import { RewardChart } from '@/components/visualizations/RewardChart';
import { REINFORCEAlgorithm } from '@/algorithms/reinforce';
import { ActorCriticAlgorithm } from '@/algorithms/actorCritic';
import { PPOAlgorithm } from '@/algorithms/ppo';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import type { BountyRank } from '@/types/algorithm';
import { BOUNTY_MULTIPLIERS } from '@/types/algorithm';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';

interface BossPageProps {
  onComplete: () => void;
}

type AlgoKey = 'reinforce' | 'actorcritic' | 'ppo';
type BossPhase = 'intro' | 'phase1' | 'phase2' | 'phase3' | 'results';

const PHASE_CONFIGS = {
  phase1: GRID_CONFIGS.feel,
  phase2: GRID_CONFIGS.quest,
  phase3: GRID_CONFIGS.quest,
} as const;

const PHASE_EPS = { phase1: 80, phase2: 150, phase3: 200 };
const MAX_STEPS = 60;
const BASE_GOLD = 2500;
const CARD_ID = 'policy-master';

function getDelay(speed: number) { return speed === 1 ? 60 : speed === 2 ? 25 : speed === 5 ? 5 : 1; }

function rankColor(r: BountyRank) {
  return r === 'S' ? '#ffd700' : r === 'A' ? '#fb923c' : r === 'B' ? '#4ade80' : '#708090';
}

function AlgoSelector({ selected, onChange }: { selected: AlgoKey; onChange: (k: AlgoKey) => void }) {
  const { t } = useTranslation();
  const options: { key: AlgoKey; label: string; color: string; desc: string }[] = [
    { key: 'reinforce', label: 'REINFORCE', color: '#f97316', desc: t('chaos.selector.reinforceDesc') },
    { key: 'actorcritic', label: 'Actor-Critic', color: '#c084fc', desc: t('chaos.selector.actorcriticDesc') },
    { key: 'ppo', label: 'PPO', color: '#fb923c', desc: t('chaos.selector.ppoDesc') },
  ];
  return (
    <div className="flex flex-col gap-2">
      {options.map(o => (
        <div
          key={o.key}
          className={`glass-panel pixel-border p-3 cursor-pointer transition-all ${selected === o.key ? 'border-opacity-100' : 'opacity-60 hover:opacity-80'}`}
          style={{ borderColor: selected === o.key ? o.color : undefined }}
          onClick={() => onChange(o.key)}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: selected === o.key ? o.color : '#708090' }} />
            <span className="font-pixel text-[10px]" style={{ color: o.color }}>{o.label}</span>
          </div>
          <p className="font-body text-sm text-[#708090] mt-1">{o.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function ChaosVolcanoBoss({ onComplete }: BossPageProps) {
  const { t } = useTranslation();
  const completeQuest = useGameStore(s => s.completeQuest);
  const { collectCard } = useCardStore();

  const [bossPhase, setBossPhase] = useState<BossPhase>('intro');
  const [speed, setSpeed] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoKey>('ppo');
  const [phaseResults, setPhaseResults] = useState<{ phase: string; rank: BountyRank; score: number }[]>([]);

  const agentRef = useRef<REINFORCEAlgorithm | ActorCriticAlgorithm | PPOAlgorithm | null>(null);
  const envRef = useRef<GridWorldEnvironment | null>(null);
  const isRunningRef = useRef(false);
  const speedRef = useRef(5);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(0);
  const stepsRef = useRef(0);
  const epRef = useRef(0);
  const epBufRef = useRef<{ state: number; action: number; reward: number; nextState: number }[]>([]);
  const rewardBufRef = useRef<number[]>([]);

  const [playerPos, setPlayerPos] = useState(0);
  const [currentEp, setCurrentEp] = useState(0);
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => () => { isRunningRef.current = false; if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const currentPhaseKey = bossPhase === 'phase1' || bossPhase === 'phase2' || bossPhase === 'phase3' ? bossPhase : 'phase1';
  const currentConfig = PHASE_CONFIGS[currentPhaseKey as keyof typeof PHASE_CONFIGS] ?? GRID_CONFIGS.feel;
  const currentMaxEps = PHASE_EPS[currentPhaseKey as keyof typeof PHASE_EPS] ?? 80;
  void (currentConfig.rows * currentConfig.cols); // numStates used inside createAgent callback

  const createAgent = useCallback((key: AlgoKey, n: number) => {
    if (key === 'reinforce') return new REINFORCEAlgorithm(n, 4, 99001);
    if (key === 'actorcritic') return new ActorCriticAlgorithm(n, 4, 99002);
    return new PPOAlgorithm(n, 4, 99003);
  }, []);

  const tick = useCallback(() => {
    if (!isRunningRef.current || !agentRef.current || !envRef.current) return;
    const maxEps = PHASE_EPS[currentPhaseKey as keyof typeof PHASE_EPS] ?? 80;

    if (epRef.current >= maxEps) {
      isRunningRef.current = false; setIsRunning(false);
      const recent = rewardBufRef.current.slice(-20);
      const avg = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1);
      const rank: BountyRank = avg >= -3 ? 'S' : avg >= -5 ? 'A' : avg >= -8 ? 'B' : 'C';
      setPhaseResults(prev => [...prev, { phase: currentPhaseKey, rank, score: Math.round(avg * 10) / 10 }]);

      const nextPhase: Record<string, BossPhase> = { phase1: 'phase2', phase2: 'phase3', phase3: 'results' };
      const next = nextPhase[currentPhaseKey];
      if (next) setBossPhase(next);
      return;
    }

    const s = stateRef.current;
    const { action } = agentRef.current.step(s);
    const res = envRef.current.step(s, action);
    epBufRef.current.push({ state: s, action, reward: res.reward, nextState: res.nextState });
    stateRef.current = res.nextState;
    stepsRef.current++;

    if (res.done || stepsRef.current >= MAX_STEPS) {
      const buf = epBufRef.current;
      for (let i = 0; i < buf.length; i++) {
        agentRef.current.update({ state: buf[i].state, action: buf[i].action, reward: buf[i].reward, nextState: buf[i].nextState, done: i === buf.length - 1 });
      }
      const epReward = buf.reduce((a, b) => a + b.reward, 0);
      rewardBufRef.current.push(epReward);
      epBufRef.current = [];
      stateRef.current = envRef.current.reset();
      epRef.current++;
      stepsRef.current = 0;
      setRewardHistory([...rewardBufRef.current]);
      setCurrentEp(epRef.current);
    }
    setPlayerPos(stateRef.current);
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [currentPhaseKey]);

  const startPhase = useCallback((phase: BossPhase, algo: AlgoKey) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const cfg = PHASE_CONFIGS[phase as keyof typeof PHASE_CONFIGS] ?? GRID_CONFIGS.feel;
    const n = cfg.rows * cfg.cols;
    agentRef.current = createAgent(algo, n);
    envRef.current = new GridWorldEnvironment(cfg);
    stateRef.current = envRef.current.reset();
    stepsRef.current = 0; epRef.current = 0;
    epBufRef.current = []; rewardBufRef.current = [];
    setPlayerPos(stateRef.current); setCurrentEp(0); setRewardHistory([]);
    isRunningRef.current = true; setIsRunning(true);
    timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
  }, [createAgent, tick]);

  const togglePause = useCallback(() => {
    if (isRunningRef.current) {
      isRunningRef.current = false; setIsRunning(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      isRunningRef.current = true; setIsRunning(true);
      timeoutRef.current = setTimeout(tick, getDelay(speedRef.current));
    }
  }, [tick]);

  // Results phase
  if (bossPhase === 'results') {
    const totalScore = phaseResults.reduce((a, b) => a + b.score, 0) / Math.max(phaseResults.length, 1);
    const overallRank: BountyRank = totalScore >= -3 ? 'S' : totalScore >= -5 ? 'A' : totalScore >= -8 ? 'B' : 'C';
    const passed = totalScore >= -10;
    const gold = Math.round(BASE_GOLD * BOUNTY_MULTIPLIERS[overallRank]);
    if (passed) { completeQuest('chaos-volcano' as never, overallRank, BASE_GOLD); collectCard(CARD_ID, overallRank); }

    return (
      <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
        <PixelPanel variant={passed ? 'gold' : 'default'} className="text-center">
          <div className="text-5xl mb-4">{passed ? '🌋' : '💪'}</div>
          <h3 className="font-pixel text-sm mb-3" style={{ color: rankColor(overallRank) }}>
            {passed ? t('chaos.boss.passed') : t('chaos.boss.failed')}
          </h3>
          <div className="flex flex-col gap-2 mb-4 max-w-xs mx-auto">
            {phaseResults.map((pr, i) => (
              <div key={i} className="flex items-center justify-between glass-panel pixel-border px-3 py-2">
                <span className="font-pixel text-[9px] text-[#708090]">{t(`chaos.boss.phaseLabel${i + 1}`)}</span>
                <span className="font-pixel text-[10px]" style={{ color: rankColor(pr.rank) }}>{pr.rank} ({pr.score})</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4 max-w-xs mx-auto">
            <div className="text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">{t('bounty.rank.' + overallRank)}</span>
              <span className="font-pixel text-sm" style={{ color: rankColor(overallRank) }}>{overallRank}</span>
            </div>
            <div className="text-center">
              <span className="font-pixel text-[10px] text-[#708090] block">{t('common.gold')}</span>
              <span className="font-pixel text-sm text-[#ffd700]">{passed ? gold : 0}</span>
            </div>
          </div>
          <PixelButton onClick={onComplete}>{t('common.next')} →</PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (bossPhase === 'intro') return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <PixelPanel className="text-center">
        <div className="text-5xl mb-4 animate-float">🌋</div>
        <h3 className="font-pixel text-sm text-[#f87171] mb-3">{t('chaos.boss.title')}</h3>
        <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('chaos.boss.intro')}</p>
        <div className="flex flex-col gap-2 mb-6 text-left glass-panel pixel-border p-4">
          {[t('chaos.boss.phase1desc'), t('chaos.boss.phase2desc'), t('chaos.boss.phase3desc')].map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="font-pixel text-[10px] text-[#f87171] mt-1">{i + 1}.</span>
              <p className="font-body text-base text-[#e2e8f0]">{d}</p>
            </div>
          ))}
        </div>
        <PixelButton onClick={() => setBossPhase('phase1')}>{t('chaos.boss.startBattle')} →</PixelButton>
      </PixelPanel>
    </div>
  );

  const phaseNum = bossPhase === 'phase1' ? 1 : bossPhase === 'phase2' ? 2 : 3;
  const phaseColor = phaseNum === 1 ? '#f97316' : phaseNum === 2 ? '#c084fc' : '#fb923c';

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <PixelPanel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-pixel text-sm mb-1" style={{ color: phaseColor }}>
              {t('chaos.boss.phaseTitle', { phase: phaseNum })}
            </h3>
            <p className="font-body text-sm text-[#708090]">
              {t('chaos.boss.phaseProgress', { ep: currentEp, total: currentMaxEps })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 5, 10].map(s => (
              <PixelButton key={s} size="sm" variant={speed === s ? 'primary' : 'secondary'} onClick={() => setSpeed(s)}>{s}x</PixelButton>
            ))}
            {isRunning || currentEp > 0
              ? <PixelButton size="sm" onClick={togglePause}>{isRunning ? t('common.pause') : t('common.play')}</PixelButton>
              : null}
          </div>
        </div>
        <div className="w-full bg-[#0a0e27] rounded-full h-2 mt-3">
          <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${(currentEp / currentMaxEps) * 100}%`, background: phaseColor }} />
        </div>
      </PixelPanel>

      {currentEp === 0 && !isRunning ? (
        <PixelPanel>
          <h4 className="font-pixel text-[10px] mb-3" style={{ color: phaseColor }}>
            {t('chaos.boss.selectAlgo', { phase: phaseNum })}
          </h4>
          <AlgoSelector selected={selectedAlgo} onChange={setSelectedAlgo} />
          <div className="mt-4">
            <PixelButton onClick={() => startPhase(bossPhase, selectedAlgo)}>
              {t('chaos.boss.launch')} →
            </PixelButton>
          </div>
        </PixelPanel>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <PixelPanel>
            <GridWorld
              rows={currentConfig.rows} cols={currentConfig.cols}
              walls={currentConfig.walls} traps={currentConfig.traps}
              treasures={currentConfig.treasures} exit={currentConfig.exit}
              playerPos={playerPos} mode="auto"
            />
          </PixelPanel>
          <PixelPanel>
            <p className="font-pixel text-[10px] mb-2" style={{ color: phaseColor }}>{t('chaos.boss.rewardTitle')}</p>
            <RewardChart data={rewardHistory} accentColor={phaseColor} height={120} />
          </PixelPanel>
        </div>
      )}

      {phaseResults.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {phaseResults.map((pr, i) => (
            <div key={i} className="glass-panel pixel-border px-3 py-1">
              <span className="font-pixel text-[9px] text-[#708090]">{t(`chaos.boss.phaseLabel${i + 1}`)}: </span>
              <span className="font-pixel text-[10px]" style={{ color: rankColor(pr.rank) }}>{pr.rank}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
