'use strict';
// 🎟️ Eventos con fecha: son sitios de tipo «evento» con un campo `cuando` que dice cómo se calcula su fecha cada año.
//   { "tipo": "fija", "mes": 9, "dia": 7, "dias": 1 }              → todos los años el 7 de septiembre
//   { "tipo": "pascua", "desde": -52, "hasta": -42 }                → días respecto al Domingo de Pascua de ese año
//   { "tipo": "semana", "mes": 8, "dow": 0, "n": -1, "dias": 1 }    → n-ésimo día de la semana del mes (dow 0 = domingo; n -1 = el último)
//   { "tipo": "fechas", "lista": [["2027-02-05", "2027-02-14"]] }   → fechas sueltas, año a año
// Las fechas exactas de programa cambian: los eventos llevan VERIFICAR y su fuente.

// Domingo de Pascua (calendario gregoriano, algoritmo de Meeus/Jones/Butcher).
function pascua(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mes = Math.floor((h + l - 7 * m + 114) / 31),
    dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
const isoMas = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const iso3 = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function nSemana(y, mes, dow, n) {
  if (n > 0) { const p = new Date(y, mes - 1, 1, 12); const d = 1 + (dow - p.getDay() + 7) % 7 + 7 * (n - 1); return iso3(y, mes, d); }
  const u = new Date(y, mes, 0, 12); const d = u.getDate() - (u.getDay() - dow + 7) % 7; return iso3(y, mes, d);
}
// [desde, hasta] de un evento en el año y, o null.
function fechasEn(s, y) {
  const c = s && s.cuando; if (!c) return null;
  if (c.tipo === 'fija') { const a = iso3(y, c.mes, c.dia); return [a, isoMas(a, (c.dias || 1) - 1)]; }
  if (c.tipo === 'pascua') { const p = pascua(y); return [isoMas(p, c.desde), isoMas(p, c.hasta ?? c.desde)]; }
  if (c.tipo === 'semana') { const a = nSemana(y, c.mes, c.dow, c.n); return [isoMas(a, c.antes ? -c.antes : 0), isoMas(a, (c.dias || 1) - 1)]; }
  if (c.tipo === 'fechas') { const f = (c.lista || []).find(([a]) => a.startsWith(String(y))); return f ? [f[0], f[1] || f[0]] : null; }
  return null;
}
// Próxima vez (o la que está en marcha) a partir de hoy.
function proximaVez(s, desde = hoyISO()) {
  const y = +desde.slice(0, 4);
  for (const yy of [y, y + 1]) { const f = fechasEn(s, yy); if (f && f[1] >= desde) return f; }
  return null;
}
const esEvento = s => s && s.tipo === 'evento' && s.cuando;
// Eventos que caen (aunque sea un día) entre a y b.
const eventosEntre = (a, b) => SITIOS.filter(esEvento).map(s => [s, proximaVez(s, a)]).filter(([, f]) => f && f[0] <= b && f[1] >= a)
  .sort((x, y) => x[1][0].localeCompare(y[1][0]));
function fechaEventoTxt(f) {
  const t = iso => new Date(iso + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const y = f[0].slice(0, 4) !== hoyISO().slice(0, 4) ? ' de ' + f[0].slice(0, 4) : '';
  const r = f[1] > f[0] ? `del ${t(f[0])} al ${t(f[1])}${y}` : `${t(f[0])}${y}`; return r[0].toUpperCase() + r.slice(1);
}
// En la ficha de un evento: cuándo es la próxima vez.
function cuandoHTML(s) {
  if (!esEvento(s)) return '';
  const f = proximaVez(s), hoy = hoyISO();
  if (!f) return s.cuandoTxt ? `<div class="cuando">📅 ${esc(s.cuandoTxt)}</div>` : '';
  const ya = f[0] <= hoy && f[1] >= hoy, dias = Math.round((new Date(f[0] + 'T12:00') - new Date(hoy + 'T12:00')) / 864e5);
  return `<div class="cuando">📅 <b>${ya ? '¡Ahora mismo!' : 'Próxima:'}</b> ${esc(fechaEventoTxt(f))}${!ya ? ` <span class="muted">(${dias === 1 ? 'mañana' : `en ${dias} días`})</span>` : ''}
    ${s.cuandoTxt ? `<div class="muted">${esc(s.cuandoTxt)}</div>` : ''}</div>`;
}
// Lo próximo: los siguientes eventos (sin los de este finde), hasta n.
function proximosEventosHTML(sab, n = 4) {
  const ev = eventosEntre(isoMas(sab, 2), isoMas(hoyISO(), 120)).slice(0, n);
  return ev.length ? `<h2>🎟️ Lo próximo</h2><div class="card">${ev.map(([s, f]) => `<button class="reciente" data-irficha="${esc(s.id)}"><span class="d-dia">${+f[0].slice(8)}</span>
    <span><b>${esc(s.nombre)}</b><br><small class="muted">${esc(fechaEventoTxt(f))} · ${esc(s.municipio)}</small></span></button>`).join('')}</div>` : '';
}
// Orden de importancia: destacados de la isla, luego los de la agenda con foto, luego el resto; y por fecha.
// Primero lo que empieza en el rango que se mira (no lo que ya lleva semanas), lo corto antes que lo largo
// (una exposición de tres meses no es «el plan del finde»), los destacados de la isla y lo que tiene foto.
const durDias = f => Math.round((new Date(f[1] + 'T12:00') - new Date(f[0] + 'T12:00')) / 864e5);
const pesoEvento = (s, f, desde) => (s.destacado ? 0 : 2) + (FOTOS[s.id] || (typeof FOTOS_AG !== 'undefined' && FOTOS_AG[s.id]) ? 0 : 1)
  + (durDias(f) > 14 ? 4 : durDias(f) > 4 ? 1 : 0) + (desde && f[0] < desde ? 2 : 0);
const ordenarEventos = (l, desde) => l.slice().sort((a, b) => (typeof favSitio === 'function' ? favSitio(b[0]) - favSitio(a[0]) : 0) || pesoEvento(a[0], a[1], desde) - pesoEvento(b[0], b[1], desde) || a[1][0].localeCompare(b[1][0])); // 💛 primero
// Este finde: lo que hay (viernes a domingo).
function eventosFindeHTML(sab) {
  const ev = eventosEntre(isoMas(sab, -1), isoMas(sab, 1));
  return ev.length ? `<h2>🎟️ Este finde hay…</h2>${ev.map(([s]) => fichaHTML(s)).join('')}` : '';
}
// En el calendario: chips de los eventos de esa semana.
function eventosSemanaHTML(lun, dom) {
  const todos = ordenarEventos(eventosEntre(lun, dom), lun), ev = todos.slice(0, 3);
  return ev.length ? `<div class="ev-chips">${ev.map(([s, f]) => `<button class="chip ev" data-irficha="${esc(s.id)}">🎟️ ${esc(s.nombre)} <small>${esc(new Date(f[0] + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }))}</small></button>`).join('')}${todos.length > 3 ? `<button class="chip" data-tab="eventos">+${todos.length - 3} más</button>` : ''}</div>` : '';
}

// ---------- 📰 agenda automática (data/agenda.json, la actualiza GitHub Actions dos veces por semana) ----------
let AGENDA_SITIOS = [], FOTOS_AG = {}, AGENDA_INFO = null;
const CAT_EV = { fiestas: ['🎉', 'Fiestas'], musica: ['🎵', 'Música'], cine: ['🎬', 'Cine'], teatro: ['🎭', 'Teatro y espectáculos'], deporte: ['🏃', 'Deporte'],
  expo: ['🖼️', 'Exposiciones'], feria: ['🛍️', 'Ferias y mercados'], ninos: ['🧸', 'Con niños'], otros: ['🎟️', 'Otros'] };
const catDe = s => s.categoria || (s.tipo === 'evento' ? 'fiestas' : 'otros');
const catIc = s => (CAT_EV[catDe(s)] || CAT_EV.otros)[0];
// Varias agendas (Turismo de Tenerife y, desde v44, Auditorio de Tenerife): se juntan y se quitan los repetidos
// (mismo nombre y misma fecha de inicio; se queda la primera fuente).
const AGENDAS = {}, FUENTE_AG = { tenerife: ['Agenda de Turismo de Tenerife', 'Turismo de Tenerife'], auditorio: ['Auditorio de Tenerife', 'Auditorio de Tenerife'],
  ayto: ['Web del ayuntamiento', 'Ayuntamiento'] };
function cargarAgenda(d, clave = 'tenerife') {
  AGENDAS[clave] = d;
  if (clave === 'tenerife') AGENDA_INFO = d && { fuente: d.fuente, actualizado: d.actualizado };
  FOTOS_AG = {}; const vistos = new Set(), norm = t => sinTildes(t).replace(/[^a-z0-9]+/g, ' ').trim();
  AGENDA_SITIOS = [];
  for (const k of Object.keys(FUENTE_AG)) {
    const doc = AGENDAS[k]; if (!doc) continue;
    for (const e of (doc.eventos || []).filter(e => e.hasta >= hoyISO())) {
      const clv = norm(e.nombre) + '|' + e.desde; if (vistos.has(clv)) continue; vistos.add(clv);
      if (e.foto) FOTOS_AG[e.id] = { src: e.foto, credito: FUENTE_AG[k][1], enlace: e.url };
      AGENDA_SITIOS.push({ id: e.id, nombre: e.nombre, tipo: 'evento', municipio: e.municipio || '', lat: e.lat, lon: e.lon, aprox: !!e.aprox, agenda: true,
        categoria: e.categoria, lugar: e.lugar, desc: e.extracto || '', fuente: e.fuente || FUENTE_AG[k][0], url: e.url, ...(e.verificar ? { verificar: e.verificar } : {}),
        cuando: { tipo: 'fechas', lista: [[e.desde, e.hasta]] }, visto: e.visto || '' });
    }
  }
}

// ---------- 🎬 Cartelera de cine (data/cine.json: SensaCine, cada mañana con GitHub Actions; solo las sesiones del día) ----------
let CINE = null, cineSel = null, cineVO = false, cineOrden = null;
// (v62) Fondo de la cartelera: foto del municipio del cine (de sus fichas, Wikimedia Commons), muy atenuada.
const cineFondo = c => { const id = typeof portadaDe === 'function' && portadaDe(c.municipio), src = id && fotoSrc(id); return src ? `style="--fondo:url('${esc(src)}')"` : ''; };
// (v62) Ruleta horizontal de cines (como la rueda de Planes, de lado): la del centro es la elegida.
function girarCines() {
  const r = document.querySelector('[data-cinerueda]'); if (!r) return;
  const pinta = () => { const cx = r.scrollLeft + r.clientWidth / 2;
    [...r.children].forEach(t => { const d = (t.offsetLeft + t.offsetWidth / 2 - cx) / t.offsetWidth, a = Math.min(Math.abs(d), 2.5);
      t.style.transform = `perspective(700px) rotateY(${(d * -24).toFixed(1)}deg) scale(${(1 - a * 0.12).toFixed(3)})`; t.style.opacity = Math.max(0.25, 1 - a * 0.35).toFixed(2); }); };
  const on = r.querySelector('.pantalla.on');
  if (on) r.scrollLeft = on.offsetLeft - (r.clientWidth - on.offsetWidth) / 2;
  pinta();
  let pend = 0, fin = 0;
  r.addEventListener('scroll', () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; pinta(); });
    clearTimeout(fin); fin = setTimeout(() => { if (!r._toque) return; const cx = r.scrollLeft + r.clientWidth / 2;
      const t = [...r.children].sort((a, b) => Math.abs(a.offsetLeft + a.offsetWidth / 2 - cx) - Math.abs(b.offsetLeft + b.offsetWidth / 2 - cx))[0];
      if (t && t.dataset.cine !== cineSel) { cineSel = t.dataset.cine; save('esc.cine', cineSel); render(); } }, 260); }, { passive: true });
  ['pointerdown', 'touchstart', 'wheel'].forEach(ev => r.addEventListener(ev, () => { r._toque = 1; }, { passive: true }));
}
const peliAbiertas = new Set(); // sinopsis abiertas (no se cierran al repintar)
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.peli) { if (d.open) peliAbiertas.add(d.dataset.peli); else peliAbiertas.delete(d.dataset.peli); } }, true);
const ORDEN_CINE = { estrenos: 'Estrenos primero', publico: '⭐ Público', prensa: '⭐ Prensa', titulo: 'Título (A-Z)' };
const cineHoy = () => CINE && CINE.fecha === hoyISO();
const VERS = { VOSE: 'VOSE', VO: 'VO', Doblada: '' };
const CINE_CORTO = { E0627: 'Meridiano', E0284: 'Multicines La Laguna', E0622: 'La Villa', E0700: 'X-Sur', E0541: 'Zentral Center' };
function carteleraHTML() {
  if (!CINE) return `<div class="card muted centro">🎬 ${navigator.onLine ? 'Cargando la cartelera…' : 'La cartelera se verá cuando haya conexión.'}</div>`;
  const fc = typeof favs === 'function' ? favs().cines : [];
  const cines = CINE.cines.filter(c => c.peliculas.length || c.aviso).sort((a, b) => fc.includes(b.id) - fc.includes(a.id)); // 💛 primero
  if (!cineSel || !cines.some(c => c.id === cineSel)) cineSel = load('esc.cine', (cines[0] || {}).id);
  const c = cines.find(x => x.id === cineSel) || cines[0]; if (!c) return '<div class="card muted">Sin cartelera.</div>';
  const fechaTxt = new Date(CINE.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!cineOrden) cineOrden = load('esc.cineorden', 'estrenos');
  const nota = (p, k) => (p.notas && p.notas[k]) || 0;
  const pelis = c.peliculas.map(p => [p, p.sesiones.filter(s => !cineVO || s.v !== 'Doblada')]).filter(([, ss]) => ss.length)
    .sort(([a], [b]) => cineOrden === 'publico' ? nota(b, 'usuarios') - nota(a, 'usuarios') : cineOrden === 'prensa' ? nota(b, 'prensa') - nota(a, 'prensa')
      : cineOrden === 'titulo' ? a.titulo.localeCompare(b.titulo, 'es') : (!!b.estreno - !!a.estreno) || a.titulo.localeCompare(b.titulo, 'es'));
  const nVO = x => x.peliculas.filter(p => p.sesiones.some(s => s.v !== 'Doblada')).length;
  return `<div class="cine-cab"><b>🎬 Cartelera ${cineHoy() ? 'de hoy' : 'del ' + esc(fechaTxt)}</b>
      <span class="muted">${cineHoy() ? esc(fechaTxt) : 'se actualiza cada mañana'}</span></div>
    <div class="cine-rueda" data-cinerueda role="tablist" aria-label="Cines (desliza)">${cines.map(x => `<button class="pantalla ${x.id === c.id ? 'on' : ''}" data-cine="${x.id}" role="tab" aria-selected="${x.id === c.id}">
      <b>${fc.includes(x.id) ? '💛 ' : ''}${esc(CINE_CORTO[x.id] || x.nombre)}</b><small>${esc(x.municipio.replace('San Cristóbal de ', '').replace(' de Tenerife', ''))}${nVO(x) ? ' · VOSE' : ''}</small></button>`).join('')}</div>
    <div class="chips"><button class="chip ${cineVO ? 'on' : ''}" data-cinevo>🗣️ Solo versión original (VOSE)</button>
      <label class="orden-sel"><span class="vh">Ordenar películas</span><select id="cine-orden">${Object.entries(ORDEN_CINE).map(([k, n]) => `<option value="${k}" ${cineOrden === k ? 'selected' : ''}>↕️ ${n}</option>`).join('')}</select></label></div>
    <p class="muted cuenta-lista">${esc(c.nombre)} · ${esc(c.municipio)} · ${pelis.length} película${pelis.length === 1 ? '' : 's'}${c.aviso ? ' · ⚠️ ' + esc(c.aviso) : ''}
      <button class="enlace fav-cine" data-fav="esc.favcines" data-v="${c.id}">${fc.includes(c.id) ? '💛 Tu cine favorito' : '🤍 Marcar como favorito'}</button></p>
    <div class="cine-lista" ${cineFondo(c)}>
    ${pelis.length ? pelis.map(([p, ss]) => { // (v50) tocar la película despliega la sinopsis; debajo, FilmAffinity e IMDb
      const q = encodeURIComponent(p.original || p.titulo), sin = !!p.sinopsis, abierta = peliAbiertas.has(p.titulo);
      const cab = `${p.cartel ? `<img class="peli-cartel" src="${esc(p.cartel)}" alt="" loading="lazy" onerror="this.remove()">` : '<span class="peli-cartel peli-sinc">🎬</span>'}
      <div class="peli-tx"><b>${esc(p.titulo)}</b>${p.estreno ? ' <span class="peli-est">Estreno</span>' : ''}
        <div class="muted peli-m">${esc([p.generos.join(', '), p.edad && p.edad.replace(/^Película no recomendada a menores de /, '+').replace(/^Película /, '')].filter(Boolean).join(' · '))}${p.original ? `<br><i>${esc(p.original)}</i>` : ''}</div>
        ${p.notas ? `<div class="peli-notas">${p.notas.usuarios ? `<span>⭐ ${String(p.notas.usuarios).replace('.', ',')} <small>público</small></span>` : ''}${p.notas.prensa ? `<span>⭐ ${String(p.notas.prensa).replace('.', ',')} <small>prensa</small></span>` : ''}<small class="muted">/5 SensaCine</small></div>` : ''}
        <div class="peli-ses">${ss.map(s => `<span class="ses ${s.v !== 'Doblada' ? 'vo' : ''}">${esc(s.h)}${VERS[s.v] ? ` <small>${VERS[s.v]}</small>` : ''}${s.f ? ` <small>${esc(s.f)}</small>` : ''}</span>`).join('')}</div>
        ${sin ? '<span class="peli-pista">Sinopsis <i>▾</i></span>' : ''}</div>`;
      const pie = `<div class="peli-mas"><a href="https://www.filmaffinity.com/es/search.php?stext=${q}" target="_blank" rel="noopener">Ver en FilmAffinity ›</a>
        <a href="https://www.imdb.com/find/?q=${q}&s=tt" target="_blank" rel="noopener">Ver en IMDb ›</a></div>`;
      return sin ? `<div class="card peli-d"><details data-peli="${esc(p.titulo)}" ${abierta ? 'open' : ''}><summary class="peli">${cab}</summary><p class="peli-sin">${esc(p.sinopsis)}</p></details>${pie}</div>`
        : `<div class="card peli-d"><div class="peli">${cab}</div>${pie}</div>`; }).join('')
      : `<div class="card muted">${cineVO ? 'Hoy no hay sesiones en versión original en este cine.' : 'Sin sesiones.'}</div>`}</div>
    <p class="muted ag-nota">📚 <a href="${esc(c.url)}" target="_blank" rel="noopener">Cartelera en SensaCine</a>. La app guarda solo las sesiones del día (se actualiza cada mañana); compra y horarios de otros días, en la web del cine.${portadaDe(c.municipio) ? ` Fondo: foto de ${esc(c.municipio)} (Wikimedia Commons).` : ''}</p>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-cine]'); if (c) { cineSel = c.dataset.cine; save('esc.cine', cineSel); render(); return; }
  if (e.target.closest('[data-cinevo]')) { cineVO = !cineVO; render(); return; }
  if (e.target.closest('[data-vercine]')) { culSec = 'cine'; save('esc.cultura', 'cine'); ir('cultura'); }
});

// ---------- 🎟️ pestaña Eventos ----------
let evZona = '', evRango = 'mes';
// Categorías elegidas (una a una; «Todas» / «Ninguna»). Solo cine = cartelera completa.
let evCats = null; const leerCats = () => evCats || (evCats = new Set(load('esc.evcats', catsEventos()).filter(k => !CULTURA.includes(k))));
const evSoloCine = () => false; // (v39) el cine tiene su sitio en la pestaña Cultura
// 🎨 Cultura (v39): cine, teatro y música tienen su pestaña; Eventos se queda con lo demás.
const CULTURA = ['cine', 'teatro', 'musica'];
const catsEventos = () => Object.keys(CAT_EV).filter(k => !CULTURA.includes(k));
const evCerradas = new Set(); // semanas plegadas (en esta visita)
function ponerCats(ks) { evCats = new Set(ks); save('esc.evcats', [...evCats]); }
const RANGOS = { finde: 'Este finde', siguiente: 'El finde que viene', mes: 'Próximo mes', todo: 'Próximos 4 meses', anio: 'Próximo año' };
function viewEventos() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando eventos…</div>';
  const sab = proximoSabado(), hoy = hoyISO();
  const [a, b] = evRango === 'finde' ? [isoMas(sab, -1), isoMas(sab, 1)] : evRango === 'siguiente' ? [isoMas(sab, 6), isoMas(sab, 8)] : [hoy, isoMas(hoy, evRango === 'mes' ? 31 : evRango === 'anio' ? 366 : 124)];
  leerCats();
  const lista = eventosEntre(a, b).filter(([s]) => evCats.has(catDe(s)) && (!evZona || (typeof zonaDe === 'function' && zonaDe(s) === evZona)));
  // Agrupados por semana (lunes a domingo), con el finde de cada una como título.
  const semanas = {};
  lista.forEach(([s, f]) => { const ini = f[0] < a ? a : f[0], sb = typeof sabadoDe === 'function' ? sabadoDe(ini) : ini; (semanas[sb] = semanas[sb] || []).push([s, f]); });
  const titulo = sb => sb === sab ? 'Este finde y estos días' : sb === isoMas(sab, 7) ? 'La semana que viene' : `Semana del finde ${+isoMas(sb, 0).slice(8)}-${+isoMas(sb, 1).slice(8)} de ${new Date(sb + 'T12:00').toLocaleDateString('es-ES', { month: 'long' })}`;
  const act = AGENDA_INFO && AGENDA_INFO.actualizado ? new Date(AGENDA_INFO.actualizado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
  return novedadesHTML('eventos') + `<div class="ev-cats ev-cats-g">${Object.entries(CAT_EV).filter(([k]) => !CULTURA.includes(k)).map(([k, [ic, n]]) => `<button class="fm ${evCats.has(k) ? 'on' : ''}" data-evcat="${k}" aria-pressed="${evCats.has(k)}"><span>${ic}</span>${esc(n.replace(' y espectáculos', '').replace(' y mercados', ''))}</button>`).join('')}
      <div class="ev-cats-pie"><button class="enlace" data-evcats="todas">✓ Todas</button><button class="enlace" data-evcats="ninguna">✕ Ninguna</button></div></div>
    <div class="filtros-barra">
      <label class="orden-sel"><span class="vh">Cuándo</span><select id="ev-rango">${Object.entries(RANGOS).map(([k, n]) => `<option value="${k}" ${evRango === k ? 'selected' : ''}>📅 ${n}</option>`).join('')}</select></label>
      <label class="orden-sel"><span class="vh">Zona</span><select id="ev-zona"><option value="">🗺️ Toda la isla</option>${Object.entries(ZONAS).map(([k, z]) => `<option value="${k}" ${evZona === k ? 'selected' : ''}>${z.ic} ${esc(z.nom)}</option>`).join('')}</select></label>
    </div>
    ${typeof propioBotonHTML === 'function' && enGrupo() ? propioBotonHTML('evento') : ''}
    ${evSoloCine() && !lista.length ? '' : `<p class="muted cuenta-lista">${lista.length} evento${lista.length === 1 ? '' : 's'}${act ? ` · agenda de Turismo de Tenerife del ${esc(act)}` : ''}</p>`}
    ${evSoloCine() ? carteleraHTML() + (lista.length ? '<h2>🎟️ Otros eventos de cine</h2>' : '') : CINE && false ? `<button class="card ev-enlace" data-evcats="cine">🎬 Cartelera ${cineHoy() ? 'de hoy' : 'del día'}: ${CINE.cines.filter(c => c.peliculas.length).length} cines${CINE.cines.some(c => c.peliculas.some(p => p.sesiones.some(s => s.v !== 'Doblada'))) ? ', con VOSE' : ''} · <span class="tr-ver">Ver ›</span></button>` : ''}
    ${evSoloCine() && !lista.length ? '' : lista.length ? Object.keys(semanas).sort().map(sb => `<details class="ev-sem" data-sem="${sb}" ${evCerradas.has(sb) ? '' : 'open'}><summary><span>📅 ${esc(titulo(sb))}</span><small>${semanas[sb].length} evento${semanas[sb].length === 1 ? '' : 's'}</small></summary>${ordenarEventos(semanas[sb], sb === sab ? isoMas(sab, -1) : isoMas(sb, -5)).map(([s]) => fichaHTML(s)).join('')}</details>`).join('')
      : `<div class="card muted">${evCats.size ? 'Nada con esos filtros. Prueba con «Próximos 4 meses» o toda la isla.' : 'No hay ninguna categoría marcada: toca las que quieras ver o «✓ Todas».'}</div>`}
    <p class="muted ag-nota">Los eventos salen de la agenda pública de Turismo de Tenerife (se actualiza sola dos veces por semana), del Auditorio, de lo que el grupo acepta de las webs de los ayuntamientos (📰), de las fiestas de la app y de los que añade el grupo. Confirma horarios y entradas en la web de cada uno.</p>
    ${revisionHTML()}${sinFechaHTML()}`; // (v55) Por revisar abajo del todo, justo encima de «Sin fecha»
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-evcat]'); if (c) { leerCats(); const k = c.dataset.evcat; if (evCats.has(k)) evCats.delete(k); else evCats.add(k); ponerCats(evCats); render(); return; }
  const t = e.target.closest('[data-evcats]'); if (t) { const v = t.dataset.evcats; ponerCats(v === 'todas' ? catsEventos() : []); render(); }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.sem) { if (d.open) evCerradas.delete(d.dataset.sem); else evCerradas.add(d.dataset.sem); } }, true);
document.addEventListener('change', e => {
  if (e.target.id === 'ev-rango') { evRango = e.target.value; render(); } else if (e.target.id === 'ev-zona') { evZona = e.target.value; render(); }
});

document.addEventListener('change', e => { if (e.target.id === 'cine-orden') { cineOrden = e.target.value; save('esc.cineorden', cineOrden); render(); } });

// ---------- 🎨 pestaña Cultura: 🎬 Cine · 🎭 Teatro · 🎵 Música ----------
let culSec = null;
function viewCultura() {
  if (!culSec) culSec = load('esc.cultura', 'cine');
  const sw = `<div class="conmutador cultura" role="tablist">${[['cine', '🎬', 'Cine'], ['teatro', '🎭', 'Teatro'], ['musica', '🎵', 'Música']].map(([k, ic, n]) =>
    `<button class="${culSec === k ? 'on' : ''}" data-cul="${k}" role="tab"><span>${ic}</span>${n}</button>`).join('')}</div>`;
  const nov = novedadesHTML('cultura');
  if (culSec === 'cine') return nov + sw + carteleraHTML();
  if (!SITIOS.length) return nov + sw + '<div class="vacio">⏳ Cargando…</div>';
  const hoy = hoyISO(), lista = eventosEntre(hoy, isoMas(hoy, 366)).filter(([s]) => catDe(s) === culSec && (!evZona || (typeof zonaDe === 'function' && zonaDe(s) === evZona)));
  const sab = proximoSabado(), semanas = {};
  lista.forEach(([s, f]) => { const ini = f[0] < hoy ? hoy : f[0], sb = sabadoDe(ini); (semanas[sb] = semanas[sb] || []).push([s, f]); });
  const titulo = sb => sb === sab ? 'Este finde y estos días' : sb === isoMas(sab, 7) ? 'La semana que viene' : `Semana del finde ${+sb.slice(8)}-${+isoMas(sb, 1).slice(8)} de ${new Date(sb + 'T12:00').toLocaleDateString('es-ES', { month: 'long' })}`;
  const que = culSec === 'teatro' ? ['obra', 'obras', 'teatro y espectáculos'] : ['concierto', 'conciertos', 'música'];
  return nov + sw + `<div class="filtros-barra"><label class="orden-sel ancho"><span class="vh">Zona</span><select id="ev-zona"><option value="">🗺️ Toda la isla</option>${Object.entries(ZONAS).map(([k, z]) => `<option value="${k}" ${evZona === k ? 'selected' : ''}>${z.ic} ${esc(z.nom)}</option>`).join('')}</select></label></div>
    <p class="muted cuenta-lista">${lista.length} ${lista.length === 1 ? que[0] : que[1]} en el próximo año</p>
    ${lista.length ? Object.keys(semanas).sort().map(sb => { const k = culSec + ':' + sb; return `<details class="ev-sem" data-sem="${k}" ${evCerradas.has(k) ? '' : 'open'}><summary><span>📅 ${esc(titulo(sb))}</span><small>${semanas[sb].length}</small></summary>${ordenarEventos(semanas[sb], sb === sab ? isoMas(sab, -1) : isoMas(sb, -5)).map(([s]) => fichaHTML(s)).join('')}</details>`; }).join('')
      : `<div class="card muted">No hay ${que[2]} en la agenda para esa zona. La agenda de Turismo de Tenerife se actualiza dos veces por semana.</div>`}
    <p class="muted ag-nota">De la agenda de Turismo de Tenerife y de los eventos del grupo. Confirma horarios y entradas en la web de cada uno.</p>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-cul]'); if (b) { culSec = b.dataset.cul; save('esc.cultura', culSec); render(); } });

