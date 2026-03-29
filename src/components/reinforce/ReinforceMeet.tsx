import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const TOTAL_SLIDES = 5;

// Dart probability bar visualization
function PolicyBar({ label, prob, color }: { label: string; prob: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-pixel text-[10px] w-8 text-right" style={{ color }}>{label}</span>
      <div className="flex-1 h-4 bg-[#0a0e27] pixel-border rounded overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${prob * 100}%`, background: color, opacity: 0.8 }}
        />
      </div>
      <span className="font-pixel text-[10px] text-[#708090] w-10">{(prob * 100).toFixed(0)}%</span>
    </div>
  );
}

// Example policies to show how they shift after learning
const BEFORE_POLICY = [0.25, 0.25, 0.25, 0.25];
const AFTER_GOOD = [0.55, 0.25, 0.10, 0.10];  // learned: up is best
const AFTER_BAD  = [0.10, 0.10, 0.55, 0.25];  // after bad experience
const SECTOR_COLORS = ['#00d4ff', '#4ade80', '#f87171', '#ffd700'];
const SECTOR_LABELS = ['⬆️', '➡️', '⬇️', '⬅️'];

export function ReinforceMeet({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const [policyState, setPolicyState] = useState<'before' | 'good' | 'bad'>('before');

  const nextSlide = () => slide < TOTAL_SLIDES - 1 ? setSlide(s => s + 1) : onComplete();
  const prevSlide = () => slide > 0 && setSlide(s => s - 1);

  const currentPolicy =
    policyState === 'before' ? BEFORE_POLICY :
    policyState === 'good'   ? AFTER_GOOD : AFTER_BAD;

  const slides = [
    // Slide 0: The key idea
    <PixelPanel key="s0" className="text-center">
      <div className="text-5xl mb-6 animate-float">🎯</div>
      <h3 className="font-pixel text-sm text-[#f97316] mb-3">{t('reinforce.meet.slide0title')}</h3>
      <p className="font-body text-xl text-[#e2e8f0] max-w-lg mx-auto mb-4">{t('reinforce.meet.slide0desc')}</p>
      <div className="glass-panel pixel-border p-3 max-w-md mx-auto">
        <p className="font-body text-base text-[#ffd700]">{t('reinforce.meet.slide0key')}</p>
      </div>
    </PixelPanel>,

    // Slide 1: Policy as probabilities
    <PixelPanel key="s1">
      <h3 className="font-pixel text-sm text-[#f97316] mb-3">{t('reinforce.meet.slide1title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('reinforce.meet.slide1desc')}</p>
      <div className="mb-4">
        <p className="font-pixel text-[10px] text-[#708090] mb-2 text-center">{t('reinforce.meet.policyLabel')}</p>
        {currentPolicy.map((p, i) => (
          <div key={i} className="mb-2">
            <PolicyBar label={SECTOR_LABELS[i]} prob={p} color={SECTOR_COLORS[i]} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        <PixelButton size="sm" variant={policyState === 'before' ? 'primary' : 'secondary'}
          onClick={() => setPolicyState('before')}>{t('reinforce.meet.randomPolicy')}</PixelButton>
        <PixelButton size="sm" variant={policyState === 'good' ? 'primary' : 'secondary'}
          onClick={() => setPolicyState('good')}>{t('reinforce.meet.afterGoodRun')}</PixelButton>
        <PixelButton size="sm" variant={policyState === 'bad' ? 'primary' : 'secondary'}
          onClick={() => setPolicyState('bad')}>{t('reinforce.meet.afterBadRun')}</PixelButton>
      </div>
      <p className="font-body text-sm text-[#708090] mt-3 text-center">{t('reinforce.meet.slide1note')}</p>
    </PixelPanel>,

    // Slide 2: The REINFORCE update rule
    <PixelPanel key="s2">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3">{t('reinforce.meet.slide2title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('reinforce.meet.slide2desc')}</p>
      <div className="glass-panel pixel-border p-4 mb-4">
        <p className="font-pixel text-[10px] text-[#f97316] mb-2">{t('reinforce.meet.formula')}</p>
        <p className="font-pixel text-[10px] text-[#e2e8f0]">π(a|s) += α × G × 1</p>
        <p className="font-body text-sm text-[#708090] mt-2">{t('reinforce.meet.formulaNote')}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { sym: 'α', color: '#00d4ff', key: 'alphaDesc' },
          { sym: 'G', color: '#4ade80', key: 'returnDesc' },
          { sym: 'π(a|s)', color: '#f97316', key: 'policyDesc' },
        ].map(({ sym, color, key }) => (
          <div key={sym} className="glass-panel pixel-border p-3 text-center">
            <span className="font-pixel text-sm block mb-1" style={{ color }}>{sym}</span>
            <p className="font-body text-sm text-[#e2e8f0]">{t(`reinforce.meet.${key}`)}</p>
          </div>
        ))}
      </div>
    </PixelPanel>,

    // Slide 3: Why Monte Carlo (wait for episode end)
    <PixelPanel key="s3">
      <h3 className="font-pixel text-sm text-[#4ade80] mb-3">{t('reinforce.meet.slide3title')}</h3>
      <p className="font-body text-lg text-[#e2e8f0] mb-4">{t('reinforce.meet.slide3desc')}</p>
      <div className="flex flex-col gap-3">
        {(['step1', 'step2', 'step3'] as const).map((key, i) => (
          <div key={i} className="flex gap-3 items-start glass-panel pixel-border p-3">
            <span className="font-pixel text-sm text-[#f97316] mt-0.5">{i + 1}.</span>
            <p className="font-body text-base text-[#e2e8f0]">{t(`reinforce.meet.${key}`)}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel pixel-border p-3 mt-4">
        <p className="font-body text-base text-[#ffd700]">{t('reinforce.meet.slide3note')}</p>
      </div>
    </PixelPanel>,

    // Slide 4: Summary
    <PixelPanel key="s4" variant="gold">
      <h3 className="font-pixel text-sm text-[#ffd700] glow-gold mb-3 text-center">{t('reinforce.meet.slide4title')}</h3>
      <div className="flex flex-col gap-3 max-w-lg mx-auto">
        {[
          { icon: '🎯', key: 'summary1' },
          { icon: '📊', key: 'summary2' },
          { icon: '📈', key: 'summary3' },
        ].map(({ icon, key }) => (
          <div key={key} className="glass-panel pixel-border p-3 flex gap-3 items-start">
            <span className="text-xl">{icon}</span>
            <p className="font-body text-base text-[#e2e8f0]">{t(`reinforce.meet.${key}`)}</p>
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
            i === slide ? 'bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.5)]'
              : i < slide ? 'bg-[#f97316]/40' : 'bg-[#1e2448]'
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
