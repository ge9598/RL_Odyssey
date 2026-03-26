import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton, PixelPanel } from '@/components/ui';

export function TutorialPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completeTutorial } = useGameStore();

  const handleComplete = () => {
    completeTutorial();
    navigate('/map');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h2 className="font-pixel text-lg text-[#00d4ff] glow-accent">
        {t('tutorial.title')}
      </h2>
      <p className="font-body text-2xl text-[#ffd700] glow-gold">
        {t('tutorial.welcome')}
      </p>

      <PixelPanel className="max-w-2xl w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="font-body text-xl text-[#e2e8f0] mb-6">
            {t('tutorial.choosePet')}
          </p>
          <div className="flex gap-8 justify-center text-5xl mb-8">
            {['🐕', '🐱', '🤖'].map((pet) => (
              <button
                key={pet}
                className="hover:scale-110 transition-all duration-200 cursor-pointer p-5 rounded-sm
                  pixel-border bg-[rgba(20,24,50,0.5)]
                  hover:shadow-[0_0_20px_rgba(0,212,255,0.25)] hover:border-[rgba(0,212,255,0.6)]"
              >
                {pet}
              </button>
            ))}
          </div>
          <p className="font-pixel text-[10px] text-[#708090] mb-2">
            [ Tutorial interactive canvas will be here ]
          </p>
        </div>
      </PixelPanel>

      <PixelButton size="lg" onClick={handleComplete}>
        {t('tutorial.step4.title')} →
      </PixelButton>
    </div>
  );
}
