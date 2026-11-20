'use strict';

// Versión visible arriba. Súbela a la vez que CACHE en sw.js y --css-ver al final de styles.css.
const VERSION = 'v1';
// Si el móvil mezcla el app.js nuevo con la hoja de estilos vieja, se vuelve a pedir la hoja.
addEventListener('load', () => { try {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--css-ver').replace(/["'\s]/g, '');
  const l = document.querySelector('link[rel="stylesheet"][href^="styles.css"]');
  if (l && v !== VERSION && navigator.onLine) l.href = 'styles.css?v=' + VERSION;
} catch {} });

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const hoyISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

const K_MARCAS = 'esc.marcas', K_THEME = 'esc.theme';

// ---------- catálogo ----------
const TIPOS = {
  sendero: ['🥾', 'Sendero'], playa: ['🏖️', 'Playa o charco'], mirador: ['👀', 'Mirador'], pueblo: ['🏘️', 'Pueblo'],
  museo: ['🏛️', 'Museo'], naturaleza: ['🌳', 'Naturaleza'], guachinche: ['🍷', 'Guachinche'],
  restaurante: ['🍽️', 'Restaurante'], evento: ['🎟️', 'Evento'], curioso: ['✨', 'Curioso']
};
const tipoIc = t => (TIPOS[t] || ['📍'])[0];
const tipoNom = t => (TIPOS[t] || ['', 'Otro'])[1];
const ESTADOS = { quiero: ['🔖', 'Quiero ir'], fuimos: ['✅', 'Fuimos'], no: ['✖️', 'No'] };
const MUNICIPIOS = ['Adeje', 'Arafo', 'Arico', 'Arona', 'Buenavista del Norte', 'Candelaria', 'El Rosario', 'El Sauzal',
  'El Tanque', 'Fasnia', 'Garachico', 'Granadilla de Abona', 'Guía de Isora', 'Güímar', 'Icod de los Vinos', 'La Guancha',
  'La Matanza de Acentejo', 'La Orotava', 'La Victoria de Acentejo', 'Los Realejos', 'Los Silos', 'Puerto de la Cruz',
  'San Cristóbal de La Laguna', 'San Juan de la Rambla', 'San Miguel de Abona', 'Santa Cruz de Tenerife', 'Santa Úrsula',
  'Santiago del Teide', 'Tacoronte', 'Tegueste', 'Vilaflor de Chasna'];

let SITIOS = [];
const sitio = id => SITIOS.find(s => s.id === id);
fetch('data/sitios.json').then(r => r.json()).then(d => { SITIOS = Array.isArray(d) ? d : []; render(); })
  .catch(() => { SITIOS = []; render(); });

// ---------- marcas (solo en este móvil hasta S4) ----------
// { [sitioId]: { estado: 'quiero'|'fuimos'|'no', estrellas: 0-5, nota, fecha, actualizado } }
let marcas = load(K_MARCAS, {});
const marca = id => marcas[id] || {};
function setMarca(id, cambios) {
  const m = { ...marca(id), ...cambios, actualizado: Date.now() };
  if (cambios.estado) m.fecha = hoyISO();
  if (!m.estado) delete m.estado;
  if (!m.estrellas) delete m.estrellas;
  if (!m.nota) delete m.nota;
  if (!m.estado && !m.estrellas && !m.nota) delete marcas[id]; else marcas[id] = m;
  save(K_MARCAS, marcas);
}

