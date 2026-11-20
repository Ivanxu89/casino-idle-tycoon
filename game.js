'use strict';
/* =====================================================================
   CASINO IDLE TYCOON — prototipo jugable
   - Monedas para colocar máquinas, mejoras con coste y tiempo crecientes
   - 5 salas con dificultad creciente (coste sube más rápido que ingreso)
   - Jugadores (clientes) con multiplicador según riqueza, desbloqueables
   - Vista isométrica, slots animados, sonido sintetizado (WebAudio)
   ===================================================================== */
const $ = s => document.querySelector(s);
// Ruta de un recurso: en la versión de un solo archivo (build) las imágenes van incrustadas en window.ASSETS
const A = p => (window.ASSETS && window.ASSETS[p]) || p;
const $$ = s => [...document.querySelectorAll(s)];

/* ----------------------------- DATOS ------------------------------ */
const ROOMS = [
  { name: 'Salón Rubí',            img: 'room_0.webp', unlock: 0,      inc: 1,    cost: 1,     time: 1,   desc: 'Tu primer local. Humilde, pero con encanto.' },
  { name: 'Salón Zafiro',          img: 'room_1.webp', unlock: 2.5e4,  inc: 6,    cost: 12,    time: 1.5, desc: 'Más clientela… y mejoras más caras.' },
  { name: 'Jardín Amatista',       img: 'room_2.webp', unlock: 3e6,    inc: 40,   cost: 180,   time: 2.2, desc: 'Clientes exigentes, tiempos de mejora largos.' },
  { name: 'Galaxia Real',          img: 'room_3.webp', unlock: 8e8,    inc: 300,  cost: 3000,  time: 3.2, desc: 'Solo para casinos con nervios de acero.' },
  { name: 'Palacio Esmeralda VIP', img: 'room_4.webp', unlock: 4e11,   inc: 2500, cost: 60000, time: 4.5, desc: 'La sala definitiva. Lujo absoluto.' },
];

// cat: slot = "Máquinas", table = "Juegos"
const TYPES = {
  lucky:    { cat: 'slot',  name: 'Lucky 7',        sprite: 'slot',      hue: 0,   base: 1,    cycle: 2.5, place: 10,    license: 0,     w: 190, ay: .80, desc: 'La clásica tragaperras de toda la vida.' },
  emerald:  { cat: 'slot',  name: 'Esmeralda 7',    sprite: 'slot',      hue: 115, base: 5,    cycle: 3,   place: 150,   license: 400,   w: 190, ay: .80, desc: 'Brilla en verde. Paga 5 veces más.' },
  sapphire: { cat: 'slot',  name: 'Zafiro Deluxe',  sprite: 'slot',      hue: 205, base: 22,   cycle: 3.5, place: 1800,  license: 5000,  w: 195, ay: .80, desc: 'Tragaperras premium de luces azules.' },
  amethyst: { cat: 'slot',  name: 'Amatista Royal', sprite: 'slot',      hue: 280, base: 90,   cycle: 4,   place: 1.5e4, license: 4e4,   w: 200, ay: .80, desc: 'La joya de las tragaperras.' },
  blackjack:{ cat: 'table', name: 'Blackjack 21',   sprite: 'blackjack', hue: 0,   base: 420,  cycle: 5,   place: 1.2e5, license: 4e5,   w: 270, ay: .62, desc: 'El crupier pide en 16 y se planta en 17.' },
  craps:    { cat: 'table', name: 'Dados (Craps)',  sprite: 'craps',     hue: 0,   base: 2000, cycle: 6,   place: 1.5e6, license: 5e6,   w: 270, ay: .62, desc: 'Ruido, gritos y mucho dinero en juego.' },
  poker:    { cat: 'table', name: 'Póker Texas',    sprite: 'poker',     hue: 0,   base: 1e4,  cycle: 8,   place: 2e7,   license: 7e7,   w: 280, ay: .60, desc: 'Mesa de 6 jugadores. La más rentable.' },
};

const PLAYERS = {
  student:   { name: 'Estudiante',      mult: 1,   cost: 0,      wealth: 'Pobre',          wc: '#8a78c0', desc: 'Apuesta lo que le sobra de la beca.' },
  retiree:   { name: 'Jubilado',        mult: 2,   cost: 300,    wealth: 'Modesto',        wc: '#9fb0c8', desc: 'Viene todos los martes con su pensión.' },
  office:    { name: 'Oficinista',      mult: 4,   cost: 5000,   wealth: 'Clase media',    wc: '#5fb8ff', desc: 'Juega para olvidar los lunes.' },
  tourist:   { name: 'Turista',         mult: 8,   cost: 9e4,    wealth: 'Acomodado',      wc: '#3ddc5a', desc: 'De vacaciones y con la cartera llena.' },
  influencer:{ name: 'Influencer',      mult: 18,  cost: 2e6,    wealth: 'Rico',           wc: '#ff7ae5', desc: 'Lo graba todo… y apuesta fuerte.' },
  business:  { name: 'Empresaria',      mult: 40,  cost: 6e7,    wealth: 'Muy rica',       wc: '#ffcf3f', desc: 'Cierra tratos y apuestas a lo grande.' },
  star:      { name: 'Estrella de cine',mult: 90,  cost: 2.5e9,  wealth: 'Millonaria',     wc: '#ffa53f', desc: 'Gafas de sol incluso de noche.' },
  sheikh:    { name: 'Jeque',           mult: 220, cost: 1.2e11, wealth: 'Multimillonario',wc: '#ff4f5e', desc: 'No pregunta el precio de nada.' },
  tycoon:    { name: 'Magnate',         mult: 600, cost: 8e12,   wealth: 'Leyenda',        wc: '#ff4fd8', desc: 'Dueño de medio mundo. Tu mejor cliente.' },
};

const MILESTONES = [10, 25, 50, 100, 150, 200];
const MAX_LEVEL = 200;
const SPOTS_PER_ROOM = 6;

/* ------------- Suelo isométrico (coordenadas de la imagen 1536²) ------------- */
const FLOOR = { B: [770, 620], R: [1480, 1010], L: [60, 1010] };
function floorPt(u, v) {
  const { B, R, L } = FLOOR;
  return [B[0] + u * (R[0] - B[0]) + v * (L[0] - B[0]), B[1] + u * (R[1] - B[1]) + v * (L[1] - B[1])];
}
const SPOT_UV = [[0.36, 0.40], [0.64, 0.38], [0.92, 0.36], [0.34, 0.78], [0.62, 0.76], [0.90, 0.74]];
let SPOTS = SPOT_UV.map(([u, v]) => floorPt(u, v));

/* ----------------------------- ESTADO ------------------------------ */
const SAVE_KEY = 'casinoIdleTycoon_v1';
function freshState() {
  return {
    money: 25, gems: 10, totalEarned: 0,
    rooms: [true, false, false, false, false],
    room: 0,
    licenses: { lucky: true },
    players: { student: true },
    machines: ROOMS.map(() => Array(SPOTS_PER_ROOM).fill(null)),
    sound: { music: 0.45, sfx: 0.8, muted: false },
    goal: 0,
    chips: 0, prestiges: 0, runEarned: 0,
    lastSave: Date.now(),
  };
}
let S = freshState();
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = Object.assign(freshState(), JSON.parse(raw));
  } catch (e) { /* sin guardado */ }
}
function save() {
  S.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}

/* ----------------------------- ECONOMÍA ------------------------------ */
const milestoneMult = L => MILESTONES.reduce((m, ms) => (L >= ms ? m * 2 : m), 1);
function incomePS(m, r, lvl = m.level) {
  const t = TYPES[m.type];
  return t.base * lvl * milestoneMult(lvl) * ROOMS[r].inc * PLAYERS[m.player].mult * prestigeMult();
}
const upgradeCost = (m, r) => TYPES[m.type].place * 0.5 * Math.pow(1.14, m.level - 1) * ROOMS[r].cost;
const upgradeTime = (m, r) => (3 + 0.9 * Math.pow(m.level, 1.35)) * ROOMS[r].time; // segundos
const countRoom = r => S.machines[r].filter(Boolean).length;
const placeCost = (type, r) => TYPES[type].place * ROOMS[r].cost * Math.pow(1.6, countRoom(r));
function totalPS() {
  let s = 0;
  S.machines.forEach((row, r) => row.forEach(m => { if (m) s += incomePS(m, r); }));
  return s;
}
const allMachines = () => S.machines.flat().filter(Boolean);
const maxLevel = () => allMachines().reduce((a, m) => Math.max(a, m.level), 0);
const tierOf = L => (L >= 100 ? 3 : L >= 50 ? 2 : L >= 25 ? 1 : 0);
const skipGems = secs => Math.max(1, Math.ceil(secs / 90));

function earn(v) { S.money += v; S.totalEarned += v; S.runEarned += v; }

/* ----------------------------- FORMATO ------------------------------ */
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp'];
function fmt(n) {
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
  const e = Math.min(Math.floor(Math.log10(n) / 3), SUF.length - 1);
  const v = n / Math.pow(1000, e);
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUF[e];
}
const money = n => '$' + fmt(n);
function fmtTime(s) {
  s = Math.ceil(s);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
}

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
    this.music.gain.value = S.sound.music * 0.35;
    this.sfx.gain.value = S.sound.sfx * 0.6;
  },
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

