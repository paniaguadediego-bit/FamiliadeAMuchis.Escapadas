#!/usr/bin/env python3
"""Cartelera de HOY de los cines principales de Tenerife, leída de SensaCine (sensacine.com), y guardada en data/cine.json.

- Qué lee: la página pública de cada cine (/cines/cine/<id>/), que su robots.txt permite. Solo trae las sesiones del
  día: los otros días los carga la web con una ruta que su robots.txt no permite (/_/), así que no se usa.
  Por eso lo ejecuta GitHub Actions cada mañana (.github/workflows/cine.yml).
- Qué guarda por película: título, título original, géneros, edad recomendada, si es estreno, cartel, sinopsis, notas
  medias de SensaCine (prensa y usuarios, sobre 5) y las sesiones
  (hora y versión: doblada, VOSE o VO; 3D si lo indica). Enlace a la página del cine en SensaCine (la fuente).
- No inventa nada: si una página no se puede leer, ese cine queda vacío con su aviso.
"""
import json, re, os, time, html, datetime, urllib.request

UA = "Mozilla/5.0 (compatible; EscapadasCatalogo/1.0; +https://github.com/paniaguadediego-bit/FamiliadeAMuchis.Escapadas)"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CINES = [  # id de SensaCine, nombre, municipio (uno de los 31), zona del tiempo
    ('E0627', 'Yelmo Cines Meridiano', 'Santa Cruz de Tenerife', 'este'),
    ('E0284', 'Multicines Tenerife', 'San Cristóbal de La Laguna', 'laguna'),
    ('E0622', 'Yelmo Cines La Villa', 'La Orotava', 'norte'),
    ('E0700', 'X-Sur Cine', 'Adeje', 'sur'),
    ('E0541', 'Multicines Zentral Center', 'Arona', 'sur'),
]
MESES = {m: i + 1 for i, m in enumerate(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                                         'septiembre', 'octubre', 'noviembre', 'diciembre'])}
limpia = lambda x: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()


def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception:
            time.sleep(10 * (i + 1))
    return ''


def version(exp, texto):
    e = ' '.join(exp)
    if 'Version.Original' in e:
        return 'VOSE' if 'Subtitle' in e else 'VO'
    if 'Version.Spanish' in e:
        return 'Doblada'
    t = texto.lower()
    return 'VOSE' if 'subtitulada' in t or 'vose' in t else 'VO' if 'original' in t else 'Doblada'


def pelicula(card):
    titulo = limpia((re.search(r'class="meta-title-link"[^>]*>(.*?)</a>', card, re.S) or [None, ''])[1])
    if not titulo:
        return None, None
    orig = limpia((re.search(r'T[íi]tulo original\s*</span>\s*<span[^>]*>(.*?)</span>', card, re.S) or [None, ''])[1])
    info = (re.search(r'meta-body-info">(.*?)</div>', card, re.S) or [None, ''])[1]
    generos = [limpia(g) for g in re.findall(r'dark-grey-link">([^<]+)</span>', info)]
    edad = limpia((re.search(r'certificate-text">(.*?)</span>', card, re.S) or [None, ''])[1])
    img = (re.search(r'<img[^>]*class="thumbnail-img[^"]*"[^>]*>', card) or [''])[0]  # (v50) la clase puede llevar más nombres
    cartel = (re.search(r'data-src="(https://[^"]+/c_160_213/[^"]+)"', img) or re.search(r'src="(https://[^"]+/c_160_213/[^"]+)"', img) or [None, ''])[1]
    estreno = 'estreno esta semana' in card.lower()
    sinopsis = limpia((re.search(r'<div class="synopsis">\s*<div class="content-txt[^"]*">(.*?)</div>', card, re.S) or [None, ''])[1])
    notas = {}  # notas medias de SensaCine (sobre 5): «Medios» (prensa) y «Usuarios»
    for quien, nota in re.findall(r'rating-title">\s*(Medios|Usuarios)\s*</span>.*?stareval-note">([\d,]+)<', card, re.S):
        notas['prensa' if quien == 'Medios' else 'usuarios'] = float(nota.replace(',', '.'))
    sesiones, fecha = [], ''
    for bloque in re.split(r'<div class="showtimes-version">', card)[1:]:
        texto = limpia((re.search(r'<div class="text">(.*?)</div>', bloque, re.S) or [None, ''])[1])
        m = re.match(r'(\d{1,2}) de (\w+) de (\d{4})', texto)
        if m and m.group(2).lower() in MESES:
            fecha = f'{m.group(3)}-{MESES[m.group(2).lower()]:02d}-{int(m.group(1)):02d}'
        for trozo in bloque.split('showtimes-hour-block"')[1:]:  # cada sesión (con o sin enlace de compra)
            hora = re.search(r'showtimes-hours?-item-value">\s*(\d{1,2}:\d\d)', trozo)
            if not hora:
                continue
            hora = hora.group(1); exp = (re.search(r'data-experiences="([^"]*)"', trozo) or [None, ''])[1]
            e = re.findall(r'[A-Za-z.]+', html.unescape(exp))
            s = {'h': hora, 'v': version(e, texto)}
            if any('3D' in x for x in e):
                s['f'] = '3D'
            if s not in sesiones:  # la misma hora en dos salas cuenta una vez
                sesiones.append(s)
    if not sesiones:
        return None, fecha
    sesiones.sort(key=lambda s: (s['h'], s['v']))
    p = {'titulo': titulo, 'generos': generos[:3], 'sesiones': sesiones}
    if orig and orig.lower() != titulo.lower():
        p['original'] = orig
    if edad:
        p['edad'] = edad.replace('Pelicula', 'Película')
    if cartel:
        p['cartel'] = cartel
    if estreno:
        p['estreno'] = True
    if sinopsis:
        p['sinopsis'] = sinopsis if len(sinopsis) <= 420 else sinopsis[:420].rsplit(' ', 1)[0] + '…'
    if notas:
        p['notas'] = notas
    return p, fecha


def main():
    salida, fechas = [], set()
    for cid, nombre, muni, zona in CINES:
        url = f'https://www.sensacine.com/cines/cine/{cid}/'
        pag = get(url); time.sleep(2)
        pelis = []
        for card in re.split(r'<div class="card entity-card entity-card-list movie-card-theater', pag)[1:]:
            p, f = pelicula(card)
            if f:
                fechas.add(f)
            if p:
                pelis.append(p)
        pelis.sort(key=lambda p: (not p.get('estreno'), p['titulo']))
        salida.append({'id': cid, 'nombre': nombre, 'municipio': muni, 'zona': zona, 'url': url, 'peliculas': pelis,
                       **({} if pag else {'aviso': 'No se pudo leer la cartelera'})})
    hoy = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    datos = {'fuente': 'SensaCine · sensacine.com', 'fecha': max(fechas) if fechas else hoy,
             'actualizado': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'cines': salida}
    with open(os.path.join(REPO, 'data', 'cine.json'), 'w') as f:
        json.dump(datos, f, ensure_ascii=False, indent=0)
    print(datos['fecha'], '·', ' · '.join(f"{c['nombre']}: {len(c['peliculas'])} películas, "
                                         f"{sum(1 for p in c['peliculas'] for s in p['sesiones'] if s['v'] != 'Doblada')} sesiones VO/VOSE"
                                         for c in salida))


if __name__ == '__main__':
    main()
