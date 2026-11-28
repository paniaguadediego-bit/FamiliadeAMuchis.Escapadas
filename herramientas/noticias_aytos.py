#!/usr/bin/env python3
"""📰 Eventos de las webs de 6 ayuntamientos → data/revision.json, para la bandeja «📰 Por revisar» de la app
(el grupo los añade a Eventos o los descarta; nada entra solo).

Qué lee (todas permiten el acceso en su robots.txt):
- Arona: agenda (RSS con fecha, hora, lugar y coordenadas) y titulares de noticias (RSS).
- Adeje: agenda (/agenda → /evento/N, «Fecha: …»).
- La Orotava: agenda (/es/agenda/…) y titulares de noticias.
- Puerto de la Cruz: noticias (API pública de WordPress del propio sitio).
- La Laguna: eventos de la portada y de /actualidad/eventos/ («Inicio: …») y titulares de noticias.
- Santa Cruz de Tenerife: su web corta las conexiones de programas; se intenta y, si no responde, se apunta el aviso.
Las noticias solo entran si el titular suena a evento (concierto, festival, feria…). La fecha se toma del texto
(«12 y 13 de diciembre de 2026», «del 25 de septiembre al 30 de noviembre», «Fecha: viernes, 4 de diciembre…»);
si no hay una clara, el aviso entra «sin fecha». Nunca se inventa: cada aviso lleva su enlace.
Lo ejecuta GitHub Actions cada mañana (.github/workflows/noticias.yml).
"""
import datetime, html, json, os, re, time, unicodedata, urllib.request

UA = "Mozilla/5.0 (compatible; EscapadasCatalogo/1.0; +https://github.com/paniaguadediego-bit/FamiliadeAMuchis.Escapadas)"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOY = datetime.date.today()
MESES = {m: i + 1 for i, m in enumerate(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                                         'septiembre', 'octubre', 'noviembre', 'diciembre'])}
M = '(' + '|'.join(MESES) + ')'
EVENTO = re.compile(r'concierto|festival|feria|fiesta|romer[ií]a|carnaval|navidad|navide|bel[eé]n|cabalgata|mercad|noche |'
                    r'ruta|exposici|muestra|teatro|espect[aá]culo|actuaci|baile|verbena|coral|certamen|degusta|gastron|'
                    r'cine|recital|desfile|carrera|marat[oó]n|torneo|jornadas?|encuentro|tapas|zarzuela|[oó]pera|danza|'
                    r'circo|magia|pregón|procesi|encendido|alumbrado|celebra|homenaje|gala|programa', re.I)
NO_EVENTO = re.compile(r'pleno|junta de gobierno|presupuesto|licitaci|subvenci|convocatoria|empleo|obras? |comunicado|'
                       r'bases |ayudas|contrat|tasa|ordenanza|polic[ií]a|vandal|cierre|corte de|tr[aá]fico', re.I)
CATS = [  # la misma clasificación que la agenda de Turismo de Tenerife (agenda_webtenerife.py)
    ('fiestas', r'romer[ií]a|fiestas? (de|en honor|patronal)|verbena|procesi[oó]n|bajada de|carnaval|baile de magos|cabalgata|encendido|pregón'),
    ('cine', r'\bcine\b|cinema|pel[ií]cula|cortometraje|filmoteca|cinef[oó]rum|\bfilm\b'),
    ('teatro', r'teatro|musical|danza|ballet|ópera|opera|comedia|mon[oó]logo|magia|circo|flamenco|espect[aá]culo|zarzuela'),
    ('musica', r'concierto|tour\b|gira|cantante|guitarr|piano|festival|m[uú]sica|orquesta|sinf[oó]nic|jazz|banda|coro|coral|gospel|recital|tributo'),
    ('deporte', r'carrera|marat[oó]n|trail|san silvestre|torneo|campeonato|surf|regata|ciclis|triatl|partido|f[uú]tbol|baloncesto|\d+ ?km\b'),
    ('expo', r'exposici[oó]n|muestra|museo|fotograf|instalaci[oó]n'),
    ('feria', r'feria|mercad|gastron|vino|degust|navidad|bel[eé]n|tapas'),
    ('ninos', r'infantil|niñ[oa]s|familia'),
]
categoria = lambda t: next((c for c, p in CATS if re.search(p, t, re.I)), 'otros')
limpia = lambda x: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x or ''))).strip()
slug = lambda t: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()).strip('-')


