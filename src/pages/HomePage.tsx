import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton } from '@/components/ui';
import { LanguageToggle } from '@/components/ui';

// ---------------------------------------------------------------------------
// Scrolling prologue — Star Wars style but much shorter
// ---------------------------------------------------------------------------

function ScrollingPrologue({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'scroll' | 'fade'>('scroll');

  useEffect(() => {
    // After scroll animation (~6s), fade out
    const t1 = setTimeout(() => setPhase('fade'), 5800);
    const t2 = setTimeout(onDone, 7200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const lines = [
    t('home.prologue.line1', 'In the Sea of Intelligence, a great mystery awaits: the Optimal Strategy.'),
    t('home.prologue.line2', 'Many captains sailed in search of it. None returned.'),
    t('home.prologue.line3', 'A dark force — the Chaos Engine — corrupts these waters.'),
    t('home.prologue.line4', 'One new captain, and their learning companion, must set it right.'),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: '#0a0e27' }}
      onClick={onDone}
    >
      {/* Stars background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              opacity: 0.3 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      {/* Scrolling text */}
      <div
        className="relative max-w-lg text-center perspective-800"
        style={{
          opacity: phase === 'fade' ? 0 : 1,
          transition: phase === 'fade' ? 'opacity 1.4s ease-out' : 'none',
        }}
      >
        {lines.map((line, i) => (
          <p
            key={i}
            className="font-body text-xl text-[#c8d0e0] mb-6 leading-relaxed"
            style={{
              animation: `prologueScroll 5s ease-out ${i * 0.3}s both`,
              color: i === 2 ? '#f87171' : i === 3 ? '#ffd700' : '#c8d0e0',
            }}
          >
            {line}
          </p>
        ))}
        <p className="font-pixel text-[10px] text-[#708090] mt-8">
          {t('home.prologue.skip', 'Click anywhere to skip')}
        </p>
      </div>

      <style>{`
        @keyframes prologueScroll {
          0%   { opacity: 0; transform: translateY(30px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tutorialCompleted, playerName } = useGameStore();

  // Show prologue only on first visit (no player name yet) and only once per session
  const [showPrologue, setShowPrologue] = useState(
    () => !playerName && !sessionStorage.getItem('rl-prologue-seen'),
  );

  const dismissPrologue = () => {
    sessionStorage.setItem('rl-prologue-seen', '1');
    setShowPrologue(false);
  };

  return (
    <>
      {showPrologue && <ScrollingPrologue onDone={dismissPrologue} />}

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
          {/* Villain teaser */}
          <p className="font-body text-base text-[#f87171] mt-2 opacity-75">
            {t('home.villain.teaser', '⚠️ The Chaos Engine corrupts these waters...')}
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
    </>
  );
}
