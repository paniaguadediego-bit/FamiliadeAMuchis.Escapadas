'use strict';
// 📅 Planes del grupo y calendario de los próximos fines de semana.
// grupos/{gid}/planes/{id}: sitioId ('' si es un destino libre), destino (texto), isla, fecha (AAAA-MM-DD),
// hasta (AAAA-MM-DD, opcional: planes de varios días), nota, propone (uid), apuntados [uid], creado.
// Un plan puede ser un sitio del catálogo o un destino libre en cualquier isla («Finde en La Palma»).

const SEMANAS_CAL = 10; // fines de semana que se ven por delante
const colPlanes = () => NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('planes');
function seguirPlanes(gid) {
  if (NUBE.offPlanes) NUBE.offPlanes();
  NUBE.offPlanes = NUBE.db.collection('grupos').doc(gid).collection('planes').onSnapshot(q => {
    NUBE.planes = q.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    refrescarVista();
  }, () => {});
}
const finPlan = p => p.hasta && p.hasta > p.fecha ? p.hasta : p.fecha;
const proximosPlanes = () => (NUBE.planes || []).filter(p => finPlan(p) >= hoyISO());

// ---------- fechas ----------
const isoDe = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const masDias = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return isoDe(d); };
// Sábado del finde de ese día: el próximo (hoy si es sábado; ayer si es domingo, que aún es «este finde»).
function sabadoDe(iso) { const d = new Date(iso + 'T12:00'), w = d.getDay(); d.setDate(d.getDate() + (w === 0 ? -1 : 6 - w)); return isoDe(d); }
const proximoSabado = () => sabadoDe(hoyISO());
const diaCorto = iso => new Date(iso + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
const fechaPlan = p => {
  const f = iso => new Date(iso + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const t = p.hasta && p.hasta > p.fecha ? `${f(p.fecha)} → ${f(p.hasta)}` : f(p.fecha); return t[0].toUpperCase() + t.slice(1);
};

// ---------- crear, apuntarse, cancelar ----------
let planForm = null; // { sitioId?, sabado? } del formulario abierto
async function proponerPlan(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) return alert('Elige un día.');
  if (d.fecha < hoyISO()) return alert('Ese día ya ha pasado.');
  if (d.hasta && d.hasta < d.fecha) return alert('La vuelta es antes que la ida.');
  const isla = ISLAS[d.isla] ? d.isla : 'tenerife';
  let sitioId = d.sitioId || '', destino = String(d.destino || '').trim().slice(0, 80);
  if (!sitioId && destino && isla === 'tenerife') { const s = SITIOS.find(x => sinTildes(x.nombre) === sinTildes(destino)); if (s) { sitioId = s.id; destino = ''; } }
  if (sitioId && sitioId.startsWith('ag-')) destino = ((sitio(sitioId) || {}).nombre || destino).slice(0, 80);
  if (!sitioId && !destino) destino = isla !== 'tenerife' ? `Finde en ${ISLAS[isla].nombre}` : '';
  if (!sitioId && !destino) return alert('¿A dónde? Escribe un sitio o un destino.');
  planForm = null;
  const planB = leerB(d.planB);
  // 🗳️ Varias fechas para votar: la primera hace de fecha del plan hasta que quien propone fije una.
  const opciones = [...new Set([d.fecha, ...(d.opciones || [])].filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f || '') && f >= hoyISO()))].sort().slice(0, 3);
  if (opciones.length > 1) d.fecha = opciones[0];
  try {
    await colPlanes().add({ ...(opciones.length > 1 ? { opciones, votos: {} } : {}), sitioId, destino, isla, fecha: d.fecha, hasta: d.hasta && d.hasta > d.fecha ? d.hasta : '', nota: String(d.nota || '').trim().slice(0, 300),
      propone: NUBE.user.uid, apuntados: [NUBE.user.uid], creado: firebase.firestore.FieldValue.serverTimestamp(), ...(planB ? { planB } : {}) });
  } catch (e) { alert('No se pudo proponer (' + (e.code || e.message) + '). ¿Están publicadas las reglas nuevas?'); }
  refrescarVista();
}
// ---------- 🅱️ plan B ----------
// planB: { sitioId, destino } — un sitio de la app o un texto libre. Cualquiera del grupo lo pone o lo cambia.
function leerB(texto) {
  const t = String(texto || '').trim().slice(0, 80); if (!t) return null;
  const s = SITIOS.find(x => sinTildes(x.nombre) === sinTildes(t));
  return s ? { sitioId: s.id, destino: '' } : { sitioId: '', destino: t };
}
function guardarB(id, b) {
  colPlanes().doc(id).update({ planB: b ? b : firebase.firestore.FieldValue.delete() }).catch(e => alert('No se pudo (' + (e.code || e.message) + ').'));
  planBForm = null; refrescarVista();
}
let planBForm = null; // id del plan con el formulario de plan B abierto
// ¿Pinta mal el tiempo para ese plan? Solo con previsión (próximos días) y sitios de Tenerife con zona.
function avisoTiempo(p) {
  const s = p.sitioId && sitio(p.sitioId); if (!s || typeof tiempoDe !== 'function') return null;
  const t = tiempoDe(zonaDe(s), p.fecha); if (!t) return null;
  if (tiempoVale(s, p.fecha).ok) return null;
  return { s, t, zona: ZONAS[zonaDe(s)] };
}
// Ideas de plan B para ese día: que encajen con el tiempo, cerca del plan A; primero bajo techo y lo que el grupo quiere.
function ideasB(p, n = 3) {
  const a = sitio(p.sitioId); if (!a) return [];
  return SITIOS.filter(x => x.id !== a.id && x.tipo !== 'evento' && enIsla(x) && tiempoDe(zonaDe(x), p.fecha) && tiempoVale(x, p.fecha).ok)
    .map(x => [x, kmEntre([a.lat, a.lon], [x.lat, x.lon]) - (x.tipo === 'museo' ? 8 : 0) - 4 * (typeof ganas === 'function' ? ganas(x.id) : 0)])
    .sort((u, v) => u[1] - v[1]).slice(0, n).map(([x]) => x);
}
function planBHTML(p) {
  const b = p.planB, bs = b && b.sitioId && sitio(b.sitioId), av = avisoTiempo(p);
  const nombreB = bs ? `<button class="plan-b-s" data-irficha="${esc(bs.id)}">${tipoIc(bs.tipo)} ${esc(bs.nombre)}</button> <small class="muted">${esc(bs.municipio)}${av && tiempoDe(zonaDe(bs), p.fecha) ? ' · ' + (tiempoVale(bs, p.fecha).ok ? 'el tiempo acompaña ✓' : 'tampoco pinta bien') : ''}</small>` : b ? `<b>${esc(b.destino)}</b>` : '';
  let h = '';
  if (av) {
    const [ic, txt] = cielo(av.t.c);
    const por = tiempoVale(av.s, p.fecha).por || '';
    h += `<div class="aviso-tiempo">${por ? `🏖️ <b>${esc(por)}</b>` : '🌧️ <b>El tiempo pinta mal</b>'} en ${esc(av.zona.nom)}: ${ic} ${esc(txt.toLowerCase())}${av.t.p >= 20 ? `, ${av.t.p}% de probabilidad de lluvia`.replace(/ de lluvia$/, /lluv|chubas/i.test(txt) ? '' : ' de lluvia') : ''}${av.t.v >= 40 ? `, viento ${Math.round(av.t.v)} km/h` : ''}.
      ${b ? '' : (() => { const ideas = ideasB(p); return ideas.length ? `<div class="ideas-b">Ideas de plan B para ese día:${ideas.map(x => `<div class="idea-b"><button class="plan-b-s" data-irficha="${esc(x.id)}">${tipoIc(x.tipo)} ${esc(x.nombre)}</button><small class="muted"> ${esc(x.municipio)}</small><button class="sec mini" data-plan="b-usar" data-id="${esc(p.id)}" data-sitio="${esc(x.id)}">🅱️ Usar</button></div>`).join('')}</div>` : ''; })()}</div>`;
  }
  if (planBForm === p.id) {
    h += `<div class="plan-b-form"><input id="pb-${esc(p.id)}" list="pl-sitios-b" maxlength="80" placeholder="🅱️ Plan B: un sitio de la app o lo que queráis" value="${esc(bs ? bs.nombre : b ? b.destino : '')}">
      <datalist id="pl-sitios-b">${SITIOS.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist>
      <div class="row"><button class="mini" data-plan="b-guardar" data-id="${esc(p.id)}">Guardar</button>${b ? `<button class="sec mini" data-plan="b-quitar" data-id="${esc(p.id)}">Quitar plan B</button>` : ''}<button class="sec mini" data-plan="b-cerrar">Cancelar</button></div></div>`;
  } else if (b) h += `<div class="plan-b">🅱️ <span>Plan B:</span> ${nombreB} <button class="sec mini" data-plan="b-abrir" data-id="${esc(p.id)}" aria-label="Cambiar plan B">✏️</button></div>`;
  return h;
}

