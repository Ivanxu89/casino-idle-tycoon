'use strict';
/* Ratón y teclado, acciones del jugador, panel de máquina, modales, objetivos y HUD. Dueño: Iván. */
/* ----------------------------- INPUT ------------------------------ */
function hitTest(px, py) {
  const [x, y] = toRoom(px, py);
  const r = S.room;
  // primero máquinas (las de delante primero)
  const order = [...Array(SPOTS_PER_ROOM).keys()].sort((a, b) => SPOTS[b][1] - SPOTS[a][1]);
  for (const i of order) {
    const m = S.machines[r][i]; if (!m) continue;
    const g = mGeom(i, m);
    if (x > g.x + g.w * 0.08 && x < g.x + g.w * 0.92 && y > g.y && y < g.y + g.h) return i;
  }
  for (const i of order) {
    if (S.machines[r][i]) continue;
    const [sx, sy] = SPOTS[i];
    if (Math.abs(x - sx) / 105 + Math.abs(y - sy) / 60 <= 1.1) return i;
  }
  return -1;
}
cv.addEventListener('mousemove', e => { hover = hitTest(e.offsetX, e.offsetY); cv.style.cursor = hover >= 0 || walkerHit(e.offsetX, e.offsetY) ? 'pointer' : 'default'; });
cv.addEventListener('mouseleave', () => (hover = -1));
cv.addEventListener('click', e => {
  Snd.init();
  const w = walkerHit(e.offsetX, e.offsetY);
  if (w && !pickType) { tapWalker(w); return; }
  const i = hitTest(e.offsetX, e.offsetY);
  if (i < 0) { closePanel(); return; }
  const m = S.machines[S.room][i];
  if (m) { if (pickType) cancelPick(); selected = i; Snd.play('click'); renderPanel(); return; }
  if (pickType) { placeMachine(pickType, i); return; }
  openBuild(i);
});
window.addEventListener('keydown', e => { if (e.key === 'd' && e.ctrlKey && e.shiftKey) debug = !debug; if (e.key === 'Escape') { closeModal(); closePanel(); cancelPick(); } });

/* ----------------------------- ACCIONES ------------------------------ */
function placeMachine(type, i) {
  const r = S.room, c = placeCost(type, r);
  if (S.money < c) { Snd.play('error'); toast('No tienes suficientes monedas', true); return; }
  S.money -= c;
  S.machines[r][i] = { type, level: 1, player: 'student', cycleT: 0, upEnd: 0, upDur: 0 };
  Snd.play('buy');
  const A = rt(r, i); A.bounce = 1; A.flash = 1;
  cancelPick(); closeModal();
  selected = i; renderPanel();
  save();
}
function doUpgrade(i) {
  const r = S.room, m = S.machines[r][i];
  if (!m || m.upEnd || m.level >= MAX_LEVEL) return;
  const c = upgradeCost(m, r);
  if (S.money < c) { Snd.play('error'); toast('Necesitas ' + money(c), true); return; }
  S.money -= c;
  m.upDur = upgradeTime(m, r); m.upEnd = Date.now() + m.upDur * 1000;
  Snd.play('click'); renderPanel();
}
function skipUpgrade(i) {
  const m = S.machines[S.room][i]; if (!m || !m.upEnd) return;
  const g = skipGems((m.upEnd - Date.now()) / 1000);
  if (S.gems < g) { Snd.play('error'); toast('Te faltan gemas', true); return; }
  S.gems -= g; m.upEnd = Date.now(); renderPanel();
}
function setPlayer(i, pid) {
  const m = S.machines[S.room][i];
  if (!S.players[pid]) { openModal('shop', 'players'); return; }
  m.player = pid; Snd.play('click'); renderPanel(); save();
}
function buyPlayer(pid) {
  const P = PLAYERS[pid];
  if (S.players[pid]) return;
  if (S.money < P.cost) { Snd.play('error'); toast('Necesitas ' + money(P.cost), true); return; }
  S.money -= P.cost; S.players[pid] = true; Snd.play('buy'); toast(`🎉 ${P.name} desbloqueado (x${P.mult})`); save(); refreshModal();
}
function buyLicense(id) {
  const T = TYPES[id];
  if (S.licenses[id]) return;
  if (S.money < T.license) { Snd.play('error'); toast('Necesitas ' + money(T.license), true); return; }
  S.money -= T.license; S.licenses[id] = true; Snd.play('buy'); toast(`🎰 Licencia de ${T.name} comprada`); save(); refreshModal();
}
function choose(id) {
  closeModal();
  if (!started) startGame();
  const free = S.machines[S.room].findIndex(x => !x);
  if (free < 0) { toast('Esta sala está llena. Prueba en otra sala.', true); return; }
  pickType = id; $('#pickName').textContent = TYPES[id].name; $('#pickHint').classList.remove('hidden');
}
function cancelPick() { pickType = null; $('#pickHint').classList.add('hidden'); }
function unlockRoom(r) {
  if (S.rooms[r]) return;
  if (!S.rooms[r - 1]) { toast('Desbloquea primero la sala anterior', true); return; }
  if (S.money < ROOMS[r].unlock) { Snd.play('error'); toast('Necesitas ' + money(ROOMS[r].unlock), true); return; }
  S.money -= ROOMS[r].unlock; S.rooms[r] = true; S.gems += 5; Snd.play('level'); toast(`🏛️ ¡${ROOMS[r].name} abierta! +5◆`); save(); refreshModal();
}
function goRoom(r) {
  if (!S.rooms[r]) return;
  S.room = r; selected = -1; FX.floats = []; FX.parts = []; WALK = []; closePanel(); cancelPick(); closeModal(); $('#hRoom').textContent = ROOMS[r].name;
  if (!started) startGame();
  Snd.play('click');
}

