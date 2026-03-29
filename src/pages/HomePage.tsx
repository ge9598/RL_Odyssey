import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton } from '@/components/ui';
import { LanguageToggle } from '@/components/ui';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tutorialCompleted, playerName } = useGameStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-8 relative overflow-hidden">
      {/* Animated background */}
      <div
        className="absolute inset-0 animated-bg opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(123,104,238,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.03) 0%, transparent 40%)',
        }}
      />

      {/* Title */}
      <div className="text-center relative z-10">
        <h1 className="font-pixel text-3xl text-shimmer mb-5 leading-relaxed">
          RL Odyssey
        </h1>
        <p className="font-pixel text-sm text-[#ffd700] mb-3 glow-gold">
          ⚓ {t('map.title')} ⚓
        </p>
        <p className="font-body text-2xl text-[#c8d0e0] max-w-lg leading-relaxed">
          {t('common.subtitle')}
        </p>
      </div>

      {/* Ship container with glow */}
      <div className="relative z-10 animate-float">
        <div className="w-36 h-36 rounded-sm flex items-center justify-center text-7xl
          pixel-border glow-box-accent bg-[rgba(20,24,50,0.6)] backdrop-blur-sm">
          🚢
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-4 items-center relative z-10">
        {tutorialCompleted ? (
          <PixelButton size="lg" onClick={() => navigate('/map')}>
            {t('common.continue')}
          </PixelButton>
        ) : (
          <PixelButton size="lg" onClick={() => navigate(playerName ? '/tutorial' : '/create-character')}>
            {t('common.start')}
          </PixelButton>
        )}
      </div>

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      {/* Footer gradient */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0e27] via-[rgba(10,14,39,0.6)] to-transparent pointer-events-none" />
    </div>
  );
}
