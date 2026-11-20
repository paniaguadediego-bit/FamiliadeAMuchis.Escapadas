'use strict';
// ☁️ Firebase: entrada con Google, perfil (nombre, emoji y color) y grupo con código de invitación.
// Solo se carga si firebase-config.js trae la configuración. Las marcas compartidas llegan en S4.

const FB_DIR = 'vendor/firebase-10.14.1/';
const K_GRUPO = 'esc.grupo';
const EMOJIS = ['😀', '😎', '🤠', '🥳', '🤓', '😺', '🐶', '🦊', '🐼', '🐢', '🦜', '🐬', '🌋', '🌴', '🌻', '⛰️'];
const COLORES = ['#0b6e4f', '#1f5fbf', '#c0392b', '#d97706', '#7c3aed', '#db2777', '#0f766e', '#475569'];
const NUBE = { estado: 'apagada', user: null, perfil: null, editarPerfil: false, grupo: null, miembros: {}, msg: '', ocupado: false };
const nubeConfigurada = () => !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);

function cargarScript(src) {
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
}
const repintarNube = () => { if (typeof tab !== 'undefined' && tab === 'grupo') render(); };
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
async function cargarPerfil() {
  const u = NUBE.user;
  try {
    const d = await NUBE.db.collection('perfiles').doc(u.uid).get();
    if (d.exists) { NUBE.perfil = d.data(); NUBE.editarPerfil = false; return; }
  } catch {}
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
    NUBE.grupo = { id: d.id, ...d.data() };
    await cargarMiembros(); repintarNube();
  }, () => { NUBE.grupo = null; repintarNube(); });
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
  NUBE.grupo = null; NUBE.miembros = {}; try { localStorage.removeItem(K_GRUPO); } catch {}
  repintarNube();
}
async function compartirCodigo() {
  const g = NUBE.grupo; if (!g) return;
  const txt = `Únete a «${g.nombre}» en Escapadas: abre ${location.origin}${location.pathname.replace(/[^/]*$/, '')} → 👥 Grupo → «Unirme con código» y escribe ${codigoBonito(g.id)}`;
  try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(txt); alert('Copiado. Pégalo en WhatsApp.'); } catch { prompt('Copia este mensaje:', txt); }
}

// ---------- pestaña 👥 Grupo ----------
const carita = (p, uid) => `<span class="carita" style="--cc:${esc((p && p.color) || '#475569')}" title="${esc((p && p.nombre) || '')}">${esc((p && p.emoji) || '👤')}</span>`;
function viewNube() {
  const aviso = NUBE.msg ? `<div class="aviso">${esc(NUBE.msg)}</div>` : '';
  if (!nubeConfigurada()) return `<div class="vacio"><div class="grande">👥</div><p class="big">El grupo aún no está conectado</p>
    <p class="muted">Falta enlazar la app con Firebase (la nube de Google donde se compartirán las marcas). Mientras tanto, tus marcas se guardan solo en este móvil.</p></div>`;
  if (NUBE.estado === 'error') return aviso;
  if (NUBE.estado !== 'lista') return '<div class="vacio"><div class="grande">⏳</div>Conectando…</div>';
  if (!NUBE.user) return `<div class="vacio"><div class="grande">👥</div><p class="big">Escapadas en grupo</p>
    <p class="muted">Entra con tu cuenta de Google (una vez en cada móvil) para unirte a la Familia de A Muchis y ver lo que ha marcado cada uno.</p></div>
    ${aviso}<button data-nube="entrar">Entrar con Google</button>
    <p class="muted">Solo se guarda tu nombre y el emoji que elijas; tu correo no se enseña a nadie.</p>`;
  const p = NUBE.perfil || {};
  if (NUBE.editarPerfil) return `<h2>🙂 Tu perfil</h2>${aviso}
    <div class="card"><label class="muted" for="pf-nombre">Nombre que verá el grupo</label>
      <input id="pf-nombre" maxlength="40" value="${esc(p.nombre || '')}" autocomplete="nickname">
      <p class="muted">Tu emoji</p><div class="elige">${EMOJIS.map(e => `<button class="${p.emoji === e ? 'on' : ''}" data-pfemoji="${e}">${e}</button>`).join('')}</div>
      <p class="muted">Tu color</p><div class="elige">${COLORES.map(c => `<button class="color ${p.color === c ? 'on' : ''}" data-pfcolor="${c}" style="background:${c}" aria-label="Color"></button>`).join('')}</div>
      <button data-nube="perfil">Guardar</button></div>`;
  const yo = `<div class="card row yo">${carita(p)}<div style="flex:1"><b>${esc(p.nombre)}</b><div class="muted">${esc(NUBE.user.email || '')}</div></div><button class="sec mini" data-nube="editar">✏️</button></div>`;
  if (!NUBE.grupo) return `${yo}${aviso}
    <h2>👥 Grupo</h2>
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
    <p class="muted">Pronto: las marcas de cada uno, al momento, en las fichas y en el mapa.</p>
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
