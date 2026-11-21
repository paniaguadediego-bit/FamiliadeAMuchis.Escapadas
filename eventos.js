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
const ordenarEventos = (l, desde) => l.slice().sort((a, b) => pesoEvento(a[0], a[1], desde) - pesoEvento(b[0], b[1], desde) || a[1][0].localeCompare(b[1][0]));
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
function cargarAgenda(d) {
  AGENDA_INFO = d && { fuente: d.fuente, actualizado: d.actualizado };
  FOTOS_AG = {};
  AGENDA_SITIOS = ((d && d.eventos) || []).filter(e => e.hasta >= hoyISO()).map(e => {
    if (e.foto) FOTOS_AG[e.id] = { src: e.foto, credito: 'Turismo de Tenerife', enlace: e.url };
    return { id: e.id, nombre: e.nombre, tipo: 'evento', municipio: e.municipio || '', lat: e.lat, lon: e.lon, aprox: !!e.aprox, agenda: true,
      categoria: e.categoria, lugar: e.lugar, desc: e.extracto || '', fuente: 'Agenda de Turismo de Tenerife', url: e.url,
      cuando: { tipo: 'fechas', lista: [[e.desde, e.hasta]] } };
  });
}

// ---------- 🎬 Cartelera de cine (data/cine.json: SensaCine, cada mañana con GitHub Actions; solo las sesiones del día) ----------
let CINE = null, cineSel = null, cineVO = false;
const cineHoy = () => CINE && CINE.fecha === hoyISO();
const VERS = { VOSE: 'VOSE', VO: 'VO', Doblada: '' };
const CINE_CORTO = { E0627: 'Meridiano', E0284: 'Multicines La Laguna', E0622: 'La Villa', E0700: 'X-Sur', E0541: 'Zentral Center' };
function carteleraHTML() {
  if (!CINE) return `<div class="card muted centro">🎬 ${navigator.onLine ? 'Cargando la cartelera…' : 'La cartelera se verá cuando haya conexión.'}</div>`;
  const cines = CINE.cines.filter(c => c.peliculas.length || c.aviso);
  if (!cineSel || !cines.some(c => c.id === cineSel)) cineSel = load('esc.cine', cines[0] && cines[0].id);
  const c = cines.find(x => x.id === cineSel) || cines[0]; if (!c) return '<div class="card muted">Sin cartelera.</div>';
  const fechaTxt = new Date(CINE.fecha + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const pelis = c.peliculas.map(p => [p, p.sesiones.filter(s => !cineVO || s.v !== 'Doblada')]).filter(([, ss]) => ss.length);
  const nVO = x => x.peliculas.filter(p => p.sesiones.some(s => s.v !== 'Doblada')).length;
  return `<div class="cine-cab"><b>🎬 Cartelera ${cineHoy() ? 'de hoy' : 'del ' + esc(fechaTxt)}</b>
      <span class="muted">${cineHoy() ? esc(fechaTxt) : 'se actualiza cada mañana'}</span></div>
    <div class="chips cine-sel">${cines.map(x => `<button class="chip ${x.id === c.id ? 'on' : ''}" data-cine="${x.id}">${ZONAS[x.zona] ? ZONAS[x.zona].ic : '🎬'} ${esc(CINE_CORTO[x.id] || x.nombre)}${nVO(x) ? ' <small>VOSE</small>' : ''}</button>`).join('')}</div>
    <div class="chips"><button class="chip ${cineVO ? 'on' : ''}" data-cinevo>🗣️ Solo versión original (VOSE)</button></div>
    <p class="muted cuenta-lista">${esc(c.nombre)} · ${esc(c.municipio)} · ${pelis.length} película${pelis.length === 1 ? '' : 's'}${c.aviso ? ' · ⚠️ ' + esc(c.aviso) : ''}</p>
    ${pelis.length ? pelis.map(([p, ss]) => `<div class="card peli">${p.cartel ? `<img class="peli-cartel" src="${esc(p.cartel)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      <div class="peli-tx"><b>${esc(p.titulo)}</b>${p.estreno ? ' <span class="peli-est">Estreno</span>' : ''}
        <div class="muted peli-m">${esc([p.generos.join(', '), p.edad && p.edad.replace(/^Película no recomendada a menores de /, '+').replace(/^Película /, '')].filter(Boolean).join(' · '))}${p.original ? `<br><i>${esc(p.original)}</i>` : ''}</div>
        <div class="peli-ses">${ss.map(s => `<span class="ses ${s.v !== 'Doblada' ? 'vo' : ''}">${esc(s.h)}${VERS[s.v] ? ` <small>${VERS[s.v]}</small>` : ''}${s.f ? ` <small>${esc(s.f)}</small>` : ''}</span>`).join('')}</div></div></div>`).join('')
      : `<div class="card muted">${cineVO ? 'Hoy no hay sesiones en versión original en este cine.' : 'Sin sesiones.'}</div>`}
    <p class="muted ag-nota">📚 <a href="${esc(c.url)}" target="_blank" rel="noopener">Cartelera en SensaCine</a>. La app guarda solo las sesiones del día (se actualiza cada mañana); compra y horarios de otros días, en la web del cine.</p>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-cine]'); if (c) { cineSel = c.dataset.cine; save('esc.cine', cineSel); render(); return; }
  if (e.target.closest('[data-cinevo]')) { cineVO = !cineVO; render(); return; }
  if (e.target.closest('[data-vercine]')) { evCat = 'cine'; ir('eventos'); }
});

