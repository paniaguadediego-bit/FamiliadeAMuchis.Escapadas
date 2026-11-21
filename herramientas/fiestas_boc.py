#!/usr/bin/env python3
"""Fiestas patronales de los 31 municipios a partir de sus festivos locales oficiales (data/festivos.json, sacados del
Boletín Oficial de Canarias). Las añade (o rehace) en data/sitios.json como eventos con id «fiesta-…».

- Fuente: el BOC fija el DÍA festivo de cada fiesta local; el programa de actos (que suele durar más días) no viene ahí,
  así que cada evento lleva VERIFICAR con ese motivo. No se inventan fechas ni actos.
- No se crean: el Martes de Carnaval (ya está el Carnaval) ni las fiestas que la app ya tiene con su ficha propia.
- Los «lunes/día posterior a la Festividad de X» se juntan con su fiesta (mismo evento, varios días).
- Ubicación: el centro del municipio (media de sus sitios del catálogo), marcada como aproximada.
Ejecutar tras actualizar data/festivos.json (calendario de un año nuevo): python3 herramientas/fiestas_boc.py
"""
import json, os, re, unicodedata

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Ya en el catálogo con su ficha (municipio, palabra clave del festivo):
YA_ESTAN = [('La Orotava', 'corpus'), ('Güímar', 'socorro'), ('Puerto de la Cruz', 'gran poder'),
            ('Puerto de la Cruz', 'carmen'), ('Tegueste', 'san marcos'),
            ('Los Realejos', 'santa cruz')]
slug = lambda t: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()).strip('-')


def clave(nombre):
    """Fiesta a la que pertenece un festivo: «Lunes posterior a la Festividad de X» → «Festividad de X»."""
    n = re.sub(r'^(lunes|d[ií]a) (posterior|siguiente) a la ', '', nombre, flags=re.I)
    return n[0].upper() + n[1:]


def main():
    fest = json.load(open(os.path.join(REPO, 'data', 'festivos.json')))
    fuentes = {f[1][-20:]: f for f in fest['fuentes']}
    url_anio = {a: next(u for n, u in fest['fuentes'] if 'fiestas locales ' + a in n) for a in ('2026', '2027')}
    sitios = [s for s in json.load(open(os.path.join(REPO, 'data', 'sitios.json'))) if not s['id'].startswith('fiesta-')]
    nuevos = []
    for muni, dias in fest['locales'].items():
        grupos = {}
        for f, n in sorted(dias.items()):
            if 'carnaval' in n.lower() or any(m == muni and k in n.lower() for m, k in YA_ESTAN):
                continue
            grupos.setdefault(clave(n), []).append(f)
        # «Fiestas Patronales» a secas de un municipio que ya tiene otra con nombre: se juntan.
        if 'Fiestas Patronales' in grupos and len(grupos) > 1:
            otra = next(k for k in grupos if k != 'Fiestas Patronales' and 'Patronales' in k) if any('Patronales' in k for k in grupos if k != 'Fiestas Patronales') else None
            if otra:
                grupos[otra] += grupos.pop('Fiestas Patronales')
        pts = [(s['lat'], s['lon']) for s in sitios if s['municipio'] == muni and isinstance(s.get('lat'), (int, float))]
        if not pts:
            continue
        lat, lon = round(sum(p[0] for p in pts) / len(pts), 5), round(sum(p[1] for p in pts) / len(pts), 5)
        for nombre, fechas in grupos.items():
            por_anio = {}
            for f in sorted(fechas):
                por_anio.setdefault(f[:4], []).append(f)
            lista = []  # días seguidos (o casi: hasta 3 de separación) forman un tramo; si no, tramos aparte
            for fs in por_anio.values():
                for f in fs:
                    if lista and (int(f[8:]) - int(lista[-1][1][8:]) if f[:7] == lista[-1][1][:7] else 99) <= 3:
                        lista[-1][1] = f
                    else:
                        lista.append([f, f])
            txt = ' · '.join(f"{a}: " + ', '.join(f"{int(f[8:])}/{int(f[5:7])}" for f in fs) for a, fs in por_anio.items())
            ultimo = max(por_anio)
            nuevos.append({
                'id': ('fiesta-' + slug(muni) + '-' + slug(re.sub(r'^(Festividad|Fiestas Patronales) (de |del |en honor de )?(la |los |las |el )?', '', nombre)))[:60],
                'municipio': muni, 'nombre': f'{nombre} ({muni})', 'tipo': 'evento', 'lat': lat, 'lon': lon, 'aprox': True,
                'desc': f'Fiesta local de {muni}: día festivo oficial en el municipio. El programa de actos lo publica el ayuntamiento.',
                'fuente': f'Boletín Oficial de Canarias: fiestas locales {ultimo}', 'url': url_anio.get(ultimo, url_anio['2027']),
                'verificar': 'El BOC solo fija el día festivo; programa y actos, en la web del ayuntamiento',
                'cuando': {'tipo': 'fechas', 'lista': lista}, 'cuandoTxt': f'Festivo local (BOC) · {txt}'})
    ids = [n['id'] for n in nuevos]
    assert len(ids) == len(set(ids)), 'ids repetidos'
    with open(os.path.join(REPO, 'data', 'sitios.json'), 'w') as f:
        f.write('[\n' + ',\n'.join('  ' + json.dumps(s, ensure_ascii=False) for s in sitios + nuevos) + '\n]\n')
    print(len(nuevos), 'fiestas en', len({n['municipio'] for n in nuevos}), 'municipios')


if __name__ == '__main__':
    main()
