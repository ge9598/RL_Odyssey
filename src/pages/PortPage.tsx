import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PixelButton, PixelPanel } from '@/components/ui';
import { getPortConfig } from '@/config/ports';
import PortFlowController from '@/components/port/PortFlowController';

export function PortPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { portId } = useParams<{ portId: string }>();
  const config = portId ? getPortConfig(portId) : undefined;

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PixelPanel>
          <p className="font-pixel text-sm">{t('port.notFound', 'Port not found')}</p>
          <PixelButton size="sm" className="mt-4" onClick={() => navigate('/map')}>
            ← {t('common.back')}
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-sm text-[#00d4ff] glow-accent animate-pulse">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    }>
      <PortFlowController portId={config.id} />
    </Suspense>
  );
}
