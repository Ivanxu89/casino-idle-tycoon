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
