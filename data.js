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
  lucky:    { cat: 'slot',  name: 'Lucky 7',        sprite: 'slot_lucky', hue: 0,   base: 1,    cycle: 2.5, place: 10,    license: 0,     w: 200, ay: .80, desc: 'La clásica tragaperras de toda la vida.' },
  emerald:  { cat: 'slot',  name: 'Esmeralda 7',    sprite: 'slot_emerald', hue: 0, base: 5,    cycle: 3,   place: 150,   license: 400,   w: 200, ay: .80, desc: 'Brilla en verde. Paga 5 veces más.' },
  sapphire: { cat: 'slot',  name: 'Zafiro Deluxe',  sprite: 'slot_sapphire', hue: 0, base: 22,   cycle: 3.5, place: 1800,  license: 5000,  w: 200, ay: .80, desc: 'Tragaperras premium de luces azules.' },
  amethyst: { cat: 'slot',  name: 'Amatista Royal', sprite: 'slot_amethyst', hue: 0, base: 90,   cycle: 4,   place: 1.5e4, license: 4e4,   w: 200, ay: .80, desc: 'La joya de las tragaperras.' },
  dragon:   { cat: 'slot',  name: 'Fortuna del Dragón', sprite: 'slot_dragon', hue: 0, base: 180, cycle: 4.5, place: 4e4, license: 1e5, w: 200, ay: .80, desc: 'Lingotes, farolillos y un dragón dorado.' },
  pharaoh:  { cat: 'slot',  name: 'Oro del Faraón',  sprite: 'slot_pharaoh', hue: 0, base: 700, cycle: 5, place: 4e5, license: 1.2e6, w: 200, ay: .80, desc: 'Escarabajos y el ojo de Horus.' },
  pirate:   { cat: 'slot',  name: 'Tesoro Pirata',   sprite: 'slot_pirate', hue: 0, base: 3000, cycle: 5.5, place: 5e6, license: 1.5e7, w: 200, ay: .80, desc: 'Un cofre lleno de doblones.' },
  candy:    { cat: 'slot',  name: 'Golosinas Neón',  sprite: 'slot_candy', hue: 0, base: 14000, cycle: 6, place: 6e7, license: 2e8, w: 200, ay: .80, desc: 'Dulce, brillante y muy rentable.' },
  blackjack:{ cat: 'table', name: 'Blackjack 21',   sprite: 'blackjack', hue: 0,   base: 420,  cycle: 5,   place: 1.2e5, license: 4e5,   w: 280, ay: .62, desc: 'El crupier pide en 16 y se planta en 17.' },
  craps:    { cat: 'table', name: 'Dados (Craps)',  sprite: 'craps',     hue: 0,   base: 2000, cycle: 6,   place: 1.5e6, license: 5e6,   w: 280, ay: .62, desc: 'Ruido, gritos y mucho dinero en juego.' },
  poker:    { cat: 'table', name: 'Póker Texas',    sprite: 'poker',     hue: 0,   base: 1e4,  cycle: 8,   place: 2e7,   license: 7e7,   w: 290, ay: .60, desc: 'Mesa de 6 jugadores. La más rentable.' },
};

