'use strict';
// 👥 Sitios del grupo: los que añadís vosotros (guachinches, restaurantes, rincones…), para todos los del grupo.
// grupos/{gid}/sitios/{id}: { nombre, tipo, municipio, lat, lon, desc, url, autor, creado, actualizado }.
// En la app son sitios como los del catálogo, con id «g-<id>», sin foto y con «👥 Añadido por …» como fuente.
// Solo quien lo añadió lo edita o lo borra. Se carga antes que app.js: nada de SITIOS/load al cargar.

let BASE = [];        // catálogo de data/sitios.json (lo rellena app.js)
let propioForm = null; // formulario abierto: { _id?, nombre, tipo, municipio, lat, lon, desc, url }

function mezclarSitios() {
  const propios = (NUBE.propios || []).map(d => ({
    id: 'g-' + d._id, _id: d._id, propio: true, autor: d.autor, nombre: d.nombre, tipo: d.tipo, municipio: d.municipio,
    lat: d.lat, lon: d.lon, desc: d.desc || '', url: d.url || '', fuente: 'Añadido por ' + perfilDe(d.autor).nombre,
    ...(d.tipo === 'evento' && d.desde ? { desde: d.desde, hasta: d.hasta || d.desde, cuando: { tipo: 'fechas', lista: [[d.desde, d.hasta || d.desde]] } } : {})
  }));
  SITIOS = [...BASE, ...(typeof AGENDA_SITIOS !== 'undefined' ? AGENDA_SITIOS : []), ...propios];
}
const colPropios = () => NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('sitios');
function seguirPropios(gid) {
  if (NUBE.offPropios) NUBE.offPropios();
  NUBE.offPropios = NUBE.db.collection('grupos').doc(gid).collection('sitios').onSnapshot(q => {
    NUBE.propios = q.docs.map(d => ({ _id: d.id, ...d.data() })).filter(d => d.nombre && isFinite(d.lat) && isFinite(d.lon));
    mezclarSitios(); refrescarVista();
  }, () => {});
}
function dejarPropios() { if (NUBE.offPropios) { NUBE.offPropios(); NUBE.offPropios = null; } NUBE.propios = []; if (BASE.length) mezclarSitios(); }

