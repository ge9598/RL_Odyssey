// ---------------------------------------------------------------------------
// SoundManager — programmatic Web Audio API chip SFX + BGM
// All sounds are synthesized; no audio files needed.
// ---------------------------------------------------------------------------

type SfxType =
  | 'coin_collect'
  | 'chest_open'
  | 'quest_complete'
  | 'rank_reveal'
  | 'card_unlock'
  | 'button_click'
  | 'step_transition';

type BgmType = 'harbor' | 'value_island' | 'policy_island' | 'boss';

class SoundManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private currentBgm: BgmType | null = null;
  private _sfxEnabled = true;
  private _musicVolume = 0.25;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.getCtx();
    return this.masterGain!;
  }

  set sfxEnabled(v: boolean) { this._sfxEnabled = v; }
  get sfxEnabled() { return this._sfxEnabled; }
  set musicVolume(v: number) {
    this._musicVolume = v;
    if (this.bgmGain) this.bgmGain.gain.value = v;
  }
  get musicVolume() { return this._musicVolume; }

  // ---- SFX ----------------------------------------------------------------

  playSfx(type: SfxType): void {
    if (!this._sfxEnabled) return;
    try {
      switch (type) {
        case 'coin_collect': this._playCoinCollect(); break;
        case 'chest_open':   this._playChestOpen(); break;
        case 'quest_complete': this._playQuestComplete(); break;
        case 'rank_reveal':  this._playRankReveal(); break;
        case 'card_unlock':  this._playCardUnlock(); break;
        case 'button_click': this._playButtonClick(); break;
        case 'step_transition': this._playStepTransition(); break;
      }
    } catch (_) { /* AudioContext not available */ }
  }

  private _tone(freq: number, start: number, duration: number, type: OscillatorType = 'square', gainVal = 0.15): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.01);
  }

  private _playCoinCollect(): void {
    // Ascending arpeggio: C5 E5 G5
    this._tone(523, 0.00, 0.08, 'square', 0.12);
    this._tone(659, 0.08, 0.08, 'square', 0.12);
    this._tone(784, 0.16, 0.12, 'square', 0.12);
  }

  private _playChestOpen(): void {
    // Low thud + shimmer sweep
    this._tone(80, 0.00, 0.15, 'sine', 0.3);
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.65);
  }

  private _playQuestComplete(): void {
    // 5-note ascending fanfare
    const notes = [392, 440, 494, 523, 659];
    notes.forEach((freq, i) => this._tone(freq, i * 0.1, 0.15, 'square', 0.13));
  }

  private _playRankReveal(): void {
    // Drum roll (noise-like) + crash
    this.getCtx();
    for (let i = 0; i < 8; i++) {
      this._tone(50 + Math.random() * 30, i * 0.04, 0.06, 'sawtooth', 0.08);
    }
    this._tone(220, 0.32, 0.4, 'triangle', 0.18);
  }

  private _playCardUnlock(): void {
    // Magic sparkle: high frequency sweep
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
  }

  private _playButtonClick(): void {
    this._tone(440, 0, 0.05, 'square', 0.08);
  }

  private _playStepTransition(): void {
    // Whoosh: descending sweep
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  }

  // ---- BGM ----------------------------------------------------------------

  playBgm(type: BgmType): void {
    if (this.currentBgm === type) return;
    this.stopBgm();
    this.currentBgm = type;
    try {
      this._startBgm(type);
    } catch (_) { /* AudioContext not available */ }
  }

  stopBgm(): void {
    this.bgmOscillators.forEach((o) => { try { o.stop(); } catch (_) {} });
    this.bgmOscillators = [];
    if (this.bgmGain) {
      try { this.bgmGain.disconnect(); } catch (_) {}
      this.bgmGain = null;
    }
    this.currentBgm = null;
  }

  private _startBgm(type: BgmType): void {
    const ctx = this.getCtx();
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = this._musicVolume;
    this.bgmGain.connect(this.getMaster());

    switch (type) {
      case 'harbor':      this._bgmHarbor(ctx); break;
      case 'value_island': this._bgmValue(ctx); break;
      case 'policy_island': this._bgmPolicy(ctx); break;
      case 'boss':        this._bgmBoss(ctx); break;
    }
  }

  private _bgmLoop(ctx: AudioContext, notes: number[], bpm = 120, waveType: OscillatorType = 'square'): void {
    const beatLen = 60 / bpm;
    const totalLen = notes.length * beatLen;
    const startTime = ctx.currentTime;

    const schedule = (offset: number) => {
      notes.forEach((freq, i) => {
        if (freq === 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = waveType;
        osc.frequency.value = freq;
        const t = offset + i * beatLen;
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + beatLen * 0.85);
        osc.connect(gain);
        gain.connect(this.bgmGain!);
        osc.start(t);
        osc.stop(t + beatLen);
        this.bgmOscillators.push(osc);
      });
    };

    // Schedule 8 loops ahead
    for (let i = 0; i < 8; i++) {
      schedule(startTime + i * totalLen);
    }
  }

  private _bgmHarbor(_ctx: AudioContext): void {
    // Gentle ocean melody: C maj pentatonic
    this._bgmLoop(_ctx, [261, 294, 329, 392, 440, 392, 329, 261], 80, 'sine');
  }

  private _bgmValue(_ctx: AudioContext): void {
    // Upbeat tropical: D maj feel
    this._bgmLoop(_ctx, [293, 329, 370, 440, 493, 440, 370, 293], 140, 'square');
  }

  private _bgmPolicy(_ctx: AudioContext): void {
    // Intense volcanic: minor feel
    this._bgmLoop(_ctx, [220, 246, 261, 246, 220, 196, 174, 196], 160, 'sawtooth');
  }

  private _bgmBoss(_ctx: AudioContext): void {
    // Tense battle: chromatic tension
    this._bgmLoop(_ctx, [220, 233, 246, 233, 220, 207, 196, 207], 180, 'sawtooth');
  }
}

export const SoundManager = new SoundManagerClass();
export type { SfxType, BgmType };
