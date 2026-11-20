'use strict';
// 🏠 Este finde (S5): tiempo en 6 zonas (Open-Meteo), 🎲 Sorpréndeme y distancia desde casa.
// La ubicación de casa se guarda SOLO en este móvil (localStorage), nunca en la nube ni en el repo.

const K_CASA = 'esc.casa', K_TIEMPO = 'esc.tiempo16', K_SORP = 'esc.sorp'; // 6 zonas, 16 días

// ---------- zonas ----------
// Seis zonas con tiempo muy distinto (elegidas por el usuario). El orden es el de la tabla.
const ZONAS = {
  oeste: { ic: '🌅', nom: 'Oeste', punto: [28.19, -16.80] },          // Guía de Isora / Playa San Juan
  sur: { ic: '🏝️', nom: 'Sur', punto: [28.08, -16.68] },              // Adeje / Arona
  este: { ic: '⚓', nom: 'Este', punto: [28.44, -16.29] },             // Santa Cruz / Radazul
  laguna: { ic: '🏛️', nom: 'La Laguna', punto: [28.487, -16.316] },
  norte: { ic: '🌿', nom: 'Norte', punto: [28.39, -16.52] },          // valle de La Orotava
  teide: { ic: '🌋', nom: 'Teide y alrededores', punto: [28.22, -16.63] } // Las Cañadas
};
const TEIDE = [28.2724, -16.6425];
const ZONA_MUNI = {
  oeste: ['Santiago del Teide', 'Guía de Isora'],
  sur: ['Adeje', 'Arona', 'San Miguel de Abona', 'Granadilla de Abona', 'Vilaflor de Chasna', 'Arico', 'Fasnia'],
  este: ['Güímar', 'Arafo', 'Candelaria', 'Santa Cruz de Tenerife', 'El Rosario'],
  laguna: ['San Cristóbal de La Laguna', 'Tegueste']
};
function kmEntre([a, b], [c, d]) {
  const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dg = r(d - b);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function zonaDe(s) {
  // Teide y alrededores: Las Cañadas (cerca del pico, sin la ladera norte) y la parte alta de La Orotava (Cumbre Dorsal).
  if ((kmEntre([s.lat, s.lon], TEIDE) < 11 && s.lat < 28.33) || (s.municipio === 'La Orotava' && s.lat < 28.35)) return 'teide';
  if (s.municipio === 'Santa Cruz de Tenerife' && s.lat > 28.53) return 'norte'; // costa norte y cumbres de Anaga
  if (s.municipio === 'El Rosario' && s.lat > 28.43) return 'laguna';           // La Esperanza
  for (const [z, ms] of Object.entries(ZONA_MUNI)) if (ms.includes(s.municipio)) return z;
  return 'norte';
}

// ---------- casa (solo en el móvil) ----------
const casa = () => { const c = load(K_CASA, null); return Array.isArray(c) && c.length === 2 ? c : null; };
// En coche, aproximado: la carretera da un 40 % de vuelta y ~55 km/h de media.
const minCoche = km => Math.round(km * 1.4 / 55 * 60);
function distCasa(s) { const c = casa(); return c ? kmEntre(c, [s.lat, s.lon]) : null; }
const fmtKm = km => km < 1 ? 'menos de 1 km' : Math.round(km) + ' km';
const fmtMin = m => m < 60 ? `${Math.max(5, Math.round(m / 5) * 5)} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60 / 5) * 5).padStart(2, '0')}`;
const distTxt = s => { const k = distCasa(s); return k == null ? '' : `🏠 a ${fmtKm(k)} de casa · ≈ ${fmtMin(minCoche(k))} en coche`; };
function guardarCasa() {
  if (!navigator.geolocation) return alert('Este móvil no da la ubicación.');
  navigator.geolocation.getCurrentPosition(p => {
    const c = [+p.coords.latitude.toFixed(4), +p.coords.longitude.toFixed(4)];
    if (kmEntre(c, TEIDE) > 80) return alert('Parece que no estás en Tenerife. Guárdala cuando estés en casa.');
    save(K_CASA, c); render();
  }, () => alert('No se pudo saber dónde estás (activa la ubicación).'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

// ---------- tiempo (Open-Meteo, sin clave) ----------
const WMO = [[0, '☀️', 'Despejado'], [1, '🌤️', 'Poco nuboso'], [2, '⛅', 'Nubes y claros'], [3, '☁️', 'Nublado'],
  [48, '🌫️', 'Niebla'], [57, '🌦️', 'Llovizna'], [67, '🌧️', 'Lluvia'], [77, '🌨️', 'Nieve'], [82, '🌦️', 'Chubascos'],
  [86, '🌨️', 'Chubascos de nieve'], [99, '⛈️', 'Tormenta']];
const cielo = c => (WMO.find(([n]) => c <= n) || WMO[WMO.length - 1]).slice(1);
// Se lee de localStorage la primera vez que hace falta (finde.js se carga antes que app.js, que trae load/save).
let tiempo, tiempoPidiendo = false;
const leerTiempo = () => { if (tiempo === undefined) tiempo = load(K_TIEMPO, null); return tiempo; };
async function pedirTiempo() {
  if (tiempoPidiendo || !navigator.onLine) return;
  leerTiempo();
  if (tiempo && Date.now() - tiempo.t < 3 * 3600e3) return; // como mucho cada 3 h
  tiempoPidiendo = true;
  try {
    const zs = Object.keys(ZONAS), la = zs.map(z => ZONAS[z].punto[0]).join(','), lo = zs.map(z => ZONAS[z].punto[1]).join(',');
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Atlantic%2FCanary&forecast_days=16`, { cache: 'no-store' });
    const d = await r.json(), arr = Array.isArray(d) ? d : [d];
    const porZona = {};
    zs.forEach((z, i) => {
      const x = arr[i] && arr[i].daily; if (!x) return;
      porZona[z] = {}; x.time.forEach((f, j) => { porZona[z][f] = { c: x.weather_code[j], max: x.temperature_2m_max[j], min: x.temperature_2m_min[j], p: x.precipitation_probability_max[j], v: x.wind_speed_10m_max[j] }; });
    });
    if (Object.keys(porZona).length) { tiempo = { t: Date.now(), z: porZona }; save(K_TIEMPO, tiempo); if (tab === 'finde') render(); }
  } catch {}
  tiempoPidiendo = false;
}
const tiempoDe = (z, f) => { const t = leerTiempo(); return (t && t.z[z] && t.z[z][f]) || null; };
// ¿Se puede ir a algo así ese día con ese tiempo?
function tiempoVale(s, f) {
  const t = tiempoDe(zonaDe(s), f); if (!t) return { ok: true, nota: '' };
  const lluvia = t.p >= 50 || (t.c >= 51 && t.c !== 3), nieve = (t.c >= 71 && t.c <= 77) || t.c === 85 || t.c === 86;
  if (s.tipo === 'museo') return { ok: true, nota: lluvia ? 'bajo techo ☂️' : '' };
  if (zonaDe(s) === 'teide' && (nieve || t.v >= 60)) return { ok: false };
  if (s.tipo === 'playa') return { ok: t.c <= 2 && t.p < 30 && t.max >= 21, nota: `${cielo(t.c)[0]} ${Math.round(t.max)}°` };
  if (lluvia) return { ok: false };
  if (s.tipo === 'sendero' && t.v >= 50) return { ok: false };
  return { ok: true, nota: `${cielo(t.c)[0]} ${Math.round(t.max)}°` };
}

// ---------- fechas del finde ----------
function diasFinde() {
  const d = new Date(), dia = d.getDay();
  const sab = new Date(d); sab.setDate(d.getDate() + (dia === 0 ? -1 : 6 - dia));
  const dom = new Date(sab); dom.setDate(sab.getDate() + 1);
  const iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  return [[iso(sab), 'Sábado'], [iso(dom), 'Domingo']].filter(([f]) => f >= hoyISO());
}
// Findes con previsión (Open-Meteo da 16 días): este, el que viene y, a veces, el siguiente.
let findeTiempo = 0; // cuál se ve en la tabla de Este finde
function findesConTiempo() {
  const t = leerTiempo(); if (!t) return [];
  const sab0 = (diasFinde()[0] || [hoyISO()])[0], dSab = new Date(sab0 + 'T12:00'); if (dSab.getDay() === 0) dSab.setDate(dSab.getDate() - 1);
  const iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10), r = [];
  for (let i = 0; i < 3; i++) {
    const a = new Date(dSab); a.setDate(dSab.getDate() + 7 * i); const b = new Date(a); b.setDate(a.getDate() + 1);
    const dias = [[iso(a), 'Sábado'], [iso(b), 'Domingo']].filter(([f]) => f >= hoyISO() && tiempoDe('norte', f));
    if (dias.length) r.push({ sab: iso(a), dias, nom: i === 0 ? 'Este finde' : i === 1 ? 'El que viene' : 'En 2 semanas' });
  }
  return r;
}
function tiempoHTML() {
  if (!leerTiempo()) return `<div class="card muted">${navigator.onLine ? '⏳ Buscando el tiempo…' : 'Sin conexión: el tiempo saldrá cuando vuelva internet.'}</div>`;
  const fs = findesConTiempo(); if (!fs.length) return '<div class="card muted">Sin previsión para el finde todavía.</div>';
  if (findeTiempo >= fs.length) findeTiempo = 0;
  const F = fs[findeTiempo], dias = F.dias;
  const filas = Object.entries(ZONAS).map(([z, Z]) => `<tr><th>${Z.ic} ${Z.nom}</th>${dias.map(([f]) => {
    const t = tiempoDe(z, f); if (!t) return '<td class="muted">—</td>';
    const [ic, txt] = cielo(t.c);
    return `<td title="${esc(txt)}"><span class="t-ic">${ic}</span> <b>${Math.round(t.max)}°</b><span class="muted">/${Math.round(t.min)}°</span>${t.p >= 20 ? `<div class="t-p">💧 ${t.p}%</div>` : ''}${t.v >= 40 ? `<div class="t-p">💨 ${Math.round(t.v)} km/h</div>` : ''}</td>`; }).join('')}</tr>`).join('');
  const hace = Math.round((Date.now() - tiempo.t) / 3600e3), lejos = findeTiempo > 0;
  return `<div class="card tiempo">${fs.length > 1 ? `<div class="chips t-findes">${fs.map((x, i) => `<button class="chip ${i === findeTiempo ? 'on' : ''}" data-findetiempo="${i}">${esc(x.nom)} <small>${+x.sab.slice(8)}</small></button>`).join('')}</div>` : ''}
    <table><thead><tr><th></th>${dias.map(([f, n]) => `<th>${n} ${+f.slice(8)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
    <div class="muted t-pie">${lejos ? '⚠️ Previsión a más de una semana: puede cambiar · ' : ''}Open-Meteo · ${hace < 1 ? 'actualizado hace poco' : `de hace ${hace} h`}</div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-findetiempo]'); if (b) { findeTiempo = +b.dataset.findetiempo; render(); } });
// Una línea con el tiempo del sábado (y domingo) en cada zona, para el calendario de findes.
function tiempoFindeMini(sab) {
  if (!leerTiempo()) return '';
  const dom = (() => { const d = new Date(sab + 'T12:00'); d.setDate(d.getDate() + 1); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); })();
  const dias = [sab, dom].filter(f => f >= hoyISO() && tiempoDe('norte', f)); if (!dias.length) return '';
  return `<div class="t-mini" title="Tiempo por zonas (${dias.length > 1 ? 'sábado / domingo' : dias[0] === sab ? 'sábado' : 'domingo'})">${Object.entries(ZONAS).map(([z, Z]) => `<span class="t-z"><small>${Z.ic}</small>${dias.map(f => { const t = tiempoDe(z, f); return t ? `${cielo(t.c)[0]}<b>${Math.round(t.max)}°</b>` : ''; }).join('<i>/</i>')}</span>`).join('')}</div>`;
}

// ---------- 🎲 Sorpréndeme ----------
const RATOS = { rato: ['☕', 'Un rato', 25], media: ['🌤️', 'Media jornada', 50], dia: ['🎒', 'Día entero', 999] };
let sorp = null, sorpId = null, sorpVistos = [];
const leerSorp = () => sorp || (sorp = load(K_SORP, { rato: 'media', quien: 'nadie', dia: 0 }));
function candidatos() {
  leerSorp();
  const dias = diasFinde(), f = (dias[sorp.dia] || dias[0] || [hoyISO()])[0], lim = RATOS[sorp.rato][2];
  return SITIOS.filter(s => {
    if (s.tipo === 'evento') return false;
    const m = marca(s.id).estado;
    if (m === 'fuimos' || m === 'no') return false;
    if (sorp.quien === 'nadie' && typeof enGrupo === 'function' && enGrupo() && !nadieFue(s.id)) return false;
    if (sorp.rato === 'rato' && s.tipo === 'sendero') return false;
    if (sorp.rato !== 'dia' && /alta/i.test(s.dificultad || '')) return false;
    const k = distCasa(s); if (k != null && minCoche(k) > lim) return false;
    return tiempoVale(s, f).ok;
  }).map(s => {
    // Más papeletas si alguien quiere ir y si el tiempo acompaña.
    let w = 1; if (marca(s.id).estado === 'quiero') w += 3;
    if (typeof enGrupo === 'function' && enGrupo()) w += 2 * otrosEn(s.id).quiero.length;
    return [s, w, f];
  });
}
function sortear() {
  const c = candidatos().filter(([s]) => !sorpVistos.includes(s.id)), pool = c.length ? c : candidatos();
  if (!pool.length) { sorpId = ''; return; }
  if (!c.length) sorpVistos = [];
  let r = Math.random() * pool.reduce((a, [, w]) => a + w, 0);
  const elegido = pool.find(([, w]) => (r -= w) <= 0) || pool[0];
  sorpId = elegido[0].id; sorpVistos.push(sorpId);
}
function sorpresaHTML() {
  leerSorp();
  const dias = diasFinde();
  const chips = (k, ops) => `<div class="chips">${ops.map(([v, n]) => `<button class="chip ${String(sorp[k]) === String(v) ? 'on' : ''}" data-sorp="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
  let res = '';
  if (sorpId) {
    const s = sitio(sorpId);
    if (s) {
      const f = (dias[sorp.dia] || dias[0] || [hoyISO()])[0], tv = tiempoVale(s, f), por = [];
      if (tv.nota) por.push(`${tv.nota} (${ZONAS[zonaDe(s)].nom})`);
      if (distCasa(s) != null) por.push('≈ ' + fmtMin(minCoche(distCasa(s))) + ' en coche');
      if (typeof enGrupo === 'function' && enGrupo()) { const qq = otrosEn(s.id).quiero.length; por.push(nadieFue(s.id) ? 'nadie del grupo ha ido' : 'tú no has ido'); if (qq) por.push(`${qq} del grupo quiere${qq > 1 ? 'n' : ''} ir`); }
      if (marca(s.id).estado === 'quiero') por.push('lo tenías en 🔖');
      abiertas.add(s.id);
      res = `<div class="sorp-ban banner-plano" style="${varsMuni(s.municipio)}">${fotoImg(s.id, 'banner-foto')}<div class="banner-tx"><span class="banner-ic">${tipoIc(s.tipo)}</span>
        <span class="banner-n"><b>${esc(s.nombre)}</b><small>${esc(s.municipio)} · ${esc(por.join(' · '))}</small></span></div></div>${fichaHTML(s)}`;
    }
  } else if (sorpId === '') res = '<div class="card muted">No encuentro nada que encaje. Prueba con más tiempo o «que yo no haya ido».</div>';
  return `<div class="card sorp">
    ${dias.length > 1 ? chips('dia', dias.map(([, n], i) => [i, n])) : ''}
    ${chips('rato', Object.entries(RATOS).map(([k, [ic, n]]) => [k, ic + ' ' + n]))}
    ${typeof enGrupo === 'function' && enGrupo() ? chips('quien', [['nadie', '🌱 Que nadie haya ido'], ['yo', '🙋 Que yo no haya ido']]) : ''}
    <button data-sortear>🎲 ${sorpId ? 'Otra idea' : 'Sorpréndeme'}</button>
    ${!casa() ? '<p class="muted">Guarda tu casa en ☰ Más para tener en cuenta lo lejos que está.</p>' : ''}</div>${res}`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-sorp]');
  if (c) { leerSorp(); sorp[c.dataset.sorp] = c.dataset.sorp === 'dia' ? +c.dataset.v : c.dataset.v; save(K_SORP, sorp); sorpVistos = []; if (sorpId) sortear(); render(); return; }
  if (e.target.closest('[data-sortear]')) { sortear(); render(); const r = document.querySelector('.sorp'); if (r) r.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  if (e.target.closest('[data-casa]')) { guardarCasa(); return; }
  if (e.target.closest('[data-casaborrar]') && confirm('¿Olvidar la ubicación de casa en este móvil?')) { localStorage.removeItem(K_CASA); render(); }
});
// Casa en ☰ Más
function casaHTML() {
  const c = casa();
  return `<div class="card"><p class="muted">Para saber lo lejos que queda cada sitio. Se guarda <b>solo en este móvil</b>: no se comparte con el grupo.</p>
    ${c ? `<p>✅ Casa guardada.</p><div class="row"><button class="sec" data-casa>📍 Estoy en casa: actualizar</button><button class="danger" data-casaborrar>Olvidar</button></div>`
      : '<button class="sec" data-casa>📍 Estoy en casa: guardar ubicación</button>'}</div>`;
}

// ---------- la pestaña ----------
function viewFindeS5() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  pedirTiempo();
  const dias = diasFinde(), quiero = SITIOS.filter(s => marca(s.id).estado === 'quiero');
  const grupoQuiere = typeof enGrupo === 'function' && enGrupo()
    ? SITIOS.filter(s => marca(s.id).estado !== 'fuimos' && marca(s.id).estado !== 'quiero' && otrosEn(s.id).quiero.length).slice(0, 6) : [];
  const txtDias = dias.map(([f, n]) => `${n} ${new Date(f + 'T12:00').getDate()}`).join(' y ');
  // Portada: la foto del próximo plan con foto; si no hay, el Teide.
  const prox = typeof proximosPlanes === 'function' && enGrupo() ? proximosPlanes().find(p => p.sitioId && FOTOS[p.sitioId]) : null;
  const fotoPortada = prox ? prox.sitioId : 'teide';
  return `<div class="portada banner-plano" style="--h:${prox ? muniTema(sitio(prox.sitioId).municipio).h : 8}">${fotoImg(fotoPortada, 'banner-foto')}
    <div class="banner-tx"><span class="banner-n"><small>${typeof NUBE !== 'undefined' && NUBE.grupo ? esc(NUBE.grupo.nombre) : 'Escapadas por Tenerife'}</small>
      <b>${esc(txtDias || 'Fin de semana')} de ${esc(new Date().toLocaleDateString('es-ES', { month: 'long' }))}</b>
      ${prox ? `<small>📅 Próximo plan: ${esc(sitio(prox.sitioId).nombre)}</small>` : ''}</span></div></div>
    ${eventosFindeHTML(proximoSabado())}
    <h2>🌤️ El tiempo</h2>${tiempoHTML()}
    ${typeof calendarioHTML === 'function' ? calendarioHTML() : ''}
    <h2>🎲 ¿Qué hacemos?</h2>${sorpresaHTML()}
    ${proximosEventosHTML(proximoSabado())}
    <h2>🔖 Tus ganas de ir</h2>
    ${quiero.length ? quiero.map(fichaHTML).join('') : '<div class="card muted">Todavía nada. En 📍 Sitios, abre una ficha y toca «🔖 Quiero ir».</div>'}
    ${grupoQuiere.length ? `<h2>👥 Al grupo le apetece</h2>${grupoQuiere.map(fichaHTML).join('')}` : ''}
    ${cuentaHTML()}
    <button class="sec" data-tab="sitios">📍 Ver todos los sitios</button>`;
}
addEventListener('online', () => { if (typeof tab !== 'undefined' && tab === 'finde') { if (leerTiempo()) tiempo.t = 0; pedirTiempo(); } });