// ---------- tema ----------
const TEMAS = { auto: ['🌓', 'Auto'], light: ['☀️', 'Claro'], dark: ['🌙', 'Oscuro'] };
function applyTheme() {
  const t = load(K_THEME, 'auto'), tb = $('#tema');
  if (tb) { tb.textContent = (TEMAS[t] || TEMAS.auto)[0]; tb.title = 'Tema: ' + (TEMAS[t] || TEMAS.auto)[1]; }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
$('#tema').addEventListener('click', () => {
  const orden = ['auto', 'light', 'dark'], t = load(K_THEME, 'auto');
  save(K_THEME, orden[(orden.indexOf(t) + 1) % 3]); applyTheme(); if (tab === 'mas') render();
});
applyTheme();

// ---------- pestañas ----------
const TABS = [['finde', 'Este finde', '🏠'], ['sitios', 'Sitios', '📍'], ['mapa', 'Mapa', '🗺️'], ['grupo', 'Grupo', '👥'], ['mas', 'Más', '☰']];
let tab = load('esc.tab', 'finde');
if (!TABS.some(t => t[0] === tab)) tab = 'finde';
function ir(t) { tab = t; save('esc.tab', t); render(); window.scrollTo(0, 0); }
function pintarTabs() {
  $('#tabs').innerHTML = TABS.map(([k, n, ic]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}"><span>${ic}</span>${n}</button>`).join('');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) ir(b.dataset.tab); });
$('#buscabtn').addEventListener('click', () => { ir('sitios'); const i = $('#q'); if (i) i.focus(); });

function render() {
  pintarTabs();
  $('#title').textContent = tab === 'finde' ? 'Escapadas' : (TABS.find(t => t[0] === tab) || [])[1] || 'Escapadas';
  const v = $('#view');
  v.innerHTML = tab === 'finde' ? viewFinde() : tab === 'sitios' ? viewSitios() : tab === 'mapa' ? viewMapa()
    : tab === 'grupo' ? viewGrupo() : viewMas();
  if (tab === 'mapa') pintarMapa();
  if (tab === 'sitios' && irFicha) { const el = document.getElementById('f-' + irFicha); irFicha = null; if (el) el.scrollIntoView({ block: 'center' }); }
}

// ---------- fichas ----------
const abiertas = new Set();
const gmaps = s => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`;
function fichaHTML(s) {
  const m = marca(s.id), e = m.estado;
  const datos = [s.duracion && `⏱️ ${esc(s.duracion)}`, s.dificultad && `💪 ${esc(s.dificultad)}`, s.acceso && `🚗 ${esc(s.acceso)}`].filter(Boolean);
  return `<details class="ficha ${e ? 'e-' + e : ''}" id="f-${esc(s.id)}" data-ficha="${esc(s.id)}" ${abiertas.has(s.id) ? 'open' : ''}>
    <summary><span class="ic">${tipoIc(s.tipo)}</span><span class="nom">${esc(s.nombre)}<small>${esc(tipoNom(s.tipo))} · ${esc(s.municipio)}</small></span>
      <span class="est">${e ? ESTADOS[e][0] : ''}${m.estrellas ? `<small> ${'⭐'.repeat(m.estrellas)}</small>` : ''}</span></summary>
    <div class="cuerpo">
      <p>${esc(s.desc)}</p>
      ${datos.length ? `<div class="datos">${datos.map(d => `<span>${d}</span>`).join('')}</div>` : ''}
      ${s.verificar ? `<div class="ver">⚠️ VERIFICAR${typeof s.verificar === 'string' ? ': ' + esc(s.verificar) : ''}</div>` : ''}
      <div class="fuente">📚 Fuente: ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.fuente || s.url)}</a>` : esc(s.fuente || '—')}</div>
      <div class="acciones">
        <a class="btn sec mini" href="${gmaps(s)}" target="_blank" rel="noopener">🌐 Google Maps</a>
        <button class="sec mini" data-vermapa="${esc(s.id)}">🗺️ Ver en el mapa</button>
      </div>
      <div class="marcas">${Object.entries(ESTADOS).map(([k, [ic, n]]) => `<button class="${e === k ? 'on' : ''}" data-est="${k}" data-id="${esc(s.id)}">${ic} ${n}</button>`).join('')}</div>
      <div class="estrellas" aria-label="Valoración">${[1, 2, 3, 4, 5].map(n => `<button class="${(m.estrellas || 0) >= n ? 'on' : ''}" data-estr="${n}" data-id="${esc(s.id)}" aria-label="${n} estrellas">★</button>`).join('')}</div>
      <textarea class="nota" data-nota="${esc(s.id)}" placeholder="📝 Nota (solo la ves tú por ahora)">${esc(m.nota || '')}</textarea>
      ${m.fecha ? `<div class="muted">Marcado el ${esc(new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }))}</div>` : ''}
    </div></details>`;
}
const repintarFicha = id => {
  const el = document.getElementById('f-' + id), s = sitio(id);
  if (el && s) el.outerHTML = fichaHTML(s);
  document.querySelectorAll('[data-cuenta]').forEach(c => { c.outerHTML = cuentaHTML(); });
};
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.dataset) return;
  if (d.dataset.ficha) { if (d.open) abiertas.add(d.dataset.ficha); else abiertas.delete(d.dataset.ficha); }
  if (d.dataset.muni) { if (d.open) muniAbiertos.add(d.dataset.muni); else muniAbiertos.delete(d.dataset.muni); }
}, true);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-est],[data-estr]'); if (!b) return;
  const id = b.dataset.id;
  if (b.dataset.est) setMarca(id, { estado: marca(id).estado === b.dataset.est ? '' : b.dataset.est });
  else { const n = +b.dataset.estr; setMarca(id, { estrellas: marca(id).estrellas === n ? 0 : n }); }
  abiertas.add(id);
  if (tab === 'mapa') { pintarMapa(); return; }
  repintarFicha(id);
});
let notaT = 0;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset && t.dataset.nota) { clearTimeout(notaT); const id = t.dataset.nota, v = t.value; notaT = setTimeout(() => setMarca(id, { nota: v.trim() }), 400); }
});
let irFicha = null;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-irficha]'); if (!b) return;
  const id = b.dataset.irficha, s = sitio(id); if (!s) return;
  abiertas.add(id); muniAbiertos.add(s.municipio); irFicha = id; fTipo = ''; fEst = ''; q = ''; ir('sitios');
});

