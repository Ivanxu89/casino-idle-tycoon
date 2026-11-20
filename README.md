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
| `game.js` | Todo el juego: datos de balance, economía, render isométrico, clientes, sonido |
| `assets/` | Fondos de sala y sprites (4 niveles visuales por máquina) en WebP |
| `build.py` | Genera `dist/CasinoIdleTycoon.html` con todo incrustado |
| `DISENO_Y_ANALISIS.md` | Diseño del juego y análisis de otros IDLE |

## Cambiar el balance
Los números están al principio de `game.js`: `ROOMS`, `TYPES`, `PLAYERS`, `MILESTONES` y las fórmulas `upgradeCost` / `upgradeTime`.

Tras cambiar algo, regenera la versión de un solo archivo:
```
python build.py
```
