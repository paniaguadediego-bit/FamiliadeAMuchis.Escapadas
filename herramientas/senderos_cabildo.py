#!/usr/bin/env python3
"""Senderos de la red oficial del Cabildo de Tenerife (datos abiertos, CC BY: «Itinerarios de la isla de Tenerife»)
→ sitios de tipo «sendero» en data/sitios.json (ids «sen-…», se rehacen cada vez) y sus trazados simplificados en
data/senderos.json ({id: [[lat, lon], …]}) para dibujarlos en el mapa.

- Fuente: https://datos.tenerife.es/ckan/dataset/itinerarios-de-la-isla-de-tenerife (CSV + GeoJSON).
- Solo «Sendero» con modalidad Lineal o Circular (no enlaces, derivaciones ni variantes cortas).
- Datos del CSV (en el GeoJSON las propiedades vienen descolocadas): matrícula, nombre, inicio, fin, distancia,
  desniveles, municipios. Del GeoJSON solo la línea (se empareja por matrícula y nombre).
- El punto del sendero es su salida (primer punto del trazado). Nada inventado: sin duración ni dificultad.
Uso: python3 herramientas/senderos_cabildo.py itinerarios.csv itinerarios.geojson
"""
import csv, json, math, os, re, sys, unicodedata

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'https://datos.tenerife.es/ckan/dataset/itinerarios-de-la-isla-de-tenerife'
MUNIS = ['Adeje', 'Arafo', 'Arico', 'Arona', 'Buenavista del Norte', 'Candelaria', 'El Rosario', 'El Sauzal', 'El Tanque',
         'Fasnia', 'Garachico', 'Granadilla de Abona', 'Guía de Isora', 'Güímar', 'Icod de los Vinos', 'La Guancha',
         'La Matanza de Acentejo', 'La Orotava', 'La Victoria de Acentejo', 'Los Realejos', 'Los Silos', 'Puerto de la Cruz',
         'San Cristóbal de La Laguna', 'San Juan de la Rambla', 'San Miguel de Abona', 'Santa Cruz de Tenerife', 'Santa Úrsula',
         'Santiago del Teide', 'Tacoronte', 'Tegueste', 'Vilaflor de Chasna']
slug = lambda t: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()).strip('-')


def municipio(n):
    s = slug(n)
    for m in MUNIS:
        if slug(m) == s or slug(m).startswith(s + '-') or slug(m).endswith('-' + s):
            return m
    return ''


def simplifica(pts, tol):
    """Douglas-Peucker sobre [lon, lat] (tolerancia en grados)."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    def dist(p):
        dx, dy = b[0] - a[0], b[1] - a[1]
        if dx == dy == 0:
            return math.hypot(p[0] - a[0], p[1] - a[1])
        return abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / math.hypot(dx, dy)
    i, dmax = max(((i, dist(p)) for i, p in enumerate(pts[1:-1], 1)), key=lambda x: x[1])
    if dmax <= tol:
        return [a, b]
    return simplifica(pts[:i + 1], tol)[:-1] + simplifica(pts[i:], tol)


def main():
    filas = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')))
    geo = json.load(open(sys.argv[2], encoding='utf-8-sig'))['features']
    lineas = {}
    for f in geo:
        p, g = f['properties'], f['geometry']
        cs = g['coordinates'] if g['type'] == 'LineString' else [c for parte in g['coordinates'] for c in parte]
        lineas[(p.get('itinerario_matricula') or '', p.get('itinerario_nombre') or '')] = cs
    sitios = [s for s in json.load(open(os.path.join(REPO, 'data', 'sitios.json'))) if not s['id'].startswith('sen-')]
    nuevos, trazos, ids = [], {}, set()
    for r in filas:
        if r['itinerario_clase'] != 'Sendero' or r['itinerario_modalidad'] not in ('Lineal', 'Circular'):
            continue
        mat, nom = r['itinerario_matricula'].strip(), re.sub(r'\s+', ' ', r['itinerario_nombre']).strip()
        cs = lineas.get((r['itinerario_matricula'], r['itinerario_nombre']))
        munis = [m for m in (municipio(x) for x in r['municipios_nombres'].split('|')) if m]
        if not cs or not munis:
            continue
        base = 'sen-' + slug(mat or nom)[:40]
        id_, i = base, 2
        while id_ in ids:
            id_, i = f'{base}-{i}', i + 1
        ids.add(id_)
        km, sube = round(float(r['itinerario_distancia']) / 1000, 1), round(float(r['itinerario_desnivel_positivo'] or 0))
        circ = r['itinerario_modalidad'] == 'Circular'
        lon, lat = cs[0][0], cs[0][1]
        tramo = f"circular desde {r['itinerario_inicio']}" if circ else f"de {r['itinerario_inicio']} a {r['itinerario_fin']}"
        nuevos.append({'id': id_, 'municipio': munis[0], 'nombre': nom + (f' ({mat})' if mat else ''), 'tipo': 'sendero',
                       'lat': round(lat, 5), 'lon': round(lon, 5),
                       'desc': f"Sendero oficial {tramo}: {str(km).replace('.', ',')} km y {sube} m de subida acumulada."
                               + (f" Pasa por {', '.join(munis)}." if len(munis) > 1 else ''),
                       'fuente': 'Cabildo de Tenerife: red de senderos (datos abiertos, CC BY)', 'url': URL,
                       'circular': circ, 'km': km, 'desnivel': sube, 'matricula': mat})
        trazos[id_] = [[round(p[1], 5), round(p[0], 5)] for p in simplifica([c[:2] for c in cs], 0.00025)]
    with open(os.path.join(REPO, 'data', 'sitios.json'), 'w') as fh:
        fh.write('[\n' + ',\n'.join('  ' + json.dumps(s, ensure_ascii=False) for s in sitios + nuevos) + '\n]\n')
    with open(os.path.join(REPO, 'data', 'senderos.json'), 'w') as fh:
        json.dump(trazos, fh, separators=(',', ':'))
    print(len(nuevos), 'senderos (', sum(n['circular'] for n in nuevos), 'circulares );', sum(len(t) for t in trazos.values()), 'puntos de trazado')


if __name__ == '__main__':
    main()
