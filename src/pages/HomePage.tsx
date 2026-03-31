import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton } from '@/components/ui';
import { LanguageToggle } from '@/components/ui';

const CRAWL_DURATION_MS = 5000;

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tutorialCompleted, playerName } = useGameStore();

  // Show crawl only on first visit (tutorial not yet completed)
  const showCrawlInitially = !tutorialCompleted;
  const [showCrawl, setShowCrawl] = useState(showCrawlInitially);

  useEffect(() => {
    if (!showCrawl) return;
    const timer = setTimeout(() => setShowCrawl(false), CRAWL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showCrawl]);

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

      {/* Opening crawl (Star Wars style) */}
      {showCrawl && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-end overflow-hidden cursor-pointer"
          style={{ background: 'rgba(5,8,25,0.97)', perspective: '300px' }}
          onClick={() => setShowCrawl(false)}
        >
          <div
            className="max-w-lg text-center px-6 pb-8"
            style={{
              animation: `crawlUp ${CRAWL_DURATION_MS}ms linear forwards`,
              transformOrigin: '50% 100%',
            }}
          >
            <p className="font-pixel text-[10px] text-[#ffd700] glow-gold uppercase tracking-[0.25em] mb-8">
              {t('home.crawl.prelude', 'A long time ago, in a sea far, far away...')}
            </p>
            <h2 className="font-pixel text-xl text-[#00d4ff] glow-accent mb-6 leading-relaxed">
              RL ODYSSEY
            </h2>
            <p className="font-body text-xl text-[#e2e8f0] leading-loose mb-4">
              {t('home.crawl.line1', 'In the Sea of Intelligence, the ultimate secret awaits discovery: the Optimal Strategy.')}
            </p>
            <p className="font-body text-xl text-[#e2e8f0] leading-loose mb-4">
              {t('home.crawl.line2', 'Many sailors set forth to find it. None returned.')}
            </p>
            <p className="font-body text-xl text-[#f87171] leading-loose mb-4">
              {t('home.crawl.line3', 'A dark force — the Chaos Engine — is corrupting the algorithms of this sea.')}
            </p>
            <p className="font-body text-xl text-[#4ade80] leading-loose">
              {t('home.crawl.line4', 'Only a new captain, sailing with a learning companion, can restore order...')}
            </p>
          </div>
          <p className="absolute bottom-4 font-pixel text-[9px] text-[#708090] animate-pulse z-40">
            {t('home.crawl.skip', 'Click to skip')}
          </p>
          <style>{`
            @keyframes crawlUp {
              from { transform: translateY(100%) rotateX(20deg); opacity: 0.8; }
              to   { transform: translateY(-120%) rotateX(20deg); opacity: 1; }
            }
          `}</style>
        </div>
      )}

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