// ---------- 🏠 Este finde ----------
function finde() {
  const d = new Date(), dia = d.getDay(); // 0 domingo, 6 sábado
  const sab = new Date(d); sab.setDate(d.getDate() + (dia === 0 ? -1 : 6 - dia));
  const dom = new Date(sab); dom.setDate(sab.getDate() + 1);
  const f = x => x.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const t = `${f(sab)} y ${f(dom)}`; return t[0].toUpperCase() + t.slice(1);
}
function cuentaHTML() {
  const vals = Object.values(marcas), n = k => vals.filter(m => m.estado === k).length;
  return `<div class="cuenta" data-cuenta><div><b>${n('fuimos')}</b>✅ Fuimos</div><div><b>${n('quiero')}</b>🔖 Quiero ir</div><div><b>${SITIOS.length - Object.keys(marcas).filter(k => marcas[k].estado).length}</b>Sin marcar</div></div>`;
}
// Ideas del día: sitios sin marcar, en un orden que cambia cada día (no a cada toque).
function ideas(n) {
  const sem = hoyISO().split('-').join('') | 0;
  const rnd = s => { let h = sem; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
  return SITIOS.filter(s => !marca(s.id).estado).sort((a, b) => rnd(a.id) - rnd(b.id)).slice(0, n);
}
function viewFinde() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  const quiero = SITIOS.filter(s => marca(s.id).estado === 'quiero');
  const ids = ideas(3);
  return `<p class="muted">${esc(finde())}</p>
    ${cuentaHTML()}
    <h2>🔖 Tenéis ganas de ir</h2>
    ${quiero.length ? quiero.map(fichaHTML).join('') : '<div class="card muted">Todavía nada. En 📍 Sitios, abre una ficha y toca «🔖 Quiero ir».</div>'}
    <h2>💡 Ideas: aún sin marcar</h2>
    ${ids.length ? ids.map(fichaHTML).join('') : '<div class="card muted">¡Lo habéis marcado todo! 🎉</div>'}
    <button class="sec" data-tab="sitios">📍 Ver todos los sitios</button>`;
}