// Escalera de 15 clientes, del más pobre al más rico. El Vagabundo es gratis e ilimitado (FREE_PLAYER);
// el resto se contrata uno a uno y cada copia extra cuesta HIRE_GROWTH veces más.
const FREE_PLAYER = 'beggar';
const HIRE_GROWTH = 2.2;
const PLAYERS = {
  beggar:    { name: 'Vagabundo',        mult: 1,    cost: 0,      wealth: 'Sin un duro',     wc: '#7a6a5a', desc: 'Apuesta las monedas que encuentra en la calle.' },
  student:   { name: 'Estudiante',       mult: 1.5,  cost: 800,    wealth: 'Pobre',           wc: '#8a78c0', desc: 'Apuesta lo que le sobra de la beca.' },
  retiree:   { name: 'Jubilado',         mult: 2.5,  cost: 2.5e4,  wealth: 'Modesto',         wc: '#9fb0c8', desc: 'Viene todos los martes con su pensión.' },
  waitress:  { name: 'Camarera',         mult: 4,    cost: 6e5,    wealth: 'Humilde',         wc: '#c0a0e0', desc: 'Gasta aquí todas sus propinas.' },
  office:    { name: 'Oficinista',       mult: 6,    cost: 1.5e7,  wealth: 'Clase media',     wc: '#5fb8ff', desc: 'Juega para olvidar los lunes.' },
  tourist:   { name: 'Turista',          mult: 10,   cost: 4e8,    wealth: 'Acomodado',       wc: '#3ddc5a', desc: 'De vacaciones y con la cartera llena.' },
  chef:      { name: 'Chef famoso',      mult: 16,   cost: 1.2e10, wealth: 'Con estrella',    wc: '#f0f0f0', desc: 'Tres estrellas y mucha hambre de premio.' },
  influencer:{ name: 'Influencer',       mult: 25,   cost: 3.5e11, wealth: 'Rica',            wc: '#ff7ae5', desc: 'Lo graba todo… y apuesta fuerte.' },
  surgeon:   { name: 'Cirujana',         mult: 40,   cost: 1e13,   wealth: 'Muy rica',        wc: '#3fd0c0', desc: 'Pulso firme hasta para la tragaperras.' },
  business:  { name: 'Empresaria',       mult: 65,   cost: 3e14,   wealth: 'Millonaria',      wc: '#ffcf3f', desc: 'Cierra tratos y apuestas a lo grande.' },
  star:      { name: 'Estrella de cine', mult: 100,  cost: 9e15,   wealth: 'Multimillonaria', wc: '#ffa53f', desc: 'Gafas de sol incluso de noche.' },
  racer:     { name: 'Piloto de F1',     mult: 160,  cost: 2.5e17, wealth: 'Campeón',         wc: '#ff5040', desc: 'Apuesta a toda velocidad.' },
  sheikh:    { name: 'Jeque',            mult: 250,  cost: 8e18,   wealth: 'Petrolero',       wc: '#ff4f5e', desc: 'No pregunta el precio de nada.' },
  tycoon:    { name: 'Magnate',          mult: 400,  cost: 2.5e20, wealth: 'Leyenda',         wc: '#ff4fd8', desc: 'Dueño de medio mundo.' },
  ultra:     { name: 'Ultra Mega Millonario', mult: 700, cost: 9e21, wealth: 'Incalculable', wc: '#ffe040', desc: 'Tiene un cohete de oro. Tu mejor cliente.' },
};

const MILESTONES = [10, 25, 50, 100, 150, 200];
const MAX_LEVEL = 200;

/* ----------------------------- SEGURIDAD (security.js) ------------------------------ */
// cost se multiplica por el coste de la sala; protect = probabilidad de parar a un ladrón (para los ladrones futuros)
const GUARDS = [
  { name: 'Paco el Despistado', protect: 0.40, cost: 1000,  desc: 'Más pendiente del donut que de la puerta.' },
  { name: 'Novato Nervioso',    protect: 0.55, cost: 1e5,   desc: 'Se lo toma en serio, aunque tiembla un poco.' },
  { name: 'Agente Pro',         protect: 0.70, cost: 1e7,   desc: 'En forma, con radio y buena vista.' },
  { name: 'El Portero',         protect: 0.85, cost: 1e9,   desc: 'Nadie entra sin que él lo apruebe.' },
  { name: 'Jefe de Élite',      protect: 0.97, cost: 1e11,  desc: 'Una mirada suya basta para echarte.' },
];
/* ----------------------------- VENTANAS DE RODILLOS ------------------------------ */
// Paralelogramo de la ventana de rodillos de cada tragaperras y nivel (fracciones del sprite: esquinas
// arriba-izquierda, arriba-derecha y abajo-izquierda). Lo genera el script de recorte de los assets de Magnific.
// Caja real del mueble dentro de cada sprite de tragaperras (ancho f, centro cx y base b, en fracciones):
// así todas se apoyan igual en su hueco aunque el dibujo tenga halos o brillos.
const SPRITE_FIT = {
  "slot_lucky_0":{"f":0.9968,"cx":0.4984,"b":0.9988},
  "slot_lucky_1":{"f":0.9968,"cx":0.5,"b":0.9988},
  "slot_lucky_2":{"f":0.9984,"cx":0.4992,"b":0.9988},
  "slot_lucky_3":{"f":0.9968,"cx":0.5,"b":0.9988},
  "slot_lucky_4":{"f":0.9992,"cx":0.4996,"b":0.9995},
  "slot_emerald_0":{"f":0.9984,"cx":0.4992,"b":0.9988},
  "slot_emerald_1":{"f":0.9984,"cx":0.4992,"b":0.9988},
  "slot_emerald_2":{"f":0.9984,"cx":0.4992,"b":0.9988},
  "slot_emerald_3":{"f":0.9969,"cx":0.5,"b":0.9988},
  "slot_emerald_4":{"f":0.9992,"cx":0.4996,"b":0.9995},
  "slot_sapphire_0":{"f":0.9968,"cx":0.4984,"b":0.9989},
  "slot_sapphire_1":{"f":0.9968,"cx":0.5,"b":0.9989},
  "slot_sapphire_2":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_sapphire_3":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_sapphire_4":{"f":0.9961,"cx":0.5004,"b":0.9995},
  "slot_amethyst_0":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_amethyst_1":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_amethyst_2":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_amethyst_3":{"f":0.9968,"cx":0.5,"b":0.9989},
  "slot_amethyst_4":{"f":0.9954,"cx":0.5,"b":0.9995},
  "slot_dragon_0":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_dragon_1":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_dragon_2":{"f":0.9984,"cx":0.4992,"b":0.9988},
  "slot_dragon_3":{"f":0.9984,"cx":0.4992,"b":0.9988},
  "slot_dragon_4":{"f":0.9993,"cx":0.4996,"b":0.9995},
  "slot_pharaoh_0":{"f":0.9984,"cx":0.4992,"b":0.9978},
  "slot_pharaoh_1":{"f":0.9968,"cx":0.5,"b":0.9989},
  "slot_pharaoh_2":{"f":0.9984,"cx":0.4992,"b":0.9989},
  "slot_pharaoh_3":{"f":0.9968,"cx":0.5,"b":0.9989},
  "slot_pharaoh_4":{"f":0.9971,"cx":0.4993,"b":0.999},
  "slot_pirate_0":{"f":0.9985,"cx":0.4992,"b":0.9989},
  "slot_pirate_1":{"f":0.9985,"cx":0.4992,"b":0.9989},
  "slot_pirate_2":{"f":0.9985,"cx":0.4992,"b":0.9989},
  "slot_pirate_3":{"f":0.997,"cx":0.5,"b":0.9989},
  "slot_pirate_4":{"f":0.9986,"cx":0.5,"b":0.9995},
  "slot_candy_0":{"f":0.9985,"cx":0.4992,"b":0.9989},
  "slot_candy_1":{"f":0.9985,"cx":0.4992,"b":0.9989},
  "slot_candy_2":{"f":0.9985,"cx":0.4992,"b":0.9989},
  "slot_candy_3":{"f":0.9985,"cx":0.4992,"b":0.9978},
  "slot_candy_4":{"f":0.9978,"cx":0.4996,"b":0.9995}};

