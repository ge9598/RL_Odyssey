import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import type { PortStepProps } from '@/config/ports';

const TOTAL_SLIDES = 5;

// Static demo data for overestimation visualization
const DEMO_STATES = ['State A\n(cliff edge)', 'State B\n(safe path)', 'State C\n(near goal)'];
const DQN_Q_VALUES = [[8.5, 3.2, 1.1, 2.4], [4.8, 7.9, 2.3, 1.5], [9.2, 8.1, 6.7, 5.3]];
const DOUBLE_DQN_Q_VALUES = [[6.1, 3.0, 1.0, 2.2], [4.5, 7.2, 2.1, 1.4], [8.3, 7.8, 6.5, 5.1]];

export function DoubleDQNMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const [selectedState, setSelectedState] = useState(0);

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide((s) => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide((s) => s - 1);

  const dqnQ = DQN_Q_VALUES[selectedState];
  const ddqnQ = DOUBLE_DQN_Q_VALUES[selectedState];
  const maxDqn = Math.max(...dqnQ);
  const maxDdqn = Math.max(...ddqnQ);
  const overest = ((maxDqn - maxDdqn) / Math.abs(maxDdqn) * 100).toFixed(0);

  const slides = [
    // Slide 0: The problem
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">🎭</div>
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">{t('doubledqn.meet.slide0title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">{t('doubledqn.meet.slide0desc')}</p>
    </PixelPanel>,

    // Slide 1: What is overestimation
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">{t('doubledqn.meet.slide1title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('doubledqn.meet.slide1a')}</p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-body text-base text-[#00d4ff]">{t('doubledqn.meet.slide1analogy')}</p>
      </div>
      <p className="font-body text-base text-[#e2e8f0] mb-3">{t('doubledqn.meet.slide1b')}</p>
      <div className="glass-panel pixel-border p-3">
        <p className="font-pixel text-xs text-[#f87171] text-center">
          DQN target = r + γ × max_a Q_target(s', a)   ← always takes the HIGHEST (possibly overestimated) Q
        </p>
      </div>
    </PixelPanel>,

    // Slide 2: The fix
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#4ade80] mb-3">{t('doubledqn.meet.slide2title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('doubledqn.meet.slide2a')}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-panel pixel-border p-3">
          <p className="font-pixel text-[10px] text-[#f87171] mb-2">DQN (same network)</p>
          <p className="font-body text-sm text-[#e2e8f0]">{t('doubledqn.meet.dqnStep1')}</p>
          <p className="font-body text-sm text-[#f87171] mt-1">{t('doubledqn.meet.dqnStep2')}</p>
        </div>
        <div className="glass-panel pixel-border p-3 border-[#4ade80]/40">
          <p className="font-pixel text-[10px] text-[#4ade80] mb-2">Double DQN (two networks)</p>
          <p className="font-body text-sm text-[#e2e8f0]">{t('doubledqn.meet.ddqnStep1')}</p>
          <p className="font-body text-sm text-[#4ade80] mt-1">{t('doubledqn.meet.ddqnStep2')}</p>
        </div>
      </div>
      <p className="font-body text-base text-[#708090] text-center">{t('doubledqn.meet.slide2summary')}</p>
    </PixelPanel>,

    // Slide 3: Interactive comparison
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">{t('doubledqn.meet.slide3title')}</h3>
      <p className="font-body text-base text-[#e2e8f0] mb-4">{t('doubledqn.meet.slide3desc')}</p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {DEMO_STATES.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelectedState(i)}
            className={`font-pixel text-[10px] px-3 py-2 pixel-border transition-all ${selectedState === i ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-[#708090] hover:text-[#e2e8f0]'}`}
          >
            {s.split('\n')[0]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(['Up', 'Right', 'Down', 'Left'] as const).map((dir, i) => (
          <div key={i} className="glass-panel pixel-border p-2">
            <p className="font-pixel text-[10px] text-[#708090] mb-1">{dir}</p>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <div className="h-2 bg-[#1e2448] rounded">
                  <div className="h-2 bg-[#f87171] rounded" style={{ width: `${(dqnQ[i] / 12 * 100).toFixed(0)}%` }} />
                </div>
                <span className="font-pixel text-[9px] text-[#f87171]">DQN: {dqnQ[i].toFixed(1)}</span>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-[#1e2448] rounded">
                  <div className="h-2 bg-[#4ade80] rounded" style={{ width: `${(ddqnQ[i] / 12 * 100).toFixed(0)}%` }} />
                </div>
                <span className="font-pixel text-[9px] text-[#4ade80]">DDQN: {ddqnQ[i].toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#ffd700]">
          {t('doubledqn.meet.overestBy', { pct: overest })}
        </p>
        <p className="font-body text-sm text-[#708090] mt-1">
          {t('doubledqn.meet.maxDqn', { val: maxDqn.toFixed(1) })} → {t('doubledqn.meet.maxDdqn', { val: maxDdqn.toFixed(1) })}
        </p>
      </div>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">{t('doubledqn.meet.slide4title')}</h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '🔬', text: t('doubledqn.meet.summary1') },
          { icon: '🤝', text: t('doubledqn.meet.summary2') },
          { icon: '📈', text: t('doubledqn.meet.summary3') },
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
            i === slide ? 'bg-[#ffd700] shadow-[0_0_8px_rgba(255,215,0,0.5)]'
              : i < slide ? 'bg-[#ffd700]/40' : 'bg-[#1e2448]'
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
