'use strict';
/* Anfitrión: el presentador del casino en primer plano con un bocadillo de texto.
   Host.say(pasos, alTerminar) muestra una secuencia de mensajes; cada paso es { t: 'texto', pose: 'wave'|'talk'|'ok' }.
   Ahora se usa para la bienvenida; más adelante servirá para el tutorial. Dueño: Iván.
   Hoja assets/host.webp: 4 fotogramas de 420x760 → 0 presentar · 1 y 2 saludar · 3 pulgar arriba (guiño). */

const Host = (() => {
  const el = document.createElement('div');
  el.id = 'host'; el.className = 'host hidden';
  el.innerHTML = `<div class="host-fig"><div class="host-spr"></div></div>
    <div class="host-bub"><div class="host-name">Tu anfitrión</div><div class="host-txt"></div>
    <div class="host-btns"><button class="btn btn-dark btn-sm host-skip">Saltar</button><button class="btn btn-gold host-next">Siguiente ▶</button></div></div>`;
  document.body.appendChild(el);
  const spr = el.querySelector('.host-spr'), txt = el.querySelector('.host-txt'), next = el.querySelector('.host-next'), skip = el.querySelector('.host-skip');
  let steps = [], i = 0, done = null, typing = 0, full = '', pose = 'talk', t0 = 0, raf = 0;

  const frameFor = t => {
    if (pose === 'wave') return Math.floor(t / 0.32) % 2 ? 2 : 1;
    if (pose === 'ok') return 3;
    return 0;
  };
  function loop(now) {
    const t = (now - t0) / 1000;
    spr.style.backgroundPosition = `${frameFor(t) * 100 / 3}% 0`;
    // respira y se balancea un poco; al hablar, botecitos
    const talking = typing < full.length;
    spr.style.transform = `translateY(${(talking ? -Math.abs(Math.sin(t * 9)) * 6 : Math.sin(t * 2) * 3).toFixed(1)}px) rotate(${(Math.sin(t * 1.6) * 1.2).toFixed(2)}deg)`;
    if (talking) { typing = Math.min(full.length, typing + 1.4); txt.textContent = full.slice(0, Math.floor(typing)); }
    raf = requestAnimationFrame(loop);
  }
  function show() {
    const S0 = steps[i];
    full = S0.t; typing = 0; pose = S0.pose || 'talk'; txt.textContent = '';
    next.textContent = i === steps.length - 1 ? (S0.btn || '¡A jugar! ▶') : 'Siguiente ▶';
    skip.classList.toggle('hidden', i === steps.length - 1);
    Snd.play('click');
  }
  function advance() {
    if (typing < full.length) { typing = full.length; txt.textContent = full; return; }   // primero, completa el texto
    if (++i < steps.length) show(); else close();
  }
  function close() {
    el.classList.add('hidden'); cancelAnimationFrame(raf);
    const f = done; done = null; if (f) f();
  }
  next.onclick = advance; skip.onclick = close;
  el.querySelector('.host-fig').onclick = advance;
  return {
    say(list, onDone) {
      steps = list; i = 0; done = onDone;
      spr.style.backgroundImage = `url(${A('assets/host.webp')})`;
      el.classList.remove('hidden'); t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
      show();
    },
    get open() { return !el.classList.contains('hidden'); },
  };
})();

// Bienvenida a cada edificio: la primera vez que entras en él (en cada partida desde cero)
const ROOM_WELCOME = {
  slot: [
    { pose: 'wave', t: '¡Bienvenido a MundiSlot, el reino de las tragaperras! 🎰' },
    { pose: 'talk', t: 'Toca un hueco con el ➕ del suelo para colocar tu primera Lucky 7. Cada vez que gire, ganarás monedas.' },
    { pose: 'talk', t: 'Toca una máquina para mejorarla y sentar a un cliente: los clientes más ricos apuestan más.' },
    { pose: 'ok', t: '¡Llena la sala y abre las siguientes con las flechas de los lados!', btn: '¡Vamos! ▶' },
  ],
  bingo: [
    { pose: 'wave', t: '¡Bienvenido a MundiBingo! 🎱 ¡Qué bien suena ese bombo!' },
    { pose: 'talk', t: 'Aquí caben 4 mesas de bingo. Toca un hueco del suelo para colocar la primera.' },
    { pose: 'ok', t: 'Mejóralas y se irán transformando, igual que las tragaperras. ¡Línea y bingo!', btn: '¡Vamos! ▶' },
  ],
  blackjack: [
    { pose: 'wave', t: '¡Bienvenido a MundiBlackJack! 🃏 Aquí el crupier pide en 16 y se planta en 17.' },
    { pose: 'talk', t: 'Tienes sitio para 4 mesas. Toca un hueco del suelo para colocar la primera.' },
    { pose: 'ok', t: 'Cada mesa da mucho más que una tragaperras. ¡Que salga un 21!', btn: '¡Vamos! ▶' },
  ],
  poker: [
    { pose: 'wave', t: '¡Bienvenido a MundiPoker, la sala de los grandes jugadores! ♠️' },
    { pose: 'talk', t: 'Aquí van 4 mesas de póker, las más rentables de todo el casino. Toca un hueco para colocar la primera.' },
    { pose: 'ok', t: '¡Siéntales a tus clientes más ricos y a por el bote!', btn: '¡Vamos! ▶' },
  ],
};
function welcomeRoom(k) {
  if (!S.roomWelcome) S.roomWelcome = {};
  if (S.roomWelcome[k] || !ROOM_WELCOME[k]) return;
  S.roomWelcome[k] = true; save();
  // tras el fundido de entrada a la sala; la recompensa diaria espera a que termine de hablar
  const daily = modalKind === 'missions'; if (daily) closeModal();
  setTimeout(() => Host.say(ROOM_WELCOME[k], () => { if (daily && dailyState().can) openModal('missions', 'daily'); }), 450);
}

// Bienvenida: sale la primera vez que se pulsa Jugar en una partida nueva
function welcome(then) {
  Host.say([
    { pose: 'wave', t: '¡Hola! ¡Bienvenido a Casino Idle Tycoon! 🎉' },
    { pose: 'talk', t: 'Soy tu anfitrión. Juntos vamos a levantar el mayor imperio del juego de toda la ciudad.' },
    { pose: 'talk', t: 'Empezamos en MundiSlot: coloca tragaperras, mejóralas y siéntales clientes. Ellas ganan dinero aunque no estés.' },
    { pose: 'talk', t: 'Con lo que ganes podrás comprar MundiBingo, MundiBlackJack y MundiPoker. ¡Cuanto más crezcas, más rico serás!' },
    { pose: 'ok', t: '¡Mucha suerte! 🍀', btn: '¡A jugar! ▶' },
  ], () => { S.welcomed = true; save(); if (then) then(); });
}
