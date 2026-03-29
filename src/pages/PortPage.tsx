import { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PixelButton, PixelPanel } from '@/components/ui';
import { getPortConfig } from '@/config/ports';
import PortFlowController from '@/components/port/PortFlowController';

export function PortPage() {
  const navigate = useNavigate();
  const { portId } = useParams<{ portId: string }>();
  const config = portId ? getPortConfig(portId) : undefined;

  if (!config) {
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-sm text-[#00d4ff] glow-accent animate-pulse">Loading...</p>
      </div>
    }>
      <PortFlowController portId={config.id} />
    </Suspense>
  );
}