const REEL_FIT = {
  "lucky_0":{"tl":[0.15,0.35],"tr":[0.53,0.46],"bl":[0.15,0.575]},
  "lucky_1":{"tl":[0.15,0.35],"tr":[0.53,0.46],"bl":[0.15,0.575]},
  "lucky_2":{"tl":[0.15,0.35],"tr":[0.53,0.46],"bl":[0.15,0.575]},
  "lucky_3":{"tl":[0.15,0.35],"tr":[0.53,0.46],"bl":[0.15,0.575]},
  "lucky_4":{"tl":[0.16,0.42],"tr":[0.54,0.51],"bl":[0.16,0.61]},
  "emerald_0":{"tl":[0.14,0.41],"tr":[0.53,0.49],"bl":[0.14,0.61]},
  "emerald_1":{"tl":[0.14,0.41],"tr":[0.53,0.49],"bl":[0.14,0.61]},
  "emerald_2":{"tl":[0.14,0.41],"tr":[0.53,0.49],"bl":[0.14,0.61]},
  "emerald_3":{"tl":[0.14,0.41],"tr":[0.53,0.49],"bl":[0.14,0.61]},
  "emerald_4":{"tl":[0.09,0.45],"tr":[0.5,0.525],"bl":[0.09,0.64]},
  "sapphire_0":{"tl":[0.155,0.39],"tr":[0.55,0.48],"bl":[0.155,0.57]},
  "sapphire_1":{"tl":[0.155,0.39],"tr":[0.55,0.48],"bl":[0.155,0.57]},
  "sapphire_2":{"tl":[0.155,0.39],"tr":[0.55,0.48],"bl":[0.155,0.57]},
  "sapphire_3":{"tl":[0.155,0.39],"tr":[0.55,0.48],"bl":[0.155,0.57]},
  "sapphire_4":{"tl":[0.15,0.455],"tr":[0.54,0.54],"bl":[0.15,0.605]},
  "amethyst_0":{"tl":[0.16,0.38],"tr":[0.55,0.455],"bl":[0.16,0.58]},
  "amethyst_1":{"tl":[0.16,0.38],"tr":[0.55,0.455],"bl":[0.16,0.58]},
  "amethyst_2":{"tl":[0.16,0.38],"tr":[0.55,0.455],"bl":[0.16,0.58]},
  "amethyst_3":{"tl":[0.16,0.38],"tr":[0.55,0.455],"bl":[0.16,0.58]},
  "amethyst_4":{"tl":[0.16,0.38],"tr":[0.54,0.48],"bl":[0.16,0.58]},
  "dragon_0":{"tl":[0.08,0.41],"tr":[0.48,0.49],"bl":[0.08,0.61]},
  "dragon_1":{"tl":[0.08,0.41],"tr":[0.48,0.49],"bl":[0.08,0.61]},
  "dragon_2":{"tl":[0.08,0.41],"tr":[0.48,0.49],"bl":[0.08,0.61]},
  "dragon_3":{"tl":[0.08,0.41],"tr":[0.48,0.49],"bl":[0.08,0.61]},
  "dragon_4":{"tl":[0.135,0.41],"tr":[0.49,0.5],"bl":[0.135,0.61]},
  "pharaoh_0":{"tl":[0.14,0.41],"tr":[0.52,0.49],"bl":[0.14,0.61]},
  "pharaoh_1":{"tl":[0.14,0.41],"tr":[0.52,0.49],"bl":[0.14,0.61]},
  "pharaoh_2":{"tl":[0.14,0.41],"tr":[0.52,0.49],"bl":[0.14,0.61]},
  "pharaoh_3":{"tl":[0.14,0.41],"tr":[0.52,0.49],"bl":[0.14,0.61]},
  "pharaoh_4":{"tl":[0.125,0.44],"tr":[0.5,0.5],"bl":[0.125,0.61]},
  "pirate_0":{"tl":[0.12,0.43],"tr":[0.55,0.49],"bl":[0.12,0.605]},
  "pirate_1":{"tl":[0.12,0.43],"tr":[0.55,0.49],"bl":[0.12,0.605]},
  "pirate_2":{"tl":[0.12,0.43],"tr":[0.55,0.49],"bl":[0.12,0.605]},
  "pirate_3":{"tl":[0.12,0.43],"tr":[0.55,0.49],"bl":[0.12,0.605]},
  "pirate_4":{"tl":[0.135,0.42],"tr":[0.54,0.505],"bl":[0.135,0.605]},
  "candy_0":{"tl":[0.14,0.42],"tr":[0.52,0.505],"bl":[0.14,0.62]},
  "candy_1":{"tl":[0.14,0.42],"tr":[0.52,0.505],"bl":[0.14,0.62]},
  "candy_2":{"tl":[0.14,0.42],"tr":[0.52,0.505],"bl":[0.14,0.62]},
  "candy_3":{"tl":[0.14,0.42],"tr":[0.52,0.505],"bl":[0.14,0.62]},
  "candy_4":{"tl":[0.14,0.43],"tr":[0.53,0.505],"bl":[0.14,0.62]}};


