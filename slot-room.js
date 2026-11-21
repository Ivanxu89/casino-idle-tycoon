'use strict';
/* Jugar dentro de una tragaperras: doble clic sobre una máquina de tipo slot → la cámara entra en ella
   y se abre la slot real en primera persona. Cada slot es un HTML propio (carpeta slots/) dentro de un iframe.
   El saldo de la slot es el dinero del casino: se sincroniza por postMessage (slotsim:balance / slotsim:close).
   Mientras juegas, tus máquinas siguen produciendo y ese dinero se suma aparte. Dueño: Iván. */

const SLOT_GAMES = {
  'happy-dinner': { name: 'Happy Dinner', file: 'slots/happy-dinner.html', icon: 'assets/slot_icon_happy-dinner.webp', info: '5×3 · 20 líneas · giros gratis' },
};
// Lo que se ve en el submenú. De momento solo hay una slot: se repite para ver cómo queda el menú lleno.
const SLOT_LOBBY = Array.from({ length: 12 }, (_, i) => ({ id: 'happy-dinner', badge: i === 0 ? 'NUEVA' : '' }));
const ZOOM_MS = 650;

let slotSess = null; // { machine, id, frame, net, idle, bal, timer }

// En la versión de un solo archivo la slot viaja incrustada (base64) en window.SLOT_HTML
function slotSource(id) {
  const b64 = window.SLOT_HTML && window.SLOT_HTML[id];
  if (!b64) return null;
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Entrar en la máquina: zoom de cámara y, al terminar, el submenú para elegir slot
function enterSlot(i) {
  const m = S.machines[S.room][i];
  if (!m || slotSess) return;
  if (TYPES[m.type].cat !== 'slot') { toast('Las mesas se podrán jugar más adelante'); return; }
  closePanel(); cancelPick(); closeModal();
  const g = mGeom(i, m);
  cv.style.transformOrigin = `${view.ox + (g.x + g.w * 0.46) * view.s}px ${view.oy + (g.y + g.h * 0.36) * view.s}px`;
  document.body.classList.add('in-slot');
  Snd.play('spin'); Snd.duck(true);
  slotSess = { machine: TYPES[m.type].name, id: null, frame: null, net: 0, idle: 0, bal: 0, timer: 0 };
  earnHook = v => { if (slotSess) slotSess.idle += v; };
  showLobby();
  slotSess.timer = setTimeout(() => {
    $('#slotView').classList.remove('hidden');
    requestAnimationFrame(() => $('#slotView').classList.add('on'));
  }, ZOOM_MS);
}

// Submenú: rejilla de slots con scroll
function showLobby() {
  if (!slotSess) return;
  slotSess.id = null; slotSess.frame = null;
  $('#slotName').textContent = slotSess.machine;
  const host = $('#slotHost');
  host.innerHTML = `<div class="slot-lobby">
      <div class="lobby-head"><h2>Elige tu slot</h2><p>Juegas con el dinero de tu casino. Tus máquinas siguen produciendo mientras tanto.</p></div>
      <div class="slot-grid">${SLOT_LOBBY.map((e, k) => { const G = SLOT_GAMES[e.id]; return `
        <button class="slot-tile" data-k="${k}">
          <img src="${A(G.icon)}" alt="">
          ${e.badge ? `<span class="slot-badge">${e.badge}</span>` : ''}
          <span class="slot-tname">${G.name}</span>
          <span class="slot-tinfo">${G.info}</span>
          <span class="slot-play">▶ JUGAR</span>
        </button>`; }).join('')}</div>
    </div>`;
  host.classList.add('lobby');
  host.querySelectorAll('.slot-tile').forEach(b => (b.onclick = () => launchSlot(SLOT_LOBBY[+b.dataset.k].id)));
  updateSlotBar();
}

// Abrir la slot elegida: recibe el dinero del casino como saldo (window.name)
function launchSlot(id) {
  if (!slotSess) return;
  const G = SLOT_GAMES[id];
  Snd.play('click');
  slotSess.id = id; slotSess.bal = Math.floor(S.money);
  const fr = document.createElement('iframe');
  fr.className = 'slot-frame'; fr.title = G.name;
  fr.name = JSON.stringify({ balance: slotSess.bal, embedded: true });
  const inline = slotSource(id);
  if (inline) fr.srcdoc = inline; else fr.src = G.file;
  slotSess.frame = fr;
  const host = $('#slotHost'); host.classList.remove('lobby'); host.innerHTML = ''; host.appendChild(fr);
  $('#slotName').textContent = G.name + ' · ' + slotSess.machine;
  fr.focus(); updateSlotBar();
}

function exitSlot() {
  if (!slotSess) return;
  const s = slotSess; slotSess = null; earnHook = null;
  clearTimeout(s.timer);
  const view$ = $('#slotView');
  view$.classList.remove('on');
  setTimeout(() => { view$.classList.add('hidden'); $('#slotHost').innerHTML = ''; $('#slotHost').classList.remove('lobby'); }, 350);
  document.body.classList.remove('in-slot');
  Snd.duck(false); Snd.play('click');
  const net = s.net;
  toast(net === 0 ? 'Has salido de ' + s.machine
    : (net > 0 ? '🎉 Has ganado ' : 'Has perdido ') + money(Math.abs(net)) + ' jugando en ' + s.machine, net < 0);
  save();
}

function updateSlotBar() {
  if (!slotSess) return;
  const net = slotSess.net;
  $('#slotNet').textContent = (net >= 0 ? '+' : '−') + money(Math.abs(net));
  $('#slotNet').className = net >= 0 ? 'up' : 'down';
  $('#slotIdle').textContent = '+' + money(slotSess.idle);
}

window.addEventListener('message', e => {
  if (!slotSess || !slotSess.frame || e.source !== slotSess.frame.contentWindow) return;
  const d = e.data || {};
  if (d.type === 'slotsim:balance' && typeof d.payload === 'number') {
    // se aplica la diferencia: así el dinero que siguen produciendo tus máquinas no se pisa
    const delta = d.payload - slotSess.bal;
    slotSess.bal = d.payload; slotSess.net += delta; S.money = Math.max(0, S.money + delta);
    updateSlotBar();
  } else if (d.type === 'slotsim:close') showLobby(); // la ✕ de la slot vuelve al submenú
});

cv.addEventListener('dblclick', e => {
  const i = hitTest(e.offsetX, e.offsetY);
  if (i >= 0 && S.machines[S.room][i]) enterSlot(i);
});
$('#slotExit').onclick = exitSlot;
setInterval(updateSlotBar, 500);
