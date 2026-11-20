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
  lucky:    { cat: 'slot',  name: 'Lucky 7',        sprite: 'slot',      hue: 0,   base: 1,    cycle: 2.5, place: 10,    license: 0,     w: 190, ay: .80, desc: 'La clásica tragaperras de toda la vida.' },
  emerald:  { cat: 'slot',  name: 'Esmeralda 7',    sprite: 'slot',      hue: 115, base: 5,    cycle: 3,   place: 150,   license: 400,   w: 190, ay: .80, desc: 'Brilla en verde. Paga 5 veces más.' },
  sapphire: { cat: 'slot',  name: 'Zafiro Deluxe',  sprite: 'slot',      hue: 205, base: 22,   cycle: 3.5, place: 1800,  license: 5000,  w: 195, ay: .80, desc: 'Tragaperras premium de luces azules.' },
  amethyst: { cat: 'slot',  name: 'Amatista Royal', sprite: 'slot',      hue: 280, base: 90,   cycle: 4,   place: 1.5e4, license: 4e4,   w: 200, ay: .80, desc: 'La joya de las tragaperras.' },
  blackjack:{ cat: 'table', name: 'Blackjack 21',   sprite: 'blackjack', hue: 0,   base: 420,  cycle: 5,   place: 1.2e5, license: 4e5,   w: 270, ay: .62, desc: 'El crupier pide en 16 y se planta en 17.' },
  craps:    { cat: 'table', name: 'Dados (Craps)',  sprite: 'craps',     hue: 0,   base: 2000, cycle: 6,   place: 1.5e6, license: 5e6,   w: 270, ay: .62, desc: 'Ruido, gritos y mucho dinero en juego.' },
  poker:    { cat: 'table', name: 'Póker Texas',    sprite: 'poker',     hue: 0,   base: 1e4,  cycle: 8,   place: 2e7,   license: 7e7,   w: 280, ay: .60, desc: 'Mesa de 6 jugadores. La más rentable.' },
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
const SPOTS_PER_ROOM = 6;

/* ------------- Suelo isométrico (coordenadas de la imagen 1536²) ------------- */
const FLOOR = { B: [770, 620], R: [1480, 1010], L: [60, 1010] };
function floorPt(u, v) {
  const { B, R, L } = FLOOR;
  return [B[0] + u * (R[0] - B[0]) + v * (L[0] - B[0]), B[1] + u * (R[1] - B[1]) + v * (L[1] - B[1])];
}
const SPOT_UV = [[0.36, 0.40], [0.64, 0.38], [0.92, 0.36], [0.34, 0.78], [0.62, 0.76], [0.90, 0.74]];
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
