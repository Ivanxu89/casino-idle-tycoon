"""Genera dist/CasinoIdleTycoon.html: el juego en UN solo archivo (CSS, JS e imágenes incrustadas).

Uso:  python build.py
Solo usa la librería estándar de Python.
"""
import base64
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

assets = {}
for f in sorted((ROOT / 'assets').glob('*.webp')):
    assets[f'assets/{f.name}'] = 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode()

css = (ROOT / 'style.css').read_text(encoding='utf-8')
css = css.replace('url(assets/room_0.webp)', f'url({assets["assets/room_0.webp"]})')
js = (ROOT / 'game.js').read_text(encoding='utf-8')
html = (ROOT / 'index.html').read_text(encoding='utf-8')

html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')
html = html.replace(
    '<script src="game.js"></script>',
    f'<script>window.ASSETS = {json.dumps(assets)};</script>\n<script>\n{js}\n</script>',
)
assert 'href="style.css"' not in html and 'src="game.js"' not in html, 'plantilla index.html cambiada'

out = DIST / 'CasinoIdleTycoon.html'
out.write_text(html, encoding='utf-8')
print(f'{out}  ({out.stat().st_size / 1e6:.1f} MB, {len(assets)} imágenes)')