/* ----------------------------- IMÁGENES ------------------------------ */
const IMG = {};
const SPR = {}; // key `${type}_${tier}` -> canvas/img (con tono aplicado)
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
async function loadAssets() {
  const jobs = [];
  ROOMS.forEach((r, i) => jobs.push(loadImg(A('assets/' + r.img)).then(im => (IMG['room' + i] = im))));
  for (const s of ['slot', 'blackjack', 'craps', 'poker'])
    for (let t = 0; t < 4; t++) jobs.push(loadImg(A(`assets/${s}_${t}.webp`)).then(im => (IMG[`${s}_${t}`] = im)));
  await Promise.all(jobs);
  for (const [id, T] of Object.entries(TYPES)) {
    for (let t = 0; t < 4; t++) {
      const src = IMG[`${T.sprite}_${t}`];
      if (!src) continue;
      if (!T.hue) { SPR[`${id}_${t}`] = src; continue; }
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const x = c.getContext('2d'); x.filter = `hue-rotate(${T.hue}deg) saturate(1.15)`; x.drawImage(src, 0, 0);
      SPR[`${id}_${t}`] = c;
    }
  }
}

/* ----------------------------- PERSONAJES (procedurales) ------------------------------ */
const LOOK = {
  student:   { skin: '#f1c7a0', hair: '#5a3a1e', top: '#6b7c93', pants: '#3b4a66', extra: 'cap', capC: '#ff4f5e', bag: true },
  retiree:   { skin: '#eebd98', hair: '#d9d9d9', top: '#a08060', pants: '#5a4a3a', extra: 'glasses', cardigan: true },
  office:    { skin: '#d9a47a', hair: '#2c1b10', top: '#ffffff', pants: '#2b3b5c', tie: '#2a62d8', jacket: '#3d4f73' },
  tourist:   { skin: '#f4c39b', hair: '#c98a3a', top: '#ff8a3d', pants: '#e8d6a8', extra: 'sunhat', hawaii: true },
  influencer:{ skin: '#c8875c', hair: '#ff6fd8', top: '#ff4fd8', pants: '#ffffff', phone: true, longHair: true },
  business:  { skin: '#8d5a3b', hair: '#1a0f08', top: '#ffffff', pants: '#1d1d2e', jacket: '#7a1f3d', longHair: true, gold: true },
  star:      { skin: '#f0c09a', hair: '#ffe08a', top: '#111111', pants: '#111111', jacket: '#d4af37', extra: 'shades', longHair: true, gold: true },
  sheikh:    { skin: '#b9825a', hair: '#1a0f08', top: '#f5f5f5', pants: '#f5f5f5', extra: 'keffiyeh', robe: true, gold: true, beard: true },
  tycoon:    { skin: '#f1c7a0', hair: '#888888', top: '#ffffff', pants: '#3a1d72', jacket: '#5b2ca0', extra: 'tophat', gold: true, monocle: true, beard: true },
};
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
// Dibuja a un cliente con los pies en (x,y) y altura h. cheer 0..1 = brazos arriba
// walk = fase del paso (null si está quieto), flip = mira a la izquierda
function drawPerson(ctx, x, y, h, pid, t = 0, cheer = 0, walk = null, flip = false) {
  const L = LOOK[pid]; const s = h / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  const ws = walk === null ? 0 : Math.sin(walk);
  const bob = walk === null ? Math.sin(t * 3) * 1.2 - cheer * 4 : -Math.abs(ws) * 2.5;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, bob);
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.2; ctx.strokeStyle = '#1b0b30';
  // piernas / túnica
  if (L.robe) {
    ctx.fillStyle = L.top; rr(ctx, -15, -52, 30, 52, 6); ctx.fill(); ctx.stroke();
  } else {
    const l1 = Math.max(0, ws) * 5, l2 = Math.max(0, -ws) * 5, dx = ws * 3;
    ctx.fillStyle = L.pants; rr(ctx, -12 + dx, -30 - l1, 10, 30, 3); ctx.fill(); ctx.stroke(); rr(ctx, 2 - dx, -30 - l2, 10, 30, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; rr(ctx, -13 + dx, -4 - l1, 12, 5, 2); ctx.fill(); rr(ctx, 1 - dx, -4 - l2, 12, 5, 2); ctx.fill();
  }
  // torso
  ctx.fillStyle = L.top; rr(ctx, -16, -66, 32, 38, 8); ctx.fill(); ctx.stroke();
  if (L.hawaii) { ctx.fillStyle = '#ffe14f'; for (const [a, b] of [[-8, -58], [6, -50], [-4, -40], [8, -62]]) { ctx.beginPath(); ctx.arc(a, b, 3, 0, 7); ctx.fill(); } }
  if (L.cardigan) { ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-2, -64, 4, 34); }
  if (L.jacket) {
    ctx.fillStyle = L.jacket; rr(ctx, -16, -66, 12, 38, 6); ctx.fill(); rr(ctx, 4, -66, 12, 38, 6); ctx.fill();
  }
  if (L.tie) { ctx.fillStyle = L.tie; ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(4, -46); ctx.lineTo(0, -40); ctx.lineTo(-4, -46); ctx.fill(); }
  if (L.gold) { ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -64, 9, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.strokeStyle = '#1b0b30'; ctx.lineWidth = 2.2; }
  if (L.bag) { ctx.fillStyle = '#2a62d8'; rr(ctx, -24, -64, 8, 26, 3); ctx.fill(); ctx.stroke(); }
  // brazos
  const aUp = cheer > 0.05;
  for (const side of [-1, 1]) {
    ctx.fillStyle = L.jacket || L.top;
    ctx.save(); ctx.translate(side * 15, -62);
    ctx.rotate(aUp ? side * (2.6 + Math.sin(t * 12) * 0.2) : side * 0.22 + ws * 0.4);
    rr(ctx, -4.5, 0, 9, 27, 4.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(0, 29, 4.8, 0, 7); ctx.fill(); ctx.stroke();
    if (L.phone && side === 1 && !aUp) { ctx.fillStyle = '#111'; rr(ctx, -4, 27, 8, 13, 2); ctx.fill(); ctx.fillStyle = '#4fe3ff'; ctx.fillRect(-2.5, 29, 5, 9); }
    ctx.restore();
  }
  // cabeza
  const hy = -82;
  if (L.longHair) { ctx.fillStyle = L.hair; rr(ctx, -16, hy - 12, 32, 30, 10); ctx.fill(); }
  ctx.fillStyle = L.skin; ctx.beginPath(); ctx.arc(0, hy, 15, 0, 7); ctx.fill(); ctx.stroke();
  if (L.beard) { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(0, hy + 4, 13, 0.15, Math.PI - 0.15); ctx.fill(); ctx.fillStyle = L.skin; ctx.beginPath(); ctx.ellipse(0, hy + 4, 8, 5, 0, 0, 7); ctx.fill(); }
  // pelo
  ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(0, hy - 2, 15.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  // cara
  ctx.fillStyle = '#1b0b30';
  if (L.extra === 'shades') { rr(ctx, -12, hy - 3, 10, 6, 2); ctx.fill(); rr(ctx, 2, hy - 3, 10, 6, 2); ctx.fill(); ctx.fillRect(-3, hy - 2, 6, 2); }
  else { ctx.beginPath(); ctx.arc(-5, hy, 2, 0, 7); ctx.arc(5, hy, 2, 0, 7); ctx.fill(); }
  if (L.extra === 'glasses') { ctx.strokeStyle = '#1b0b30'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-5, hy, 4.5, 0, 7); ctx.moveTo(9.5, hy); ctx.arc(5, hy, 4.5, 0, 7); ctx.stroke(); ctx.lineWidth = 2.2; }
  if (L.monocle) { ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(5, hy, 5, 0, 7); ctx.stroke(); ctx.strokeStyle = '#1b0b30'; ctx.lineWidth = 2.2; }
  ctx.strokeStyle = '#1b0b30'; ctx.lineWidth = 1.8; ctx.beginPath();
  ctx.arc(0, hy + 5, cheer > 0.05 ? 5 : 4, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.lineWidth = 2.2;
  // sombreros
  if (L.extra === 'cap') { ctx.fillStyle = L.capC; ctx.beginPath(); ctx.arc(0, hy - 6, 15, Math.PI, 0); ctx.fill(); ctx.stroke(); rr(ctx, 0, hy - 8, 20, 4, 2); ctx.fill(); }
  if (L.extra === 'sunhat') { ctx.fillStyle = '#f3d98b'; ctx.beginPath(); ctx.ellipse(0, hy - 10, 24, 5, 0, 0, 7); ctx.fill(); ctx.stroke(); rr(ctx, -11, hy - 24, 22, 14, 6); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff4f5e'; ctx.fillRect(-11, hy - 14, 22, 3); }
  if (L.extra === 'tophat') { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, hy - 12, 20, 4.5, 0, 0, 7); ctx.fill(); rr(ctx, -12, hy - 38, 24, 26, 3); ctx.fill(); ctx.fillStyle = '#ffcf3f'; ctx.fillRect(-12, hy - 18, 24, 4); }
  if (L.extra === 'keffiyeh') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, hy - 2, 17.5, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(18, hy + 18); ctx.lineTo(14, hy + 18); ctx.lineTo(14, hy); ctx.lineTo(-14, hy); ctx.lineTo(-14, hy + 18); ctx.lineTo(-18, hy + 18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111'; rr(ctx, -16, hy - 14, 32, 4, 2); ctx.fill(); }
  ctx.restore();
}
function portrait(pid, size = 110) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size * 0.45, 4, size / 2, size / 2, size * 0.7);
  g.addColorStop(0, PLAYERS[pid].wc + '88'); g.addColorStop(1, '#1d0c4000'); x.fillStyle = g; x.fillRect(0, 0, size, size);
  drawPerson(x, size / 2, size * 0.96, size * 0.82, pid, 0, 0);
  return c;
}

