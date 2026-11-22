'use strict';
// ☁️ Firebase: entrada con Google, perfil (nombre, emoji y color) y grupo con código de invitación.
// Solo se carga si firebase-config.js trae la configuración. Las marcas compartidas llegan en S4.

const FB_DIR = 'vendor/firebase-10.14.1/';
const K_GRUPO = 'esc.grupo';
const EMOJIS = ['😀', '😎', '🤠', '🥳', '🤓', '😺', '🐶', '🦊', '🐼', '🐢', '🦜', '🐬', '🌋', '🌴', '🌻', '⛰️'];
const COLORES = ['#0b6e4f', '#1f5fbf', '#c0392b', '#d97706', '#7c3aed', '#db2777', '#0f766e', '#475569'];
const NUBE = { estado: 'apagada', user: null, perfil: null, editarPerfil: false, grupo: null, miembros: {}, msg: '', ocupado: false,
  marcasGrupo: {}, recientes: [], sincronizado: false, planes: [] };
const nubeConfigurada = () => !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);

function cargarScript(src) {
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
}
const repintarNube = () => { pintarYo(); if (typeof tab !== 'undefined' && tab === 'grupo') render(); };
// Arriba, junto a la versión: el emoji y el nombre de quien usa la app (toca → 👥 Grupo).
function pintarYo() {
  const b = document.getElementById('yo'); if (!b) return;
  const p = NUBE.user && NUBE.perfil && !NUBE.editarPerfil ? NUBE.perfil : null;
  b.hidden = !p; if (!p) return;
  b.innerHTML = `<span>${esc(p.emoji || '👤')}</span><span class="yo-n">${esc(p.nombre || '')}</span>`;
  b.title = 'Estás usando la app como ' + (p.nombre || '') + (NUBE.grupo ? ' · ' + NUBE.grupo.nombre : '');
  b.style.setProperty('--cc', p.color || '#475569');
}
function avisoNube(m) { NUBE.msg = m; repintarNube(); }

async function iniciarNube() {
  if (!nubeConfigurada()) return;
  NUBE.estado = 'cargando';
  try { for (const f of ['app', 'auth', 'firestore']) await cargarScript(`${FB_DIR}firebase-${f}-compat.js`); }
  catch { NUBE.estado = 'error'; NUBE.msg = 'No se pudo cargar Firebase. Prueba a recargar con conexión.'; return repintarNube(); }
  firebase.initializeApp(window.FIREBASE_CONFIG);
  NUBE.auth = firebase.auth(); NUBE.db = firebase.firestore();
  // Copia en el móvil: lo leído se ve sin conexión y lo escrito sin red se envía al volver.
  try { await NUBE.db.enablePersistence({ synchronizeTabs: true }); } catch {}
  NUBE.estado = 'lista';
  NUBE.auth.onAuthStateChanged(async u => {
    NUBE.user = u; NUBE.perfil = null; NUBE.grupo = null; NUBE.miembros = {};
    if (NUBE.offGrupo) { NUBE.offGrupo(); NUBE.offGrupo = null; }
    dejarMarcas();
    if (u) { await cargarPerfil(); await buscarGrupo(); }
    repintarNube();
  });
}

