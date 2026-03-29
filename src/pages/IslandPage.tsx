import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton, PixelPanel } from '@/components/ui';
import { getIslandConfig } from '@/config/islands';
import { getPortsForIsland } from '@/config/ports';

export function IslandPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { islandId } = useParams<{ islandId: string }>();
  const { unlockedPorts, portProgress } = useGameStore();

  const island = islandId ? getIslandConfig(islandId) : undefined;

  // Unknown island or not yet available
  if (!island || !island.available) {
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

  const ports = getPortsForIsland(island.id);
  const allPortsCompleted = ports.length > 0 && ports.every(
    (p) => portProgress[p.id]?.completed,
  );

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <h2
        className="font-pixel text-base mb-2 glow-accent"
        style={{ color: island.glowColor.replace(/[\d.]+\)$/, '1)'), textShadow: `0 0 10px ${island.glowColor}` }}
      >
        {t(island.nameKey)}
      </h2>
      <p className="font-body text-xl text-[#ffd700] mb-8 glow-gold">"{t(island.themeKey)}"</p>

      <div className="grid gap-5 max-w-2xl w-full">
        {ports.map((port, index) => {
          const isUnlocked = unlockedPorts.includes(port.id);
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
                onClick={() => isUnlocked && navigate(`/port/${port.id}`)}
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
                  <PixelButton size="sm" onClick={() => navigate(`/port/${port.id}`)}>
                    →
                  </PixelButton>
                )}
              </div>
            </PixelPanel>
          );
        })}

        {/* Boss section */}
        {island.bossConfig && (() => {
          const bossProgress = portProgress['boss-greedy-pirate'];
          const bossCompleted = bossProgress?.completed;

          return (
            <PixelPanel
              variant={bossCompleted ? 'gold' : 'default'}
              className={`border-l-4 border-l-[#dc143c] ${
                allPortsCompleted
                  ? 'cursor-pointer hover:border-[rgba(248,113,113,0.6)] hover:shadow-[0_0_16px_rgba(248,113,113,0.15)]'
                  : 'opacity-45'
              } transition-all duration-200`}
            >
              <div
                className="flex items-center gap-4"
                onClick={() => allPortsCompleted && navigate('/boss/greedy-pirate')}
              >
                <div className="text-3xl animate-float">{island.bossConfig.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-pixel text-xs text-[#f87171]">
                    BOSS: {t(island.bossConfig.nameKey)}
                  </h3>
                  <p className="font-body text-base text-[#e2e8f0]">{t(island.bossConfig.descKey)}</p>
                  {bossCompleted && bossProgress.bestRank && (
                    <span className="font-pixel text-[10px] text-[#ffd700] glow-gold">
                      Best: {bossProgress.bestRank} Rank — {bossProgress.bestGold} gold
                    </span>
                  )}
                  {!allPortsCompleted && (
                    <span className="font-pixel text-[10px] text-[#708090]">
                      Complete all ports first
                    </span>
                  )}
                </div>
                {allPortsCompleted && (
                  <PixelButton size="sm" variant="danger" onClick={() => navigate('/boss/greedy-pirate')}>
                    {bossCompleted ? '>' : '!'}
                  </PixelButton>
                )}
              </div>
            </PixelPanel>
          );
        })()}
      </div>

      <PixelButton size="sm" variant="secondary" className="mt-8" onClick={() => navigate('/map')}>
        ← {t('common.back')}
      </PixelButton>
    </div>
  );
}
