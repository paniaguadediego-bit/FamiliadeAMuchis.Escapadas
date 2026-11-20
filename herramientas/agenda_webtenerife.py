#!/usr/bin/env python3
"""Lee la agenda pública de Turismo de Tenerife (webtenerife.com) y deja los próximos eventos en data/agenda.json.

- Qué lee: las páginas /agenda/AAAA/MM/<evento>/ (permitidas en su robots.txt) de este mes y los próximos 4,
  sacadas de su sitemap y de la portada de la agenda. De cada una, los datos schema.org «Event» que publica:
  nombre, fechas, descripción, foto y dirección.
- Qué guarda: nombre, fechas, lugar, municipio (deducido del texto; si no se puede, vacío), un extracto corto
  de la descripción, la foto y el enlace a la página original, que es la fuente. No inventa nada.
- Ubicación: la página no trae coordenadas; si se reconoce el municipio, el evento va al centro de ese municipio
  en el mapa, marcado como aproximado.
Lo ejecuta GitHub Actions cada semana (.github/workflows/eventos.yml). Va despacio a propósito (una página cada
1,5 s) para no molestar a la web.
"""
import json, re, os, sys, time, html, datetime, urllib.request, urllib.error

UA = "Mozilla/5.0 (compatible; EscapadasCatalogo/1.0; +https://github.com/paniaguadediego-bit/FamiliadeAMuchis.Escapadas)"
BASE = "https://www.webtenerife.com"
AQUI = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(AQUI)
MESES_ADELANTE = 4
MAX_PAGINAS = 260

MUNIS = ['Adeje', 'Arafo', 'Arico', 'Arona', 'Buenavista del Norte', 'Candelaria', 'El Rosario', 'El Sauzal', 'El Tanque', 'Fasnia',
         'Garachico', 'Granadilla de Abona', 'Guía de Isora', 'Güímar', 'Icod de los Vinos', 'La Guancha', 'La Matanza de Acentejo',
         'La Orotava', 'La Victoria de Acentejo', 'Los Realejos', 'Los Silos', 'Puerto de la Cruz', 'San Cristóbal de La Laguna',
         'San Juan de la Rambla', 'San Miguel de Abona', 'Santa Cruz de Tenerife', 'Santa Úrsula', 'Santiago del Teide', 'Tacoronte',
         'Tegueste', 'Vilaflor de Chasna']
# Nombres cortos, núcleos y recintos conocidos → municipio (para deducirlo del texto).
ALIAS = [
    (r'\bSanta Cruz\b|\bAuditorio de Tenerife\b|\bRecinto Ferial\b|\bTeatro Guimer[aá]\b|\bTEA\b|\bHeliodoro\b|\bParque Mar[ií]timo\b|\bPalmetum\b|\bLas Teresitas\b|\bSan Andr[eé]s\b|\bTaganana\b|\bAnaga\b', 'Santa Cruz de Tenerife'),
    (r'\bLa Laguna\b|\bTeatro Leal\b|\bTejina\b|\bBajamar\b|\bPunta del Hidalgo\b|\bValle de Guerra\b|\bLa Cuesta\b|\bTaco\b', 'San Cristóbal de La Laguna'),
    (r'\bLos Cristianos\b|\bLas Am[eé]ricas\b|\bLas Galletas\b|\bCosta del Silencio\b|\bPalm-?Mar\b|\bGuaza\b', 'Arona'),
    (r'\bCosta Adeje\b|\bMagma\b|\bSiam Park\b|\bLa Caleta\b|\bFa[ñn]ab[eé]\b|\bPlaya Para[ií]so\b', 'Adeje'),
    (r'\bEl M[eé]dano\b|\bSan Isidro\b|\bLos Abrigos\b|\bCharco del Pino\b', 'Granadilla de Abona'),
    (r'\bPuerto de Santiago\b|\bLos Gigantes\b|\bPlaya de la Arena\b', 'Santiago del Teide'),
    (r'\bPlaya de San Juan\b|\bAlcal[aá]\b', 'Guía de Isora'),
    (r'\bLoro Parque\b|\bLago Marti[aá]nez\b', 'Puerto de la Cruz'),
    (r'\bLas Ca[ñn]adas\b|\bTeide\b', 'La Orotava'),
    (r'\bRealejos\b', 'Los Realejos'), (r'\bIcod\b', 'Icod de los Vinos'), (r'\bGranadilla\b', 'Granadilla de Abona'),
    (r'\bSan Miguel\b', 'San Miguel de Abona'), (r'\bVilaflor\b', 'Vilaflor de Chasna'), (r'\bLa Matanza\b', 'La Matanza de Acentejo'),
    (r'\bLa Victoria\b', 'La Victoria de Acentejo'), (r'\bBuenavista\b', 'Buenavista del Norte'), (r'\bPuerto de la Cruz\b', 'Puerto de la Cruz'),
]
CATS = [  # categoría del evento a partir del texto (para filtrar en la app)
    ('fiestas', r'romer[ií]a|fiestas? (de|en honor|patronal)|verbena|procesi[oó]n|bajada de|carnaval|baile de magos'),
    ('teatro', r'teatro|musical|danza|ballet|ópera|opera|comedia|mon[oó]logo|magia|circo|flamenco'),
    ('musica', r'concierto|festival|m[uú]sica|orquesta|sinf[oó]nic|jazz|banda|coro|gospel|dj\b|recital|tribute|tributo'),
    ('deporte', r'carrera|marat[oó]n|trail|san silvestre|torneo|campeonato|surf|regata|ciclis|triatl|spartan|deka|pit\b|copa'),
    ('expo', r'exposici[oó]n|muestra|museo|fotograf|instalaci[oó]n'),
    ('feria', r'feria|mercad|gastron|vino|degustaci|navidad|belén|belen'),
    ('ninos', r'infantil|niñ[oa]s|familia'),
]


