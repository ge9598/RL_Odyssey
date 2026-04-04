import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { useCardStore } from '@/stores/cardStore';
import { LanguageToggle } from './LanguageToggle';
import { PixelButton } from './PixelButton';
import { AnimatedCounter } from './AnimatedCounter';

export function TopBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { totalGold, getNavigatorRank, playerName, selectedPet } = useGameStore();
  const { collectedCards } = useCardStore();
  const rank = getNavigatorRank();

  const showBack = location.pathname !== '/';

  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-[rgba(13,18,48,0.9)] backdrop-blur-sm border-b border-[rgba(0,212,255,0.1)] shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3">
        {showBack && (
          <PixelButton size="sm" variant="secondary" onClick={() => navigate(-1)}>
            ←
          </PixelButton>
        )}
        <h1
          className="font-pixel text-[11px] text-[#00d4ff] cursor-pointer glow-accent hover:brightness-125 transition-all"
          onClick={() => navigate('/')}
        >
          RL Odyssey
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3 font-pixel text-[11px]">
          {/* Player identity: pet + name */}
          {(selectedPet || playerName) && (
            <span className="text-[#e2e8f0] flex items-center gap-1">
              {selectedPet && <span>{selectedPet}</span>}
              {playerName && <span className="text-[#00d4ff]">{playerName}</span>}
            </span>
          )}
          <span className="text-[#ffd700] glow-gold">
            💰 <AnimatedCounter value={totalGold} />
          </span>
          <span
            className="text-[#e2e8f0] cursor-pointer hover:text-[#00d4ff] transition-colors"
            onClick={() => navigate('/cards')}
            title={t('common.cards')}
          >🎴 {collectedCards.length}</span>
          <span className="text-[#4ade80]">
            {t(`bounty.navigator.${rank.level}`)}
          </span>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