function apuntarse(id, si) {
  const F = firebase.firestore.FieldValue;
  colPlanes().doc(id).update({ apuntados: si ? F.arrayUnion(NUBE.user.uid) : F.arrayRemove(NUBE.user.uid) }).catch(e => alert('No se pudo (' + (e.code || e.message) + ').'));
}
function cancelarPlan(id) { if (confirm('¿Cancelar este plan para todo el grupo?')) colPlanes().doc(id).delete().catch(() => {}); }

// ---------- cómo se ve un plan ----------
// 🗳️ Votación de fechas: cada uno marca las que le valen; quien propone fija la elegida.
const enVotacion = p => Array.isArray(p.opciones) && p.opciones.length > 1;
function votacionHTML(p) {
  if (!enVotacion(p)) return '';
  const votos = p.votos || {}, yo = NUBE.user.uid, quien = f => Object.keys(votos).filter(u => (votos[u] || []).includes(f));
  const max = Math.max(...p.opciones.map(f => quien(f).length));
  return `<div class="votacion"><div class="gl-t">🗳️ ¿Qué día os va mejor?</div>${p.opciones.map(f => { const q = quien(f), mio = q.includes(yo);
    return `<div class="voto ${max && q.length === max ? 'lider' : ''}"><button class="mini ${mio ? '' : 'sec'}" data-plan="votar" data-id="${esc(p.id)}" data-f="${f}" aria-pressed="${mio}">${mio ? '✓ ' : ''}${esc(diaCorto(f))} ${esc(new Date(f + 'T12:00').toLocaleDateString('es-ES', { month: 'short' }))}</button>
      <span class="voto-n">${q.length}</span><span class="voto-caras">${q.map(u => esc(perfilDe(u).emoji)).join('')}</span>
      ${p.propone === yo ? `<button class="sec mini" data-plan="fijar" data-id="${esc(p.id)}" data-f="${f}">Fijar</button>` : ''}</div>`; }).join('')}
    <div class="muted mini-nota">${p.propone === yo ? 'Cuando lo tengáis claro, toca «Fijar» en el día elegido.' : `Lo fija ${esc(perfilDe(p.propone).nombre)} cuando lo tengáis claro.`}</div></div>`;
}
function votar(id, f) {
  const p = (NUBE.planes || []).find(x => x.id === id); if (!p) return;
  const uid = NUBE.user.uid, mios = new Set((p.votos || {})[uid] || []);
  if (mios.has(f)) mios.delete(f); else mios.add(f);
  colPlanes().doc(id).update({ ['votos.' + uid]: [...mios].sort() }).catch(e => alert('No se pudo votar (' + (e.code || e.message) + ').'));
}
function fijar(id, f) {
  const D = firebase.firestore.FieldValue;
  colPlanes().doc(id).update({ fecha: f, opciones: D.delete(), votos: D.delete() }).catch(e => alert('No se pudo (' + (e.code || e.message) + ').'));
}
// 💬 Comentarios de cada plan (idea de Howbout): grupos/{gid}/comentarios/{id} = { planId, uid, texto, creado }.
// Una sola escucha para todo el grupo; cada uno escribe y borra solo lo suyo.
const comentAbiertos = new Set();
function seguirComentarios(gid) {
  if (NUBE.offComent) NUBE.offComent();
  NUBE.offComent = NUBE.db.collection('grupos').doc(gid).collection('comentarios').onSnapshot(q => {
    const c = {}; q.forEach(d => { const v = d.data(); if (v && v.planId) (c[v.planId] = c[v.planId] || []).push({ id: d.id, ...v }); });
    Object.values(c).forEach(l => l.sort((a, b) => (a.creado || 0) - (b.creado || 0)));
    NUBE.coment = c; refrescarVista();
  }, () => {});
}
function comentariosHTML(p) {
  const l = (NUBE.coment || {})[p.id] || [], abierto = comentAbiertos.has(p.id), yo = NUBE.user.uid;
  const hora = t => t ? new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="coment"><button class="enlace" data-plan="coment-ver" data-id="${esc(p.id)}">💬 ${l.length ? `${l.length} comentario${l.length > 1 ? 's' : ''}` : 'Comentar'}${l.length && !abierto ? ` · <span class="muted">${esc(perfilDe(l[l.length - 1].uid).emoji)} «${esc(l[l.length - 1].texto.slice(0, 40))}${l[l.length - 1].texto.length > 40 ? '…' : ''}»</span>` : ''}</button>
    ${abierto ? `<div class="coment-l">${l.map(c => `<div class="coment-m ${c.uid === yo ? 'mio' : ''}">${carita(perfilDe(c.uid))}<div><b>${esc(c.uid === yo ? 'Tú' : perfilDe(c.uid).nombre)}</b> <small class="muted">${esc(hora(c.creado))}</small>${c.uid === yo ? ` <button class="enlace borrar" data-plan="coment-borrar" data-id="${esc(c.id)}" aria-label="Borrar comentario">✕</button>` : ''}<div>${esc(c.texto)}</div></div></div>`).join('')}
      <div class="coment-n"><input id="cm-${esc(p.id)}" maxlength="300" placeholder="Escribe al grupo…" autocomplete="off"><button class="mini" data-plan="comentar" data-id="${esc(p.id)}">Enviar</button></div></div>` : ''}</div>`;
}
function comentar(planId) {
  const i = document.getElementById('cm-' + planId), t = (i && i.value || '').trim().slice(0, 300); if (!t) return;
  i.value = ''; i.blur();
  NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('comentarios').add({ planId, uid: NUBE.user.uid, texto: t, creado: Date.now() })
    .catch(e => alert('No se pudo enviar (' + (e.code || e.message) + ').'));
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('cm-')) comentar(e.target.id.slice(3)); });
function planHTML(p, { conSitio = true, compacto = false } = {}) {
  const s = p.sitioId && sitio(p.sitioId), isla = ISLAS[p.isla] || ISLAS.tenerife, yoVoy = (p.apuntados || []).includes(NUBE.user.uid);
  const fueron = s ? Object.entries(NUBE.marcasGrupo[p.sitioId] || {}).filter(([, m]) => m.estado === 'fuimos').map(([u]) => u) : [];
  const caras = us => us.map(u => `<span class="gm">${carita(perfilDe(u))}<span>${esc(perfilDe(u).nombre)}</span></span>`).join('');
  const titulo = s ? `<button class="plan-s" data-irficha="${esc(s.id)}">${tipoIc(s.tipo)} ${esc(s.nombre)} <small>· ${esc(s.municipio)}</small></button>`
    : `<div class="plan-s">${isla.ic} ${esc(p.destino || 'Plan')}${p.isla && p.isla !== 'tenerife' ? ` <small>· ${esc(isla.nombre)}</small>` : ''}</div>`;
  const foto = s && FOTOS[s.id] ? fotoImg(s.id, 'plan-foto') : '';
  return `<div class="plan ${foto ? 'con-foto' : ''} ${compacto ? 'compacto' : ''}" style="${s ? varsMuni(s.municipio) : '--h:200'}">
    ${conSitio ? `<div class="plan-cab">${foto}<div class="plan-cab-tx"><div class="plan-f">${enVotacion(p) ? '🗳️ Día por decidir' : '📅 ' + esc(fechaPlan(p))}</div>${titulo}</div></div>` : `<div class="plan-f solo">${enVotacion(p) ? '🗳️ Día por decidir' : '📅 ' + esc(fechaPlan(p))}</div>`}
    <div class="plan-cuerpo">
      <div class="muted">Propone ${esc(perfilDe(p.propone).emoji)} ${esc(perfilDe(p.propone).nombre)}${p.nota ? ` · «${esc(p.nota)}»` : ''}</div>
      <div class="gl"><span class="gl-t">🙋 Van (${(p.apuntados || []).length})</span>${caras(p.apuntados || [])}</div>
      ${s ? (fueron.length ? `<div class="gl"><span class="gl-t">✅ Ya lo visitaron</span>${caras(fueron)}</div>` : '<div class="muted">🌱 Nadie del grupo ha ido todavía.</div>') : ''}
      ${votacionHTML(p)}
      ${comentariosHTML(p)}
      ${planBHTML(p)}
      <div class="acciones">${yoVoy ? `<button class="sec mini" data-plan="no" data-id="${esc(p.id)}">Ya no voy</button>` : `<button class="mini" data-plan="si" data-id="${esc(p.id)}">🙋 Me apunto</button>`}
        <button class="sec mini" data-compartir="p:${esc(p.id)}">📤</button>
        ${!p.planB && planBForm !== p.id ? `<button class="sec mini" data-plan="b-abrir" data-id="${esc(p.id)}">🅱️ Plan B</button>` : ''}
        ${p.propone === NUBE.user.uid ? `<button class="danger mini" data-plan="cancelar" data-id="${esc(p.id)}">Cancelar plan</button>` : ''}</div>
    </div></div>`;
}
// Formulario: desde una ficha (sitio fijo) o desde un finde del calendario (sitio, destino libre u otra isla).
function formPlanHTML(f) {
  const sab = f.sabado || proximoSabado(), s = f.sitioId && sitio(f.sitioId);
  return `<div class="card plan-form">
    ${s ? `<b>${tipoIc(s.tipo)} ${esc(s.nombre)}</b>` : `${Object.values(ISLAS).filter(i => i.activa).length > 1 ? `<label class="muted" for="pl-isla">Isla</label>
      <select id="pl-isla">${Object.entries(ISLAS).filter(([, i]) => i.activa).map(([k, i]) => `<option value="${k}">${i.ic} ${esc(i.nombre)}</option>`).join('')}</select>` : ''}
      <label class="muted" for="pl-destino">¿A dónde?</label>
      <input id="pl-destino" list="pl-sitios" maxlength="80" placeholder="Un sitio de la app o lo que queráis («Finde en La Palma»)">
      <datalist id="pl-sitios">${SITIOS.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist>`}
    <div class="row"><div style="flex:1"><label class="muted" for="pl-fecha">Día</label><input type="date" id="pl-fecha" value="${sab}" min="${hoyISO()}"></div>
      <div style="flex:1"><label class="muted" for="pl-hasta">Hasta (opcional)</label><input type="date" id="pl-hasta" min="${hoyISO()}"></div></div>
    <details class="pl-votar"><summary>🗳️ ¿No sabéis qué día? Añade otras fechas y que el grupo vote</summary>
      <div class="row"><div style="flex:1"><label class="muted" for="pl-op2">Otra fecha</label><input type="date" id="pl-op2" min="${hoyISO()}"></div>
        <div style="flex:1"><label class="muted" for="pl-op3">Y otra</label><input type="date" id="pl-op3" min="${hoyISO()}"></div></div></details>
    <input id="pl-nota" maxlength="300" placeholder="Hora, punto de encuentro, barco… (opcional)">
    <input id="pl-b" list="pl-sitios-b" maxlength="80" placeholder="🅱️ Plan B por si acaso (opcional)">
    <datalist id="pl-sitios-b">${SITIOS.map(x => `<option value="${esc(x.nombre)}">`).join('')}</datalist>
    <div class="row"><button data-plan="crear">📅 Proponer al grupo</button><button class="sec" data-plan="cerrar">Cancelar</button></div></div>`;
}
// En la ficha: los planes de ese sitio y el botón para proponer.
function planesEnFicha(id) {
  if (!enGrupo()) return '';
  const ps = proximosPlanes().filter(p => p.sitioId === id);
  return ps.map(p => planHTML(p, { conSitio: false })).join('')
    + (planForm && planForm.sitioId === id ? formPlanHTML(planForm) : `<div class="acciones"><button class="sec mini" data-plan="abrir" data-sitio="${esc(id)}">📅 Proponer plan</button></div>`);
}

// ---------- 📅 Próximos findes y festivos (en Planes) ----------
// Claves de día: 'AAAA-MM-DD' (el día entero) y 'AAAA-MM-DDT' (la tarde: viernes y vísperas de festivo, las mismas del
// tiempo). Un «bloque» son los días que se deciden juntos: un finde (viernes tarde —o el viernes entero si es festivo—,
// sábado, domingo y jueves/lunes festivos de puente, con la tarde de su víspera) o un festivo suelto con su víspera.
const DSEM = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const nomDia = k => { const f = k.slice(0, 10); return DSEM[diaSemana(f)] + (k.endsWith('T') ? ' tarde' : ' ' + +f.slice(8)); };
// Víspera de festivo de lunes a jueves: su tarde cuenta (al día siguiente no se trabaja). Viernes y finde ya cuentan.
const esVispera = f => !!festivo(masDias(f, 1)) && !festivo(f) && [1, 2, 3, 4].includes(diaSemana(f));
const tardeAunVale = f => f > hoyISO() || (f === hoyISO() && new Date().getHours() < 20);
function bloqueDe(f) {
  const hoy = hoyISO(), w = diaSemana(f), vale = ks => ks.filter(k => k.endsWith('T') ? tardeAunVale(k.slice(0, 10)) : k >= hoy);
  // ¿Pertenece a un finde (con su puente)?
  const sab = w === 6 ? f : w === 0 ? masDias(f, -1) : w === 5 ? masDias(f, 1) : w === 1 && festivo(f) ? masDias(f, -2) : w === 4 && festivo(f) ? masDias(f, 2)
    : w === 3 && festivo(masDias(f, 1)) ? masDias(f, 3) : w === 4 && festivo(masDias(f, 1)) ? masDias(f, 2) : null;
  if (sab) {
    const vie = masDias(sab, -1), jue = masDias(sab, -2), lun = masDias(sab, 2), ks = [];
    if (festivo(jue)) ks.push(masDias(jue, -1) + 'T', jue); else if (festivo(vie)) ks.push(jue + 'T'); // víspera del viernes festivo
    ks.push(festivo(vie) ? vie : festivo(jue) ? vie : vie + 'T', sab, masDias(sab, 1));
    if (festivo(lun)) ks.push(lun);
    return { tipo: 'finde', sab, dias: vale(ks) };
  }
  // Festivo suelto (o su víspera).
  const fest = festivo(f) ? f : esVispera(f) ? masDias(f, 1) : null;
  if (fest) return { tipo: 'festivo', sab: fest, dias: vale([...(esVispera(masDias(fest, -1)) ? [masDias(fest, -1) + 'T'] : []), fest]) };
  return { tipo: 'suelto', sab: f, dias: vale([f]) }; // cualquier otro día (un cumpleaños un miércoles…)
}
const planesDelDia = f => proximosPlanes().filter(p => (p.fecha <= f && finPlan(p) >= f) || (enVotacion(p) && p.opciones.includes(f)));
let calMes = null, calSel = null, calVista = null; // calVista: 'semanas' (franja de 2) o 'mes' // mes que se ve ('AAAA-MM') y día elegido
const CAL_DIAS = 7 * SEMANAS_CAL; // hasta dónde se puede decir si puedes y proponer
// 💫 Mejor día: en las próximas 4 semanas, el día de finde, festivo o víspera en que más gente ha dicho 👍 (y menos 🙅).
function mejorDia() {
  const ms = (NUBE.grupo && NUBE.grupo.miembros) || [], hoy = hoyISO(); let mejor = null;
  for (let i = 0; i <= 28; i++) {
    const f = masDias(hoy, i), b = bloqueDe(f); if (b.tipo === 'suelto') continue;
    const k = b.dias.find(x => x.slice(0, 10) === f); if (!k) continue;
    const si = ms.filter(u => dispoDe(u, k) === 'si').length, no = ms.filter(u => dispoDe(u, k) === 'no').length;
    if (si >= 2 && (!mejor || si > mejor.si || (si === mejor.si && no < mejor.no))) mejor = { f, k, si, no };
  }
  return mejor;
}
function calendarioHTML() {
  if (!enGrupo()) return '';
  const hoy = hoyISO(), limite = masDias(hoy, CAL_DIAS);
  if (!calSel || calSel < hoy) calSel = proximoSabado() < hoy ? hoy : proximoSabado();
  if (!calMes) calMes = calSel.slice(0, 7);
  if (!calVista) calVista = load('esc.calvista', 'semanas');
  const [y, m] = calMes.split('-').map(Number), d1 = `${calMes}-01`, nDias = new Date(y, m, 0).getDate();
  const mej = mejorDia(), hueco = (diaSemana(d1) + 6) % 7, yo = NUBE.user.uid, otros = (NUBE.grupo.miembros || []).filter(u => u !== yo);
  let celdas = '<span class="cal-h">L</span><span class="cal-h">M</span><span class="cal-h">X</span><span class="cal-h">J</span><span class="cal-h">V</span><span class="cal-h">S</span><span class="cal-h">D</span>'
    + '';
  // Franja de 2 semanas (desde el lunes de esta) o el mes entero.
  const lunes = masDias(hoy, -((diaSemana(hoy) + 6) % 7));
  const fechasCal = Array.from({ length: 35 }, (_, i) => masDias(lunes, i)); // esta semana y las 4 siguientes
  for (const f of fechasCal) {
    const d = +f.slice(8), w = diaSemana(f), fuera = f < hoy || f > limite;
    const fest = festivo(f), visp = esVispera(f) || (w === 5 && !fest), ps = fuera ? [] : planesDelDia(f);
    const k = visp && !fest ? f + 'T' : f, mio = fuera ? '' : dispoDe(yo, k) || (w === 5 ? dispoDe(yo, f) : '');
    const si = fuera ? 0 : otros.filter(u => dispoDe(u, k) === 'si').length;
    const cls = ['cal-d', mej && mej.f === f && 'mejor', fuera && 'fuera', f === hoy && 'hoy', (w === 0 || w === 6) && 'finde', fest && 'fest', f === calSel && 'sel', mio && 'm-' + mio].filter(Boolean).join(' ');
    celdas += `<button class="${cls}" ${fuera ? 'disabled' : `data-cal="${f}"`} aria-label="${esc(new Date(f + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}${fest ? ', festivo' : ''}${ps.length ? `, ${ps.length} plan` : ''}">
      <span class="cal-n">${mej && mej.f === f ? '💫' : ''}${d}${d === 1 || f === lunes ? `<small> ${esc(new Date(f + 'T12:00').toLocaleDateString('es-ES', { month: 'short' }))}</small>` : ''}</span><span class="cal-m">${esVispera(f) ? '<span class="cal-v" title="Víspera de festivo">🌆</span>' : ''}${ps.length ? `<i class="cal-p">${ps.length > 1 ? ps.length : ''}</i>` : ''}${mio ? IC_DISPO[mio] : ''}${si ? `<small>👍${si}</small>` : ''}</span></button>`;
  }
  const mesNom = new Date(d1 + 'T12:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const prev = masDias(d1, -1).slice(0, 7), next = masDias(`${calMes}-${nDias}`, 1).slice(0, 7);
  const nav = `<div class="cal-nav"><button class="sec mini" data-calmes="${prev}" ${prev < hoy.slice(0, 7) ? 'disabled' : ''} aria-label="Mes anterior">‹</button>
    <b>${esc(mesNom[0].toUpperCase() + mesNom.slice(1))}</b><button class="sec mini" data-calmes="${next}" ${next > limite.slice(0, 7) ? 'disabled' : ''} aria-label="Mes siguiente">›</button></div>`;
  const enDia = new Set(bloqueDe(calSel).dias.map(k => k.slice(0, 10)));
  const ps = proximosPlanes(), mas = ps.filter(p => p.fecha > masDias(proximoSabado(), 9) && ![...enDia].some(d => p.fecha <= d && finPlan(p) >= d));
  return `<h2>📅 Calendario</h2>${miMuni() ? '' : '<p class="muted mini-nota">🎉 Para ver los festivos locales de tu municipio, elígelo en ☰ Más.</p>'}
    <div class="card cal"><div class="cal-nav"><b>Esta semana y las 4 siguientes</b></div><div class="cal-g">${celdas}</div>
      <div class="cal-ley"><span>💫 mejor día</span><span><i class="cal-p"></i> plan</span><span class="l-fest">🎉 festivo</span><span>🌆 víspera</span><span>👍 / 🙅 tú</span><span>👍n el grupo</span></div></div>
    ${diaHTML(calSel)}
    ${mas.length ? `<h2>🔭 Más planes por delante</h2>${mas.map(p => planHTML(p, { compacto: true })).join('')}` : ''}`;
}
// Detalle del día elegido: festivo/víspera, ¿puedes? (los días de su bloque), planes de esos días y «＋ Plan».
function diaHTML(f) {
  const b = bloqueDe(f), fest = festivo(f), visp = esVispera(f);
  const titulo = new Date(f + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const dias = [...new Set(b.dias.map(k => k.slice(0, 10)))], ps = proximosPlanes().filter(p => dias.some(d => p.fecha <= d && finPlan(p) >= d));
  const fests = dias.map(d => [d, festivo(d)]).filter(([, n]) => n);
  const abierto = planForm && !planForm.sitioId && !planForm.rapido && planForm.sabado === f;
  return `<section class="finde dia-sel ${b.tipo}">
    <div class="finde-cab"><span class="finde-f"><b>${esc(titulo[0].toUpperCase() + titulo.slice(1))}</b></span>
      ${abierto ? '' : `<button class="mini" data-plan="abrir" data-sabado="${f}">＋ Plan este día</button>`}</div>
    ${fests.length ? `<div class="fest-l">🎉 ${fests.map(([d, n]) => `<b>${esc(nomDia(d))}</b> ${esc(n)}`).join(' · ')}</div>` : ''}
    ${visp && !fest ? `<div class="fest-l">🌆 Víspera de festivo: mañana no se trabaja, buena tarde para quedar.</div>` : ''}
    ${b.tipo === 'finde' && typeof tiempoFindeMini === 'function' ? tiempoFindeMini(b.sab) : ''}
    ${b.dias.length ? dispoHTML(b.dias) : ''}
    ${ps.map(p => planHTML(p, { compacto: true })).join('') || (abierto ? '' : '<div class="muted centro">Sin planes todavía.</div>')}
    ${abierto ? formPlanHTML(planForm) : ''}</section>`;
}
document.addEventListener('click', e => {
  const d = e.target.closest('[data-cal]'); if (d) { calSel = d.dataset.cal; if (d.dataset.calmesir) calMes = d.dataset.calmesir; planForm = null; render(); const x = document.querySelector('.dia-sel'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  const m = e.target.closest('[data-calmes]'); if (m) { calMes = m.dataset.calmes; render(); return; }
  const v = e.target.closest('[data-calvista]'); if (v) { calVista = v.dataset.calvista; save('esc.calvista', calVista); if (calVista === 'mes') calMes = (calSel || hoyISO()).slice(0, 7); render(); }
});

// ---------- 🎠 Carruseles de Planes: este finde y el que viene ----------
// Primero los planes del grupo (quién va, «🙋 Me apunto»), luego los eventos y, al final, 💡 ideas que encajan con el
// tiempo (que tú no hayas visitado; antes lo que el grupo tiene en 🔖). Sin grupo: eventos e ideas.
const hashTxt = t => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
function ideasFinde(sab, n, fuera) {
  const g = typeof enGrupo === 'function' && enGrupo();
  return SITIOS.filter(s => s.tipo !== 'evento' && !s.agenda && enIsla(s) && !fuera.has(s.id) && !['fuimos', 'no'].includes(marca(s.id).estado)
      && (typeof tiempoVale !== 'function' || tiempoVale(s, sab).ok))
    .map(s => [s, -10 * ganas(s.id) - (g && nadieFue(s.id) ? 3 : 0) - (fotoSrc(s.id) ? 2 : 0) + (hashTxt(s.id + sab) % 100) / 100])
    .sort((a, b) => a[1] - b[1]).slice(0, n).map(([s]) => s);
}
const AZAR = Math.random(); // una semilla por visita: el orden cambia al abrir la app, no en cada toque
const azarDe = id => { let h = 0; for (const c of String(id) + AZAR) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const verMasFinde = new Set();
document.addEventListener('click', e => { const b = e.target.closest('[data-vermas]'); if (b) { const i = +b.dataset.vermas; if (verMasFinde.has(i)) verMasFinde.delete(i); else verMasFinde.add(i); render(); } });
function carruselFindeHTML(i) {
  const sab = masDias(proximoSabado(), 7 * i), b = bloqueDe(sab), g = typeof enGrupo === 'function' && enGrupo();
  const d0 = b.dias[0] ? b.dias[0].slice(0, 10) : sab, dN = b.dias.length ? b.dias[b.dias.length - 1].slice(0, 10) : masDias(sab, 1);
  const ps = g ? proximosPlanes().filter(p => p.fecha <= dN && finPlan(p) >= d0) : [];
  const evs = ordenarEventos(eventosEntre(masDias(sab, -1), dN), masDias(sab, -1));
  const usados = new Set([...ps.map(p => p.sitioId), ...evs.map(([s]) => s.id)]);
  const ideas = ideasFinde(sab, 3, usados), hoy = hoyISO();
  const caras = us => us.slice(0, 5).map(u => carita(perfilDe(u))).join('') + (us.length > 5 ? `<small>+${us.length - 5}</small>` : '');
  const tPlan = p => {
    const s = p.sitioId && sitio(p.sitioId), voy = (p.apuntados || []).includes(NUBE.user.uid), isla = ISLAS[p.isla] || ISLAS.tenerife;
    return `<div class="ev-tarjeta t-plan"><button class="ev-ban banner-plano" ${s ? `data-irficha="${esc(s.id)}"` : `data-cal-ir="${p.fecha}"`} style="${s ? varsMuni(s.municipio) : '--h:200'}">${s ? fotoImg(s.id, 'banner-foto') : ''}
      <span class="banner-tx"><span class="banner-n"><span class="ev-cuenta c-plan">🙋 Plan · ${esc(nomDia(p.fecha))}</span><b>${s ? esc(s.nombre) : `${isla.ic} ${esc(p.destino || 'Plan')}`}</b><small>${p.nota ? '«' + esc(p.nota) + '»' : s ? esc(s.municipio) : ''}</small></span></span></button>
      <div class="ev-acc"><span class="t-caras">${caras(p.apuntados || [])}</span><button class="mini ${voy ? 'sec' : ''}" data-plan="${voy ? 'no' : 'si'}" data-id="${esc(p.id)}">${voy ? '✓ Vas' : '🙋 Me apunto'}</button></div></div>`;
  };
  const tEv = ([s, f]) => {
    const ya = f[0] <= hoy && f[1] >= hoy, p = g && proximosPlanes().find(x => x.sitioId === s.id);
    const acc = ''; // (v47) sin «Proponer» en la rueda: se propone desde la ficha
    return `<div class="ev-tarjeta"><button class="ev-ban banner-plano ya" data-irficha="${esc(s.id)}" style="${s.municipio ? varsMuni(s.municipio) : '--h:330'}">${fotoImg(s.id, 'banner-foto')}
      <span class="banner-tx"><span class="banner-n"><span class="ev-cuenta">${catIc(s)} ${ya ? '¡Ahora!' : s.destacado ? '¡No te lo pierdas!' : 'Evento'}</span><b>${esc(s.nombre)}</b><small>${esc(fechaEventoTxt(f))}${s.municipio ? ' · ' + esc(s.municipio) : ''}</small></span></span></button>
      ${acc ? `<div class="ev-acc">${acc}</div>` : ''}</div>`;
  };
  const tIdea = s => {
    const tv = typeof tiempoVale === 'function' ? tiempoVale(s, sab) : {}, q = ganas(s.id);
    return `<div class="ev-tarjeta t-idea"><button class="ev-ban banner-plano" data-irficha="${esc(s.id)}" style="${varsMuni(s.municipio)}">${fotoImg(s.id, 'banner-foto')}
      <span class="banner-tx"><span class="banner-n"><span class="ev-cuenta c-idea">💡 Idea${tv.nota ? ' · ' + esc(tv.nota) : ''}</span><b>${tipoIc(s.tipo)} ${esc(s.nombre)}</b><small>${esc(s.municipio)}${q ? ` · 🔖 ${q} con ganas` : ''}</small></span></span></button>
      </div>`;
  };
  // (v43) Lista vertical; los planes del grupo primero y el resto en orden aleatorio (fijo durante la visita).
  const mezcla = l => l.map(x => [x, azarDe(x[0] ? x[0].id || x[0] : x.id)]).sort((a, b) => a[1] - b[1]).map(([x]) => x);
  const resto = mezcla([...evs.map(e => ['e', e]), ...ideas.map(s => ['i', s])].map(([t, x]) => ({ t, x, id: t === 'e' ? x[0].id : x.id })));
  const tarjetas = [...ps.map(tPlan), ...resto.map(o => o.t === 'e' ? tEv(o.x) : tIdea(o.x))];
  const abierto = verMasFinde.has(i), MAX = 4;
  const fests = b.dias.map(k => festivo(k)).filter(Boolean);
  const rango = `${nomDia(d0)} – ${nomDia(dN)} ${new Date(dN + 'T12:00').toLocaleDateString('es-ES', { month: 'short' })}`;
  const form = g && planForm && planForm.carrusel === String(i) ? formPlanHTML(planForm) : '';
  return `<div class="car-cab"><h2>${['🎠 Este finde', '🎠 El que viene', '🎠 En 2 semanas'][i] || '🎠'} <small class="muted">${esc(rango)}${fests.length ? ' · 🎉 puente' : ''}</small></h2>${i === 0 ? '<button class="enlace" data-tab="eventos">Todos los eventos ›</button>' : ''}</div>
    <div class="ev-pista">${ps.length ? `🙋 ${ps.length} plan${ps.length > 1 ? 'es' : ''} · ` : ''}${evs.length ? `🎟️ ${evs.length} evento${evs.length > 1 ? 's' : ''} · ` : ''}💡 ${ideas.length} ideas</div>
    ${tarjetas.length > 1 ? `<div class="rueda" data-rueda="${i}" aria-label="Desliza para girar">${tarjetas.join('')}</div>` : `<div class="ev-lista">${tarjetas.join('')}</div>`}${form}`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-cal-ir]'); if (b) { calSel = b.dataset.calIr; calMes = calSel.slice(0, 7); render(); const x = document.querySelector('.cal'); if (x) x.scrollIntoView({ block: 'start', behavior: 'smooth' }); } });

// ---------- 👍 / 🙅 ¿Puedes ese día? ----------
// grupos/{gid}/disponibilidad/{uid}: { uid, no: [claves de día], si: [claves de día], actualizado }. Cada uno el suyo.
// (Antes era `nopuedo: [sábados]` = todo el finde: se sigue leyendo así.)
function seguirDisponibilidad(gid) {
  if (NUBE.offDispo) NUBE.offDispo();
  NUBE.offDispo = NUBE.db.collection('grupos').doc(gid).collection('disponibilidad').onSnapshot(q => {
    const d = {};
    q.forEach(x => { const v = x.data(); if (!v || !v.uid) return;
      const no = Array.isArray(v.no) ? v.no.slice() : [];
      (Array.isArray(v.nopuedo) ? v.nopuedo : []).forEach(sab => no.push(masDias(sab, -1) + 'T', masDias(sab, -1), sab, masDias(sab, 1)));
      d[v.uid] = { no, si: Array.isArray(v.si) ? v.si : [] }; });
    NUBE.dispo = d; refrescarVista();
  }, () => {});
}
const dispoDe = (u, k) => { const d = (NUBE.dispo || {})[u]; return !d ? '' : d.no.includes(k) ? 'no' : d.si.includes(k) ? 'si' : ''; };
const quienNoPuede = sab => (NUBE.grupo && NUBE.grupo.miembros || []).filter(u => dispoDe(u, sab) === 'no');
function ponerDias(claves, val) {
  const uid = NUBE.user.uid, hoy = hoyISO(), d = (NUBE.dispo || {})[uid] || { no: [], si: [] };
  const no = new Set(d.no.filter(k => k.slice(0, 10) >= hoy)), si = new Set(d.si.filter(k => k.slice(0, 10) >= hoy)); // las pasadas se van solas
  claves.forEach(k => { no.delete(k); si.delete(k); if (val === 'no') no.add(k); else if (val === 'si') si.add(k); });
  const nueva = { no: [...no].sort().slice(0, 150), si: [...si].sort().slice(0, 150) };
  NUBE.dispo = { ...(NUBE.dispo || {}), [uid]: nueva }; refrescarVista(); // se ve al momento, también sin red
  NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('disponibilidad').doc(uid)
    .set({ uid, ...nueva, actualizado: Date.now() }).catch(e => alert('No se pudo guardar (' + (e.code || e.message) + ').'));
}
const SIG_DISPO = { '': 'si', si: 'no', no: '' }, IC_DISPO = { '': '·', si: '👍', no: '🙅' };
function dispoHTML(dias) {
  const yo = NUBE.user.uid, otros = (NUBE.grupo.miembros || []).filter(u => u !== yo);
  const botones = dias.map(k => {
    const mio = dispoDe(yo, k), si = otros.filter(u => dispoDe(u, k) === 'si').length, no = otros.filter(u => dispoDe(u, k) === 'no').length;
    return `<button class="dia d-${mio || 'nada'}" data-dia="${k}" aria-label="${esc(nomDia(k))}: ${mio === 'si' ? 'puedes' : mio === 'no' ? 'no puedes' : 'sin decir'} (toca para cambiar)">
      <span class="dia-n">${esc(nomDia(k))}</span><span class="dia-yo">${IC_DISPO[mio]}</span><small>${si ? `👍${si}` : ''}${si && no ? ' ' : ''}${no ? `🙅${no}` : ''}${!si && !no ? '&nbsp;' : ''}</small></button>`;
  }).join('');
  const quien = (NUBE.grupo.miembros || []).map(u => {
    const s = dias.filter(k => dispoDe(u, k) === 'si'), n = dias.filter(k => dispoDe(u, k) === 'no'); if (!s.length && !n.length) return '';
    const nom = u === yo ? 'Tú' : perfilDe(u).nombre;
    return `<span class="gm">${carita(perfilDe(u))}<span>${esc(nom)}${s.length ? ` 👍 ${s.length === dias.length ? 'todo' : esc(s.map(nomDia).join(', '))}` : ''}${n.length ? ` 🙅 ${n.length === dias.length ? 'nada' : esc(n.map(nomDia).join(', '))}` : ''}</span></span>`;
  }).filter(Boolean).join('');
  const k = dias.join(',');
  return `<div class="dispo"><div class="dias">${botones}</div>
    ${dias.length > 1 ? `<div class="dispo-atajos"><button class="sec mini" data-dias="${k}" data-v="si">👍 Todo libre</button><button class="sec mini" data-dias="${k}" data-v="no">🙅 No puedo</button></div>` : ''}
    ${quien ? `<div class="dispo-quien">${quien}</div>` : ''}</div>`;
}
document.addEventListener('click', e => {
  if (!enGrupo()) return;
  const d = e.target.closest('[data-dia]'); if (d) { ponerDias([d.dataset.dia], SIG_DISPO[dispoDe(NUBE.user.uid, d.dataset.dia)]); return; }
  const t = e.target.closest('[data-dias]'); if (t) { const ks = t.dataset.dias.split(','), v = t.dataset.v; ponerDias(ks, ks.every(k => dispoDe(NUBE.user.uid, k) === v) ? '' : v); }
});

// Grupo: aviso de planes a la vista.
const avisoPlanesHTML = () => { const n = proximosPlanes().length; return n ? `<div class="card row"><span style="flex:1">📅 ${n} plan${n > 1 ? 'es' : ''} a la vista</span><button class="sec mini" data-tab="finde">Ver en Planes</button></div>` : ''; };

document.addEventListener('click', e => {
  const b = e.target.closest('[data-plan]'); if (!b) return;
  const a = b.dataset.plan, id = b.dataset.id, val = k => (document.getElementById(k) || {}).value || '';
  if (a === 'abrir') { planForm = b.dataset.sitio ? { sitioId: b.dataset.sitio, sabado: b.dataset.sabado, carrusel: b.dataset.carrusel } : { sabado: b.dataset.sabado }; render(); const f = document.querySelector('.plan-form'); if (f) f.scrollIntoView({ block: 'center' }); }
  else if (a === 'cerrar') { planForm = null; render(); }
  else if (a === 'crear') proponerPlan({ sitioId: planForm && planForm.sitioId, destino: val('pl-destino'), isla: val('pl-isla') || 'tenerife', fecha: val('pl-fecha'), opciones: [val('pl-op2'), val('pl-op3')], hasta: val('pl-hasta'), nota: val('pl-nota'), planB: val('pl-b') });
  else if (a === 'si' || a === 'no') apuntarse(id, a === 'si');
  else if (a === 'votar') votar(id, b.dataset.f);
  else if (a === 'coment-ver') { if (comentAbiertos.has(id)) comentAbiertos.delete(id); else comentAbiertos.add(id); render(); const x = document.getElementById('cm-' + id); if (x) x.focus(); }
  else if (a === 'comentar') comentar(id);
  else if (a === 'coment-borrar') { if (confirm('¿Borrar tu comentario?')) NUBE.db.collection('grupos').doc(NUBE.grupo.id).collection('comentarios').doc(id).delete().catch(() => {}); }
  else if (a === 'fijar') fijar(id, b.dataset.f);
  else if (a === 'cancelar') cancelarPlan(id);
  else if (a === 'b-abrir') { planBForm = id; render(); const f = document.getElementById('pb-' + id); if (f) f.focus(); }
  else if (a === 'b-cerrar') { planBForm = null; render(); }
  else if (a === 'b-guardar') { const b = leerB(val('pb-' + id)); if (!b) return alert('Escribe el plan B.'); guardarB(id, b); }
  else if (a === 'b-quitar') guardarB(id, null);
  else if (a === 'b-usar') guardarB(id, { sitioId: b.dataset.sitio, destino: '' });
});

// ---------- 🎡 Rueda de Planes (v46): la tarjeta del centro, grande; las de arriba y abajo giran y se desvanecen ----------
// Como el selector de hora del móvil: cada tarjeta se inclina, se encoge y se apaga según lo lejos que está del centro.
const posRueda = {}; // dónde se quedó cada rueda (para que no salte al volver a pintar)
function girarRuedas() {
  document.querySelectorAll('[data-rueda]').forEach(r => {
    if (!r._rueda) {
      r._rueda = 1; let pend = 0;
      r.addEventListener('scroll', () => { posRueda[r.dataset.rueda] = r.scrollTop; if (!pend) pend = requestAnimationFrame(() => { pend = 0; pintarRueda(r); }); }, { passive: true });
      // Tocar una tarjeta que no está en el centro la trae al centro (sin abrirla).
      r.addEventListener('click', e => { const t = e.target.closest('.ev-tarjeta'); if (t && !t.classList.contains('en-centro')) { e.preventDefault(); e.stopPropagation(); r.scrollTo({ top: t.offsetTop - (r.clientHeight - t.offsetHeight) / 2, behavior: 'smooth' }); } }, true);
      if (posRueda[r.dataset.rueda] != null) r.scrollTop = posRueda[r.dataset.rueda];
      else if (r.children.length > 2 && !r.querySelector('.t-plan')) { const t = r.children[1]; r.scrollTop = t.offsetTop - (r.clientHeight - t.offsetHeight) / 2; } // sin planes: empieza en la 2.ª para que se vea la rueda por los dos lados
    }
    pintarRueda(r);
  });
}
function pintarRueda(r) {
  const centro = r.scrollTop + r.clientHeight / 2;
  [...r.children].forEach(t => {
    const d = (t.offsetTop + t.offsetHeight / 2 - centro) / t.offsetHeight, a = Math.min(Math.abs(d), 3);
    t.style.transform = `perspective(900px) rotateX(${(-d * 32).toFixed(1)}deg) scale(${(1 - a * 0.14).toFixed(3)})`;
    t.style.opacity = Math.max(0, 1 - a * 0.42).toFixed(2);
    t.classList.toggle('en-centro', a < 0.5);
  });
}
addEventListener('resize', () => girarRuedas());

// ---------- ↔️ Findes en páginas (v47): deslizar a la derecha pasa al finde siguiente ----------
let paginaFinde = 0;
function paginadorFindes() {
  const n = 3;
  return `<div class="findes-pager" data-pager>${Array.from({ length: n }, (_, i) => `<section class="finde-pag">${carruselFindeHTML(i)}</section>`).join('')}</div>
    <div class="pager-puntos">${Array.from({ length: n }, (_, i) => `<button class="punto ${i === paginaFinde ? 'on' : ''}" data-pagina="${i}" aria-label="${['Este finde', 'El que viene', 'En 2 semanas'][i]}"></button>`).join('')}<span class="muted">desliza ↔</span></div>`;
}
function montarPaginador() {
  const p = document.querySelector('[data-pager]'); if (!p) return;
  if (!p._pg) {
    p._pg = 1; let t = 0;
    p.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { paginaFinde = Math.round(p.scrollLeft / p.clientWidth);
      document.querySelectorAll('.pager-puntos .punto').forEach((b, i) => b.classList.toggle('on', i === paginaFinde)); }, 80); }, { passive: true });
  }
  p.scrollLeft = paginaFinde * p.clientWidth;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-pagina]'); if (b) { const p = document.querySelector('[data-pager]'); paginaFinde = +b.dataset.pagina; if (p) p.scrollTo({ left: paginaFinde * p.clientWidth, behavior: 'smooth' }); } });
