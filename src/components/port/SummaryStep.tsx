import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore, ALGORITHM_CARDS } from '@/stores/cardStore';
import type { AlgorithmCard } from '@/stores/cardStore';
import type { BountyRank } from '@/types/algorithm';
import { soundManager } from '@/systems/SoundManager';

// ---------------------------------------------------------------------------
// Rank badge colors
// ---------------------------------------------------------------------------

const RANK_COLORS: Record<BountyRank, { text: string; glow: string; label: string }> = {
  S: { text: 'text-[#ffd700]', glow: 'glow-gold', label: 'Legendary' },
  A: { text: 'text-[#40e0d0]', glow: 'glow-accent', label: 'High Bounty' },
  B: { text: 'text-[#e2e8f0]', glow: '', label: 'Standard' },
  C: { text: 'text-[#708090]', glow: '', label: 'Rookie' },
};

// ---------------------------------------------------------------------------
// Radar chart (pure SVG, no deps)
// ---------------------------------------------------------------------------

const RADAR_AXES = [
  'sampleEfficiency',
  'stability',
  'scalability',
  'simplicity',
  'flexibility',
] as const;

const RADAR_LABELS_EN = ['Efficiency', 'Stability', 'Scale', 'Simplicity', 'Flexibility'];
const RADAR_LABELS_ZH = ['\u6548\u7387', '\u7A33\u5B9A', '\u89C4\u6A21', '\u7B80\u5355', '\u7075\u6D3B'];