// ---------- 🆕 Novedades (v42): eventos que la agenda encontró hace poco, aunque sean para dentro de meses ----------
// `visto` = día en que el lector los encontró por primera vez. Por pestaña (Eventos / Cultura), lo nuevo desde tu última visita.
const NOV_DIAS = 21;
const novVisto = () => load('esc.novvisto', {});
const novPrev = {}; // lo que había visto al entrar en la pestaña en esta visita (para resaltar lo nuevo)
const areaDe = s => CULTURA.includes(catDe(s)) ? 'cultura' : 'eventos';
function novedades(area) {
  const desde = isoMas(hoyISO(), -NOV_DIAS);
  return AGENDA_SITIOS.filter(s => s.visto && s.visto >= desde && areaDe(s) === area && proximaVez(s))
    .sort((a, b) => b.visto.localeCompare(a.visto) || proximaVez(a)[0].localeCompare(proximaVez(b)[0]));
}
const novNuevas = area => { const v = novVisto()[area] || ''; return novedades(area).filter(s => s.visto > v).length; };
function novedadesHTML(area) {
  const l = novedades(area); if (!l.length) return '';
  if (!(area in novPrev)) novPrev[area] = novVisto()[area] || '';
  const nuevas = l.filter(s => s.visto > novPrev[area]).length, hoy = hoyISO();
  const meses = f => { const d = Math.round((new Date(f + 'T12:00') - new Date(hoy + 'T12:00')) / 864e5); return d <= 0 ? 'ya' : d < 31 ? `en ${d} días` : `en ${Math.round(d / 30.4)} meses`; };
  return `<details class="novedades" data-novcaja ${load('esc.novabierta', false) ? 'open' : ''}><summary>🆕 Nuevo en la agenda <small>${nuevas ? `<b>${nuevas} sin ver</b> · ` : ''}últimas 3 semanas · ${l.length}</small></summary>
    ${l.slice(0, 25).map(s => { const f = proximaVez(s);
      return `<div class="nov ${s.visto > novPrev[area] ? 'sin-ver' : ''}"><span class="nov-ic">${catIc(s)}</span><div class="nov-tx"><button class="enlace" data-irficha="${esc(s.id)}">${esc(s.nombre)}</button>
        <small class="muted">${esc(fechaEventoTxt(f))} · ${meses(f[0])}${s.municipio ? ' · ' + esc(s.municipio) : ''}</small></div>
        <a class="btn sec mini" href="${esc(s.url)}" target="_blank" rel="noopener">🎟️ Entradas e info</a></div>`; }).join('')}
    <p class="muted mini-nota">Lo publicado en la agenda de Turismo de Tenerife en las últimas 3 semanas (se revisa lunes y jueves, hasta un año vista).</p></details>`;
}
document.addEventListener('toggle', e => { if (e.target.dataset && 'novcaja' in e.target.dataset) save('esc.novabierta', e.target.open); }, true); // (v62) cerrado por defecto: arriba del todo no tapa lo demás
// Al abrir la pestaña, lo de hoy queda visto (el contador se apaga; lo nuevo sigue resaltado hasta salir).
function novMarcarVisto(area) { const v = novVisto(); if (v[area] !== hoyISO()) { v[area] = hoyISO(); save('esc.novvisto', v); } }

