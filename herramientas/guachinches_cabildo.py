#!/usr/bin/env python3
"""Guachinches del censo de locales de hostelería y restauración del Cabildo de Tenerife (datos abiertos, CC BY)
→ sitios de tipo «guachinche» en data/sitios.json (ids «gua-…», que se rehacen cada vez).

- Fuente: https://datos.tenerife.es/ckan/dataset/locales-de-hosteleria-y-restauracion-en-tenerife (CSV georreferenciado).
- Solo los registrados con actividad «guachinche». Se guardan nombre, municipio y coordenadas; NO teléfonos, correos
  ni direcciones (regla del repo público), aunque el censo los traiga.
- Todos con VERIFICAR: abren por temporada y el dato puede ser antiguo (se indica el año de su última actualización).
Uso: python3 herramientas/guachinches_cabildo.py [ruta_al_csv]   (sin ruta, lo descarga)
"""
import csv, io, json, os, re, sys, time, unicodedata, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL_CSV = ('https://datos.tenerife.es/ckan/dataset/3cf96f37-47b7-4485-931c-c32a2b13e5c0/resource/'
           'db3c1200-847a-4d6a-b612-68b7ac61d613/download/locales-de-hosteleria-y-restauracion-en-tenerife.csv')
URL_FICHA = 'https://datos.tenerife.es/ckan/dataset/locales-de-hosteleria-y-restauracion-en-tenerife'
MUNIS = ['Adeje', 'Arafo', 'Arico', 'Arona', 'Buenavista del Norte', 'Candelaria', 'El Rosario', 'El Sauzal', 'El Tanque',
         'Fasnia', 'Garachico', 'Granadilla de Abona', 'Guía de Isora', 'Güímar', 'Icod de los Vinos', 'La Guancha',
         'La Matanza de Acentejo', 'La Orotava', 'La Victoria de Acentejo', 'Los Realejos', 'Los Silos', 'Puerto de la Cruz',
         'San Cristóbal de La Laguna', 'San Juan de la Rambla', 'San Miguel de Abona', 'Santa Cruz de Tenerife', 'Santa Úrsula',
         'Santiago del Teide', 'Tacoronte', 'Tegueste', 'Vilaflor de Chasna']
slug = lambda t: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()).strip('-')


def municipio(n):
    s = slug(n)
    for m in MUNIS:  # «La Victoria» → La Victoria de Acentejo, «La Laguna» → San Cristóbal de La Laguna…
        if slug(m) == s or slug(m).startswith(s + '-') or slug(m).endswith('-' + s):
            return m
    return ''


def leer(ruta):
    if ruta:
        return open(ruta, encoding='utf-8-sig').read()
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL_CSV, headers={'User-Agent': 'EscapadasCatalogo/1.0'}), timeout=180) as r:
                t = r.read().decode('utf-8-sig')
                if t.startswith('actividad_tipo'):
                    return t
        except Exception:
            pass
        time.sleep(15 * (i + 1))
    sys.exit('No se pudo descargar el censo del Cabildo')


def main():
    filas = [f for f in csv.DictReader(io.StringIO(leer(sys.argv[1] if len(sys.argv) > 1 else '')))
             if f['actividad_tipo'].strip().lower() == 'guachinche']
    sitios = [s for s in json.load(open(os.path.join(REPO, 'data', 'sitios.json'))) if not s['id'].startswith('gua-')]
    nuevos, ids, sin = [], set(), []
    for f in sorted(filas, key=lambda f: (f['municipio_nombre'], f['nombre'])):
        m = municipio(f['municipio_nombre'])
        try:
            lat, lon = round(float(f['latitud']), 5), round(float(f['longitud']), 5)
        except ValueError:
            lat = lon = None
        if not m or not lat or not (27.9 < lat < 28.7 and -17 < lon < -16):
            sin.append(f['nombre']); continue
        nombre = re.sub(r'\s+', ' ', f['nombre']).strip()
        base = ('gua-' + slug(nombre))[:44] + '-' + slug(m)[:14]
        i, id_ = 2, base
        while id_ in ids:
            id_, i = f'{base}-{i}', i + 1
        ids.add(id_)
        anio = (f['fecha_actualizacion'] or f['fecha_creacion'])[:4]
        nuevos.append({'id': id_, 'municipio': m, 'nombre': nombre, 'tipo': 'guachinche', 'lat': lat, 'lon': lon,
                       'desc': f'Guachinche registrado en el censo de hostelería del Cabildo de Tenerife ({m}).',
                       'fuente': 'Cabildo de Tenerife: locales de hostelería y restauración (datos abiertos, CC BY)',
                       'url': URL_FICHA, 'verificar': 'Abren por temporada; ' + (f'dato del censo de {anio}' if anio.isdigit() else 'fecha del dato desconocida')})
    with open(os.path.join(REPO, 'data', 'sitios.json'), 'w') as fh:
        fh.write('[\n' + ',\n'.join('  ' + json.dumps(s, ensure_ascii=False) for s in sitios + nuevos) + '\n]\n')
    print(len(nuevos), 'guachinches;', len(sin), 'sin municipio o coordenadas:', sin[:10])


if __name__ == '__main__':
    main()