function RadarChart({ stats, lang }: { stats: AlgorithmCard['stats']; lang: string }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 60;
  const labels = lang === 'zh' ? RADAR_LABELS_ZH : RADAR_LABELS_EN;

  function polarToCart(angle: number, r: number): [number, number] {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  const angleStep = 360 / RADAR_AXES.length;

  const rings = [1, 2, 3, 4, 5].map((level) => {
    const r = (level / 5) * maxR;
    const points = RADAR_AXES.map((_, i) => polarToCart(i * angleStep, r).join(',')).join(' ');
    return (
      <polygon
        key={level}
        points={points}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
    );
  });

  const valuePoints = RADAR_AXES.map((axis, i) => {
    const val = stats[axis];
    const r = (val / 5) * maxR;
    return polarToCart(i * angleStep, r).join(',');
  }).join(' ');

  const axisLabels = RADAR_AXES.map((_, i) => {
    const [lx, ly] = polarToCart(i * angleStep, maxR + 16);
    return (
      <text
        key={i}
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-pixel"
        fill="#708090"
        fontSize="8"
      >
        {labels[i]}
      </text>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings}
      <polygon
        points={valuePoints}
        fill="rgba(0,212,255,0.2)"
        stroke="#00d4ff"
        strokeWidth="1.5"
      />
      {RADAR_AXES.map((axis, i) => {
        const val = stats[axis];
        const r = (val / 5) * maxR;
        const [dx, dy] = polarToCart(i * angleStep, r);
        return <circle key={axis} cx={dx} cy={dy} r="3" fill="#00d4ff" />;
      })}
      {axisLabels}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Confetti DOM particle (CSS only, no canvas needed for summary)
// ---------------------------------------------------------------------------

function ConfettiLayer({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ['#ffd700', '#00d4ff', '#f87171', '#4ade80', '#a78bfa'];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 25 }, (_, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            background: colors[i % colors.length],
            animation: `confettiFall ${1.5 + Math.random()}s ease-in ${Math.random() * 0.8}s forwards`,
            opacity: 0.9,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(${Math.random() > 0.5 ? '' : '-'}720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryStep — Generic port summary + card reward
// ---------------------------------------------------------------------------

function SummaryStep({ portId, onComplete }: PortStepProps) {
  const { t, i18n } = useTranslation();

  const portConfig = getPortConfig(portId);
  const summaryStepConfig = portConfig?.steps.find((s) => s.type === 'summary');
  const meta = summaryStepConfig?.meta ?? {};

  const summaryKey = (meta.summaryKey as string) ?? `port.${portId}.summary`;
  const cardId = (meta.cardId as string) ?? portConfig?.quest.cardId ?? '';

  const portProgress = useGameStore((s) => s.portProgress[portId]);
  const rank: BountyRank = portProgress?.bestRank ?? 'C';
  const gold = portProgress?.bestGold ?? 0;

  const hasCard = useCardStore((s) => s.hasCard(cardId));
  const card = ALGORITHM_CARDS.find((c) => c.id === cardId);

  const rankInfo = RANK_COLORS[rank];
  const isZh = i18n.language === 'zh';

  // ---- Celebration sequence ----
  const [phase, setPhase] = useState(0);
  // phase 0 = rank spin, 1 = rank revealed, 2 = gold, 3 = card, 4 = confetti
  const [confetti, setConfetti] = useState(false);
  const [rankDisplay, setRankDisplay] = useState<BountyRank>('C');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Rank spin: cycle C→B→A→S quickly then land on real rank
    const allRanks: BountyRank[] = ['C', 'B', 'A', 'S'];
    let count = 0;
    const spinInterval = setInterval(() => {
      setRankDisplay(allRanks[count % 4] as BountyRank);
      count++;
      if (count >= 8) {
        clearInterval(spinInterval);
        setRankDisplay(rank);
        soundManager.playSfx('rank_reveal');
        timerRef.current = setTimeout(() => setPhase(1), 200);
      }
    }, 80);

    return () => {
      clearInterval(spinInterval);
      clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 1) {
      timerRef.current = setTimeout(() => {
        soundManager.playSfx('coin_collect');
        setPhase(2);
      }, 500);
    } else if (phase === 2) {
      timerRef.current = setTimeout(() => {
        soundManager.playSfx('card_unlock');
        setPhase(3);
      }, 700);
    } else if (phase === 3 && (rank === 'S' || rank === 'A')) {
      timerRef.current = setTimeout(() => {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3000);
        setPhase(4);
      }, 500);
    }
    return () => clearTimeout(timerRef.current);
  }, [phase, rank]);

  const spinColors = RANK_COLORS[rankDisplay];

  return (
    <PortStepShell
      title={t('port.steps.summary', 'Summary & Reward')}
      durationHint={summaryStepConfig?.durationHint}
      onNext={onComplete}
      nextLabel={t('port.summary.continue', 'Continue')}
    >
      <ConfettiLayer active={confetti} />

      <div className="flex flex-col items-center gap-8 py-4">
        {/* ---- Quest result banner ---- */}
        <div className="text-center">
          <p className="font-pixel text-xs text-[#708090] uppercase tracking-wider mb-2">
            {t('port.summary.questComplete', 'Quest Complete!')}
          </p>
          {/* Rank — spins during phase 0, then settles */}
          <div
            className={`font-pixel text-3xl ${spinColors.text} ${spinColors.glow} mb-1 transition-all duration-100`}
            style={{
              animation: phase === 0 ? 'rankSpin 0.08s steps(1) infinite' : 'rankLand 0.3s ease-out',
            }}
          >
            {rankDisplay}
          </div>
          <p className={`font-pixel text-xs ${rankInfo.text}`}>
            {t(`bounty.rank.${rank}`, rankInfo.label)}
          </p>
          {/* Gold — appears in phase 2+ */}
          <p
            className="font-body text-lg text-[#ffd700] glow-gold mt-2"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transition: 'opacity 0.5s ease-out',
            }}
          >
            + {gold} {t('common.gold', 'Gold')}
          </p>
        </div>

        {/* ---- Algorithm card — slides in at phase 3+ ---- */}
        {card && (
          <div
            className={`
              pixel-border-gold glass-panel rounded-sm p-5 max-w-sm w-full
              ${hasCard ? 'glow-box-gold' : ''}
            `}
            style={{
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? 'translateY(0) rotateY(0deg)' : 'translateY(20px) rotateY(90deg)',
              transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            <div className="flex items-start gap-4">
              <RadarChart stats={card.stats} lang={i18n.language} />
              <div className="flex-1 min-w-0">
                <h4 className="font-pixel text-xs text-[#ffd700] glow-gold mb-1">
                  {isZh ? card.nameZh : card.name}
                </h4>
                <p className="font-body text-sm text-[#00d4ff] mb-2 italic">
                  "{isZh ? card.signatureMoveZh : card.signatureMove}"
                </p>
                <div className="mb-1">
                  <span className="font-pixel text-[9px] text-[#4ade80]">+</span>
                  {card.strengths.map((s, i) => (
                    <span key={i} className="font-body text-xs text-[#e2e8f0] ml-1">
                      {s}{i < card.strengths.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
                <div>
                  <span className="font-pixel text-[9px] text-[#f87171]">-</span>
                  {card.weaknesses.map((w, i) => (
                    <span key={i} className="font-body text-xs text-[#e2e8f0] ml-1">
                      {w}{i < card.weaknesses.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {!hasCard && (
              <div className="text-center mt-3">
                <span className="font-pixel text-[10px] text-[#ffd700] animate-pulse glow-gold">
                  {t('port.summary.newCard', 'NEW CARD COLLECTED!')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ---- Key takeaway ---- */}
        <div className="max-w-2xl text-center">
          <h4 className="font-pixel text-xs text-[#00d4ff] glow-accent uppercase tracking-wider mb-2">
            {t('port.summary.takeaway', 'Key Takeaway')}
          </h4>
          <p
            className="font-body text-lg text-[#e2e8f0] leading-relaxed"
            style={{ animation: 'portStepFadeIn 0.8s ease-out 0.5s both' }}
          >
            {t(summaryKey)}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes portStepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rankLand {
          0%   { transform: scale(1.6); }
          100% { transform: scale(1); }
        }
      `}</style>
    </PortStepShell>
  );
}

export default SummaryStep;