/* ----------------------------- MISIONES (missions.js) ------------------------------ */
// Cada misión tiene escalones: al llegar a uno lo reclamas y aparece el siguiente, más difícil.
// La recompensa de cada escalón k (0, 1, 2…) son gemas y dinero; ver missionReward() en missions.js.
const MISSIONS = [
  { id: 'slots',   icon: '🎰', name: 'Coleccionista de tragaperras', goal: n => `Ten ${n} tragaperras en tu casino`,        tiers: [2, 4, 6, 10, 15, 20],               val: () => countCat('slot') },
  { id: 'tables',  icon: '🃏', name: 'Mesas de juego',               goal: n => n === 1 ? 'Pon tu primera mesa de juego' : `Ten ${n} mesas de juego`,                  tiers: [1, 2, 4, 6, 10],                    val: () => countCat('table') },
  { id: 'level',   icon: '⬆️', name: 'Máquina estrella',             goal: n => `Sube una máquina a nivel ${n}`,             tiers: [5, 10, 25, 50, 100, 150, 200],      val: () => maxLevel() },
  { id: 'levels',  icon: '🔧', name: 'Mejoras sin parar',            goal: n => `Suma ${n} niveles entre todas tus máquinas`, tiers: [15, 40, 100, 250, 500, 1000],       val: () => allMachines().reduce((a, m) => a + m.level, 0) },
  { id: 'players', icon: '🧑', name: 'Lista VIP',                    goal: n => `Desbloquea ${n} clientes`,                  tiers: [2, 3, 4, 5, 6, 8, 10, 12, 15],            val: () => 1 + Object.keys(S.players).filter(k => k !== FREE_PLAYER && S.players[k] > 0).length },
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
  { t: 'Contrata a la Estudiante (Tienda → Jugadores) y siéntala', ok: () => allMachines().some(m => m.player !== FREE_PLAYER), g: 3 },
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
