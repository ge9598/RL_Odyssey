import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import { GridWorld } from '@/environments/GridWorld';
import { GridWorldEnvironment, QLearningAlgorithm } from '@/algorithms/qlearning';
import { SARSAAlgorithm } from '@/algorithms/sarsa';
import type { PortStepProps } from '@/config/ports';

const TOTAL_SLIDES = 5;

const MINI_CONFIG = {
  rows: 3,
  cols: 4,
  walls: [],
  traps: [5, 6],  // cliff cells on bottom row middle
  treasures: [],
  start: 0,
  exit: 11,
};

export function SARSAMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  // Side-by-side demo for slide 3
  const [qlPos, setQlPos] = useState(MINI_CONFIG.start);
  const [sarsaPos, setSarsaPos] = useState(MINI_CONFIG.start);
  const [qlQTable, setQlQTable] = useState<number[][]>(
    Array.from({ length: 12 }, () => [0, 0, 0, 0]),
  );
  const [sarsaQTable, setSarsaQTable] = useState<number[][]>(
    Array.from({ length: 12 }, () => [0, 0, 0, 0]),
  );
  const [qlEpisode, setQlEpisode] = useState(0);
  const [sarsaEpisode, setSarsaEpisode] = useState(0);
  const demoRunning = useRef(false);
  const demoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSideBySideDemo = useCallback(() => {
    if (demoRunning.current) return;
    demoRunning.current = true;

    const qlEnv = new GridWorldEnvironment(MINI_CONFIG);
    const qlAgent = new QLearningAlgorithm(12, 4, 11111);
    qlAgent.setHyperparameter('epsilon', 0.3);
    qlAgent.setHyperparameter('learningRate', 0.3);

    const sarsaEnv = new GridWorldEnvironment(MINI_CONFIG);
    const sarsaAgent = new SARSAAlgorithm(12, 4, 11111);
    sarsaAgent.setHyperparameter('epsilon', 0.3);
    sarsaAgent.setHyperparameter('learningRate', 0.3);

    let qlState = qlEnv.reset();
    let sarsaState = sarsaEnv.reset();
    let qlEp = 0;
    let sarsaEp = 0;
    let step = 0;

    setQlPos(qlState);
    setSarsaPos(sarsaState);

    const tick = () => {
      if (!demoRunning.current || step > 120) {
        demoRunning.current = false;
        return;
      }

      // Q-Learning step
      const { action: qlAction } = qlAgent.step(qlState);
      const qlResult = qlEnv.step(qlState, qlAction);
      qlAgent.update({ state: qlState, action: qlAction, reward: qlResult.reward, nextState: qlResult.nextState, done: qlResult.done });
      qlState = qlResult.nextState;
      setQlPos(qlState);
      if (qlResult.done) { qlState = qlEnv.reset(); qlEp++; setQlEpisode(qlEp); qlAgent.startEpisode(); }
      const qlViz = qlAgent.getVisualizationData();
      setQlQTable((qlViz.data as { qTable: number[][] }).qTable.map((r) => [...r]));

      // SARSA step
      const { action: sarsaAction } = sarsaAgent.step(sarsaState);
      const sarsaResult = sarsaEnv.step(sarsaState, sarsaAction);
      sarsaAgent.update({ state: sarsaState, action: sarsaAction, reward: sarsaResult.reward, nextState: sarsaResult.nextState, done: sarsaResult.done });
      sarsaState = sarsaResult.nextState;
      setSarsaPos(sarsaState);
      if (sarsaResult.done) { sarsaState = sarsaEnv.reset(); sarsaEp++; setSarsaEpisode(sarsaEp); sarsaAgent.startEpisode(); }
      const sarsaViz = sarsaAgent.getVisualizationData();
      setSarsaQTable((sarsaViz.data as { qTable: number[][] }).qTable.map((r) => [...r]));

      step++;
      demoTimeout.current = setTimeout(tick, 280);
    };

    demoTimeout.current = setTimeout(tick, 200);
  }, []);

  useEffect(() => {
    if (slide === 3) {
      demoRunning.current = false;
      if (demoTimeout.current) clearTimeout(demoTimeout.current);
      setTimeout(() => runSideBySideDemo(), 0);
    }
    return () => {
      if (slide !== 3) {
        demoRunning.current = false;
        if (demoTimeout.current) clearTimeout(demoTimeout.current);
      }
    };
  }, [slide, runSideBySideDemo]);

  useEffect(() => {
    return () => {
      demoRunning.current = false;
      if (demoTimeout.current) clearTimeout(demoTimeout.current);
    };
  }, []);

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide((s) => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide((s) => s - 1);

  const slides = [
    // Slide 0: The core difference
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">⚖️</div>
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">
        {t('sarsa.meet.slide0title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">
        {t('sarsa.meet.slide0desc')}
      </p>
    </PixelPanel>,

    // Slide 1: On-policy vs off-policy
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">
        {t('sarsa.meet.slide1title')}
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="glass-panel pixel-border p-4">
          <div className="text-2xl mb-2 text-center">🗺️</div>
          <p className="font-pixel text-[10px] text-[#00d4ff] mb-2 text-center">
            {t('sarsa.meet.qlLabel')}
          </p>
          <p className="font-body text-base text-[#e2e8f0]">
            {t('sarsa.meet.qlDesc')}
          </p>
        </div>
        <div className="glass-panel pixel-border p-4 border-[#4ade80]/40">
          <div className="text-2xl mb-2 text-center">🐾</div>
          <p className="font-pixel text-[10px] text-[#4ade80] mb-2 text-center">
            {t('sarsa.meet.sarsaLabel')}
          </p>
          <p className="font-body text-base text-[#e2e8f0]">
            {t('sarsa.meet.sarsaDesc')}
          </p>
        </div>
      </div>
      <p className="font-body text-base text-[#708090] text-center">
        {t('sarsa.meet.slide1note')}
      </p>
    </PixelPanel>,

    // Slide 2: The diary analogy
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#4ade80] mb-3">
        {t('sarsa.meet.slide2title')}
      </h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">
        {t('sarsa.meet.slide2a')}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-panel pixel-border p-3">
          <p className="font-pixel text-[10px] text-[#00d4ff] mb-1">Q-Learning</p>
          <p className="font-pixel text-[10px] text-[#e2e8f0]">
            Q(s,a) += lr × [r + γ × max Q(s')]
          </p>
          <p className="font-body text-sm text-[#708090] mt-1">
            {t('sarsa.meet.qlFormNote')}
          </p>
        </div>
        <div className="glass-panel pixel-border p-3 border-[#4ade80]/40">
          <p className="font-pixel text-[10px] text-[#4ade80] mb-1">SARSA</p>
          <p className="font-pixel text-[10px] text-[#e2e8f0]">
            Q(s,a) += lr × [r + γ × Q(s',a')]
          </p>
          <p className="font-body text-sm text-[#708090] mt-1">
            {t('sarsa.meet.sarsaFormNote')}
          </p>
        </div>
      </div>
      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#ffd700]">
          {t('sarsa.meet.slide2summary')}
        </p>
      </div>
    </PixelPanel>,

    // Slide 3: Side-by-side demo
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-2">
        {t('sarsa.meet.slide3title')}
      </h3>
      <p className="font-body text-base text-[#e2e8f0] mb-3">
        {t('sarsa.meet.slide3desc')}
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="font-pixel text-[10px] text-[#00d4ff]">Q-Learning (ep {qlEpisode})</span>
          <GridWorld
            rows={MINI_CONFIG.rows}
            cols={MINI_CONFIG.cols}
            walls={MINI_CONFIG.walls}
            traps={MINI_CONFIG.traps}
            treasures={MINI_CONFIG.treasures}
            exit={MINI_CONFIG.exit}
            playerPos={qlPos}
            qValues={qlQTable}
            showHeatmap
            showArrows
            mode="auto"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="font-pixel text-[10px] text-[#4ade80]">SARSA (ep {sarsaEpisode})</span>
          <GridWorld
            rows={MINI_CONFIG.rows}
            cols={MINI_CONFIG.cols}
            walls={MINI_CONFIG.walls}
            traps={MINI_CONFIG.traps}
            treasures={MINI_CONFIG.treasures}
            exit={MINI_CONFIG.exit}
            playerPos={sarsaPos}
            qValues={sarsaQTable}
            showHeatmap
            showArrows
            mode="auto"
          />
        </div>
      </div>
      <p className="font-body text-sm text-[#708090] mt-3 text-center">
        {t('sarsa.meet.slide3note')}
      </p>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">
        {t('sarsa.meet.slide4title')}
      </h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '🔍', text: t('sarsa.meet.summary1') },
          { icon: '🐾', text: t('sarsa.meet.summary2') },
          { icon: '🌅', text: t('sarsa.meet.summary3') },
        ].map(({ icon, text }, i) => (
          <div key={i} className="glass-panel pixel-border p-3 flex gap-3 items-start">
            <span className="text-xl">{icon}</span>
            <p className="font-body text-base text-[#e2e8f0]">{text}</p>
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
            i === slide ? 'bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]'
              : i < slide ? 'bg-[#4ade80]/40' : 'bg-[#1e2448]'
          }`} />
        ))}
      </div>

      {slides[slide]}

      <div className="flex justify-between items-center">
        <PixelButton size="sm" variant="secondary" onClick={prevSlide} disabled={slide === 0}>
          ← {t('common.back')}
        </PixelButton>
        <div className="flex gap-3">
          {onSkip && <PixelButton size="sm" variant="secondary" onClick={onSkip}>{t('common.skip')}</PixelButton>}
          <PixelButton onClick={nextSlide}>{t('common.next')} →</PixelButton>
        </div>
      </div>
    </div>
  );
}