// ---------- 📍 Sitios ----------
let q = '', fTipo = '', fEst = '';
const muniAbiertos = new Set();
function filtrados() {
  const a = sinTildes(q).trim();
  return SITIOS.filter(s => (!fTipo || s.tipo === fTipo)
    && (!fEst || (fEst === 'sin' ? !marca(s.id).estado : marca(s.id).estado === fEst))
    && (!a || sinTildes([s.nombre, s.municipio, s.desc, tipoNom(s.tipo)].join(' ')).includes(a)));
}
function viewSitios() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  const tiposHay = Object.keys(TIPOS).filter(t => SITIOS.some(s => s.tipo === t));
  const lista = filtrados(), filtro = !!(q || fTipo || fEst);
  const grupos = MUNICIPIOS.map(m => [m, lista.filter(s => s.municipio === m)]);
  const huerf = lista.filter(s => !MUNICIPIOS.includes(s.municipio));
  if (huerf.length) grupos.push(['Otros', huerf]);
  const conSitios = grupos.filter(g => g[1].length);
  return `<input id="q" type="search" placeholder="🔍 Buscar sitio, pueblo o tipo" value="${esc(q)}" autocomplete="off">
    <div class="chips">${[['', 'Todos'], ...tiposHay.map(t => [t, tipoIc(t) + ' ' + tipoNom(t)])].map(([k, n]) => `<button class="chip ${fTipo === k ? 'on' : ''}" data-ftipo="${k}">${n}</button>`).join('')}</div>
    <div class="chips">${[['', 'Todas'], ['quiero', '🔖 Quiero ir'], ['fuimos', '✅ Fuimos'], ['no', '✖️ No'], ['sin', 'Sin marcar']].map(([k, n]) => `<button class="chip ${fEst === k ? 'on' : ''}" data-fest="${k}">${n}</button>`).join('')}</div>
    <p class="muted">${lista.length} de ${SITIOS.length} sitios · ${conSitios.length} municipios</p>
    <div id="lista">${conSitios.map(([m, ss]) => `<details class="muni" data-muni="${esc(m)}" ${filtro || muniAbiertos.has(m) ? 'open' : ''}>
      <summary>🏘️ ${esc(m)}<span class="n">${ss.filter(s => marca(s.id).estado === 'fuimos').length}✅ · ${ss.length}</span></summary>
      <div class="fichas">${ss.map(fichaHTML).join('')}</div></details>`).join('') || '<div class="card muted">Nada con ese filtro.</div>'}</div>
    ${!filtro ? `<p class="muted">Municipios sin sitios todavía: ${grupos.filter(g => !g[1].length).length} de 31 (llegan en la próxima versión del catálogo).</p>` : ''}`;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-ftipo]'), s = e.target.closest('[data-fest]');
  if (t) { fTipo = t.dataset.ftipo; render(); } else if (s) { fEst = s.dataset.fest; render(); }
});
let qT = 0;
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return; q = e.target.value; clearTimeout(qT);
  qT = setTimeout(() => { const pos = e.target.selectionStart; render(); const i = $('#q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch {} } }, 200);
});

// ---------- 🗺️ Mapa propio (sin librerías) ----------
// Teselas de OpenStreetMap con conexión (se guardan las vistas); sin conexión, la silueta de la isla y los puntos.
const MPT = 256, MPZ = [9, 18];
const mpX = (lon, z) => (lon + 180) / 360 * MPT * 2 ** z;
const mpY = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * MPT * 2 ** z; };
const mpLon = (x, z) => x / (MPT * 2 ** z) * 360 - 180;
const mpLat = (y, z) => 180 / Math.PI * Math.atan(Math.sinh(Math.PI - 2 * Math.PI * y / (MPT * 2 ** z)));
// Silueta aproximada de Tenerife [lon, lat], solo de fondo para cuando no hay teselas.
const ISLA = [[-16.923, 28.342], [-16.84, 28.37], [-16.765, 28.375], [-16.72, 28.38], [-16.64, 28.395], [-16.55, 28.42],
  [-16.48, 28.43], [-16.42, 28.49], [-16.32, 28.575], [-16.22, 28.58], [-16.13, 28.585], [-16.12, 28.53], [-16.24, 28.46],
  [-16.37, 28.35], [-16.37, 28.29], [-16.41, 28.22], [-16.43, 28.16], [-16.44, 28.14], [-16.53, 28.04], [-16.69, 28.0],
  [-16.72, 28.05], [-16.74, 28.08], [-16.82, 28.18], [-16.84, 28.245], [-16.9, 28.3]];
