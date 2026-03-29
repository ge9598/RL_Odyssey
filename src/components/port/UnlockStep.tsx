import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { getPortConfig } from '@/config/ports';
import type { PortStepProps } from '@/config/ports';
import { PortStepShell } from '@/components/port/PortStepShell';
import { useGameStore } from '@/stores/gameStore';
import type { PortId } from '@/types/algorithm';

// ---------------------------------------------------------------------------
// UnlockStep — Generic unlock / sailing animation step
//
// Reads `meta.nextPortId` and `meta.nextPortNameKey` from the port step config.
// Triggers gameStore.unlockPort() for the next port (if any).
// Shows a CSS-based sailing animation and a "Set Sail!" action.
// ---------------------------------------------------------------------------

function UnlockStep({ portId, onComplete }: PortStepProps) {
  const { t } = useTranslation();

  const portConfig = getPortConfig(portId);
  const unlockStepConfig = portConfig?.steps.find((s) => s.type === 'unlock');
  const meta = unlockStepConfig?.meta ?? {};

  const nextPortId = (meta.nextPortId as string) ?? portConfig?.unlocks ?? null;
  const nextPortNameKey = (meta.nextPortNameKey as string) ?? '';

  const unlockPort = useGameStore((s) => s.unlockPort);

  // Unlock the next port once on mount
  const unlocked = useRef(false);
  useEffect(() => {
    if (nextPortId && !unlocked.current) {
      unlocked.current = true;
      unlockPort(nextPortId as PortId);
    }
  }, [nextPortId, unlockPort]);

  const hasNext = Boolean(nextPortId);

  return (
    <PortStepShell
      title={t('port.steps.unlock', 'Set Sail!')}
      durationHint={unlockStepConfig?.durationHint}
      onNext={onComplete}
      nextLabel={
        hasNext
          ? t('port.unlock.sailNext', 'Sail to Next Port')
          : t('port.unlock.returnToIsland', 'Return to Island')
      }
    >
      <div className="flex flex-col items-center text-center py-8 gap-6">
        {/* Sailing animation (CSS-only pixel ship) */}
        <div className="relative w-64 h-32 overflow-hidden">
          {/* Waves */}
          <div className="absolute bottom-0 left-0 right-0 h-8">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(90deg, transparent, transparent 16px, rgba(0,212,255,0.15) 16px, rgba(0,212,255,0.15) 32px)',
                animation: 'sailingWave 3s linear infinite',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,212,255,0.1) 24px, rgba(0,212,255,0.1) 48px)',
                animation: 'sailingWave 4s linear infinite reverse',
                top: '4px',
              }}
            />
          </div>

          {/* Ship emoji */}
          <div
            className="absolute text-5xl select-none"
            style={{
              bottom: '16px',
              animation: 'sailingShip 3s ease-in-out infinite',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            {'\u26F5'}
          </div>
        </div>

        {/* Unlock message */}
        {hasNext ? (
          <>
            <p className="font-pixel text-xs text-[#4ade80] uppercase tracking-wider">
              {t('port.unlock.newPort', 'New Port Unlocked!')}
            </p>
            <div
              className="pixel-border-gold glass-panel rounded-sm px-6 py-4 glow-box-gold"
              style={{ animation: 'portStepFadeIn 0.6s ease-out 0.5s both' }}
            >
              <p className="font-pixel text-sm text-[#ffd700] glow-gold">
                {nextPortNameKey ? t(nextPortNameKey) : nextPortId}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="font-pixel text-xs text-[#ffd700] uppercase tracking-wider glow-gold">
              {t('port.unlock.islandComplete', 'All ports on this island complete!')}
            </p>
            <p className="font-body text-lg text-[#e2e8f0]">
              {t('port.unlock.bossAwaits', 'A greater challenge awaits...')}
            </p>
          </>
        )}
      </div>

      {/* Inline keyframes for sailing animation */}
      <style>{`
        @keyframes sailingWave {
          from { transform: translateX(0); }
          to { transform: translateX(-32px); }
        }
        @keyframes sailingShip {
          0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); }
          25% { transform: translateX(-50%) translateY(-4px) rotate(-2deg); }
          75% { transform: translateX(-50%) translateY(-2px) rotate(2deg); }
        }
        @keyframes portStepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PortStepShell>
  );
}

export default UnlockStep;
