#!/usr/bin/env python3
"""
Construye index.html a partir de src/index.template.html embebiendo los logos de assets/ como WebP base64.
Uso (en la carpeta del proyecto, cualquier máquina con Python 3 + Pillow):
    python tools/build.py
Si cambias assets/logo-sedapal.png o assets/logo-kolh.png (p. ej. por el PNG oficial transparente), vuelve a correrlo.
"""
import base64
import io
import pathlib
import sys

from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PLANTILLA = RAIZ / 'src' / 'index.template.html'
SALIDA = RAIZ / 'index.html'
LOGOS = {
    '__LOGO_SEDAPAL__': (RAIZ / 'assets' / 'logo-sedapal.png', 400, 82),
    '__LOGO_KOLH__': (RAIZ / 'assets' / 'logo-kolh.png', 320, 88),
}


def webp_data_uri(ruta: pathlib.Path, ancho: int, calidad: int) -> str:
    im = Image.open(ruta).convert('RGBA')
    im.thumbnail((ancho, ancho))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=calidad, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def main() -> int:
    html = PLANTILLA.read_text(encoding='utf-8')
    for marcador, (ruta, ancho, calidad) in LOGOS.items():
        if not ruta.exists():
            print(f'Falta {ruta}', file=sys.stderr)
            return 1
        html = html.replace(marcador, webp_data_uri(ruta, ancho, calidad))
    if '__LOGO_' in html:
        print('Quedó un marcador sin reemplazar', file=sys.stderr)
        return 1
    SALIDA.write_text(html, encoding='utf-8')
    print(f'OK → {SALIDA} ({SALIDA.stat().st_size:,} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
