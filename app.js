'use strict';

// Versión visible arriba. Súbela a la vez que CACHE en sw.js y --css-ver al final de styles.css.
const VERSION = 'v54';
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
const ESTADOS = { quiero: ['🔖', 'Quiero ir'], fuimos: ['✅', 'Visitado'], no: ['✖️', 'No'] };
const MUNICIPIOS = ['Adeje', 'Arafo', 'Arico', 'Arona', 'Buenavista del Norte', 'Candelaria', 'El Rosario', 'El Sauzal',
  'El Tanque', 'Fasnia', 'Garachico', 'Granadilla de Abona', 'Guía de Isora', 'Güímar', 'Icod de los Vinos', 'La Guancha',
  'La Matanza de Acentejo', 'La Orotava', 'La Victoria de Acentejo', 'Los Realejos', 'Los Silos', 'Puerto de la Cruz',
  'San Cristóbal de La Laguna', 'San Juan de la Rambla', 'San Miguel de Abona', 'Santa Cruz de Tenerife', 'Santa Úrsula',
  'Santiago del Teide', 'Tacoronte', 'Tegueste', 'Vilaflor de Chasna'];

let SITIOS = [];
// 🧸 Con niños: del catálogo (s.ninos = qué dice la fuente) o porque alguien (tú o el grupo) lo marcó en su ficha.
const quienNinos = id => Object.entries((typeof NUBE !== 'undefined' && NUBE.marcasGrupo && NUBE.marcasGrupo[id]) || {}).filter(([u, m]) => m.ninos && u !== (NUBE.user && NUBE.user.uid)).map(([u]) => u);
const conNinos = id => { const s = sitio(id); return !!((s && s.ninos) || marca(id).ninos || (enGrupo() && quienNinos(id).length)); };
const sitio = id => SITIOS.find(s => s.id === id);
// SITIOS = catálogo (BASE) + los que añade el grupo (propios.js).
fetch('data/sitios.json').then(r => r.json()).then(d => { BASE = Array.isArray(d) ? d : []; mezclarSitios(); render(); abrirEnlace(); })
  .catch(() => { BASE = []; mezclarSitios(); render(); });

// ---------- fotos (Wikimedia Commons, del artículo de Wikipedia de cada sitio) ----------
// data/fotos.json = { sitioId: { src (960 px), archivo } }. El service worker guarda cada foto vista (sin conexión).
let FOTOS = {};
fetch('data/fotos.json').then(r => r.json()).then(d => { FOTOS = d || {}; render(); }).catch(() => {});
// Agenda de Turismo de Tenerife (eventos.js): eventos con fecha y su foto.
// Trazados de los senderos oficiales (data/senderos.json: {id: [[lat, lon], …]}), para dibujarlos en el mapa.
let TRAZOS = {};
fetch('data/senderos.json').then(r => r.json()).then(d => { TRAZOS = d || {}; if (tab === 'mapa') pintarMapa(); }).catch(() => {});
fetch('data/cine.json').then(r => r.json()).then(d => { CINE = d; if (tab === 'eventos' || tab === 'finde') render(); }).catch(() => {});
fetch('data/festivos.json').then(r => r.json()).then(d => { FESTIVOS = d; render(); }).catch(() => {});
fetch('data/agenda.json').then(r => r.json()).then(d => { cargarAgenda(d); mezclarSitios(); render(); }).catch(() => {});
fetch('data/agenda_auditorio.json').then(r => r.json()).then(d => { cargarAgenda(d, 'auditorio'); mezclarSitios(); render(); }).catch(() => {});
fetch('data/revision.json').then(r => r.json()).then(d => { cargarRevision(d); mezclarSitios(); render(); }).catch(() => {});
const fotoSrc = (id, mini) => { const f = FOTOS[id] || FOTOS_AG[id]; if (!f) return ''; return mini ? f.src.replace('/960px-', '/330px-') : f.src; };
const fotoCredito = id => !FOTOS[id] && FOTOS_AG[id] ? `<a class="credito" href="${esc(FOTOS_AG[id].enlace)}" target="_blank" rel="noopener">📷 ${esc(FOTOS_AG[id].credito || 'Turismo de Tenerife')}</a>` : FOTOS[id] && FOTOS[id].archivo ? `<a class="credito" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(FOTOS[id].archivo)}" target="_blank" rel="noopener">📷 Wikimedia Commons</a>` : '';
// <img> perezosa; la miniatura, si no existe en ese tamaño, prueba la grande; si tampoco, desaparece.
function fotoImg(id, cls = '', mini = false) {
  const src = fotoSrc(id, mini); if (!src) return '';
  const grande = mini ? fotoSrc(id) : '';
  return `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" decoding="async"${grande && grande !== src ? ` data-f="${esc(grande)}"` : ''} onerror="if(this.dataset.f){this.src=this.dataset.f;this.dataset.f=''}else{this.remove()}">`;
}
// Banner de municipio: foto de su portada (o del primer sitio con foto) con el degradado de su color.
const portadaDe = m => { const t = muniTema(m); return (t.portada && FOTOS[t.portada]) ? t.portada : ((SITIOS.find(s => s.municipio === m && FOTOS[s.id]) || {}).id || ''); };

