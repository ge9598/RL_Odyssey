import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import type { PortStepProps } from '@/config/ports';

const TOTAL_SLIDES = 5;

// Interactive clip visualization
function ClipDemo() {
  const { t } = useTranslation();
  const [epsilon, setEpsilon] = useState(0.2);
  const [ratio, setRatio] = useState(1.5);
  const clipped = Math.min(Math.max(ratio, 1 - epsilon), 1 + epsilon);
  const isClipped = Math.abs(ratio - clipped) > 0.001;

  return (
    <div className="glass-panel pixel-border p-4">
      <p className="font-pixel text-[10px] text-[#fb923c] mb-3">{t('ppo.meet.clipDemo')}</p>
      <div className="flex flex-col gap-3 mb-3">
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-pixel text-[9px] text-[#708090]">ε = {epsilon.toFixed(2)}</span>
            <span className="font-pixel text-[9px] text-[#708090]">{t('ppo.meet.clipZone')}: [{(1 - epsilon).toFixed(2)}, {(1 + epsilon).toFixed(2)}]</span>
          </div>
          <input type="range" min={0.05} max={0.5} step={0.05} value={epsilon}
            onChange={e => setEpsilon(Number(e.target.value))} className="w-full accent-[#fb923c]" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-pixel text-[9px] text-[#708090]">{t('ppo.meet.ratio')} = {ratio.toFixed(2)}</span>
            <span className="font-pixel text-[9px]" style={{ color: isClipped ? '#f87171' : '#4ade80' }}>
              {isClipped ? t('ppo.meet.clipped') : t('ppo.meet.notClipped')}
            </span>
          </div>
          <input type="range" min={0.1} max={3.0} step={0.1} value={ratio}
            onChange={e => setRatio(Number(e.target.value))} className="w-full accent-[#22d3ee]" />
        </div>
      </div>
      <div className="flex items-center justify-between text-center">
        <div>
          <span className="font-pixel text-[9px] text-[#708090] block">{t('ppo.meet.rawRatio')}</span>
          <span className="font-pixel text-sm text-[#22d3ee]">{ratio.toFixed(2)}</span>
        </div>
        <span className="font-pixel text-[10px] text-[#708090]">→ clip →</span>
        <div>
          <span className="font-pixel text-[9px] text-[#708090] block">{t('ppo.meet.clippedRatio')}</span>
          <span className="font-pixel text-sm" style={{ color: isClipped ? '#f87171' : '#4ade80' }}>{clipped.toFixed(2)}</span>
        </div>
        <span className="font-pixel text-[10px] text-[#708090]">→ use min →</span>
        <div>
          <span className="font-pixel text-[9px] text-[#708090] block">{t('ppo.meet.finalUpdate')}</span>
          <span className="font-pixel text-sm text-[#fb923c]">{Math.min(ratio, clipped).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export function PPOMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide(s => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide(s => s - 1);

  const slides = [
    // Slide 0: The skateboarding analogy
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">🛹</div>
      <h3 className="font-pixel text-sm text-[#fb923c] mb-3">{t('ppo.meet.slide0title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">{t('ppo.meet.slide0desc')}</p>
      <div className="glass-panel pixel-border p-3 text-center max-w-md mx-auto">
        <p className="font-body text-base text-[#ffd700]">{t('ppo.meet.slide0insight')}</p>
      </div>
    </PixelPanel>,

    // Slide 1: The problem with vanilla PG
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#f87171] mb-4">{t('ppo.meet.slide1title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('ppo.meet.slide1desc')}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-panel pixel-border p-3 text-center">
          <p className="font-pixel text-[10px] text-[#4ade80] mb-2">{t('ppo.meet.smallStep')}</p>
          <div className="text-2xl mb-1">🚶</div>
          <p className="font-body text-sm text-[#e2e8f0]">{t('ppo.meet.smallStepDesc')}</p>
        </div>
        <div className="glass-panel pixel-border p-3 text-center">
          <p className="font-pixel text-[10px] text-[#f87171] mb-2">{t('ppo.meet.bigStep')}</p>
          <div className="text-2xl mb-1">💥</div>
          <p className="font-body text-sm text-[#e2e8f0]">{t('ppo.meet.bigStepDesc')}</p>
        </div>
      </div>
      <div className="glass-panel pixel-border p-3">
        <p className="font-body text-base text-[#ffd700]">{t('ppo.meet.slide1note')}</p>
      </div>
    </PixelPanel>,

    // Slide 2: The clipping solution
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#fb923c] mb-3">{t('ppo.meet.slide2title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('ppo.meet.slide2desc')}</p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-pixel text-[10px] text-[#22d3ee] mb-2">{t('ppo.meet.clipFormula')}</p>
        <p className="font-pixel text-[10px] text-[#e2e8f0]">ratio = π(a|s) / π_old(a|s)</p>
        <p className="font-pixel text-[10px] text-[#e2e8f0] mt-1">L_PPO = min(ratio × A, clip(ratio, 1-ε, 1+ε) × A)</p>
        <p className="font-body text-sm text-[#708090] mt-2">{t('ppo.meet.clipNote')}</p>
      </div>
      <ClipDemo />
    </PixelPanel>,

    // Slide 3: PPO vs REINFORCE
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#22d3ee] mb-3">{t('ppo.meet.slide3title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('ppo.meet.slide3desc')}</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="glass-panel pixel-border p-4 text-center">
          <p className="font-pixel text-[10px] text-[#f87171] mb-2">REINFORCE</p>
          <div className="text-3xl mb-2">🎢</div>
          <p className="font-body text-sm text-[#e2e8f0]">{t('ppo.meet.reinforceDesc')}</p>
        </div>
        <div className="glass-panel pixel-border p-4 text-center">
          <p className="font-pixel text-[10px] text-[#fb923c] mb-2">PPO</p>
          <div className="text-3xl mb-2">🛤️</div>
          <p className="font-body text-sm text-[#e2e8f0]">{t('ppo.meet.ppoDesc')}</p>
        </div>
      </div>
      <p className="font-body text-sm text-[#708090] text-center">{t('ppo.meet.slide3note')}</p>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">{t('ppo.meet.slide4title')}</h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '🛹', key: 'summary1' },
          { icon: '✂️', key: 'summary2' },
          { icon: '🔄', key: 'summary3' },
        ].map(({ icon, key }) => (
          <div key={key} className="glass-panel pixel-border p-3 flex gap-3 items-start">
            <span className="text-xl">{icon}</span>
            <p className="font-body text-base text-[#e2e8f0]">{t(`ppo.meet.${key}`)}</p>
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
            i === slide ? 'bg-[#fb923c] shadow-[0_0_8px_rgba(251,146,60,0.5)]'
              : i < slide ? 'bg-[#fb923c]/40' : 'bg-[#1e2448]'
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
