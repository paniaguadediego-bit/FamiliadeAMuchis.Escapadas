'use strict';
// 🏠 Planes (antes «Este finde»): tiempo en 6 zonas (Open-Meteo), 🎲 Sorpréndeme y «más cerca de mí».
// La ubicación del móvil se pide solo al ordenar por cercanía y se queda en memoria: no se guarda en ningún sitio.

const K_TIEMPO = 'esc.tiempo16h', K_SORP = 'esc.sorp'; // 6 zonas, 16 días

// ---------- zonas ----------
// Seis zonas con tiempo muy distinto (elegidas por el usuario). El orden es el de la tabla.
const ZONAS = {
  // `lugar`: el sitio desde donde se pide la previsión (lo que se enseña en el Tiempo). (v41) El Sur pasa de Arona casco
  // (≈ 600 m de altura) a Los Cristianos, en la costa.
  oeste: { ic: '🌅', nom: 'Oeste', lugar: 'Playa San Juan', punto: [28.19, -16.80] },
  sur: { ic: '🏝️', nom: 'Sur', lugar: 'Los Cristianos', punto: [28.05, -16.717] },
  este: { ic: '⚓', nom: 'Este', lugar: 'Santa Cruz', punto: [28.44, -16.29] },
  laguna: { ic: '🏛️', nom: 'La Laguna', lugar: 'La Laguna', punto: [28.487, -16.316] },
  norte: { ic: '🌿', nom: 'Norte', lugar: 'La Orotava', punto: [28.39, -16.52] },
  teide: { ic: '🌋', nom: 'Teide y alrededores', lugar: 'Las Cañadas', punto: [28.22, -16.63] }
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
  if (!s.municipio && (!isFinite(s.lat) || s.lat === null)) return '';
  // Teide y alrededores: Las Cañadas (cerca del pico, sin la ladera norte) y la parte alta de La Orotava (Cumbre Dorsal).
  if ((kmEntre([s.lat, s.lon], TEIDE) < 11 && s.lat < 28.33) || (s.municipio === 'La Orotava' && s.lat < 28.35)) return 'teide';
  if (s.municipio === 'Santa Cruz de Tenerife' && s.lat > 28.53) return 'norte'; // costa norte y cumbres de Anaga
  if (s.municipio === 'El Rosario' && s.lat > 28.43) return 'laguna';           // La Esperanza
  for (const [z, ms] of Object.entries(ZONA_MUNI)) if (ms.includes(s.municipio)) return z;
  return 'norte';
}

