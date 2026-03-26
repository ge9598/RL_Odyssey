interface PixelSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayValue?: string;
}

export function PixelSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}: PixelSliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="font-pixel text-[11px] text-[#e2e8f0]">{label}</label>
        <span className="font-pixel text-[11px] text-[#00d4ff] glow-accent">
          {displayValue ?? value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2.5 rounded-sm appearance-none cursor-pointer
          bg-gradient-to-r from-[#1e2448] via-[#1e2448] to-[#1e2448]
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-sm
          [&::-webkit-slider-thumb]:bg-gradient-to-b
          [&::-webkit-slider-thumb]:from-[#00e4ff]
          [&::-webkit-slider-thumb]:to-[#00b4d8]
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,212,255,0.4)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:border-none
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-sm
          [&::-moz-range-thumb]:bg-gradient-to-b
          [&::-moz-range-thumb]:from-[#00e4ff]
          [&::-moz-range-thumb]:to-[#00b4d8]
          [&::-moz-range-thumb]:shadow-[0_0_8px_rgba(0,212,255,0.4)]
          [&::-moz-range-thumb]:border-none
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-track]:bg-[#1e2448]
          [&::-moz-range-track]:rounded-sm
          [&::-moz-range-track]:h-2.5"
      />
    </div>
  );
}
