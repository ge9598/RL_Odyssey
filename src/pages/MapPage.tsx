import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton, PixelPanel } from '@/components/ui';

interface IslandNode {
  id: string;
  nameKey: string;
  emoji: string;
  difficulty: number;
  route: string;
  x: string;
  y: string;
  available: boolean;
  glowColor: string;
}

export function MapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unlockedPorts, portProgress } = useGameStore();

  // Value Archipelago is complete when all 6 ports + boss are done
  const VALUE_PORT_IDS = ['bandit', 'qtable', 'sarsa', 'deep', 'double-dqn', 'dueling-dqn'];
  const valueIslandComplete = VALUE_PORT_IDS.every((id) => portProgress[id]?.completed);
  const policyAvailable = valueIslandComplete || unlockedPorts.includes('reinforce');

  const islands: IslandNode[] = [
    {
      id: 'value',
      nameKey: 'map.valueArchipelago',
      emoji: '🏝️',
      difficulty: 1,
      route: '/island/value',
      x: '20%',
      y: '45%',
      available: unlockedPorts.length > 0,
      glowColor: 'rgba(64,224,208,0.4)',
    },
    {
      id: 'policy',
      nameKey: 'map.policyVolcanic',
      emoji: '🌋',
      difficulty: 2,
      route: '/island/policy',
      x: '50%',
      y: '30%',
      available: policyAvailable,
      glowColor: 'rgba(255,99,71,0.4)',
    },
    {
      id: 'continuous',
      nameKey: 'map.continuousGlacier',
      emoji: '❄️',
      difficulty: 3,
      route: '/island/continuous',
      x: '80%',
      y: '45%',
      available: false,
      glowColor: 'rgba(135,206,235,0.4)',
    },
    {
      id: 'convergence',
      nameKey: 'map.convergenceHarbor',
      emoji: '⚓',
      difficulty: 0,
      route: '/convergence',
      x: '50%',
      y: '10%',
      available: false,
      glowColor: 'rgba(255,165,0,0.4)',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <h2 className="font-pixel text-base text-[#00d4ff] mb-8 glow-accent">
        {t('map.title')}
      </h2>

      {/* Map area */}
      <div className="relative w-full max-w-4xl aspect-[16/10] rounded-sm overflow-hidden pixel-border"
        style={{
          background: 'linear-gradient(180deg, #080c22 0%, #0d1230 40%, #0f1838 100%)',
        }}
      >
        {/* Animated water waves */}
        <div className="absolute inset-0 opacity-15">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-wave"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 23) % 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${5 + (i % 3)}s`,
              }}
            >
              🌊
            </div>
          ))}
        </div>

        {/* Water gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(0,212,255,0.05) 0%, transparent 60%)',
          }}
        />

        {/* Starting Harbor */}
        <div
          className="absolute text-center cursor-pointer hover:scale-110 transition-all duration-200 group"
          style={{ left: '45%', bottom: '5%' }}
          onClick={() => navigate('/tutorial')}
        >
          <div className="text-3xl group-hover:animate-float">🚢</div>
          <span className="font-pixel text-[9px] text-[#ffd700] glow-gold">
            {t('map.startingHarbor')}
          </span>
        </div>

        {/* Islands */}
        {islands.map((island) => (
          <div
            key={island.id}
            className={`absolute text-center transition-all duration-300
              ${island.available
                ? 'cursor-pointer hover:scale-115 hover:brightness-125'
                : 'opacity-35 cursor-not-allowed grayscale-[30%]'}`}
            style={{ left: island.x, top: island.y, transform: 'translate(-50%, -50%)' }}
            onClick={() => island.available && navigate(island.route)}
          >
            {/* Island glow halo */}
            {island.available && (
              <div
                className="absolute inset-0 -m-4 rounded-full blur-xl pointer-events-none"
                style={{ background: island.glowColor, opacity: 0.3 }}
              />
            )}
            <div className="text-4xl mb-1 relative">{island.emoji}</div>
            <span className="font-pixel text-[9px] text-[#e2e8f0] whitespace-nowrap relative">
              {t(island.nameKey)}
            </span>
            {island.difficulty > 0 && (
              <div className="font-pixel text-[9px] text-[#ffd700] relative">
                {'⭐'.repeat(island.difficulty)}
              </div>
            )}
          </div>
        ))}

        {/* Route lines with gradient */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,212,255,0.2)" />
              <stop offset="100%" stopColor="rgba(0,212,255,0.05)" />
            </linearGradient>
          </defs>
          <line x1="47" y1="90" x2="22" y2="45" stroke="url(#routeGrad)" strokeWidth="0.4" strokeDasharray="1.5,2" />
          <line x1="47" y1="90" x2="50" y2="30" stroke="url(#routeGrad)" strokeWidth="0.4" strokeDasharray="1.5,2" />
          <line x1="47" y1="90" x2="78" y2="45" stroke="url(#routeGrad)" strokeWidth="0.4" strokeDasharray="1.5,2" />
          <line x1="22" y1="45" x2="50" y2="10" stroke="url(#routeGrad)" strokeWidth="0.25" strokeDasharray="1.5,2" />
          <line x1="50" y1="30" x2="50" y2="10" stroke="url(#routeGrad)" strokeWidth="0.25" strokeDasharray="1.5,2" />
          <line x1="78" y1="45" x2="50" y2="10" stroke="url(#routeGrad)" strokeWidth="0.25" strokeDasharray="1.5,2" />
        </svg>
      </div>

      {/* Island info panel */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
        <PixelPanel title={t('map.valueArchipelago')}>
          <p className="font-body text-lg">⭐ {t('map.difficulty.easy')}</p>
          <p className="font-body text-base text-[#40e0d0]">{t('value.theme')}</p>
          {unlockedPorts.length > 0 ? (
            <PixelButton size="sm" className="mt-3" onClick={() => navigate('/island/value')}>
              {t('common.start')} →
            </PixelButton>
          ) : (
            <p className="font-pixel text-[9px] text-[#708090] mt-3">{t('map.locked')}</p>
          )}
        </PixelPanel>

        <PixelPanel title={t('map.policyVolcanic')}>
          <p className="font-body text-lg">⭐⭐ {t('map.difficulty.medium')}</p>
          <p className="font-body text-base text-[#ff6347]">{t('policy.theme')}</p>
          {policyAvailable ? (
            <PixelButton size="sm" className="mt-3" onClick={() => navigate('/island/policy')}>
              {t('common.start')} →
            </PixelButton>
          ) : (
            <p className="font-pixel text-[9px] text-[#708090] mt-3">
              {t('map.policyLocked', 'Complete Value Archipelago first')}
            </p>
          )}
        </PixelPanel>

        <PixelPanel title={t('map.continuousGlacier')}>
          <p className="font-body text-lg">⭐⭐⭐ {t('map.difficulty.hard')}</p>
          <p className="font-body text-base text-[#87ceeb]">The World Isn't Black and White</p>
          <p className="font-pixel text-[9px] text-[#708090] mt-3">Phase 3</p>
        </PixelPanel>
      </div>
    </div>
  );
}
