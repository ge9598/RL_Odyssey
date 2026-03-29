import { useNavigate, useParams } from 'react-router-dom';
import { GreedyPirateBoss } from '@/components/boss/GreedyPirateBoss';
import { ChaosVolcanoBoss } from '@/components/chaos/ChaosVolcanoBoss';
import { PixelButton, PixelPanel } from '@/components/ui';

export function BossPage() {
  const navigate = useNavigate();
  const { bossId } = useParams<{ bossId: string }>();

  if (bossId === 'greedy-pirate') {
    return (
      <GreedyPirateBoss
        onComplete={() => navigate('/island/value')}
        onReturn={() => navigate('/island/value')}
      />
    );
  }

  if (bossId === 'chaos-volcano') {
    return (
      <ChaosVolcanoBoss onComplete={() => navigate('/island/policy')} />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <PixelPanel>
        <p className="font-pixel text-sm text-[#708090]">Boss not found</p>
        <PixelButton size="sm" className="mt-4" onClick={() => navigate('/map')}>
          &larr; Back to map
        </PixelButton>
      </PixelPanel>
    </div>
  );
}
