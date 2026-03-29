import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const STEPS = [
  { label: '0.001', factor: 0.001, tag: 'tooSlow' },
  { label: '0.01', factor: 0.01, tag: 'good' },
  { label: '0.1', factor: 0.1, tag: 'good' },
  { label: '0.5', factor: 0.5, tag: 'risky' },
  { label: '2.0', factor: 2.0, tag: 'chaos' },
];

function StepBar({ factor, active }: { factor: number; active: boolean }) {
  const pct = Math.min(100, (factor / 2.0) * 100);
  const color = factor <= 0.001 ? '#708090' : factor <= 0.1 ? '#4ade80' : factor <= 0.5 ? '#ffd700' : '#f87171';
  return (
    <div className="w-full h-3 bg-[#0a0e27] rounded overflow-hidden border border-[#1e2448]">
      <div
        className="h-full transition-all duration-500 rounded"
        style={{ width: `${pct}%`, background: color, opacity: active ? 1 : 0.3 }}
      />
    </div>
  );
}

function BridgeDemo({ stepSize }: { stepSize: number }) {
  const { t } = useTranslation();
  const isChaos = stepSize >= 0.5;
  const isSlow = stepSize <= 0.001;
  const isGood = !isChaos && !isSlow;

  return (
    <div className="glass-panel pixel-border p-4 text-center">
      <div className="flex justify-center gap-1 mb-3">
        {Array.from({ length: 7 }).map((_, i) => {
          const falling = isChaos && (i === 2 || i === 5);
          const color = falling ? '#f87171' : isGood ? '#fb923c' : '#708090';
          return (
            <div
              key={i}
              className="w-8 h-8 rounded flex items-center justify-center font-pixel text-base transition-all duration-300"
              style={{
                background: falling ? 'rgba(248,113,113,0.2)' : 'rgba(251,146,60,0.15)',
                border: `2px solid ${color}`,
                transform: falling ? 'rotate(20deg) translateY(8px)' : 'none',
                opacity: falling ? 0.4 : 1,
              }}
            >
              {falling ? '💥' : i === 3 ? '🤖' : '🟧'}
            </div>
          );
        })}
      </div>
      <p className="font-body text-sm" style={{ color: isChaos ? '#f87171' : isSlow ? '#708090' : '#4ade80' }}>
        {isChaos ? t('ppo.feel.resultChaos') : isSlow ? t('ppo.feel.resultSlow') : t('ppo.feel.resultGood')}
      </p>
    </div>
  );
}

export function PPOFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [selectedIdx, setSelectedIdx] = useState(2);
  const [tried, setTried] = useState<Set<number>>(new Set([2]));
  const [canProceed, setCanProceed] = useState(false);

  const select = (i: number) => {
    setSelectedIdx(i);
    const next = new Set(tried);
    next.add(i);
    setTried(next);
    if (next.size >= 4) setCanProceed(true);
  };

  const current = STEPS[selectedIdx];

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <PixelPanel>
        <h3 className="font-pixel text-sm text-[#fb923c] glow-accent">{t('ppo.feel.title')}</h3>
        <p className="font-body text-lg text-[#e2e8f0] mt-1">{t('ppo.feel.instruction')}</p>
      </PixelPanel>

      <PixelPanel>
        <p className="font-pixel text-[10px] text-[#708090] mb-4">{t('ppo.feel.selectStep')}</p>
        <div className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 cursor-pointer" onClick={() => select(i)}>
              <PixelButton size="sm" variant={selectedIdx === i ? 'primary' : 'secondary'} onClick={() => select(i)}>
                {s.label}
              </PixelButton>
              <div className="flex-1">
                <StepBar factor={s.factor} active={selectedIdx === i} />
              </div>
              {tried.has(i) && (
                <span className="font-pixel text-[9px]" style={{ color: s.factor >= 0.5 ? '#f87171' : s.factor <= 0.001 ? '#708090' : '#4ade80' }}>
                  {s.factor >= 0.5 ? t('ppo.feel.tagChaos') : s.factor <= 0.001 ? t('ppo.feel.tagSlow') : t('ppo.feel.tagOk')}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="font-body text-sm text-[#708090] mt-3">
          {t('ppo.feel.triedCount', { count: tried.size, total: STEPS.length })}
        </p>
      </PixelPanel>

      <BridgeDemo stepSize={current.factor} />

      <PixelPanel className="glass-panel pixel-border p-4">
        <p className="font-pixel text-[10px] text-[#fb923c] mb-2">{t('ppo.feel.keyInsight')}</p>
        <p className="font-body text-base text-[#e2e8f0]">{t('ppo.feel.insight')}</p>
      </PixelPanel>

      <div className="flex justify-between items-center">
        {onSkip && <PixelButton size="sm" variant="secondary" onClick={onSkip}>{t('common.skip')} →</PixelButton>}
        <PixelButton onClick={onComplete} disabled={!canProceed}>
          {canProceed ? `${t('common.next')} →` : t('ppo.feel.tryMore')}
        </PixelButton>
      </div>
    </div>
  );
}
