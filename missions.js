'use strict';
/* Misiones por escalones y recompensa diaria con racha de 7 días.
   Los datos (MISSIONS, DAILY) están en data.js; aquí la lógica y la ventana «Misiones». Dueño: Iván. */

const countCat = cat => allMachines().filter(m => TYPES[m.type].cat === cat).length;

// ---------- misiones ----------
const missionTier = M => (S.missions[M.id] || 0);              // escalones ya reclamados
const missionDone = M => missionTier(M) >= M.tiers.length;
const missionReady = M => !missionDone(M) && M.val() >= M.tiers[missionTier(M)];
function missionReward(k) {
  return { gems: 2 + 2 * k, money: Math.max(100 * (k + 1) * (k + 1), totalPS() * 60 * (k + 1)) };
}
function claimMission(id) {
  const M = MISSIONS.find(x => x.id === id);
  if (!M || !missionReady(M)) return;
  const R = missionReward(missionTier(M));
  S.missions[M.id] = missionTier(M) + 1;
  S.gems += R.gems; earn(R.money);
  Snd.play('win');
  toast(`${M.icon} ¡Misión cumplida! +${R.gems}◆ y +${money(R.money)}`);
  save(); refreshModal(); updateHUD();
}

// ---------- recompensa diaria ----------
const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function dailyState() {
  const now = new Date(), today = dayKey(now), yest = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const can = S.daily.last !== today;
  const day = can ? (S.daily.last === yest ? (S.daily.streak % 7) + 1 : 1) : S.daily.streak; // 1..7
  return { can, day, today };
}
const dailyMoney = day => Math.max(DAILY[day - 1].min, totalPS() * 60 * DAILY[day - 1].minutes);
function claimDaily() {
  const st = dailyState();
  if (!st.can) return;
  const D = DAILY[st.day - 1], amt = dailyMoney(st.day);
  S.daily = { last: st.today, streak: st.day };
  S.stats.days++;
  S.gems += D.gems; earn(amt);
  Snd.play('level');
  toast(`📅 Día ${st.day}: +${money(amt)} y +${D.gems}◆`);
  save(); refreshModal(); updateHUD();
}

// número de recompensas esperando (para el aviso del botón)
const missionsPending = () => MISSIONS.filter(missionReady).length + (dailyState().can ? 1 : 0);

// ---------- ventana ----------
function renderMissions(tabs, body) {
  $('#modalTitle').textContent = 'MISIONES';
  const st = dailyState();
  if (!modalTab) modalTab = st.can ? 'daily' : 'missions';
  const ready = MISSIONS.filter(missionReady).length;
  [['daily', '📅 Diaria' + (st.can ? ' •' : '')], ['missions', '📋 Misiones' + (ready ? ` (${ready})` : '')]].forEach(([k, l]) => {
    const b = document.createElement('button'); b.className = 'tab' + (modalTab === k ? ' on' : ''); b.textContent = l;
    b.onclick = () => { modalTab = k; Snd.play('click'); refreshModal(); }; tabs.appendChild(b);
  });

  if (modalTab === 'daily') {
    const cells = DAILY.map((D, i) => {
      const d = i + 1, done = st.can ? d < st.day : d <= st.day, today = st.can && d === st.day;
      return `<div class="day ${done ? 'done' : ''} ${today ? 'today' : ''} ${d === 7 ? 'big' : ''}">
        <div class="day-n">Día ${d}</div>
        <div class="day-ico">${d === 7 ? '🎁' : done ? '✅' : '💰'}</div>
        <div class="day-r">${money(dailyMoney(d))}</div>
        <div class="day-g">+${D.gems} ◆</div></div>`;
    }).join('');
    body.innerHTML = `
      <div class="daily-lead">${st.can ? `¡Hoy toca el <b>día ${st.day}</b> de tu racha!` : `Ya has recogido el <b>día ${st.day}</b>. Vuelve mañana a por el día ${(st.day % 7) + 1}.`}</div>
      <div class="days">${cells}</div>
      <div class="center"><button class="btn btn-green" id="bDaily" ${st.can ? '' : 'disabled'}>${st.can ? `Recoger día ${st.day}` : 'Recogido ✓'}</button></div>
      <div class="daily-note">Entra cada día para avanzar la racha. Si faltas un día, vuelves al día 1. El dinero crece con lo que gana tu casino.</div>`;
    $('#bDaily').onclick = claimDaily;
    return;
  }

  const list = document.createElement('div'); list.className = 'missions'; body.appendChild(list);
  // primero las que se pueden reclamar, luego las que van en curso, al final las completadas
  const order = M => (missionReady(M) ? 0 : missionDone(M) ? 2 : 1);
  for (const M of [...MISSIONS].sort((a, b) => order(a) - order(b))) {
    const k = missionTier(M), done = missionDone(M), target = done ? M.tiers.at(-1) : M.tiers[k];
    const v = Math.min(M.val(), target), p = v / target, R = missionReward(k);
    const row = document.createElement('div');
    row.className = 'mission' + (missionReady(M) ? ' ready' : '') + (done ? ' done' : '');
    row.innerHTML = `
      <div class="m-ico">${M.icon}</div>
      <div class="m-main">
        <div class="m-name">${M.name} <span class="m-tier">${done ? 'COMPLETADA' : `Escalón ${k + 1}/${M.tiers.length}`}</span></div>
        <div class="m-goal">${done ? '¡Has completado todos los escalones!' : M.goal(target)}</div>
        <div class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></div>
        <div class="m-prog">${M.id === 'income' ? money(v) + '/s' : fmt(v)} / ${M.id === 'income' ? money(target) + '/s' : fmt(target)}</div>
      </div>
      <div class="m-side">${done ? '<div class="m-check">✓</div>' : `
        <div class="m-rew">+${R.gems}◆<br>+${money(R.money)}</div>
        <button class="btn btn-sm ${missionReady(M) ? 'btn-green' : 'btn-dark'}" data-claim="${M.id}" ${missionReady(M) ? '' : 'disabled'}>Reclamar</button>`}</div>`;
    list.appendChild(row);
  }
  list.querySelectorAll('[data-claim]').forEach(b => (b.onclick = () => claimMission(b.dataset.claim)));
}
