'use strict';
/* Estado y guardado, economía, formato de números y prestigio. Compartido. */
/* ----------------------------- ESTADO ------------------------------ */
const SAVE_KEY = 'casinoIdleTycoon_v5'; // v5: partida nueva desde cero
function freshState() {
  return {
    money: 60, gems: 10, totalEarned: 0, welcomed: false, roomWelcome: {}, // anfitrión (host.js)
    rooms: ROOMS.map((_, r) => r === 0),
    buildings: { slot: true }, // edificios comprados en el mapa (map.js)
    room: 0,
    licenses: { lucky: true },
    players: {}, // cuántos clientes de cada tipo has contratado (el Estudiante es ilimitado)
    machines: ROOMS.map(() => Array(SPOTS_PER_ROOM).fill(null)),
    sound: { music: 0.45, sfx: 0.8, muted: false },
    goal: 0,
    chips: 0, prestiges: 0, runEarned: 0,
    gift: null, giftNext: 0, // regalo misterioso (gift.js)
    boost: { lvlReady: 0, speedReady: 0, speedEnd: 0 },
    thiefNext: 0, // próximo ladrón (thief.js) // potenciadores: listos la primera vez (boosters.js)
    security: ROOMS.map(() => 0), // vigilante de cada sala, 0 = ninguno (security.js)
    missions: {}, daily: { last: null, streak: 0 }, stats: { gifts: 0, days: 0 }, // misiones y recompensa diaria (missions.js)
    lastSave: Date.now(),
  };
}
let S = freshState();
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = Object.assign(freshState(), JSON.parse(raw));
  } catch (e) { /* sin guardado */ }
  migrate();
}
// adapta partidas guardadas con versiones anteriores
function migrate() {
  S.security = ROOMS.map((_, r) => (S.security && S.security[r]) || 0);
  // una vez: se quitan los vigilantes ya contratados para poder ver la explicación del anfitrión (se devuelve lo pagado)
  if (!S.secIntroReset) {
    S.secIntroReset = true;
    S.security.forEach((k, r) => { for (let t = 1; t <= k; t++) S.money += GUARDS[t - 1].cost * ROOMS[r].cost; });
    S.security = ROOMS.map(() => 0); S.secWelcome = false;
  }
  S.rooms = ROOMS.map((_, r) => !!(S.rooms && S.rooms[r]) || r === 0);
  S.buildings = Object.assign({ slot: true }, S.buildings);
  if (!S.rooms[S.room]) S.room = 0;
  S.boost = Object.assign({ lvlReady: 0, speedReady: 0, speedEnd: 0 }, S.boost);
  // salas de 6 huecos → 9 huecos
  S.machines = ROOMS.map((_, r) => { const row = (S.machines[r] || []).slice(0, SPOTS_PER_ROOM); while (row.length < SPOTS_PER_ROOM) row.push(null); return row; });
  // MundiSlot ya solo tiene tragaperras: las mesas viejas (y los dados) desaparecen; cada mesa vive en su edificio
  S.machines.forEach((row, r) => row.forEach((m, i) => { if (m && (!TYPES[m.type] || TYPES[m.type].bld !== bldOf(r) || i >= spotsIn(r))) row[i] = null; }));
  // clientes: antes «desbloqueado = true» y se podía poner en todas las máquinas; ahora cada uno es una contratación
  for (const pid of Object.keys(S.players)) {
    const n = S.players[pid] === true ? 1 : +S.players[pid] || 0;
    S.players[pid] = Math.max(n, playerUsed(pid));
  }
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
/* ----------------------------- DIFICULTAD ------------------------------ */
// La primera partida es fácil: llenar la sala y mejorar sale barato. Cada vez que vendes el casino sube un
// nivel de dificultad: todo cuesta el doble y los precios suben más deprisa con cada máquina, mejora o cliente.
const difficulty = () => S.prestiges || 0;
// Curva dentro de la partida: al empezar todo cuesta la mitad para enganchar, y según ganas dinero
// los precios suben solos: x0,5 al principio · x1 al ganar 1M · x2 a 1B · x4 a 1T · x8 a 1Qa…
const runEase = () => { const l = Math.log10(1 + (S.runEarned || 0)); return l <= 6 ? 0.5 * Math.pow(2, l / 6) : Math.pow(2, (l - 6) / 3); };
function diff(d = difficulty()) {
  return {
    price: Math.pow(2, d) * runEase(),        // todo ×2 por cada venta, y sube según avanzas
    ramp:  Math.min(1.6, 1.25 + 0.07 * d),    // cada máquina extra en la sala
    steep: Math.min(6, 1.4 + 0.9 * d),        // recargo extra a partir de la máquina «from»
    from:  Math.max(3, 5 - d),
    up:    Math.min(1.16, 1.09 + 0.012 * d),  // cada nivel de mejora
    hire:  Math.min(2.6, 1.6 + 0.15 * d),     // cada copia de un mismo cliente
  };
}
const diffName = (d = difficulty()) => ['Fácil', 'Normal', 'Difícil', 'Muy difícil', 'Experto', 'Pesadilla'][Math.min(d, 5)] + (d > 5 ? ' +' + (d - 5) : '');
const upgradeCost = (m, r) => { const D = diff(); return TYPES[m.type].upBase * Math.pow(D.up, m.level - 1) * ROOMS[r].cost * D.price; };
const licenseCost = id => TYPES[id].license * diff().price;
const roomUnlockCost = r => ROOMS[r].unlock * diff().price;
const buildingCost = b => BUILDINGS[b].cost * diff().price;
const hasBuilding = b => !!(S.buildings && S.buildings[b]);
// las primeras mejoras son casi instantáneas; luego tardan cada vez más
const upgradeTime = (m, r) => (m.level < 5 ? 1 + m.level : 3 + 0.9 * Math.pow(m.level, 1.35)) * ROOMS[r].time; // segundos
const countRoom = r => S.machines[r].filter(Boolean).length;
// cada máquina extra en la sala sube el precio (D.ramp) y, a partir de la D.from-ésima, además D.steep por cada una
const placeCost = (type, r) => { const n = countRoom(r), D = diff(); return TYPES[type].place * ROOMS[r].cost * D.price * Math.pow(D.ramp, n) * Math.pow(D.steep, Math.max(0, n - D.from)); };
function totalPS() {
  let s = 0;
  S.machines.forEach((row, r) => row.forEach(m => { if (m) s += incomePS(m, r); }));
  return s;
}
const allMachines = () => S.machines.flat().filter(Boolean);
const maxLevel = () => allMachines().reduce((a, m) => Math.max(a, m.level), 0);
// aspecto visual de la máquina: 5 etapas (las mesas solo tienen 4: la última se queda en la 4.ª)
const VISUAL_LEVELS = [10, 30, 60, 100];
const tierOf = L => VISUAL_LEVELS.filter(x => L >= x).length;
const nextVisualLevel = L => VISUAL_LEVELS.find(x => x > L);

// clientes limitados: cada uno se contrata con dinero y ocupa una máquina
const playerOwned = pid => (pid === FREE_PLAYER ? Infinity : S.players[pid] || 0);
const playerUsed = pid => allMachines().filter(m => m.player === pid).length;
const playerFree = pid => playerOwned(pid) - playerUsed(pid);
const hireCost = pid => { const D = diff(); return PLAYERS[pid].cost * D.price * Math.pow(D.hire, S.players[pid] || 0); };
const skipGems = secs => Math.max(1, Math.ceil(secs / 90));

// PRUEBAS: regala TEST_BONUS monedas una vez por partida (también tras borrarla o vender el casino). TEST_BONUS = 0 lo desactiva.
function giveTestBonus() {
  if (TEST_BONUS > 0 && !S.testBonusGiven) { S.money += TEST_BONUS; S.testBonusGiven = true; save(); }
}
let earnHook = null; // lo usa slot-room.js para separar lo que producen tus máquinas mientras juegas a una slot
function earn(v) { S.money += v; S.totalEarned += v; S.runEarned += v; if (earnHook) earnHook(v); }

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
  const keep = { chips: (S.chips || 0) + g, prestiges: (S.prestiges || 0) + 1, gems: S.gems, sound: S.sound, goal: S.goal, totalEarned: S.totalEarned,
    missions: S.missions, daily: S.daily, stats: S.stats, security: S.security, boost: S.boost,
    secIntroReset: S.secIntroReset, secWelcome: S.secWelcome, welcomed: S.welcomed, roomWelcome: S.roomWelcome };
  S = Object.assign(freshState(), keep);
  giveTestBonus();
  RT.clear(); WALK = []; closeModal(); goRoom(0);
  Snd.play('level');
  toast(`👑 ¡Casino vendido! Ingresos x${prestigeMult().toFixed(1)} · Dificultad: ${diffName()} (precios x${fmt(diff().price)})`);
  save();
}
