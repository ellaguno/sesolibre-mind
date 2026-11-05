#!/usr/bin/env python3
"""Gráfico de funciones de Google Play (1024×500), en español e inglés.

Reutiliza la mascota (cerebro con pesa) y los degradados de build-icons.py y lo
rasteriza con Chrome headless.

Salidas: assets/play/feature-graphic.png (es) y assets/play/feature-graphic-en.png
Uso:     python3 scripts/build-feature-graphic.py
"""
from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('icons', ROOT / 'scripts/build-icons.py')
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)

W, H = 1024, 500
TEXTS = {
    'es': ('Ejercita tu mente', 'unos minutos al día', 'Puzzles de lógica · Ejercicios rápidos · Sin conexión'),
    'en': ('Exercise your mind', 'a few minutes a day', 'Logic puzzles · Quick exercises · Offline'),
}


def graphic(lang: str) -> str:
    title, sub, foot = TEXTS[lang]
    dots = ''.join(
        f'<circle cx="{x}" cy="{y}" r="2.5"/>' for x in range(24, W, 48) for y in range(24, H, 48)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
{icons.defs()}
<radialGradient id="bgw" cx="0.3" cy="0.45" r="0.9">
  <stop offset="0" stop-color="{icons.BG_TOP}"/><stop offset="0.6" stop-color="{icons.BG_MID}"/>
  <stop offset="1" stop-color="{icons.BG_EDGE}"/>
</radialGradient>
<rect width="{W}" height="{H}" fill="url(#bgw)"/>
<g fill="#ffffff" fill-opacity="0.05">{dots}</g>
<ellipse cx="235" cy="230" rx="230" ry="160" fill="url(#halo)"/>
{icons.brain(235, 250, 0.68)}
<g font-family="Roboto, 'Noto Sans', Arial, sans-serif" fill="#ffffff">
  <text x="470" y="160" font-size="28" font-weight="700" fill="#c7d2fe" letter-spacing="2">SESOLIBRE MIND</text>
  <text x="470" y="226" font-size="46" font-weight="800">{title}</text>
  <text x="470" y="280" font-size="38" font-weight="400" fill="#e0e7ff">{sub}</text>
  <text x="470" y="350" font-size="19" font-weight="500" fill="#a5b4fc">{foot}</text>
</g>
</svg>
'''


def render(svg_text: str, out: Path, chrome: str, tmp: Path) -> None:
    (tmp / 'in.svg').write_text(svg_text)
    html = tmp / 'in.html'
    html.write_text(
        f'<html><body style="margin:0"><img src="in.svg" style="display:block;width:{W}px;height:{H}px"></body></html>'
    )
    shot = tmp / 'shot.png'
    subprocess.run(
        [chrome, '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
         '--force-device-scale-factor=1', f'--window-size={W},{H}', f'--screenshot={shot}', html.as_uri()],
        capture_output=True, timeout=120,
        env={k: v for k, v in os.environ.items() if k != 'TMPDIR'},
    )
    if not shot.exists():
        sys.exit(f'Chrome no generó {out.name}')
    shutil.move(shot, out)
    print(f'  {out.relative_to(ROOT)} ({W}x{H})')


def main() -> None:
    chrome = icons.chrome_bin()
    with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as t:
        tmp = Path(t)
        render(graphic('es'), ROOT / 'assets/play/feature-graphic.png', chrome, tmp)
        render(graphic('en'), ROOT / 'assets/play/feature-graphic-en.png', chrome, tmp)


if __name__ == '__main__':
    main()
