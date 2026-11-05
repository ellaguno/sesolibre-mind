#!/usr/bin/env python3
"""Genera TODOS los íconos de SesoLibre Mind desde vectores (adaptado de sesolibre-games) (fuente única de verdad).

Ícono: un cerebro levantando una pesa, con la paleta de SesoLibre. El grafotipo
(assets/src/grafotipo.path: alas + cabeza del logo oficial) sigue disponible
vía mark() para la gráfica de Play. El diseño se compone aquí en SVG y se
rasteriza con Chrome headless (mismo motor que la PWA), así que cualquier
tamaño sale nítido.

Salidas:
  assets/icon.svg                 ícono completo (referencia / tiendas)
  assets/icon-only.png            1024, para @capacitor/assets (legacy + iOS)
  assets/icon-foreground.png      1024 transparente, capa adaptativa Android
  assets/icon-background.png      1024, capa de fondo adaptativa Android
  public/favicon.svg              favicon vectorial real
  public/icons/icon-192.png       PWA
  public/icons/icon-512.png       PWA
  public/icons/icon-512-maskable.png  PWA maskable (zona segura 80%)
  public/icons/apple-touch-icon.png   180, iOS Safari
  assets/play/icon-512.png        ícono de la ficha de Google Play

Uso:  npm run icons   (= python3 scripts/build-icons.py; requiere google-chrome / chromium)
Los mipmaps de Android se regeneran solos en scripts/android-apk.sh y android-aab.sh.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import math
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH_D = (ROOT / 'assets/src/grafotipo.path').read_text().strip()

# Transformación original del archivo del logo (Inkscape, coords PDF con Y
# invertida). Tras ella, el grafotipo ocupa aprox. x 129..413, y 13..98.
LOGO_TRANSFORM = (
    'matrix(1.3333333,0,0,-1.3333333,0,1056) '
    'matrix(0.79271731,0,0,0.79271731,-38.456705,414.6568)'
)
MARK_BOX = (129.0, 13.0, 284.0, 86.0)  # x, y, w, h (unidades del logo)

# Paleta de marca.
ORANGE = '#f49200'
MAGENTA = '#e5007e'
# Fondo índigo (SesoLibre Games usa morado): misma marca, app distinguible.
BG_TOP = '#2e3a9e'
BG_MID = '#1b2170'
BG_EDGE = '#0c0f3a'


def chrome_bin() -> str:
    for name in ('google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'):
        found = shutil.which(name)
        if found:
            return found
    sys.exit('No se encontró Chrome/Chromium para rasterizar.')


def mark(cx: float, cy: float, width: float, *, fill: str, extra: str = '') -> str:
    """El grafotipo centrado en (cx, cy) con el ancho pedido.

    El trazo original incluye también el texto "SesoLibre"; la máscara
    `#mark` (definida en unidades del logo) recorta solo alas + cabeza, y el
    relleno se pinta en un rect del tamaño exacto del grafotipo para que el
    degradado abarque justo la marca.
    """
    x, y, w, h = MARK_BOX
    s = width / w
    tx = cx - (x + w / 2) * s
    ty = cy - (y + h / 2) * s
    return (
        f'<g transform="translate({tx:.3f},{ty:.3f}) scale({s:.5f})" {extra}>'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" mask="url(#mark)"/></g>'
    )


def defs() -> str:
    # El degradado de la marca va en unidades del lienzo (userSpaceOnUse sobre
    # el <g> escalado sería frágil), de izquierda a derecha sobre el grafotipo.
    x, y, w, h = MARK_BOX
    return f'''<defs>
  <clipPath id="markbox"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>
  <mask id="mark" maskUnits="userSpaceOnUse" x="{x}" y="{y}" width="{w}" height="{h}">
    <g clip-path="url(#markbox)"><path transform="{LOGO_TRANSFORM}" d="{PATH_D}" fill="#fff" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></g>
  </mask>
  <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0.15">
    <stop offset="0" stop-color="#ffb21e"/>
    <stop offset="0.45" stop-color="{ORANGE}"/>
    <stop offset="0.75" stop-color="#ef3f5a"/>
    <stop offset="1" stop-color="{MAGENTA}"/>
  </linearGradient>
  <radialGradient id="bg" cx="0.5" cy="0.38" r="0.78">
    <stop offset="0" stop-color="{BG_TOP}"/>
    <stop offset="0.55" stop-color="{BG_MID}"/>
    <stop offset="1" stop-color="{BG_EDGE}"/>
  </radialGradient>
  <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#6d7bff" stop-opacity="0.5"/>
    <stop offset="0.45" stop-color="{MAGENTA}" stop-opacity="0.18"/>
    <stop offset="1" stop-color="{MAGENTA}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="glow" x="-30%" y="-60%" width="160%" height="220%">
    <feGaussianBlur stdDeviation="14" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="drop" x="-20%" y="-20%" width="140%" height="160%">
    <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#07010d" flood-opacity="0.6"/>
  </filter>
</defs>'''


# Fichas bajo el grafotipo: acentos de los puzzles de SesoLibre Mind
# (Coronas, Sol y Luna, Hilo, Parcelas).
TILE_COLORS = ['#a78bfa', '#f59e0b', '#22c55e', '#06b6d4']


def tiles(cx: float, cy: float, size: float, gap: float) -> str:
    n = len(TILE_COLORS)
    total = n * size + (n - 1) * gap
    x0 = cx - total / 2
    r = size * 0.24
    out = []
    for i, color in enumerate(TILE_COLORS):
        x = x0 + i * (size + gap)
        y = cy - size / 2
        out.append(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{size}" height="{size}" rx="{r:.2f}" fill="{color}"/>'
            f'<rect x="{x + size*0.12:.2f}" y="{y + size*0.1:.2f}" width="{size*0.76:.2f}" '
            f'height="{size*0.42:.2f}" rx="{r*0.7:.2f}" fill="url(#shine)"/>'
        )
    return f'<g filter="url(#drop)">{"".join(out)}</g>'

# --- Mascota: un cerebro levantando una pesa -------------------------------
# Dibujado en coordenadas de 1024 alrededor de (512, BRAIN_CY); `brain()` lo
# coloca y escala. Ocupa aprox. x 250..774, y 284..722: cabe en el círculo
# seguro del ícono adaptativo (radio ~313) a escala 1.
BRAIN_CY = 503

def _scallop(cx, cy, rx, ry, n, bulge, a0, a1):
    """Contorno festoneado sobre un arco de elipse (ángulos en grados, sentido horario en pantalla)."""
    pts=[]
    for k in range(n+1):
        a=math.radians(a0+(a1-a0)*k/n)
        pts.append((cx+rx*math.cos(a), cy+ry*math.sin(a)))
    d=f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for k in range(n):
        am=math.radians(a0+(a1-a0)*(k+0.5)/n)
        qx=cx+(rx+bulge)*math.cos(am); qy=cy+(ry+bulge)*math.sin(am)
        x,y=pts[k+1]
        d+=f' Q{qx:.1f} {qy:.1f} {x:.1f} {y:.1f}'
    return d

def _hemi(side):
    # side -1 izquierda, +1 derecha. Centro del hemisferio desplazado del eje.
    cx=512+side*92; cy=572; rx=130; ry=150
    if side<0:
        d=_scallop(cx,cy,rx,ry,7,34,90,270)  # de abajo, por la izquierda, a arriba
        d+=f' L512 {cy-ry+8} L512 {cy+ry-6} Z'
    else:
        d=_scallop(cx,cy,rx,ry,7,34,-90,90)
        d+=f' L512 {cy+ry-6} L512 {cy-ry+8} Z'
    return d

BRAIN_D = _hemi(-1)+' '+_hemi(1)

GYRI = ' '.join([
  'M432 452 C 462 470, 462 500, 436 516',
  'M592 452 C 562 470, 562 500, 588 516',
  'M372 520 C 402 520, 412 540, 404 562',
  'M652 520 C 622 520, 612 540, 620 562',
  'M360 640 C 384 626, 402 640, 404 664',
  'M664 640 C 640 626, 622 640, 620 664',
])

def _brain_body() -> str:
    face=('<ellipse cx="466" cy="612" rx="27" ry="31" fill="#fff"/>'
          '<ellipse cx="558" cy="612" rx="27" ry="31" fill="#fff"/>'
          '<circle cx="471" cy="618" r="15" fill="#1b1036"/>'
          '<circle cx="553" cy="618" r="15" fill="#1b1036"/>'
          '<circle cx="476" cy="611" r="5" fill="#fff"/><circle cx="558" cy="611" r="5" fill="#fff"/>'
          '<path d="M480 672 Q 512 700, 544 672" fill="none" stroke="#1b1036" stroke-width="11" stroke-linecap="round"/>'
          '<ellipse cx="428" cy="668" rx="21" ry="12" fill="#ff7aa8" opacity="0.6"/>'
          '<ellipse cx="596" cy="668" rx="21" ry="12" fill="#ff7aa8" opacity="0.6"/>')
    db=('<rect x="352" y="330" width="320" height="22" rx="11" fill="#c9d0ff"/>'
        '<rect x="328" y="284" width="40" height="114" rx="12" fill="#eef0ff"/>'
        '<rect x="304" y="302" width="28" height="78" rx="10" fill="#b7bff7"/>'
        '<rect x="656" y="284" width="40" height="114" rx="12" fill="#eef0ff"/>'
        '<rect x="692" y="302" width="28" height="78" rx="10" fill="#b7bff7"/>'
        '<rect x="335" y="292" width="11" height="98" rx="5.5" fill="#fff"/>'
        '<rect x="663" y="292" width="11" height="98" rx="5.5" fill="#fff"/>')
    arms='M384 580 C 300 590, 250 520, 268 456 C 282 404, 350 392, 384 342 M640 580 C 724 590, 774 520, 756 456 C 742 404, 674 392, 640 342'
    hands='<circle cx="384" cy="341" r="27" fill="#5a0838"/><circle cx="640" cy="341" r="27" fill="#5a0838"/><circle cx="384" cy="341" r="20" fill="#ffc46b"/><circle cx="640" cy="341" r="20" fill="#ff6b9a"/>'
    shine='<path d="M400 470 C 420 440, 455 428, 480 432" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="16" stroke-linecap="round"/>'
    return (
      '<defs><linearGradient id="arm" gradientUnits="userSpaceOnUse" x1="250" y1="0" x2="774" y2="0"><stop offset="0" stop-color="#ffc46b"/><stop offset="1" stop-color="#ff6b9a"/></linearGradient></defs>'
      '<g filter="url(#drop)">'
      f'<path d="{arms}" fill="none" stroke="#5a0838" stroke-width="46" stroke-linecap="round"/>'
      f'<path d="{arms}" fill="none" stroke="url(#arm)" stroke-width="30" stroke-linecap="round"/>'
      f'{db}{hands}'
      f'<path d="{BRAIN_D}" fill="url(#brand)" filter="url(#glow)"/>'
      '<path d="M512 432 L512 716" stroke="#8a0a4e" stroke-opacity="0.6" stroke-width="10" stroke-linecap="round"/>'
      f'<path d="{GYRI}" fill="none" stroke="#8a0a4e" stroke-opacity="0.5" stroke-width="11" stroke-linecap="round"/>'
      f'{shine}{face}</g>')


def brain(cx: float, cy: float, scale: float = 1.0) -> str:
    tx = cx - 512 * scale
    ty = cy - BRAIN_CY * scale
    return f'<g transform="translate({tx:.2f},{ty:.2f}) scale({scale:.4f})">{_brain_body()}</g>'


def background(size: int = 1024) -> str:
    c = size / 2
    return (
        f'<rect width="{size}" height="{size}" fill="url(#bg)"/>'
        # Retícula de puntos muy tenue: textura "tablero de juego".
        f'<g fill="#ffffff" fill-opacity="0.05">'
        + ''.join(
            f'<circle cx="{x}" cy="{y}" r="3"/>'
            for x in range(32, size, 64)
            for y in range(32, size, 64)
        )
        + '</g>'
        f'<ellipse cx="{c}" cy="{c * 0.9}" rx="{size * 0.42}" ry="{size * 0.3}" fill="url(#halo)"/>'
    )


def foreground(size: int = 1024, scale: float = 1.0) -> str:
    """Contenido central. `scale` 1.0 = cabe en la zona segura adaptativa (61%)."""
    c = size / 2
    return brain(c, c, size / 1024 * scale)


def svg(body: str, size: int = 1024, *, rounded: float | None = None) -> str:
    clip = ''
    if rounded is not None:
        clip = f'<clipPath id="r"><rect width="{size}" height="{size}" rx="{rounded}"/></clipPath>'
        body = f'<g clip-path="url(#r)">{body}</g>'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'width="{size}" height="{size}">{defs()}{clip}{body}</svg>\n'
    )


def render(svg_text: str, out: Path, px: int, chrome: str, tmp: Path) -> None:
    src = tmp / 'in.svg'
    src.write_text(svg_text)
    html = tmp / 'in.html'
    html.write_text(
        '<html><body style="margin:0;background:transparent">'
        f'<img src="in.svg" style="display:block;width:{px}px;height:{px}px"></body></html>'
    )
    shot = tmp / 'shot.png'
    res = subprocess.run(
        [chrome, '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
         '--force-device-scale-factor=1', '--default-background-color=00000000',
         f'--window-size={px},{px}', f'--screenshot={shot}', html.as_uri()],
        capture_output=True, timeout=120,
        # Con un TMPDIR largo Chrome aborta ("Socket path too long").
        env={k: v for k, v in os.environ.items() if k != 'TMPDIR'},
    )
    # Chrome a veces aborta al cerrar (crashpad) DESPUÉS de escribir la captura:
    # lo que importa es que el PNG exista.
    if not shot.exists():
        sys.exit(f'Chrome no generó la captura para {out.name}:\n{res.stderr.decode()[-800:]}')
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(shot, out)
    print(f'  {out.relative_to(ROOT)} ({px}px)')


def main() -> None:
    chrome = chrome_bin()
    # Maskable / adaptativo: el contenido respeta la zona segura.
    full = svg(background() + foreground())
    # Ícono completo a sangre (el sistema lo recorta: launcher legacy, iOS).
    full_big = svg(background() + foreground(scale=1.18))
    # PWA "any" (escritorio, pestañas): ya trae sus esquinas redondeadas.
    pwa = svg(background() + foreground(scale=1.3), rounded=200)
    fg_only = svg(foreground())
    bg_only = svg(background())
    # Favicon: sin textura (ilegible a 16-32px), esquinas redondeadas.
    fav = svg(
        f'<rect width="1024" height="1024" fill="url(#bg)"/>' + brain(512, 512, 1.75),
        rounded=220,
    )

    (ROOT / 'assets/icon.svg').write_text(full_big)
    (ROOT / 'public/favicon.svg').write_text(fav)
    print('  assets/icon.svg, public/favicon.svg')

    with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as t:
        tmp = Path(t)
        render(full_big, ROOT / 'assets/icon-only.png', 1024, chrome, tmp)
        render(fg_only, ROOT / 'assets/icon-foreground.png', 1024, chrome, tmp)
        render(bg_only, ROOT / 'assets/icon-background.png', 1024, chrome, tmp)
        render(pwa, ROOT / 'public/icons/icon-192.png', 192, chrome, tmp)
        render(pwa, ROOT / 'public/icons/icon-512.png', 512, chrome, tmp)
        render(full, ROOT / 'public/icons/icon-512-maskable.png', 512, chrome, tmp)
        render(full_big, ROOT / 'public/icons/apple-touch-icon.png', 180, chrome, tmp)
        # Ficha de Google Play: 512x512 a sangre (Play aplica sus esquinas).
        render(full_big, ROOT / 'assets/play/icon-512.png', 512, chrome, tmp)


if __name__ == '__main__':
    main()
