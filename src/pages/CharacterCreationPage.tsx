import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/stores/gameStore';
import { PixelButton, PixelPanel } from '@/components/ui';
import { LanguageToggle } from '@/components/ui';

const AVATARS = [
  { emoji: '⚓', key: 'captain' },
  { emoji: '🏴‍☠️', key: 'pirate' },
  { emoji: '🧭', key: 'explorer' },
  { emoji: '🗺️', key: 'navigator' },
] as const;

const MAX_NAME_LENGTH = 16;

export function CharacterCreationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createCharacter = useGameStore((s) => s.createCharacter);

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [hoveredAvatar, setHoveredAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_NAME_LENGTH) {
      setName(val);
      if (error) setError(null);
    }
  };

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('characterCreation.nameRequired'));
      return;
    }
    if (!selectedAvatar) {
      setError(t('characterCreation.avatarRequired'));
      return;
    }
    createCharacter(trimmed, selectedAvatar);
    navigate('/tutorial');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 relative overflow-hidden">
      {/* Animated background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 30%, rgba(0,212,255,0.05) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(255,215,0,0.05) 0%, transparent 50%)',
        }}
      />

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      {/* Title */}
      <div className="text-center relative z-10">
        <h1 className="font-pixel text-xl text-[#00d4ff] glow-accent mb-2">
          RL Odyssey
        </h1>
        <p className="font-pixel text-sm text-[#ffd700] glow-gold">
          {t('characterCreation.title')}
        </p>
      </div>

      {/* Main panel */}
      <PixelPanel className="max-w-lg w-full relative z-10">
        <div className="flex flex-col gap-7 p-2">
          {/* Name input */}
          <div>
            <label className="font-pixel text-xs text-[#708090] block mb-2">
              {t('characterCreation.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder={t('characterCreation.namePlaceholder')}
              maxLength={MAX_NAME_LENGTH}
              className="
                w-full px-4 py-2.5 rounded-sm
                bg-[rgba(10,14,39,0.8)] border border-[rgba(0,212,255,0.3)]
                font-body text-xl text-[#e2e8f0] placeholder-[#708090]
                focus:outline-none focus:border-[rgba(0,212,255,0.7)] focus:shadow-[0_0_12px_rgba(0,212,255,0.2)]
                transition-all
              "
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              autoFocus
            />
            <div className="flex justify-between mt-1">
              <span className="font-pixel text-[9px] text-[#708090]">
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
          </div>

          {/* Avatar selection */}
          <div>
            <p className="font-pixel text-xs text-[#708090] mb-3">
              {t('characterCreation.chooseAvatar')}
            </p>
            <div className="flex gap-4 justify-center">
              {AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.emoji;
                const isHovered = hoveredAvatar === av.key;
                return (
                  <button
                    key={av.key}
                    onClick={() => setSelectedAvatar(av.emoji)}
                    onMouseEnter={() => setHoveredAvatar(av.key)}
                    onMouseLeave={() => setHoveredAvatar(null)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-sm cursor-pointer
                      pixel-border bg-[rgba(20,24,50,0.6)]
                      transition-all duration-200
                      ${isSelected ? 'border-[rgba(255,215,0,0.8)] shadow-[0_0_20px_rgba(255,215,0,0.3)] scale-110' : ''}
                      ${isHovered && !isSelected ? 'border-[rgba(0,212,255,0.5)] scale-105' : ''}
                    `}
                  >
                    <span className={`text-4xl transition-transform duration-200 ${isSelected ? 'animate-bounce' : ''}`}>
                      {av.emoji}
                    </span>
                    <span className={`font-pixel text-[9px] ${isSelected ? 'text-[#ffd700] glow-gold' : 'text-[#708090]'}`}>
                      {t(`characterCreation.avatars.${av.key}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="font-pixel text-[10px] text-[#f87171] text-center">
              {error}
            </p>
          )}

          {/* Confirm button */}
          <div className="flex justify-center pt-1">
            <PixelButton
              size="lg"
              variant={name.trim() && selectedAvatar ? 'primary' : 'secondary'}
              onClick={handleConfirm}
            >
              {t('characterCreation.confirm')} ⚓
            </PixelButton>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
