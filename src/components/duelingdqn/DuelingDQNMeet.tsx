import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const TOTAL_SLIDES = 5;

// Example decomposition for visualization
const EXAMPLES = [
  {
    name: 'Dead end',
    stateValue: -3.2,
    advantages: [-0.1, -0.2, 0.2, 0.1],
    qValues: [-3.3, -3.4, -3.0, -3.1],
    desc: 'Low V(s): being in a dead end is generally bad, regardless of action',
  },
  {
    name: 'Open path',
    stateValue: 4.5,
    advantages: [0.5, 2.0, -1.5, -1.0],
    qValues: [5.0, 6.5, 3.0, 3.5],
    desc: 'High V(s): on an open path. Action "right" has a big advantage!',
  },
  {
    name: 'Near exit',
    stateValue: 8.0,
    advantages: [0.1, 0.1, -0.1, -0.1],
    qValues: [8.1, 8.1, 7.9, 7.9],
    desc: 'V(s) dominates: near the exit, all actions are similarly good',
  },
];

const DIRS = ['Up', 'Right', 'Down', 'Left'];

export function DuelingDQNMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const [selectedEx, setSelectedEx] = useState(0);

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide((s) => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide((s) => s - 1);

  const ex = EXAMPLES[selectedEx];
  const maxAdv = Math.max(...ex.advantages.map(Math.abs));
  const maxQ = Math.max(...ex.qValues.map(Math.abs));

  const slides = [
    // Slide 0: Opening question
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">⚔️</div>
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">{t('duelingdqn.meet.slide0title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">{t('duelingdqn.meet.slide0desc')}</p>
      <div className="glass-panel pixel-border p-4 max-w-md mx-auto">
        <p className="font-body text-base text-[#ffd700]">{t('duelingdqn.meet.slide0example')}</p>
      </div>
    </PixelPanel>,

    // Slide 1: V(s) — State Value
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#4ade80] mb-3">{t('duelingdqn.meet.slide1title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('duelingdqn.meet.slide1a')}</p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-pixel text-xs text-[#4ade80] text-center mb-2">V(s)</p>
        <p className="font-body text-base text-[#e2e8f0] text-center">{t('duelingdqn.meet.slide1analogy')}</p>
      </div>
      <p className="font-body text-base text-[#708090]">{t('duelingdqn.meet.slide1b')}</p>
    </PixelPanel>,

    // Slide 2: A(s,a) — Advantage
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">{t('duelingdqn.meet.slide2title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] mb-4">{t('duelingdqn.meet.slide2a')}</p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-pixel text-xs text-[#ffd700] text-center mb-2">A(s, a)</p>
        <p className="font-body text-base text-[#e2e8f0] text-center">{t('duelingdqn.meet.slide2analogy')}</p>
      </div>
      <div className="glass-panel pixel-border p-3">
        <p className="font-pixel text-xs text-[#00d4ff] text-center">
          Q(s, a) = V(s) + A(s, a) − mean(A(s, a'))
        </p>
      </div>
      <p className="font-body text-sm text-[#708090] mt-3">{t('duelingdqn.meet.slide2why')}</p>
    </PixelPanel>,

    // Slide 3: Interactive decomposition
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent mb-3">{t('duelingdqn.meet.slide3title')}</h3>
      <div className="flex gap-2 mb-4 flex-wrap">
        {EXAMPLES.map((e, i) => (
          <button
            key={i}
            onClick={() => setSelectedEx(i)}
            className={`font-pixel text-[10px] px-3 py-2 pixel-border transition-all ${selectedEx === i ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-[#708090] hover:text-[#e2e8f0]'}`}
          >
            {e.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* V(s) */}
        <div className="glass-panel pixel-border p-3 text-center">
          <p className="font-pixel text-[10px] text-[#4ade80] mb-2">V(s)</p>
          <p className="font-pixel text-2xl" style={{ color: ex.stateValue >= 0 ? '#4ade80' : '#f87171' }}>
            {ex.stateValue.toFixed(1)}
          </p>
        </div>
        {/* A(s,a) bars */}
        <div className="glass-panel pixel-border p-3 col-span-2">
          <p className="font-pixel text-[10px] text-[#ffd700] mb-2">A(s, a) — Advantage per action</p>
          {ex.advantages.map((adv, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[9px] text-[#708090] w-8">{DIRS[i]}</span>
              <div className="flex-1 h-3 bg-[#1e2448] rounded relative">
                <div
                  className="h-3 rounded absolute"
                  style={{
                    left: adv >= 0 ? '50%' : `${50 - Math.abs(adv) / maxAdv * 50}%`,
                    width: `${Math.abs(adv) / maxAdv * 50}%`,
                    backgroundColor: adv >= 0 ? '#4ade80' : '#f87171',
                  }}
                />
                <div className="absolute left-1/2 top-0 h-3 w-px bg-[#708090]/50" />
              </div>
              <span className="font-pixel text-[9px] text-[#e2e8f0] w-8 text-right">{adv >= 0 ? '+' : ''}{adv.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Combined Q values */}
      <div className="glass-panel pixel-border p-3">
        <p className="font-pixel text-[10px] text-[#00d4ff] mb-2">Combined Q(s,a) = V(s) + A(s,a) − mean(A)</p>
        <div className="flex gap-2">
          {ex.qValues.map((q, i) => (
            <div key={i} className="flex-1">
              <div className="h-16 bg-[#1e2448] rounded flex flex-col justify-end">
                <div
                  className="rounded-b"
                  style={{
                    height: `${Math.abs(q) / maxQ * 100}%`,
                    backgroundColor: q >= 0 ? '#00d4ff' : '#f87171',
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="font-pixel text-[9px] text-center text-[#708090] block mt-1">{DIRS[i][0]}</span>
              <span className="font-pixel text-[9px] text-center text-[#00d4ff] block">{q.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="font-body text-sm text-[#708090] mt-2 text-center">{ex.desc}</p>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">{t('duelingdqn.meet.slide4title')}</h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '🏰', text: t('duelingdqn.meet.summary1') },
          { icon: '⚡', text: t('duelingdqn.meet.summary2') },
          { icon: '🎯', text: t('duelingdqn.meet.summary3') },
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
            i === slide ? 'bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.5)]'
              : i < slide ? 'bg-[#00d4ff]/40' : 'bg-[#1e2448]'
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