/* ----------------------------- UI: PANEL ------------------------------ */
function closePanel() { selected = -1; $('#panel').classList.add('hidden'); resize(); }
let panelSig = '';
function renderPanel() {
  const r = S.room, i = selected, m = S.machines[r][i];
  if (!m) { closePanel(); return; }
  const T = TYPES[m.type], P = PLAYERS[m.player];
  const tier = tierOf(m.level);
  const upg = m.upEnd && m.upEnd > Date.now();
  const maxed = m.level >= MAX_LEVEL;
  const cost = upgradeCost(m, r), dur = upgradeTime(m, r);
  const next = incomePS(m, r, m.level + 1), cur = incomePS(m, r);
  const nextMs = MILESTONES.find(x => x > m.level);
  if ($('#panel').classList.contains('hidden')) { $('#panel').classList.remove('hidden'); resize(); }
  $('#panelBody').innerHTML = `
    <div class="p-head">
      <img src="${A(`assets/${T.sprite}_${tier}.webp`)}" style="${T.hue ? `filter:hue-rotate(${T.hue}deg) drop-shadow(0 4px 6px #0008)` : ''}">
      <div><div class="p-name">${T.name}</div><div class="p-lvl">NIVEL ${m.level}${maxed ? ' (MAX)' : ''}</div>
      <div style="font-size:12px;color:var(--muted);font-weight:800;margin-top:4px">${T.cat === 'slot' ? 'Máquina' : 'Juego de mesa'} · ${ROOMS[r].name}</div></div>
    </div>
    <div class="stat"><span>Ingresos</span><b>${money(cur)}/s</b></div>
    ${maxed ? '' : `<div class="stat"><span>Siguiente nivel</span><span class="up">${money(next)}/s (+${money(next - cur)})</span></div>`}
    <div class="stat"><span>Cliente</span><span>${P.name} <b>x${P.mult}</b></span></div>
    ${T.cat === 'slot' ? '<div class="p-actions"><button class="btn btn-gold" id="bPlay"><span>🎰 Jugar en esta máquina</span><span style="font-size:12px">o doble clic</span></button></div>' : ''}
    <div class="sec-ttl">MEJORA</div>
    ${upg ? `
      <div class="stat"><span>Mejorando a Nv ${m.level + 1}…</span><b id="upLeft">${fmtTime((m.upEnd - Date.now()) / 1000)}</b></div>
      <div class="bar"><i id="upBar" style="width:${(100 * (1 - (m.upEnd - Date.now()) / (m.upDur * 1000))).toFixed(1)}%"></i></div>
      <div class="p-actions"><button class="btn btn-pink" id="bSkip"><span>Acelerar</span><span id="skipCost">${skipGems((m.upEnd - Date.now()) / 1000)} ◆</span></button></div>`
    : maxed ? '<div class="stat"><span>¡Nivel máximo alcanzado!</span></div>' : `
      <div class="p-actions"><button class="btn btn-green" id="bUp" ${S.money < cost ? 'disabled' : ''}><span>Mejorar a Nv ${m.level + 1}</span><span>${money(cost)} · ⏱${fmtTime(dur)}</span></button></div>`}
    <div class="sec-ttl">HITOS (x2 ingresos)</div>
    <div class="milestones">${MILESTONES.map(x => `<span class="ms ${m.level >= x ? 'done' : ''}">Nv ${x}</span>`).join('')}</div>
    ${nextMs ? `<div style="font-size:12px;color:var(--muted);font-weight:800;margin-top:6px">Próximo hito: Nv ${nextMs} → ingresos x2 y +${2 + r}◆. Aspecto nuevo en Nv 25 / 50 / 100.</div>` : ''}
    <div class="sec-ttl">ELIGE CLIENTE</div>
    <div class="pl-grid" id="plGrid"></div>
  `;
  const grid = $('#plGrid');
  for (const [pid, PP] of Object.entries(PLAYERS)) {
    const own = S.players[pid];
    const d = document.createElement('div');
    d.className = 'pl-card' + (m.player === pid ? ' sel' : '') + (own ? '' : ' locked');
    d.appendChild(portrait(pid, 90));
    d.insertAdjacentHTML('beforeend', `<div>${PP.name}</div><div class="m">${own ? 'x' + PP.mult : money(PP.cost)}</div>${own ? '' : '<span class="lock">🔒</span>'}`);
    d.onclick = () => setPlayer(i, pid);
    grid.appendChild(d);
  }
  const bUp = $('#bUp'); if (bUp) bUp.onclick = () => doUpgrade(i);
  const bSkip = $('#bSkip'); if (bSkip) bSkip.onclick = () => skipUpgrade(i);
  const bPlay = $('#bPlay'); if (bPlay) bPlay.onclick = () => enterSlot(i);
  panelSig = sigOf(m);
}
const sigOf = m => `${m.level}|${!!(m.upEnd && m.upEnd > Date.now())}|${m.player}`;
function updatePanelLive() {
  if (selected < 0) return;
  const m = S.machines[S.room][selected]; if (!m) return;
  if (sigOf(m) !== panelSig) { renderPanel(); return; }
  const bUp = $('#bUp'); if (bUp) bUp.disabled = S.money < upgradeCost(m, S.room);
  if (m.upEnd) {
    const left = (m.upEnd - Date.now()) / 1000;
    const a = $('#upLeft'), b = $('#upBar'), c = $('#skipCost');
    if (a) a.textContent = fmtTime(Math.max(0, left));
    if (b) b.style.width = (100 * (1 - left / m.upDur)).toFixed(1) + '%';
    if (c) c.textContent = skipGems(left) + ' ◆';
  }
}

/* ----------------------------- UI: MODALES ------------------------------ */
let modalKind = null, modalTab = null, buildSpot = -1;
function openModal(kind, tab) {
  Snd.init(); Snd.play('click');
  modalKind = kind; modalTab = tab || (kind === 'shop' ? 'slot' : null);
  $('#modal').classList.remove('hidden');
  refreshModal();
}
function closeModal() { $('#modal').classList.add('hidden'); modalKind = null; buildSpot = -1; }
function openBuild(i) { buildSpot = i; openModal('build'); }

function refreshModal() {
  if (!modalKind) return;
  const tabs = $('#modalTabs'), body = $('#modalBody');
  tabs.innerHTML = ''; body.innerHTML = '';
  if (modalKind === 'shop') {
    $('#modalTitle').textContent = 'ELEGIR / COMPRAR';
    [['slot', '🎰 Máquinas'], ['table', '🃏 Juegos'], ['players', '🧑 Jugadores']].forEach(([k, l]) => {
      const b = document.createElement('button'); b.className = 'tab' + (modalTab === k ? ' on' : ''); b.textContent = l;
      b.onclick = () => { modalTab = k; Snd.play('click'); refreshModal(); }; tabs.appendChild(b);
    });
    const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
    if (modalTab === 'players') {
      for (const [pid, P] of Object.entries(PLAYERS)) {
        const own = S.players[pid];
        const c = document.createElement('div'); c.className = 'card' + (own ? ' owned' : ' locked');
        const im = document.createElement('div'); im.className = 'img'; im.appendChild(portrait(pid, 130)); c.appendChild(im);
        c.insertAdjacentHTML('beforeend', `
          ${own ? '<span class="tag">DESBLOQUEADO</span>' : ''}
          <h3>${P.name}</h3>
          <span class="wealth" style="background:${P.wc};color:#12062a">${P.wealth}</span>
          <div class="d">${P.desc}</div>
          <div class="kv"><span>Multiplicador</span><b>x${P.mult}</b></div>`);
        const b = document.createElement('button');
        b.className = 'btn ' + (own ? 'btn-dark' : 'btn-gold'); b.textContent = own ? 'Asignar desde una máquina' : 'Desbloquear ' + money(P.cost);
        if (own) b.disabled = true; else { b.disabled = S.money < P.cost; b.onclick = () => buyPlayer(pid); }
        c.appendChild(b); cards.appendChild(c);
      }
    } else {
      for (const [id, T] of Object.entries(TYPES)) {
        if (T.cat !== modalTab) continue;
        const own = S.licenses[id];
        const c = document.createElement('div'); c.className = 'card' + (own ? ' owned' : ' locked');
        c.innerHTML = `
          ${own ? '<span class="tag">LICENCIA</span>' : ''}
          <div class="img"><img src="${A(`assets/${T.sprite}_1.webp`)}" style="${T.hue ? `filter:hue-rotate(${T.hue}deg) drop-shadow(0 4px 8px #000a)` : ''}"></div>
          <h3>${T.name}</h3><div class="d">${T.desc}</div>
          <div class="kv"><span>Ingreso base</span><b>${money(T.base)}/s</b></div>
          <div class="kv"><span>Colocar (sala actual)</span><b>${money(placeCost(id, S.room))}</b></div>`;
        const b = document.createElement('button');
        if (own) { b.className = 'btn btn-green'; b.textContent = 'Elegir y colocar'; b.onclick = () => choose(id); }
        else { b.className = 'btn btn-gold'; b.textContent = 'Licencia ' + money(T.license); b.disabled = S.money < T.license; b.onclick = () => buyLicense(id); }
        c.appendChild(b); cards.appendChild(c);
      }
    }
  } else if (modalKind === 'build') {
    $('#modalTitle').textContent = 'COLOCAR EN ' + ROOMS[S.room].name.toUpperCase();
    const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
    for (const [id, T] of Object.entries(TYPES)) {
      const own = S.licenses[id], c = placeCost(id, S.room);
      const d = document.createElement('div'); d.className = 'card' + (own ? '' : ' locked');
      d.innerHTML = `<div class="img"><img src="${A(`assets/${T.sprite}_0.webp`)}" style="${T.hue ? `filter:hue-rotate(${T.hue}deg)` : ''}"></div>
        <h3>${T.name}</h3><div class="kv"><span>Ingreso Nv1</span><b>${money(T.base * ROOMS[S.room].inc)}/s</b></div>`;
      const b = document.createElement('button');
      if (own) { b.className = 'btn btn-green'; b.textContent = 'Colocar ' + money(c); b.disabled = S.money < c; b.onclick = () => placeMachine(id, buildSpot); }
      else { b.className = 'btn btn-dark'; b.textContent = '🔒 Licencia ' + money(T.license); b.onclick = () => { modalKind = 'shop'; modalTab = T.cat; refreshModal(); }; }
      d.appendChild(b); cards.appendChild(d);
    }
  } else if (modalKind === 'rooms') {
    $('#modalTitle').textContent = 'SALAS';
    const cards = document.createElement('div'); cards.className = 'cards'; body.appendChild(cards);
    ROOMS.forEach((R, r) => {
      const own = S.rooms[r];
      const c = document.createElement('div'); c.className = 'card room-card' + (own ? ' owned' : ' locked') + (S.room === r ? ' cur' : '');
      c.innerHTML = `${own ? `<span class="tag">${S.room === r ? 'AQUÍ ESTÁS' : 'ABIERTA'}</span>` : ''}
        <div class="img"><img src="${A('assets/' + R.img)}"></div>
        <h3>${r + 1}. ${R.name}</h3><div class="d">${R.desc}</div>
        <div class="kv"><span>Ingresos</span><b>x${R.inc}</b></div>
        <div class="kv"><span>Coste de mejoras</span><b style="color:#ff7a85">x${fmt(R.cost)}</b></div>
        <div class="kv"><span>Tiempo de mejoras</span><b style="color:#ff7a85">x${R.time}</b></div>
        <div class="kv"><span>Máquinas</span><b>${countRoom(r)}/${SPOTS_PER_ROOM}</b></div>`;
      const b = document.createElement('button');
      if (own) { b.className = 'btn btn-blue'; b.textContent = S.room === r ? 'Jugar aquí' : 'Ir a la sala'; b.onclick = () => goRoom(r); }
      else { b.className = 'btn btn-gold'; b.textContent = 'Abrir ' + money(R.unlock); b.disabled = S.money < R.unlock || !S.rooms[r - 1]; b.onclick = () => unlockRoom(r); }
      c.appendChild(b); cards.appendChild(c);
    });
  } else if (modalKind === 'sound') {
    $('#modalTitle').textContent = 'SONIDO';
    body.innerHTML = `
      <div class="snd-row"><label>🎵 Música</label><input type="range" id="sMus" min="0" max="1" step="0.05" value="${S.sound.music}"><output id="oMus">${Math.round(S.sound.music * 100)}%</output></div>
      <div class="snd-row"><label>🔔 Efectos</label><input type="range" id="sSfx" min="0" max="1" step="0.05" value="${S.sound.sfx}"><output id="oSfx">${Math.round(S.sound.sfx * 100)}%</output></div>
      <div class="snd-row"><label>🔇 Silencio</label><button class="btn ${S.sound.muted ? 'btn-red' : 'btn-green'}" id="sMute">${S.sound.muted ? 'ACTIVADO' : 'DESACTIVADO'}</button></div>
      <div class="center" style="margin-top:24px"><button class="btn btn-dark btn-sm" id="sReset">Borrar partida</button></div>`;
    $('#sMus').oninput = e => { S.sound.music = +e.target.value; $('#oMus').textContent = Math.round(S.sound.music * 100) + '%'; Snd.apply(); };
    $('#sSfx').oninput = e => { S.sound.sfx = +e.target.value; $('#oSfx').textContent = Math.round(S.sound.sfx * 100) + '%'; Snd.apply(); };
    $('#sSfx').onchange = () => Snd.play('coin');
    $('#sMute').onclick = () => { S.sound.muted = !S.sound.muted; Snd.apply(); refreshModal(); save(); };
    $('#sReset').onclick = e => {
      if (!e.target.dataset.armed) { e.target.dataset.armed = '1'; e.target.textContent = '⚠️ ¿Seguro? Pulsa otra vez para borrar'; e.target.className = 'btn btn-red btn-sm'; return; }
      try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
      S = freshState(); RT.clear(); WALK = []; closeModal(); closePanel(); goRoom(0); save();
    };
  } else if (modalKind === 'prestige') {
    $('#modalTitle').textContent = '👑 VENDER EL CASINO';
    const g = chipsToGain(), chips = S.chips || 0, after = 1 + CHIP_BONUS * (chips + g);
    body.innerHTML = `
      <div class="prest">
        <div class="prest-col">
          <div class="stat"><span>Fichas de prestigio</span><b>${fmt(chips)}</b></div>
          <div class="stat"><span>Bonus actual</span><b>x${prestigeMult().toFixed(1)} ingresos</b></div>
          <div class="stat"><span>Ganado en esta partida</span><b>${money(S.runEarned || 0)}</b></div>
          <div class="stat"><span>Siguiente ficha al ganar</span><b>${money(nextChipAt())}</b></div>
          <div class="stat"><span>Veces vendido</span><b>${S.prestiges || 0}</b></div>
        </div>
        <div class="prest-col center">
          <div style="font-weight:800">Si vendes ahora recibes</div>
          <div class="offline-amt">+${fmt(g)} 👑</div>
          <div style="font-weight:800">Bonus tras vender: <b style="color:var(--green)">x${after.toFixed(1)}</b> en todas las máquinas</div>
          <button class="btn btn-gold" id="bPrest" style="margin-top:14px;width:100%" ${g < 1 ? 'disabled' : ''}>${g < 1 ? 'Gana ' + money(1e6) + ' para vender' : Date.now() < prestigeArmUntil ? '⚠️ ¿Seguro? Pulsa otra vez' : 'Vender por ' + fmt(g) + ' fichas'}</button>
        </div>
      </div>
      <div class="prest-info">
        <div><b style="color:#ff7a85">Se pierde:</b> dinero, máquinas, salas, licencias y jugadores desbloqueados.</div>
        <div><b style="color:var(--green)">Se conserva:</b> fichas 👑 (cada una +${CHIP_BONUS * 100}% ingresos para siempre), gemas ◆, objetivos y ajustes.</div>
        <div style="color:var(--muted)">Consejo: vende cuando tu progreso se frene; volverás mucho más rápido hasta donde estabas.</div>
      </div>`;
    $('#bPrest').onclick = doPrestige;
  } else if (modalKind === 'offline') {
    $('#modalTitle').textContent = '¡BIENVENIDO DE NUEVO!';
    const { amt, secs } = offlineData;
    body.innerHTML = `<div class="center" style="font-weight:800">Mientras no estabas (${fmtTime(secs)}) tu casino ganó:</div>
      <div class="offline-amt">${money(amt)}</div>
      <div class="center" style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-green" id="oCol">Recoger</button>
        <button class="btn btn-pink" id="oX2" ${S.gems < 5 ? 'disabled' : ''}>x2 por 5 ◆</button></div>`;
    $('#oCol').onclick = () => { earn(amt); Snd.play('win'); closeModal(); };
    $('#oX2').onclick = () => { if (S.gems < 5) return; S.gems -= 5; earn(amt * 2); Snd.play('win'); closeModal(); };
  }
}
$('#modalClose').onclick = closeModal;
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && modalKind !== 'offline') closeModal(); });
$$('[data-open]').forEach(b => (b.onclick = () => openModal(b.dataset.open)));
$('#panelClose').onclick = closePanel;
$('#pickCancel').onclick = cancelPick;

function updateGoal() {
  const G = GOALS[S.goal];
  if (!G) { $('#goalTxt').textContent = '¡Eres el rey del casino! 👑'; $('#goalBtn').classList.add('hidden'); return; }
  $('#goalTxt').textContent = G.t;
  const ok = G.ok();
  $('#goalBtn').classList.toggle('hidden', !ok);
  $('#goalGems').textContent = '+' + G.g + '◆';
}
$('#goalBtn').onclick = () => { const G = GOALS[S.goal]; if (!G || !G.ok()) return; S.gems += G.g; S.goal++; Snd.play('win'); updateGoal(); save(); };

/* ----------------------------- TOASTS / HUD ------------------------------ */
function toast(msg, bad) {
  const d = document.createElement('div'); d.className = 'toast' + (bad ? ' bad' : ''); d.textContent = msg;
  $('#toasts').appendChild(d); setTimeout(() => d.remove(), 2600);
}
function updateHUD() {
  $('#hMoney').textContent = money(S.money);
  $('#hIncome').textContent = '+' + money(totalPS()) + ' /s';
  $('#hGems').textContent = S.gems;
  $('#hChips').textContent = `${S.chips || 0} · x${prestigeMult().toFixed(1)}`;
  const g = chipsToGain();
  $('#btnPrestige').classList.toggle('ready', g >= 1);
  $('#prestigeBadge').textContent = g >= 1 ? '+' + fmt(g) : '';
}