// ---------- entrar y salir ----------
async function entrarGoogle() {
  NUBE.msg = '';
  try { await NUBE.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
  catch (e) {
    const c = e && e.code || '';
    avisoNube(c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request' ? ''
      : c === 'auth/popup-blocked' ? 'El móvil ha bloqueado la ventana de Google. Permite ventanas emergentes y vuelve a probar.'
      : c === 'auth/unauthorized-domain' ? 'Falta añadir paniaguadediego-bit.github.io en Firebase → Authentication → Configuración → Dominios autorizados.'
      : c === 'auth/configuration-not-found' || c === 'auth/operation-not-allowed' ? 'Falta activar la entrada con Google en Firebase → Authentication → Método de acceso.'
      : c === 'auth/network-request-failed' ? 'Sin conexión. Para entrar hace falta internet (solo la primera vez).'
      : 'No se pudo entrar: ' + (e && e.message || c));
  }
}
async function salirCuenta() {
  if (!confirm('¿Cerrar sesión en este móvil? Tus marcas del móvil se quedan.')) return;
  try { localStorage.removeItem(K_GRUPO); } catch {}
  await NUBE.auth.signOut();
}

// ---------- perfil ----------
// Firestore puede quedarse esperando sin responder (p. ej., si la base de datos aún no existe): se corta a los X ms.
const conLimite = (pr, ms) => Promise.race([pr, new Promise((_, ko) => setTimeout(() => ko(new Error('tiempo')), ms))]);
async function cargarPerfil() {
  const u = NUBE.user;
  try {
    const d = await conLimite(NUBE.db.collection('perfiles').doc(u.uid).get(), 10000);
    if (d.exists) { NUBE.perfil = d.data(); NUBE.editarPerfil = false; return; }
  } catch (e) {
    NUBE.msg = e && e.message === 'tiempo' && !navigator.onLine ? 'Sin conexión: tu perfil se guardará al volver.'
      : 'No se pudo leer la base de datos (' + ((e && (e.code || e.message)) || '?') + '). ¿Está creada Firestore y publicadas las reglas?';
  }
  NUBE.perfil = { nombre: (u.displayName || '').split(' ')[0].slice(0, 40), emoji: EMOJIS[0], color: COLORES[0] };
  NUBE.editarPerfil = true; // primera vez: que elija nombre y emoji
}
async function guardarPerfil(nombre, emoji, color) {
  nombre = String(nombre || '').trim().slice(0, 40);
  if (!nombre) return avisoNube('Escribe un nombre.');
  const p = { nombre, emoji, color, actualizado: firebase.firestore.FieldValue.serverTimestamp() };
  NUBE.perfil = { nombre, emoji, color }; NUBE.editarPerfil = false; NUBE.msg = '';
  if (NUBE.grupo) NUBE.miembros[NUBE.user.uid] = NUBE.perfil;
  repintarNube();
  try { await NUBE.db.collection('perfiles').doc(NUBE.user.uid).set(p); }
  catch (e) { avisoNube('No se pudo guardar el perfil: ' + (e.code || e.message)); }
}

// ---------- grupo ----------
// El id del grupo es su código de invitación: 8 caracteres sin letras que se confundan (O/0, I/1).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function nuevoCodigo() {
  const r = new Uint8Array(8); crypto.getRandomValues(r);
  return [...r].map(n => ALFABETO[n % 32]).join('');
}
const codigoBonito = c => c ? c.slice(0, 4) + '-' + c.slice(4) : '';
const limpiarCodigo = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function buscarGrupo() {
  try {
    const q = await NUBE.db.collection('grupos').where('miembros', 'array-contains', NUBE.user.uid).get();
    const ids = q.docs.map(d => d.id);
    let gid = null; try { gid = localStorage.getItem(K_GRUPO); } catch {}
    if (!ids.includes(gid)) gid = ids[0] || null;
    if (gid) seguirGrupo(gid);
  } catch (e) { NUBE.msg = 'No se pudieron leer tus grupos (' + (e.code || e.message) + ').'; }
}
// Escucha el grupo al momento: si entra alguien, aparece sin recargar.
function seguirGrupo(gid) {
  try { localStorage.setItem(K_GRUPO, gid); } catch {}
  if (NUBE.offGrupo) NUBE.offGrupo();
  NUBE.offGrupo = NUBE.db.collection('grupos').doc(gid).onSnapshot(async d => {
    if (!d.exists || !(d.data().miembros || []).includes(NUBE.user.uid)) { NUBE.grupo = null; return repintarNube(); }
    const nuevo = !NUBE.grupo || NUBE.grupo.id !== d.id;
    NUBE.grupo = { id: d.id, ...d.data() };
    if (nuevo) { seguirMarcas(d.id); seguirPlanes(d.id); seguirDisponibilidad(d.id); seguirPropios(d.id); if (typeof seguirComentarios === 'function') seguirComentarios(d.id); }
    await cargarMiembros(); repintarNube(); refrescarVista();
  }, () => { NUBE.grupo = null; dejarMarcas(); repintarNube(); });
}
async function cargarMiembros() {
  const ids = NUBE.grupo.miembros || [];
  await Promise.all(ids.filter(id => !NUBE.miembros[id]).map(async id => {
    try { const p = await NUBE.db.collection('perfiles').doc(id).get(); NUBE.miembros[id] = p.exists ? p.data() : { nombre: 'Sin nombre', emoji: '👤' }; }
    catch { NUBE.miembros[id] = { nombre: '…', emoji: '👤' }; }
  }));
}
async function crearGrupo(nombre) {
  nombre = String(nombre || '').trim().slice(0, 60) || 'Familia de A Muchis';
  const gid = nuevoCodigo();
  NUBE.ocupado = true; repintarNube();
  try {
    await NUBE.db.collection('grupos').doc(gid).set({ nombre, codigoInvitacion: gid, miembros: [NUBE.user.uid], creadoPor: NUBE.user.uid, creado: firebase.firestore.FieldValue.serverTimestamp() });
    NUBE.msg = ''; seguirGrupo(gid);
  } catch (e) { NUBE.msg = 'No se pudo crear el grupo (' + (e.code || e.message) + '). ¿Están publicadas las reglas?'; }
  NUBE.ocupado = false; repintarNube();
}
async function unirseGrupo(texto) {
  const gid = limpiarCodigo(texto);
  if (gid.length !== 8) return avisoNube('El código tiene 8 letras y números (por ejemplo ABCD-2345).');
  NUBE.ocupado = true; repintarNube();
  try {
    await NUBE.db.collection('grupos').doc(gid).update({ miembros: firebase.firestore.FieldValue.arrayUnion(NUBE.user.uid) });
    NUBE.msg = ''; seguirGrupo(gid);
  } catch (e) { NUBE.msg = e.code === 'unavailable' ? 'Sin conexión: prueba cuando tengas internet.' : 'Ese código no existe. Revísalo con quien te lo pasó.'; }
  NUBE.ocupado = false; repintarNube();
}
async function salirGrupo() {
  if (!NUBE.grupo || !confirm(`¿Salir del grupo «${NUBE.grupo.nombre}»? Podrás volver con el código.`)) return;
  const gid = NUBE.grupo.id;
  try { await NUBE.db.collection('grupos').doc(gid).update({ miembros: firebase.firestore.FieldValue.arrayRemove(NUBE.user.uid) }); } catch {}
  if (NUBE.offGrupo) { NUBE.offGrupo(); NUBE.offGrupo = null; }
  dejarMarcas(); NUBE.grupo = null; NUBE.miembros = {}; try { localStorage.removeItem(K_GRUPO); } catch {}
  refrescarVista();
  repintarNube();
}
async function compartirCodigo() {
  const g = NUBE.grupo; if (!g) return;
  const txt = `Únete a «${g.nombre}» en Escapadas: abre ${location.origin}${location.pathname.replace(/[^/]*$/, '')} → 👥 Grupo → «Unirme con código» y escribe ${codigoBonito(g.id)}`;
  try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(txt); alert('Copiado. Pégalo en WhatsApp.'); } catch { prompt('Copia este mensaje:', txt); }
}

