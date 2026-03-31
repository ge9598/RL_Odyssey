import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore, ALGORITHM_CARDS } from '@/stores/cardStore';
import type { AlgorithmCard } from '@/stores/cardStore';
import type { BountyRank } from '@/types/algorithm';
import { SoundManager } from '@/systems/SoundManager';

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

  // Grid rings
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

  // Value polygon
  const valuePoints = RADAR_AXES.map((axis, i) => {
    const val = stats[axis];
    const r = (val / 5) * maxR;
    return polarToCart(i * angleStep, r).join(',');
  }).join(' ');

  // Axis labels
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
// SummaryStep — Generic port summary + card reward
//
// Shows quest results (rank, gold earned), the algorithm card with radar
// chart, and key takeaways.
// ---------------------------------------------------------------------------

// Spinning rank reveal animation letters
const RANK_CYCLE = ['C', 'B', 'A', 'S'] as const;

function SummaryStep({ portId, onComplete }: PortStepProps) {
  const { t, i18n } = useTranslation();

  const portConfig = getPortConfig(portId);
  const summaryStepConfig = portConfig?.steps.find((s) => s.type === 'summary');
  const meta = summaryStepConfig?.meta ?? {};

  const summaryKey = (meta.summaryKey as string) ?? `port.${portId}.summary`;
  const cardId = (meta.cardId as string) ?? portConfig?.quest.cardId ?? '';

  // Read quest results from stores
  const portProgress = useGameStore((s) => s.portProgress[portId]);
  const rank: BountyRank = portProgress?.bestRank ?? 'C';
  const gold = portProgress?.bestGold ?? 0;

  const hasCard = useCardStore((s) => s.hasCard(cardId));
  const card = ALGORITHM_CARDS.find((c) => c.id === cardId);

  const rankInfo = RANK_COLORS[rank];
  const isZh = i18n.language === 'zh';

  // ---- Celebration sequence state ----
  const [cycleIndex, setCycleIndex] = useState(0);
  const [showFinalRank, setShowFinalRank] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Step 1: cycle through ranks then lock
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setCycleIndex((i) => (i + 1) % RANK_CYCLE.length);
      if (frame >= 8) {
        clearInterval(interval);
        setShowFinalRank(true);
        SoundManager.playSfx('rank_reveal');
        // Step 3: confetti for S/A
        if (rank === 'S' || rank === 'A') {
          setTimeout(() => setShowConfetti(true), 200);
        }
        // Step 4: card reveal
        setTimeout(() => {
          setShowCard(true);
          SoundManager.playSfx('card_unlock');
        }, 600);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [rank]);

  const displayRank = showFinalRank ? rank : RANK_CYCLE[cycleIndex];
  const displayRankInfo = showFinalRank ? rankInfo : RANK_COLORS[displayRank];

  return (
    <PortStepShell
      title={t('port.steps.summary', 'Summary & Reward')}
      durationHint={summaryStepConfig?.durationHint}
      onNext={onComplete}
      nextLabel={t('port.summary.continue', 'Continue')}
    >
      {/* CSS confetti overlay */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm" style={{ zIndex: 10 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${(i * 31 + 5) % 100}%`,
                top: '-8px',
                background: ['#ffd700','#00d4ff','#ff6b6b','#4ade80','#a78bfa'][i % 5],
                animation: `confettiFall ${1.5 + (i % 5) * 0.3}s ease-in ${(i % 7) * 0.15}s forwards`,
              }}
            />
          ))}
          <style>{`
            @keyframes confettiFall {
              from { transform: translateY(0) rotate(0deg); opacity: 1; }
              to   { transform: translateY(400px) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      <div className="flex flex-col items-center gap-8 py-4 relative">
        {/* ---- Quest result banner ---- */}
        <div className="text-center">
          <p className="font-pixel text-xs text-[#708090] uppercase tracking-wider mb-2">
            {t('port.summary.questComplete', 'Quest Complete!')}
          </p>
          <div
            className={`font-pixel text-5xl ${displayRankInfo.text} ${displayRankInfo.glow} mb-1 transition-all duration-100`}
            style={{ transform: showFinalRank ? 'scale(1.2)' : 'scale(1)' }}
          >
            {displayRank}
          </div>
          {showFinalRank && (
            <>
              <p className={`font-pixel text-xs ${rankInfo.text}`}>
                {t(`bounty.rank.${rank}`, rankInfo.label)}
              </p>
              <p className="font-body text-lg text-[#ffd700] glow-gold mt-2"
                style={{ animation: 'portStepFadeIn 0.5s ease-out' }}>
                + {gold} {t('common.gold', 'Gold')}
              </p>
            </>
          )}
        </div>

        {/* ---- Algorithm card ---- */}
        {card && showCard && (
          <div
            className={`
              pixel-border-gold glass-panel rounded-sm p-5 max-w-sm w-full
              ${hasCard ? 'glow-box-gold' : ''}
            `}
            style={{ animation: 'cardFlipIn 0.6s ease-out both' }}
          >
            <div className="flex items-start gap-4">
              {/* Radar chart */}
              <RadarChart stats={card.stats} lang={i18n.language} />

              {/* Card text */}
              <div className="flex-1 min-w-0">
                <h4 className="font-pixel text-xs text-[#ffd700] glow-gold mb-1">
                  {isZh ? card.nameZh : card.name}
                </h4>
                <p className="font-body text-sm text-[#00d4ff] mb-2 italic">
                  "{isZh ? card.signatureMoveZh : card.signatureMove}"
                </p>

                {/* Strengths */}
                <div className="mb-1">
                  <span className="font-pixel text-[9px] text-[#4ade80]">+</span>
                  {card.strengths.map((s, i) => (
                    <span key={i} className="font-body text-xs text-[#e2e8f0] ml-1">
                      {s}{i < card.strengths.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>

                {/* Weaknesses */}
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

            {/* New card indicator */}
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

      {/* Keyframes for card flip-in */}
      <style>{`
        @keyframes cardFlipIn {
          from { opacity: 0; transform: translateY(40px) rotateX(90deg); }
          to   { opacity: 1; transform: translateY(0) rotateX(0deg); }
        }
      `}</style>
    </PortStepShell>
  );
}

export default SummaryStep;
