'use strict';
/* Carga de imágenes, personajes, dibujo isométrico, animaciones y clientes paseando. Dueño: Iván. */
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
  $('#game').style.setProperty('--panel-w', panelW + 'px'); // la flecha derecha se aparta del panel
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
  if (giftHere()) items.push({ y: giftPos()[1], f: drawGift }); // las máquinas de delante pueden taparla: está escondida
  items.sort((a, b) => a.y - b.y).forEach(it => it.f());
  for (const i of order) { const m = S.machines[r][i]; if (m) drawLabels(r, i, m, now); }
  for (const w of WALK) drawWalkerBubble(w);
  drawGiftSparkle(); drawGiftOpen(1 / 60);
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
