'use strict';
/* Jugar dentro de una tragaperras: doble clic sobre una máquina de tipo slot → la cámara entra en ella
   y se abre la slot real en primera persona. Cada slot es un HTML propio (carpeta slots/) dentro de un iframe.
   El saldo de la slot es el dinero del casino: se sincroniza por postMessage (slotsim:balance / slotsim:close).
   Mientras juegas, tus máquinas siguen produciendo y ese dinero se suma aparte. Dueño: Iván. */

const SLOT_GAMES = {
  'happy-dinner': { name: 'Happy Dinner', file: 'slots/happy-dinner.html' },
};
// Qué slot abre cada tipo de tragaperras del casino (de momento todas abren Happy Dinner)
const SLOT_FOR_TYPE = { lucky: 'happy-dinner', emerald: 'happy-dinner', sapphire: 'happy-dinner', amethyst: 'happy-dinner' };
const ZOOM_MS = 650;

let slotSess = null; // { id, frame, start, bal, offset, idle, timer }

// En la versión de un solo archivo la slot viaja incrustada (base64) en window.SLOT_HTML
function slotSource(id) {
  const b64 = window.SLOT_HTML && window.SLOT_HTML[id];
  if (!b64) return null;
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function enterSlot(i) {
  const m = S.machines[S.room][i];
  if (!m || slotSess) return;
  if (TYPES[m.type].cat !== 'slot') { toast('Las mesas se podrán jugar más adelante'); return; }
  const id = SLOT_FOR_TYPE[m.type], G = SLOT_GAMES[id];
  closePanel(); cancelPick(); closeModal();

  // cámara: zoom hacia la ventana de rodillos de la máquina
  const g = mGeom(i, m);
  cv.style.transformOrigin = `${view.ox + (g.x + g.w * 0.46) * view.s}px ${view.oy + (g.y + g.h * 0.36) * view.s}px`;
  document.body.classList.add('in-slot');
  Snd.play('spin'); Snd.duck(true);

  const bal = Math.floor(S.money);
  slotSess = { id, start: bal, bal, offset: S.money - bal, idle: 0, frame: null, timer: 0 };
  earnHook = v => { if (slotSess) slotSess.idle += v; };

  // el iframe empieza a cargar durante el zoom; recibe el saldo por window.name
  const fr = document.createElement('iframe');
  fr.className = 'slot-frame'; fr.title = G.name;
  fr.name = JSON.stringify({ balance: bal, embedded: true });
  const inline = slotSource(id);
  if (inline) fr.srcdoc = inline; else fr.src = G.file;
  slotSess.frame = fr;
  $('#slotName').textContent = G.name + ' · ' + TYPES[m.type].name;
  $('#slotHost').appendChild(fr);
  updateSlotBar();

  slotSess.timer = setTimeout(() => {
    $('#slotView').classList.remove('hidden');
    requestAnimationFrame(() => $('#slotView').classList.add('on'));
    fr.focus();
  }, ZOOM_MS);
}

function exitSlot() {
  if (!slotSess) return;
  const s = slotSess; slotSess = null; earnHook = null;
  clearTimeout(s.timer);
  const view$ = $('#slotView');
  view$.classList.remove('on');
  setTimeout(() => { view$.classList.add('hidden'); $('#slotHost').innerHTML = ''; }, 350);
  document.body.classList.remove('in-slot');
  Snd.duck(false); Snd.play('click');
  const net = s.bal - s.start;
  toast(net === 0 ? 'Has salido de ' + SLOT_GAMES[s.id].name
    : (net > 0 ? '🎉 Has ganado ' : 'Has perdido ') + money(Math.abs(net)) + ' en ' + SLOT_GAMES[s.id].name, net < 0);
  save();
}

function updateSlotBar() {
  if (!slotSess) return;
  const net = slotSess.bal - slotSess.start;
  $('#slotNet').textContent = (net >= 0 ? '+' : '−') + money(Math.abs(net));
  $('#slotNet').className = net >= 0 ? 'up' : 'down';
  $('#slotIdle').textContent = '+' + money(slotSess.idle);
}

window.addEventListener('message', e => {
  if (!slotSess || !slotSess.frame || e.source !== slotSess.frame.contentWindow) return;
  const d = e.data || {};
  if (d.type === 'slotsim:balance' && typeof d.payload === 'number') {
    slotSess.bal = d.payload;
    S.money = d.payload + slotSess.offset + slotSess.idle;
    updateSlotBar();
  } else if (d.type === 'slotsim:close') exitSlot();
});

cv.addEventListener('dblclick', e => {
  const i = hitTest(e.offsetX, e.offsetY);
  if (i >= 0 && S.machines[S.room][i]) enterSlot(i);
});
$('#slotExit').onclick = exitSlot;
setInterval(updateSlotBar, 500);
