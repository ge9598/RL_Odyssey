import { useNavigate, useParams } from 'react-router-dom';
import { GreedyPirateBoss } from '@/components/boss/GreedyPirateBoss';
import { PixelButton, PixelPanel } from '@/components/ui';

export function BossPage() {
  const navigate = useNavigate();
  const { bossId } = useParams<{ bossId: string }>();

  if (bossId !== 'greedy-pirate') {
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

  return (
    <GreedyPirateBoss
      onComplete={() => navigate('/island/value')}
      onReturn={() => navigate('/island/value')}
    />
  );
}
