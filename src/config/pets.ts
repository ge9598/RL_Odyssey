// Pet personality configuration — the three companions the player can choose in the tutorial.

export interface PetConfig {
  emoji: string;
  key: 'dog' | 'cat' | 'robot';
  nameKey: string;   // i18n key for display name
  traitKey: string;  // i18n key for personality trait
}

export const PETS: PetConfig[] = [
  { emoji: '\uD83D\uDC15', key: 'dog',   nameKey: 'tutorial.pets.dog',   traitKey: 'tutorial.pets.dogTrait' },
  { emoji: '\uD83D\uDC31', key: 'cat',   nameKey: 'tutorial.pets.cat',   traitKey: 'tutorial.pets.catTrait' },
  { emoji: '\uD83E\uDD16', key: 'robot', nameKey: 'tutorial.pets.robot', traitKey: 'tutorial.pets.robotTrait' },
];

export const DEFAULT_PET = PETS[0].emoji; // 🐕 fallback when no pet selected yet

export function getPetConfig(emoji: string): PetConfig {
  return PETS.find((p) => p.emoji === emoji) ?? PETS[0];
}
