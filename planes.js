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
  try {
    await colPlanes().add({ sitioId, destino, isla, fecha: d.fecha, hasta: d.hasta && d.hasta > d.fecha ? d.hasta : '', nota: String(d.nota || '').trim().slice(0, 300),
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
function planHTML(p, { conSitio = true, compacto = false } = {}) {
  const s = p.sitioId && sitio(p.sitioId), isla = ISLAS[p.isla] || ISLAS.tenerife, yoVoy = (p.apuntados || []).includes(NUBE.user.uid);
  const fueron = s ? Object.entries(NUBE.marcasGrupo[p.sitioId] || {}).filter(([, m]) => m.estado === 'fuimos').map(([u]) => u) : [];
  const caras = us => us.map(u => `<span class="gm">${carita(perfilDe(u))}<span>${esc(perfilDe(u).nombre)}</span></span>`).join('');
  const titulo = s ? `<button class="plan-s" data-irficha="${esc(s.id)}">${tipoIc(s.tipo)} ${esc(s.nombre)} <small>· ${esc(s.municipio)}</small></button>`
    : `<div class="plan-s">${isla.ic} ${esc(p.destino || 'Plan')}${p.isla && p.isla !== 'tenerife' ? ` <small>· ${esc(isla.nombre)}</small>` : ''}</div>`;
  const foto = s && FOTOS[s.id] ? fotoImg(s.id, 'plan-foto') : '';
  return `<div class="plan ${foto ? 'con-foto' : ''} ${compacto ? 'compacto' : ''}" style="${s ? varsMuni(s.municipio) : '--h:200'}">
    ${conSitio ? `<div class="plan-cab">${foto}<div class="plan-cab-tx"><div class="plan-f">📅 ${esc(fechaPlan(p))}</div>${titulo}</div></div>` : `<div class="plan-f solo">📅 ${esc(fechaPlan(p))}</div>`}
    <div class="plan-cuerpo">
      <div class="muted">Propone ${esc(perfilDe(p.propone).emoji)} ${esc(perfilDe(p.propone).nombre)}${p.nota ? ` · «${esc(p.nota)}»` : ''}</div>
      <div class="gl"><span class="gl-t">🙋 Van (${(p.apuntados || []).length})</span>${caras(p.apuntados || [])}</div>
      ${s ? (fueron.length ? `<div class="gl"><span class="gl-t">✅ Ya lo visitaron</span>${caras(fueron)}</div>` : '<div class="muted">🌱 Nadie del grupo ha ido todavía.</div>') : ''}
      ${planBHTML(p)}
      <div class="acciones">${yoVoy ? `<button class="sec mini" data-plan="no" data-id="${esc(p.id)}">Ya no voy</button>` : `<button class="mini" data-plan="si" data-id="${esc(p.id)}">🙋 Me apunto</button>`}
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
// Cada finde es un bloque: viernes por la tarde (el viernes entero si es festivo), sábado, domingo y el lunes si es
// festivo. Los festivos de entre semana van en su propio bloque. Claves de día: 'AAAA-MM-DD', y 'AAAA-MM-DDT' para la
// tarde del viernes (las mismas que el tiempo).
const nomDia = k => { const f = k.slice(0, 10), w = diaSemana(f); return k.endsWith('T') ? 'Vie tarde' : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][w] + ' ' + +f.slice(8); };
function bloquesCalendario() {
  const sab0 = proximoSabado(), hoy = hoyISO(), ahora = new Date(), r = [];
  const fin = masDias(sab0, 7 * (SEMANAS_CAL - 1) + 1);
  const enFinde = new Set();
  for (let i = 0; i < SEMANAS_CAL; i++) {
    const sab = masDias(sab0, 7 * i), vie = masDias(sab, -1), dom = masDias(sab, 1), lun = masDias(sab, 2);
    const dias = [];
    if (festivo(vie)) dias.push(vie); else if (vie > hoy || (vie === hoy && ahora.getHours() < 20)) dias.push(vie + 'T');
    if (festivo(masDias(vie, -1))) dias.unshift(masDias(vie, -1)); // jueves festivo: puente
    dias.push(sab, dom); if (festivo(lun)) dias.push(lun);
    const ds = dias.filter(k => k.slice(0, 10) >= hoy); ds.forEach(k => enFinde.add(k.slice(0, 10)));
    r.push({ tipo: 'finde', i, sab, dias: ds, desde: masDias(sab, -5), hasta: ds[ds.length - 1].slice(0, 10) > dom ? ds[ds.length - 1].slice(0, 10) : dom });
  }
  festivosEntre(hoy, fin).filter(([f]) => !enFinde.has(f)).forEach(([f]) => r.push({ tipo: 'festivo', sab: f, dias: [f], desde: f, hasta: f }));
  return r.sort((a, b) => a.dias[0].slice(0, 10).localeCompare(b.dias[0].slice(0, 10)));
}
function calendarioHTML() {
  if (!enGrupo()) return '';
  const ps = proximosPlanes(), bloques = bloquesCalendario(), usados = new Set();
  // Primero los festivos sueltos se quedan sus planes; luego cada finde, los de su semana.
  bloques.filter(b => b.tipo === 'festivo').forEach(b => { b.planes = ps.filter(p => p.fecha === b.sab); b.planes.forEach(p => usados.add(p.id)); });
  bloques.filter(b => b.tipo === 'finde').forEach(b => { b.planes = ps.filter(p => !usados.has(p.id) && p.fecha <= b.hasta && finPlan(p) >= b.desde); b.planes.forEach(p => usados.add(p.id)); });
  const filas = bloques.map(b => {
    const abierto = planForm && !planForm.sitioId && planForm.sabado === b.sab;
    const fests = b.dias.map(k => [k, festivo(k)]).filter(([, n]) => n);
    const cuando = b.tipo === 'festivo' ? '🎉 Festivo' : b.i === 0 ? 'Este finde' : b.i === 1 ? 'El que viene' : `En ${b.i} semanas`;
    const f0 = b.dias[0].slice(0, 10), fN = b.dias[b.dias.length - 1].slice(0, 10);
    const rango = f0 === fN ? new Date(f0 + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }) : `${diaCorto(f0)} – ${diaCorto(fN)} ${new Date(fN + 'T12:00').toLocaleDateString('es-ES', { month: 'short' })}`;
    return `<section class="finde ${b.tipo} ${b.planes.length ? 'con-planes' : 'libre'}">
      <div class="finde-cab"><span class="finde-f"><b>${esc(rango)}</b></span><span class="finde-c">${cuando}</span>
        ${abierto ? '' : `<button class="sec mini" data-plan="abrir" data-sabado="${b.sab}" aria-label="Proponer plan">＋ Plan</button>`}</div>
      ${fests.length ? `<div class="fest-l">🎉 ${fests.map(([k, n]) => `<b>${esc(nomDia(k))}</b> ${esc(n)}`).join(' · ')}</div>` : ''}
      ${b.tipo === 'finde' && typeof tiempoFindeMini === 'function' ? tiempoFindeMini(b.sab) : ''}
      ${dispoHTML(b.dias)}
      ${b.planes.map(p => planHTML(p, { compacto: true })).join('')}
      ${abierto ? formPlanHTML(planForm) : ''}</section>`;
  });
  const ultimo = bloques.length ? bloques[bloques.length - 1].hasta : hoyISO();
  const luego = ps.filter(p => !usados.has(p.id) && p.fecha > ultimo);
  return `<h2>📅 Próximos findes y festivos</h2>${miMuni() ? '' : '<p class="muted mini-nota">🎉 Para ver los festivos locales de tu municipio, elígelo en ☰ Más.</p>'}
    <div class="calendario">${filas.join('')}</div>
    ${luego.length ? `<h2>🔭 Más adelante</h2>${luego.map(p => planHTML(p, { compacto: true })).join('')}` : ''}`;
}
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
    <div class="dispo-atajos"><button class="sec mini" data-dias="${k}" data-v="si">👍 Todo libre</button><button class="sec mini" data-dias="${k}" data-v="no">🙅 No puedo</button></div>
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
  if (a === 'abrir') { planForm = b.dataset.sitio ? { sitioId: b.dataset.sitio, sabado: b.dataset.sabado, carrusel: !!b.dataset.carrusel } : { sabado: b.dataset.sabado }; render(); const f = document.querySelector('.plan-form'); if (f) f.scrollIntoView({ block: 'center' }); }
  else if (a === 'cerrar') { planForm = null; render(); }
  else if (a === 'crear') proponerPlan({ sitioId: planForm && planForm.sitioId, destino: val('pl-destino'), isla: val('pl-isla') || 'tenerife', fecha: val('pl-fecha'), hasta: val('pl-hasta'), nota: val('pl-nota'), planB: val('pl-b') });
  else if (a === 'si' || a === 'no') apuntarse(id, a === 'si');
  else if (a === 'cancelar') cancelarPlan(id);
  else if (a === 'b-abrir') { planBForm = id; render(); const f = document.getElementById('pb-' + id); if (f) f.focus(); }
  else if (a === 'b-cerrar') { planBForm = null; render(); }
  else if (a === 'b-guardar') { const b = leerB(val('pb-' + id)); if (!b) return alert('Escribe el plan B.'); guardarB(id, b); }
  else if (a === 'b-quitar') guardarB(id, null);
  else if (a === 'b-usar') guardarB(id, { sitioId: b.dataset.sitio, destino: '' });
});
