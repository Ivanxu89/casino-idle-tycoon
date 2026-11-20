'use strict';
/* Datos del juego: utilidades, salas, máquinas, clientes, hitos, huecos del suelo y objetivos. Dueño: Iván. */
const $ = s => document.querySelector(s);
// Ruta de un recurso: en la versión de un solo archivo (build) las imágenes van incrustadas en window.ASSETS
const A = p => (window.ASSETS && window.ASSETS[p]) || p;
const $$ = s => [...document.querySelectorAll(s)];

/* ----------------------------- DATOS ------------------------------ */
const ROOMS = [
  { name: 'Salón Rubí',            img: 'room_0.webp', unlock: 0,      inc: 1,    cost: 1,     time: 1,   desc: 'Tu primer local. Humilde, pero con encanto.' },
  { name: 'Salón Zafiro',          img: 'room_1.webp', unlock: 2.5e4,  inc: 6,    cost: 12,    time: 1.5, desc: 'Más clientela… y mejoras más caras.' },
  { name: 'Jardín Amatista',       img: 'room_2.webp', unlock: 3e6,    inc: 40,   cost: 180,   time: 2.2, desc: 'Clientes exigentes, tiempos de mejora largos.' },
  { name: 'Galaxia Real',          img: 'room_3.webp', unlock: 8e8,    inc: 300,  cost: 3000,  time: 3.2, desc: 'Solo para casinos con nervios de acero.' },
  { name: 'Palacio Esmeralda VIP', img: 'room_4.webp', unlock: 4e11,   inc: 2500, cost: 60000, time: 4.5, desc: 'La sala definitiva. Lujo absoluto.' },
];

// cat: slot = "Máquinas", table = "Juegos"
const TYPES = {
  lucky:    { cat: 'slot',  name: 'Lucky 7',        sprite: 'slot_lucky', hue: 0,   base: 1,    cycle: 2.5, place: 10,    license: 0,     w: 210, ay: .80, desc: 'La clásica tragaperras de toda la vida.' },
  emerald:  { cat: 'slot',  name: 'Esmeralda 7',    sprite: 'slot_emerald', hue: 0, base: 5,    cycle: 3,   place: 150,   license: 400,   w: 210, ay: .80, desc: 'Brilla en verde. Paga 5 veces más.' },
  sapphire: { cat: 'slot',  name: 'Zafiro Deluxe',  sprite: 'slot_sapphire', hue: 0, base: 22,   cycle: 3.5, place: 1800,  license: 5000,  w: 210, ay: .80, desc: 'Tragaperras premium de luces azules.' },
  amethyst: { cat: 'slot',  name: 'Amatista Royal', sprite: 'slot_amethyst', hue: 0, base: 90,   cycle: 4,   place: 1.5e4, license: 4e4,   w: 210, ay: .80, desc: 'La joya de las tragaperras.' },
  blackjack:{ cat: 'table', name: 'Blackjack 21',   sprite: 'blackjack', hue: 0,   base: 420,  cycle: 5,   place: 1.2e5, license: 4e5,   w: 280, ay: .62, desc: 'El crupier pide en 16 y se planta en 17.' },
  craps:    { cat: 'table', name: 'Dados (Craps)',  sprite: 'craps',     hue: 0,   base: 2000, cycle: 6,   place: 1.5e6, license: 5e6,   w: 280, ay: .62, desc: 'Ruido, gritos y mucho dinero en juego.' },
  poker:    { cat: 'table', name: 'Póker Texas',    sprite: 'poker',     hue: 0,   base: 1e4,  cycle: 8,   place: 2e7,   license: 7e7,   w: 290, ay: .60, desc: 'Mesa de 6 jugadores. La más rentable.' },
};

const PLAYERS = {
  student:   { name: 'Estudiante',      mult: 1,   cost: 0,      wealth: 'Pobre',          wc: '#8a78c0', desc: 'Apuesta lo que le sobra de la beca.' },
  retiree:   { name: 'Jubilado',        mult: 2,   cost: 300,    wealth: 'Modesto',        wc: '#9fb0c8', desc: 'Viene todos los martes con su pensión.' },
  office:    { name: 'Oficinista',      mult: 4,   cost: 5000,   wealth: 'Clase media',    wc: '#5fb8ff', desc: 'Juega para olvidar los lunes.' },
  tourist:   { name: 'Turista',         mult: 8,   cost: 9e4,    wealth: 'Acomodado',      wc: '#3ddc5a', desc: 'De vacaciones y con la cartera llena.' },
  influencer:{ name: 'Influencer',      mult: 18,  cost: 2e6,    wealth: 'Rico',           wc: '#ff7ae5', desc: 'Lo graba todo… y apuesta fuerte.' },
  business:  { name: 'Empresaria',      mult: 40,  cost: 6e7,    wealth: 'Muy rica',       wc: '#ffcf3f', desc: 'Cierra tratos y apuestas a lo grande.' },
  star:      { name: 'Estrella de cine',mult: 90,  cost: 2.5e9,  wealth: 'Millonaria',     wc: '#ffa53f', desc: 'Gafas de sol incluso de noche.' },
  sheikh:    { name: 'Jeque',           mult: 220, cost: 1.2e11, wealth: 'Multimillonario',wc: '#ff4f5e', desc: 'No pregunta el precio de nada.' },
  tycoon:    { name: 'Magnate',         mult: 600, cost: 8e12,   wealth: 'Leyenda',        wc: '#ff4fd8', desc: 'Dueño de medio mundo. Tu mejor cliente.' },
};