// ---------- marcas compartidas (S4) ----------
// Cada marca es grupos/{gid}/marcas/{uid}_{sitioId}. Las tuyas viven primero en el móvil (marcas, en app.js) y se
// suben al grupo; sin red, Firestore las guarda y las envía al volver. Las de todos llegan al momento (onSnapshot).
// Al quitar una marca se sube vacía (no se borra el documento) para que otro móvil tuyo sin red no la «resucite».
const K_BORRADAS = 'esc.borradas'; // { sitioId: cuándo la quitaste } (solo hace falta hasta subirla)
const vacia = m => !m || (!m.estado && !m.estrellas && !m.nota && !m.ninos);
const enGrupo = () => !!(NUBE.user && NUBE.grupo && NUBE.db);
const refMarca = id => NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('marcas').doc(NUBE.user.uid + '_' + id);
function datosMarca(id) {
  const m = marcas[id], b = load(K_BORRADAS, {});
  return { uid: NUBE.user.uid, sitioId: id, estado: (m && m.estado) || '', estrellas: (m && m.estrellas) | 0,
    nota: (m && m.nota) || '', ninos: !!(m && m.ninos), fecha: (m && m.fecha) || '', actualizado: (m && m.actualizado) || b[id] || Date.now() };
}
// La llama app.js cada vez que cambias una marca.
function subirMarca(id) {
  if (!marcas[id]) { const b = load(K_BORRADAS, {}); b[id] = Date.now(); save(K_BORRADAS, b); }
  if (!enGrupo()) return; // ya se subirá al sincronizar con el grupo
  refMarca(id).set(datosMarca(id)).catch(() => {});
}
function seguirMarcas(gid) {
  dejarMarcas();
  NUBE.offMarcas = NUBE.db.collection('grupos').doc(gid).collection('marcas').onSnapshot(q => {
    const porSitio = {}, mias = {}, todas = [];
    q.forEach(d => {
      const m = d.data(); if (!m || !m.uid || !m.sitioId) return;
      if (m.uid === NUBE.user.uid) mias[m.sitioId] = m;
      if (vacia(m)) return;
      (porSitio[m.sitioId] = porSitio[m.sitioId] || {})[m.uid] = m; todas.push(m);
    });
    NUBE.marcasGrupo = porSitio;
    NUBE.recientes = todas.sort((a, b) => (b.actualizado || 0) - (a.actualizado || 0)).slice(0, 12);
    sincronizarMias(mias);
    refrescarVista();
  }, () => {});
}
function dejarMarcas() {
  if (NUBE.offMarcas) { NUBE.offMarcas(); NUBE.offMarcas = null; }
  if (NUBE.offPlanes) { NUBE.offPlanes(); NUBE.offPlanes = null; }
  if (NUBE.offDispo) { NUBE.offDispo(); NUBE.offDispo = null; }
  dejarPropios();
  NUBE.dispo = {}; NUBE.coment = {};
  NUBE.planes = [];
  NUBE.marcasGrupo = {}; NUBE.recientes = []; NUBE.sincronizado = false;
}
// Junta lo del móvil con lo de la nube: gana lo más reciente de cada sitio.
function sincronizarMias(mias) {
  const b = load(K_BORRADAS, {}); let cambia = false;
  for (const [id, r] of Object.entries(mias)) {
    const l = marcas[id], tl = Math.max((l && l.actualizado) || 0, b[id] || 0);
    if ((r.actualizado || 0) > tl) { // la nube es más nueva (otro móvil tuyo)
      if (vacia(r)) delete marcas[id];
      else { const m = { actualizado: r.actualizado }; if (r.estado) m.estado = r.estado; if (r.estrellas) m.estrellas = r.estrellas; if (r.nota) m.nota = r.nota; if (r.ninos) m.ninos = true; if (r.fecha) m.fecha = r.fecha; marcas[id] = m; }
      delete b[id]; cambia = true;
    }
  }
  if (cambia) save(K_MARCAS, marcas);
  if (!NUBE.sincronizado) { // la primera vez: subir lo que el móvil tenga más nuevo
    NUBE.sincronizado = true;
    const ids = new Set([...Object.keys(marcas), ...Object.keys(b)]);
    for (const id of ids) {
      const r = mias[id], tl = Math.max((marcas[id] && marcas[id].actualizado) || 0, b[id] || 0);
      if (!r ? !!marcas[id] : tl > (r.actualizado || 0)) refMarca(id).set(datosMarca(id)).catch(() => {});
    }
    save(K_BORRADAS, {});
  }
}
// Repinta sin molestar: si estás escribiendo una nota, espera a que termines.
let refrescoT = 0;
function refrescarVista() {
  clearTimeout(refrescoT);
  refrescoT = setTimeout(() => {
    const a = document.activeElement;
    if (a && /^(TEXTAREA|INPUT)$/.test(a.tagName) && a.closest('#view')) { a.addEventListener('blur', refrescarVista, { once: true }); return; }
    if (typeof tab !== 'undefined' && tab === 'mapa') pintarMapa(); else render();
    pintarYo();
  }, 150);
}

