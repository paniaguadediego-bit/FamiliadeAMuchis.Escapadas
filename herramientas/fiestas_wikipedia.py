#!/usr/bin/env python3
"""Busca en Wikipedia las fiestas de los 31 municipios de Tenerife y las deja en data/fiestas-auto.json.

Lee el texto de cada artículo de municipio, se queda con las frases que hablan de fiestas, romerías o
patronos y tienen una fecha que se pueda convertir en regla (día fijo, «último domingo de agosto»,
«primer sábado de septiembre»…). Cada fiesta lleva la frase literal como prueba y VERIFICAR, porque la
lectura es automática. No inventa nada: si la frase no da un día claro, la fiesta no entra.

Uso:  python3 herramientas/fiestas_wikipedia.py  [carpeta_cache]
Lo ejecuta también GitHub Actions cada mes (.github/workflows/fiestas.yml).
"""
import json, re, sys, time, os, urllib.request, urllib.parse, urllib.error

UA = "EscapadasCatalogo/1.0 (https://github.com/paniaguadediego-bit/FamiliadeAMuchis.Escapadas)"
AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(AQUI)
# Artículo de Wikipedia de cada municipio (el nombre, salvo los que en Wikipedia llevan aclaración).
MUNICIPIOS = {
    'Adeje': 'Adeje', 'Arafo': 'Arafo', 'Arico': 'Arico', 'Arona': 'Arona', 'Buenavista del Norte': 'Buenavista del Norte',
    'Candelaria': 'Candelaria (Tenerife)', 'El Rosario': 'El Rosario (Tenerife)', 'El Sauzal': 'El Sauzal', 'El Tanque': 'El Tanque',
    'Fasnia': 'Fasnia', 'Garachico': 'Garachico', 'Granadilla de Abona': 'Granadilla de Abona', 'Guía de Isora': 'Guía de Isora',
    'Güímar': 'Güímar', 'Icod de los Vinos': 'Icod de los Vinos', 'La Guancha': 'La Guancha', 'La Matanza de Acentejo': 'La Matanza de Acentejo',
    'La Orotava': 'La Orotava', 'La Victoria de Acentejo': 'La Victoria de Acentejo', 'Los Realejos': 'Los Realejos', 'Los Silos': 'Los Silos',
    'Puerto de la Cruz': 'Puerto de la Cruz', 'San Cristóbal de La Laguna': 'San Cristóbal de La Laguna', 'San Juan de la Rambla': 'San Juan de la Rambla',
    'San Miguel de Abona': 'San Miguel de Abona', 'Santa Cruz de Tenerife': 'Santa Cruz de Tenerife', 'Santa Úrsula': 'Santa Úrsula',
    'Santiago del Teide': 'Santiago del Teide', 'Tacoronte': 'Tacoronte', 'Tegueste': 'Tegueste', 'Vilaflor de Chasna': 'Vilaflor de Chasna'
}
MESES = {m: i + 1 for i, m in enumerate(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'])}
DIAS = {'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4, 'viernes': 5, 'sábado': 6}
ORD = {'primer': 1, 'primero': 1, 'segundo': 2, 'tercer': 3, 'tercero': 3, 'cuarto': 4, 'último': -1}
FIESTA = re.compile(r'fiesta|romer[ií]a|patr[oó]n|patrona|festividad|bajada|procesi[oó]n|celebra', re.I)


def get(params):
    u = "https://es.wikipedia.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json"})
    for i in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=40) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(20 * (i + 1))
    raise SystemExit('Wikipedia sigue respondiendo 429')


def texto(titulo, cache):
    f = os.path.join(cache, re.sub(r'[^\w]+', '_', titulo) + '.json') if cache else None
    if f and os.path.exists(f):
        return json.load(open(f))
    d = get({"action": "query", "prop": "extracts|info", "inprop": "url", "explaintext": 1, "titles": titulo, "redirects": 1})
    p = next(iter(d["query"]["pages"].values()))
    r = {"titulo": p.get("title"), "url": p.get("fullurl"), "txt": p.get("extract", "")}
    if f:
        json.dump(r, open(f, 'w'), ensure_ascii=False)
    time.sleep(8)
    return r


def frases(txt):
    # Corta en frases y en líneas de lista («San Vicente Mártir: … se celebra el 22 de enero.»)
    for linea in txt.split('\n'):
        for f in re.split(r'(?<=[.;])\s+(?=[A-ZÁÉÍÓÚ«])', linea):
            f = f.strip()
            if 25 <= len(f) <= 400:
                yield f