// ---------- dónde estoy (solo en memoria, para «📍 Más cerca de mí») ----------
let aqui = null, aquiPidiendo = false;
try { localStorage.removeItem('esc.casa'); } catch {} // «Mi casa» ya no existe: se borra lo que quedara guardado
const casa = () => aqui;
function distCasa(s) { return aqui && isFinite(s.lat) && s.lat !== null ? kmEntre(aqui, [s.lat, s.lon]) : null; }
const fmtKm = km => km < 1 ? 'menos de 1 km' : Math.round(km) + ' km';
const distTxt = s => { const k = distCasa(s); return k == null ? '' : `📍 a ${fmtKm(k)} de ti`; };
function pedirAqui() {
  if (aqui || aquiPidiendo) return; if (!navigator.geolocation) return alert('Este móvil no da la ubicación.');
  aquiPidiendo = true;
  navigator.geolocation.getCurrentPosition(p => { aquiPidiendo = false; aqui = [p.coords.latitude, p.coords.longitude]; render(); },
    () => { aquiPidiendo = false; alert('No se pudo saber dónde estás (activa la ubicación).'); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
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
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=weather_code,temperature_2m,precipitation_probability,wind_speed_10m&timezone=Atlantic%2FCanary&forecast_days=16`, { cache: 'no-store' });
    const d = await r.json(), arr = Array.isArray(d) ? d : [d];
    const porZona = {};
    zs.forEach((z, i) => {
      const x = arr[i] && arr[i].daily; if (!x) return;
      porZona[z] = {}; x.time.forEach((f, j) => { porZona[z][f] = { c: x.weather_code[j], max: x.temperature_2m_max[j], min: x.temperature_2m_min[j], p: x.precipitation_probability_max[j], v: x.wind_speed_10m_max[j] }; });
      // La tarde (14 a 20 h) de cada día, con la previsión por horas: se guarda como «AAAA-MM-DDT» (viernes y vísperas de festivo).
      const h = arr[i].hourly; if (!h) return;
      const tardes = {};
      h.time.forEach((t, j) => { const f = t.slice(0, 10), hora = +t.slice(11, 13); if (hora < 14 || hora > 20) return;
        const a = tardes[f] = tardes[f] || { c: 0, max: -99, min: 99, p: 0, v: 0 };
        a.c = Math.max(a.c, h.weather_code[j] ?? 0); a.max = Math.max(a.max, h.temperature_2m[j]); a.min = Math.min(a.min, h.temperature_2m[j]);
        a.p = Math.max(a.p, h.precipitation_probability[j] ?? 0); a.v = Math.max(a.v, h.wind_speed_10m[j] ?? 0); });
      for (const [f, a] of Object.entries(tardes)) porZona[z][f + 'T'] = a;
    });
    if (Object.keys(porZona).length) { tiempo = { t: Date.now(), z: porZona }; save(K_TIEMPO, tiempo); if (tab === 'finde' || tab === 'tiempo') render(); }
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
  if (s.tipo === 'playa') { const ok = t.c <= 2 && t.p < 30 && t.max >= 21;
    return { ok, nota: `${cielo(t.c)[0]} ${Math.round(t.max)}°`, por: ok || lluvia ? '' : t.max < 21 ? `Fresco para playa (${Math.round(t.max)}°)` : 'Poco sol para playa' }; }
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
// Días para 🎲 Sorpréndeme: viernes por la tarde (o el viernes entero si es festivo), sábado y domingo de este
// finde, y los festivos de las próximas 4 semanas. [clave del tiempo, nombre corto]; la clave «AAAA-MM-DDT» es la tarde.
function diasSorp() {
  const sab = proximoSabado(), vie = masDias(sab, -1), hoy = hoyISO(), r = [];
  const tardeYa = vie < hoy || (vie === hoy && new Date().getHours() >= 20);
  if (festivo(vie) && vie >= hoy) r.push([vie, '🎉 Viernes']); else if (!tardeYa) r.push([vie + 'T', 'Viernes tarde']);
  if (sab >= hoy) r.push([sab, 'Sábado']); r.push([masDias(sab, 1), 'Domingo']);
  const ya = new Set(r.map(([f]) => f.slice(0, 10)));
  festivosEntre(hoy, masDias(hoy, 28)).filter(([f]) => !ya.has(f) && ![0, 6].includes(diaSemana(f))).forEach(([f]) => {
    const v = masDias(f, -1); if (esVispera(v) && tardeAunVale(v)) r.push([v + 'T', '🌆 ' + DSEM[diaSemana(v)].toLowerCase() + ' ' + +v.slice(8) + ' tarde']);
    r.push([f, '🎉 ' + new Date(f + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })]); });
  return r;
}
// Findes con previsión (Open-Meteo da 16 días): este, el que viene y, a veces, el siguiente.
let findeTiempo = 0; // cuál se ve en la tabla de Este finde
function findesConTiempo() {
  const t = leerTiempo(); if (!t) return [];
  const sab0 = (diasFinde()[0] || [hoyISO()])[0], dSab = new Date(sab0 + 'T12:00'); if (dSab.getDay() === 0) dSab.setDate(dSab.getDate() - 1);
  const iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10), r = [];
  for (let i = 0; i < 3; i++) {
    const a = new Date(dSab); a.setDate(dSab.getDate() + 7 * i); const b = new Date(a); b.setDate(a.getDate() + 1); const v = new Date(a); v.setDate(a.getDate() - 1);
    const ahora = new Date(), tardeYa = iso(v) < hoyISO() || (iso(v) === hoyISO() && ahora.getHours() >= 20);
    const dias = [[iso(v) + 'T', 'Viernes tarde'], [iso(a), 'Sábado'], [iso(b), 'Domingo']].filter(([f]) => (f.endsWith('T') ? !tardeYa : f >= hoyISO()) && tiempoDe('norte', f));
    if (dias.length) r.push({ sab: iso(a), dias, nom: i === 0 ? 'Este finde' : i === 1 ? 'El que viene' : 'En 2 semanas' });
  }
  return r;
}
function tiempoHTML() {
  if (!leerTiempo()) return `<div class="card muted">${navigator.onLine ? '⏳ Buscando el tiempo…' : 'Sin conexión: el tiempo saldrá cuando vuelva internet.'}</div>`;
  const fs = findesConTiempo(); if (!fs.length) return '<div class="card muted">Sin previsión para el finde todavía.</div>';
  if (findeTiempo >= fs.length) findeTiempo = 0;
  const F = fs[findeTiempo], dias = F.dias;
  const filas = Object.entries(ZONAS).map(([z, Z]) => `<tr><th>${Z.ic} ${Z.lugar}</th>${dias.map(([f]) => {
    const t = tiempoDe(z, f); if (!t) return '<td class="muted">—</td>';
    const [ic, txt] = cielo(t.c);
    return `<td title="${esc(txt)}"><span class="t-ic">${ic}</span> <b>${Math.round(t.max)}°</b><span class="muted">/${Math.round(t.min)}°</span>${t.p >= 20 ? `<div class="t-p">💧 ${t.p}%</div>` : ''}${t.v >= 40 ? `<div class="t-p">💨 ${Math.round(t.v)} km/h</div>` : ''}</td>`; }).join('')}</tr>`).join('');
  const hace = Math.round((Date.now() - tiempo.t) / 3600e3), lejos = findeTiempo > 0;
  return `<div class="card tiempo">${fs.length > 1 ? `<div class="chips t-findes">${fs.map((x, i) => `<button class="chip ${i === findeTiempo ? 'on' : ''}" data-findetiempo="${i}">${esc(x.nom)} <small>${+x.sab.slice(8)}</small></button>`).join('')}</div>` : ''}
    <table><thead><tr><th></th>${dias.map(([f, n]) => `<th>${n.replace(' tarde', '<br><small>tarde</small>')} ${+f.slice(8, 10)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
    <div class="muted t-pie">${lejos ? '⚠️ Previsión a más de una semana: puede cambiar · ' : ''}Open-Meteo · ${hace < 1 ? 'actualizado hace poco' : `de hace ${hace} h`}</div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-findetiempo]'); if (b) { findeTiempo = +b.dataset.findetiempo; render(); } });
// Una línea con el tiempo del sábado (y domingo) en cada zona, para el calendario de findes.
// En el calendario de findes: solo si se prevé lluvia (da igual la temperatura). Viernes tarde, sábado y domingo.
function tiempoFindeMini(sab) {
  if (!leerTiempo()) return '';
  const iso = (n) => { const d = new Date(sab + 'T12:00'); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const dias = [[iso(-1) + 'T', 'vie tarde'], [sab, 'sáb'], [iso(1), 'dom']].filter(([f]) => (f.endsWith('T') ? f.slice(0, 10) >= hoyISO() : f >= hoyISO()) && tiempoDe('norte', f));
  const llueve = x => x && (x.p >= 50 || (x.c >= 51 && x.c <= 99 && x.c !== 45 && x.c !== 48));
  const zonas = Object.entries(ZONAS).map(([z, Z]) => [Z, dias.filter(([f]) => llueve(tiempoDe(z, f))).map(([, n]) => n)]).filter(([, ds]) => ds.length);
  if (!zonas.length) return '';
  return `<button class="t-lluvia" data-tab="tiempo">🌧️ Lluvia: ${zonas.map(([Z, ds]) => `${esc(Z.lugar)} <small>(${ds.join(', ')})</small>`).join(' · ')}</button>`;
}

// ---------- 🌤️ pestaña Tiempo ----------
function proximosDiasHTML() {
  const t = leerTiempo(); if (!t) return '';
  const dias = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); dias.push(new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)); }
  const ds = dias.filter(f => tiempoDe('norte', f)); if (!ds.length) return '';
  const cab = ds.map(f => { const d = new Date(f + 'T12:00'); return `<th class="${[0, 6].includes(d.getDay()) ? 'finde-dia' : ''}">${d.toLocaleDateString('es-ES', { weekday: 'narrow' }).toUpperCase()}<br><small>${d.getDate()}</small></th>`; }).join('');
  return `<div class="card tiempo semana"><table><thead><tr><th></th>${cab}</tr></thead><tbody>${Object.entries(ZONAS).map(([z, Z]) => `<tr><th title="${esc(Z.lugar)}">${Z.ic}</th>${ds.map(f => { const x = tiempoDe(z, f); if (!x) return '<td>—</td>'; const [ic, txt] = cielo(x.c);
    return `<td title="${esc(txt)} · ${x.p}% lluvia"><span class="t-ic">${ic}</span><br><b>${Math.round(x.max)}°</b>${x.p >= 40 ? `<div class="t-p">💧${x.p}</div>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
    <div class="leyenda">${Object.values(ZONAS).map(Z => `${Z.ic} ${Z.lugar}`).join(' · ')}</div></div>`;
}
function viewTiempo() {
  pedirTiempo();
  return `<h2>🌤️ El fin de semana</h2>${tiempoHTML()}
    <h2>📆 Los próximos días</h2>${proximosDiasHTML() || '<div class="card muted">Sin previsión todavía.</div>'}
    <p class="muted">Previsión de Open-Meteo en seis puntos de la isla, uno por zona: ${Object.values(ZONAS).map(Z => `${esc(Z.lugar)} (${esc(Z.nom)})`).join(', ')}. En la montaña y en el norte el tiempo cambia rápido: miradlo otra vez antes de salir.</p>`;
}
// Resumen para Este finde: qué zonas tienen buen tiempo y cuáles no (viernes tarde a domingo).
function tiempoResumenHTML() {
  if (!leerTiempo()) { pedirTiempo(); return `<div class="card muted">⏳ Buscando el tiempo… <button class="sec mini" data-tab="tiempo">Ver el tiempo ›</button></div>`; }
  const F = findesConTiempo()[0]; if (!F) return '';
  const grupos = { bueno: [], regular: [], malo: [] };
  for (const [z, Z] of Object.entries(ZONAS)) {
    const ts = F.dias.map(([f]) => tiempoDe(z, f)).filter(Boolean); if (!ts.length) continue;
    const malo = ts.some(x => x.p >= 50 || (x.c >= 51 && x.c !== 45 && x.c !== 48)) || (z === 'teide' && ts.some(x => x.v >= 60));
    const bueno = ts.every(x => x.c <= 2 && x.p < 30 && x.v < 40);
    grupos[malo ? 'malo' : bueno ? 'bueno' : 'regular'].push(Z.lugar);
  }
  const max = Math.max(...Object.keys(ZONAS).flatMap(z => F.dias.map(([f]) => (tiempoDe(z, f) || {}).max || -99)));
  const linea = (ic, txt, l) => l.length ? `<div class="tr-l">${ic} <b>${txt}:</b> ${esc(l.join(', '))}</div>` : '';
  return `<div class="card tiempo-res" data-tab="tiempo" role="button">
    ${linea('☀️', 'Buen tiempo', grupos.bueno)}${linea('⛅', 'Regular', grupos.regular)}${linea('🌧️', 'Mal tiempo', grupos.malo)}
    <div class="tr-pie">${max > -99 ? `Hasta ${Math.round(max)}° · ` : ''}${esc(F.dias.map(([, n]) => n.toLowerCase()).join(', '))} <span class="tr-ver">Ver el tiempo ›</span></div></div>`;
}

// ---------- 🎲 Sorpréndeme ----------
const RATOS = { rato: ['☕', 'Un rato', 25], media: ['🕐', 'Media jornada', 50], dia: ['🎒', 'Día entero', 999] };
let sorp = null, sorpId = null, sorpVistos = [];
const leerSorp = () => sorp || (sorp = load(K_SORP, { rato: 'media', quien: 'nadie', dia: 0 }));
function candidatos() {
  leerSorp();
  const dias = diasSorp(), f = (dias[sorp.dia] || dias[0] || [hoyISO()])[0];
  return SITIOS.filter(s => {
    if (s.tipo === 'evento') return false;
    const m = marca(s.id).estado;
    if (m === 'fuimos' || m === 'no') return false;
    if (sorp.quien === 'nadie' && typeof enGrupo === 'function' && enGrupo() && !nadieFue(s.id)) return false;
    if (sorp.rato === 'rato' && s.tipo === 'sendero') return false;
    if (sorp.rato !== 'dia' && /alta/i.test(s.dificultad || '')) return false;
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
  const dias = diasSorp();
  const chips = (k, ops) => `<div class="chips">${ops.map(([v, n]) => `<button class="chip ${String(sorp[k]) === String(v) ? 'on' : ''}" data-sorp="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
  let res = '';
  if (sorpId) {
    const s = sitio(sorpId);
    if (s) {
      const f = (dias[sorp.dia] || dias[0] || [hoyISO()])[0], tv = tiempoVale(s, f), por = [];
      if (tv.nota) por.push(`${tv.nota} (${ZONAS[zonaDe(s)].nom})`);
      if (typeof enGrupo === 'function' && enGrupo()) { const qq = otrosEn(s.id).quiero.length; por.push(nadieFue(s.id) ? 'nadie del grupo ha ido' : 'tú no has ido'); if (qq) por.push(`${qq} del grupo quiere${qq > 1 ? 'n' : ''} ir`); }
      if (marca(s.id).estado === 'quiero') por.push('lo tenías en 🔖');
      abiertas.add(s.id);
      res = `<div class="sorp-ban banner-plano" style="${varsMuni(s.municipio)}">${fotoImg(s.id, 'banner-foto')}<div class="banner-tx"><span class="banner-ic">${tipoIc(s.tipo)}</span>
        <span class="banner-n"><b>${esc(s.nombre)}</b><small>${esc(s.municipio)} · ${esc(por.join(' · '))}</small></span></div></div>${fichaHTML(s)}`;
    }
  } else if (sorpId === '') res = '<div class="card muted">No encuentro nada que encaje. Prueba con más tiempo o «que yo no haya ido».</div>';
  return `<div class="card sorp">
    ${dias.length > 1 ? chips('dia', dias.map(([f, n], i) => [i, n + (festivo(f) && !n.startsWith('🎉') ? ' 🎉' : '')])) : ''}
    ${festivo((dias[sorp.dia] || dias[0] || [''])[0]) ? `<div class="muted fest-nota">🎉 ${esc(festivo((dias[sorp.dia] || dias[0])[0]))}</div>` : ''}
    ${chips('rato', Object.entries(RATOS).map(([k, [ic, n]]) => [k, ic + ' ' + n]))}
    ${typeof enGrupo === 'function' && enGrupo() ? chips('quien', [['nadie', '🌱 Que nadie haya ido'], ['yo', '🙋 Que yo no haya ido']]) : ''}
    <button data-sortear>🎲 ${sorpId ? 'Otra idea' : 'Sorpréndeme'}</button>
</div>${res}`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-sorp]');
  if (c) { leerSorp(); sorp[c.dataset.sorp] = c.dataset.sorp === 'dia' ? +c.dataset.v : c.dataset.v; save(K_SORP, sorp); sorpVistos = []; if (sorpId) sortear(); render(); return; }
  if (e.target.closest('[data-sortear]')) { sortear(); render(); const r = document.querySelector('.sorp'); if (r) r.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
});
// ---------- la pestaña ----------
// ---------- 🏠 Portada de Planes (v30): bienvenida, botones rápidos, carruseles y calendario ----------
// Resumen del tiempo del sábado en una línea: dónde hace mejor y si llueve en algún sitio.
function tiempoCorto(sab) {
  if (!leerTiempo()) return '';
  const zs = Object.entries(ZONAS).map(([z, Z]) => [Z, tiempoDe(z, sab)]).filter(([, t]) => t);
  if (!zs.length) return '';
  const mejor = zs.slice().sort((a, b) => a[1].c - b[1].c || b[1].max - a[1].max)[0];
  const lluvia = zs.filter(([, t]) => t.p >= 50 || (t.c >= 51 && t.c !== 45 && t.c !== 48)).map(([Z]) => Z.nom);
  return `${cielo(mejor[1].c)[0]} ${Math.round(mejor[1].max)}° en ${mejor[0].nom}${lluvia.length ? ` · 🌧️ lluvia en ${lluvia.slice(0, 2).join(' y ')}` : ''}`;
}
let panelPlanes = ''; // '' | 'plan' | 'sorp' | 'agenda': lo que se despliega bajo los botones rápidos
function portadaHTML() {
  const sab = proximoSabado(), v = masDias(sab, -1), dom = masDias(sab, 1), g = typeof enGrupo === 'function' && enGrupo();
  const d = x => new Date(x + 'T12:00'), hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = g && NUBE.perfil && NUBE.perfil.nombre ? ', ' + NUBE.perfil.nombre.split(' ')[0] : '';
  const rango = `${d(v).getDate()}-${d(dom).getDate()} ${d(dom).toLocaleDateString('es-ES', { month: 'short' })}`;
  const ps = g ? proximosPlanes().filter(p => p.fecha <= dom && finPlan(p) >= v) : [];
  const voy = ps.filter(p => (p.apuntados || []).includes(NUBE.user.uid)).length;
  const evs = typeof eventosEntre === 'function' ? eventosEntre(v, dom).length : 0;
  const mej = g && typeof mejorDia === 'function' ? mejorDia() : null, t = tiempoCorto(sab);
  const lineas = [
    g ? (ps.length ? `🙋 ${ps.length} plan${ps.length > 1 ? 'es' : ''} este finde${voy ? ` · vas a ${voy}` : ''}` : '🙋 Aún no hay planes este finde') : '👥 Entra en el grupo para ver los planes',
    evs ? `🎟️ ${evs} evento${evs > 1 ? 's' : ''} en la isla` : '',
    mej ? `<button class="enlace claro" data-cal="${mej.f}" data-calmesir="${mej.f.slice(0, 7)}" data-irCal="1">💫 Mejor día: ${esc(nomDia(mej.k))}${mej.k.endsWith('T') ? ' ' + +mej.f.slice(8) : ''} (${mej.si}/${(NUBE.grupo.miembros || []).length}) ›</button>` : ''
  ].filter(Boolean);
  const foto = fotoSrc('teide') ? `<img class="portada-foto" src="${esc(fotoSrc('teide'))}" alt="" loading="lazy" onerror="this.remove()">` : '';
  const boton = (k, ic, n) => `<button class="rapido ${panelPlanes === k ? 'on' : ''}" ${k === 'tiempo' ? 'data-tab="tiempo"' : `data-panel="${k}"`}><span>${ic}</span>${n}</button>`;
  let panel = '';
  if (panelPlanes === 'plan') panel = g ? formPlanHTML(planForm && planForm.rapido ? planForm : (planForm = { sabado: sab, rapido: true })) : '<div class="card muted centro">👥 Para proponer planes, entra en el grupo (pestaña Grupo).</div>';
  else if (panelPlanes === 'sorp') panel = sorpresaHTML();
  else if (panelPlanes === 'agenda' && typeof agendaHTML === 'function') panel = agendaHTML();
  return `<div class="portada-h">${foto}<div class="portada-tx"><div class="portada-hola">${esc(saludo + nombre)} 👋</div>
      <div class="portada-f">Este finde · ${esc(rango)}</div>${lineas.map(l => `<div class="portada-l">${l}</div>`).join('')}</div></div>
    <div class="rapidos">${boton('plan', '➕', 'Plan')}${boton('sorp', '🎲', 'Sorpréndeme')}${boton('agenda', '🎭', '¿Qué hay?')}</div>
    ${panel ? `<div class="panel-rapido">${panel}</div>` : ''}`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-panel]'); if (b) { panelPlanes = panelPlanes === b.dataset.panel ? '' : b.dataset.panel; if (panelPlanes === 'plan') planForm = { sabado: proximoSabado(), rapido: true }; else if (planForm && planForm.rapido) planForm = null; render(); return; }
  const c = e.target.closest('[data-ircal]'); if (c) setTimeout(() => { const x = document.querySelector('.dia-sel'); if (x) x.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
});
function viewFindeS5() {
  if (!SITIOS.length) return '<div class="vacio"><div class="grande">⏳</div>Cargando sitios…</div>';
  pedirTiempo(); // para el resumen del tiempo, el aviso de lluvia del calendario y Sorpréndeme
  if (panelPlanes === 'plan' && !(planForm && planForm.rapido)) panelPlanes = ''; // el plan ya se creó o se cerró
  const quiero = SITIOS.filter(s => marca(s.id).estado === 'quiero');
  const grupoQuiere = typeof enGrupo === 'function' && enGrupo()
    ? SITIOS.filter(s => marca(s.id).estado !== 'fuimos' && marca(s.id).estado !== 'quiero' && otrosEn(s.id).quiero.length).slice(0, 6) : [];
  const ganas = [...quiero, ...grupoQuiere];
  return `<div class="planes">${portadaHTML()}
    ${paginadorFindes()}
    ${typeof enGrupo === 'function' && enGrupo() ? calendarioHTML() : ''}
    <h2>🔖 Con ganas de ir</h2>
    ${ganas.length ? `<div class="ev-carrusel ganas">${ganas.map(s => `<div class="ev-tarjeta"><button class="ev-ban banner-plano" data-irficha="${esc(s.id)}" style="${varsMuni(s.municipio)}">${fotoImg(s.id, 'banner-foto')}
      <span class="banner-tx"><span class="banner-n"><span class="ev-cuenta c-idea">${marca(s.id).estado === 'quiero' ? '🔖 Tú' : `🔖 ${otrosEn(s.id).quiero.map(([u]) => esc(perfilDe(u).emoji)).join('')}`}</span><b>${tipoIc(s.tipo)} ${esc(s.nombre)}</b><small>${esc(s.municipio)}</small></span></span></button></div>`).join('')}</div>`
      : '<div class="card muted centro">Todavía nada. En 🧭 Explorar, abre una ficha y toca «🔖 Quiero ir».</div>'}
    ${cuentaHTML()}</div>`;
}
addEventListener('online', () => { if (typeof tab !== 'undefined' && (tab === 'finde' || tab === 'tiempo')) { if (leerTiempo()) tiempo.t = 0; pedirTiempo(); } });
