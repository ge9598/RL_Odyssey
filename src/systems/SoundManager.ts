// ---------------------------------------------------------------------------
// SoundManager — Web Audio API procedural chiptune sounds
// No audio files needed. All sounds are synthesized in the browser.
// ---------------------------------------------------------------------------

type SfxId =
  | 'coin_collect'
  | 'chest_open'
  | 'quest_complete'
  | 'rank_reveal'
  | 'card_unlock'
  | 'button_click'
  | 'step_transition';

type BgmId = 'harbor' | 'value_island' | 'policy_island' | 'boss';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmNodes: AudioNode[] = [];
  private bgmTimeout: ReturnType<typeof setTimeout> | null = null;
  private _soundEnabled = true;
  private _musicVolume = 0.3;
  private currentBgm: BgmId | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._musicVolume;
      this.bgmGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  get soundEnabled() { return this._soundEnabled; }
  get musicVolume() { return this._musicVolume; }

  setSoundEnabled(enabled: boolean) {
    this._soundEnabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  setMusicVolume(vol: number) {
    this._musicVolume = vol;
    if (this.bgmGain) {
      this.bgmGain.gain.value = vol;
    }
  }

  // ---- SFX helpers ----------------------------------------------------------

  private tone(
    freq: number,
    startTime: number,
    duration: number,
    gainVal: number,
    type: OscillatorType = 'square',
    ctx = this.getCtx(),
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private sweep(
    freqStart: number,
    freqEnd: number,
    startTime: number,
    duration: number,
    gainVal: number,
    type: OscillatorType = 'sine',
  ) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // ---- SFX presets ----------------------------------------------------------

  playSfx(id: SfxId) {
    if (!this._soundEnabled) return;
    // Respect prefers-reduced-motion for audio too
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = this.getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    switch (id) {
      case 'coin_collect':
        // Ascending three-note arpeggio
        this.tone(523, t, 0.08, 0.15);       // C5
        this.tone(659, t + 0.08, 0.08, 0.15); // E5
        this.tone(784, t + 0.16, 0.12, 0.2);  // G5
        break;

      case 'chest_open':
        // Thud + sparkle sweep
        this.tone(80, t, 0.15, 0.3, 'sine');
        this.sweep(400, 1200, t + 0.1, 0.3, 0.1, 'sine');
        break;

      case 'quest_complete':
        // Five-note ascending victory fanfare
        [523, 587, 659, 698, 784].forEach((f, i) => {
          this.tone(f, t + i * 0.1, 0.15, 0.18, 'square');
        });
        this.tone(1047, t + 0.55, 0.4, 0.2, 'square');
        break;

      case 'rank_reveal':
        // Drum roll — rapid clicks then cymbal crash
        for (let i = 0; i < 8; i++) {
          this.tone(100 + i * 20, t + i * 0.05, 0.04, 0.1, 'sawtooth');
        }
        this.sweep(800, 200, t + 0.45, 0.3, 0.15, 'sawtooth');
        break;

      case 'card_unlock':
        // Magic glitter — high-freq ascending sweep
        this.sweep(1000, 4000, t, 0.3, 0.08, 'sine');
        this.tone(1047, t + 0.1, 0.2, 0.12, 'sine');
        this.tone(1319, t + 0.25, 0.2, 0.1, 'sine');
        break;

      case 'button_click':
        // Soft click
        this.tone(440, t, 0.04, 0.08, 'square');
        break;

      case 'step_transition':
        // Whoosh
        this.sweep(200, 600, t, 0.15, 0.08, 'sine');
        break;
    }
  }

  // ---- BGM ------------------------------------------------------------------

  playBgm(id: BgmId) {
    if (id === this.currentBgm) return;
    this.stopBgm();
    this.currentBgm = id;
    if (!this._soundEnabled) return;

    const ctx = this.getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    switch (id) {
      case 'harbor':
        this.loopHarbor();
        break;
      case 'value_island':
        this.loopValueIsland();
        break;
      case 'policy_island':
        this.loopPolicyIsland();
        break;
      case 'boss':
        this.loopBoss();
        break;
    }
  }

  stopBgm() {
    if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
    this.bgmTimeout = null;
    this.bgmNodes.forEach((n) => {
      try { (n as OscillatorNode).stop(); } catch { /* already stopped */ }
    });
    this.bgmNodes = [];
    this.currentBgm = null;
  }

  // Simple looping BGM using scheduled oscillators
  private scheduleBgmNote(freq: number, start: number, dur: number, gain = 0.06) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.02);
    g.gain.setValueAtTime(gain, start + dur - 0.02);
    g.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(g);
    g.connect(this.bgmGain!);
    osc.start(start);
    osc.stop(start + dur);
    this.bgmNodes.push(osc);
  }

  private loopHarbor() {
    if (this.currentBgm !== 'harbor') return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const tempo = 0.4; // s per beat
    // Simple calm harbor melody
    const notes = [261, 294, 329, 349, 329, 261, 294, 261];
    notes.forEach((f, i) => this.scheduleBgmNote(f, t + i * tempo, tempo * 0.8));
    this.bgmTimeout = setTimeout(() => this.loopHarbor(), notes.length * tempo * 1000);
  }

  private loopValueIsland() {
    if (this.currentBgm !== 'value_island') return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const tempo = 0.25;
    const notes = [523, 587, 659, 784, 659, 587, 523, 523, 698, 784, 880, 784];
    notes.forEach((f, i) => this.scheduleBgmNote(f, t + i * tempo, tempo * 0.85, 0.05));
    this.bgmTimeout = setTimeout(() => this.loopValueIsland(), notes.length * tempo * 1000);
  }

  private loopPolicyIsland() {
    if (this.currentBgm !== 'policy_island') return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const tempo = 0.2;
    const notes = [220, 277, 330, 220, 277, 370, 330, 220, 247, 294, 370, 294];
    notes.forEach((f, i) => this.scheduleBgmNote(f, t + i * tempo, tempo * 0.7, 0.07));
    this.bgmTimeout = setTimeout(() => this.loopPolicyIsland(), notes.length * tempo * 1000);
  }

  private loopBoss() {
    if (this.currentBgm !== 'boss') return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const tempo = 0.15;
    const notes = [110, 110, 155, 165, 110, 110, 147, 165, 196, 165, 147, 110];
    notes.forEach((f, i) => this.scheduleBgmNote(f, t + i * tempo, tempo * 0.6, 0.08));
    this.bgmTimeout = setTimeout(() => this.loopBoss(), notes.length * tempo * 1000);
  }
}

// Singleton
export const soundManager = new SoundManager();
export type { SfxId, BgmId };