// Lo de los demás (sin ti) en un sitio: { fuimos: [[uid, m]], quiero: [...] }
function otrosEn(id) {
  const r = { fuimos: [], quiero: [], no: [] }, ms = NUBE.marcasGrupo[id] || {};
  for (const [uid, m] of Object.entries(ms)) if (uid !== (NUBE.user && NUBE.user.uid) && r[m.estado]) r[m.estado].push([uid, m]);
  return r;
}
const nadieFue = id => !Object.values(NUBE.marcasGrupo[id] || {}).some(m => m.estado === 'fuimos');
const perfilDe = uid => NUBE.miembros[uid] || { nombre: '…', emoji: '👤' };
// En la ficha abierta: quién fue (con sus ⭐) y quién quiere ir.
function grupoEnFicha(id) {
  if (!enGrupo()) return '';
  const o = otrosEn(id), linea = (ic, txt, l) => l.length ? `<div class="gl"><span class="gl-t">${ic} ${txt}</span>${l.map(([u, m]) =>
    `<span class="gm" title="${esc(perfilDe(u).nombre)}">${carita(perfilDe(u))}<span>${esc(perfilDe(u).nombre)}${m.estrellas ? ` <small>${'⭐'.repeat(m.estrellas)}</small>` : ''}</span></span>`).join('')}</div>` : '';
  const notas = [...o.fuimos, ...o.quiero].filter(([, m]) => m.nota).map(([u, m]) => `<div class="gnota">${esc(perfilDe(u).emoji)} «${esc(m.nota)}»</div>`).join('');
  const h = linea('✅', 'Visitado por', o.fuimos) + linea('🔖', 'Quieren ir', o.quiero) + notas;
  return h ? `<div class="grupo-ficha">${h}</div>` : `<div class="grupo-ficha muted">👥 Nadie más del grupo lo ha marcado.</div>`;
}
// En la ficha cerrada y en el mapa: las caritas de quien fue (hasta 3).
function caritasMini(id) {
  if (!enGrupo()) return '';
  const f = otrosEn(id).fuimos; if (!f.length) return '';
  return `<span class="cmini" title="Visitado por: ${esc(f.map(([u]) => perfilDe(u).nombre).join(', '))}">${f.slice(0, 3).map(([u]) => esc(perfilDe(u).emoji)).join('')}${f.length > 3 ? `<small>+${f.length - 3}</small>` : ''}</span>`;
}
// Pestaña Grupo: quién lleva más, últimas marcas y lo que nadie ha hecho.
function resumenGrupoHTML() {
  const g = NUBE.grupo, cuenta = {};
  (g.miembros || []).forEach(u => { cuenta[u] = { fuimos: 0, quiero: 0 }; });
  for (const ms of Object.values(NUBE.marcasGrupo)) for (const [u, m] of Object.entries(ms)) if (cuenta[u] && cuenta[u][m.estado] != null) cuenta[u][m.estado]++;
  const rank = Object.entries(cuenta).sort((a, b) => b[1].fuimos - a[1].fuimos || b[1].quiero - a[1].quiero);
  const total = typeof SITIOS !== 'undefined' ? SITIOS.length : 0, nadie = total ? SITIOS.filter(x => nadieFue(x.id)).length : 0;
  const fechaCorta = t => t ? new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
  return `${avisoPlanesHTML()}
    <h2>🏆 Quién lleva más</h2><div class="card">${rank.map(([u, c], i) => `<div class="row miembro">${carita(perfilDe(u))}<span style="flex:1">${esc(perfilDe(u).nombre)}${u === NUBE.user.uid ? ' <span class="muted">(tú)</span>' : ''}</span><span class="cifra">✅ ${c.fuimos}</span><span class="cifra muted">🔖 ${c.quiero}</span>${i === 0 && c.fuimos ? '<span>🥇</span>' : ''}</div>`).join('')}</div>
    <h2>🕒 Últimas marcas</h2>${NUBE.recientes.length ? `<div class="card">${NUBE.recientes.map(m => { const s = typeof sitio === 'function' && sitio(m.sitioId); return s ? `<button class="reciente" data-irficha="${esc(s.id)}">${carita(perfilDe(m.uid))}<span><b>${esc(perfilDe(m.uid).nombre)}</b> ${m.estado ? ESTADOS[m.estado][0] : '⭐'} ${esc(s.nombre)}<small class="muted"> · ${fechaCorta(m.actualizado)}</small></span></button>` : ''; }).join('')}</div>` : '<div class="card muted">Todavía nadie ha marcado nada.</div>'}
    <h2>🌱 Nadie ha ido todavía</h2><div class="card"><p><b>${nadie}</b> de ${total} sitios sin estrenar por nadie del grupo.</p><button class="sec" data-nadie>Ver cuáles</button></div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-nadie]')) { fTipo = fEst = fZona = ''; q = ''; fGrupo = 'nadie'; ir('sitios'); } });

// ---------- pestaña 👥 Grupo ----------
const carita = (p, uid) => `<span class="carita" style="--cc:${esc((p && p.color) || '#475569')}" title="${esc((p && p.nombre) || '')}">${esc((p && p.emoji) || '👤')}</span>`;
const VENTAJAS_GRUPO = `<ul class="ventajas"><li>✅ Ver quién ha visitado cada sitio y quién quiere ir 🔖</li><li>📅 Proponer planes y apuntarte con un toque</li>
  <li>👍 Decir qué días puedes (findes, festivos y vísperas)</li><li>➕ Añadir guachinches, restaurantes y eventos que conozcáis</li></ul>`;
function viewNube() {
  const aviso = NUBE.msg ? `<div class="aviso">${esc(NUBE.msg)}</div>` : '';
  if (!nubeConfigurada()) return `<div class="vacio"><div class="grande">👥</div><p class="big">El grupo aún no está conectado</p>
    <p class="muted">Falta enlazar la app con Firebase (la nube de Google donde se compartirán las marcas). Mientras tanto, tus marcas se guardan solo en este móvil.</p></div>`;
  if (NUBE.estado === 'error') return aviso;
  if (NUBE.estado !== 'lista') return '<div class="vacio"><div class="grande">⏳</div>Conectando…</div>';
  if (!NUBE.user) return `<div class="vacio"><div class="grande">👥</div><p class="big">Escapadas en grupo</p>
    <p class="muted">Entra con tu cuenta de Google (una vez en cada móvil) para unirte a la Familia de A Muchis.</p></div>
    <div class="card"><b>Qué ganas al entrar</b>${VENTAJAS_GRUPO}</div>
    ${aviso}<button data-nube="entrar">Entrar con Google</button>
    <p class="muted">Solo se guarda tu nombre y el emoji que elijas; tu correo no se enseña a nadie.</p>`;
  if (!NUBE.perfil) return '<div class="vacio"><div class="grande">⏳</div>Cargando tu perfil…</div>' + aviso;
  const p = NUBE.perfil;
  if (NUBE.editarPerfil) return `<h2>🙂 Tu perfil</h2>${aviso}
    <div class="card"><label class="muted" for="pf-nombre">Nombre que verá el grupo</label>
      <input id="pf-nombre" maxlength="40" value="${esc(p.nombre || '')}" autocomplete="nickname">
      <p class="muted">Tu emoji</p><div class="elige">${EMOJIS.map(e => `<button class="${p.emoji === e ? 'on' : ''}" data-pfemoji="${e}">${e}</button>`).join('')}</div>
      <p class="muted">Tu color</p><div class="elige">${COLORES.map(c => `<button class="color ${p.color === c ? 'on' : ''}" data-pfcolor="${c}" style="background:${c}" aria-label="Color"></button>`).join('')}</div>
      <button data-nube="perfil">Guardar</button></div>`;
  const yo = `<div class="card row yo">${carita(p)}<div style="flex:1"><b>${esc(p.nombre)}</b><div class="muted">${esc(NUBE.user.email || '')}</div></div><button class="sec mini" data-nube="editar">✏️</button></div>`;
  if (!NUBE.grupo) return `${yo}${aviso}
    <h2>👥 Grupo</h2>
    <div class="card"><b>Qué ganas en un grupo</b>${VENTAJAS_GRUPO}</div>
    <div class="card"><p>¿Alguien te ha pasado un código? Escríbelo aquí:</p>
      <input id="codigo" placeholder="ABCD-2345" autocapitalize="characters" autocomplete="off" maxlength="12">
      <button data-nube="unirse" ${NUBE.ocupado ? 'disabled' : ''}>Unirme con código</button></div>
    <div class="card"><p>¿Eres el primero? Crea el grupo y pasa el código a los demás.</p>
      <input id="nombre-grupo" value="Familia de A Muchis" maxlength="60">
      <button class="sec" data-nube="crear" ${NUBE.ocupado ? 'disabled' : ''}>Crear grupo</button></div>`;
  const g = NUBE.grupo, ms = (g.miembros || []).map(id => [id, NUBE.miembros[id]]);
  return `${yo}${aviso}
    <h2>👥 ${esc(g.nombre)}</h2>
    <div class="card"><div class="muted">Código para invitar</div><div class="codigo">${esc(codigoBonito(g.id))}</div>
      <button class="sec" data-nube="compartir">📤 Pasar el código</button></div>
    <div class="card">${ms.map(([id, m]) => `<div class="row miembro">${carita(m)}<span>${esc((m && m.nombre) || '…')}${id === NUBE.user.uid ? ' <span class="muted">(tú)</span>' : ''}</span></div>`).join('')}</div>
    ${typeof pasaporteHTML === 'function' ? pasaporteHTML() : ''}
    ${resumenGrupoHTML()}
    <div class="row"><button class="sec" data-nube="salirgrupo">Salir del grupo</button><button class="sec" data-nube="salir">Cerrar sesión</button></div>`;
}
document.addEventListener('click', e => {
  const em = e.target.closest('[data-pfemoji]'), co = e.target.closest('[data-pfcolor]');
  if (em || co) { const n = document.getElementById('pf-nombre'); if (n) NUBE.perfil.nombre = n.value; if (em) NUBE.perfil.emoji = em.dataset.pfemoji; else NUBE.perfil.color = co.dataset.pfcolor; render(); return; }
  const b = e.target.closest('[data-nube]'); if (!b) return;
  const a = b.dataset.nube, val = id => (document.getElementById(id) || {}).value;
  if (a === 'entrar') entrarGoogle();
  else if (a === 'salir') salirCuenta();
  else if (a === 'editar') { NUBE.editarPerfil = true; render(); }
  else if (a === 'perfil') guardarPerfil(val('pf-nombre'), NUBE.perfil.emoji, NUBE.perfil.color);
  else if (a === 'crear') crearGrupo(val('nombre-grupo'));
  else if (a === 'unirse') unirseGrupo(val('codigo'));
  else if (a === 'compartir') compartirCodigo();
  else if (a === 'salirgrupo') salirGrupo();
});