// ---------- 📰 Por revisar (v49): avisos de las webs de 6 ayuntamientos (data/revision.json, cada mañana) ----------
// Nada entra solo: alguien del grupo (o tú, sin grupo) lo añade o lo descarta. Con fecha → a Eventos con ⚠️ VERIFICAR;
// sin fecha → «📰 Anunciados sin fecha». Con grupo: grupos/{gid}/revision/{id} = { estado: 'si'|'no', uid, actualizado }.
let REVISION = null, revVerTodo = false;
function cargarRevision(d) { REVISION = d; aplicarRevision(); }
const revEstado = id => { const g = typeof enGrupo === 'function' && enGrupo(); const r = g ? (NUBE.revision || {})[id] : load('esc.revision', {})[id]; return r ? (r.estado || r) : ''; };
const revFechaTxt = a => !a.desde ? '⚠️ Sin fecha' : a.desde === a.hasta ? nomDiaLargo(a.desde) : `${nomDiaLargo(a.desde)} – ${nomDiaLargo(a.hasta)}`;
const nomDiaLargo = f => new Date(f + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
function aplicarRevision() {
  if (!REVISION) return;
  const centro = m => (typeof BASE !== 'undefined' ? BASE : []).find(s => s.municipio === m && s.tipo === 'pueblo') || {};
  const ok = (REVISION.avisos || []).filter(a => a.desde && revEstado(a.id) === 'si');
  cargarAgenda({ eventos: ok.map(a => { const c = centro(a.municipio), exacto = isFinite(a.lat) && a.lat !== null;
    return { id: a.id, nombre: a.titulo, desde: a.desde, hasta: a.hasta || a.desde, lugar: a.lugar, municipio: a.municipio, categoria: a.categoria || 'otros',
      extracto: a.extracto, foto: a.foto, url: a.url, lat: exacto ? a.lat : c.lat, lon: exacto ? a.lon : c.lon, aprox: !exacto, visto: '',
      fuente: 'Web del Ayuntamiento de ' + a.municipio.replace('San Cristóbal de ', ''), verificar: 'Leído de la web del ayuntamiento: confirma fecha y programa' }; }) }, 'ayto');
}
function decidirRevision(id, estado) {
  if (typeof enGrupo === 'function' && enGrupo()) {
    NUBE.revision = { ...(NUBE.revision || {}), [id]: { estado, uid: NUBE.user.uid } }; // se ve al momento; la nube lo confirma
    NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('revision').doc(id).set({ estado, uid: NUBE.user.uid, actualizado: Date.now() }).catch(() => {});
  } else { const m = load('esc.revision', {}); m[id] = estado; save('esc.revision', m); }
  aplicarRevision(); mezclarSitios(); render();
}
function seguirRevision(gid) {
  if (NUBE.offRevision) NUBE.offRevision();
  NUBE.offRevision = NUBE.db.collection('grupos').doc(gid).collection('revision').onSnapshot(q => {
    const r = {}; q.forEach(d => { const v = d.data(); if (v && v.estado) r[d.id] = v; });
    NUBE.revision = r; aplicarRevision(); mezclarSitios(); refrescarVista();
  }, () => {});
}
const revFm = m => typeof favMuni === 'function' && favMuni(m);
function revItemHTML(a, acciones) {
  return `<div class="rev-item"><div class="rev-tx"><small>${esc(a.municipio.replace('San Cristóbal de ', ''))} · ${a.clase === 'agenda' ? 'Agenda' : 'Noticia'}${a.desde ? ` · <b>${esc(revFechaTxt(a))}</b>` : ''}</small>
      <a href="${esc(a.url)}" target="_blank" rel="noopener">${revFm(a.municipio) ? '💛 ' : ''}${catIc(a)} ${esc(a.titulo)}</a>${a.lugar ? `<small class="muted">📍 ${esc(a.lugar)}</small>` : ''}${a.extracto ? `<p class="muted">${esc(a.extracto)}</p>` : ''}</div>
    <div class="rev-acc">${acciones}</div></div>`;
}
const revBotones = a => `<button class="mini" data-rev="si" data-id="${esc(a.id)}">➕ Añadir</button><button class="sec mini" data-rev="no" data-id="${esc(a.id)}">🗑️ Descartar</button>`;
// Arriba, solo los que tienen fecha; los que no, en «Sin fecha» al final de la página (v52: «que no molesten»).
function revisionHTML() {
  if (!REVISION) return '';
  const pend = (REVISION.avisos || []).filter(a => a.desde && !revEstado(a.id)).sort((a, b) => revFm(b.municipio) - revFm(a.municipio) || a.desde.localeCompare(b.desde));
  if (!pend.length) return '';
  const MAX = 8, ver = revVerTodo ? pend : pend.slice(0, MAX);
  return `<details class="card rev" ${load('esc.revabierta', true) ? 'open' : ''} data-revcaja="esc.revabierta"><summary>📰 Por revisar <b>${pend.length}</b> <small class="muted">· de las webs de los ayuntamientos</small></summary>
    <p class="muted rev-ayuda">Lo que anuncian los ayuntamientos (agendas y noticias). «➕ Añadir» lo lleva a Eventos${typeof enGrupo === 'function' && enGrupo() ? ' para todo el grupo' : ''}. Los que no traen fecha están justo debajo.</p>
    ${ver.map(a => revItemHTML(a, revBotones(a))).join('')}
    ${pend.length > MAX ? `<button class="enlace" data-revtodo>${revVerTodo ? '▴ Ver menos' : `▾ Ver los ${pend.length}`}</button>` : ''}
    ${(REVISION.notas || []).length ? `<p class="muted rev-ayuda">⚠️ ${REVISION.notas.map(esc).join(' · ')}</p>` : ''}</details>`;
}
// Al final de Eventos, cerrado: los avisos sin fecha (por revisar y los ya añadidos).
function sinFechaHTML() {
  if (!REVISION) return '';
  const sin = (REVISION.avisos || []).filter(a => !a.desde), pend = sin.filter(a => !revEstado(a.id)), ok = sin.filter(a => revEstado(a.id) === 'si');
  if (!pend.length && !ok.length) return '';
  return `<details class="card rev rev-sinf-caja" ${load('esc.sinfabierta', false) ? 'open' : ''} data-revcaja="esc.sinfabierta"><summary>📰 Sin fecha <b>${pend.length + ok.length}</b> <small class="muted">· avisos de los ayuntamientos sin día concreto</small></summary>
    <p class="muted rev-ayuda">No traen un día claro (programas, rutas, concursos…): mira la web antes de ir.</p>
    ${pend.map(a => revItemHTML(a, revBotones(a))).join('')}
    ${ok.length ? `<p class="rev-ayuda"><b>Añadidos</b></p>${ok.map(a => revItemHTML(a, `<button class="sec mini" data-rev="no" data-id="${esc(a.id)}">🗑️ Quitar</button>`)).join('')}` : ''}</details>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rev]'); if (b) { decidirRevision(b.dataset.id, b.dataset.rev); return; }
  if (e.target.closest('[data-revtodo]')) { revVerTodo = !revVerTodo; render(); }
});
document.addEventListener('toggle', e => { if (e.target.dataset && e.target.dataset.revcaja) save(e.target.dataset.revcaja, e.target.open); }, true);