def regla(f):
    """Devuelve (cuando, fragmento) si la frase trae una fecha que se pueda calcular cada año."""
    m = re.search(r'\b(primer|primero|segundo|tercer|tercero|cuarto|último)\s+(domingo|lunes|martes|miércoles|jueves|viernes|sábado)\s+de\s+(' + '|'.join(MESES) + r')\b', f, re.I)
    if m:
        return {"tipo": "semana", "mes": MESES[m.group(3).lower()], "dow": DIAS[m.group(2).lower()], "n": ORD[m.group(1).lower()]}, m.group(0)
    m = re.search(r'\b(\d{1,2})\s+(?:y\s+(\d{1,2})\s+)?de\s+(' + '|'.join(MESES) + r')\b', f, re.I)
    if m:
        d1, d2, mes = int(m.group(1)), m.group(2), MESES[m.group(3).lower()]
        if 1 <= d1 <= 31:
            dias = int(d2) - d1 + 1 if d2 and int(d2) > d1 else 1
            return {"tipo": "fija", "mes": mes, "dia": d1, "dias": dias}, m.group(0)
    return None


def nombre_de(f, muni):
    # El nombre de la fiesta: «Fiestas de …», «Romería de …», «… en honor a …», o el santo del principio de la línea.
    for p in [r'((?:Fiestas?|Romer[ií]a|Bajada|Festividad)\s+(?:de\s+|del\s+|en honor\s+(?:a|de|al)\s+)[^,.;:()]{3,60})',
              r'^([A-ZÁÉÍÓÚ][^:]{3,60}):', r'en honor\s+(?:a|de|al)\s+([^,.;:()]{3,50})']:
        m = re.search(p, f)
        if m:
            n = m.group(1).strip()
            n = re.sub(r'\s+(que|se|el|la|los|las|y)$', '', n)
            return n[0].upper() + n[1:]
    return None


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else None
    if cache:
        os.makedirs(cache, exist_ok=True)
    base = json.load(open(os.path.join(REPO, 'data', 'sitios.json')))
    ya = {re.sub(r'\W', '', s['nombre'].lower()) for s in base}
    centro = {}
    for s in base:  # coordenadas: las del pueblo (sitio de tipo pueblo del municipio) o el primer sitio
        if s['municipio'] not in centro or s['tipo'] == 'pueblo':
            centro.setdefault(s['municipio'], (s['lat'], s['lon']))
            if s['tipo'] == 'pueblo':
                centro[s['municipio']] = (s['lat'], s['lon'])
    salida, vistos = [], set()
    for muni, titulo in MUNICIPIOS.items():
        a = texto(titulo, cache)
        for f in frases(a['txt']):
            if not FIESTA.search(f):
                continue
            r = regla(f)
            if not r:
                continue
            nombre = nombre_de(f, muni)
            if not nombre or len(nombre) < 6:
                continue
            clave = (muni, json.dumps(r[0], sort_keys=True))
            if clave in vistos or re.sub(r'\W', '', nombre.lower()) in ya:
                continue
            vistos.add(clave)
            iden = 'auto-' + re.sub(r'[^a-z0-9]+', '-', (muni + ' ' + nombre).lower().translate(str.maketrans('áéíóúüñ', 'aeiouun'))).strip('-')[:60]
            la, lo = centro.get(muni, (28.29, -16.6))
            salida.append({"id": iden, "municipio": muni, "nombre": nombre[:80], "tipo": "evento", "lat": la, "lon": lo,
                           "desc": f"Fiesta de {muni}. Según Wikipedia: «{f}»", "fuente": "Wikipedia: " + a['titulo'], "url": a['url'],
                           "cuando": r[0], "cuandoTxt": r[1], "auto": True,
                           "verificar": "Encontrado automáticamente en Wikipedia: comprueba fecha y programa de este año"})
    salida.sort(key=lambda s: (s['cuando'].get('mes', 0), s['municipio']))
    with open(os.path.join(REPO, 'data', 'fiestas-auto.json'), 'w') as fo:
        fo.write('[\n' + ',\n'.join('  ' + json.dumps(s, ensure_ascii=False) for s in salida) + '\n]\n')
    print(len(salida), 'fiestas encontradas')


if __name__ == '__main__':
    main()