/* ----------------------------- RENDER ------------------------------ */
const cv = $('#cv'), ctx = cv.getContext('2d');
const view = { s: 1, ox: 0, oy: 0, dpr: 1 };
function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * view.dpr; cv.height = h * view.dpr;
  const narrow = w < 760;
  const panelW = !narrow && !$('#panel').classList.contains('hidden') ? 360 : 0;
  const availH = h - (narrow ? 110 : 70), availW = w - panelW;
  view.s = Math.min(availW / 1480, availH / 1180);
  view.ox = availW / 2 - 768 * view.s;
  view.oy = (narrow ? 110 : 70) + availH / 2 - 930 * view.s;
}
const toRoom = (px, py) => [(px - view.ox) / view.s, (py - view.oy) / view.s];

const FX = { floats: [], parts: [] };
const RT = new Map(); // estado de animación por máquina
const rt = (r, i) => { const k = r + '_' + i; if (!RT.has(k)) RT.set(k, { spin: 0, bounce: 0, cheer: 0, card: 0, dice: 0, flash: 0 }); return RT.get(k); };
let hover = -1, selected = -1, pickType = null, debug = false, time = 0;

// geometría de máquina en coordenadas de sala
function mGeom(i, m) {
  const T = TYPES[m.type], img = SPR[`${m.type}_${tierOf(m.level)}`] || IMG.slot_0;
  const [sx, sy] = SPOTS[i];
  const w = T.w, h = img ? img.height * (w / img.width) : w;
  return { x: sx - w / 2, y: sy - h * T.ay, w, h, sx, sy, img };
}

// Rodillos animados: paralelogramo sobre la ventana del sprite (fracciones del sprite)
const REEL = [ // por tier: TL, TR, BL
  { tl: [0.29, 0.255], tr: [0.62, 0.30], bl: [0.27, 0.47] },
  { tl: [0.30, 0.255], tr: [0.62, 0.30], bl: [0.28, 0.47] },
  { tl: [0.30, 0.255], tr: [0.62, 0.30], bl: [0.28, 0.47] },
  { tl: [0.30, 0.255], tr: [0.60, 0.30], bl: [0.28, 0.47] },
];
const SYMS = ['7', '🍒', 'BAR', '🔔', '💎', '🍋'];
function drawReels(g, tier, a, prog) {
  const R = REEL[tier];
  const P = f => [g.x + f[0] * g.w, g.y + f[1] * g.h];
  const tl = P(R.tl), tr = P(R.tr), bl = P(R.bl);
  ctx.save();
  ctx.transform((tr[0] - tl[0]) / 300, (tr[1] - tl[1]) / 300, (bl[0] - tl[0]) / 200, (bl[1] - tl[1]) / 200, tl[0], tl[1]);
  ctx.globalAlpha = a;
  for (let k = 0; k < 3; k++) {
    const x0 = k * 100 + 4;
    ctx.save(); rr(ctx, x0, 0, 92, 200, 14); ctx.clip();
    const gr = ctx.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, '#bbb'); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, '#bbb');
    ctx.fillStyle = gr; ctx.fillRect(x0, 0, 92, 200);
    const stopAt = 0.45 + k * 0.18, stopped = prog > stopAt;
    const off = stopped ? 0 : (time * 1400 + k * 77) % 120;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let j = -2; j < 3; j++) {
      const yy = 100 + j * 120 + off;
      const sym = stopped ? (j === 0 ? '7' : SYMS[(j + 6 + k) % SYMS.length]) : SYMS[(Math.floor((time * 1400 + k * 77) / 120) - j + 60 + k) % SYMS.length];
      if (sym === '7') { ctx.font = '900 110px Lilita One, sans-serif'; ctx.fillStyle = '#e0141e'; ctx.fillText('7', x0 + 46, yy + 6); }
      else if (sym === 'BAR') { ctx.font = '900 40px sans-serif'; ctx.fillStyle = '#111'; ctx.fillText('BAR', x0 + 46, yy); }
      else { ctx.font = '70px sans-serif'; ctx.fillStyle = '#000'; ctx.fillText(sym, x0 + 46, yy); }
    }
    if (!stopped) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x0, 0, 92, 200); }
    ctx.restore();
  }
  ctx.restore();
}

function drawPlaque(x, y, txt, col = '#1d0c40', fg = '#fff', border = '#7b4dff') {
  ctx.font = '900 22px Nunito, sans-serif';
  const w = ctx.measureText(txt).width + 22;
  ctx.fillStyle = col; ctx.strokeStyle = border; ctx.lineWidth = 3;
  rr(ctx, x - w / 2, y - 16, w, 32, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1);
  return w;
}

