import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PixelButton, PixelPanel } from '@/components/ui';
import { useCardStore, ALGORITHM_CARDS } from '@/stores/cardStore';
import type { AlgorithmCard } from '@/stores/cardStore';

const STAT_LABELS: Record<string, string> = {
  sampleEfficiency: 'Sample Eff.',
  stability: 'Stability',
  scalability: 'Scalability',
  simplicity: 'Simplicity',
  flexibility: 'Flexibility',
};

const RANK_COLORS: Record<string, string> = {
  S: '#ffd700',
  A: '#00d4ff',
  B: '#4ade80',
  C: '#708090',
};

function RadarBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="font-pixel text-[9px] text-[#708090] w-20 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: n <= value ? '#00d4ff' : '#1e2448' }}
          />
        ))}
      </div>
      <span className="font-pixel text-[9px] text-[#e2e8f0]">{value}/5</span>
    </div>
  );
}

function CardDetail({ card, rank }: { card: AlgorithmCard; rank?: string }) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-pixel text-sm text-[#00d4ff] glow-accent">
          {isZh ? card.nameZh : card.name}
        </h3>
        {rank && (
          <span
            className="font-pixel text-xs"
            style={{ color: RANK_COLORS[rank] ?? '#708090' }}
          >
            {rank} Rank
          </span>
        )}
      </div>

      {/* Signature Move */}
      <div className="glass-panel pixel-border p-3">
        <p className="font-pixel text-[9px] text-[#ffd700] mb-1">Signature Move</p>
        <p className="font-body text-base text-[#e2e8f0]">
          {isZh ? card.signatureMoveZh : card.signatureMove}
        </p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel pixel-border p-3">
          <p className="font-pixel text-[9px] text-[#4ade80] mb-2">✓ Strengths</p>
          {card.strengths.map((s, i) => (
            <p key={i} className="font-body text-sm text-[#e2e8f0]">• {s}</p>
          ))}
        </div>
        <div className="glass-panel pixel-border p-3">
          <p className="font-pixel text-[9px] text-[#f87171] mb-2">✗ Weaknesses</p>
          {card.weaknesses.map((w, i) => (
            <p key={i} className="font-body text-sm text-[#e2e8f0]">• {w}</p>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="glass-panel pixel-border p-3">
        <p className="font-pixel text-[9px] text-[#00d4ff] mb-3">Stats</p>
        {Object.entries(card.stats).map(([key, val]) => (
          <RadarBar key={key} label={STAT_LABELS[key] ?? key} value={val} />
        ))}
      </div>
    </div>
  );
}

function CardTile({
  card,
  collected,
  rank,
  selected,
  onClick,
}: {
  card: AlgorithmCard;
  collected: boolean;
  rank?: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-2 p-4 pixel-border transition-all duration-200 text-left w-full
        ${collected ? 'cursor-pointer' : 'cursor-default opacity-40'}
        ${selected ? 'bg-[rgba(0,212,255,0.15)] border-[rgba(0,212,255,0.6)] shadow-[0_0_12px_rgba(0,212,255,0.2)]' : 'glass-panel hover:border-[rgba(0,212,255,0.4)]'}
      `}
    >
      {/* Rank badge */}
      {rank && (
        <span
          className="absolute top-2 right-2 font-pixel text-[10px]"
          style={{ color: RANK_COLORS[rank] ?? '#708090' }}
        >
          {rank}
        </span>
      )}

      {/* Lock icon */}
      {!collected && (
        <span className="text-2xl">🔒</span>
      )}

      {/* Card name */}
      <p className={`font-pixel text-[10px] text-center leading-relaxed ${collected ? 'text-[#e2e8f0]' : 'text-[#708090]'}`}>
        {collected ? (isZh ? card.nameZh : card.name) : '???'}
      </p>

      {/* Port label — only show for collected cards to avoid revealing locked IDs */}
      {collected && (
        <p className="font-pixel text-[8px] text-[#708090]">{card.portId}</p>
      )}
    </button>
  );
}

export function CardGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { collectedCards, cardRanks } = useCardStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    collectedCards.length > 0 ? collectedCards[0] : null,
  );

  const selectedCard = selectedId ? ALGORITHM_CARDS.find((c) => c.id === selectedId) : null;
  const collectedCount = ALGORITHM_CARDS.filter((c) => collectedCards.includes(c.id)).length;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-pixel text-sm text-[#00d4ff] glow-accent">
            {t('cards.title')}
          </h2>
          <p className="font-body text-lg text-[#708090] mt-1">
            {collectedCount} / {ALGORITHM_CARDS.length} {t('cards.collected')}
          </p>
        </div>
        <PixelButton size="sm" variant="secondary" onClick={() => navigate(-1)}>
          ← {t('common.back')}
        </PixelButton>
      </div>

      <div className="flex gap-6">
        {/* Card grid */}
        <div className="w-64 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {ALGORITHM_CARDS.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                collected={collectedCards.includes(card.id)}
                rank={cardRanks[card.id]}
                selected={selectedId === card.id}
                onClick={() => collectedCards.includes(card.id) && setSelectedId(card.id)}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1">
          {selectedCard ? (
            <PixelPanel>
              <CardDetail card={selectedCard} rank={cardRanks[selectedCard.id]} />
            </PixelPanel>
          ) : (
            <PixelPanel className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="text-4xl mb-3">🎴</div>
                <p className="font-pixel text-xs text-[#708090]">{t('cards.selectHint')}</p>
              </div>
            </PixelPanel>
          )}
        </div>
      </div>
    </div>
  );
}
