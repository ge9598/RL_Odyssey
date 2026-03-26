const SAVE_VERSION = 1;

interface SaveData {
  version: number;
  timestamp: number;
  gameStore: unknown;
  cardStore: unknown;
}

export function exportSave(): string {
  const gameStore = localStorage.getItem('rl-odyssey-game');
  const cardStore = localStorage.getItem('rl-odyssey-cards');

  const save: SaveData = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    gameStore: gameStore ? JSON.parse(gameStore) : null,
    cardStore: cardStore ? JSON.parse(cardStore) : null,
  };

  return JSON.stringify(save, null, 2);
}

export function downloadSave(): void {
  const data = exportSave();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rl-odyssey-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSave(json: string): boolean {
  try {
    const save: SaveData = JSON.parse(json);
    if (save.version !== SAVE_VERSION) {
      console.warn('Save version mismatch:', save.version, '!=', SAVE_VERSION);
      return false;
    }
    if (save.gameStore) {
      localStorage.setItem('rl-odyssey-game', JSON.stringify(save.gameStore));
    }
    if (save.cardStore) {
      localStorage.setItem('rl-odyssey-cards', JSON.stringify(save.cardStore));
    }
    return true;
  } catch {
    console.error('Failed to import save');
    return false;
  }
}

export function clearSave(): void {
  localStorage.removeItem('rl-odyssey-game');
  localStorage.removeItem('rl-odyssey-cards');
}
