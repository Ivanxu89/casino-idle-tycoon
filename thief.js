'use strict';
/* Ladrón: cada 8–15 minutos entra en la sala donde estás, va de puntillas a una máquina y se queda unos
   segundos frotándose las manos. Si lo tocas antes, lo pillas tú. Si no, el vigilante tiene su probabilidad de
   pararlo (GUARDS.protect); si falla, se lleva la máquina. Nunca roba si en la sala queda una sola máquina,
   así que jamás vacía una sala. Dueño: Iván. */

const THIEF_MIN = 8 * 60 * 1000, THIEF_MAX = 15 * 60 * 1000;
const THIEF_SPEED = 0.16;          // unidades de suelo por segundo
const THIEF_GRAB = 4;              // segundos frotándose las manos: tiempo para que llegue el vigilante (o lo toques tú)
let thief = null;                  // { u, v, x, y, path, state, t, target, flip, back, phase, carry }

const thiefDelay = () => THIEF_MIN + Math.random() * (THIEF_MAX - THIEF_MIN);

function updateThief(dt) {
  if (!started) return;
  if (!S.thiefNext) S.thiefNext = Date.now() + thiefDelay();
  if (!thief && Date.now() >= S.thiefNext && !slotSess) spawnThief();
  if (!thief) return;
  const T = thief; T.t += dt; T.phase += dt * 10;
  if (T.state === 'in' || T.state === 'out') {
    const tgt = T.path[0];
    if (!tgt) { if (T.state === 'in') { T.state = 'grab'; T.t = 0; } else thief = null; return; }
    const du = tgt[0] - T.u, dv = tgt[1] - T.v, d = Math.hypot(du, dv), step = THIEF_SPEED * (T.state === 'out' ? 2 : 1) * dt;
    if (d <= step) { T.u = tgt[0]; T.v = tgt[1]; T.path.shift(); } else { T.u += du / d * step; T.v += dv / d * step; }
    const [nx, ny] = floorPt(T.u, T.v);
    if (Math.abs(nx - T.x) > 0.01) T.flip = nx > T.x;
    if (Math.abs(ny - T.y) > 0.01) T.back = ny < T.y;
    T.x = nx; T.y = ny;
    // si la máquina desaparece (vendida, sala cambiada…) se marcha
    if (T.state === 'in' && !S.machines[S.room][T.target]) thiefLeave(false);
  } else if (T.state === 'grab' && T.t >= THIEF_GRAB) {
    stealMachine();
  } else if (T.state === 'caught' && T.t >= 1.2) {
    thiefLeave(false);
  }
}

function spawnThief() {
  const r = S.room, spots = S.machines[r].map((m, i) => (m ? i : -1)).filter(i => i >= 0);
  if (spots.length < 2) { S.thiefNext = Date.now() + 2 * 60 * 1000; return; } // nunca deja la sala vacía
  const target = spots[Math.floor(Math.random() * spots.length)], [su, sv] = SPOT_UV[target];
  const [x, y] = floorPt(DOOR[0], DOOR[1]);
  thief = { loot: null, u: DOOR[0], v: DOOR[1], x, y, path: [DOOR_IN, [DOOR_IN[0], sv + 0.12], [su - 0.1, sv + 0.12]], state: 'in', t: 0, target, flip: false, back: false, phase: 0, carry: false };
  Snd.play('error'); setTimeout(() => Snd.play('error'), 250);
  guardAlarm();
  toast(`🦹 ¡Un ladrón ha entrado en ${ROOMS[r].name}!${guardTier() ? ' Tu vigilante va a por él' : ' Tócalo para pararlo'}`, true);
}

function stealMachine() {
  const r = S.room, i = thief.target, m = S.machines[r][i];
  if (!m || countRoom(r) < 2) { thiefLeave(false); return; }
  thief.loot = { i, m };
  S.machines[r][i] = null; RT.delete(r + '_' + i);
  if (selected === i) closePanel();
  S.stats.thefts = (S.stats.thefts || 0) + 1;
  Snd.play('error');
  toast(`😱 ¡Se lleva una ${TYPES[m.type].name} de nivel ${m.level}!${guardTier() ? ' ¡Que no escape!' : ' Contrata seguridad 🛡️'}`, true);
  thiefLeave(true); save();
}

function caughtThief(byPlayer) {
  if (!thief || thief.state === 'caught' || (thief.state === 'out' && !thief.carry)) return;
  // si ya huía con la máquina, se recupera
  const L = thief.loot;
  if (L && !S.machines[S.room][L.i]) { S.machines[S.room][L.i] = L.m; S.stats.thefts = Math.max(0, (S.stats.thefts || 1) - 1); toast(`🎰 ¡Has recuperado la ${TYPES[L.m.type].name}!`); }
  thief.loot = null; thief.carry = false;
  thief.state = 'caught'; thief.t = 0; guardAlert = 2;
  S.stats.caught = (S.stats.caught || 0) + 1;
  const bonus = Math.max(100, totalPS() * 120);
  earn(bonus);
  FX.floats.push({ x: thief.x, y: thief.y - 150, txt: '¡Atrapado! +' + money(bonus), col: '#8ff8ff', size: 34, life: 1.8, vy: -50 });
  Snd.play('win');
  toast(byPlayer ? `👮 ¡Has pillado al ladrón! Recompensa ${money(bonus)}` : `🛡️ ¡${GUARDS[guardTier() - 1].name} ha parado al ladrón! +${money(bonus)}`);
  save();
}

function thiefLeave(carry) {
  if (!thief) return;
  thief.state = 'out'; thief.carry = carry; thief.t = 0;
  thief.path = [[thief.u, DOOR_IN[1]], DOOR_IN, DOOR];
  S.thiefNext = Date.now() + thiefDelay();
}

function thiefHit(px, py) {
  if (!thief || thief.state === 'caught' || (thief.state === 'out' && !thief.carry)) return false;
  const [x, y] = toRoom(px, py);
  return Math.abs(x - thief.x) < 40 && y > thief.y - 160 && y < thief.y + 16;
}

// Hoja de 16 fotogramas: 0-3 andar de frente · 4-7 andar de espaldas · 8 mirar · 9 frotarse las manos · 10 pillado · 11 huir · 12-15 huir con la máquina
function drawThief() {
  const T = thief, sheet = IMG.thief; if (!T || !sheet) return;
  const step = Math.floor(T.phase / 2.5) % 4;
  let f;
  if (T.state === 'grab') f = T.t % 1.2 < 0.6 ? 9 : 8;
  else if (T.state === 'caught') f = 10;
  else if (T.state === 'out') f = T.carry ? 12 + step : 11;
  else f = (T.back ? 4 : 0) + step;
  const h = 150, k = h / ANIM.idleH;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(T.x, T.y, h * 0.2, h * 0.05, 0, 0, 7); ctx.fill();
  ctx.translate(T.x, T.y); if (T.flip) ctx.scale(-1, 1);
  ctx.drawImage(sheet, f * ANIM.cw, 0, ANIM.cw, ANIM.ch, -ANIM.cw / 2 * k, -ANIM.base * k, ANIM.cw * k, ANIM.ch * k);
  ctx.restore();
  if (T.state === 'grab') {                // aviso parpadeante sobre la cabeza
    const a = 0.6 + 0.4 * Math.sin(time * 12);
    ctx.save(); ctx.globalAlpha = a; ctx.font = '900 44px Lilita One, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = '#3a0000'; ctx.strokeText('!', T.x, T.y - 165); ctx.fillStyle = '#ff4f5e'; ctx.fillText('!', T.x, T.y - 165); ctx.restore();
  }
}