// ---------- isla elegida (esqueleto: hoy solo Tenerife tiene catálogo) ----------
let islaSel = load('esc.isla', 'tenerife'); if (!ISLAS[islaSel] || !ISLAS[islaSel].activa) islaSel = 'tenerife';
const enIsla = s => islaDe(s) === islaSel;
function islasHTML() {
  return `<div class="chips islas">${Object.entries(ISLAS).map(([k, i]) => `<button class="chip ${k === islaSel ? 'on' : ''} ${i.activa ? '' : 'pronto'}" data-isla="${k}">${i.ic} ${esc(i.nombre)}${i.activa ? '' : ' <small>pronto</small>'}</button>`).join('')}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-isla]'); if (!b) return;
  const i = ISLAS[b.dataset.isla];
  if (!i.activa) return;
  islaSel = b.dataset.isla; save('esc.isla', islaSel); render();
});

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
  if (!m.ninos) delete m.ninos;
  if (!m.estado && !m.estrellas && !m.nota && !m.ninos) delete marcas[id]; else marcas[id] = m;
  save(K_MARCAS, marcas);
  if (typeof subirMarca === 'function') subirMarca(id); // al grupo (nube.js), o en cola si no hay red
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

// ---------- tamaño de letra (Más) ----------
const LETRAS = { compacta: 'Compacta', normal: 'Normal', grande: 'Grande' };
function applyLetra() { const l = load('esc.letra', 'compacta'); if (l === 'compacta') delete document.documentElement.dataset.letra; else document.documentElement.dataset.letra = l; }
applyLetra();

// ---------- pestañas ----------
// 5 pestañas (como las apps más valoradas). «Explorar» es Sitios y Mapa en una sola pestaña con «Lista ⇄ Mapa»;
// el Tiempo se abre desde Planes. Las vistas internas siguen siendo: finde, tiempo, eventos, sitios, mapa, grupo, mas.
const TABS = [['finde', 'Planes', '🏠'], ['tiempo', 'Tiempo', '🌤️'], ['explorar', 'Explorar', '🧭'], ['eventos', 'Eventos', '🎟️'], ['cultura', 'Cultura', '🎨'], ['grupo', 'Grupo', '👥'], ['mas', 'Más', '☰']];
const VISTAS = { finde: 'Escapadas', tiempo: 'Tiempo', eventos: 'Eventos', cultura: 'Cultura', sitios: 'Explorar', mapa: 'Explorar', grupo: 'Grupo', mas: 'Más' };
const pestañaDe = t => t === 'sitios' || t === 'mapa' ? 'explorar' : t;
let tab = load('esc.tab', 'finde');
if (!VISTAS[tab]) tab = 'finde';
function ir(t) { if (t === 'explorar') t = load('esc.explorar', 'sitios'); if (t === 'sitios' || t === 'mapa') save('esc.explorar', t); tab = t; save('esc.tab', t); window.scrollTo(0, 0); render(); }
function pintarTabs() {
  const nov = k => (k === 'eventos' || k === 'cultura') && typeof novNuevas === 'function' && k !== tab ? novNuevas(k) : 0;
  $('#tabs').innerHTML = TABS.map(([k, n, ic]) => { const c = nov(k); return `<button class="${k === pestañaDe(tab) ? 'on' : ''}" data-tab="${k}"><span>${ic}</span>${n}${c ? `<i class="badge" aria-label="${c} novedades">${c > 9 ? '9+' : c}</i>` : ''}</button>`; }).join('');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) ir(b.dataset.tab); });
$('#buscabtn').addEventListener('click', () => { ir('sitios'); const i = $('#q'); if (i) i.focus(); });

// Explorar: «📋 Lista ⇄ 🗺️ Mapa» arriba (como AllTrails).
const conmutador = () => MP.elegir ? '' : `<div class="conmutador" role="tablist"><button class="${tab === 'sitios' ? 'on' : ''}" data-tab="sitios" role="tab"><span>📋</span>Lista</button><button class="${tab === 'mapa' ? 'on' : ''}" data-tab="mapa" role="tab"><span>🗺️</span>Mapa</button></div>`;
function render() {
  pintarTabs();
  $('#title').textContent = VISTAS[tab] || 'Escapadas';
  const v = $('#view');
  v.innerHTML = tab === 'finde' ? viewFinde() : tab === 'tiempo' ? viewTiempo() : tab === 'eventos' ? viewEventos() : tab === 'cultura' ? viewCultura() : tab === 'sitios' ? conmutador() + viewSitios() : tab === 'mapa' ? conmutador() + viewMapa()
    : tab === 'grupo' ? viewGrupo() : viewMas();
  if (tab === 'mapa') pintarMapa();
  if (tab === 'finde' && typeof girarRuedas === 'function') { montarPaginador(); girarRuedas(); }
  if ((tab === 'eventos' || tab === 'cultura') && typeof novMarcarVisto === 'function' && AGENDA_SITIOS.length) novMarcarVisto(tab);
  if ((tab === 'sitios' || tab === 'eventos' || tab === 'cultura') && irFicha) {
    // Directo a la ficha (también si las fotos de encima tardan en cargar y la empujan).
    const id = irFicha; irFicha = null; let y = null;
    const ver = () => { const el = document.getElementById('f-' + id); if (!el || (y !== null && Math.abs(scrollY - y) > 4)) return; el.scrollIntoView({ block: 'start' }); y = scrollY; };
    requestAnimationFrame(ver); setTimeout(ver, 350); setTimeout(ver, 900);
  }
}

// ---------- 📤 compartir (WhatsApp, etc.) y enlaces que abren la app en una ficha (#f=id) o un día (#d=AAAA-MM-DD) ----------
const urlApp = h => location.origin + location.pathname.replace(/index\.html$/, '') + '#' + h;
function compartir(clave) {
  const [t, id] = [clave.slice(0, 1), clave.slice(2)]; let texto = '', url = '';
  if (t === 's') { const s = sitio(id); if (!s) return;
    const f = typeof proximaVez === 'function' && esEvento(s) ? proximaVez(s) : null;
    texto = `${tipoIc(s.tipo)} ${s.nombre}${s.municipio ? ' (' + s.municipio + ')' : ''}${f ? ' · ' + fechaEventoTxt(f) : ''}. ¿Vamos?`; url = urlApp('f=' + id); }
  else { const p = (NUBE.planes || []).find(x => x.id === id); if (!p) return; const s = p.sitioId && sitio(p.sitioId);
    texto = `📅 Plan: ${s ? s.nombre : p.destino} · ${enVotacion(p) ? 'votando el día (' + p.opciones.map(diaCorto).join(', ') + ')' : fechaPlan(p)}. ¿Te apuntas?`; url = urlApp('d=' + p.fecha); }
  if (navigator.share) navigator.share({ title: 'Escapadas', text: texto, url }).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(texto + ' ' + url), '_blank', 'noopener');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-compartir]'); if (b) { e.preventDefault(); compartir(b.dataset.compartir); } });
function abrirEnlace() {
  const h = decodeURIComponent(location.hash.slice(1)); if (!h || !SITIOS.length) return;
  if (h.startsWith('f=') && sitio(h.slice(2))) { const b = document.createElement('button'); b.dataset.irficha = h.slice(2); b.hidden = true; document.body.append(b); b.click(); b.remove(); }
  else if (/^d=\d{4}-\d{2}-\d{2}$/.test(h) && typeof calSel !== 'undefined') { calSel = h.slice(2); calMes = calSel.slice(0, 7); ir('finde'); setTimeout(() => { const x = document.querySelector('.cal'); if (x) x.scrollIntoView({ block: 'start' }); }, 300); }
  else return;
  history.replaceState(null, '', location.pathname + location.search);
}
addEventListener('hashchange', abrirEnlace);

// ---------- fichas ----------
const abiertas = new Set();
// Sin coordenadas exactas (agenda: solo el municipio), se busca por el nombre y el lugar.
const gmaps = s => `https://www.google.com/maps/search/?api=1&query=${!isFinite(s.lat) || s.lat === null || s.aprox ? encodeURIComponent([s.lugar || s.nombre, s.municipio, 'Tenerife'].filter(Boolean).join(', ')) : s.lat + ',' + s.lon}`;
// Icono y subtítulo de la ficha: los eventos llevan el de su categoría y su próxima fecha.
const icFicha = s => s.tipo === 'evento' && typeof catIc === 'function' ? catIc(s) : tipoIc(s.tipo);
function subFicha(s) {
  if (s.tipo === 'evento' && typeof proximaVez === 'function') {
    const f = proximaVez(s), d = x => new Date(x + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    if (f) return [f[1] > f[0] ? `${d(f[0])} → ${d(f[1])}` : d(f[0]), s.municipio].filter(Boolean).join(' · ');
  }
  return `${tipoNom(s.tipo)} · ${s.municipio}`;
}
function fichaHTML(s) {
  const m = marca(s.id), e = m.estado;
  const datos = [s.km && `🥾 ${String(s.km).replace('.', ',')} km · ⛰️ +${s.desnivel} m${s.circular ? ' · 🔁 circular' : ' · lineal'}`, s.ninos && `🧸 Con niños: ${esc(s.ninos)}`, s.lugar && `📍 ${esc(s.lugar)}`, distTxt(s) && esc(distTxt(s)), s.duracion && `⏱️ ${esc(s.duracion)}`, s.dificultad && `💪 ${esc(s.dificultad)}`, s.acceso && `🚗 ${esc(s.acceso)}`].filter(Boolean);
  return `<details class="ficha ${e ? 'e-' + e : ''}" id="f-${esc(s.id)}" data-ficha="${esc(s.id)}" ${abiertas.has(s.id) ? 'open' : ''}>
    <summary>${fotoSrc(s.id) ? `<span class="mini-foto">${fotoImg(s.id, '', true)}<span class="mini-ic">${icFicha(s)}</span></span>` : `<span class="ic">${icFicha(s)}</span>`}<span class="nom">${s.tipo === 'evento' ? favIc(s) : ''}${esc(s.nombre)}<small>${esc(subFicha(s))}${distCasa(s) != null ? ` · 📍 ${esc(fmtKm(distCasa(s)))}` : ''}</small></span>
      <span class="est">${caritasMini(s.id)}${e ? ESTADOS[e][0] : ''}${m.estrellas ? `<small> ${'⭐'.repeat(m.estrellas)}</small>` : ''}</span></summary>
    <div class="cuerpo">
      ${abiertas.has(s.id) && fotoSrc(s.id) ? `<div class="ficha-foto">${fotoImg(s.id)}${fotoCredito(s.id)}</div>` : fotoSrc(s.id) ? '<div class="ficha-foto" data-pendiente></div>' : ''}
      ${cuandoHTML(s)}
      <p>${esc(s.desc)}</p>
      ${datos.length ? `<div class="datos">${datos.map(d => `<span>${d}</span>`).join('')}</div>` : ''}
      ${s.verificar ? `<div class="ver">⚠️ VERIFICAR${typeof s.verificar === 'string' ? ': ' + esc(s.verificar) : ''}</div>` : ''}
      ${s.propio ? `<div class="fuente propio-de">👥 ${esc(s.fuente)}${s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noopener">enlace</a>` : ''}</div>`
        : `<div class="fuente">📚 Fuente: ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.fuente || s.url)}</a>` : esc(s.fuente || '—')}</div>`}
      <div class="acciones">
        <a class="btn sec mini" href="${gmaps(s)}" target="_blank" rel="noopener">🌐 Google Maps</a>
        <button class="sec mini" data-compartir="s:${esc(s.id)}">📤 Compartir</button>
        ${isFinite(s.lat) && s.lat !== null && !s.aprox ? `<button class="sec mini" data-vermapa="${esc(s.id)}">🗺️ Ver en el mapa</button>` : ''}
        ${accionesPropio(s)}
      </div>
      ${grupoEnFicha(s.id)}
      <div class="marcas">${Object.entries(ESTADOS).map(([k, [ic, n]]) => `<button class="${e === k ? 'on' : ''}" data-est="${k}" data-id="${esc(s.id)}">${ic} ${n}</button>`).join('')}</div>
      <div class="estrellas" aria-label="Valoración">${[1, 2, 3, 4, 5].map(n => `<button class="${(m.estrellas || 0) >= n ? 'on' : ''}" data-estr="${n}" data-id="${esc(s.id)}" aria-label="${n} estrellas">★</button>`).join('')}</div>
      ${s.tipo !== 'evento' ? `<div class="ninos-f"><button class="sec mini ${m.ninos ? 'on' : ''}" data-ninos="${esc(s.id)}" aria-pressed="${!!m.ninos}">🧸 ${m.ninos ? 'Bien con niños ✓' : 'Bien para ir con niños'}</button>${enGrupo() && quienNinos(s.id).length ? `<span class="muted"> también: ${quienNinos(s.id).map(u => esc(perfilDe(u).emoji + ' ' + perfilDe(u).nombre)).join(', ')}</span>` : ''}</div>` : ''}
      <textarea class="nota" maxlength="1000" data-nota="${esc(s.id)}" placeholder="📝 Nota (${enGrupo() ? 'la verá el grupo' : 'solo en este móvil'})">${esc(m.nota || '')}</textarea>
      ${e === 'fuimos' ? fechaFuimosHTML(s) : m.fecha ? `<div class="muted">Marcado el ${esc(new Date(m.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }))}</div>` : ''}
      ${planesEnFicha(s.id)}
    </div></details>`;
}
const repintarFicha = id => {
  const el = document.getElementById('f-' + id), s = sitio(id);
  if (el && s) el.outerHTML = fichaHTML(s);
  document.querySelectorAll('[data-cuenta]').forEach(c => { c.outerHTML = cuentaHTML(); });
};
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.dataset) return;
  if (d.dataset.ficha) {
    if (d.open) { abiertas.add(d.dataset.ficha); const ff = d.querySelector('.ficha-foto[data-pendiente]'); if (ff) { ff.removeAttribute('data-pendiente'); ff.innerHTML = fotoImg(d.dataset.ficha) + fotoCredito(d.dataset.ficha); } }
    else abiertas.delete(d.dataset.ficha);
  }
  if (d.dataset.muni) { if (d.open) muniAbiertos.add(d.dataset.muni); else muniAbiertos.delete(d.dataset.muni); }
}, true);
document.addEventListener('click', e => {
  const k = e.target.closest('[data-ninos]'); if (k) { const id = k.dataset.ninos; setMarca(id, { ninos: !marca(id).ninos }); abiertas.add(id); if (tab === 'mapa') pintarMapa(); else repintarFicha(id); return; }
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
  // Los eventos tienen su pestaña.
  if (s.tipo === 'evento' && typeof CULTURA !== 'undefined' && CULTURA.includes(catDe(s))) { abiertas.add(id); irFicha = id; culSec = catDe(s); evZona = ''; evCerradas.clear(); ir('cultura'); return; }
  if (s.tipo === 'evento') { abiertas.add(id); irFicha = id; ponerCats(catsEventos()); evRango = 'anio'; evZona = ''; evCerradas.clear(); ir('eventos'); return; }
  abiertas.add(id); muniAbiertos.add(s.municipio); irFicha = id; fTipo = fEst = fGrupo = fZona = fNinos = fCol = ''; q = ''; if (orden !== 'municipio') { orden = 'municipio'; save('esc.orden', orden); } ir('sitios');
});

