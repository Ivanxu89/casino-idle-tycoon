'use strict';
/* Seguridad: un puesto junto a la puerta de cada sala donde se contrata a un vigilante (GUARDS en data.js).
   Cuanto mejor es, más cuesta y más protege. De momento solo se guarda la protección (guardProtection),
   que usarán los ladrones aleatorios cuando se añadan. Dueño: Iván. */

let GUARD_UV = [0.07, 0.56]; // al lado de la puerta, sobre la pared izquierda
const guardPos = () => floorPt(GUARD_UV[0], GUARD_UV[1]);
const guardTier = (r = S.room) => S.security[r] || 0;            // 0 = sin vigilante, 1..5
const guardCost = (k, r = S.room) => GUARDS[k - 1].cost * ROOMS[r].cost * diff().price;
const guardProtection = (r = S.room) => (guardTier(r) ? GUARDS[guardTier(r) - 1].protect : 0);
let guardAlert = 0;
// el vigilante en movimiento: post (en su puesto) · react (se da cuenta) · chase (persigue) · tackle (se lanza en plancha)
// · stun (falló el placaje) · win (lo ha atrapado) · back (recupera el aliento y vuelve)
const G = { mode: 'post', t: 0, u: 0, v: 0, x: 0, y: 0, flip: false, phase: 0, ring: 0, tackleOk: false, back: false };
function guardReset() { G.mode = 'post'; G.ring = 0; DUST.length = 0; [G.u, G.v] = GUARD_UV; [G.x, G.y] = guardPos(); }
function guardAlarm() { if (!guardTier()) return; if (G.mode === 'post') guardReset(); G.mode = 'react'; G.t = GUARD_CHASE[guardTier() - 1].react; }  // segundos que el vigilante se queda en pose de alerta (al contratarlo; luego, al ver un ladrón)

function hireGuard(k) {
  const r = S.room, c = guardCost(k, r), G = GUARDS[k - 1];
  if (k <= guardTier(r)) return;
  if (S.money < c) { Snd.play('error'); toast(`${G.name} cuesta ${money(c)}`, true); return; }
  S.money -= c; S.security[r] = k; guardAlert = 1.6; guardReset();
  Snd.play('buy'); toast(`🛡️ ${G.name} vigila ${ROOMS[r].name} · protección ${Math.round(G.protect * 100)}%`);
  save(); refreshModal();
}

function guardHit(px, py) {
  const [x, y] = toRoom(px, py), [gx, gy] = guardPos();
  return Math.abs(x - gx) < 48 && y > gy - 160 && y < gy + 24;
}