function render() {
  const W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy);
  const r = S.room, room = IMG['room' + r];
  if (room) ctx.drawImage(room, 0, 0, 1536, 1536);

  if (debug) {
    ctx.strokeStyle = '#0ff'; ctx.lineWidth = 3; ctx.beginPath();
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]) { const p = floorPt(u, v); ctx.lineTo(p[0], p[1]); }
    ctx.stroke();
  }

  // 1) huecos libres (a ras de suelo)  2) máquinas + paseantes ordenados por profundidad  3) etiquetas  4) efectos
  const order = [...Array(SPOTS_PER_ROOM).keys()].sort((a, b) => SPOTS[a][1] - SPOTS[b][1]);
  const now = Date.now();
  for (const i of order) if (!S.machines[r][i]) drawEmptySpot(i, SPOTS[i][0], SPOTS[i][1]);
  const items = [];
  for (const i of order) { const m = S.machines[r][i]; if (m) items.push({ y: SPOTS[i][1], f: () => drawMachine(r, i, m) }); }
  for (const w of WALK) items.push({ y: w.y, f: () => drawWalker(w) });
  items.sort((a, b) => a.y - b.y).forEach(it => it.f());
  for (const i of order) { const m = S.machines[r][i]; if (m) drawLabels(r, i, m, now); }
  for (const w of WALK) drawWalkerBubble(w);
  drawFX();
}
function drawMachine(r, i, m) {
    const [sx, sy] = SPOTS[i];
    const T = TYPES[m.type], g = mGeom(i, m), A = rt(r, i), tier = tierOf(m.level);
    // selección
    if (i === selected || i === hover) {
      ctx.save(); ctx.globalAlpha = i === selected ? 0.7 : 0.4; ctx.fillStyle = i === selected ? '#ffcf3f' : '#4fe3ff';
      ctx.beginPath(); ctx.ellipse(sx, sy, T.w * 0.6, T.w * 0.33, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    // máquina con rebote
    const b = A.bounce > 0 ? Math.sin(A.bounce * Math.PI) * 0.06 : 0;
    ctx.save(); ctx.translate(sx, g.y + g.h); ctx.scale(1 + b * 0.5, 1 - b); ctx.translate(-sx, -(g.y + g.h));
    if (g.img) ctx.drawImage(g.img, g.x, g.y, g.w, g.h);
    if (T.cat === 'slot') {
      // luz de la cúpula
      const lx = g.x + g.w * 0.535, ly = g.y + g.h * 0.03;
      const pulse = 0.35 + 0.3 * Math.sin(time * 4 + i) + A.flash * 0.8;
      if (tier > 0 || A.flash > 0) {
        const gr = ctx.createRadialGradient(lx, ly, 2, lx, ly, 60); gr.addColorStop(0, `rgba(255,230,120,${pulse})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(lx, ly, 60, 0, 7); ctx.fill();
      }
      if (A.spin > 0) drawReels(g, tier, 1, 1 - A.spin / 1.1);
      else if (A.flash > 0) {
        // brillo de premio en los rodillos
        ctx.save(); ctx.globalAlpha = A.flash * 0.6; ctx.fillStyle = '#fff6a0'; ctx.globalCompositeOperation = 'lighter';
        const R = REEL[tier], P = f => [g.x + f[0] * g.w, g.y + f[1] * g.h], a1 = P(R.tl), a2 = P(R.tr), a3 = P(R.bl);
        ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(a2[0] + a3[0] - a1[0], a2[1] + a3[1] - a1[1]); ctx.lineTo(a3[0], a3[1]); ctx.fill(); ctx.restore();
      }
    } else {
      drawTableAnim(m.type, g, A);
    }
    ctx.restore();

    // cliente
    const px = T.cat === 'slot' ? sx - g.w * 0.42 : sx - g.w * 0.08, py = T.cat === 'slot' ? sy + 22 : sy + g.h * 0.30;
    drawPerson(ctx, px, py, T.cat === 'slot' ? 100 : 92, m.player, time + i, A.cheer);
}
function drawLabels(r, i, m, now) {
    const T = TYPES[m.type], g = mGeom(i, m), sx = SPOTS[i][0];
    const topY = g.y - 8;
    const upg = m.upEnd && m.upEnd > now;
    drawPlaque(sx, topY - 20, `Nv ${m.level}  ·  ${money(incomePS(m, r))}/s`, '#1d0c40', '#ffe27a', upg ? '#ff8a00' : '#7b4dff');
    // barra de ciclo / mejora
    const bw = 130, bx = sx - bw / 2, by = topY + 2;
    ctx.fillStyle = '#12062a'; rr(ctx, bx, by, bw, 12, 6); ctx.fill();
    if (upg) {
      const p = 1 - (m.upEnd - now) / (m.upDur * 1000);
      ctx.fillStyle = '#ff8a00'; rr(ctx, bx, by, Math.max(10, bw * p), 12, 6); ctx.fill();
      ctx.font = '900 18px Nunito'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText('⏱ ' + fmtTime((m.upEnd - now) / 1000), sx, by + 34); ctx.fillText('⏱ ' + fmtTime((m.upEnd - now) / 1000), sx, by + 34);
    } else {
      ctx.fillStyle = '#3ddc5a'; rr(ctx, bx, by, Math.max(10, bw * (m.cycleT / T.cycle)), 12, 6); ctx.fill();
      if (S.money >= upgradeCost(m, r) && m.level < MAX_LEVEL) {
        // flecha "se puede mejorar"
        const ay = by + 30 + Math.sin(time * 5) * 4;
        ctx.fillStyle = '#3ddc5a'; ctx.strokeStyle = '#0f5a1f'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx + g.w * 0.45, ay - 18); ctx.lineTo(sx + g.w * 0.45 + 16, ay); ctx.lineTo(sx + g.w * 0.45 + 6, ay); ctx.lineTo(sx + g.w * 0.45 + 6, ay + 14); ctx.lineTo(sx + g.w * 0.45 - 6, ay + 14); ctx.lineTo(sx + g.w * 0.45 - 6, ay); ctx.lineTo(sx + g.w * 0.45 - 16, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
}
function drawFX() {
  // partículas
  for (const p of FX.parts) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.abs(Math.cos(p.rot)), 1);
    ctx.fillStyle = '#ffcf3f'; ctx.strokeStyle = '#a86200'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a86200'; ctx.font = '900 14px Nunito'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1);
    ctx.restore();
  }
  for (const f of FX.floats) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.font = `900 ${f.size}px Lilita One, sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = '#3a1500'; ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

function drawEmptySpot(i, sx, sy) {
  const can = pickType ? S.money >= placeCost(pickType, S.room) : true;
  const a = 0.55 + 0.25 * Math.sin(time * 3 + i);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.globalAlpha = a; ctx.fillStyle = i === hover ? 'rgba(79,227,255,.35)' : 'rgba(255,207,63,.15)';
  ctx.strokeStyle = pickType ? '#4fe3ff' : '#ffcf3f'; ctx.lineWidth = 4; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -time * 30;
  ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(105, 0); ctx.lineTo(0, 60); ctx.lineTo(-105, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.font = '900 52px Lilita One, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = '#3a1500'; ctx.strokeText('+', 0, -4); ctx.fillStyle = '#ffcf3f'; ctx.fillText('+', 0, -4);
  if (pickType) {
    ctx.font = '900 22px Nunito'; ctx.lineWidth = 5; const t = money(placeCost(pickType, S.room));
    ctx.strokeText(t, 0, 34); ctx.fillStyle = can ? '#fff' : '#ff7a85'; ctx.fillText(t, 0, 34);
  }
  ctx.restore();
}

function drawTableAnim(type, g, A) {
  const cx = g.x + g.w * 0.5, cy = g.y + g.h * 0.38;
  if (type === 'craps' && A.dice > 0) {
    const p = 1 - A.dice; // 0..1
    for (let k = 0; k < 2; k++) {
      const x = g.x + g.w * (0.25 + p * 0.45) + k * 22, y = cy - Math.abs(Math.sin(p * Math.PI * 3)) * 40 * (1 - p) + k * 8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(p * 12 + k);
      ctx.fillStyle = '#e8141e'; ctx.strokeStyle = '#600'; ctx.lineWidth = 2; rr(ctx, -10, -10, 20, 20, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; for (const [a, b] of [[-5, -5], [5, 5], [0, 0]]) { ctx.beginPath(); ctx.arc(a, b, 2.2, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  if ((type === 'blackjack' || type === 'poker') && A.card > 0) {
    const p = 1 - A.card;
    for (let k = 0; k < 3; k++) {
      const q = Math.min(1, Math.max(0, p * 1.6 - k * 0.25));
      if (q <= 0) continue;
      const fx = g.x + g.w * 0.62, fy = g.y + g.h * 0.18;
      const tx = g.x + g.w * (0.28 + k * 0.2), ty = g.y + g.h * (0.48 + (k === 1 ? 0.05 : 0));
      const x = fx + (tx - fx) * q, y = fy + (ty - fy) * q - Math.sin(q * Math.PI) * 30;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5 + q * 0.5 + k * 0.1);
      ctx.fillStyle = q < 1 ? '#c22aa6' : '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2; rr(ctx, -9, -13, 18, 26, 3); ctx.fill(); ctx.stroke();
      if (q >= 1) { ctx.fillStyle = k % 2 ? '#e0141e' : '#111'; ctx.font = '900 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['A', 'K', '♥'][k], 0, 1); }
      ctx.restore();
    }
  }
  // fichas que brillan
  if (A.flash > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A.flash * 0.5;
    const gr = ctx.createRadialGradient(cx, cy, 5, cx, cy, g.w * 0.45); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, g.w * 0.45, g.h * 0.3, 0, 0, 7); ctx.fill(); ctx.restore();
  }
}

/* ----------------------------- PASEANTES ------------------------------ */
// Los clientes caminan por pasillos (rejilla isométrica entre máquinas), entran y salen por la puerta.
// Algunos llevan propina ($ dorado sobre la cabeza): tócalos para cobrarla.
const AISLE_U = [0.12, 0.49, 0.77];
const AISLE_V = [0.18, 0.58, 0.96];
const DOOR_IN = [0.12, 0.58], DOOR = [-0.04, 0.58];
const EMO = ['😍', '🤑', '🎰', '✨', '🍀', '😎', '🥳'];
const PID_LIST = Object.keys(PLAYERS);
let WALK = [];
const walkerCap = () => Math.min(8, 2 + countRoom(S.room));
function spawnWalker() {
  const lo = Math.min(S.room * 2, PID_LIST.length - 4); // salas mejores atraen clientes más ricos
  const [x, y] = floorPt(DOOR[0], DOOR[1]);
  WALK.push({
    pid: PID_LIST[lo + Math.floor(Math.random() * 4)], u: DOOR[0], v: DOOR[1], x, y,
    path: [DOOR_IN], wait: 0, phase: Math.random() * 6, flip: false, alpha: 0, moving: true,
    leaving: false, hops: 3 + Math.floor(Math.random() * 6), hasTip: Math.random() < 0.45, tipped: false,
    bubble: null, bubbleT: 0, cheer: 0, speed: 0.10 + Math.random() * 0.05, last: null,
  });
}
function nextTarget(w) {
  if (w.hops-- <= 0) {
    w.leaving = true;
    w.path = [[w.u, DOOR_IN[1]], DOOR_IN, DOOR].filter((p, k, a) => k === 0 ? (p[0] !== w.u || p[1] !== w.v) : true);
    return;
  }
  const iu = AISLE_U.indexOf(w.u), iv = AISLE_V.indexOf(w.v);
  const opts = [];
  if (iu > 0) opts.push([AISLE_U[iu - 1], w.v]);
  if (iu < AISLE_U.length - 1) opts.push([AISLE_U[iu + 1], w.v]);
  if (iv > 0) opts.push([w.u, AISLE_V[iv - 1]]);
  if (iv < AISLE_V.length - 1) opts.push([w.u, AISLE_V[iv + 1]]);
  const fresh = opts.filter(p => !w.last || p[0] !== w.last[0] || p[1] !== w.last[1]);
  const pick = (fresh.length ? fresh : opts)[Math.floor(Math.random() * (fresh.length || opts.length))];
  w.last = [w.u, w.v];
  w.path = [pick];
}
function updateWalkers(dt) {
  if (!started) return;
  if (WALK.length < walkerCap() && Math.random() < dt * 0.6) spawnWalker();
  for (const w of WALK) {
    w.bubbleT = Math.max(0, w.bubbleT - dt); w.cheer = Math.max(0, w.cheer - dt * 1.2);
    const exiting = w.leaving && w.path.length <= 1;
    w.alpha = exiting ? w.alpha - dt * 1.6 : Math.min(1, w.alpha + dt * 2);
    if (exiting && w.alpha <= 0) { w.dead = true; continue; }
    if (w.wait > 0) { w.wait -= dt; w.moving = false; continue; }
    const tgt = w.path[0];
    if (!tgt) {
      if (w.leaving) { w.dead = true; continue; }
      nextTarget(w);
      if (Math.random() < 0.45) {
        w.wait = 0.8 + Math.random() * 2.2; w.moving = false;
        if (Math.random() < 0.5) { w.bubble = EMO[Math.floor(Math.random() * EMO.length)]; w.bubbleT = 1.8; }
      }
      continue;
    }
    const du = tgt[0] - w.u, dv = tgt[1] - w.v, d = Math.hypot(du, dv), step = w.speed * dt;
    if (d <= step) { w.u = tgt[0]; w.v = tgt[1]; w.path.shift(); }
    else { w.u += (du / d) * step; w.v += (dv / d) * step; }
    const [nx, ny] = floorPt(w.u, w.v);
    if (Math.abs(nx - w.x) > 0.01) w.flip = nx < w.x;
    w.x = nx; w.y = ny; w.phase += dt * 9; w.moving = true;
  }
  WALK = WALK.filter(w => !w.dead);
}
function drawWalker(w) {
  ctx.save(); ctx.globalAlpha = Math.max(0, w.alpha);
  drawPerson(ctx, w.x, w.y, 92, w.pid, time + w.phase, w.cheer, w.moving ? w.phase : null, w.flip);
  ctx.restore();
}
function drawWalkerBubble(w) {
  if (w.alpha < 0.5) return;
  const y = w.y - 118 + Math.sin(time * 4 + w.phase) * 4;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (w.hasTip && !w.tipped) {
    const gr = ctx.createRadialGradient(w.x, y, 2, w.x, y, 34); gr.addColorStop(0, 'rgba(255,230,120,.7)'); gr.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(w.x, y, 34, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffcf3f'; ctx.strokeStyle = '#a86200'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(w.x, y, 15, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a86200'; ctx.font = '900 19px Nunito'; ctx.fillText('$', w.x, y + 1);
  } else if (w.bubbleT > 0) {
    ctx.globalAlpha = Math.min(1, w.bubbleT * 2);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b0b30'; ctx.lineWidth = 3;
    rr(ctx, w.x - 22, y - 20, 44, 38, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w.x - 6, y + 17); ctx.lineTo(w.x, y + 27); ctx.lineTo(w.x + 6, y + 17); ctx.fill();
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#000'; ctx.fillText(w.bubble, w.x, y);
  }
  ctx.restore();
}
function walkerHit(px, py) {
  const [x, y] = toRoom(px, py);
  let best = null;
  for (const w of WALK) {
    if (w.alpha < 0.5) continue;
    if (Math.abs(x - w.x) < 26 && y > w.y - 140 && y < w.y + 8 && (!best || w.y > best.y)) best = w;
  }
  return best;
}
function tapWalker(w) {
  w.cheer = 1;
  if (w.hasTip && !w.tipped) {
    w.tipped = true;
    const amt = Math.max(5, totalPS() * 8);
    earn(amt);
    FX.floats.push({ x: w.x, y: w.y - 130, txt: 'Propina +' + money(amt), col: '#ffe27a', size: 30, life: 1.4, vy: -60 });
    for (let k = 0; k < 5; k++) FX.parts.push({ x: w.x, y: w.y - 110, vx: (Math.random() - 0.5) * 220, vy: -280 - Math.random() * 160, life: 1, rot: Math.random() * 6 });
    Snd.play('win');
  } else {
    w.bubble = EMO[Math.floor(Math.random() * EMO.length)]; w.bubbleT = 1.6; Snd.play('click');
  }
}

/* ----------------------------- PRESTIGIO ------------------------------ */
// Vender el casino: se reinicia todo salvo gemas, fichas y ajustes. Cada ficha = +10% ingresos para siempre.
const CHIP_BONUS = 0.10;
const prestigeMult = () => 1 + CHIP_BONUS * (S.chips || 0);
const chipsToGain = () => Math.floor(Math.sqrt((S.runEarned || 0) / 1e6));
const nextChipAt = () => Math.pow(chipsToGain() + 1, 2) * 1e6;
let prestigeArmUntil = 0;
function doPrestige() {
  const g = chipsToGain();
  if (g < 1) { Snd.play('error'); return; }
  // confirmación en dos toques (los diálogos confirm() no funcionan dentro del visor web)
  if (Date.now() > prestigeArmUntil) { prestigeArmUntil = Date.now() + 4000; Snd.play('click'); refreshModal(); return; }
  prestigeArmUntil = 0;
  const keep = { chips: (S.chips || 0) + g, prestiges: (S.prestiges || 0) + 1, gems: S.gems, sound: S.sound, goal: S.goal, totalEarned: S.totalEarned };
  S = Object.assign(freshState(), keep);
  RT.clear(); WALK = []; closeModal(); goRoom(0);
  Snd.play('level');
  toast(`👑 ¡Casino vendido! Ahora tienes ${S.chips} fichas → ingresos x${prestigeMult().toFixed(1)}`);
  save();
}

/* ----------------------------- BUCLE ------------------------------ */
function payout(r, i, m, amount) {
  earn(amount);
  if (r !== S.room) return;
  const A = rt(r, i), g = mGeom(i, m), T = TYPES[m.type];
  A.bounce = 1; A.flash = 1; A.cheer = 1;
  FX.floats.push({ x: g.sx, y: g.y - 60, txt: '+' + money(amount), col: '#ffe27a', size: 34, life: 1.2, vy: -70 });
  const n = Math.min(6, 2 + Math.floor(Math.log10(amount + 1)));
  for (let k = 0; k < n; k++) FX.parts.push({ x: g.sx, y: g.y + g.h * 0.3, vx: (Math.random() - 0.5) * 260, vy: -300 - Math.random() * 200, life: 1, rot: Math.random() * 6 });
  if (T.cat === 'slot') Snd.play('coin'); else Snd.play('coin');
}
function startPlayAnim(r, i, m) {
  if (r !== S.room) return;
  const A = rt(r, i), T = TYPES[m.type];
  if (T.cat === 'slot') { A.spin = 1.1; if (Math.random() < 0.35) Snd.play('spin'); }
  else if (m.type === 'craps') { A.dice = 1; Snd.play('dice'); }
  else { A.card = 1; Snd.play('card'); }
}

function tick(dt) {
  time += dt;
  const now = Date.now();
  S.machines.forEach((row, r) => row.forEach((m, i) => {
    if (!m) return;
    const T = TYPES[m.type];
    const animLead = T.cat === 'slot' ? 1.1 : 0.8;
    const before = m.cycleT;
    m.cycleT += dt;
    if (before < T.cycle - animLead && m.cycleT >= T.cycle - animLead) startPlayAnim(r, i, m);
    if (m.cycleT >= T.cycle) {
      m.cycleT -= T.cycle;
      payout(r, i, m, incomePS(m, r) * T.cycle);
    }
    if (m.upEnd && now >= m.upEnd) finishUpgrade(r, i, m);
  }));
  for (const A of RT.values()) {
    A.spin = Math.max(0, A.spin - dt); A.bounce = Math.max(0, A.bounce - dt * 3); A.flash = Math.max(0, A.flash - dt * 1.5);
    A.cheer = Math.max(0, A.cheer - dt * 1.2); A.dice = Math.max(0, A.dice - dt * 1.25); A.card = Math.max(0, A.card - dt * 1.25);
  }
  updateWalkers(dt);
  FX.floats = FX.floats.filter(f => (f.life -= dt) > 0); FX.floats.forEach(f => (f.y += f.vy * dt));
  FX.parts = FX.parts.filter(p => (p.life -= dt * 1.1) > 0);
  FX.parts.forEach(p => { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 10; });
}

function finishUpgrade(r, i, m) {
  m.level++; m.upEnd = 0;
  const ms = MILESTONES.includes(m.level);
  if (ms) { S.gems += 2 + r; }
  if (r === S.room) {
    const A = rt(r, i); A.bounce = 1; A.flash = 1; A.cheer = 1;
    const g = mGeom(i, m);
    FX.floats.push({ x: g.sx, y: g.y - 100, txt: ms ? `¡HITO! x2  +${2 + r}◆` : `¡Nivel ${m.level}!`, col: ms ? '#ff7ae5' : '#4fe3ff', size: ms ? 40 : 34, life: 1.6, vy: -50 });
    Snd.play(ms ? 'level' : 'upgrade');
  }
  if (tierOf(m.level) !== tierOf(m.level - 1)) toast(`✨ ${TYPES[m.type].name} ha mejorado su aspecto`);
  if (selected === i && r === S.room) renderPanel();
}

/* ----------------------------- INPUT ------------------------------ */
function hitTest(px, py) {
  const [x, y] = toRoom(px, py);
  const r = S.room;
  // primero máquinas (las de delante primero)
  const order = [...Array(SPOTS_PER_ROOM).keys()].sort((a, b) => SPOTS[b][1] - SPOTS[a][1]);
  for (const i of order) {
    const m = S.machines[r][i]; if (!m) continue;
    const g = mGeom(i, m);
    if (x > g.x + g.w * 0.08 && x < g.x + g.w * 0.92 && y > g.y && y < g.y + g.h) return i;
  }
  for (const i of order) {
    if (S.machines[r][i]) continue;
    const [sx, sy] = SPOTS[i];
    if (Math.abs(x - sx) / 105 + Math.abs(y - sy) / 60 <= 1.1) return i;
  }
  return -1;
}
cv.addEventListener('mousemove', e => { hover = hitTest(e.offsetX, e.offsetY); cv.style.cursor = hover >= 0 || walkerHit(e.offsetX, e.offsetY) ? 'pointer' : 'default'; });
cv.addEventListener('mouseleave', () => (hover = -1));
cv.addEventListener('click', e => {
  Snd.init();
  const w = walkerHit(e.offsetX, e.offsetY);
  if (w && !pickType) { tapWalker(w); return; }
  const i = hitTest(e.offsetX, e.offsetY);
  if (i < 0) { closePanel(); return; }
  const m = S.machines[S.room][i];
  if (m) { if (pickType) cancelPick(); selected = i; Snd.play('click'); renderPanel(); return; }
  if (pickType) { placeMachine(pickType, i); return; }
  openBuild(i);
});
window.addEventListener('keydown', e => { if (e.key === 'd' && e.ctrlKey && e.shiftKey) debug = !debug; if (e.key === 'Escape') { closeModal(); closePanel(); cancelPick(); } });

/* ----------------------------- ACCIONES ------------------------------ */
function placeMachine(type, i) {
  const r = S.room, c = placeCost(type, r);
  if (S.money < c) { Snd.play('error'); toast('No tienes suficientes monedas', true); return; }
  S.money -= c;
  S.machines[r][i] = { type, level: 1, player: 'student', cycleT: 0, upEnd: 0, upDur: 0 };
  Snd.play('buy');
  const A = rt(r, i); A.bounce = 1; A.flash = 1;
  cancelPick(); closeModal();
  selected = i; renderPanel();
  save();
}
function doUpgrade(i) {
  const r = S.room, m = S.machines[r][i];
  if (!m || m.upEnd || m.level >= MAX_LEVEL) return;
  const c = upgradeCost(m, r);
  if (S.money < c) { Snd.play('error'); toast('Necesitas ' + money(c), true); return; }
  S.money -= c;
  m.upDur = upgradeTime(m, r); m.upEnd = Date.now() + m.upDur * 1000;
  Snd.play('click'); renderPanel();
}
function skipUpgrade(i) {
  const m = S.machines[S.room][i]; if (!m || !m.upEnd) return;
  const g = skipGems((m.upEnd - Date.now()) / 1000);
  if (S.gems < g) { Snd.play('error'); toast('Te faltan gemas', true); return; }
  S.gems -= g; m.upEnd = Date.now(); renderPanel();
}
function setPlayer(i, pid) {
  const m = S.machines[S.room][i];
  if (!S.players[pid]) { openModal('shop', 'players'); return; }
  m.player = pid; Snd.play('click'); renderPanel(); save();
}
function buyPlayer(pid) {
  const P = PLAYERS[pid];
  if (S.players[pid]) return;
  if (S.money < P.cost) { Snd.play('error'); toast('Necesitas ' + money(P.cost), true); return; }
  S.money -= P.cost; S.players[pid] = true; Snd.play('buy'); toast(`🎉 ${P.name} desbloqueado (x${P.mult})`); save(); refreshModal();
}
function buyLicense(id) {
  const T = TYPES[id];
  if (S.licenses[id]) return;
  if (S.money < T.license) { Snd.play('error'); toast('Necesitas ' + money(T.license), true); return; }
  S.money -= T.license; S.licenses[id] = true; Snd.play('buy'); toast(`🎰 Licencia de ${T.name} comprada`); save(); refreshModal();
}
function choose(id) {
  closeModal();
  if (!started) startGame();
  const free = S.machines[S.room].findIndex(x => !x);
  if (free < 0) { toast('Esta sala está llena. Prueba en otra sala.', true); return; }
  pickType = id; $('#pickName').textContent = TYPES[id].name; $('#pickHint').classList.remove('hidden');
}
function cancelPick() { pickType = null; $('#pickHint').classList.add('hidden'); }
function unlockRoom(r) {
  if (S.rooms[r]) return;
  if (!S.rooms[r - 1]) { toast('Desbloquea primero la sala anterior', true); return; }
  if (S.money < ROOMS[r].unlock) { Snd.play('error'); toast('Necesitas ' + money(ROOMS[r].unlock), true); return; }
  S.money -= ROOMS[r].unlock; S.rooms[r] = true; S.gems += 5; Snd.play('level'); toast(`🏛️ ¡${ROOMS[r].name} abierta! +5◆`); save(); refreshModal();
}
function goRoom(r) {
  if (!S.rooms[r]) return;
  S.room = r; selected = -1; FX.floats = []; FX.parts = []; WALK = []; closePanel(); cancelPick(); closeModal(); $('#hRoom').textContent = ROOMS[r].name;
  if (!started) startGame();
  Snd.play('click');
}

/* ----------------------------- UI: PANEL ------------------------------ */
function closePanel() { selected = -1; $('#panel').classList.add('hidden'); resize(); }
let panelSig = '';
function renderPanel() {
  const r = S.room, i = selected, m = S.machines[r][i];
  if (!m) { closePanel(); return; }
  const T = TYPES[m.type], P = PLAYERS[m.player];
  const tier = tierOf(m.level);
  const upg = m.upEnd && m.upEnd > Date.now();
  const maxed = m.level >= MAX_LEVEL;
  const cost = upgradeCost(m, r), dur = upgradeTime(m, r);
  const next = incomePS(m, r, m.level + 1), cur = incomePS(m, r);
  const nextMs = MILESTONES.find(x => x > m.level);
  if ($('#panel').classList.contains('hidden')) { $('#panel').classList.remove('hidden'); resize(); }
  $('#panelBody').innerHTML = `
    <div class="p-head">
      <img src="${A(`assets/${T.sprite}_${tier}.webp`)}" style="${T.hue ? `filter:hue-rotate(${T.hue}deg) drop-shadow(0 4px 6px #0008)` : ''}">
      <div><div class="p-name">${T.name}</div><div class="p-lvl">NIVEL ${m.level}${maxed ? ' (MAX)' : ''}</div>
      <div style="font-size:12px;color:var(--muted);font-weight:800;margin-top:4px">${T.cat === 'slot' ? 'Máquina' : 'Juego de mesa'} · ${ROOMS[r].name}</div></div>
    </div>
    <div class="stat"><span>Ingresos</span><b>${money(cur)}/s</b></div>
    ${maxed ? '' : `<div class="stat"><span>Siguiente nivel</span><span class="up">${money(next)}/s (+${money(next - cur)})</span></div>`}
    <div class="stat"><span>Cliente</span><span>${P.name} <b>x${P.mult}</b></span></div>
    <div class="sec-ttl">MEJORA</div>
    ${upg ? `
      <div class="stat"><span>Mejorando a Nv ${m.level + 1}…</span><b id="upLeft">${fmtTime((m.upEnd - Date.now()) / 1000)}</b></div>
      <div class="bar"><i id="upBar" style="width:${(100 * (1 - (m.upEnd - Date.now()) / (m.upDur * 1000))).toFixed(1)}%"></i></div>
      <div class="p-actions"><button class="btn btn-pink" id="bSkip"><span>Acelerar</span><span id="skipCost">${skipGems((m.upEnd - Date.now()) / 1000)} ◆</span></button></div>`
    : maxed ? '<div class="stat"><span>¡Nivel máximo alcanzado!</span></div>' : `
      <div class="p-actions"><button class="btn btn-green" id="bUp" ${S.money < cost ? 'disabled' : ''}><span>Mejorar a Nv ${m.level + 1}</span><span>${money(cost)} · ⏱${fmtTime(dur)}</span></button></div>`}
    <div class="sec-ttl">HITOS (x2 ingresos)</div>
    <div class="milestones">${MILESTONES.map(x => `<span class="ms ${m.level >= x ? 'done' : ''}">Nv ${x}</span>`).join('')}</div>
    ${nextMs ? `<div style="font-size:12px;color:var(--muted);font-weight:800;margin-top:6px">Próximo hito: Nv ${nextMs} → ingresos x2 y +${2 + r}◆. Aspecto nuevo en Nv 25 / 50 / 100.</div>` : ''}
    <div class="sec-ttl">ELIGE CLIENTE</div>
    <div class="pl-grid" id="plGrid"></div>
  `;
  const grid = $('#plGrid');
  for (const [pid, PP] of Object.entries(PLAYERS)) {
    const own = S.players[pid];
    const d = document.createElement('div');
    d.className = 'pl-card' + (m.player === pid ? ' sel' : '') + (own ? '' : ' locked');
    d.appendChild(portrait(pid, 90));
    d.insertAdjacentHTML('beforeend', `<div>${PP.name}</div><div class="m">${own ? 'x' + PP.mult : money(PP.cost)}</div>${own ? '' : '<span class="lock">🔒</span>'}`);
    d.onclick = () => setPlayer(i, pid);
    grid.appendChild(d);
  }
  const bUp = $('#bUp'); if (bUp) bUp.onclick = () => doUpgrade(i);
  const bSkip = $('#bSkip'); if (bSkip) bSkip.onclick = () => skipUpgrade(i);
  panelSig = sigOf(m);
}
const sigOf = m => `${m.level}|${!!(m.upEnd && m.upEnd > Date.now())}|${m.player}`;
function updatePanelLive() {
  if (selected < 0) return;
  const m = S.machines[S.room][selected]; if (!m) return;
  if (sigOf(m) !== panelSig) { renderPanel(); return; }
  const bUp = $('#bUp'); if (bUp) bUp.disabled = S.money < upgradeCost(m, S.room);
  if (m.upEnd) {
    const left = (m.upEnd - Date.now()) / 1000;
    const a = $('#upLeft'), b = $('#upBar'), c = $('#skipCost');
    if (a) a.textContent = fmtTime(Math.max(0, left));
    if (b) b.style.width = (100 * (1 - left / m.upDur)).toFixed(1) + '%';
    if (c) c.textContent = skipGems(left) + ' ◆';
  }
}

/* ----------------------------- UI: MODALES ------------------------------ */
let modalKind = null, modalTab = null, buildSpot = -1;
function openModal(kind, tab) {
  Snd.init(); Snd.play('click');
  modalKind = kind; modalTab = tab || (kind === 'shop' ? 'slot' : null);
  $('#modal').classList.remove('hidden');
  refreshModal();
}
function closeModal() { $('#modal').classList.add('hidden'); modalKind = null; buildSpot = -1; }
function openBuild(i) { buildSpot = i; openModal('build'); }

function refreshModal() {
  if (!modalKind) return;
  const tabs = $('#modalTabs'), body = $('#modalBody');
  tabs.innerHTML = ''; body.innerHTML = '';
  if (modalKind === 'shop') {
    $('#modalTitle').textContent = 'ELEGIR / COMPRAR';
    [['slot', '🎰 Máquinas'], ['table', '🃏 Juegos'], ['players', '🧑 Jugadores']].forEach(([k, l]) => {
      const b = document.createElement('button'); b.className = 'tab' + (modalTab === k ? ' on' : ''); b.textContent = l;
      b.onclick = () => { modalTab = k; Snd.play('click'); refreshModal(); }; tabs.appendChild(b);
    });
    const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
    if (modalTab === 'players') {
      for (const [pid, P] of Object.entries(PLAYERS)) {
        const own = S.players[pid];
        const c = document.createElement('div'); c.className = 'card' + (own ? ' owned' : ' locked');
        const im = document.createElement('div'); im.className = 'img'; im.appendChild(portrait(pid, 130)); c.appendChild(im);
        c.insertAdjacentHTML('beforeend', `
          ${own ? '<span class="tag">DESBLOQUEADO</span>' : ''}
          <h3>${P.name}</h3>
          <span class="wealth" style="background:${P.wc};color:#12062a">${P.wealth}</span>
          <div class="d">${P.desc}</div>
          <div class="kv"><span>Multiplicador</span><b>x${P.mult}</b></div>`);
        const b = document.createElement('button');
        b.className = 'btn ' + (own ? 'btn-dark' : 'btn-gold'); b.textContent = own ? 'Asignar desde una máquina' : 'Desbloquear ' + money(P.cost);
        if (own) b.disabled = true; else { b.disabled = S.money < P.cost; b.onclick = () => buyPlayer(pid); }
        c.appendChild(b); cards.appendChild(c);
      }
    } else {
      for (const [id, T] of Object.entries(TYPES)) {
        if (T.cat !== modalTab) continue;
        const own = S.licenses[id];
        const c = document.createElement('div'); c.className = 'card' + (own ? ' owned' : ' locked');
        c.innerHTML = `
          ${own ? '<span class="tag">LICENCIA</span>' : ''}
          <div class="img"><img src="${A(`assets/${T.sprite}_1.webp`)}" style="${T.hue ? `filter:hue-rotate(${T.hue}deg) drop-shadow(0 4px 8px #000a)` : ''}"></div>
          <h3>${T.name}</h3><div class="d">${T.desc}</div>
          <div class="kv"><span>Ingreso base</span><b>${money(T.base)}/s</b></div>
          <div class="kv"><span>Colocar (sala actual)</span><b>${money(placeCost(id, S.room))}</b></div>`;
        const b = document.createElement('button');
        if (own) { b.className = 'btn btn-green'; b.textContent = 'Elegir y colocar'; b.onclick = () => choose(id); }
        else { b.className = 'btn btn-gold'; b.textContent = 'Licencia ' + money(T.license); b.disabled = S.money < T.license; b.onclick = () => buyLicense(id); }
        c.appendChild(b); cards.appendChild(c);
      }
    }
  } else if (modalKind === 'build') {
    $('#modalTitle').textContent = 'COLOCAR EN ' + ROOMS[S.room].name.toUpperCase();
    const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
    for (const [id, T] of Object.entries(TYPES)) {
      const own = S.licenses[id], c = placeCost(id, S.room);
      const d = document.createElement('div'); d.className = 'card' + (own ? '' : ' locked');
      d.innerHTML = `<div class="img"><img src="${A(`assets/${T.sprite}_0.webp`)}" style="${T.hue ? `filter:hue-rotate(${T.hue}deg)` : ''}"></div>
        <h3>${T.name}</h3><div class="kv"><span>Ingreso Nv1</span><b>${money(T.base * ROOMS[S.room].inc)}/s</b></div>`;
      const b = document.createElement('button');
      if (own) { b.className = 'btn btn-green'; b.textContent = 'Colocar ' + money(c); b.disabled = S.money < c; b.onclick = () => placeMachine(id, buildSpot); }
      else { b.className = 'btn btn-dark'; b.textContent = '🔒 Licencia ' + money(T.license); b.onclick = () => { modalKind = 'shop'; modalTab = T.cat; refreshModal(); }; }
      d.appendChild(b); cards.appendChild(d);
    }
  } else if (modalKind === 'rooms') {
    $('#modalTitle').textContent = 'SALAS';
    const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
    ROOMS.forEach((R, r) => {
      const own = S.rooms[r];
      const c = document.createElement('div'); c.className = 'card room-card' + (own ? ' owned' : ' locked') + (S.room === r ? ' cur' : '');
      c.innerHTML = `${own ? `<span class="tag">${S.room === r ? 'AQUÍ ESTÁS' : 'ABIERTA'}</span>` : ''}
        <div class="img"><img src="${A('assets/' + R.img)}"></div>
        <h3>${r + 1}. ${R.name}</h3><div class="d">${R.desc}</div>
        <div class="kv"><span>Ingresos</span><b>x${R.inc}</b></div>
        <div class="kv"><span>Coste de mejoras</span><b style="color:#ff7a85">x${fmt(R.cost)}</b></div>
        <div class="kv"><span>Tiempo de mejoras</span><b style="color:#ff7a85">x${R.time}</b></div>
        <div class="kv"><span>Máquinas</span><b>${countRoom(r)}/${SPOTS_PER_ROOM}</b></div>`;
      const b = document.createElement('button');
      if (own) { b.className = 'btn btn-blue'; b.textContent = S.room === r ? 'Jugar aquí' : 'Ir a la sala'; b.onclick = () => goRoom(r); }
      else { b.className = 'btn btn-gold'; b.textContent = 'Abrir ' + money(R.unlock); b.disabled = S.money < R.unlock || !S.rooms[r - 1]; b.onclick = () => unlockRoom(r); }
      c.appendChild(b); cards.appendChild(c);
    });
  } else if (modalKind === 'sound') {
    $('#modalTitle').textContent = 'SONIDO';
    body.innerHTML = `
      <div class="snd-row"><label>🎵 Música</label><input type="range" id="sMus" min="0" max="1" step="0.05" value="${S.sound.music}"><output id="oMus">${Math.round(S.sound.music * 100)}%</output></div>
      <div class="snd-row"><label>🔔 Efectos</label><input type="range" id="sSfx" min="0" max="1" step="0.05" value="${S.sound.sfx}"><output id="oSfx">${Math.round(S.sound.sfx * 100)}%</output></div>
      <div class="snd-row"><label>🔇 Silencio</label><button class="btn ${S.sound.muted ? 'btn-red' : 'btn-green'}" id="sMute">${S.sound.muted ? 'ACTIVADO' : 'DESACTIVADO'}</button></div>
      <div class="center" style="margin-top:24px"><button class="btn btn-dark btn-sm" id="sReset">Borrar partida</button></div>`;
    $('#sMus').oninput = e => { S.sound.music = +e.target.value; $('#oMus').textContent = Math.round(S.sound.music * 100) + '%'; Snd.apply(); };
    $('#sSfx').oninput = e => { S.sound.sfx = +e.target.value; $('#oSfx').textContent = Math.round(S.sound.sfx * 100) + '%'; Snd.apply(); };
    $('#sSfx').onchange = () => Snd.play('coin');
    $('#sMute').onclick = () => { S.sound.muted = !S.sound.muted; Snd.apply(); refreshModal(); save(); };
    $('#sReset').onclick = e => {
      if (!e.target.dataset.armed) { e.target.dataset.armed = '1'; e.target.textContent = '⚠️ ¿Seguro? Pulsa otra vez para borrar'; e.target.className = 'btn btn-red btn-sm'; return; }
      try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
      S = freshState(); RT.clear(); WALK = []; closeModal(); closePanel(); goRoom(0); save();
    };
  } else if (modalKind === 'prestige') {
    $('#modalTitle').textContent = '👑 VENDER EL CASINO';
    const g = chipsToGain(), chips = S.chips || 0, after = 1 + CHIP_BONUS * (chips + g);
    body.innerHTML = `
      <div class="prest">
        <div class="prest-col">
          <div class="stat"><span>Fichas de prestigio</span><b>${fmt(chips)}</b></div>
          <div class="stat"><span>Bonus actual</span><b>x${prestigeMult().toFixed(1)} ingresos</b></div>
          <div class="stat"><span>Ganado en esta partida</span><b>${money(S.runEarned || 0)}</b></div>
          <div class="stat"><span>Siguiente ficha al ganar</span><b>${money(nextChipAt())}</b></div>
          <div class="stat"><span>Veces vendido</span><b>${S.prestiges || 0}</b></div>
        </div>
        <div class="prest-col center">
          <div style="font-weight:800">Si vendes ahora recibes</div>
          <div class="offline-amt">+${fmt(g)} 👑</div>
          <div style="font-weight:800">Bonus tras vender: <b style="color:var(--green)">x${after.toFixed(1)}</b> en todas las máquinas</div>
          <button class="btn btn-gold" id="bPrest" style="margin-top:14px;width:100%" ${g < 1 ? 'disabled' : ''}>${g < 1 ? 'Gana ' + money(1e6) + ' para vender' : Date.now() < prestigeArmUntil ? '⚠️ ¿Seguro? Pulsa otra vez' : 'Vender por ' + fmt(g) + ' fichas'}</button>
        </div>
      </div>
      <div class="prest-info">
        <div><b style="color:#ff7a85">Se pierde:</b> dinero, máquinas, salas, licencias y jugadores desbloqueados.</div>
        <div><b style="color:var(--green)">Se conserva:</b> fichas 👑 (cada una +${CHIP_BONUS * 100}% ingresos para siempre), gemas ◆, objetivos y ajustes.</div>
        <div style="color:var(--muted)">Consejo: vende cuando tu progreso se frene; volverás mucho más rápido hasta donde estabas.</div>
      </div>`;
    $('#bPrest').onclick = doPrestige;
  } else if (modalKind === 'offline') {
    $('#modalTitle').textContent = '¡BIENVENIDO DE NUEVO!';
    const { amt, secs } = offlineData;
    body.innerHTML = `<div class="center" style="font-weight:800">Mientras no estabas (${fmtTime(secs)}) tu casino ganó:</div>
      <div class="offline-amt">${money(amt)}</div>
      <div class="center" style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-green" id="oCol">Recoger</button>
        <button class="btn btn-pink" id="oX2" ${S.gems < 5 ? 'disabled' : ''}>x2 por 5 ◆</button></div>`;
    $('#oCol').onclick = () => { earn(amt); Snd.play('win'); closeModal(); };
    $('#oX2').onclick = () => { if (S.gems < 5) return; S.gems -= 5; earn(amt * 2); Snd.play('win'); closeModal(); };
  }
}
$('#modalClose').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKind !== 'offline') closeModal(); });
$$('[data-open]').forEach(b => (b.onclick = () => openModal(b.dataset.open)));
$('#panelClose').onclick = closePanel;
$('#pickCancel').onclick = cancelPick;

/* ----------------------------- OBJETIVOS (FTUE) ------------------------------ */
const GOALS = [
  { t: 'Toca un hueco y coloca tu primera Lucky 7', ok: () => allMachines().length >= 1, g: 3 },
  { t: 'Mejora una máquina hasta el nivel 5', ok: () => maxLevel() >= 5, g: 3 },
  { t: 'Desbloquea al Jubilado (Tienda → Jugadores) y asígnalo', ok: () => allMachines().some(m => m.player !== 'student'), g: 3 },
  { t: 'Ten 3 máquinas en el Salón Rubí', ok: () => countRoom(0) >= 3, g: 3 },
  { t: 'Alcanza el nivel 10 (hito x2)', ok: () => maxLevel() >= 10, g: 4 },
  { t: 'Compra la licencia Esmeralda 7', ok: () => !!S.licenses.emerald, g: 4 },
  { t: 'Gana 100 $/s', ok: () => totalPS() >= 100, g: 5 },
  { t: 'Abre el Salón Zafiro', ok: () => S.rooms[1], g: 5 },
  { t: 'Compra la licencia de Blackjack', ok: () => !!S.licenses.blackjack, g: 6 },
  { t: 'Gana 10K $/s', ok: () => totalPS() >= 1e4, g: 8 },
  { t: 'Abre el Jardín Amatista', ok: () => S.rooms[2], g: 10 },
  { t: 'Desbloquea a la Influencer', ok: () => !!S.players.influencer, g: 10 },
  { t: 'Vende el casino (👑) por primera vez', ok: () => (S.prestiges || 0) >= 1, g: 15 },
  { t: 'Abre la Galaxia Real', ok: () => S.rooms[3], g: 15 },
  { t: 'Abre el Palacio Esmeralda VIP', ok: () => S.rooms[4], g: 25 },
];
function updateGoal() {
  const G = GOALS[S.goal];
  if (!G) { $('#goalTxt').textContent = '¡Eres el rey del casino! 👑'; $('#goalBtn').classList.add('hidden'); return; }
  $('#goalTxt').textContent = G.t;
  const ok = G.ok();
  $('#goalBtn').classList.toggle('hidden', !ok);
  $('#goalGems').textContent = '+' + G.g + '◆';
}
$('#goalBtn').onclick = () => { const G = GOALS[S.goal]; if (!G || !G.ok()) return; S.gems += G.g; S.goal++; Snd.play('win'); updateGoal(); save(); };

/* ----------------------------- TOASTS / HUD ------------------------------ */
function toast(msg, bad) {
  const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : ''); d.textContent = msg;
  $('#toasts').appendChild(d); setTimeout(() => d.remove(), 2600);
}
function updateHUD() {
  $('#hMoney').textContent = money(S.money);
  $('#hIncome').textContent = '+' + money(totalPS()) + ' /s';
  $('#hGems').textContent = S.gems;
  $('#hChips').textContent = `${S.chips || 0} · x${prestigeMult().toFixed(1)}`;
  const g = chipsToGain();
  $('#btnPrestige').classList.toggle('ready', g >= 1);
  $('#prestigeBadge').textContent = g >= 1 ? '+' + fmt(g) : '';
}

/* ----------------------------- ARRANQUE ------------------------------ */
let started = false, last = performance.now(), offlineData = null, hudT = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  tick(dt);
  if (started) {
    render();
    hudT += dt;
    if (hudT > 0.2) { hudT = 0; updateHUD(); updatePanelLive(); updateGoal(); if (modalKind && modalKind !== 'sound' && modalKind !== 'offline') refreshButtons(); }
  }
  requestAnimationFrame(frame);
}
// actualizar solo el estado "disabled" de botones de compra en modales abiertos
function refreshButtons() {
  if (refreshButtons._m === S.money) return; refreshButtons._m = S.money;
  if (refreshButtons._t && performance.now() - refreshButtons._t < 1000) return;
  refreshButtons._t = performance.now();
  const sc = $('#modalBody').scrollTop; refreshModal(); $('#modalBody').scrollTop = sc;
}
function startGame() {
  started = true;
  $('#menu').classList.add('hidden');
  $('#hRoom').textContent = ROOMS[S.room].name;
  resize();
}
function showMenu() {
  started = false; closePanel(); cancelPick();
  $('#menu').classList.remove('hidden');
  $('#menuStats').textContent = `Dinero: ${money(S.money)} · Ingresos: ${money(totalPS())}/s · Salas: ${S.rooms.filter(Boolean).length}/${ROOMS.length} · 👑 ${S.chips || 0}`;
}
$('#mPlay').onclick = () => { Snd.init(); Snd.play('buy'); startGame(); };
$('#btnHome').onclick = () => { Snd.play('click'); save(); showMenu(); };
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', save);
setInterval(save, 5000);

(async function boot() {
  load();
  await loadAssets();
  // ganancias offline (50% durante máx. 4h)
  const secs = Math.min((Date.now() - S.lastSave) / 1000, 4 * 3600);
  const amt = totalPS() * secs * 0.5;
  if (secs > 60 && amt > 0) { offlineData = { amt, secs }; }
  showMenu();
  resize();
  updateHUD(); updateGoal();
  requestAnimationFrame(frame);
  if (offlineData) openModal('offline');
})();
