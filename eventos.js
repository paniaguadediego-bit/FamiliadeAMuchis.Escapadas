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
// Este finde: lo que hay (viernes a domingo).
function eventosFindeHTML(sab) {
  const ev = eventosEntre(isoMas(sab, -1), isoMas(sab, 1));
  return ev.length ? `<h2>🎟️ Este finde hay…</h2>${ev.map(([s]) => fichaHTML(s)).join('')}` : '';
}
// En el calendario: chips de los eventos de esa semana.
function eventosSemanaHTML(lun, dom) {
  const ev = eventosEntre(lun, dom);
  return ev.length ? `<div class="ev-chips">${ev.map(([s, f]) => `<button class="chip ev" data-irficha="${esc(s.id)}">🎟️ ${esc(s.nombre)} <small>${esc(new Date(f[0] + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }))}</small></button>`).join('')}</div>` : '';
}
