import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';
import type { PortStepProps } from '@/config/ports';

const TOTAL_SLIDES = 5;

export function A2CMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide(s => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide(s => s - 1);

  const slides = [
    // Slide 0: The army analogy
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">⚔️</div>
      <h3 className="font-pixel text-sm text-[#22d3ee] mb-3">{t('a2c.meet.slide0title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">{t('a2c.meet.slide0desc')}</p>
    </PixelPanel>,

    // Slide 1: What makes A2C different
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#22d3ee] mb-4">{t('a2c.meet.slide1title')}</h3>
      <div className="flex flex-col gap-3 mb-4">
        {(['point1', 'point2', 'point3'] as const).map((k, i) => (
          <div key={i} className="flex gap-3 items-start glass-panel pixel-border p-3">
            <span className="font-pixel text-sm text-[#22d3ee] mt-0.5">{['🤖', '🔗', '⚡'][i]}</span>
            <p className="font-body text-base text-[#e2e8f0]">{t(`a2c.meet.${k}`)}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#ffd700]">{t('a2c.meet.slide1note')}</p>
      </div>
    </PixelPanel>,

    // Slide 2: Advantage function
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">{t('a2c.meet.slide2title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('a2c.meet.slide2desc')}</p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-pixel text-[10px] text-[#22d3ee] mb-2">{t('a2c.meet.advantageFormula')}</p>
        <p className="font-pixel text-[10px] text-[#e2e8f0]">A(s,a) = r + γ·V(s') − V(s)</p>
        <p className="font-body text-sm text-[#708090] mt-2">{t('a2c.meet.advantageNote')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel pixel-border p-3 text-center">
          <span className="font-pixel text-[10px] text-[#4ade80] block mb-1">A &gt; 0</span>
          <p className="font-body text-sm text-[#e2e8f0]">{t('a2c.meet.positiveAdv')}</p>
        </div>
        <div className="glass-panel pixel-border p-3 text-center">
          <span className="font-pixel text-[10px] text-[#f87171] block mb-1">A &lt; 0</span>
          <p className="font-body text-sm text-[#e2e8f0]">{t('a2c.meet.negativeAdv')}</p>
        </div>
      </div>
    </PixelPanel>,

    // Slide 3: Synchronous vs Asynchronous (A2C vs A3C)
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#22d3ee] mb-3">{t('a2c.meet.slide3title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('a2c.meet.slide3desc')}</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="glass-panel pixel-border p-4 text-center">
          <p className="font-pixel text-[10px] text-[#22d3ee] mb-2">A2C</p>
          <div className="flex flex-col items-center gap-1 mb-2">
            {['🤖', '🤖', '🤖'].map((e, i) => <span key={i}>{e}</span>)}
          </div>
          <p className="font-body text-sm text-[#e2e8f0]">{t('a2c.meet.a2cSync')}</p>
        </div>
        <div className="glass-panel pixel-border p-4 text-center border-[#708090]/40">
          <p className="font-pixel text-[10px] text-[#708090] mb-2">A3C</p>
          <div className="flex flex-col items-center gap-1 mb-2">
            {['🤖', '🤖', '🤖'].map((e, i) => <span key={i} className="opacity-60">{e}</span>)}
          </div>
          <p className="font-body text-sm text-[#708090]">{t('a2c.meet.a3cAsync')}</p>
        </div>
      </div>
      <p className="font-body text-sm text-[#708090] text-center">{t('a2c.meet.slide3note')}</p>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">{t('a2c.meet.slide4title')}</h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '⚔️', key: 'summary1' },
          { icon: '🔗', key: 'summary2' },
          { icon: '📈', key: 'summary3' },
        ].map(({ icon, key }) => (
          <div key={key} className="glass-panel pixel-border p-3 flex gap-3 items-start">
            <span className="text-xl">{icon}</span>
            <p className="font-body text-base text-[#e2e8f0]">{t(`a2c.meet.${key}`)}</p>
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
            i === slide ? 'bg-[#22d3ee] shadow-[0_0_8px_rgba(34,211,238,0.5)]'
              : i < slide ? 'bg-[#22d3ee]/40' : 'bg-[#1e2448]'
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
