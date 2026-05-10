// src/engine/AudioManager.js – Web Audio API sound effects
export class AudioManager {
  constructor() {
    this._ctx    = null;
    this._sounds = {};
    this._ready  = false;

    // Lazily init on first user gesture
    const activate = () => {
      if (this._ready) return;
      this._ctx   = new (window.AudioContext || window.webkitAudioContext)();
      this._ready = true;
      this._loadAll();
    };
    document.addEventListener('click',   activate, { once: true });
    document.addEventListener('keydown', activate, { once: true });
  }

  _loadAll() {
    // Synthesize short sounds procedurally (no external files needed)
    this._sounds = {
      break:    () => this._noise(0.08, 400, 80,  0.12),
      place:    () => this._click(0.06, 600, 0.08),
      step_grass:  () => this._rustle(0.04, 250, 0.12),
      step_stone:  () => this._click(0.04, 900, 0.07),
      step_wood:   () => this._click(0.05, 700, 0.09),
      step_sand:   () => this._rustle(0.03, 180, 0.10),
      splash:   () => this._splash(),
      pickup:   () => this._blip(0.05, 1800, 0.07),
      eat:      () => this._eat(),
      hurt:     () => this._hurt(),
    };
  }

  play(name) {
    if (!this._ready || !this._sounds[name]) return;
    try { this._sounds[name](); } catch(e) {}
  }

  // ---- Synth helpers ----
  _noise(vol, freq, freqEnd, dur) {
    const ctx = this._ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(freq, ctx.currentTime);
    flt.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + dur);
    src.connect(flt); flt.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + dur);
  }

  _click(vol, freq, dur) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  }

  _rustle(vol, freq, dur) {
    this._noise(vol, freq, freq * 0.6, dur);
  }

  _splash() {
    this._noise(0.1, 800, 200, 0.25);
    setTimeout(() => this._noise(0.05, 400, 100, 0.15), 60);
  }

  _blip(vol, freq, dur) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  }

  _eat() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this._noise(0.07, 300, 150, 0.1), i * 80);
    }
  }

  _hurt() {
    this._click(0.15, 200, 80, 0.2);
  }

  /** Call every frame with whether player is walking */
  updateFootsteps(isWalking, isSprinting, blockUnder) {
    if (!isWalking) { this._stepTimer = 0; return; }
    this._stepTimer = (this._stepTimer ?? 0) + 1;
    const interval = isSprinting ? 18 : 28;
    if (this._stepTimer >= interval) {
      this._stepTimer = 0;
      const snd = {
        1: 'step_grass', 2: 'step_grass', 3: 'step_stone',
        4: 'step_sand', 7: 'step_sand', 8: 'step_wood', 10: 'step_wood',
        12: 'step_stone', 11: 'step_stone',
      }[blockUnder] ?? 'step_stone';
      this.play(snd);
    }
  }
}
