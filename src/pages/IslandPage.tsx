import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton, PixelPanel } from '@/components/ui';

interface PortInfo {
  id: string;
  nameKey: string;
  algorithmKey: string;
  emoji: string;
  route: string;
}

const VALUE_PORTS: PortInfo[] = [
  { id: 'bandit', nameKey: 'value.bandit.name', algorithmKey: 'value.bandit.algorithm', emoji: '🎰', route: '/port/bandit' },
  { id: 'qtable', nameKey: 'value.qtable.name', algorithmKey: 'value.qtable.algorithm', emoji: '🗺️', route: '/port/qtable' },
  { id: 'deep', nameKey: 'value.deep.name', algorithmKey: 'value.deep.algorithm', emoji: '🧠', route: '/port/deep' },
];

export function IslandPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { islandId } = useParams<{ islandId: string }>();
  const { unlockedPorts, portProgress } = useGameStore();

  if (islandId !== 'value') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PixelPanel>
          <p className="font-pixel text-sm text-[#708090]">Coming in Phase 2+</p>
          <PixelButton size="sm" className="mt-4" onClick={() => navigate('/map')}>
            ← {t('common.back')}
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <h2 className="font-pixel text-base text-[#40e0d0] mb-2 glow-accent" style={{ textShadow: '0 0 10px rgba(64,224,208,0.4)' }}>
        {t('value.name')}
      </h2>
      <p className="font-body text-xl text-[#ffd700] mb-8 glow-gold">"{t('value.theme')}"</p>

      <div className="grid gap-5 max-w-2xl w-full">
        {VALUE_PORTS.map((port, index) => {
          const isUnlocked = unlockedPorts.includes(port.id as any);
          const progress = portProgress[port.id];
          const isCompleted = progress?.completed;

          return (
            <PixelPanel
              key={port.id}
              variant={isCompleted ? 'gold' : 'default'}
              className={`${isUnlocked ? 'cursor-pointer hover:border-[rgba(0,212,255,0.6)] hover:shadow-[0_0_16px_rgba(0,212,255,0.15)]' : 'opacity-45'} transition-all duration-200`}
            >
              <div
                className="flex items-center gap-4"
                onClick={() => isUnlocked && navigate(port.route)}
              >
                <div className="text-3xl">{port.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-pixel text-xs text-[#e2e8f0]">
                    Port {index + 1}: {t(port.nameKey)}
                  </h3>
                  <p className="font-body text-lg text-[#00d4ff]">{t(port.algorithmKey)}</p>
                  {isCompleted && progress.bestRank && (
                    <span className="font-pixel text-[10px] text-[#ffd700] glow-gold">
                      Best: {progress.bestRank} Rank — {progress.bestGold} gold
                    </span>
                  )}
                  {!isUnlocked && (
                    <span className="font-pixel text-[10px] text-[#708090]">
                      🔒 Complete previous port first
                    </span>
                  )}
                </div>
                {isUnlocked && (
                  <PixelButton size="sm" onClick={() => navigate(port.route)}>
                    →
                  </PixelButton>
                )}
              </div>
            </PixelPanel>
          );
        })}

        {/* Mini-Boss */}
        <PixelPanel
          variant="default"
          className="opacity-45 border-l-4 border-l-[#dc143c]"
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏴‍☠️</div>
            <div>
              <h3 className="font-pixel text-xs text-[#f87171]">
                BOSS: {t('value.boss.name')}
              </h3>
              <p className="font-body text-base text-[#e2e8f0]">{t('value.boss.desc')}</p>
              <span className="font-pixel text-[10px] text-[#708090]">
                🔒 Complete all ports first
              </span>
            </div>
          </div>
        </PixelPanel>
      </div>

      <PixelButton size="sm" variant="secondary" className="mt-8" onClick={() => navigate('/map')}>
        ← {t('common.back')}
      </PixelButton>
    </div>
  );
}