const MP = { z: null, c: [28.29, -16.6], sel: null, yo: null };
let mpTipo = '';
function viewMapa() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  const tiposHay = Object.keys(TIPOS).filter(t => SITIOS.some(s => s.tipo === t));
  return `<div class="chips">${[['', 'Todos'], ...tiposHay.map(t => [t, tipoIc(t) + ' ' + tipoNom(t)])].map(([k, n]) => `<button class="chip ${mpTipo === k ? 'on' : ''}" data-mptipo="${k}">${n}</button>`).join('')}</div>
    <div class="mapa" id="mapa"><div class="mp-vista"><div class="mp-capa"></div></div>
      <div class="mp-bot"><button data-mpz="1" aria-label="Acercar">+</button><button data-mpz="-1" aria-label="Alejar">−</button><button data-mpfit aria-label="Ver toda la isla">⤢</button><button data-mpyo aria-label="Dónde estoy">🎯</button></div>
      <div class="mp-attr">© OpenStreetMap</div><div class="mp-info"></div></div>
    <p class="leyenda">Borde azul 🔖 quiero ir · fondo verde ✅ fuimos · apagado ✖️ no. Sin conexión se ven los puntos sobre la silueta de la isla.</p>`;
}
const puntos = () => SITIOS.filter(s => (!mpTipo || s.tipo === mpTipo) && isFinite(s.lat) && isFinite(s.lon));
function mpEncajar(W, H) {
  const la = ISLA.map(c => c[1]), lo = ISLA.map(c => c[0]);
  const [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
  MP.c = [(a + b) / 2, (c + d) / 2]; MP.z = 14;
  while (MP.z > MPZ[0] && (mpX(d, MP.z) - mpX(c, MP.z) > W - 20 || mpY(a, MP.z) - mpY(b, MP.z) > H - 20)) MP.z--;
}
function pintarMapa() {
  const el = $('#mapa'); if (!el) return;
  if (MP.z == null) mpEncajar(el.clientWidth, el.clientHeight);
  mpDibujar(el);
  if (!el._mp) { el._mp = 1; mpGestos(el); }
}
function mpDibujar(el) {
  const W = el.clientWidth, H = el.clientHeight, z = MP.z, n = 2 ** z;
  const ox = mpX(MP.c[1], z) - W / 2, oy = mpY(MP.c[0], z) - H / 2;
  const P = (lat, lon) => [mpX(lon, z) - ox, mpY(lat, z) - oy];
  let h = `<svg class="mp-isla" width="${W}" height="${H}"><path d="M${ISLA.map(([lo, la]) => P(la, lo).map(v => v.toFixed(1)).join(',')).join('L')}Z"/></svg>`;
  for (let tx = Math.floor(ox / MPT) - 1; tx <= Math.floor((ox + W) / MPT) + 1; tx++)
    for (let ty = Math.floor(oy / MPT) - 1; ty <= Math.floor((oy + H) / MPT) + 1; ty++) {
        if (ty < 0 || ty >= n) continue;
        h += `<img class="mp-t" alt="" draggable="false" src="https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png" style="left:${tx * MPT - ox}px;top:${ty * MPT - oy}px" onerror="this.remove()">`;
      }
  const S = z >= 14 ? 1 : z >= 12 ? .85 : .72;
  puntos().forEach(s => {
    const [x, y] = P(s.lat, s.lon); if (x < -30 || y < -30 || x > W + 30 || y > H + 30) return;
    const e = marca(s.id).estado;
    h += `<button class="mp-pt ${e ? 'e-' + e : ''} ${MP.sel === s.id ? 'sel' : ''}" data-mpp="${esc(s.id)}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px" aria-label="${esc(s.nombre)}">${tipoIc(s.tipo)}</button>`;
  });
  if (MP.yo) { const [x, y] = P(MP.yo[0], MP.yo[1]); h += `<span class="mp-yo" style="left:${x}px;top:${y}px"></span>`; }
  const capa = el.querySelector('.mp-capa'); capa.style.transform = ''; capa.style.setProperty('--mps', S); capa.innerHTML = h;
  const inf = el.querySelector('.mp-info'), s = MP.sel && sitio(MP.sel);
  inf.innerHTML = s ? mpFicha(s) : ''; inf.classList.toggle('on', !!s);
}
function mpFicha(s) {
  const m = marca(s.id);
  return `<div class="mp-f"><div class="row"><b>${tipoIc(s.tipo)} ${esc(s.nombre)}</b><button class="sec mini" data-mpcerrar aria-label="Cerrar">✕</button></div>
    <div class="muted">${esc(s.municipio)}${m.estado ? ' · ' + ESTADOS[m.estado].join(' ') : ''}${m.estrellas ? ' · ' + '⭐'.repeat(m.estrellas) : ''}</div>
    ${s.verificar ? '<div class="ver">⚠️ VERIFICAR</div>' : ''}
    <div class="acciones"><button class="mini" data-irficha="${esc(s.id)}">📍 Ver ficha</button><a class="btn sec mini" href="${gmaps(s)}" target="_blank" rel="noopener">🌐 Google Maps</a></div></div>`;
}
function mpGestos(el) {
  const v = el.querySelector('.mp-vista'), capa = () => el.querySelector('.mp-capa');
  const ps = new Map(); let ini = null, movido = false, pinch = null;
  const mover = (dx, dy, s = 1) => { capa().style.transform = `translate(${dx}px,${dy}px) scale(${s})`; };
  v.addEventListener('pointerdown', e => {
    if (e.target.closest('.mp-info')) return;
    v.setPointerCapture(e.pointerId); ps.set(e.pointerId, [e.clientX, e.clientY]);
    if (ps.size === 1) { ini = [e.clientX, e.clientY]; movido = false; pinch = null; }
    if (ps.size === 2) { const [a, b] = [...ps.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: 1 }; movido = true; }
  });
  v.addEventListener('pointermove', e => {
    if (!ps.has(e.pointerId)) return; ps.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ps.size === 2) { const [a, b] = [...ps.values()]; pinch.s = Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d; capa().style.transformOrigin = `${el.clientWidth / 2}px ${el.clientHeight / 2}px`; mover(0, 0, pinch.s); return; }
    if (!ini || pinch) return;
    const dx = e.clientX - ini[0], dy = e.clientY - ini[1];
    if (Math.hypot(dx, dy) > 6) movido = true;
    if (movido) mover(dx, dy);
  });
  const fin = e => {
    if (!ps.has(e.pointerId)) return; ps.delete(e.pointerId);
    if (pinch) { if (!ps.size) { mpZoom(el, Math.round(Math.log2(pinch.s))); pinch = null; ini = null; } return; }
    if (!ini) return;
    const dx = e.clientX - ini[0], dy = e.clientY - ini[1]; ini = null;
    if (movido) { MP.c = [mpLat(mpY(MP.c[0], MP.z) - dy, MP.z), mpLon(mpX(MP.c[1], MP.z) - dx, MP.z)]; mpDibujar(el); return; }
    const t = document.elementFromPoint(e.clientX, e.clientY), b = t && t.closest('.mp-pt');
    MP.sel = b ? b.dataset.mpp : null; mpDibujar(el);
  };
  v.addEventListener('pointerup', fin); v.addEventListener('pointercancel', fin);
  v.addEventListener('dblclick', () => mpZoom(el, 1));
}
function mpZoom(el, dz) { MP.z = Math.min(MPZ[1], Math.max(MPZ[0], MP.z + dz)); mpDibujar(el); }
document.addEventListener('click', e => {
  const el = $('#mapa');
  const t = e.target.closest('[data-mptipo]'); if (t) { mpTipo = t.dataset.mptipo; MP.sel = null; render(); return; }
  const v = e.target.closest('[data-vermapa]');
  if (v) { const s = sitio(v.dataset.vermapa); if (s) { MP.sel = s.id; MP.c = [s.lat, s.lon]; MP.z = 14; mpTipo = ''; ir('mapa'); } return; }
  if (!el) return;
  if (e.target.closest('[data-mpz]')) mpZoom(el, +e.target.closest('[data-mpz]').dataset.mpz);
  else if (e.target.closest('[data-mpfit]')) { mpEncajar(el.clientWidth, el.clientHeight); mpDibujar(el); }
  else if (e.target.closest('[data-mpcerrar]')) { MP.sel = null; mpDibujar(el); }
  else if (e.target.closest('[data-mpyo]')) {
    if (!navigator.geolocation) return alert('Este móvil no da la ubicación.');
    navigator.geolocation.getCurrentPosition(p => { MP.yo = [p.coords.latitude, p.coords.longitude]; MP.c = MP.yo; if (MP.z < 13) MP.z = 13; mpDibujar(el); },
      () => alert('No se pudo saber dónde estás (activa la ubicación).'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
});
addEventListener('resize', () => { if (tab === 'mapa') pintarMapa(); });

// ---------- 👥 Grupo ----------
function viewGrupo() {
  return `<div class="vacio"><div class="grande">👥</div><p class="big">El grupo llega pronto</p>
    <p class="muted">Aquí veréis lo que ha marcado cada uno de la Familia de A Muchis, al momento y sin pasaros archivos: quién lleva más sitios, las últimas marcas y lo que nadie ha hecho todavía.</p></div>
    <div class="card">Por ahora tus marcas se guardan <b>solo en este móvil</b>. Cuando esté el grupo, se subirán solas. Mientras tanto puedes hacer una copia en ☰ Más.</div>`;
}

// ---------- ☰ Más ----------
function viewMas() {
  const t = load(K_THEME, 'auto');
  return `<h2>🎨 Tema</h2>
    <div class="chips">${Object.entries(TEMAS).map(([k, [ic, n]]) => `<button class="chip ${t === k ? 'on' : ''}" data-settema="${k}">${ic} ${n}</button>`).join('')}</div>
    <h2>💾 Copia de mis marcas</h2>
    <div class="card"><p class="muted">Tus marcas viven en este móvil. Guarda una copia por si cambias de móvil o borras datos del navegador.</p>
      <div class="row"><button class="sec" data-exportar>⬇️ Exportar</button><button class="sec" data-importar>⬆️ Importar</button></div></div>
    <h2>📲 Instalar en el móvil</h2>
    <div class="card"><ol class="pasos"><li><b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
      <li><b>iPhone (Safari):</b> botón Compartir → «Añadir a pantalla de inicio».</li>
      <li>Ábrela una vez con conexión: desde entonces funciona sin ella (las calles del mapa, solo las zonas que hayas visto).</li></ol></div>
    <h2>📚 Sobre los datos</h2>
    <div class="card"><p>Cada sitio lleva su fuente. Lo marcado con <span class="ver">⚠️ VERIFICAR</span> está pendiente de comprobar (coordenadas, horarios, precios o accesos): confírmalo antes de ir.</p>
      <p class="muted">Mapa © colaboradores de OpenStreetMap.</p></div>
    <h2>🧹 Borrar</h2>
    <button class="danger" data-borrar>Borrar todas mis marcas de este móvil</button>
    <p class="muted" style="text-align:center">Escapadas · Familia de A Muchis · ${VERSION}</p>`;
}
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-settema]'); if (t) { save(K_THEME, t.dataset.settema); applyTheme(); render(); return; }
  if (e.target.closest('[data-exportar]')) {
    const txt = JSON.stringify({ app: 'escapadas', version: VERSION, exportado: new Date().toISOString(), marcas }, null, 1);
    const nombre = `escapadas-marcas-${hoyISO()}.json`, f = new File([txt], nombre, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nombre }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return;
  }
  if (e.target.closest('[data-importar]')) { $('#file').click(); return; }
  if (e.target.closest('[data-borrar]') && confirm('¿Borrar todas tus marcas de este móvil? No se puede deshacer (salvo con una copia).')) { marcas = {}; save(K_MARCAS, marcas); render(); }
});
// Importar: se juntan con las que hay; si un sitio está en los dos, gana la marca más reciente.
$('#file').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text()), m = d && d.marcas; if (!m || typeof m !== 'object') throw 0;
    let n = 0;
    for (const [id, v] of Object.entries(m)) if (v && typeof v === 'object' && (!marcas[id] || (v.actualizado || 0) > (marcas[id].actualizado || 0))) { marcas[id] = v; n++; }
    save(K_MARCAS, marcas); alert(`Importadas ${n} marcas.`); render();
  } catch { alert('Ese archivo no es una copia de marcas de Escapadas.'); }
});

// ---------- arranque ----------
$('#version').textContent = VERSION;
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) {
  // Si llega una versión nueva, recarga una vez para usarla (sin perder datos).
  const habiaSW = !!navigator.serviceWorker.controller; let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (habiaSW && !recargado) { recargado = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js').then(r => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); });
  }).catch(() => {});
}
