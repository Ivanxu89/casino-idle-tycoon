'use strict';
/* Potenciadores (arriba a la izquierda):
   - ⬆️ Subir nivel: +1 nivel a todas tus máquinas de todas las salas. Se recarga en 1 h.
   - ⏩ Tiempo x2: durante 5 min las máquinas cobran el doble de rápido y las mejoras y el regalo avanzan al doble. Se recarga en 1 h.
   La primera vez los dos están listos para poder probarlos. Dueño: Iván. */

const BOOST_COOLDOWN = 60 * 60 * 1000;   // 1 h
const SPEED_DURATION = 5 * 60 * 1000;    // 5 min
const speedActive = () => S.boost.speedEnd > Date.now();
const gameSpeed = () => (speedActive() ? 2 : 1);

function useLevelBoost() {
  if (Date.now() < S.boost.lvlReady) return;
  let n = 0;
  S.machines.forEach((row, r) => row.forEach((m, i) => {
    if (!m || m.level >= MAX_LEVEL) return;
    const before = tierOf(m.level);
    m.level++; n++;
    if (MILESTONES.includes(m.level)) S.gems += 2 + r;
    if (r === S.room) {
      const A = rt(r, i), g = mGeom(i, m); A.bounce = 1; A.flash = 1; A.cheer = 1;
      FX.floats.push({ x: g.sx, y: g.y - 70, txt: `+1 · Nv ${m.level}`, col: '#8ff8ff', size: 32, life: 1.6, vy: -50 });
    }
    if (tierOf(m.level) !== before) evolveMachine(r, i, m);
  }));
  if (!n) { Snd.play('error'); toast('No tienes máquinas que subir', true); return; }
  S.boost.lvlReady = Date.now() + BOOST_COOLDOWN;
  Snd.play('level'); toast(`⬆️ ¡${n} máquina${n > 1 ? 's' : ''} suben un nivel!`);
  if (selected >= 0) renderPanel();
  save(); updateBoosters();
}

function useSpeedBoost() {
  if (Date.now() < S.boost.speedReady || speedActive()) return;
  S.boost.speedEnd = Date.now() + SPEED_DURATION;
  S.boost.speedReady = Date.now() + BOOST_COOLDOWN;
  Snd.play('upgrade'); toast('⏩ ¡Tiempo x2 durante 5 minutos!');
  save(); updateBoosters();
}

// Durante el x2 lo que va por reloj real (mejoras y regalo) avanza el tiempo extra
function speedTick(dt) {
  if (!speedActive()) return;
  const extra = dt * 1000;
  allMachines().forEach(m => { if (m.upEnd) m.upEnd -= extra; });
  if (S.giftNext && !S.gift) S.giftNext -= extra;
}

const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function updateBoosters() {
  const now = Date.now();
  const L = $('#boostLvl'), V = $('#boostSpeed');
  const lw = S.boost.lvlReady - now;
  L.classList.toggle('ready', lw <= 0); L.querySelector('.bt').textContent = lw > 0 ? mmss(lw) : '¡Listo!';
  if (speedActive()) {
    V.classList.add('active'); V.classList.remove('ready'); V.querySelector('.bt').textContent = mmss(S.boost.speedEnd - now);
  } else {
    const sw = S.boost.speedReady - now;
    V.classList.remove('active'); V.classList.toggle('ready', sw <= 0); V.querySelector('.bt').textContent = sw > 0 ? mmss(sw) : '¡Listo!';
  }
  document.body.classList.toggle('speed-x2', speedActive());
}
$('#boostLvl').onclick = () => { Snd.init(); useLevelBoost(); };
$('#boostSpeed').onclick = () => { Snd.init(); useSpeedBoost(); };
setInterval(updateBoosters, 500);
