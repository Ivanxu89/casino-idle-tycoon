# Casino Idle Tycoon — Diseño y análisis de referentes IDLE

## Cómo ejecutarlo
Abre `index.html` en Chrome/Edge (doble clic). Si el navegador bloquea algo, sírvelo en local:
`python -m http.server 8765 --directory CasinoIdleTycoon` y abre http://localhost:8765.
La partida se guarda sola (localStorage) cada 5 s.

## Qué hay implementado
| Sistema | Detalle |
|---|---|
| Menú principal | JUGAR · ELEGIR/COMPRAR · SALAS · SONIDO |
| Elegir/Comprar | Pestañas **Máquinas** (4 tragaperras), **Juegos** (Blackjack, Dados, Póker) y **Jugadores** (9 clientes) |
| Colocar máquinas | Cuesta monedas; cada máquina extra en la misma sala cuesta x1.6 más |
| Mejoras | Coste x1.14 por nivel y tiempo creciente (`3 + 0.9·nivel^1.35` s × multiplicador de sala). Se pueden acelerar con gemas |
| Hitos | Nv 10/25/50/100/150/200 → ingresos x2 y gemas. Aspecto nuevo en Nv 25/50/100 (oxidada → normal → dorada → diamantes) |
| Salas (5) | Cada sala multiplica ingresos, pero el coste de mejora crece mucho más (x1 → x60.000) y el tiempo también (x1 → x4.5) |
| Jugadores | Estudiante (x1, pobre) … Magnate (x600). Cuanto más rico, más caro de desbloquear |
| Vista | Isométrica con tus fondos de sala; slots con rodillos girando, luz que parpadea, rebote, monedas; dados y cartas en mesas |
| Sonido | Música lounge generativa y efectos sintetizados (WebAudio), volumen de música/efectos y silencio |
| Prestigio (👑 Vender) | Vende el casino al ganar ≥ $1M en la partida: fichas = √(ganado / 1M). Cada ficha da +10% de ingresos para siempre. Se reinicia dinero, máquinas, salas, licencias y jugadores; se conservan fichas, gemas, objetivos y ajustes |
| Clientes paseando | Entran por la puerta, recorren los pasillos entre máquinas, se paran y muestran emojis, y salen. Más máquinas = más clientes (máx. 8); las salas mejores atraen clientes más ricos. Los que llevan **$** dorado dan una propina (8 s de ingresos) al tocarlos |
| Retención | Ganancias offline (50%, máx. 4 h, x2 con gemas), cadena de objetivos con recompensa |

Los números de balance están en `data.js` (`ROOMS`, `TYPES`, `PLAYERS`, `MILESTONES`) y las fórmulas de `upgradeCost` / `upgradeTime` en `economy.js`.

## Análisis: qué funciona en los IDLE tycoon
Referentes: AdVenture Capitalist, Idle Miner Tycoon, Egg, Inc., Cookie Clicker, Hotel Empire Tycoon, Idle Supermarket Tycoon, Eatventure.

1. **Bucle corto y visible.** El jugador debe ver dinero entrando en los primeros 10 s y poder gastar a los 30 s. Barras de progreso y "+$" flotantes en cada cobro. → Implementado (ciclo de 2,5 s, primera máquina por $10).
2. **Crecimiento exponencial con escalones.** Coste exponencial (~1.07–1.15 por nivel) contra ingreso lineal, con **hitos x2** que rompen la pared justo cuando se empieza a notar. Es el patrón de AdVenture Capitalist. → Implementado.
3. **Siempre hay una próxima compra a la vista.** Indicadores de "puedes mejorar" (flecha verde) y precios visibles. → Implementado.
4. **Temporizadores = sesiones cortas y repetidas.** Mejoras con tiempo (Hotel Empire, juegos de construcción) crean motivos para volver; el acelerador con moneda premium es la principal palanca de monetización. → Implementado con gemas.
5. **Ganancias offline.** Volver y recoger es el momento más gratificante del género; casi todos ofrecen x2 por anuncio. → Implementado (x2 con gemas; en producción, con anuncio recompensado).
6. **Managers / personajes.** En Idle Miner los managers automatizan y multiplican; en tu diseño los **clientes ricos** cumplen ese papel y añaden colección y personalidad. → Implementado.
7. **Nuevas zonas con reinicio suave.** Minas/continentes nuevos (Idle Miner) renuevan el bucle con números más grandes y un aspecto distinto. → Implementado con 5 salas con dificultad creciente.
8. **Mejora visual del activo.** Ver la máquina pasar de oxidada a diamantes es una recompensa en sí. → Implementado con tus 4 tiers.
9. **FTUE guiado por objetivos.** Una cadena de misiones con recompensa enseña el juego sin tutorial pesado. → Implementado (14 objetivos).

### Lo siguiente que recomiendo añadir (por impacto)
1. ~~Prestigio~~ y ~~clientes paseando~~ → implementados. Siguiente paso del prestigio: una **tienda de fichas** (gastar 👑 en mejoras permanentes como "mejoras un 10% más rápidas").
2. **Comprar x1 / x10 / MAX** en mejoras cuando haya mucho dinero.
3. **Boosts temporales** (x2 durante 30 min por anuncio) y **eventos** temáticos (p. ej. Black Friday con una sala/skin limitada).
4. **Recompensa diaria / ruleta** y **misiones diarias** para la retención D1/D7.
5. **Crupier animado** en el mostrador, para que el casino parezca aún más vivo.
6. **Mejoras de sala** (decoración que da +% global): da sentido a quedarse en salas antiguas.

> Nota: si el juego simula apuestas con dinero real o se publica en mercados regulados, revisad las normativas de juego simulado y la clasificación por edades antes de lanzar.
