'use strict';
/* Estado y guardado, economía, formato de números y prestigio. Compartido. */
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
