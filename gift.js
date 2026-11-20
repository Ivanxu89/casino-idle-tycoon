'use strict';
/* Regalo misterioso: cada GIFT_EVERY aparece una bolsa de dinero escondida en el suelo de la sala donde estés.
   Se queda ahí hasta que la abres (aunque cambies de sala o cierres el juego); al abrirla da 1,5–3,5 minutos
   de ingresos (mínimo $50) y empieza la cuenta para la siguiente. Dueño: Iván. */

const GIFT_EVERY = 5 * 60 * 1000; // 5 minutos
const GIFT_MIN = 50;
let giftOpen = null; // animación de apertura { x, y, t }

// sitio libre del suelo: lejos de los huecos de máquinas y del mostrador del fondo
function giftSpot() {
  for (let k = 0; k < 200; k++) {
    const u = 0.08 + Math.random() * 0.88, v = 0.12 + Math.random() * 0.84;
    if (u > 0.3 && u < 0.7 && v < 0.2) continue; // mostrador
    if (SPOT_UV.every(([su, sv]) => Math.hypot(u - su, v - sv) > 0.17)) return [u, v];
  }
  return [0.5, 0.58];
}

function giftReward() {
  return Math.max(GIFT_MIN, Math.round(totalPS() * (90 + Math.random() * 120)));
}

function updateGift() {
  if (!S.giftNext) S.giftNext = Date.now() + GIFT_EVERY;
  if (S.gift || Date.now() < S.giftNext || !started) return;
  const [u, v] = giftSpot();
  S.gift = { room: S.room, u, v };
  Snd.play('buy');
  toast('🎁 ¡Ha aparecido una bolsa misteriosa en ' + ROOMS[S.room].name + '! Búscala');
  save();
}

const giftHere = () => S.gift && S.gift.room === S.room;
const giftPos = () => floorPt(S.gift.u, S.gift.v);

function giftHit(px, py) {
  if (!giftHere()) return false;
  const [x, y] = toRoom(px, py), [gx, gy] = giftPos();
  return Math.abs(x - gx) < 42 && y > gy - 80 && y < gy + 12;
}

function openGift() {
  if (!giftHere()) return;
  const [x, y] = giftPos(), amt = giftReward();
  S.gift = null; S.giftNext = Date.now() + GIFT_EVERY;
  S.stats.gifts++;
  earn(amt);
  giftOpen = { x, y, t: 0 };
  FX.floats.push({ x, y: y - 110, txt: '🎁 +' + money(amt), col: '#ffe27a', size: 40, life: 1.8, vy: -55 });
  for (let k = 0; k < 14; k++) FX.parts.push({ x, y: y - 40, vx: (Math.random() - 0.5) * 420, vy: -380 - Math.random() * 260, life: 1.3, rot: Math.random() * 6 });
  Snd.play('level');
  toast('🎁 ¡Regalo misterioso! +' + money(amt));
  save();
}

// la bolsa: saco con lazo y $, brillo suave y un destello cada pocos segundos para poder encontrarla
function drawGift() {
  const [x, y] = giftPos(), bob = Math.sin(time * 3) * 3, s = 1;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 8, 0, 0, 7); ctx.fill();
  const glow = 0.25 + 0.2 * Math.sin(time * 2.4);
  const gr = ctx.createRadialGradient(0, -30, 4, 0, -30, 60); gr.addColorStop(0, `rgba(255,220,110,${glow})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -30, 60, 0, 7); ctx.fill();
  ctx.translate(0, bob); ctx.scale(s, s);
  ctx.lineWidth = 3; ctx.strokeStyle = '#5a3208'; ctx.lineJoin = 'round';
  // saco
  const sack = ctx.createLinearGradient(-26, -50, 26, 0); sack.addColorStop(0, '#d9a050'); sack.addColorStop(1, '#8a5420');
  ctx.fillStyle = sack; ctx.beginPath();
  ctx.moveTo(-10, -50); ctx.bezierCurveTo(-34, -40, -32, -2, 0, -2); ctx.bezierCurveTo(32, -2, 34, -40, 10, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
  // boca y lazo
  ctx.fillStyle = '#c08a40'; ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(-16, -64); ctx.lineTo(0, -58); ctx.lineTo(16, -64); ctx.lineTo(10, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff4fd8'; ctx.strokeStyle = '#7a1060'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-8, -52, 7, 4, -0.4, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(8, -52, 7, 4, 0.4, 0, 7); ctx.fill(); ctx.stroke();
  // signo $
  ctx.font = '900 26px Lilita One, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = '#5a3208'; ctx.strokeText('$', 0, -24); ctx.fillStyle = '#ffe27a'; ctx.fillText('$', 0, -24);
  ctx.restore();
}

// destello cada 3 s, dibujado por encima de todo: delata la bolsa aunque una máquina la tape
function drawGiftSparkle() {
  if (!giftHere()) return;
  const ph = (time % 3) / 3;
  if (ph >= 0.25) return;
  const [x, y] = giftPos(), a = 1 - ph / 0.25, r = 12 + 26 * (ph / 0.25);
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff6c0';
  ctx.beginPath(); for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4 + time, rad = k % 2 ? r * 0.25 : r; ctx.lineTo(x + 18 + Math.cos(an) * rad, y - 54 + Math.sin(an) * rad); } ctx.closePath(); ctx.fill();
  ctx.restore();
}

// anillo dorado al abrirla
function drawGiftOpen(dt) {
  if (!giftOpen) return;
  giftOpen.t += dt;
  const p = giftOpen.t / 0.7;
  if (p >= 1) { giftOpen = null; return; }
  ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 8 * (1 - p) + 1;
  ctx.beginPath(); ctx.ellipse(giftOpen.x, giftOpen.y - 20, 30 + 120 * p, 18 + 70 * p, 0, 0, 7); ctx.stroke(); ctx.restore();
}
