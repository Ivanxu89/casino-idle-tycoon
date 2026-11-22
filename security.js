'use strict';
/* Seguridad: un puesto junto a la puerta de cada sala donde se contrata a un vigilante (GUARDS en data.js).
   Cuanto mejor es, más cuesta y más protege. De momento solo se guarda la protección (guardProtection),
   que usarán los ladrones aleatorios cuando se añadan. Dueño: Iván. */

const GUARD_UV = [0.07, 0.56]; // al lado de la puerta, sobre la pared izquierda
const guardPos = () => floorPt(GUARD_UV[0], GUARD_UV[1]);
const guardTier = (r = S.room) => S.security[r] || 0;            // 0 = sin vigilante, 1..5
const guardCost = (k, r = S.room) => GUARDS[k - 1].cost * ROOMS[r].cost;
const guardProtection = (r = S.room) => (guardTier(r) ? GUARDS[guardTier(r) - 1].protect : 0);
let guardAlert = 0;  // segundos que el vigilante se queda en pose de alerta (al contratarlo; luego, al ver un ladrón)

function hireGuard(k) {
  const r = S.room, c = guardCost(k, r), G = GUARDS[k - 1];
  if (k <= guardTier(r)) return;
  if (S.money < c) { Snd.play('error'); toast(`${G.name} cuesta ${money(c)}`, true); return; }
  S.money -= c; S.security[r] = k; guardAlert = 1.6;
  Snd.play('buy'); toast(`🛡️ ${G.name} vigila ${ROOMS[r].name} · protección ${Math.round(G.protect * 100)}%`);
  save(); refreshModal();
}

function guardHit(px, py) {
  const [x, y] = toRoom(px, py), [gx, gy] = guardPos();
  return Math.abs(x - gx) < 48 && y > gy - 160 && y < gy + 24;
}

// Hoja de 4 fotogramas (mismas medidas que ANIM): 0 reposo · 1 y 2 gestos propios · 3 alerta
function drawGuard() {
  const [x, y] = guardPos(), k = guardTier();
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
  const cyc = time % 7;                                   // cada 7 s hace sus dos gestos
  const f = guardAlert > 0 ? 3 : cyc > 5.6 ? 2 : cyc > 4.2 ? 1 : 0;
  const h = 150 + k * 4, s = h / ANIM.idleH;              // los mejores, un poco más grandes
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.06, 0, 0, 7); ctx.fill();
  ctx.translate(x, y + (f === 0 ? Math.sin(time * 2) * 1.2 : 0));
  ctx.drawImage(sheet, f * ANIM.cw, 0, ANIM.cw, ANIM.ch, -ANIM.cw / 2 * s, -ANIM.base * s, ANIM.cw * s, ANIM.ch * s);
  ctx.restore();
}
function updateGuard(dt) { guardAlert = Math.max(0, guardAlert - dt); }

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
  body.innerHTML = `<div class="daily-lead">${cur ? `Vigila la puerta: <b>${GUARDS[cur - 1].name}</b> · protección ${Math.round(GUARDS[cur - 1].protect * 100)}%` : 'Esta sala no tiene vigilante. Pronto llegarán ladrones…'}</div>`;
  const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
  GUARDS.forEach((G, i) => {
    const k = i + 1, c = guardCost(k, r), own = k === cur, past = k < cur;
    const d = document.createElement('div'); d.className = 'card' + (own ? ' cur' : past ? ' owned' : '');
    const im = document.createElement('div'); im.className = 'img'; im.appendChild(guardPortrait(k, 130)); d.appendChild(im);
    d.insertAdjacentHTML('beforeend', `${own ? '<span class="tag">EN LA PUERTA</span>' : ''}
      <h3>${k}. ${G.name}</h3><div class="d">${G.desc}</div>
      <div class="kv"><span>Protección</span><b>${Math.round(G.protect * 100)}%</b></div>`);
    const b = document.createElement('button');
    if (own) { b.className = 'btn btn-dark'; b.textContent = 'Contratado'; b.disabled = true; }
    else if (past) { b.className = 'btn btn-dark'; b.textContent = 'Ya tienes uno mejor'; b.disabled = true; }
    else { b.className = 'btn btn-gold'; b.textContent = (cur ? 'Cambiar · ' : 'Contratar · ') + money(c); b.disabled = S.money < c; b.onclick = () => hireGuard(k); }
    d.appendChild(b); cards.appendChild(d);
  });
}
