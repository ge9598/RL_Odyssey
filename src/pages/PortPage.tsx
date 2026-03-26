import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PixelButton, PixelPanel } from '@/components/ui';

export function PortPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { portId } = useParams<{ portId: string }>();

  const portConfig: Record<string, { nameKey: string; metaphorKey: string; emoji: string }> = {
    bandit: { nameKey: 'value.bandit.name', metaphorKey: 'value.bandit.metaphor', emoji: '🎰' },
    qtable: { nameKey: 'value.qtable.name', metaphorKey: 'value.qtable.metaphor', emoji: '🗺️' },
    deep: { nameKey: 'value.deep.name', metaphorKey: 'value.deep.metaphor', emoji: '🧠' },
  };

  const port = portId ? portConfig[portId] : null;

  if (!port) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PixelPanel>
          <p className="font-pixel text-sm">Port not found</p>
          <PixelButton size="sm" className="mt-4" onClick={() => navigate('/map')}>
            ← Back to map
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <div className="text-5xl mb-4 animate-float">{port.emoji}</div>
      <h2 className="font-pixel text-base text-[#00d4ff] mb-2 glow-accent">{t(port.nameKey)}</h2>
      <p className="font-body text-xl text-[#ffd700] mb-8 max-w-lg text-center glow-gold">
        {t(port.metaphorKey)}
      </p>

      {/* Port content area */}
      <PixelPanel className="max-w-4xl w-full min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <p className="font-pixel text-xs text-[#708090] mb-4">
            [ Algorithm environment will render here ]
          </p>
          <p className="font-body text-lg text-[#e2e8f0]">
            Port flow: Story → Primer → Feel → Meet → Watch → Quest → Summary → Unlock
          </p>
        </div>
      </PixelPanel>

      <div className="flex gap-4 mt-8">
        <PixelButton size="sm" variant="secondary" onClick={() => navigate('/island/value')}>
          ← {t('common.back')}
        </PixelButton>
      </div>
    </div>
  );
}
