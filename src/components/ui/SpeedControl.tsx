import { PixelButton } from './PixelButton';

interface SpeedControlProps {
  speed: number;
  isRunning: boolean;
  onSpeedChange: (speed: number) => void;
  onToggle: () => void;
  onStep: () => void;
  onReset: () => void;
}

const SPEEDS = [1, 2, 5, 10] as const;

export function SpeedControl({
  speed,
  isRunning,
  onSpeedChange,
  onToggle,
  onStep,
  onReset,
}: SpeedControlProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <PixelButton size="sm" variant="secondary" onClick={onToggle}>
        {isRunning ? '⏸' : '▶'}
      </PixelButton>

      <PixelButton size="sm" variant="secondary" onClick={onStep} disabled={isRunning}>
        ⏭
      </PixelButton>

      <div className="flex gap-1">
        {SPEEDS.map((s) => (
          <PixelButton
            key={s}
            size="sm"
            variant={speed === s ? 'primary' : 'secondary'}
            onClick={() => onSpeedChange(s)}
          >
            {s}x
          </PixelButton>
        ))}
      </div>

      <PixelButton size="sm" variant="danger" onClick={onReset}>
        ↺
      </PixelButton>
    </div>
  );
}