const MILESTONES = [10, 25, 50, 100, 150, 200];
const MAX_LEVEL = 200;
/* ----------------------------- VENTANAS DE RODILLOS ------------------------------ */
// Paralelogramo de la ventana de rodillos de cada tragaperras y nivel (fracciones del sprite: esquinas
// arriba-izquierda, arriba-derecha y abajo-izquierda). Lo genera el script de recorte de los assets de Magnific.
const REEL_FIT = {
  "lucky_0":{"tl":[0.2722,0.3411],"tr":[0.5876,0.4589],"bl":[0.2722,0.4554]},
  "lucky_1":{"tl":[0.2731,0.3357],"tr":[0.5893,0.4536],"bl":[0.2731,0.4643]},
  "lucky_2":{"tl":[0.2716,0.3446],"tr":[0.5885,0.4625],"bl":[0.2716,0.4625]},
  "lucky_3":{"tl":[0.2737,0.3464],"tr":[0.5885,0.4643],"bl":[0.2737,0.4607]},
  "lucky_4":{"tl":[0.276,0.35],"tr":[0.584,0.4589],"bl":[0.276,0.4643]},
  "emerald_0":{"tl":[0.2348,0.3446],"tr":[0.6289,0.4018],"bl":[0.2348,0.4804]},
  "emerald_1":{"tl":[0.2343,0.3429],"tr":[0.6276,0.4018],"bl":[0.2343,0.4804]},
  "emerald_2":{"tl":[0.2348,0.3411],"tr":[0.6268,0.4018],"bl":[0.2348,0.4732]},
  "emerald_3":{"tl":[0.2346,0.3714],"tr":[0.6228,0.4268],"bl":[0.2346,0.4821]},
  "emerald_4":{"tl":[0.2375,0.375],"tr":[0.6167,0.4268],"bl":[0.2375,0.4804]},
  "sapphire_0":{"tl":[0.2359,0.3304],"tr":[0.6117,0.4018],"bl":[0.2359,0.4893]},
  "sapphire_1":{"tl":[0.2349,0.3304],"tr":[0.6112,0.4018],"bl":[0.2349,0.4893]},
  "sapphire_2":{"tl":[0.2343,0.3304],"tr":[0.6109,0.4018],"bl":[0.2343,0.4893]},
  "sapphire_3":{"tl":[0.2349,0.3304],"tr":[0.6112,0.4018],"bl":[0.2349,0.4893]},
  "sapphire_4":{"tl":[0.2345,0.3304],"tr":[0.6098,0.4018],"bl":[0.2345,0.4893]},
  "amethyst_0":{"tl":[0.2587,0.3589],"tr":[0.6087,0.4304],"bl":[0.2587,0.4625]},
  "amethyst_1":{"tl":[0.2565,0.3589],"tr":[0.6087,0.4304],"bl":[0.2565,0.4661]},
  "amethyst_2":{"tl":[0.2581,0.3607],"tr":[0.6074,0.4304],"bl":[0.2581,0.4643]},
  "amethyst_3":{"tl":[0.2597,0.3661],"tr":[0.603,0.4375],"bl":[0.2597,0.4571]},
  "amethyst_4":{"tl":[0.6645,0.4393],"tr":[0.7707,0.4161],"bl":[0.6645,0.4714]}};