// ---------- 🎟️ pestaña Eventos ----------
let evCat = '', evZona = '', evRango = 'mes';
const RANGOS = { finde: 'Este finde', siguiente: 'El finde que viene', mes: 'Próximo mes', todo: 'Próximos 4 meses' };
function viewEventos() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando eventos…</div>';
  const sab = proximoSabado(), hoy = hoyISO();
  const [a, b] = evRango === 'finde' ? [isoMas(sab, -1), isoMas(sab, 1)] : evRango === 'siguiente' ? [isoMas(sab, 6), isoMas(sab, 8)] : [hoy, isoMas(hoy, evRango === 'mes' ? 31 : 124)];
  const lista = eventosEntre(a, b).filter(([s]) => (!evCat || catDe(s) === evCat) && (!evZona || (typeof zonaDe === 'function' && zonaDe(s) === evZona)));
  const nFinde = eventosEntre(isoMas(sab, -1), isoMas(sab, 1)).length;
  // Agrupados por semana (lunes a domingo), con el finde de cada una como título.
  const semanas = {};
  lista.forEach(([s, f]) => { const ini = f[0] < a ? a : f[0], sb = typeof sabadoDe === 'function' ? sabadoDe(ini) : ini; (semanas[sb] = semanas[sb] || []).push([s, f]); });
  const titulo = sb => sb === sab ? 'Este finde y estos días' : sb === isoMas(sab, 7) ? 'La semana que viene' : `Semana del finde ${+isoMas(sb, 0).slice(8)}-${+isoMas(sb, 1).slice(8)} de ${new Date(sb + 'T12:00').toLocaleDateString('es-ES', { month: 'long' })}`;
  const act = AGENDA_INFO && AGENDA_INFO.actualizado ? new Date(AGENDA_INFO.actualizado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
  return `<button class="card ev-enlace" data-tab="finde">🏠 Este finde hay <b>${nFinde}</b> evento${nFinde === 1 ? '' : 's'} · <span class="tr-ver">Ver en Planes ›</span></button>
    ${rejilla('evcat', evCat, [['', '🗂️', 'Todos'], ...Object.entries(CAT_EV).map(([k, [ic, n]]) => [k, ic, n])])}
    <div class="filtros-barra">
      <label class="orden-sel"><span class="vh">Cuándo</span><select id="ev-rango">${Object.entries(RANGOS).map(([k, n]) => `<option value="${k}" ${evRango === k ? 'selected' : ''}>📅 ${n}</option>`).join('')}</select></label>
      <label class="orden-sel"><span class="vh">Zona</span><select id="ev-zona"><option value="">🗺️ Toda la isla</option>${Object.entries(ZONAS).map(([k, z]) => `<option value="${k}" ${evZona === k ? 'selected' : ''}>${z.ic} ${esc(z.nom)}</option>`).join('')}</select></label>
    </div>
    ${typeof propioBotonHTML === 'function' && enGrupo() ? propioBotonHTML('evento') : ''}
    ${evCat === 'cine' && !lista.length ? '' : `<p class="muted cuenta-lista">${lista.length} evento${lista.length === 1 ? '' : 's'}${act ? ` · agenda de Turismo de Tenerife del ${esc(act)}` : ''}</p>`}
    ${evCat === 'cine' ? carteleraHTML() + (lista.length ? '<h2>🎟️ Otros eventos de cine</h2>' : '') : CINE && !evCat ? `<button class="card ev-enlace" data-filtro="evcat" data-v="cine">🎬 Cartelera ${cineHoy() ? 'de hoy' : 'del día'}: ${CINE.cines.filter(c => c.peliculas.length).length} cines${CINE.cines.some(c => c.peliculas.some(p => p.sesiones.some(s => s.v !== 'Doblada'))) ? ', con VOSE' : ''} · <span class="tr-ver">Ver ›</span></button>` : ''}
    ${evCat === 'cine' && !lista.length ? '' : lista.length ? Object.keys(semanas).sort().map(sb => `<h2>📅 ${esc(titulo(sb))}</h2>${ordenarEventos(semanas[sb], sb === sab ? isoMas(sab, -1) : isoMas(sb, -5)).map(([s]) => fichaHTML(s)).join('')}`).join('')
      : '<div class="card muted">Nada con esos filtros. Prueba con «Próximos 4 meses» o toda la isla.</div>'}
    <p class="muted ag-nota">Los eventos salen de la agenda pública de Turismo de Tenerife (se actualiza sola dos veces por semana), de las fiestas de la app y de los que añade el grupo. Confirma horarios y entradas en la web de cada uno.</p>`;
}
document.addEventListener('click', e => { const c = e.target.closest('[data-filtro="evcat"]'); if (c) { e.stopImmediatePropagation(); evCat = c.dataset.v; render(); } }, true);
document.addEventListener('change', e => {
  if (e.target.id === 'ev-rango') { evRango = e.target.value; render(); } else if (e.target.id === 'ev-zona') { evZona = e.target.value; render(); }
});