// ---------- 🏠 Este finde ---------- (la pestaña está en finde.js)
function cuentaHTML() {
  const vals = Object.values(marcas), n = k => vals.filter(m => m.estado === k).length;
  return `<div class="cuenta" data-cuenta><div><b>${n('fuimos')}</b>✅ Visitados</div><div><b>${n('quiero')}</b>🔖 Quiero ir</div><div><b>${SITIOS.length - Object.keys(marcas).filter(k => marcas[k].estado).length}</b>Sin marcar</div></div>`;
}
function viewFinde() { return viewFindeS5(); }

// ---------- 📍 Sitios ----------
// 📚 Colecciones (idea de Komoot): grupos de sitios hechos con datos que la app ya tiene. [icono, nombre, filtro, solo con grupo]
const COLECCIONES = {
  // (v38) Solo las que no repiten un filtro; están en la fila de «temáticas» de los filtros, junto a 🧸 Con niños.
  lluvia: ['🌧️', 'Día de lluvia', s => s.tipo === 'museo'],
  charcos: ['💦', 'Charcos y piscinas', s => s.tipo === 'playa' && /charco|piscina/i.test(s.nombre + ' ' + s.desc)],
  circulares: ['🔁', 'Senderos circulares', s => !!s.circular]
};
let q = '', fTipo = '', fEst = '', fGrupo = '', fZona = '', fNinos = '', fCol = '', orden = load('esc.orden', 'municipio');
const muniAbiertos = new Set();
const ESTADOS_F = [['', '🗂️', 'Todos'], ['quiero', '🔖', 'Quiero ir'], ['fuimos', '✅', 'Visitado'], ['no', '✖️', 'No'], ['sin', '⬜', 'Sin marcar']];
const GRUPO_F = [['', '👥', 'Da igual'], ['nadie', '🌱', 'Nadie ha ido'], ['ganas', '🔖', 'Alguien quiere ir'], ['fueron', '✅', 'Alguien lo visitó']];
const ORDENES = { municipio: '🏘️ Por municipio', zona: '🏞️ Por zona', nombre: '🔤 Nombre (A-Z)', cerca: '📍 Más cerca de mí', valorados: '⭐ Mejor valorados', deseados: '🔖 Más deseados' };
const zonaNom = s => typeof zonaDe === 'function' ? zonaDe(s) : '';
// ---------- 💛 Favoritos (v50): municipios y cines de cada persona (solo en este móvil) ----------
let FAV = null, ZMUNI = null;
// Zona de un municipio = la de la mayoría de sus sitios del catálogo (el primer pueblo puede caer en otra zona, p. ej. Anaga).
function zonaMuni(m) {
  if (!ZMUNI && BASE.length) { ZMUNI = {}; const c = {};
    BASE.forEach(s => { if (s.aprox || s.tipo === 'evento') return; const z = zonaNom(s); if (!z) return; const k = c[s.municipio] = c[s.municipio] || {}; k[z] = (k[z] || 0) + 1; });
    for (const [mu, k] of Object.entries(c)) ZMUNI[mu] = Object.entries(k).sort((x, y) => y[1] - x[1])[0][0]; }
  return (ZMUNI || {})[m] || '';
}
// Áreas: las 6 zonas del tiempo y Santa Cruz – La Laguna juntas (pedido del usuario: «tienen que funcionar juntos»).
const AREAS_EXTRA = { metro: ['🏙️', 'Santa Cruz – La Laguna', ['Santa Cruz de Tenerife', 'San Cristóbal de La Laguna']] };
function favs() {
  if (!FAV) { const munis = new Set(load('esc.favmunis', [])), cines = load('esc.favcines', []), areas = new Set(load('esc.favareas', []));
    const enArea = new Set(MUNICIPIOS.filter(m => areas.has(zonaMuni(m)) || Object.entries(AREAS_EXTRA).some(([k, [, , ms]]) => areas.has(k) && ms.includes(m))));
    FAV = { munis, cines, areas, enArea, zonas: new Set([...munis, ...enArea].map(zonaMuni).filter(Boolean)) }; }
  return FAV;
}
const favMuni = m => favs().munis.has(m) || favs().enArea.has(m); // el municipio o un área que lo incluye
const favSitio = s => !!s && (favMuni(s.municipio) ? 2 : favs().zonas.has(zonaNom(s)) ? 1 : 0); // 2 dentro de tus 💛, 1 misma zona
const favIc = s => s && favMuni(s.municipio) ? '<span class="fav-ic" title="En tus favoritos">💛</span>' : '';
function alternarFav(clave, v) {
  const l = load(clave, []), i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v);
  save(clave, l); FAV = null; render();
}
const zonasOrden = () => Object.entries(ZONAS).sort(([a], [b]) => favs().zonas.has(b) - favs().zonas.has(a));
function favoritosHTML() {
  const zonasM = Object.entries(ZONAS).map(([z, Z]) => [Z, MUNICIPIOS.filter(m => zonaMuni(m) === z)]);
  const cines = [['E0627', 'Yelmo Meridiano'], ['E0284', 'Multicines La Laguna'], ['E0622', 'Yelmo La Villa'], ['E0700', 'X-Sur'], ['E0541', 'Zentral Center']];
  const ar = k => favs().areas.has(k), bArea = (k, ic, n) => `<button class="chip ${ar(k) ? 'on' : ''}" data-fav="esc.favareas" data-v="${k}">${ar(k) ? '💛' : '🤍'} ${ic} ${esc(n)}</button>`;
  return `<div class="card fav"><p class="muted">Lo que está en tus 💛 sale primero y marcado con 💛 en Eventos y Cultura; también sube en Explorar, el tiempo de su zona va arriba, Sorpréndeme lo elige más y tu cine abre la cartelera. Solo en este móvil.</p>
    <div class="fav-zona"><small>🗺️ Áreas</small><div class="chips">${Object.entries(AREAS_EXTRA).map(([k, [ic, n]]) => bArea(k, ic, n)).join('')}${Object.entries(ZONAS).map(([k, Z]) => bArea(k, Z.ic, Z.nom)).join('')}</div></div>
    ${zonasM.map(([Z, ms]) => ms.length ? `<div class="fav-zona"><small>${Z.ic} ${esc(Z.nom)}</small><div class="chips">${ms.map(m => `<button class="chip ${favMuni(m) ? 'on' : ''}" data-fav="esc.favmunis" data-v="${esc(m)}">${favs().munis.has(m) ? '💛' : favs().enArea.has(m) ? '💛' : '🤍'} ${esc(m.replace('San Cristóbal de ', ''))}</button>`).join('')}</div></div>` : '').join('')}
    <div class="fav-zona"><small>🎬 Cines</small><div class="chips">${cines.map(([id, n]) => `<button class="chip ${favs().cines.includes(id) ? 'on' : ''}" data-fav="esc.favcines" data-v="${id}">${favs().cines.includes(id) ? '💛' : '🤍'} ${n}</button>`).join('')}</div></div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-fav]'); if (b) { e.preventDefault(); e.stopPropagation(); alternarFav(b.dataset.fav, b.dataset.v); } }, true);
// ⭐ media de tus estrellas y las del grupo; 🔖 cuántos quieren ir (tú incluido).
function notaMedia(id) {
  const v = [marca(id).estrellas || 0, ...(enGrupo() ? Object.entries(NUBE.marcasGrupo[id] || {}).filter(([u]) => u !== NUBE.user.uid).map(([, m]) => m.estrellas || 0) : [])].filter(Boolean);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
const ganas = id => (marca(id).estado === 'quiero' ? 1 : 0) + (enGrupo() ? otrosEn(id).quiero.length : 0);
function filtrados() {
  const a = sinTildes(q).trim();
  return SITIOS.filter(s => enIsla(s) && !s.agenda && (!fTipo || s.tipo === fTipo) && (!fZona || zonaNom(s) === fZona)
    && (!fCol || (COLECCIONES[fCol] && COLECCIONES[fCol][2](s))) && (!fNinos || conNinos(s.id)) && (!fEst || (fEst === 'sin' ? !marca(s.id).estado : marca(s.id).estado === fEst))
    && (!fGrupo || !enGrupo() || (fGrupo === 'nadie' ? nadieFue(s.id) : fGrupo === 'ganas' ? otrosEn(s.id).quiero.length > 0 : otrosEn(s.id).fuimos.length > 0))
    && (!a || sinTildes([s.nombre, s.municipio, s.desc, tipoNom(s.tipo)].join(' ')).includes(a)));
}
function ordenar(lista) {
  const l = lista.slice(), nom = (x, y) => x.nombre.localeCompare(y.nombre, 'es'), a = sinTildes(q).trim();
  // Al buscar, primero lo que lo lleva en el nombre, luego en el municipio y luego en la descripción.
  if (a && (orden === 'municipio' || orden === 'zona')) { const r = x => sinTildes(x.nombre).includes(a) ? 0 : sinTildes(x.municipio).includes(a) ? 1 : 2; return l.sort((x, y) => r(x) - r(y) || nom(x, y)); }
  if (orden === 'nombre') return l.sort(nom);
  if (orden === 'cerca') { if (!casa()) pedirAqui(); return casa() ? l.sort((x, y) => (distCasa(x) ?? 1e9) - (distCasa(y) ?? 1e9)) : l.sort(nom); }
  if (orden === 'valorados') return l.sort((x, y) => notaMedia(y.id) - notaMedia(x.id) || nom(x, y));
  if (orden === 'deseados') return l.sort((x, y) => ganas(y.id) - ganas(x.id) || nom(x, y));
  return l;
}
// Panel de filtros desplegable: rejillas de botones con el icono arriba (como Planes en viaje-corea).
function rejilla(clave, actual, ops) {
  return `<div class="rejilla">${ops.map(([k, ic, n, off]) => `<button class="celda ${actual === k ? 'on' : ''} ${off ? 'off' : ''}" data-filtro="${clave}" data-v="${esc(k)}"><span>${ic}</span>${esc(n)}</button>`).join('')}</div>`;
}
function filtrosHTML(lista) {
  const tiposHay = Object.keys(TIPOS).filter(t => SITIOS.some(s => s.tipo === t));
  const activos = [
    fTipo && ['fTipo', tipoIc(fTipo) + ' ' + tipoNom(fTipo)],
    fEst && ['fEst', ESTADOS_F.find(x => x[0] === fEst).slice(1).join(' ')],
    fGrupo && ['fGrupo', GRUPO_F.find(x => x[0] === fGrupo).slice(1).join(' ')],
    fZona && ['fZona', ZONAS[fZona].ic + ' ' + ZONAS[fZona].nom],
    fNinos && ['fNinos', '🧸 Con niños'],
    fCol && ['fCol', COLECCIONES[fCol][0] + ' ' + COLECCIONES[fCol][1]]
  ].filter(Boolean);
  const isla = ISLAS[islaSel];
  // Siempre a la vista y en pequeño: una fila de botoncitos por grupo (tocar otra vez quita el filtro).
  const pills = (clave, actual, ops) => `<div class="fm-ops">${ops.map(([k, ic, n]) => `<button class="fm ${actual === k ? 'on' : ''}" data-filtro="${clave}" data-v="${esc(k)}" aria-pressed="${actual === k}">${ic} ${esc(n)}</button>`).join('')}</div>`;
  return `<div class="buscador"><input id="q" type="search" placeholder="🔍 Buscar sitio, pueblo o tipo" value="${esc(q)}" autocomplete="off"></div>
    <div class="filtros-mini">
      ${pills('fTipo', fTipo, tiposHay.map(t => [t, tipoIc(t), tipoNom(t).split(' ')[0]]))}
      <div class="fm-ops">${[['fNinos', 'si', '🧸', 'Con niños', fNinos], ...Object.entries(COLECCIONES).map(([k, [ic, n]]) => ['fCol', k, ic, n, fCol])].map(([c, k, ic, n, act]) => `<button class="fm ${act === k ? 'on' : ''}" data-filtro="${c}" data-v="${k}" aria-pressed="${act === k}">${ic} ${esc(n)}</button>`).join('')}</div>
      ${pills('fEst', fEst, ESTADOS_F.slice(1))}
      ${enGrupo() ? pills('fGrupo', fGrupo, GRUPO_F.slice(1)) : ''}
      ${pills('fZona', fZona, Object.entries(ZONAS).map(([k, z]) => [k, z.ic, z.nom]))}
      ${Object.values(ISLAS).filter(i => i.activa).length > 1 ? pills('isla', islaSel, Object.entries(ISLAS).filter(([, i]) => i.activa).map(([k, i]) => [k, i.ic, i.nombre])) : ''}
      <div class="fm-pie"><label class="orden-sel"><span class="vh">Ordenar</span><select id="orden">${Object.entries(ORDENES).map(([k, n]) => `<option value="${k}" ${orden === k ? 'selected' : ''}>↕️ ${n.slice(n.indexOf(' ') + 1)}</option>`).join('')}</select></label>
        ${activos.length ? '<button class="fm quitar" data-filtro="limpiar">✕ Quitar filtros</button>' : ''}</div>
    </div>`;
}
// Búsqueda o filtros sin resultados: por qué puede ser y qué hacer (quitar filtros, buscar fuera o añadirlo el grupo).
function sinResultadosHTML() {
  const t = q.trim(), a = sinTildes(t), filtros = !!(fTipo || fEst || fGrupo || fZona || fNinos || fCol);
  const comer = /guachinch|restaur|bar\b|comer|cena|almuerzo|tasca|bodega|cafe/.test(a);
  const lineas = [];
  if (t) lineas.push(`No hay nada con «${esc(t)}» en el catálogo${filtros ? ' con los filtros que tienes puestos' : ''}.`);
  else lineas.push('Nada con esos filtros.');
  if (comer) lineas.push('Los guachinches del catálogo salen del censo del Cabildo; los que falten, y los restaurantes, los añade el grupo.');
  else if (t) lineas.push('El catálogo sale de Wikipedia y no tiene todos los rincones; si lo conocéis, añadidlo.');
  const botones = [
    filtros && '<button class="sec mini" data-filtro="limpiar">✕ Quitar filtros</button>',
    t && `<a class="btn sec mini" href="https://www.google.com/maps/search/${encodeURIComponent(t + ' Tenerife')}" target="_blank" rel="noopener">🌐 Buscar en Google Maps</a>`,
    t && enGrupo() && `<button class="mini" data-propio="nuevo" data-tipo="${comer ? (/restaur|cena|almuerzo|cafe|bar\b/.test(a) ? 'restaurante' : 'guachinche') : 'curioso'}" data-nombre="${esc(t)}">➕ Añadir «${esc(t)}»</button>`,
    t && !enGrupo() && '<button class="sec mini" data-tab="grupo">👥 Entra en el grupo para añadirlo</button>'
  ].filter(Boolean);
  return `<div class="card sin-res">${lineas.map(l => `<p>${l}</p>`).join('')}<div class="acciones">${botones.join('')}</div></div>`;
}
function viewSitios() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  const lista = ordenar(filtrados()), filtro = !!(q || fTipo || fEst || fGrupo || fZona);
  const cab = propioBotonHTML() + filtrosHTML(lista) + `<p class="muted cuenta-lista">${lista.length} de ${SITIOS.filter(enIsla).length} sitios${orden === 'cerca' && !casa() ? ' · 📍 buscando dónde estás para ordenar por distancia…' : ''}</p>`;
  if (!lista.length) return cab + sinResultadosHTML();
  // Agrupado: por municipio (banners) o por zona; si no, lista seguida en el orden elegido.
  // Buscando: lista seguida, primero lo que coincide en el nombre (ver ordenar).
  if (sinTildes(q).trim() && (orden === 'municipio' || orden === 'zona')) return cab + `<div class="lista-plana">${lista.map(fichaHTML).join('')}</div>`;
  if (orden === 'zona') {
    return cab + zonasOrden().map(([z, Z]) => { const ss = lista.filter(s => zonaNom(s) === z).sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
      return ss.length ? `<details class="muni zona" data-muni="z:${z}" ${filtro || muniAbiertos.has('z:' + z) ? 'open' : ''}><summary class="banner" style="--h:${{ oeste: 25, sur: 40, este: 210, laguna: 345, norte: 130, teide: 8 }[z]}">${fotoImg(({ oeste: 'los-gigantes', sur: 'el-medano', este: 'teresitas', laguna: 'catedral-laguna', norte: 'garachico-caleton', teide: 'teide' })[z], 'banner-foto')}<span class="banner-tx"><span class="banner-ic">${Z.ic}</span><span class="banner-n"><b>${esc(Z.nom)}</b><small>${ss.length} sitios</small></span></span></summary><div class="fichas">${ss.map(fichaHTML).join('')}</div></details>` : ''; }).join('');
  }
  if (orden !== 'municipio') return cab + `<div class="lista-plana">${lista.map(fichaHTML).join('')}</div>`;
  const grupos = MUNICIPIOS.map(m => [m, lista.filter(s => s.municipio === m)]).filter(g => g[1].length).sort((x, y) => favMuni(y[0]) - favMuni(x[0])); // 💛 primero
  return cab + `<div id="lista">${grupos.map(([m, ss]) => `<details class="muni" data-muni="${esc(m)}" ${filtro || muniAbiertos.has(m) ? 'open' : ''}>
      <summary class="banner" style="${varsMuni(m)}">${portadaDe(m) ? fotoImg(portadaDe(m), 'banner-foto') : ''}<span class="banner-tx"><span class="banner-ic">${muniTema(m).ic}</span>
        <span class="banner-n"><b>${esc(m)}</b><small>${esc(muniTema(m).lema)}</small></span>
        <span class="n">${ss.filter(s => marca(s.id).estado === 'fuimos').length} ✅ · ${ss.length}</span><span class="fav-ban" role="button" data-fav="esc.favmunis" data-v="${esc(m)}" aria-label="Favorito">${favMuni(m) ? '💛' : '🤍'}</span></span></summary>
      <div class="fichas">${ss.map(fichaHTML).join('')}</div></details>`).join('')}</div>`;
}
document.addEventListener('click', e => {
  const qq = e.target.closest('[data-quitar]'); if (qq) { if (qq.dataset.quitar === 'fTipo') fTipo = ''; else if (qq.dataset.quitar === 'fEst') fEst = ''; else if (qq.dataset.quitar === 'fGrupo') fGrupo = ''; else fZona = ''; render(); return; }
  const b = e.target.closest('[data-filtro]'); if (!b) return;
  const k = b.dataset.filtro, v = b.dataset.v;
  if (k === 'limpiar') { fTipo = fEst = fGrupo = fZona = fNinos = fCol = ''; }
  else if (k === 'fNinos') fNinos = fNinos ? '' : 'si';
  else if (b.classList.contains('fm') && b.classList.contains('on') && k !== 'isla') { if (k === 'fTipo') fTipo = ''; else if (k === 'fEst') fEst = ''; else if (k === 'fGrupo') fGrupo = ''; else if (k === 'fZona') fZona = ''; else if (k === 'fCol') fCol = ''; }
  else if (k === 'isla') { if (!ISLAS[v].activa) return; islaSel = v; save('esc.isla', v); }
  else if (k === 'fTipo') fTipo = v; else if (k === 'fEst') fEst = v; else if (k === 'fGrupo') fGrupo = v; else if (k === 'fZona') fZona = v; else if (k === 'fCol') fCol = v;
  render();
});
document.addEventListener('change', e => { if (e.target.id === 'orden') { orden = e.target.value; save('esc.orden', orden); render(); } });
let qT = 0;
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return; q = e.target.value; clearTimeout(qT);
  qT = setTimeout(() => { const pos = e.target.selectionStart; render(); const i = $('#q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch {} } }, 200);
});

// ---------- 🗺️ Mapa propio (sin librerías) ----------
// Teselas de OpenStreetMap con conexión (se guardan las vistas); sin conexión, la silueta de la isla y los puntos.
const MPT = 256, MPZ = [9, 16], MPZ_ICONOS = 12; // zoom mínimo y máximo; desde MPZ_ICONOS se ve el icono de cada tipo
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
// Tipos que se ven en el mapa: ninguno elegido = todos; se pueden elegir uno o varios.
const mpTipos = new Set(load('esc.mptipos', []));
const mpVe = t => !mpTipos.size || mpTipos.has(t);
// Municipios que se ven en el mapa (ninguno = todos); al elegirlos, el mapa se encuadra en sus puntos.
const mpMunis = new Set(load('esc.mpmunis', [])); let mpMunisAbierto = false;
function mpEncuadrar() {
  const el = $('#mapa'); if (!el) return; const ps = puntos(); if (!ps.length || !mpMunis.size) { mpEncajar(el.clientWidth, el.clientHeight); mpDibujar(el); return; }
  const la = ps.map(s => s.lat), lo = ps.map(s => s.lon), [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
  let z = MPZ[1]; while (z > MPZ[0] && (mpX(d, z) - mpX(c, z) > el.clientWidth - 50 || mpY(a, z) - mpY(b, z) > el.clientHeight - 50)) z--;
  MP.c = [(a + b) / 2, (c + d) / 2]; MP.z = Math.min(z, 15); mpDibujar(el);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-mpmunis]'); if (t) { mpMunisAbierto = !mpMunisAbierto; render(); if (!mpMunisAbierto) mpEncuadrar(); return; }
  const z = e.target.closest('[data-mpzona]'); if (z) { const ms = [...document.querySelectorAll(`[data-mpzona="${z.dataset.mpzona}"] ~ [data-mpmuni]`)].map(b => b.dataset.mpmuni);
    const todos = ms.every(m => mpMunis.has(m)); ms.forEach(m => todos ? mpMunis.delete(m) : mpMunis.add(m)); save('esc.mpmunis', [...mpMunis]); MP.sel = null; render(); return; }
  const m = e.target.closest('[data-mpmuni]'); if (m) { const k = m.dataset.mpmuni; if (!k) mpMunis.clear(); else if (mpMunis.has(k)) mpMunis.delete(k); else mpMunis.add(k);
    save('esc.mpmunis', [...mpMunis]); MP.sel = null; render(); if (!k) mpEncuadrar(); }
});
function viewMapa() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  const tiposHay = Object.keys(TIPOS).filter(t => SITIOS.some(s => s.tipo === t));
  if (MP.elegir) return `<div class="aviso-elegir">👆 <b>Toca en el mapa dónde está el sitio.</b> Acerca con ＋ o con dos dedos para afinar.<button class="sec mini" data-propio="cancelar-mapa">Cancelar</button></div>
    <div class="mapa elegir" id="mapa"><div class="mp-vista"><div class="mp-capa"></div></div>
      <div class="mp-bot"><button data-mpz="1" aria-label="Acercar">+</button><button data-mpz="-1" aria-label="Alejar">−</button><button data-mpyo aria-label="Dónde estoy">🎯</button></div>
      <div class="mp-zoom" aria-live="polite"></div><div class="mp-attr">© OpenStreetMap</div><div class="mp-info"></div></div>`;
  const zonasM = Object.entries(ZONAS).map(([z, Z]) => [z, Z, MUNICIPIOS.filter(m => zonaDe(SITIOS.find(s => s.municipio === m && !s.agenda && !s.aprox) || { municipio: m }) === z)]);
  const munis = `<div class="mp-munis"><button class="mp-mu-btn ${mpMunis.size ? 'act' : ''}" data-mpmunis>📍 Municipios${mpMunis.size ? ` (${mpMunis.size})` : ': todos'} ${mpMunisAbierto ? '▴' : '▾'}</button>
    ${mpMunisAbierto ? `<div class="mp-mu-panel">${zonasM.map(([z, Z, ms]) => `<div class="mp-mu-z"><button class="mp-mu-zona" data-mpzona="${z}">${Z.ic} ${esc(Z.nom)}</button>${ms.map(m => `<button class="mp-tipo ${mpMunis.has(m) ? 'on' : ''}" data-mpmuni="${esc(m)}">${esc(m)}</button>`).join('')}</div>`).join('')}
      <div class="mp-mu-pie"><button class="enlace" data-mpmuni="">✕ Todos los municipios</button><button class="mini" data-mpmunis>Ver en el mapa</button></div></div>` : ''}</div>`;
  return munis + `<div class="mp-tipos">${tiposHay.map(t => `<button class="mp-tipo ${mpTipos.has(t) ? 'on' : ''}" data-mptipo="${t}" aria-pressed="${mpTipos.has(t)}"><span>${tipoIc(t)}</span>${esc(tipoNom(t).split(' ')[0])}</button>`).join('')}${mpTipos.size ? '<button class="mp-tipo todos" data-mptipo="">✕<span class="vh"> Ver todos</span></button>' : ''}</div>
    <div class="mapa" id="mapa"><div class="mp-vista"><div class="mp-capa"></div></div>
      <div class="mp-bot"><button data-mpz="1" aria-label="Acercar">+</button><button data-mpz="-1" aria-label="Alejar">−</button><button data-mpfit aria-label="Ver toda la isla">⤢</button><button data-mpyo aria-label="Dónde estoy">🎯</button></div>
      <div class="mp-zoom" aria-live="polite"></div><div class="mp-attr">© OpenStreetMap</div><div class="mp-info"></div></div>
    <p class="leyenda">Acerca bastante el mapa (＋ o con dos dedos) para ver los iconos; toca un punto para marcarlo. Azul 🔖 quiero ir · verde ✅ visitado · apagado ✖️ no. Sin conexión se ven los puntos sobre la silueta de la isla.</p>`;
}
// Los de la agenda solo salen si se elige «Evento» (van al centro de su municipio, aproximados).
const puntos = () => SITIOS.filter(s => enIsla(s) && (!mpMunis.size || mpMunis.has(s.municipio)) && (!(s.agenda || s.aprox) || mpTipos.has('evento')) && mpVe(s.tipo) && isFinite(s.lat) && s.lat !== null && isFinite(s.lon));
// Zoom con la isla entera a la vista (con él se decide cuándo los puntitos pasan a iconos).
function zEncaje(W, H) {
  const la = ISLA.map(c => c[1]), lo = ISLA.map(c => c[0]);
  const [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
  let z = 14; while (z > MPZ[0] && (mpX(d, z) - mpX(c, z) > W - 20 || mpY(a, z) - mpY(b, z) > H - 20)) z--;
  return { z, c: [(a + b) / 2, (c + d) / 2] };
}
function mpEncajar(W, H) { const e = zEncaje(W, H); MP.c = e.c; MP.z = MP.zFit = e.z; }
function pintarMapa() {
  const el = $('#mapa'); if (!el) return;
  if (MP.z == null) mpEncajar(el.clientWidth, el.clientHeight);
  if (MP.zFit == null) MP.zFit = zEncaje(el.clientWidth, el.clientHeight).z;
  mpDibujar(el);
  if (!el._mp) { el._mp = 1; mpGestos(el); }
}
function mpDibujar(el) {
  const W = el.clientWidth, H = el.clientHeight, z = MP.z, n = 2 ** z;
  const ox = mpX(MP.c[1], z) - W / 2, oy = mpY(MP.c[0], z) - H / 2;
  const P = (lat, lon) => [mpX(lon, z) - ox, mpY(lat, z) - oy];
  let h = `<svg class="mp-isla" width="${W}" height="${H}"><path d="M${ISLA.map(([lo, la]) => P(la, lo).map(v => v.toFixed(1)).join(',')).join('L')}Z"/></svg>`;
  // Trazado del sendero elegido (o de todos los visibles de tipo sendero si solo se ven senderos y hay zoom).
  const trazar = id => { const t = TRAZOS[id]; return t ? `<polyline points="${t.map(([la, lo]) => P(la, lo).map(v => v.toFixed(1)).join(',')).join(' ')}"/>` : ''; };
  const ids = MP.sel && TRAZOS[MP.sel] ? [MP.sel] : (mpTipos.size === 1 && mpTipos.has('sendero') && z >= 12 ? puntos().filter(s => TRAZOS[s.id]).map(s => s.id) : []);
  if (ids.length) h += `<svg class="mp-traza ${MP.sel ? 'sel' : ''}" width="${W}" height="${H}">${ids.map(trazar).join('')}</svg>`;
  for (let tx = Math.floor(ox / MPT) - 1; tx <= Math.floor((ox + W) / MPT) + 1; tx++)
    for (let ty = Math.floor(oy / MPT) - 1; ty <= Math.floor((oy + H) / MPT) + 1; ty++) {
        if (ty < 0 || ty >= n) continue;
        h += `<img class="mp-t" alt="" draggable="false" src="https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png" style="left:${tx * MPT - ox}px;top:${ty * MPT - oy}px" onerror="this.remove()">`;
      }
  // Puntitos minúsculos hasta el zoom 12; desde ahí, el icono de cada tipo (más grande al acercarse).
  const peq = z < MPZ_ICONOS, S = z >= 15 ? 1 : z >= 14 ? .9 : .8;
  // Puntos que se pisan: se separan empujando cada pareja que choca, con un muelle suave hacia su sitio real
  // (como en viaje-corea). Un hilo marca dónde está de verdad el que se ha movido.
  const vis = puntos().map(s => { const [x, y] = P(s.lat, s.lon); return { s, x, y, x0: x, y0: y }; })
    .filter(o => o.x > -40 && o.y > -40 && o.x < W + 40 && o.y < H + 40), D = peq ? 0 : 30 * S;
  for (let it = 0; it < 60; it++) {
    let mov = false;
    for (let a = 0; a < vis.length; a++) for (let c = a + 1; c < vis.length; c++) {
      const A = vis[a], B = vis[c]; let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d >= D) continue; mov = true;
      if (d < 0.01) { const ang = (c * 2.39996) % (2 * Math.PI); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
      const f = (D - d) / d / 2; A.x -= dx * f; A.y -= dy * f; B.x += dx * f; B.y += dy * f;
    }
    vis.forEach(o => { o.x += (o.x0 - o.x) * 0.02; o.y += (o.y0 - o.y) * 0.02; });
    if (!mov) break;
  }
  const hilos = vis.filter(o => Math.hypot(o.x - o.x0, o.y - o.y0) > 6);
  if (hilos.length) h += `<svg class="mp-hilo" width="${W}" height="${H}">${hilos.map(o => `<line x1="${o.x0.toFixed(1)}" y1="${o.y0.toFixed(1)}" x2="${o.x.toFixed(1)}" y2="${o.y.toFixed(1)}"/>`).join('')}</svg>`;
  vis.forEach(({ s, x, y }) => {
    const e = marca(s.id).estado;
    h += `<button class="mp-pt ${peq ? 'peq' : ''} ${e ? 'e-' + e : ''} ${MP.sel === s.id ? 'sel' : ''} ${enGrupo() && otrosEn(s.id).fuimos.length ? 'g-fue' : ''}" data-mpp="${esc(s.id)}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px" aria-label="${esc(s.nombre)}">${tipoIc(s.tipo)}</button>`;
  });
  if (MP.yo) { const [x, y] = P(MP.yo[0], MP.yo[1]); h += `<span class="mp-yo" style="left:${x}px;top:${y}px"></span>`; }
  const zb = el.querySelector('.mp-zoom'); if (zb) zb.innerHTML = `🔎 Zoom <b>${z}</b> de ${MPZ[1]}${peq ? ` · iconos desde ${MPZ_ICONOS}` : ''}`;
  const capa = el.querySelector('.mp-capa'); capa.style.transform = ''; capa.style.setProperty('--mps', S); capa.innerHTML = h;
  const inf = el.querySelector('.mp-info'), s = MP.sel && sitio(MP.sel);
  inf.innerHTML = s ? mpFicha(s) : ''; inf.classList.toggle('on', !!s);
}
function mpFicha(s) {
  const m = marca(s.id);
  return `<div class="mp-f">${FOTOS[s.id] ? `<div class="mp-f-foto">${fotoImg(s.id, '', true)}</div>` : ''}<div class="row"><b>${tipoIc(s.tipo)} ${esc(s.nombre)}</b><button class="sec mini" data-mpcerrar aria-label="Cerrar">✕</button></div>
    <div class="muted">${esc(s.municipio)}${s.km ? ` · 🥾 ${String(s.km).replace('.', ',')} km · ⛰️ +${s.desnivel} m${s.circular ? ' · 🔁' : ''}` : ''}${m.estado ? ' · ' + ESTADOS[m.estado].join(' ') : ''}${m.estrellas ? ' · ' + '⭐'.repeat(m.estrellas) : ''}</div>
    ${grupoEnFicha(s.id)}
    <div class="marcas mp-marcas">${Object.entries(ESTADOS).map(([k, [ic, n]]) => `<button class="${m.estado === k ? 'on' : ''}" data-est="${k}" data-id="${esc(s.id)}">${ic} ${n}</button>`).join('')}</div>
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
    // Eligiendo la ubicación de un sitio nuevo: el toque en el mapa da las coordenadas.
    if (MP.elegir && !(t && t.closest('.mp-bot'))) { const r = el.getBoundingClientRect(), z = MP.z, ox = mpX(MP.c[1], z) - el.clientWidth / 2, oy = mpY(MP.c[0], z) - el.clientHeight / 2;
      MP.elegir([+mpLat(oy + e.clientY - r.top, z).toFixed(5), +mpLon(ox + e.clientX - r.left, z).toFixed(5)]); return; }
    MP.sel = b ? b.dataset.mpp : null; mpDibujar(el);
  };
  v.addEventListener('pointerup', fin); v.addEventListener('pointercancel', fin);
  v.addEventListener('dblclick', () => mpZoom(el, 1));
}
function mpZoom(el, dz) { MP.z = Math.min(MPZ[1], Math.max(MPZ[0], MP.z + dz)); mpDibujar(el); }
document.addEventListener('click', e => {
  const el = $('#mapa');
  const t = e.target.closest('[data-mptipo]'); if (t) { const k = t.dataset.mptipo; if (!k) mpTipos.clear(); else if (mpTipos.has(k)) mpTipos.delete(k); else mpTipos.add(k); save('esc.mptipos', [...mpTipos]); MP.sel = null; render(); return; }
  const v = e.target.closest('[data-vermapa]');
  if (v) { const s = sitio(v.dataset.vermapa); if (s) { MP.sel = s.id; MP.c = [s.lat, s.lon]; MP.z = Math.max(MP.z || 0, 15);
      const t = TRAZOS[s.id]; if (t) { const la = t.map(x => x[0]), lo = t.map(x => x[1]), W = Math.min(innerWidth - 40, 600), H = 380; let z = 16;
        while (z > 10 && (mpX(Math.max(...lo), z) - mpX(Math.min(...lo), z) > W - 60 || mpY(Math.min(...la), z) - mpY(Math.max(...la), z) > H - 60)) z--;
        MP.c = [(Math.min(...la) + Math.max(...la)) / 2, (Math.min(...lo) + Math.max(...lo)) / 2]; MP.z = z; } if (!mpVe(s.tipo) || s.agenda) { mpTipos.clear(); if (s.agenda) mpTipos.add('evento'); save('esc.mptipos', [...mpTipos]); } ir('mapa'); } return; }
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
// La pestaña la pinta nube.js (Firebase: entrada, perfil y grupo).
function viewGrupo() { return viewNube(); }

// ---------- ☰ Más ----------
// (v53) Cada utilidad en su botón (se abre debajo; una a la vez). La letra, siempre a la vista. El tema se cambia arriba (🌓).
let masSec = '';
function viewMas() {
  const secs = [
    !enGrupo() && ['pasaporte', '🛂', 'Pasaporte de municipios', () => pasaporteHTML()],
    ['favoritos', '💛', 'Mis lugares y cines', () => favoritosHTML()],
    ['festivos', '🎉', 'Festivos', () => festivosHTML()],
    ['diario', '📔', 'Mi diario', () => diarioHTML()],
    ['resumen', '🖨️', 'Resumen del año', () => resumenBotonesHTML()],
    ['fotos', '📷', 'Fotos sin conexión', () => `<div class="card"><p class="muted">Las fotos que ves se quedan en el móvil. Para tenerlas todas antes de ir a una zona sin cobertura (unos 15 MB, mejor con wifi):</p>
      <button class="sec" data-fotosdl>⬇️ Descargar todas las fotos</button></div>`],
    ['copia', '💾', 'Copia de mis marcas', () => `<div class="card"><p class="muted">Tus marcas viven en este móvil. Guarda una copia por si cambias de móvil o borras datos del navegador.</p>
      <div class="row"><button class="sec" data-exportar>⬇️ Exportar</button><button class="sec" data-importar>⬆️ Importar</button></div></div>`],
    ['instalar', '📲', 'Instalar en el móvil', () => `<div class="card"><ol class="pasos"><li><b>Android (Chrome):</b> menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».</li>
      <li><b>iPhone (Safari):</b> botón Compartir → «Añadir a pantalla de inicio».</li>
      <li>Ábrela una vez con conexión: desde entonces funciona sin ella (las calles del mapa, solo las zonas que hayas visto).</li></ol></div>`],
    ['datos', '📚', 'Sobre los datos', () => `<div class="card"><p>Cada sitio lleva su fuente. Lo marcado con <span class="ver">⚠️ VERIFICAR</span> está pendiente de comprobar (coordenadas, horarios, precios o accesos): confírmalo antes de ir.</p>
      <p class="muted">Mapa © colaboradores de OpenStreetMap.</p></div>`],
    ['borrar', '🧹', 'Borrar mis marcas', () => `<div class="card"><p class="muted">Borra todas tus marcas de este móvil (no se puede deshacer, salvo con una copia).</p><button class="danger" data-borrar>Borrar todas mis marcas de este móvil</button></div>`],
  ].filter(Boolean);
  return `<h2>🔠 Letra</h2>
    <div class="chips">${Object.entries(LETRAS).map(([k, n]) => `<button class="chip ${load('esc.letra', 'compacta') === k ? 'on' : ''}" data-setletra="${k}" style="font-size:${k === 'compacta' ? '.78rem' : k === 'normal' ? '.88rem' : '1rem'}">Aa ${n}</button>`).join('')}</div>
    <div class="mas-lista">${secs.map(([k, ic, n, f]) => `<div class="mas-item ${masSec === k ? 'on' : ''}"><button class="mas-btn" data-massec="${k}" aria-expanded="${masSec === k}"><span class="mas-ic">${ic}</span><span>${esc(n)}</span><i>${masSec === k ? '▴' : '▾'}</i></button>
      ${masSec === k ? `<div class="mas-panel">${f()}</div>` : ''}</div>`).join('')}</div>
    <p class="muted" style="text-align:center">Escapadas · Familia de A Muchis · ${VERSION}</p>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-massec]'); if (!b) return; masSec = masSec === b.dataset.massec ? '' : b.dataset.massec; render();
  if (masSec) setTimeout(() => { const x = document.querySelector('.mas-item.on'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 40); });
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-settema]'); if (t) { save(K_THEME, t.dataset.settema); applyTheme(); render(); return; }
  const lt = e.target.closest('[data-setletra]'); if (lt) { save('esc.letra', lt.dataset.setletra); applyLetra(); render(); if (tab === 'mapa') pintarMapa(); return; }
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
// Descarga todas las fotos (grande y miniatura) para que el service worker las guarde.
let fotosBajando = false;
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-fotosdl]'); if (!b || fotosBajando) return;
  if (!navigator.onLine) return alert('Sin conexión: prueba con wifi.');
  fotosBajando = true; const ids = Object.keys(FOTOS); let n = 0, ok = 0;
  for (const id of ids) {
    for (const src of new Set([fotoSrc(id), fotoSrc(id, true)])) { try { await fetch(src, { mode: 'no-cors' }); ok++; } catch {} }
    n++; const bb = document.querySelector('[data-fotosdl]'); if (bb) bb.textContent = `⬇️ Descargando… ${n} de ${ids.length}`;
  }
  fotosBajando = false; const bb = document.querySelector('[data-fotosdl]'); if (bb) bb.textContent = `✅ Fotos guardadas (${n})`;
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
iniciarNube();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) {
  // Si llega una versión nueva, recarga una vez para usarla (sin perder datos).
  const habiaSW = !!navigator.serviceWorker.controller; let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (habiaSW && !recargado) { recargado = true; location.reload(); } });
  navigator.serviceWorker.register('./sw.js').then(r => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); });
  }).catch(() => {});
}