// ---------- ubicación ----------
// Coordenadas de un enlace de Google Maps (…/@28.41,-16.54,17z · ?q=28.41,-16.54 · !3d28.41!4d-16.54) o «28.41, -16.54».
function coordsDeTexto(t) {
  t = decodeURIComponent(String(t || ''));
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /[?&](?:q|ll|query|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
  for (const p of pats) { const m = t.match(p); if (m) { const la = +m[1], lo = +m[2]; if (la > 27 && la < 30 && lo > -19 && lo < -13) return [+la.toFixed(5), +lo.toFixed(5)]; } }
  return null;
}
// Municipio probable: el del sitio del catálogo más cercano.
function muniCercano(la, lo) {
  let mejor = null, d = 1e9;
  for (const s of BASE) { const k = kmEntre([la, lo], [s.lat, s.lon]); if (k < d) { d = k; mejor = s; } }
  return mejor ? mejor.municipio : MUNICIPIOS[0];
}
function ponerUbicacion(c, cambiarMuni = true) {
  propioForm.lat = c[0]; propioForm.lon = c[1];
  if (cambiarMuni || !propioForm.municipio) propioForm.municipio = muniCercano(c[0], c[1]);
}

// ---------- formulario ----------
function propioFormHTML() {
  const f = propioForm, hay = isFinite(f.lat) && f.lat !== null;
  return `<div class="card propio-form" id="propio-form">
    <h3>${f._id ? '✏️ Editar sitio' : '➕ Añadir un sitio al grupo'}</h3>
    <input id="pf-n" maxlength="80" placeholder="Nombre (p. ej. Guachinche El Lagar)" value="${esc(f.nombre || '')}">
    <div class="row">
      <label class="orden-sel"><span class="vh">Tipo</span><select id="pf-t">${Object.entries(TIPOS).map(([k, [ic, n]]) => `<option value="${k}" ${f.tipo === k ? 'selected' : ''}>${ic} ${n}</option>`).join('')}</select></label>
      <label class="orden-sel"><span class="vh">Municipio</span><select id="pf-m">${MUNICIPIOS.map(m => `<option ${f.municipio === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
    </div>
    <div class="pf-ubi ${hay ? 'ok' : ''}">${hay ? `📍 ${f.lat.toFixed(4)}, ${f.lon.toFixed(4)} · <a href="https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}" target="_blank" rel="noopener">comprobar</a>` : '📍 Falta la ubicación'}</div>
    <div class="acciones"><button class="sec mini" data-propio="gps">📍 Estoy aquí</button><button class="sec mini" data-propio="mapa">🗺️ Tocar en el mapa</button></div>
    <input id="pf-l" placeholder="…o pega un enlace de Google Maps" autocomplete="off">
    ${f.tipo === 'evento' ? `<div class="row"><div style="flex:1"><label class="muted" for="pf-desde">Desde</label><input type="date" id="pf-desde" value="${esc(f.desde || '')}"></div><div style="flex:1"><label class="muted" for="pf-hasta">Hasta</label><input type="date" id="pf-hasta" value="${esc(f.hasta || '')}"></div></div>` : ''}
    <textarea id="pf-d" maxlength="600" placeholder="¿Qué tiene de bueno? (lo que pedir, cuándo abre…)">${esc(f.desc || '')}</textarea>
    <input id="pf-u" maxlength="300" placeholder="Web o enlace (opcional)" value="${esc(f.url || '')}">
    <div class="row"><button data-propio="guardar">💾 Guardar</button><button class="sec" data-propio="cerrar">Cancelar</button></div>
  </div>`;
}
// En Sitios, arriba: el botón o el formulario.
function propioBotonHTML(tipo) {
  if (!enGrupo()) return '';
  if (propioForm) return (propioForm.tipo === 'evento') === (tipo === 'evento') ? propioFormHTML() : '';
  return tipo === 'evento' ? `<button class="sec anadir-propio" data-propio="nuevo" data-tipo="evento">➕ Añadir un evento que conozcáis</button>`
    : `<button class="sec anadir-propio" data-propio="nuevo">➕ Añadir un sitio (guachinche, restaurante, rincón…)</button>`;
}
// Lo escrito en el formulario se guarda en propioForm para no perderlo al repintar.
function leerForm() {
  if (!propioForm) return; const v = id => (document.getElementById(id) || {}).value;
  if (v('pf-n') !== undefined) { propioForm.nombre = v('pf-n'); propioForm.tipo = v('pf-t'); propioForm.municipio = v('pf-m'); propioForm.desc = v('pf-d'); propioForm.url = v('pf-u'); }
  if (v('pf-desde') !== undefined) { propioForm.desde = v('pf-desde'); propioForm.hasta = v('pf-hasta'); }
}
async function guardarPropio() {
  leerForm(); const f = propioForm, nombre = String(f.nombre || '').trim();
  if (!nombre) return alert('Ponle un nombre.');
  if (!isFinite(f.lat) || f.lat === null) return alert('Falta la ubicación: «Estoy aquí», tocar en el mapa o pegar un enlace de Google Maps.');
  if (f.tipo === 'evento' && !/^\d{4}-\d\d-\d\d$/.test(f.desde || '')) return alert('¿Cuándo es? Pon la fecha del evento.');
  const d = { nombre: nombre.slice(0, 80), tipo: TIPOS[f.tipo] ? f.tipo : 'curioso', municipio: MUNICIPIOS.includes(f.municipio) ? f.municipio : muniCercano(f.lat, f.lon),
    lat: f.lat, lon: f.lon, desc: String(f.desc || '').trim().slice(0, 600), url: String(f.url || '').trim().slice(0, 300), autor: NUBE.user.uid,
    ...(f.tipo === 'evento' ? { desde: f.desde, hasta: f.hasta && f.hasta >= f.desde ? f.hasta : f.desde } : {}),
    actualizado: firebase.firestore.FieldValue.serverTimestamp() };
  const id = f._id; propioForm = null;
  try {
    if (id) await colPropios().doc(id).set({ ...d, creado: (NUBE.propios.find(x => x._id === id) || {}).creado || d.actualizado });
    else { const ref = await colPropios().add({ ...d, creado: d.actualizado }); irFicha = 'g-' + ref.id; abiertas.add(irFicha); muniAbiertos.add(d.municipio); }
  } catch (e) { alert('No se pudo guardar (' + (e.code || e.message) + ').'); }
  render();
}
function borrarPropio(s) {
  if (!confirm(`¿Borrar «${s.nombre}» para todo el grupo?`)) return;
  colPropios().doc(s._id).delete().catch(e => alert('No se pudo borrar (' + (e.code || e.message) + ').'));
}
// En la ficha de un sitio propio: editar y borrar (solo quien lo añadió).
function accionesPropio(s) {
  if (!s.propio || !enGrupo() || s.autor !== NUBE.user.uid) return '';
  return `<button class="sec mini" data-propio="editar" data-id="${esc(s.id)}">✏️ Editar</button><button class="danger mini" data-propio="borrar" data-id="${esc(s.id)}">🗑️ Borrar</button>`;
}

document.addEventListener('change', e => { if (e.target.id === 'pf-t' && propioForm) { leerForm(); render(); } });
document.addEventListener('input', e => {
  if (e.target.id === 'pf-l' && propioForm) {
    const c = coordsDeTexto(e.target.value);
    if (c) { leerForm(); ponerUbicacion(c); render(); }
    else if (/goo\.gl|maps\.app/.test(e.target.value)) { const u = document.querySelector('.pf-ubi'); if (u) u.textContent = '📍 Los enlaces cortos no traen coordenadas: abre el enlace, cópialo de la barra de direcciones (largo) o usa «Tocar en el mapa».'; }
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-propio]'); if (!b) return;
  const a = b.dataset.propio;
  if (a === 'nuevo') { propioForm = { tipo: b.dataset.tipo || 'guachinche', municipio: '', lat: null, lon: null }; render(); const n = document.getElementById('pf-n'); if (n) n.focus(); }
  else if (a === 'cerrar') { propioForm = null; render(); }
  else if (a === 'guardar') guardarPropio();
  else if (a === 'gps') {
    leerForm(); if (!navigator.geolocation) return alert('Este móvil no da la ubicación.');
    navigator.geolocation.getCurrentPosition(p => { ponerUbicacion([+p.coords.latitude.toFixed(5), +p.coords.longitude.toFixed(5)]); render(); },
      () => alert('No se pudo saber dónde estás (activa la ubicación).'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  else if (a === 'mapa') {
    leerForm();
    const volver = tab; MP.elegir = c => { MP.elegir = null; ponerUbicacion(c); ir(volver); setTimeout(() => { const f = document.getElementById('propio-form'); if (f) f.scrollIntoView({ block: 'center' }); }, 50); };
    if (isFinite(propioForm.lat) && propioForm.lat !== null) { MP.c = [propioForm.lat, propioForm.lon]; MP.z = 16; }
    MP.sel = null; ir('mapa');
  }
  else if (a === 'cancelar-mapa') { MP.elegir = null; ir(propioForm && propioForm.tipo === 'evento' ? 'eventos' : 'sitios'); }
  else if (a === 'editar') { const s = sitio(b.dataset.id); if (s) { propioForm = { _id: s._id, nombre: s.nombre, tipo: s.tipo, municipio: s.municipio, lat: s.lat, lon: s.lon, desc: s.desc, url: s.url, desde: s.desde, hasta: s.hasta }; render(); window.scrollTo(0, 0); } }
  else if (a === 'borrar') { const s = sitio(b.dataset.id); if (s) borrarPropio(s); }
});