class _Https(urllib.request.HTTPRedirectHandler):
    """Algunas webs (Adeje) redirigen a http://: se sigue la misma dirección en https://."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return super().redirect_request(req, fp, code, msg, headers, re.sub(r'^http://', 'https://', newurl))


ABRIR = urllib.request.build_opener(_Https)


def get(url):
    if os.environ.get('NOTICIAS_TRAZA'):
        print('  ·', url[:100], flush=True)
    for i in range(3):
        try:
            with ABRIR.open(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=25) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception:
            time.sleep(6 * (i + 1))
    return ''


def texto(pag):
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', pag, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', ' | ', t))
    return re.sub(r'(\s*\|\s*)+', ' | ', re.sub(r'\s+', ' ', t))


def dia(d, mes, anio=None):
    try:
        f = datetime.date(int(anio) if anio else HOY.year, MESES[mes.lower()], int(d))
    except ValueError:
        return None
    if not anio and f < HOY - datetime.timedelta(days=60):
        f = f.replace(year=f.year + 1)
    return f


def fechas(s):
    """Primer día o rango claro del texto → (desde, hasta) ISO, o ('', '') si no hay."""
    s = s.replace('|', ' ')
    m = re.search(r'del? (\d{1,2})(?: de ' + M + r')?(?: de (\d{4}))? al? (\d{1,2}) de ' + M + r'(?: de (\d{4}))?', s, re.I)
    if m:
        a2 = m.group(6); b = dia(m.group(4), m.group(5), a2)
        a = dia(m.group(1), m.group(2) or m.group(5), m.group(3) or a2)
        if a and b:
            if a > b:
                a = a.replace(year=a.year - 1)
            return a.isoformat(), b.isoformat()
    m = re.search(r'(\d{1,2}) y (\d{1,2}) de ' + M + r'(?: de (\d{4}))?', s, re.I)
    if m:
        a, b = dia(m.group(1), m.group(3), m.group(4)), dia(m.group(2), m.group(3), m.group(4))
        if a and b:
            return a.isoformat(), b.isoformat()
    m = re.search(r'(\d{1,2}) de ' + M + r'(?: de (\d{4}))?', s, re.I)
    if m:
        a = dia(m.group(1), m.group(2), m.group(3))
        if a:
            return a.isoformat(), a.isoformat()
    return '', ''


def aviso(muni, clase, id_, titulo, url, desde='', hasta='', lugar='', extracto='', foto='', lat=None, lon=None):
    ex = limpia(extracto)
    ex = ex if len(ex) <= 240 else ex[:240].rsplit(' ', 1)[0] + '…'
    return {'id': id_[:70], 'municipio': muni, 'clase': clase, 'titulo': limpia(titulo)[:120], 'url': url, 'desde': desde,
            'categoria': categoria(limpia(titulo) + ' ' + ex[:120]),
            'hasta': hasta or desde, 'lugar': limpia(lugar)[:100], 'extracto': ex, 'foto': foto, 'lat': lat, 'lon': lon}


def es_evento(titulo):
    return bool(EVENTO.search(titulo)) and not NO_EVENTO.search(titulo)


def de_noticia(muni, pref, id_, titulo, url, cuerpo=''):
    """Noticia con pinta de evento: fecha del titular o, si no, del comienzo del texto."""
    if not es_evento(titulo):
        return None
    d, h = fechas(titulo)
    if not d and cuerpo:
        d, h = fechas(texto(cuerpo)[:1500])
    return aviso(muni, 'noticia', f'rv-{pref}-{id_}', titulo, url, d, h, extracto=texto(cuerpo)[:600] if cuerpo else '')


def arona():
    out = []
    for it in re.findall(r'<item>(.*?)</item>', get('https://www.arona.org/DesktopModules/Agenda/Feed.ashx?format=rss'), re.S):
        g = lambda p: (re.search(p, it, re.S) or [None, ''])[1]
        ini = g(r'<xCal:dtstart><xCal:date-time>([\d-]+)'); fin = g(r'<xCal:dtend><xCal:date-time>([\d-]+)')
        lat, lon = g(r'<xCal:latitude>([-\d.]+)'), g(r'<xCal:longitude>([-\d.]+)')
        out.append(aviso('Arona', 'agenda', 'rv-aro-' + g(r'Agenda/(\d+)</guid>'), g(r'<title>(.*?)</title>'),
                         html.unescape(g(r'<link>(.*?)</link>')), ini, fin or ini, g(r'<xCal:location>(.*?)</xCal:location>'),
                         html.unescape(g(r'<description>(.*?)</description>')), g(r'<enclosure url="([^"]+)"'),
                         float(lat) if lat else None, float(lon) if lon else None))
    rss = get('https://www.arona.org/DesktopModules/Noticias/Feed.ashx?format=rss')
    for it in re.findall(r'<item>(.*?)</item>', rss, re.S)[:60]:
        g = lambda p: (re.search(p, it, re.S) or [None, ''])[1]
        n = de_noticia('Arona', 'aron', g(r'Noticias/(\d+)</guid>'), html.unescape(g(r'<title>(.*?)</title>')),
                       html.unescape(g(r'<link>(.*?)</link>')), html.unescape(g(r'<description>(.*?)</description>')))
        if n:
            out.append(n)
    return out


def adeje():
    ids = []
    for p in range(1, 4):
        nuevos = [i for i in re.findall(r'/evento/(\d+)', get(f'https://www.adeje.es/agenda?pag={p}&TipoEvento=99&ViewStyle=LIST')) if i not in ids]
        if not nuevos:
            break
        ids += nuevos; time.sleep(1)
    out = []
    for i in dict.fromkeys(ids):
        pag = get(f'https://www.adeje.es/evento/{i}'); time.sleep(1)
        og = lambda k: html.unescape((re.search(r'<meta property="og:%s" content="([^"]*)"' % k, pag) or [None, ''])[1])
        s = texto(pag); m = re.search(r'Fecha: \| ([^|]{6,90})', s)
        d, h = fechas(m.group(1)) if m else ('', '')
        cuerpo = (re.search(r'Descripci[oó]n[^|]*\| (.{20,600}?) \|', s) or [None, ''])[1]
        out.append(aviso('Adeje', 'agenda', f'rv-ade-{i}', og('title'), f'https://www.adeje.es/evento/{i}', d, h,
                         extracto=cuerpo, foto=og('image')))
    return out


def orotava():
    out, base = [], 'https://www.laorotava.es'
    for u in dict.fromkeys(re.findall(r'href="(/es/agenda/[^"#?]+)"', get(base + '/es/agenda'))):
        pag = get(base + u); time.sleep(1)
        og = lambda k: html.unescape((re.search(r'<meta property="og:%s" content="([^"]*)"' % k, pag) or [None, ''])[1])
        s = texto(pag); m = re.search(r'Fechas?: ([^|]{6,120})', s)
        d, h = fechas(m.group(1)) if m else ('', '')
        tit = og('title') or limpia((re.search(r'<h1[^>]*>(.*?)</h1>', pag, re.S) or [None, ''])[1])
        out.append(aviso('La Orotava', 'agenda', 'rv-oro-' + slug(u.split('/')[-1])[:50], re.sub(r'\s*\|.*$', '', tit), base + u, d, h,
                         extracto=og('description'), foto=og('image')))
    for u in dict.fromkeys(re.findall(r'href="(/es/noticias/[^"#?]+)"', get(base + '/es/noticias'))):
        tit = u.split('/')[-1].replace('-', ' ')
        if not es_evento(tit):
            continue
        pag = get(base + u); time.sleep(1)
        og = lambda k: html.unescape((re.search(r'<meta property="og:%s" content="([^"]*)"' % k, pag) or [None, ''])[1])
        n = de_noticia('La Orotava', 'oron', slug(u.split('/')[-1])[:50], og('title') or tit, base + u,
                       (re.search(r'<article.*?</article>', pag, re.S) or [''])[0])
        if n:
            n['foto'] = og('image'); out.append(n)
    return out


def puerto():
    out = []
    try:
        posts = json.loads(get('https://www.puertodelacruz.es/wp-json/wp/v2/posts?per_page=40&_fields=id,date,link,title,excerpt,content') or '[]')
    except ValueError:
        posts = []
    for p in posts:
        n = de_noticia('Puerto de la Cruz', 'pue', str(p['id']), limpia(p['title']['rendered']), p['link'],
                       p.get('content', {}).get('rendered', '') or p.get('excerpt', {}).get('rendered', ''))
        if n:
            out.append(n)
    return out


def laguna():
    out, base = [], 'https://www.aytolalaguna.es'
    urls = re.findall(r'href="(/actualidad/eventos/[^"?#]+/)"', get(base + '/') + get(base + '/actualidad/eventos/'))
    for u in dict.fromkeys(urls):
        pag = get(base + u); time.sleep(1)
        s = texto(pag)
        tit = limpia((re.search(r'<h1[^>]*>(.*?)</h1>', pag, re.S) or [None, ''])[1]) or u.strip('/').split('/')[-1].replace('-', ' ')
        ini = (re.search(r'Inicio: \| ([^|]{6,60})', s) or [None, ''])[1]
        fin = (re.search(r'Fin(?:al)?: \| ([^|]{6,60})', s) or [None, ''])[1]
        d, _ = fechas(ini); h, _ = fechas(fin) if fin else (d, '')
        lugar = (re.search(r'Lugar: \| ([^|]{3,90})', s) or [None, ''])[1]
        cuerpo = (re.search(r'Informaci[oó]n del evento \|.*?\| (.{40,600}?) \|', s) or [None, ''])[1]
        foto = (re.search(r'<meta property="og:image" content="([^"]+)"', pag) or [None, ''])[1]
        out.append(aviso('San Cristóbal de La Laguna', 'agenda', 'rv-lag-' + slug(u.strip('/').split('/')[-1])[:50], tit, base + u,
                         d, h, lugar, cuerpo, foto))
    for u, t in re.findall(r'href="(/actualidad/noticias/[^"?#]+/)"[^>]*>\s*([^<]{15,240})<', get(base + '/actualidad/noticias/')):
        if not es_evento(t):
            continue
        pag = get(base + u); time.sleep(1)
        n = de_noticia('San Cristóbal de La Laguna', 'lagn', slug(u.strip('/').split('/')[-1])[:50], t, base + u,
                       (re.search(r'<article.*?</article>', pag, re.S) or [pag[:20000]])[0])
        if n:
            out.append(n)
    return out


def santacruz():
    return [], ('' if get('https://www.santacruzdetenerife.es/') else 'Santa Cruz de Tenerife: su web no responde a programas')


def main():
    ruta = os.path.join(REPO, 'data', 'revision.json')
    previos = {a['id']: a.get('visto', '') for a in json.load(open(ruta)).get('avisos', [])} if os.path.exists(ruta) else {}
    avisos, notas = [], []
    for nombre, f in [('Arona', arona), ('Adeje', adeje), ('La Orotava', orotava), ('Puerto de la Cruz', puerto), ('La Laguna', laguna)]:
        try:
            r = f(); avisos += r; print(nombre, len(r))
        except Exception as e:  # una web caída no para a las demás
            notas.append(f'{nombre}: no se pudo leer ({type(e).__name__})'); print(nombre, 'ERROR', e)
    _, nota = santacruz()
    if nota:
        notas.append(nota)
    hoy, vistos, salida = HOY.isoformat(), set(), []
    for a in avisos:
        if not a['titulo'] or a['id'] in vistos or (a['hasta'] and a['hasta'] < hoy):
            continue  # ya pasados o repetidos
        if a['desde'] and a['desde'] > (HOY + datetime.timedelta(days=366)).isoformat():
            continue
        vistos.add(a['id']); a['visto'] = previos.get(a['id'], hoy); salida.append(a)
    salida.sort(key=lambda a: (a['desde'] or '9999', a['municipio'], a['titulo']))
    with open(ruta, 'w') as fh:
        json.dump({'fuente': 'Webs de los ayuntamientos (agendas y noticias)', 'actualizado': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
                   'notas': notas, 'avisos': salida}, fh, ensure_ascii=False, indent=0)
    print(len(salida), 'avisos;', sum(1 for a in salida if not a['desde']), 'sin fecha;', notas)


if __name__ == '__main__':
    main()