def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40) as r:
                return r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                return ''
            time.sleep(10 * (i + 1))
        except Exception:
            time.sleep(10 * (i + 1))
    return ''


def urls_eventos(hoy):
    meses = []
    y, m = hoy.year, hoy.month
    for _ in range(MESES_ADELANTE + 1):
        meses.append(f"{y}/{m:02d}"); m += 1
        if m > 12: y, m = y + 1, 1
    sm = get(BASE + "/sitemap.xml/")
    urls = set(re.findall(r'<loc>(https://www\.webtenerife\.com/agenda/(?:%s)/[a-z0-9-]+/)</loc>' % '|'.join(meses), sm))
    portada = get(BASE + "/agenda/")
    urls |= set(BASE + u for u in re.findall(r'href="https://www\.webtenerife\.com(/agenda/20\d\d/\d\d/[a-z0-9-]+/)"', portada))
    return sorted(urls)[:MAX_PAGINAS]


def evento(url, pag):
    m = re.search(r'<script[^>]*application/ld\+json[^>]*>\s*(\{\s*"@context":\s*"https://schema.org",\s*"@type":\s*"Event".*?)</script>', pag, re.S)
    if not m:
        return None
    t = m.group(1)
    campo = lambda k: (re.search(r'"%s"\s*:\s*"((?:[^"\\]|\\.)*)"' % k, t, re.S) or [None, ''])[1]
    nombre, ini, fin = html.unescape(campo('name')).strip(), campo('startDate')[:10], campo('endDate')[:10]
    if not nombre or not re.match(r'\d{4}-\d\d-\d\d', ini):
        return None
    if not re.match(r'\d{4}-\d\d-\d\d', fin) or fin < ini:
        fin = ini
    desc = html.unescape(re.sub(r'\s+', ' ', campo('description'))).strip().rstrip('…').strip()
    calle = html.unescape(campo('streetAddress')).strip()
    loc = html.unescape(campo('addressLocality')).strip()
    foto = (re.search(r'"image"\s*:\s*\[\s*"([^"]+)"', t) or [None, ''])[1]
    donde = re.search(r'D[oó]nde:\s*</[^>]+>\s*(?:<[^>]+>\s*)*([^<]{3,160})', pag)
    lugar = html.unescape(donde.group(1)).strip() if donde else (calle or loc)
    limpia = lambda x: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', re.sub(r'<br\s*/?>|</br>', ', ', x))).strip(' ,')
    lugar, calle = limpia(lugar), limpia(calle)
    texto = ' '.join([nombre, lugar, calle, loc, desc])
    muni = next((mu for mu in MUNIS if re.search(r'\b%s\b' % re.escape(mu), texto, re.I)), '')
    if not muni:
        muni = next((mu for p, mu in ALIAS if re.search(p, ' '.join([lugar, calle, loc, nombre]), re.I)), '')
    if not muni:
        muni = next((mu for p, mu in ALIAS if re.search(p, desc, re.I)), '')
    cat = next((c for c, p in CATS if re.search(p, nombre, re.I)), '') or next((c for c, p in CATS if re.search(p, desc, re.I)), 'otros')
    slug = url.rstrip('/').split('/')[-1]
    corto = desc if len(desc) <= 240 else desc[:240].rsplit(' ', 1)[0] + '…'
    return {"id": "ag-" + slug[:60], "nombre": nombre[:100], "desde": ini, "hasta": fin, "lugar": lugar[:140], "municipio": muni,
            "categoria": cat, "extracto": corto, "foto": foto, "url": url}


def main():
    hoy = datetime.date.today(); limite = (hoy + datetime.timedelta(days=31 * MESES_ADELANTE)).isoformat()
    centros = {}
    for s in json.load(open(os.path.join(REPO, 'data', 'sitios.json'))):
        if s['tipo'] == 'pueblo' or s['municipio'] not in centros:
            if s['municipio'] not in centros or s['tipo'] == 'pueblo':
                centros[s['municipio']] = [s['lat'], s['lon']]
    salida = []
    for u in urls_eventos(hoy):
        pag = get(u); time.sleep(1.5)
        e = evento(u, pag) if pag else None
        if not e or e['hasta'] < hoy.isoformat() or e['desde'] > limite:
            continue
        if (datetime.date.fromisoformat(e['hasta']) - datetime.date.fromisoformat(e['desde'])).days > 120:
            continue  # exposiciones permanentes y similares: no son «de este finde»
        c = centros.get(e['municipio'])
        e['lat'], e['lon'], e['aprox'] = (c[0], c[1], True) if c else (None, None, False)
        salida.append(e)
    salida.sort(key=lambda e: (e['desde'], e['nombre']))
    with open(os.path.join(REPO, 'data', 'agenda.json'), 'w') as f:
        json.dump({"fuente": "Turismo de Tenerife · webtenerife.com/agenda", "actualizado": datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
                   "eventos": salida}, f, ensure_ascii=False, indent=0)
    sin = sum(1 for e in salida if not e['municipio'])
    print(len(salida), 'eventos;', sin, 'sin municipio')


if __name__ == '__main__':
    main()
