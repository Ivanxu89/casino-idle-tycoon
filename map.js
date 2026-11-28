'use strict';
/* Mapa principal: los 4 edificios (MundiSlot, MundiPoker, MundiBlackJack, MundiBingo), coches de lujo
   circulando y fuentes animadas. Los edificios sin comprar se ven en gris con un candado y su precio.
   Hay dos versiones del mapa: horizontal (pantallas anchas) y vertical (móviles). Coordenadas en píxeles
   de cada imagen (map_h 1800x1004, map_v 1004x1800). Dueño: Iván. */

const MAPS = {
  h: { img: 'map_h', W: 1800, H: 1004,
    b: { slot:      { poly: [[250, 120], [420, 0], [640, 40], [700, 330], [690, 420], [560, 470], [420, 500], [250, 430], [210, 380], [215, 250]], c: [450, 280] },
         poker:     { poly: [[1100, 140], [1150, 40], [1290, 20], [1450, 60], [1640, 160], [1650, 330], [1600, 430], [1440, 470], [1300, 460], [1200, 430], [1110, 340]], c: [1380, 280] },
         blackjack: { poly: [[250, 640], [290, 560], [480, 540], [620, 580], [650, 720], [670, 820], [560, 900], [420, 960], [260, 930], [150, 860], [160, 700]], c: [420, 760] },
         bingo:     { poly: [[1240, 650], [1280, 560], [1440, 510], [1580, 540], [1650, 620], [1670, 780], [1600, 880], [1460, 940], [1330, 930], [1210, 880], [1170, 780]], c: [1420, 740] } },
    fount: [[905, 418, 62, 24, 372], [910, 562, 88, 36, 492]],   // x, y, radio x, radio y, alto del chorro
    roads: [[[-80, 780], [420, 1030]], [[1820, 345], [1480, 515]], [[1820, 815], [1440, 1010]], [[500, 945], [800, 795]], [[-60, 320], [560, 630]]] },
  v: { img: 'map_v', W: 1004, H: 1800,
    b: { poker:     { poly: [[10, 250], [110, 150], [250, 80], [400, 140], [440, 250], [450, 420], [380, 520], [260, 610], [150, 620], [20, 560], [0, 450]], c: [230, 350] },
         slot:      { poly: [[600, 280], [650, 140], [760, 80], [880, 130], [970, 330], [990, 520], [900, 600], [760, 600], [620, 540], [590, 420]], c: [780, 380] },
         bingo:     { poly: [[20, 1330], [90, 1230], [240, 1190], [380, 1250], [440, 1380], [480, 1480], [400, 1560], [270, 1610], [120, 1560], [20, 1480]], c: [250, 1420] },
         blackjack: { poly: [[570, 1320], [640, 1240], [780, 1210], [900, 1280], [960, 1390], [950, 1530], [820, 1600], [700, 1620], [580, 1560], [560, 1420]], c: [770, 1420] } },
    fount: [[500, 662, 66, 26, 595], [505, 918, 96, 38, 835]],
    roads: [[[-80, 560], [260, 730]], [[1080, 550], [780, 700]], [[820, 1125], [450, 1310]], [[-80, 1555], [320, 1755]], [[1080, 1545], [700, 1735]]] },
};

const mapCv = $('#mapCv'), mctx = mapCv.getContext('2d');
const MV = { s: 1, ox: 0, oy: 0, dpr: 1, key: 'h' };
let mapOpen = false, mapHover = null, mapT = 0;
const GRAY = {};   // versión en gris de cada mapa (para los edificios sin comprar)

function grayMap(key) {
  if (GRAY[key] !== undefined) return GRAY[key];
  const im = IMG[MAPS[key].img]; if (!im) return null;
  try {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 0.55; p[i] = l; p[i + 1] = l; p[i + 2] = l * 1.08; }
    x.putImageData(d, 0, 0); GRAY[key] = c;
  } catch (e) { GRAY[key] = null; }
  return GRAY[key];
}

function mapResize() {
  MV.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = mapCv.clientWidth, h = mapCv.clientHeight;
  mapCv.width = w * MV.dpr; mapCv.height = h * MV.dpr;
  MV.key = w / h >= 0.9 ? 'h' : 'v';
  const M = MAPS[MV.key];
  MV.s = Math.max(w / M.W, h / M.H);                 // cubre toda la pantalla
  MV.ox = (w - M.W * MV.s) / 2; MV.oy = (h - M.H * MV.s) / 2;
}
const toMap = (px, py) => [(px - MV.ox) / MV.s, (py - MV.oy) / MV.s];