/* ----------------------------- MISIONES (missions.js) ------------------------------ */
// Cada misión tiene escalones: al llegar a uno lo reclamas y aparece el siguiente, más difícil.
// La recompensa de cada escalón k (0, 1, 2…) son gemas y dinero; ver missionReward() en missions.js.
const MISSIONS = [
  { id: 'slots',   icon: '🎰', name: 'Coleccionista de tragaperras', goal: n => `Ten ${n} tragaperras en tu casino`,        tiers: [2, 4, 6, 10, 15, 20],               val: () => countCat('slot') },
  { id: 'tables',  icon: '🃏', name: 'Mesas de juego',               goal: n => n === 1 ? 'Pon tu primera mesa de juego' : `Ten ${n} mesas de juego`,                  tiers: [1, 2, 4, 6, 10],                    val: () => countCat('table') },
  { id: 'level',   icon: '⬆️', name: 'Máquina estrella',             goal: n => `Sube una máquina a nivel ${n}`,             tiers: [5, 10, 25, 50, 100, 150, 200],      val: () => maxLevel() },
  { id: 'levels',  icon: '🔧', name: 'Mejoras sin parar',            goal: n => `Suma ${n} niveles entre todas tus máquinas`, tiers: [15, 40, 100, 250, 500, 1000],       val: () => allMachines().reduce((a, m) => a + m.level, 0) },
  { id: 'players', icon: '🧑', name: 'Lista VIP',                    goal: n => `Desbloquea ${n} clientes`,                  tiers: [2, 3, 4, 5, 6, 7, 8, 9],            val: () => Object.keys(S.players).length },
  { id: 'rooms',   icon: '🏛️', name: 'Imperio del juego',            goal: n => `Abre ${n} salas`,                           tiers: [2, 3, 4, 5],                        val: () => S.rooms.filter(Boolean).length },
  { id: 'income',  icon: '💰', name: 'Lluvia de dinero',             goal: n => `Gana ${money(n)} por segundo`,              tiers: [50, 500, 5e3, 5e4, 5e5, 5e6, 5e7],  val: () => totalPS() },
  { id: 'gifts',   icon: '🎁', name: 'Cazador de regalos',           goal: n => n === 1 ? 'Abre tu primer regalo misterioso' : `Abre ${n} regalos misteriosos`,            tiers: [1, 5, 15, 40, 100],                 val: () => S.stats.gifts },
  { id: 'days',    icon: '📅', name: 'Cliente fiel',                 goal: n => `Recoge ${n} recompensas diarias`,           tiers: [2, 7, 14, 30, 60],                  val: () => S.stats.days },
];

/* ----------------------------- RECOMPENSA DIARIA (missions.js) ------------------------------ */
// Racha de 7 días: si entras días seguidos subes de día; si faltas uno, vuelves al día 1. Tras el día 7, otra vez el 1.
// money = minutos de ingresos de tu casino (con un mínimo), gems = gemas.
const DAILY = [
  { minutes: 1,  min: 100,  gems: 2 },
  { minutes: 2,  min: 200,  gems: 3 },
  { minutes: 3,  min: 300,  gems: 4 },
  { minutes: 4,  min: 400,  gems: 5 },
  { minutes: 5,  min: 600,  gems: 6 },
  { minutes: 7,  min: 800,  gems: 8 },
  { minutes: 15, min: 2000, gems: 20 },
];
const TEST_BONUS = 10000; // PRUEBAS: monedas extra al empezar (ver main.js). Poner a 0 antes de publicar.
const SPOTS_PER_ROOM = 9;

/* ------------- Suelo isométrico (coordenadas de la imagen 1536²) ------------- */
const FLOOR = { B: [770, 620], R: [1480, 1010], L: [60, 1010] };
function floorPt(u, v) {
  const { B, R, L } = FLOOR;
  return [B[0] + u * (R[0] - B[0]) + v * (L[0] - B[0]), B[1] + u * (R[1] - B[1]) + v * (L[1] - B[1])];
}
// 3×3 huecos; los pasillos de los paseantes (render.js) pasan entre ellos
const SPOT_UV = [[0.27, 0.22], [0.58, 0.22], [0.89, 0.22], [0.27, 0.54], [0.58, 0.54], [0.89, 0.54], [0.27, 0.86], [0.58, 0.86], [0.89, 0.86]];
let SPOTS = SPOT_UV.map(([u, v]) => floorPt(u, v));

/* ----------------------------- OBJETIVOS (FTUE) ------------------------------ */
const GOALS = [
  { t: 'Toca un hueco y coloca tu primera Lucky 7', ok: () => allMachines().length >= 1, g: 3 },
  { t: 'Mejora una máquina hasta el nivel 5', ok: () => maxLevel() >= 5, g: 3 },
  { t: 'Desbloquea al Jubilado (Tienda → Jugadores) y asígnalo', ok: () => allMachines().some(m => m.player !== 'student'), g: 3 },
  { t: 'Ten 3 máquinas en el Salón Rubí', ok: () => countRoom(0) >= 3, g: 3 },
  { t: 'Alcanza el nivel 10 (hito x2)', ok: () => maxLevel() >= 10, g: 4 },
  { t: 'Compra la licencia Esmeralda 7', ok: () => !!S.licenses.emerald, g: 4 },
  { t: 'Gana 100 $/s', ok: () => totalPS() >= 100, g: 5 },
  { t: 'Abre el Salón Zafiro', ok: () => S.rooms[1], g: 5 },
  { t: 'Compra la licencia de Blackjack', ok: () => !!S.licenses.blackjack, g: 6 },
  { t: 'Gana 10K $/s', ok: () => totalPS() >= 1e4, g: 8 },
  { t: 'Abre el Jardín Amatista', ok: () => S.rooms[2], g: 10 },
  { t: 'Desbloquea a la Influencer', ok: () => !!S.players.influencer, g: 10 },
  { t: 'Vende el casino (👑) por primera vez', ok: () => (S.prestiges || 0) >= 1, g: 15 },
  { t: 'Abre la Galaxia Real', ok: () => S.rooms[3], g: 15 },
  { t: 'Abre el Palacio Esmeralda VIP', ok: () => S.rooms[4], g: 25 },
];
