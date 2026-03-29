import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PetSelectorProps {
  onSelect: (emoji: string) => void;
}

const PETS = [
  { emoji: '\uD83D\uDC15', key: 'dog' },
  { emoji: '\uD83D\uDC31', key: 'cat' },
  { emoji: '\uD83E\uDD16', key: 'robot' },
] as const;

export function PetSelector({ onSelect }: PetSelectorProps) {
  const { t } = useTranslation();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    // Brief delay for selection animation, then advance
    setTimeout(() => {
      onSelect(PETS[idx].emoji);
    }, 400);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2
        className="font-pixel text-lg text-[#00d4ff] glow-accent"
        id="pet-selector-heading"
      >
        {t('tutorial.choosePet')}
      </h2>

      <p className="font-body text-xl text-[#e2e8f0] text-center max-w-md">
        {t('tutorial.welcome')}
      </p>

      <div
        className="flex gap-6 justify-center"
        role="radiogroup"
        aria-labelledby="pet-selector-heading"
      >
        {PETS.map((pet, idx) => {
          const isHovered = hoveredIdx === idx;
          const isSelected = selectedIdx === idx;

          return (
            <button
              key={pet.key}
              onClick={() => handleSelect(idx)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              role="radio"
              aria-checked={isSelected}
              aria-label={t(`tutorial.pets.${pet.key}`)}
              className={`
                relative flex flex-col items-center gap-3 p-6 rounded-sm
                transition-all duration-300 cursor-pointer
                pixel-border bg-[rgba(20,24,50,0.6)]
                ${isHovered ? 'shadow-[0_0_24px_rgba(0,212,255,0.3)] border-[rgba(0,212,255,0.7)] scale-110' : ''}
                ${isSelected ? 'shadow-[0_0_30px_rgba(255,215,0,0.4)] border-[rgba(255,215,0,0.8)] scale-115 bg-[rgba(30,36,72,0.8)]' : ''}
                ${!isHovered && !isSelected ? 'hover:shadow-[0_0_16px_rgba(0,212,255,0.2)] hover:border-[rgba(0,212,255,0.5)] hover:scale-105' : ''}
              `}
            >
              {/* Pet emoji */}
              <span
                className={`text-6xl transition-transform duration-300 ${
                  isSelected ? 'animate-bounce' : ''
                }`}
                style={{ filter: isSelected ? 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' : undefined }}
              >
                {pet.emoji}
              </span>

              {/* Pet name */}
              <span
                className={`font-pixel text-xs transition-colors duration-200 ${
                  isSelected
                    ? 'text-[#ffd700] glow-gold'
                    : isHovered
                      ? 'text-[#00d4ff]'
                      : 'text-[#708090]'
                }`}
              >
                {t(`tutorial.pets.${pet.key}`)}
              </span>

              {/* Selection sparkle */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 text-xl animate-float">
                  \u2728
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint text */}
      <p className="font-pixel text-[10px] text-[#708090] mt-2">
        {/* i18n key: tutorial.petHint */}
        {t('tutorial.petHint', { defaultValue: 'Click to choose your companion!' })}
      </p>
    </div>
  );
}