// Atlas de acción (ACT.cw x ANIM.ch, base ANIM.base): 0-3 correr · 4 placaje en plancha · 5 en el suelo mareado · 6 victoria · 7 sin aliento
const ACT = { cw: 320 };
const DUST = [];                    // nubecillas de polvo al correr (vigilante y ladrón)
function dustPuff(x, y, n = 1, big = 1) {
  for (let i = 0; i < n; i++) DUST.push({ x: x + (Math.random() - 0.5) * 20, y: y - Math.random() * 6, r: (8 + Math.random() * 8) * big, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 20, life: 0.5 + Math.random() * 0.3, t: 0 });
}
function updateDust(dt) {
  for (const d of DUST) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.r += 22 * dt; }
  for (let i = DUST.length - 1; i >= 0; i--) if (DUST[i].t >= DUST[i].life) DUST.splice(i, 1);
}
function drawDust() {
  if (!DUST.length) return;
  ctx.save();
  for (const d of DUST) { ctx.globalAlpha = 0.45 * (1 - d.t / d.life); ctx.fillStyle = '#e9dcc8'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

function guardMove(tu, tv, speed, dt) {
  const du = tu - G.u, dv = tv - G.v, d = Math.hypot(du, dv), step = speed * dt;
  if (d <= step) { G.u = tu; G.v = tv; } else { G.u += du / d * step; G.v += dv / d * step; }
  const [nx, ny] = floorPt(G.u, G.v);
  if (Math.abs(nx - G.x) > 0.01) G.flip = nx > G.x;   // el arte mira a la izquierda
  if (Math.abs(ny - G.y) > 0.05) G.back = ny < G.y;   // sube por la pantalla = se aleja = de espaldas
  G.x = nx; G.y = ny;
  const p0 = G.phase; G.phase += dt * (6 + speed * 40);   // más rápido = zancadas más rápidas
  if (Math.floor(p0 / 2) !== Math.floor(G.phase / 2)) dustPuff(G.x + (G.flip ? -18 : 18), G.y);
  return d;
}
function updateGuardChase(dt) {
  updateDust(dt);
  const k = guardTier();
  if (!k) { G.mode = 'post'; return; }
  const C = GUARD_CHASE[k - 1];
  if (G.mode === 'post') { [G.u, G.v] = GUARD_UV; [G.x, G.y] = guardPos(); return; }
  G.t -= dt;
  if (G.mode === 'win') { if (G.t <= 0) { G.mode = 'back'; G.t = 1.0; } return; }      // celebra con las esposas
  const active = thief && thief.state !== 'caught' && !(thief.state === 'out' && !thief.carry);
  if (!active && G.mode !== 'back') { G.mode = 'back'; G.t = 1.0; }
  if (G.mode === 'react') { if (G.t <= 0) G.mode = 'chase'; return; }
  if (G.mode === 'stun') { if (G.t <= 0) G.mode = 'chase'; return; }
  if (G.mode === 'chase') {
    if (guardMove(thief.u, thief.v, C.speed, dt) < 0.1) { G.mode = 'tackle'; G.t = 0.42; G.tackleOk = Math.random() < C.tackle; }
    return;
  }
  if (G.mode === 'tackle') {                       // se lanza en plancha hacia el ladrón
    guardMove(thief.u, thief.v, Math.max(0.55, C.speed * 2.4), dt);
    if (G.t > 0) return;
    dustPuff(G.x, G.y, 6, 1.4);
    if (G.tackleOk) { caughtThief(false); G.mode = 'win'; G.t = 1.5; G.ring = 0.35; }
    else {
      G.mode = 'stun'; G.t = C.stun; Snd.play('error'); thief.dodge = 0.6;
      FX.floats.push({ x: G.x, y: G.y - 170, txt: '¡Se le escapa!', col: '#ff7a85', size: 28, life: 1.4, vy: -40 });
    }
    return;
  }
  if (G.mode === 'back') {                         // vuelve al puesto: primero recupera el aliento, luego trota
    if (G.t > 0) return;
    if (guardMove(GUARD_UV[0], GUARD_UV[1], 0.12, dt) < 0.005) G.mode = 'post';
  }
}

// Hoja de 4 fotogramas (mismas medidas que ANIM): 0 reposo · 1 y 2 gestos propios · 3 alerta
function drawGuard() {
  const k = guardTier();
  const [x, y] = G.mode === 'post' || !k ? guardPos() : [G.x, G.y];
  if (!k) {
    // puesto vacío: rombo punteado con escudo, invita a contratar
    const a = 0.55 + 0.25 * Math.sin(time * 3);
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
    ctx.strokeStyle = '#4fe3ff'; ctx.fillStyle = 'rgba(79,227,255,.18)'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -time * 25;
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(60, 0); ctx.lineTo(0, 34); ctx.lineTo(-60, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛡️', 0, -6);
    ctx.restore(); return;
  }
  const sheet = IMG['guard_' + k], act = IMG['guardAct_' + k], backSheet = IMG['guardBack_' + k]; if (!sheet) return;
  const h = 150 + k * 4, s = h / ANIM.idleH;
  const running = G.mode === 'chase' || (G.mode === 'back' && G.t <= 0);
  // fotograma: [hoja, índice]
  let img = null, useAct = !!act && G.mode !== 'post' && G.mode !== 'react', f, bob = 0, sx = 1, sy = 1, lift = 0;
  if (G.mode === 'post' || G.mode === 'react' || !act) {
    const cyc = time % 7;
    f = guardAlert > 0 || G.mode === 'react' ? 3 : cyc > 5.6 ? 2 : cyc > 4.2 ? 1 : 0;
    if (G.mode === 'react') { const j = Math.min(1, (GUARD_CHASE[k - 1].react - G.t) * 6); sy = 1 + 0.08 * Math.sin(j * Math.PI); lift = 10 * Math.sin(j * Math.PI); }  // pega un brinco del susto
    else if (f === 0) bob = Math.sin(time * 2) * 1.2;
  } else if (running) {
    const walking = G.mode === 'back';           // vuelve al puesto andando; persigue corriendo
    f = Math.floor(G.phase / (walking ? 2.6 : 2)) % 4;
    bob = -Math.abs(Math.sin(G.phase * Math.PI / 4)) * (walking ? 2.5 : 5);
    if (G.back && backSheet) { img = backSheet; f += walking ? 4 : 0; }
  } else if (G.mode === 'tackle') {
    f = 4; const p = 1 - Math.max(0, G.t) / 0.42; lift = Math.sin(p * Math.PI) * 26;   // vuela en arco
  } else if (G.mode === 'stun') { f = 5; }
  else if (G.mode === 'win') { f = 6; const p = Math.min(1, (1.5 - G.t) * 4); sy = 1 + 0.12 * Math.sin(p * Math.PI); sx = 2 - sy; }  // aterriza y rebota
  else if (G.mode === 'back') { f = 7; bob = Math.sin(time * 10) * 1.5; }                // jadeando
  else f = 0;
  ctx.save();
  const sh = 1 - Math.min(0.5, lift / 60);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * (G.mode === 'tackle' && useAct ? 0.42 : 0.24) * sh, h * 0.06 * sh, 0, 0, 7); ctx.fill();
  ctx.translate(x, y + bob - lift); if ((useAct || running) && G.flip) ctx.scale(-1, 1);
  ctx.scale(sx, sy);
  if (useAct) ctx.drawImage(img || act, f * ACT.cw, 0, ACT.cw, ANIM.ch, -ACT.cw / 2 * s, -ANIM.base * s, ACT.cw * s, ANIM.ch * s);
  else ctx.drawImage(sheet, f * ANIM.cw, 0, ANIM.cw, ANIM.ch, -ANIM.cw / 2 * s, -ANIM.base * s, ANIM.cw * s, ANIM.ch * s);
  ctx.restore();
  if (G.ring > 0) {                                // onda de impacto al placar
    const p = 1 - G.ring / 0.35; G.ring -= 1 / 60;
    ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 8 * (1 - p) + 1;
    ctx.beginPath(); ctx.ellipse(x, y - 20, 30 + p * 110, (30 + p * 110) * 0.5, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  if (G.mode === 'stun') {                         // estrellitas girando sobre la cabeza
    ctx.save(); ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.09; ctx.fillText('⭐', x + Math.cos(a) * 30, y - h * 0.78 + Math.sin(a) * 9); }
    ctx.restore();
  }
  if (G.mode === 'win') { ctx.save(); ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, G.t); ctx.fillText('👮', x, y - h - 10 - (1.5 - G.t) * 20); ctx.restore(); }
  if (G.mode === 'react') { ctx.save(); ctx.font = '900 40px Lilita One, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#002a3a'; ctx.strokeText('!', x, y - h - 6 - lift); ctx.fillStyle = '#4fe3ff'; ctx.fillText('!', x, y - h - 6 - lift); ctx.restore(); }
}
function updateGuard(dt) { guardAlert = Math.max(0, guardAlert - dt); updateGuardChase(dt); }

function guardPortrait(k, size) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const sheet = IMG['guard_' + k]; if (!sheet) return c;
  const x = c.getContext('2d'), s = size * 0.95 / ANIM.ch;
  x.drawImage(sheet, 0, 0, ANIM.cw, ANIM.ch, size / 2 - ANIM.cw * s / 2, 0, ANIM.cw * s, ANIM.ch * s);
  return c;
}

function renderSecurity(tabs, body) {
  const r = S.room, cur = guardTier(r);
  $('#modalTitle').textContent = '🛡️ SEGURIDAD · ' + ROOMS[r].name.toUpperCase();
  body.innerHTML = `<div class="daily-lead">${cur ? `Vigila la puerta: <b>${GUARDS[cur - 1].name}</b> · reacciona en ${GUARD_CHASE[cur - 1].react} s y acierta el ${Math.round(GUARD_CHASE[cur - 1].tackle * 100)}% de los placajes` : 'Sin vigilante, cada ladrón se lleva una máquina (si no lo tocas a tiempo).'}</div>`;
  const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
  GUARDS.forEach((G, i) => {
    const k = i + 1, c = guardCost(k, r), own = k === cur, past = k < cur;
    const d = document.createElement('div'); d.className = 'card' + (own ? ' cur' : past ? ' owned' : '');
    const im = document.createElement('div'); im.className = 'img'; im.appendChild(guardPortrait(k, 130)); d.appendChild(im);
    d.insertAdjacentHTML('beforeend', `${own ? '<span class="tag">EN LA PUERTA</span>' : ''}
      <h3>${k}. ${G.name}</h3><div class="d">${G.desc}</div>
      <div class="kv"><span>Reacción · carrera</span><b>${GUARD_CHASE[i].react} s · ${['muy lenta', 'lenta', 'normal', 'rápida', 'muy rápida'][i]}</b></div>
      <div class="kv"><span>Acierta el placaje</span><b>${Math.round(GUARD_CHASE[i].tackle * 100)}%</b></div>`);
    const b = document.createElement('button');
    if (own) { b.className = 'btn btn-dark'; b.textContent = 'Contratado'; b.disabled = true; }
    else if (past) { b.className = 'btn btn-dark'; b.textContent = 'Ya tienes uno mejor'; b.disabled = true; }
    else { b.className = 'btn btn-gold'; b.textContent = (cur ? 'Cambiar · ' : 'Contratar · ') + money(c); b.disabled = S.money < c; b.onclick = () => hireGuard(k); }
    d.appendChild(b); cards.appendChild(d);
  });
}
