'use strict';
/* Bucle principal y arranque. Se carga el último. */
/* =====================================================================
   CASINO IDLE TYCOON — prototipo jugable
   - Monedas para colocar máquinas, mejoras con coste y tiempo crecientes
   - 5 salas con dificultad creciente (coste sube más rápido que ingreso)
   - Jugadores (clientes) con multiplicador según riqueza, desbloqueables
   - Vista isométrica, slots animados, sonido sintetizado (WebAudio)
   ===================================================================== */

/* ----------------------------- BUCLE ------------------------------ */
function payout(r, i, m, amount) {
  earn(amount);
  if (r !== S.room) return;
  const A = rt(r, i), g = mGeom(i, m), T = TYPES[m.type];
  A.bounce = 1; A.flash = 1; A.cheer = 1;
  FX.floats.push({ x: g.sx, y: g.y - 60, txt: '+' + money(amount), col: '#ffe27a', size: 34, life: 1.2, vy: -70 });
  const n = Math.min(6, 2 + Math.floor(Math.log10(amount + 1)));
  for (let k = 0; k < n; k++) FX.parts.push({ x: g.sx, y: g.y + g.h * 0.3, vx: (Math.random() - 0.5) * 260, vy: -300 - Math.random() * 200, life: 1, rot: Math.random() * 6 });
  if (T.cat === 'slot') Snd.play('coin'); else Snd.play('coin');
}
function startPlayAnim(r, i, m) {
  if (r !== S.room) return;
  const A = rt(r, i), T = TYPES[m.type];
  if (T.cat === 'slot') { A.spin = 1.1; if (Math.random() < 0.35) Snd.play('spin'); }
  else if (m.type === 'craps') { A.dice = 1; Snd.play('dice'); }
  else { A.card = 1; Snd.play('card'); }
}

function tick(dt) {
  time += dt;
  const now = Date.now();
  S.machines.forEach((row, r) => row.forEach((m, i) => {
    if (!m) return;
    const T = TYPES[m.type];
    const animLead = T.cat === 'slot' ? 1.1 : 0.8;
    const before = m.cycleT;
    m.cycleT += dt;
    if (before < T.cycle - animLead && m.cycleT >= T.cycle - animLead) startPlayAnim(r, i, m);
    if (m.cycleT >= T.cycle) {
      m.cycleT -= T.cycle;
      payout(r, i, m, incomePS(m, r) * T.cycle);
    }
    if (m.upEnd && now >= m.upEnd) finishUpgrade(r, i, m);
  }));
  for (const A of RT.values()) {
    A.evolve = Math.max(0, (A.evolve || 0) - dt * 0.55);
    A.spin = Math.max(0, A.spin - dt); A.bounce = Math.max(0, A.bounce - dt * 3); A.flash = Math.max(0, A.flash - dt * 1.5);
    A.cheer = Math.max(0, A.cheer - dt * 1.2); A.dice = Math.max(0, A.dice - dt * 1.25); A.card = Math.max(0, A.card - dt * 1.25);
  }
  updateWalkers(dt);
  updateGift(); updateGuard(dt);
  FX.floats = FX.floats.filter(f => (f.life -= dt) > 0); FX.floats.forEach(f => (f.y += f.vy * dt));
  FX.parts = FX.parts.filter(p => (p.life -= dt * 1.1) > 0);
  FX.parts.forEach(p => { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 10; });
}

function finishUpgrade(r, i, m) {
  m.level++; m.upEnd = 0;
  const ms = MILESTONES.includes(m.level);
  if (ms) { S.gems += 2 + r; }
  if (r === S.room) {
    const A = rt(r, i); A.bounce = 1; A.flash = 1; A.cheer = 1;
    const g = mGeom(i, m);
    FX.floats.push({ x: g.sx, y: g.y - 100, txt: ms ? `¡HITO! x2  +${2 + r}◆` : `¡Nivel ${m.level}!`, col: ms ? '#ff7ae5' : '#4fe3ff', size: ms ? 40 : 34, life: 1.6, vy: -50 });
    Snd.play(ms ? 'level' : 'upgrade');
  }
  if (tierOf(m.level) !== tierOf(m.level - 1)) evolveMachine(r, i, m);
  if (selected === i && r === S.room) renderPanel();
}

/* ----------------------------- ARRANQUE ------------------------------ */
let started = false, last = performance.now(), offlineData = null, hudT = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  tick(dt);
  if (started) {
    render();
    hudT += dt;
    if (hudT > 0.2) { hudT = 0; updateHUD(); updatePanelLive(); updateGoal(); if (modalKind && modalKind !== 'sound' && modalKind !== 'offline') refreshButtons(); }
  }
  requestAnimationFrame(frame);
}
// actualizar solo el estado "disabled" de botones de compra en modales abiertos
function refreshButtons() {
  if (refreshButtons._m === S.money) return; refreshButtons._m = S.money;
  if (refreshButtons._t && performance.now() - refreshButtons._t < 1000) return;
  refreshButtons._t = performance.now();
  const sc = $('#modalBody').scrollTop; refreshModal(); $('#modalBody').scrollTop = sc;
}
function startGame() {
  started = true;
  $('#menu').classList.add('hidden');
  $('#hRoom').textContent = ROOMS[S.room].name;
  resize();
  if (dailyState().can && !modalKind) openModal('missions', 'daily'); // recompensa diaria al entrar
}
function showMenu() {
  started = false; closePanel(); cancelPick();
  $('#menu').classList.remove('hidden');
  $('#menuStats').textContent = `Dinero: ${money(S.money)} · Ingresos: ${money(totalPS())}/s · Salas: ${S.rooms.filter(Boolean).length}/${ROOMS.length} · 👑 ${S.chips || 0}`;
}
$('#mPlay').onclick = () => { Snd.init(); Snd.play('buy'); startGame(); };
$('#btnHome').onclick = () => { Snd.play('click'); save(); showMenu(); };
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', save);
setInterval(save, 5000);

(async function boot() {
  load();
  giveTestBonus();
  await loadAssets();
  // ganancias offline (50% durante máx. 4h)
  const secs = Math.min((Date.now() - S.lastSave) / 1000, 4 * 3600);
  const amt = totalPS() * secs * 0.5;
  if (secs > 60 && amt > 0) { offlineData = { amt, secs }; }
  showMenu();
  resize();
  updateHUD(); updateGoal();
  requestAnimationFrame(frame);
  if (offlineData) openModal('offline');
})();
