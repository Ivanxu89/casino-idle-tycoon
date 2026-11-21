'use strict';
/* Sonido sintetizado con WebAudio: efectos y música. Dueño: Iván. */
/* ----------------------------- SONIDO ------------------------------ */
const Snd = {
  ctx: null, master: null, music: null, sfx: null, lastCoin: 0, musicTimer: null, step: 0, nextT: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.connect(this.master);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.apply();
    this.startMusic();
  },
  apply() {
    if (!this.ctx) return;
    this.master.gain.value = S.sound.muted ? 0 : 1;
    this.music.gain.value = this.ducked ? 0 : S.sound.music * 0.35;
    this.sfx.gain.value = S.sound.sfx * 0.6;
  },
  // silencia la música del casino mientras suena otra (p. ej. dentro de una slot)
  ducked: false,
  duck(on) { this.ducked = on; this.apply(); },
  tone(f, t0, dur, type = 'sine', vol = 0.3, dest = this.sfx, slide = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(t0, dur, vol, dest = this.sfx, hp = 6000) {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = b; s.connect(f); f.connect(g); g.connect(dest); s.start(t0);
  },
  play(name) {
    if (!this.ctx || S.sound.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'click': this.tone(660, t, 0.06, 'triangle', 0.25); break;
      case 'coin':
        if (performance.now() - this.lastCoin < 140) return;
        this.lastCoin = performance.now();
        this.tone(1318, t, 0.08, 'square', 0.06); this.tone(1976, t + 0.07, 0.18, 'square', 0.06); break;
      case 'spin': for (let i = 0; i < 7; i++) this.noise(t + i * 0.08, 0.03, 0.12, this.sfx, 3000); break;
      case 'win': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, t + i * 0.07, 0.16, 'triangle', 0.18)); break;
      case 'buy': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.06, 0.25, 'triangle', 0.22)); break;
      case 'upgrade': this.tone(392, t, 0.35, 'sawtooth', 0.08, this.sfx, 2.2); this.tone(1046, t + 0.3, 0.3, 'triangle', 0.2); break;
      case 'level': [659, 784, 988, 1318, 1568].forEach((f, i) => this.tone(f, t + i * 0.08, 0.3, 'triangle', 0.2)); break;
      case 'error': this.tone(180, t, 0.18, 'square', 0.1); this.tone(140, t + 0.12, 0.2, 'square', 0.1); break;
      case 'dice': for (let i = 0; i < 4; i++) this.noise(t + i * 0.09 + Math.random() * 0.03, 0.04, 0.25, this.sfx, 1200); break;
      case 'card': this.noise(t, 0.07, 0.2, this.sfx, 2500); break;
    }
  },
  // Música lounge generativa: Am9 – D9 – Gmaj7 – Cmaj7
  startMusic() {
    const chords = [[57, 60, 64, 67, 71], [50, 54, 57, 60, 64], [55, 59, 62, 66], [48, 52, 55, 59, 62]];
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const beat = 60 / 92;
    this.nextT = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => {
      if (!this.ctx) return;
      while (this.nextT < this.ctx.currentTime + 0.4) {
        const st = this.step, ch = chords[Math.floor(st / 8) % 4], t = this.nextT;
        if (st % 8 === 0) ch.slice(1).forEach(n => this.tone(mtof(n), t, beat * 7.5, 'sine', 0.05, this.music));
        if (st % 2 === 0) this.tone(mtof(ch[0] - 12 + (st % 4 === 2 ? 7 : 0)), t, beat * 0.9, 'triangle', 0.16, this.music);
        if (st % 2 === 1) this.noise(t, 0.04, 0.05, this.music, 8000);
        if (Math.random() < 0.28 && st % 2 === 0) {
          const n = ch[1 + Math.floor(Math.random() * (ch.length - 1))] + 12;
          this.tone(mtof(n), t, beat * 0.6, 'triangle', 0.045, this.music);
        }
        this.step++; this.nextT += beat / 2;
      }
    }, 100);
  },
};
