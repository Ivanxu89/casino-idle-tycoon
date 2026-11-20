'use strict';
/* Carga de imágenes, personajes, dibujo isométrico, animaciones y clientes paseando. Dueño: Iván. */
/* ----------------------------- IMÁGENES ------------------------------ */
const IMG = {};
const SPR = {};
// las tragaperras tienen 5 aspectos (0-4); las mesas 4 (0-3)
const spriteTier = (T, t) => Math.min(t, T.cat === 'slot' ? 4 : 3); // key `${type}_${tier}` -> sprite de la máquina en ese nivel visual
const AVATARS = Object.keys(PLAYERS);
const UI_IMGS = ['ui_coin', 'ui_coins', 'ui_gem', 'ui_bag'];
const SYM_IMGS = ['sym_7', 'sym_cherry', 'sym_bell', 'sym_bar', 'sym_diamond', 'sym_lemon', 'sym_star', 'sym_crown'];
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
async function loadAssets() {
  const jobs = [], get = (key, file) => jobs.push(loadImg(A('assets/' + file)).then(im => (IMG[key] = im)));
  ROOMS.forEach((r, i) => get('room' + i, r.img));
  const sprites = [...new Set(Object.values(TYPES).map(T => T.sprite))];
  for (const s of sprites) for (let t = 0; t <= (s.startsWith('slot_') ? 4 : 3); t++) get(`${s}_${t}`, `${s}_${t}.webp`);
  for (const k of Object.keys(REEL_FIT)) get('reelmask_' + k, `reelmask_${k}.webp`);
  for (const pid of AVATARS) { get('avatar_' + pid, `avatar_${pid}.webp`); get('anim_' + pid, `avatar_${pid}_anim.webp`); get('back_' + pid, `avatar_${pid}_back.webp`); }
  for (const k of [...UI_IMGS, ...SYM_IMGS]) get(k, k + '.webp');
  await Promise.all(jobs);
  for (const [id, T] of Object.entries(TYPES)) for (let t = 0; t <= 4; t++) SPR[`${id}_${t}`] = IMG[`${T.sprite}_${spriteTier(T, t)}`];
  // iconos de moneda y gema del HUD
  $('#hudCoin').src = A('assets/ui_coin.webp'); $('#hudGem').src = A('assets/ui_gem.webp');
}

/* ----------------------------- PERSONAJES (avatares de Magnific) ------------------------------ */
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
// Dibuja a un cliente con los pies en (x,y) y altura h. cheer 0..1 = salta de alegría,
// walk = fase del paso (null si está quieto), flip = espejo (mira hacia la derecha).
// Hoja de animación de Magnific: 8 fotogramas de 300x460, pies en y=448, reposo de 380 de alto.
// 0-3 caminar · 4 reposo · 5 parpadeo · 6 celebrar · 7 saltar
const ANIM = { cw: 300, ch: 460, base: 448, idleH: 380 };
function personFrame(t, cheer, walk) {
  if (cheer > 0) return cheer > 0.55 ? 7 : 6;
  if (walk !== null) return Math.floor((((walk % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 4);
  return (t % 3.7) < 0.14 ? 5 : 4;
}
function drawPerson(ctx, x, y, h, pid, t = 0, cheer = 0, walk = null, flip = false) {
  const sheet = IMG['anim_' + pid];
  if (!sheet) return drawPersonStill(ctx, x, y, h, pid, t, cheer, walk, flip);
  const k = h / ANIM.idleH, f = personFrame(t, cheer, walk);
  const bob = walk === null && cheer <= 0 ? Math.sin(t * 2.6) * h * 0.006 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.22 * (f === 7 ? 0.75 : 1), h * 0.05, 0, 0, 7); ctx.fill();
  ctx.translate(x, y + bob);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sheet, f * ANIM.cw, 0, ANIM.cw, ANIM.ch, -ANIM.cw / 2 * k, -ANIM.base * k, ANIM.cw * k, ANIM.ch * k);
  ctx.restore();
}
// Jugador de espaldas (hoja de Magnific de 4 fotogramas: quieto, pulsar, celebrar, saltar). Mismas medidas que ANIM.
function drawPlayerBack(ctx, x, y, h, pid, t, cheer, pressing) {
  const sheet = IMG['back_' + pid];
  if (!sheet) return drawPerson(ctx, x, y, h, pid, t, cheer);
  const k = h / ANIM.idleH, f = cheer > 0 ? (cheer > 0.55 ? 3 : 2) : pressing ? 1 : 0;
  const bob = cheer <= 0 ? Math.sin(t * 2.2) * h * 0.005 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, h * 0.22, h * 0.05, 0, 0, 7); ctx.fill();
  ctx.translate(x, y + bob);
  ctx.drawImage(sheet, f * ANIM.cw, 0, ANIM.cw, ANIM.ch, -ANIM.cw / 2 * k, -ANIM.base * k, ANIM.cw * k, ANIM.ch * k);
  ctx.restore();
}
// respaldo: una sola imagen con movimiento por código (si la hoja no ha cargado)
function drawPersonStill(ctx, x, y, h, pid, t = 0, cheer = 0, walk = null, flip = false) {
  const im = IMG['avatar_' + pid]; if (!im) return;
  const w = im.width * h / im.height;
  const ws = walk === null ? 0 : Math.sin(walk);
  const bob = walk === null ? Math.sin(t * 2.6) * h * 0.008 : -Math.abs(ws) * h * 0.03;
  const jump = cheer > 0 ? Math.sin(cheer * Math.PI) * h * 0.14 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.36 * (1 - jump / h), h * 0.05, 0, 0, 7); ctx.fill();
  ctx.translate(x, y + bob - jump);
  if (flip) ctx.scale(-1, 1);
  if (walk !== null) ctx.rotate(ws * 0.05);
  const sq = 1 + (walk === null && cheer <= 0 ? Math.sin(t * 2.6) * 0.012 : 0); // respira
  ctx.scale(1 / sq, sq);
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
}
function portrait(pid, size = 110) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size / 2, size * 0.45, 4, size / 2, size / 2, size * 0.7);
  g.addColorStop(0, PLAYERS[pid].wc + '88'); g.addColorStop(1, '#1d0c4000'); x.fillStyle = g; x.fillRect(0, 0, size, size);
  drawPerson(x, size / 2, size * 0.97, size * 0.8, pid, 1, 0);
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
  // encuadre: el suelo y las máquinas llenan la pantalla; las paredes del fondo quedan recortadas
  view.s = Math.min(availW / 1380, availH / 1000);
  view.ox = availW / 2 - 770 * view.s;
  view.oy = (narrow ? 110 : 70) + availH / 2 - 960 * view.s;
}
const toRoom = (px, py) => [(px - view.ox) / view.s, (py - view.oy) / view.s];