function inPoly([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function mapHit(px, py) {
  const p = toMap(px, py), B = MAPS[MV.key].b;
  for (const k of Object.keys(B)) if (inPoly(p, B[k].poly)) return k;
  return null;
}

/* ---------- coches ---------- */
let CARS = [];
function spawnCars() {
  CARS = [];
  MAPS[MV.key].roads.forEach((road, i) => {
    for (let n = 0; n < 2; n++) CARS.push({ road: i, t: n * 0.5 + Math.random() * 0.2, kind: Math.floor(Math.random() * 4), speed: 70 + Math.random() * 40, rev: Math.random() < 0.5 });
  });
}
function roadLen(r) { let L = 0; for (let i = 1; i < r.length; i++) L += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return L; }
function updateCars(dt) {
  const roads = MAPS[MV.key].roads;
  for (const c of CARS) {
    c.t += c.speed * dt / roadLen(roads[c.road]);
    if (c.t >= 1) { c.t -= 1; c.kind = Math.floor(Math.random() * 4); c.rev = Math.random() < 0.5; c.speed = 70 + Math.random() * 40; }
  }
}
function drawCar(c) {
  const r = MAPS[MV.key].roads[c.road], [a, b] = c.rev ? [r[1], r[0]] : [r[0], r[1]];
  const x = a[0] + (b[0] - a[0]) * c.t, y = a[1] + (b[1] - a[1]) * c.t;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  // sprites: «f» va hacia abajo-izquierda, «b» hacia arriba-izquierda; espejo para ir a la derecha
  const im = IMG[`car${c.kind}${dy > 0 ? 'f' : 'b'}`]; if (!im) return;
  const w = c.kind === 0 ? 150 : 118, h = im.height * w / im.width;
  const fade = Math.min(1, c.t / 0.12, (1 - c.t) / 0.12);
  mctx.save(); mctx.globalAlpha = Math.max(0, fade);
  mctx.fillStyle = 'rgba(0,0,0,.35)'; mctx.beginPath(); mctx.ellipse(x, y + h * 0.18, w * 0.42, h * 0.22, 0, 0, 7); mctx.fill();
  mctx.translate(x, y + Math.sin(mapT * 20 + c.road) * 0.6); if (dx > 0) mctx.scale(-1, 1);
  mctx.drawImage(im, -w / 2, -h / 2, w, h);
  // faros por la noche
  mctx.globalCompositeOperation = 'lighter';
  const fx = -w * 0.36, fy = dy > 0 ? h * 0.18 : -h * 0.05;
  const gr = mctx.createRadialGradient(fx, fy, 1, fx, fy, 26); gr.addColorStop(0, dy > 0 ? 'rgba(255,245,200,.55)' : 'rgba(255,60,60,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  mctx.fillStyle = gr; mctx.beginPath(); mctx.arc(fx, fy, 26, 0, 7); mctx.fill();
  mctx.restore();
}

/* ---------- fuentes ---------- */
const DROPS = [];
function updateFountains(dt) {
  for (const [x, y, rx, ry, top] of MAPS[MV.key].fount) {
    for (let k = 0; k < 3; k++) if (Math.random() < dt * 40) {
      const an = Math.random() * Math.PI * 2;
      DROPS.push({ x: x + Math.cos(an) * 6, y: top + 6, vx: Math.cos(an) * (25 + Math.random() * 35) * rx / 70, vy: -60 - Math.random() * 70, floor: y + Math.sin(an) * ry * 0.6, life: 2 });
    }
  }
  for (const d of DROPS) { d.vy += 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; if (d.y > d.floor) d.life = 0; }
  for (let i = DROPS.length - 1; i >= 0; i--) if (DROPS[i].life <= 0) DROPS.splice(i, 1);
}
function drawFountains() {
  mctx.save(); mctx.globalCompositeOperation = 'lighter';
  for (const [x, y, rx, ry] of MAPS[MV.key].fount) {
    // ondas en el agua
    for (let k = 0; k < 3; k++) {
      const p = (mapT * 0.6 + k / 3) % 1;
      mctx.strokeStyle = `rgba(190,240,255,${0.45 * (1 - p)})`; mctx.lineWidth = 2;
      mctx.beginPath(); mctx.ellipse(x, y, rx * (0.35 + p * 0.6), ry * (0.35 + p * 0.6), 0, 0, 7); mctx.stroke();
    }
    // brillo del agua
    const gr = mctx.createRadialGradient(x, y, 2, x, y, rx); gr.addColorStop(0, `rgba(120,220,255,${0.18 + 0.08 * Math.sin(mapT * 3)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = gr; mctx.beginPath(); mctx.ellipse(x, y, rx, ry, 0, 0, 7); mctx.fill();
  }
  for (const d of DROPS) { mctx.fillStyle = `rgba(200,245,255,${Math.min(0.9, d.life)})`; mctx.beginPath(); mctx.arc(d.x, d.y, 2.6, 0, 7); mctx.fill(); }
  mctx.restore();
}

/* ---------- dibujo ---------- */
function drawBadge(x, y, txt, sub, locked, hot) {
  mctx.save(); mctx.translate(x, y); const s = hot ? 1.08 : 1; mctx.scale(s, s);
  mctx.font = '900 30px Lilita One, sans-serif'; const w1 = mctx.measureText(txt).width;
  mctx.font = '900 22px Nunito, sans-serif'; const w2 = sub ? mctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 44, h = sub ? 82 : 52;
  mctx.fillStyle = locked ? 'rgba(20,12,40,.88)' : 'rgba(29,12,64,.82)'; mctx.strokeStyle = locked ? '#8a7aa8' : '#ffcf3f'; mctx.lineWidth = 4;
  rr(mctx, -w / 2, -h / 2, w, h, 18); mctx.fill(); mctx.stroke();
  mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  mctx.font = '900 30px Lilita One, sans-serif'; mctx.fillStyle = locked ? '#d8d0ea' : '#ffe27a'; mctx.fillText(txt, 0, sub ? -14 : 1);
  if (sub) { mctx.font = '900 22px Nunito, sans-serif'; mctx.fillStyle = locked ? '#ffcf3f' : '#8ff8a0'; mctx.fillText(sub, 0, 20); }
  mctx.restore();
}
function renderMap(dt) {
  mapT += dt; updateCars(dt); updateFountains(dt);
  const M = MAPS[MV.key], im = IMG[M.img];
  mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#1a0b33'; mctx.fillRect(0, 0, mapCv.width, mapCv.height);
  mctx.setTransform(MV.dpr * MV.s, 0, 0, MV.dpr * MV.s, MV.dpr * MV.ox, MV.dpr * MV.oy);
  if (im) mctx.drawImage(im, 0, 0, M.W, M.H);
  drawFountains();
  CARS.forEach(drawCar);
  // edificios: gris si no son tuyos; brillo al pasar por encima
  const gray = grayMap(MV.key);
  for (const [k, B] of Object.entries(M.b)) {
    const own = hasBuilding(k);
    mctx.save(); mctx.beginPath(); B.poly.forEach(([x, y], i) => (i ? mctx.lineTo(x, y) : mctx.moveTo(x, y))); mctx.closePath();
    if (!own) { mctx.save(); mctx.clip(); if (gray) mctx.drawImage(gray, 0, 0, M.W, M.H); else { mctx.fillStyle = 'rgba(30,30,40,.6)'; mctx.fill(); } mctx.restore(); }
    if (mapHover === k) {
      mctx.globalCompositeOperation = 'lighter'; mctx.fillStyle = own ? 'rgba(255,220,120,.16)' : 'rgba(200,200,255,.10)'; mctx.fill();
      mctx.globalCompositeOperation = 'source-over'; mctx.strokeStyle = own ? '#ffcf3f' : '#b9a8e0'; mctx.lineWidth = 4; mctx.setLineDash([14, 10]); mctx.lineDashOffset = -mapT * 40; mctx.stroke();
    }
    mctx.restore();
  }
  for (const [k, B] of Object.entries(M.b)) {
    const own = hasBuilding(k), hot = mapHover === k, bob = Math.sin(mapT * 2.4 + B.c[0]) * 4;
    if (own) drawBadge(B.c[0], B.c[1] + 40 + bob, '▶ ' + BUILDINGS[k].name, k === 'slot' ? null : `${countRoom(BUILDINGS[k].rooms[0])}/4 mesas`, false, hot);
    else drawBadge(B.c[0], B.c[1] + 40 + bob, '🔒 ' + BUILDINGS[k].name, money(buildingCost(k)), true, hot);
  }
}

/* ---------- abrir / cerrar ---------- */
function showMap() {
  Snd.init();
  started = false; closePanel(); cancelPick(); closeModal();
  $('#menu').classList.add('hidden'); $('#map').classList.remove('hidden');
  mapOpen = true; mapResize(); spawnCars(); updateMapHUD();
}
function hideMap() { mapOpen = false; $('#map').classList.add('hidden'); }
function enterBuilding(k) {
  if (!hasBuilding(k)) { openBuilding(k); return; }
  const last = S.lastRoom && S.lastRoom[k], r = last !== undefined && S.rooms[last] ? last : BUILDINGS[k].rooms[0];
  hideMap(); Snd.play('buy');
  goRoom(r); startGame();
}
function updateMapHUD() {
  $('#mapMoney').textContent = money(S.money);
  $('#mapIncome').textContent = '+' + money(totalPS()) + ' /s';
}
let buildingKey = null;
function openBuilding(k) { buildingKey = k; openModal('building'); }
function buyBuilding(k) {
  if (hasBuilding(k)) return;
  const c = buildingCost(k);
  if (S.money < c) { Snd.play('error'); toast('Necesitas ' + money(c), true); return; }
  S.money -= c; S.buildings[k] = true;
  for (const r of BUILDINGS[k].rooms) S.rooms[r] = true;
  S.gems += 5; Snd.play('level'); toast(`🏛️ ¡${BUILDINGS[k].name} es tuyo! +5◆`);
  save(); closeModal(); enterBuilding(k);
}
function renderBuilding(tabs, body) {
  const k = buildingKey, B = BUILDINGS[k], own = hasBuilding(k), c = buildingCost(k), T = B.table && TYPES[B.table];
  $('#modalTitle').textContent = B.icon + ' ' + B.name.toUpperCase();
  body.innerHTML = `
    <div class="bld">
      <img class="bld-room" src="${A('assets/' + ROOMS[B.rooms[0]].img)}" alt="">
      <div class="bld-info">
        <div class="d" style="font-weight:800;margin-bottom:8px">${B.desc}</div>
        ${T ? `<div class="bld-tables">${[0, 2, 4].map(t => `<img src="${A(`assets/${T.sprite}_${t}.webp`)}" alt="">`).join('')}</div>
        <div class="kv"><span>Mesas</span><b>4 · ${T.name}</b></div>
        <div class="kv"><span>Ingreso base por mesa</span><b>${money(T.base)}/s</b></div>
        <div class="kv"><span>Aspectos</span><b>5 (Nv 10 · 30 · 60 · 100)</b></div>` : ''}
        <button class="btn ${own ? 'btn-blue' : 'btn-gold'}" id="bBld" style="width:100%;margin-top:12px" ${!own && S.money < c ? 'disabled' : ''}>${own ? '▶ Entrar' : 'Comprar · ' + money(c)}</button>
        ${!own && S.money < c ? `<div class="center" style="margin-top:6px;color:#ff7a85;font-weight:800">Te faltan ${money(c - S.money)}</div>` : ''}
      </div>
    </div>`;
  $('#bBld').onclick = () => (own ? (closeModal(), enterBuilding(k)) : buyBuilding(k));
}

mapCv.addEventListener('mousemove', e => { mapHover = mapHit(e.offsetX, e.offsetY); mapCv.style.cursor = mapHover ? 'pointer' : 'default'; });
mapCv.addEventListener('mouseleave', () => (mapHover = null));
mapCv.addEventListener('click', e => {
  Snd.init();
  const k = mapHit(e.offsetX, e.offsetY); if (!k) return;
  Snd.play('click');
  if (hasBuilding(k)) enterBuilding(k); else openBuilding(k);
});
$('#mapMenu').onclick = () => { Snd.play('click'); hideMap(); showMenu(); };
$('#btnMap').onclick = () => { Snd.play('click'); save(); showMap(); };
window.addEventListener('resize', () => { if (mapOpen) { const k = MV.key; mapResize(); if (k !== MV.key) spawnCars(); } });
