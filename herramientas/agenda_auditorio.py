#!/usr/bin/env python3
"""Programación del Auditorio de Tenerife (auditoriodetenerife.com; su robots.txt lo permite todo) → data/agenda_auditorio.json,
con el mismo formato que data/agenda.json (la app junta las dos y quita los repetidos).

- Qué lee: las páginas /es/evento/… de su sitemap (modificadas en el último año). De cada una: título y foto (og:),
  funciones («21 ene 19:00h. y 23 ene 19:00h.»), tipo («Ópera/…», «Teatro/…», «Música/…», «Danza/…»), sala y el comienzo
  de la sinopsis. El año no aparece: se toma el que deja la fecha en el futuro (o hace menos de un mes).
- Guarda `visto` (día en que apareció por primera vez) para las 🆕 Novedades de la app. No inventa nada.
Lo ejecuta GitHub Actions junto con la agenda de Turismo de Tenerife (.github/workflows/eventos.yml).
"""
import datetime, html, json, os, re, time, urllib.request

UA = "Mozilla/5.0 (compatible; EscapadasCatalogo/1.0; +https://github.com/paniaguadediego-bit/FamiliadeAMuchis.Escapadas)"
BASE = "https://www.auditoriodetenerife.com"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MESES = {m: i + 1 for i, m in enumerate(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])}
CAT = [('teatro', r'teatro|danza|artes esc|circo|la salita|humor|magia'), ('musica', r'm[uú]sica|[oó]pera|sinf[oó]nica|jazz|piano|[oó]rgano|c[aá]mara|concierto|coro|zarzuela'),
       ('ninos', r'familia|infantil|escuela|niñ')]
LUGARES = [(r'Teatro Leal', 'San Cristóbal de La Laguna'), (r'Guimer[aá]', 'Santa Cruz de Tenerife'), (r'La Granja', 'Santa Cruz de Tenerife')]


def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception:
            time.sleep(8 * (i + 1))
    return ''


def texto(pag):
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', pag, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', ' | ', t))
    return re.sub(r'(\s*\|\s*)+', ' | ', re.sub(r'[ \t\r\n]+', ' ', t))


def evento(url, pag, hoy):
    og = lambda k: html.unescape((re.search(r'<meta property="og:%s" content="([^"]*)"' % k, pag) or [None, ''])[1]).strip()
    nombre = re.sub(r'\s*-\s*Auditorio de Tenerife\s*$', '', og('title')).strip()
    s = texto(pag)
    m = re.search(r'Funci[oó]n/es \| (.*?) \| (?:Duraci[oó]n \| [^|]* \| )?([^|]*/[^|]*) \| ([^|]*?) \| Entradas', s)
    if not nombre or not m:
        return None
    fechas = []
    for d, mes in re.findall(r'(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b', m.group(1)):
        f = datetime.date(hoy.year, MESES[mes], int(d))
        if f < hoy - datetime.timedelta(days=31):
            f = f.replace(year=hoy.year + 1)
        fechas.append(f)
    if not fechas:
        return None
    tipo, lugar = m.group(2).strip(), re.sub(r'\s+', ' ', m.group(3)).strip()
    cat = next((c for c, p in CAT if re.search(p, tipo, re.I)), '') or next((c for c, p in CAT if re.search(p, nombre, re.I)), 'otros')
    muni = next((mu for p, mu in LUGARES if re.search(p, lugar, re.I)), 'Santa Cruz de Tenerife')
    sinop = (re.search(r'Sinopsis \| (.{20,400}?)(?: \| [A-ZÁÉÍÓÚ][^|]{0,30}: |$)', s) or [None, ''])[1]
    sinop = re.sub(r'\s*\|\s*', ' ', sinop).strip()
    if re.search(r'Ficha|Int[eé]rpretes|Galer[ií]a|Elenco|Multimedia', sinop):
        sinop = ''  # se coló el menú de la página
    corto = sinop if len(sinop) <= 240 else sinop[:240].rsplit(' ', 1)[0] + '…'
    horas = re.sub(r'h\.', ' h', m.group(1)).replace('  ', ' ').strip()
    return {"id": "au-" + url.rstrip('/').split('/')[-1][:56], "nombre": nombre[:100], "desde": min(fechas).isoformat(), "hasta": max(fechas).isoformat(),
            "lugar": lugar[:140], "municipio": muni, "categoria": cat, "extracto": (f"{tipo} · {horas}. " + corto)[:300],
            "foto": og('image'), "url": url}


def main():
    hoy = datetime.date.today(); desde_mod = (hoy - datetime.timedelta(days=365)).isoformat()
    idx = get(BASE + '/sitemap_index.xml')
    urls = []
    for sm in re.findall(r'<loc>(https://[^<]*evento-sitemap\d*\.xml)</loc>', idx):
        for u, lm in re.findall(r'<loc>([^<]+/es/evento/[^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>', get(sm)):
            if lm[:10] >= desde_mod:
                urls.append(u)
    ruta = os.path.join(REPO, 'data', 'agenda_auditorio.json')
    previos = {e['id']: e.get('visto', '') for e in json.load(open(ruta)).get('eventos', [])} if os.path.exists(ruta) else None
    salida, centros = [], {}
    for s in json.load(open(os.path.join(REPO, 'data', 'sitios.json'))):
        if s['tipo'] == 'pueblo' and s['municipio'] not in centros:
            centros[s['municipio']] = (s['lat'], s['lon'])
    for u in sorted(set(urls)):
        pag = get(u); time.sleep(1.2)
        e = evento(u, pag, hoy) if pag else None
        if not e or e['hasta'] < hoy.isoformat():
            continue
        c = centros.get(e['municipio'])
        e['lat'], e['lon'], e['aprox'] = (c[0], c[1], True) if c else (None, None, False)
        e['visto'] = previos.get(e['id'], hoy.isoformat()) if previos is not None else ''
        salida.append(e)
    salida.sort(key=lambda e: (e['desde'], e['nombre']))
    with open(ruta, 'w') as f:
        json.dump({"fuente": "Auditorio de Tenerife · auditoriodetenerife.com", "actualizado": datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
                   "eventos": salida}, f, ensure_ascii=False, indent=0)
    print(len(urls), 'páginas;', len(salida), 'eventos próximos; hasta', salida[-1]['desde'] if salida else '-')


if __name__ == '__main__':
    main()
