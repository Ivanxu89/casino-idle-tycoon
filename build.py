"""Genera dist/CasinoIdleTycoon.html: el juego en UN solo archivo (CSS, JS e imágenes incrustadas).

Uso:  python build.py
Solo usa la librería estándar de Python.
"""
import base64
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

assets = {}
for f in sorted((ROOT / 'assets').glob('*.webp')):
    assets[f'assets/{f.name}'] = 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode()

css = (ROOT / 'style.css').read_text(encoding='utf-8')
css = css.replace('url(assets/room_0.webp)', f'url({assets["assets/room_0.webp"]})')
# Las slots (carpeta slots/) van en base64: su HTML trae etiquetas </script> que romperían el documento
slots = {f.stem: base64.b64encode(f.read_bytes()).decode() for f in sorted((ROOT / 'slots').glob('*.html'))}

html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>\n{css}\n</style>')

# Cada <script src="x.js"> de index.html se incrusta en su sitio, respetando el orden de carga.
scripts = re.findall(r'<script src="([\w.-]+\.js)"></script>', html)
assert scripts, 'no hay <script src> en index.html'
for i, name in enumerate(scripts):
    js = (ROOT / name).read_text(encoding='utf-8')
    inline = f'<script>/* {name} */\n{js}\n</script>'
    if i == 0:
        inline = (f'<script>window.ASSETS = {json.dumps(assets)};</script>\n'
                  f'<script>window.SLOT_HTML = {json.dumps(slots)};</script>\n' + inline)
    html = html.replace(f'<script src="{name}"></script>', inline)
assert 'href="style.css"' not in html and '<script src=' not in html, 'quedan archivos sin incrustar'

out = DIST / 'CasinoIdleTycoon.html'
out.write_text(html, encoding='utf-8')
print(f'{out}  ({out.stat().st_size / 1e6:.1f} MB, {len(assets)} imágenes, {len(slots)} slots)')