const FX = { floats: [], parts: [] };
const RT = new Map(); // estado de animación por máquina
const rt = (r, i) => { const k = r + '_' + i; if (!RT.has(k)) RT.set(k, { spin: 0, bounce: 0, cheer: 0, card: 0, dice: 0, flash: 0, evolve: 0 }); return RT.get(k); };
let hover = -1, selected = -1, pickType = null, debug = false, time = 0;

// geometría de máquina en coordenadas de sala
function mGeom(i, m) {
  const T = TYPES[m.type], img = SPR[`${m.type}_${tierOf(m.level)}`];
  const [sx, sy] = SPOTS[i];
  const w = T.w, h = img ? img.height * (w / img.width) : w;
  // tragaperras: la base es un rombo isométrico cuyo centro queda a ~0.27·ancho del borde inferior → justo sobre el hueco
  const y = T.cat === 'slot' ? sy - (h - w * 0.27) : sy - h * T.ay;
  return { x: sx - w / 2, y, w, h, sx, sy, img };
}

// Rodillos animados: se dibujan en un lienzo aparte con el tamaño del sprite y se recortan con la
// máscara exacta de la ventana de rodillos de esa máquina (assets/reelmask_*.webp), así encajan al píxel.
// REEL_FIT (data.js) da el paralelogramo de la ventana para inclinar los símbolos con la perspectiva.
const REEL_SYMS = {
  lucky:    ['sym_7', 'sym_bar', 'sym_cherry', 'sym_bell', 'sym_star'],
  emerald:  ['sym_cherry', 'sym_lemon', 'sym_bell', 'sym_7', 'sym_star'],
  sapphire: ['sym_diamond', 'sym_7', 'sym_star', 'sym_bar'],
  amethyst: ['sym_crown', 'sym_bell', 'sym_diamond', 'sym_7'],
};
const reelCv = document.createElement('canvas'), rctx = reelCv.getContext('2d');
function reelLayer(type, tier, paint) {
  const key = `${type}_${tier}`, mask = IMG['reelmask_' + key], R = REEL_FIT[key];
  if (!mask || !R) return null;
  const W = mask.width, H = mask.height;
  if (reelCv.width !== W || reelCv.height !== H) { reelCv.width = W; reelCv.height = H; } else rctx.clearRect(0, 0, W, H);
  paint(rctx, W, H, R);
  rctx.globalCompositeOperation = 'destination-in'; rctx.drawImage(mask, 0, 0); rctx.globalCompositeOperation = 'source-over';
  return reelCv;
}
function drawReels(g, type, tier, prog) {
  const syms = REEL_SYMS[type] || REEL_SYMS.lucky;
  const layer = reelLayer(type, tier, (c, W, H, R) => {
    c.fillStyle = '#fbf3e0'; c.fillRect(0, 0, W, H);
    const tl = [R.tl[0] * W, R.tl[1] * H], tr = [R.tr[0] * W, R.tr[1] * H], bl = [R.bl[0] * W, R.bl[1] * H];
    c.save();
    c.setTransform((tr[0] - tl[0]) / 300, (tr[1] - tl[1]) / 300, (bl[0] - tl[0]) / 200, (bl[1] - tl[1]) / 200, tl[0], tl[1]);
    for (let k = 0; k < 3; k++) {
      const x0 = k * 100, stopped = prog > 0.42 + k * 0.2, speed = 1500;
      const off = stopped ? 0 : (time * speed + k * 61) % 110;
      for (let j = -2; j <= 2; j++) {
        const idx = stopped ? (j === 0 ? 0 : (j + 7 + k) % syms.length) : (Math.floor((time * speed + k * 61) / 110) - j + 50 + k) % syms.length;
        const im = IMG[syms[idx]]; if (!im) continue;
        const sz = 74, sh = stopped ? 1 : 1.35;                 // estirado = sensación de velocidad
        const cy = 100 + j * 110 + off;
        c.globalAlpha = stopped ? 1 : 0.9;
        c.drawImage(im, x0 + 50 - sz / 2, cy - sz * sh / 2, sz, sz * sh);
      }
      c.globalAlpha = 1;
      if (!stopped) { c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x0, -20, 100, 240); }
      c.fillStyle = 'rgba(60,20,10,.55)'; c.fillRect(x0 + 98, -20, 4, 240);   // separador entre rodillos
    }
    // sombra curva del tambor arriba y abajo
    const gr = c.createLinearGradient(0, -10, 0, 210);
    gr.addColorStop(0, 'rgba(40,10,0,.55)'); gr.addColorStop(0.22, 'rgba(40,10,0,0)'); gr.addColorStop(0.78, 'rgba(40,10,0,0)'); gr.addColorStop(1, 'rgba(40,10,0,.55)');
    c.fillStyle = gr; c.fillRect(-20, -20, 340, 240);
    c.restore();
  });
  if (layer) ctx.drawImage(layer, g.x, g.y, g.w, g.h);
}
// destello dorado sobre los rodillos al cobrar
// Mejora visible al llegar a nivel 10, 30, 60 y 100: haz de luz, destello blanco, rayos y monedas
function evolveMachine(r, i, m) {
  const t = tierOf(m.level), T = TYPES[m.type];
  if (r === S.room) {
    const A = rt(r, i), g = mGeom(i, m);
    A.evolve = 1; A.bounce = 1; A.cheer = 1;
    FX.floats.push({ x: g.sx, y: g.y - 60, txt: `¡NUEVO ASPECTO ${t + 1}/${VISUAL_LEVELS.length + 1}!`, col: '#8ff8ff', size: 48, life: 2.4, vy: -32 });
    for (let k = 0; k < 24; k++) FX.parts.push({ x: g.sx + (Math.random() - 0.5) * g.w * 0.6, y: g.y + g.h * 0.4, vx: (Math.random() - 0.5) * 520, vy: -420 - Math.random() * 380, life: 1.6, rot: Math.random() * 6 });
    Snd.play('level'); setTimeout(() => Snd.play('win'), 450);
  }
  toast(`✨ ¡${T.name} se transforma! Aspecto ${t + 1} de ${VISUAL_LEVELS.length + 1}`);
}
// detrás de la máquina: haz de luz y rayos girando
function drawEvolveBack(g, e) {
  const a = Math.sin(e * Math.PI);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(0, g.y + g.h, 0, g.y - g.h * 0.9);
  beam.addColorStop(0, `rgba(255,240,170,${0.75 * a})`); beam.addColorStop(1, 'rgba(160,240,255,0)');
  ctx.fillStyle = beam; ctx.fillRect(g.sx - g.w * 0.42, g.y - g.h * 0.9, g.w * 0.84, g.h * 1.9);
  ctx.translate(g.sx, g.y + g.h * 0.45); ctx.rotate(time * 1.5);
  for (let k = 0; k < 12; k++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = `rgba(255,230,140,${0.28 * a})`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(g.w * 0.08, g.w * 1.1); ctx.lineTo(-g.w * 0.08, g.w * 1.1); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// encima del sprite: destello blanco que pica en mitad de la animación (ahí cambia el aspecto)
function drawEvolveFront(g, e) {
  const a = Math.max(0, 1 - Math.abs(e - 0.55) * 2.6);
  if (a <= 0 || !g.img) return;
  ctx.save(); ctx.globalAlpha = a; ctx.filter = 'brightness(0) invert(1)'; ctx.drawImage(g.img, g.x, g.y, g.w, g.h); ctx.restore();
}

function drawReelFlash(g, type, tier, a) {
  const layer = reelLayer(type, tier, (c, W, H) => { c.fillStyle = '#fff3a0'; c.fillRect(0, 0, W, H); });
  if (!layer) return;
  ctx.save(); ctx.globalAlpha = a * 0.65; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(layer, g.x, g.y, g.w, g.h); ctx.restore();
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
    // sombra de contacto con el suelo
    ctx.save(); ctx.fillStyle = 'rgba(20,0,30,.35)'; ctx.beginPath(); ctx.ellipse(sx, sy + T.w * 0.04, T.w * 0.52, T.w * 0.26, 0, 0, 7); ctx.fill(); ctx.restore();
    // máquina con rebote
    const b = A.bounce > 0 ? Math.sin(A.bounce * Math.PI) * 0.06 : 0;
    ctx.save(); ctx.translate(sx, g.y + g.h); ctx.scale(1 + b * 0.5, 1 - b); ctx.translate(-sx, -(g.y + g.h));
    if (A.evolve > 0) drawEvolveBack(g, A.evolve);
    if (g.img) ctx.drawImage(g.img, g.x, g.y, g.w, g.h);
    if (A.evolve > 0) drawEvolveFront(g, A.evolve);
    if (T.cat === 'slot') {
      // halo de las bombillas de la marquesina (parpadea; más fuerte al cobrar)
      const lx = g.x + g.w * 0.48, ly = g.y + g.h * 0.12;
      const pulse = 0.16 + 0.12 * Math.sin(time * 5 + i) + A.flash * 0.6;
      if (tier > 0 || A.flash > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createRadialGradient(lx, ly, 4, lx, ly, g.w * 0.45); gr.addColorStop(0, `rgba(255,220,120,${pulse})`); gr.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(lx, ly, g.w * 0.45, 0, 7); ctx.fill(); ctx.restore();
      }
      if (A.spin > 0) drawReels(g, m.type, tier, 1 - A.spin / 1.1);
      else if (A.flash > 0) drawReelFlash(g, m.type, tier, A.flash);
    } else {
      drawTableAnim(m.type, g, A);
    }
    ctx.restore();

    // cliente
    if (T.cat === 'slot') {
      // de espaldas, delante de la ventana de rodillos, mirando a la máquina
      drawPlayerBack(ctx, sx - g.w * 0.36, sy + g.w * 0.30, 150, m.player, time + i, A.cheer, A.spin > 0.75);
    } else {
      drawPerson(ctx, sx - g.w * 0.1, sy + g.h * 0.32, 150, m.player, time + i, A.cheer);
    }
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
    // moneda girando (arte de Magnific)
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.max(0.15, Math.abs(Math.cos(p.rot))), 1);
    if (IMG.ui_coin) ctx.drawImage(IMG.ui_coin, -16, -16, 32, 32);
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
const AISLE_U = [0.10, 0.42, 0.73, 1.0];
const AISLE_V = [0.38, 0.70, 1.0];
const DOOR_IN = [0.10, 0.70], DOOR = [-0.04, 0.70];
const EMO = ['😍', '🤑', '🎰', '✨', '🍀', '😎', '🥳'];
const PID_LIST = Object.keys(PLAYERS);
let WALK = [];
const walkerCap = () => Math.min(4, 1 + Math.floor(countRoom(S.room) / 2)); // la mitad que antes
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
    if (Math.abs(nx - w.x) > 0.01) w.flip = nx > w.x; // el arte mira a la izquierda: espejo al ir a la derecha
    w.x = nx; w.y = ny; w.phase += dt * 9; w.moving = true;
  }
  WALK = WALK.filter(w => !w.dead);
}
function drawWalker(w) {
  ctx.save(); ctx.globalAlpha = Math.max(0, w.alpha);
  drawPerson(ctx, w.x, w.y, 150, w.pid, time + w.phase, w.cheer, w.moving ? w.phase : null, w.flip);
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
