# Casino Idle Tycoon

Prototipo de juego IDLE tycoon de casino en vista isométrica: coloca y mejora tragaperras y mesas, elige qué cliente juega en cada una, abre salas cada vez más exigentes y vende el casino para ganar fichas de prestigio.

## Jugar
- **Versión de un solo archivo:** abre `dist/CasinoIdleTycoon.html` en el navegador (doble clic). Lleva todo dentro: imágenes, estilos y código.
- **Versión de desarrollo:** sirve la carpeta en local y abre http://localhost:8765
  ```
  python -m http.server 8765
  ```

## Estructura
| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de la página (menú, HUD, paneles) |
| `style.css` | Estilos |
| `data.js` | Datos de balance: salas, máquinas, clientes, hitos, huecos del suelo, objetivos (Iván) |
| `economy.js` | Estado y guardado, ingresos, mejoras, formato de números, prestigio (compartido) |
| `audio.js` | Música y efectos sintetizados (Iván) |
| `render.js` | Imágenes, personajes, dibujo isométrico, animaciones, clientes paseando (Iván) |
| `ui.js` | Ratón y teclado, acciones, panel de máquina, modales, objetivos, HUD (Iván) |
| `slot-room.js` | Entrar en una tragaperras con doble clic y jugar la slot en primera persona (Iván) |
| `gift.js` | Regalo misterioso: bolsa de dinero escondida cada 5 minutos (Iván) |
| `missions.js` | Misiones por escalones y recompensa diaria con racha de 7 días; los datos están en `data.js` (`MISSIONS`, `DAILY`) (Iván) |
| `slots/` | Cada slot jugable es un HTML propio; hoy `happy-dinner.html` |
| `online.js` | Cuentas, nube, amigos, ranking y retos (amigo; vacío por ahora) |
| `main.js` | Bucle principal y arranque; se carga el último |
| `assets/` | Fondos de sala y sprites (4 niveles visuales por máquina) en WebP |
| `build.py` | Genera `dist/CasinoIdleTycoon.html` con todo incrustado |
| `DISENO_Y_ANALISIS.md` | Diseño del juego y análisis de otros IDLE |

## Cambiar el balance
Los datos están en `data.js` (`ROOMS`, `TYPES`, `PLAYERS`, `MILESTONES`, `GOALS`) y las fórmulas `upgradeCost` / `upgradeTime` en `economy.js`.

Los scripts se cargan en `index.html` en un orden fijo (datos → economía → audio → render → ui → slot-room → gift → missions → online → main).

## Añadir otra slot jugable
1. Copia su HTML en `slots/`. Debe aceptar el saldo por `window.name` (`{"balance":…, "embedded":true}`) y enviar `slotsim:balance` y `slotsim:close` al juego con `postMessage`, como hace `happy-dinner.html` en su último `<script>`.
2. Añádela a `SLOT_GAMES` en `slot-room.js` y elige qué máquinas la abren en `SLOT_FOR_TYPE`.
3. Ejecuta `python build.py`: la incrusta sola en el archivo único. Si añades un archivo, ponlo en su sitio de esa lista; `build.py` los incrusta en el mismo orden.

Tras cambiar algo, regenera la versión de un solo archivo:
```
python build.py
```
