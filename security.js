'use strict';
/* Seguridad: un puesto junto a la puerta de cada sala donde se contrata a un vigilante (GUARDS en data.js).
   Cuanto mejor es, más cuesta y más protege. De momento solo se guarda la protección (guardProtection),
   que usarán los ladrones aleatorios cuando se añadan. Dueño: Iván. */

const GUARD_UV = [0.07, 0.56]; // al lado de la puerta, sobre la pared izquierda
const guardPos = () => floorPt(GUARD_UV[0], GUARD_UV[1]);
const guardTier = (r = S.room) => S.security[r] || 0;            // 0 = sin vigilante, 1..5
const guardCost = (k, r = S.room) => GUARDS[k - 1].cost * ROOMS[r].cost;
const guardProtection = (r = S.room) => (guardTier(r) ? GUARDS[guardTier(r) - 1].protect : 0);
let guardAlert = 0;
// el vigilante en movimiento: post (en su puesto) · react (se da cuenta) · chase (persigue) · stun (falló el placaje) · back (vuelve)
const G = { mode: 'post', t: 0, u: 0, v: 0, x: 0, y: 0, flip: false, phase: 0 };
function guardReset() { G.mode = 'post'; [G.u, G.v] = GUARD_UV; [G.x, G.y] = guardPos(); }
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

function guardMove(tu, tv, speed, dt) {
  const du = tu - G.u, dv = tv - G.v, d = Math.hypot(du, dv), step = speed * dt;
  if (d <= step) { G.u = tu; G.v = tv; } else { G.u += du / d * step; G.v += dv / d * step; }
  const [nx, ny] = floorPt(G.u, G.v);
  if (Math.abs(nx - G.x) > 0.01) G.flip = nx > G.x;   // el arte mira a la izquierda
  G.x = nx; G.y = ny; G.phase += dt * 12;
  return d;
}
function updateGuardChase(dt) {
  const k = guardTier();
  if (!k) { G.mode = 'post'; return; }
  const C = GUARD_CHASE[k - 1];
  if (G.mode === 'post') { [G.u, G.v] = GUARD_UV; [G.x, G.y] = guardPos(); return; }
  const active = thief && thief.state !== 'caught' && !(thief.state === 'out' && !thief.carry);
  if (!active && G.mode !== 'back') G.mode = 'back';
  G.t -= dt;
  if (G.mode === 'react') { if (G.t <= 0) G.mode = 'chase'; return; }
  if (G.mode === 'stun') { if (G.t <= 0) G.mode = 'chase'; return; }
  if (G.mode === 'chase') {
    const d = guardMove(thief.u, thief.v, C.speed, dt);
    if (d < 0.045) {
      if (Math.random() < C.tackle) caughtThief(false);
      else {
        G.mode = 'stun'; G.t = C.stun; Snd.play('error');
        FX.floats.push({ x: G.x, y: G.y - 170, txt: '¡Se le escapa!', col: '#ff7a85', size: 28, life: 1.4, vy: -40 });
      }
    }
    return;
  }
  if (G.mode === 'back' && guardMove(GUARD_UV[0], GUARD_UV[1], 0.12, dt) < 0.005) G.mode = 'post';
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
  const sheet = IMG['guard_' + k]; if (!sheet) return;
  const cyc = time % 7, moving = G.mode === 'chase' || G.mode === 'back';
  let f = guardAlert > 0 ? 3 : cyc > 5.6 ? 2 : cyc > 4.2 ? 1 : 0;
  if (G.mode === 'react') f = 3;
  if (moving) f = Math.floor(G.phase / 3) % 2 ? 3 : 0;   // corre alternando dos poses
  if (G.mode === 'stun') f = 0;
  const h = 150 + k * 4, s = h / ANIM.idleH;
  const bob = moving ? -Math.abs(Math.sin(G.phase)) * 6 : f === 0 ? Math.sin(time * 2) * 1.2 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.06, 0, 0, 7); ctx.fill();
  ctx.translate(x, y + bob); if (moving && G.flip) ctx.scale(-1, 1);
  if (moving) ctx.rotate(-0.08);
  ctx.drawImage(sheet, f * ANIM.cw, 0, ANIM.cw, ANIM.ch, -ANIM.cw / 2 * s, -ANIM.base * s, ANIM.cw * s, ANIM.ch * s);
  ctx.restore();
  if (G.mode === 'stun') { ctx.save(); ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💫', x + Math.sin(time * 8) * 14, y - h - 4); ctx.restore(); }
  if (G.mode === 'react') { ctx.save(); ctx.font = '900 40px Lilita One, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#002a3a'; ctx.strokeText('!', x, y - h - 6); ctx.fillStyle = '#4fe3ff'; ctx.fillText('!', x, y - h - 6); ctx.restore(); }
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
