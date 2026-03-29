import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton, PixelPanel } from '@/components/ui';

interface PortStepProps {
  portId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

// Workers competing to solve the same maze, demonstrating parallel learning
const WORKER_EMOJIS = ['🤖', '🦾', '🔬', '⚙️', '🚀', '💡', '🔧', '🎯'];
const WORKER_COLORS = ['#00d4ff', '#4ade80', '#ffd700', '#f87171', '#c084fc', '#fb923c', '#22d3ee', '#a3e635'];

function WorkerCard({ id, color, progress, emoji }: { id: number; color: string; progress: number; emoji: string }) {
  const { t } = useTranslation();
  return (
    <div className="glass-panel pixel-border p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className="font-pixel text-[10px]" style={{ color }}>{t('a2c.feel.worker')} {id + 1}</span>
      </div>
      <div className="w-full h-2 bg-[#0a0e27] rounded overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: color }} />
      </div>
      <span className="font-pixel text-[9px] text-[#708090]">{Math.round(progress)}%</span>
    </div>
  );
}

export function A2CFeel({ onComplete, onSkip }: PortStepProps) {
  const { t } = useTranslation();
  const [numWorkers, setNumWorkers] = useState(1);
  const [simRunning, setSimRunning] = useState(false);
  const [progresses, setProgresses] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [finished, setFinished] = useState(false);
  const [solveTime, setSolveTime] = useState<number | null>(null);
  const intervalRef = { current: 0 as ReturnType<typeof setInterval> | number };

  const runSimulation = (n: number) => {
    setProgresses(new Array(8).fill(0));
    setFinished(false);
    setSolveTime(null);
    setSimRunning(true);
    const start = Date.now();
    // Simulate: more workers = faster learning (logarithmic scaling)
    const speedFactor = 1 + Math.log2(n) * 0.6;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgresses(prev => {
        const next = [...prev];
        for (let i = 0; i < n; i++) {
          const noise = (Math.random() - 0.3) * 4;
          next[i] = Math.min(100, next[i] + (speedFactor * 1.2 + noise));
        }
        const allDone = next.slice(0, n).every(p => p >= 100);
        if (allDone) {
          clearInterval(interval);
          setSimRunning(false);
          setFinished(true);
          setSolveTime(Math.round((Date.now() - start) / 10) * 10);
        }
        return next;
      });
    }, 80);
    intervalRef.current = interval;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <PixelPanel>
        <h3 className="font-pixel text-sm text-[#22d3ee] glow-accent">{t('a2c.feel.title')}</h3>
        <p className="font-body text-lg text-[#e2e8f0] mt-1">{t('a2c.feel.instruction')}</p>
      </PixelPanel>

      <div className="glass-panel pixel-border p-3 text-center">
        <p className="font-body text-base text-[#22d3ee]">{t('a2c.feel.hint')}</p>
      </div>

      {/* Worker selector */}
      <PixelPanel>
        <p className="font-pixel text-[10px] text-[#708090] mb-3">{t('a2c.feel.selectWorkers')}</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {[1, 2, 4, 8].map(n => (
            <PixelButton key={n} size="sm" variant={numWorkers === n ? 'primary' : 'secondary'}
              onClick={() => { setNumWorkers(n); setProgresses(new Array(8).fill(0)); setFinished(false); setSolveTime(null); setSimRunning(false); }}>
              {n} {n === 1 ? t('a2c.feel.workerSingle') : t('a2c.feel.workerPlural')}
            </PixelButton>
          ))}
        </div>
        <PixelButton onClick={() => runSimulation(numWorkers)} disabled={simRunning}>
          {simRunning ? t('a2c.feel.running') : t('a2c.feel.launch')}
        </PixelButton>
      </PixelPanel>

      {/* Worker grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: numWorkers }).map((_, i) => (
          <WorkerCard key={i} id={i} color={WORKER_COLORS[i]} progress={progresses[i]} emoji={WORKER_EMOJIS[i]} />
        ))}
      </div>

      {finished && solveTime !== null && (
        <PixelPanel variant="gold" className="text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-pixel text-sm text-[#4ade80] mb-2">
            {t('a2c.feel.solved', { workers: numWorkers, time: solveTime })}
          </p>
          <p className="font-body text-lg text-[#22d3ee] mb-4">{t('a2c.feel.segue')}</p>
          <div className="flex justify-center gap-3">
            <PixelButton variant="secondary" onClick={() => { setFinished(false); setProgresses(new Array(8).fill(0)); setSolveTime(null); }}>
              {t('a2c.feel.tryAgain')}
            </PixelButton>
            <PixelButton onClick={onComplete}>{t('common.next')} →</PixelButton>
          </div>
        </PixelPanel>
      )}

      {!finished && onSkip && (
        <div className="text-center">
          <PixelButton size="sm" variant="secondary" onClick={onSkip}>{t('common.skip')} →</PixelButton>
        </div>
      )}
    </div>
  );
}
