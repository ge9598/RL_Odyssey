export interface PetConfig {
  emoji: string;
  key: string;
  nameKey: string;
}

export const PETS: PetConfig[] = [
  { emoji: '🐕', key: 'dog',   nameKey: 'tutorial.pets.dog' },
  { emoji: '🐱', key: 'cat',   nameKey: 'tutorial.pets.cat' },
  { emoji: '🤖', key: 'robot', nameKey: 'tutorial.pets.robot' },
];

export const DEFAULT_PET = '🐕';
