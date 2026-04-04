import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld } from '@/environments/GridWorld';
import { GridWorldEnvironment } from '@/algorithms/qlearning';
import { REINFORCEAlgorithm } from '@/algorithms/reinforce';
import { ActorCriticAlgorithm } from '@/algorithms/actorCritic';
import type { PortStepProps } from '@/config/ports';

const TOTAL_SLIDES = 5;

const MINI_CONFIG = {
  rows: 3, cols: 4,
  walls: [],
  traps: [5],
  treasures: [3],
  start: 0, exit: 11,
};

export function ActorCriticMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  // Demo state for slide 3: side-by-side REINFORCE vs AC
  const [rfPos, setRfPos] = useState(MINI_CONFIG.start);
  const [acPos, setAcPos] = useState(MINI_CONFIG.start);
  const [rfEp, setRfEp] = useState(0);
  const [acEp, setAcEp] = useState(0);
  const rfRewardsRef = useRef<number[]>([]);
  const acRewardsRef = useRef<number[]>([]);
  const demoRunning = useRef(false);
  const demoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDemo = useCallback(() => {
    if (demoRunning.current) return;
    demoRunning.current = true;
    const NUM = MINI_CONFIG.rows * MINI_CONFIG.cols;

    const rfAgent = new REINFORCEAlgorithm(NUM, 4, 22001);
    const acAgent = new ActorCriticAlgorithm(NUM, 4, 22002);
    const rfEnv = new GridWorldEnvironment(MINI_CONFIG);
    const acEnv = new GridWorldEnvironment(MINI_CONFIG);

    let rfState = rfEnv.reset();
    let acState = acEnv.reset();
    let rfEpCount = 0; let acEpCount = 0;
    let rfStep = 0; let acStep = 0;
    const MAX_EP = 60; const MAX_STEP = 40;

    const tick = () => {
      if (!demoRunning.current) return;
      if (rfEpCount >= MAX_EP && acEpCount >= MAX_EP) { demoRunning.current = false; return; }

      if (rfEpCount < MAX_EP) {
        const { action } = rfAgent.step(rfState);
        const res = rfEnv.step(rfState, action);
        rfAgent.update({ state: rfState, action, reward: res.reward, nextState: res.nextState, done: res.done });
        rfState = res.nextState; rfStep++;
        setRfPos(rfState);
        if (res.done || rfStep >= MAX_STEP) {
          rfAgent.endEpisode();
          rfState = rfEnv.reset(); rfEpCount++; rfStep = 0; rfAgent.startEpisode();
          const d = rfAgent.getVisualizationData().data as { rewardHistory: number[] };
          rfRewardsRef.current = [...d.rewardHistory]; setRfEp(rfEpCount);
        }
      }

      if (acEpCount < MAX_EP) {
        const { action } = acAgent.step(acState);
        const res = acEnv.step(acState, action);
        acAgent.update({ state: acState, action, reward: res.reward, nextState: res.nextState, done: res.done });
        acState = res.nextState; acStep++;
        setAcPos(acState);
        if (res.done || acStep >= MAX_STEP) {
          acState = acEnv.reset(); acEpCount++; acStep = 0; acAgent.startEpisode();
          const d = acAgent.getVisualizationData().data as { rewardHistory: number[] };
          acRewardsRef.current = [...d.rewardHistory]; setAcEp(acEpCount);
        }
      }

      demoTimeout.current = setTimeout(tick, 180);
    };
    demoTimeout.current = setTimeout(tick, 200);
  }, []);

  useEffect(() => {
    if (slide === 3) {
      demoRunning.current = false;
      if (demoTimeout.current) clearTimeout(demoTimeout.current);
      setTimeout(runDemo, 0);
    }
    return () => {
      if (slide !== 3) { demoRunning.current = false; if (demoTimeout.current) clearTimeout(demoTimeout.current); }
    };
  }, [slide, runDemo]);

  useEffect(() => () => {
    demoRunning.current = false;
    if (demoTimeout.current) clearTimeout(demoTimeout.current);
  }, []);

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide(s => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide(s => s - 1);

  const slides = [
    // Slide 0: The martial artist analogy
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">🥋</div>
      <h3 className="font-pixel text-sm text-[#c084fc] mb-3">{t('actorcritic.meet.slide0title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">{t('actorcritic.meet.slide0desc')}</p>
    </PixelPanel>,

    // Slide 1: Actor vs Critic roles
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#c084fc] mb-4">{t('actorcritic.meet.slide1title')}</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="glass-panel pixel-border p-4 text-center">
          <div className="text-3xl mb-2">🥋</div>
          <p className="font-pixel text-[10px] text-[#f97316] mb-2">{t('actorcritic.meet.actorLabel')}</p>
          <p className="font-body text-base text-[#e2e8f0]">{t('actorcritic.meet.actorDesc')}</p>
        </div>
        <div className="glass-panel pixel-border p-4 text-center border-[#c084fc]/40">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-pixel text-[10px] text-[#c084fc] mb-2">{t('actorcritic.meet.criticLabel')}</p>
          <p className="font-body text-base text-[#e2e8f0]">{t('actorcritic.meet.criticDesc')}</p>
        </div>
      </div>
      <p className="font-body text-base text-[#708090] text-center">{t('actorcritic.meet.slide1note')}</p>
    </PixelPanel>,

    // Slide 2: The math — TD error as signal
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">{t('actorcritic.meet.slide2title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('actorcritic.meet.slide2desc')}</p>
      <div className="flex flex-col gap-3 mb-4">
        <div className="glass-panel pixel-border p-3">
          <p className="font-pixel text-[10px] text-[#c084fc] mb-1">{t('actorcritic.meet.tdLabel')}</p>
          <p className="font-pixel text-[10px] text-[#e2e8f0]">δ = r + γ·V(s') − V(s)</p>
          <p className="font-body text-sm text-[#708090] mt-1">{t('actorcritic.meet.tdNote')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel pixel-border p-3">
            <p className="font-pixel text-[10px] text-[#f97316] mb-1">{t('actorcritic.meet.actorUpdateLabel')}</p>
            <p className="font-pixel text-[10px] text-[#e2e8f0]">π(a|s) += α·δ</p>
          </div>
          <div className="glass-panel pixel-border p-3">
            <p className="font-pixel text-[10px] text-[#c084fc] mb-1">{t('actorcritic.meet.criticUpdateLabel')}</p>
            <p className="font-pixel text-[10px] text-[#e2e8f0]">V(s) += β·δ</p>
          </div>
        </div>
      </div>
      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#ffd700]">{t('actorcritic.meet.slide2key')}</p>
      </div>
    </PixelPanel>,

    // Slide 3: Side-by-side demo
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-2">{t('actorcritic.meet.slide3title')}</h3>
      <p className="font-body text-base text-[#e2e8f0] mb-3">{t('actorcritic.meet.slide3desc')}</p>
      <div className="flex gap-4 flex-wrap justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="font-pixel text-[10px] text-[#f97316]">REINFORCE (ep {rfEp})</span>
          <GridWorld rows={MINI_CONFIG.rows} cols={MINI_CONFIG.cols}
            walls={MINI_CONFIG.walls} traps={MINI_CONFIG.traps}
            treasures={MINI_CONFIG.treasures} exit={MINI_CONFIG.exit}
            playerPos={rfPos} mode="auto" />
          <div className="w-32 h-2 bg-[#0a0e27] pixel-border rounded overflow-hidden">
            <div className="h-full bg-[#f97316]" style={{ width: `${Math.min(rfEp / 60 * 100, 100)}%` }} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="font-pixel text-[10px] text-[#c084fc]">Actor-Critic (ep {acEp})</span>
          <GridWorld rows={MINI_CONFIG.rows} cols={MINI_CONFIG.cols}
            walls={MINI_CONFIG.walls} traps={MINI_CONFIG.traps}
            treasures={MINI_CONFIG.treasures} exit={MINI_CONFIG.exit}
            playerPos={acPos} mode="auto" />
          <div className="w-32 h-2 bg-[#0a0e27] pixel-border rounded overflow-hidden">
            <div className="h-full bg-[#c084fc]" style={{ width: `${Math.min(acEp / 60 * 100, 100)}%` }} />
          </div>
        </div>
      </div>
      <p className="font-body text-sm text-[#708090] mt-3 text-center">{t('actorcritic.meet.slide3note')}</p>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">{t('actorcritic.meet.slide4title')}</h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '🥋', key: 'summary1' },
          { icon: '📋', key: 'summary2' },
          { icon: '⚡', key: 'summary3' },
        ].map(({ icon, key }) => (
          <div key={key} className="glass-panel pixel-border p-3 flex gap-3 items-start">
            <span className="text-xl">{icon}</span>
            <p className="font-body text-base text-[#e2e8f0]">{t(`actorcritic.meet.${key}`)}</p>
          </div>
        ))}
      </div>
    </PixelPanel>,
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <div className="flex justify-center gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
            i === slide ? 'bg-[#c084fc] shadow-[0_0_8px_rgba(192,132,252,0.5)]'
              : i < slide ? 'bg-[#c084fc]/40' : 'bg-[#1e2448]'
          }`} />
        ))}
      </div>
      {slides[slide]}
      <div className="flex justify-between items-center">
        <PixelButton size="sm" variant="secondary" onClick={prevSlide} disabled={slide === 0}>← {t('common.back')}</PixelButton>
        <div className="flex gap-3">
          {onSkip && <PixelButton size="sm" variant="secondary" onClick={onSkip}>{t('common.skip')}</PixelButton>}
          <PixelButton onClick={nextSlide}>{t('common.next')} →</PixelButton>
        </div>
      </div>
    </div>
  );
}
