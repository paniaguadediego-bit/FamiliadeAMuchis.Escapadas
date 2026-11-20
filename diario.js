'use strict';
// 📔 Diario (lo que has ido marcando con ✅, por fecha) y 🖨️ Resumen del año para guardar en PDF.
// El PDF lo hace el propio móvil: se pinta una hoja y se abre «Imprimir → Guardar como PDF» (sin librerías).

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const misFuimos = () => SITIOS.filter(s => marca(s.id).estado === 'fuimos').map(s => [s, marca(s.id)]);

// En la ficha de un sitio con ✅: el día que fuisteis (se puede cambiar o dejar vacío si no os acordáis).
function fechaFuimosHTML(s) {
  const m = marca(s.id); if (m.estado !== 'fuimos') return '';
  return `<div class="fecha-fuimos"><label for="ff-${esc(s.id)}">📅 Visitado el</label>
    <input type="date" id="ff-${esc(s.id)}" data-fecha="${esc(s.id)}" value="${esc(m.fecha || '')}" max="${hoyISO()}">
    ${m.fecha ? '' : '<span class="muted">sin fecha</span>'}</div>`;
}
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset || !t.dataset.fecha) return;
  setMarca(t.dataset.fecha, { fecha: t.value || '' });
});

// ---------- 📔 Diario ----------
function diarioHTML() {
  const lista = misFuimos();
  if (!lista.length) return '<div class="card muted">Aquí aparecerá cada sitio que marques con ✅ Visitado, por fecha, con tus ⭐ y notas.</div>';
  const grupos = {};
  lista.forEach(([s, m]) => { const k = m.fecha ? m.fecha.slice(0, 7) : 'zz'; (grupos[k] = grupos[k] || []).push([s, m]); });
  return Object.keys(grupos).sort().reverse().map(k => {
    const tit = k === 'zz' ? 'Sin fecha' : `${MESES[+k.slice(5) - 1]} ${k.slice(0, 4)}`;
    const items = grupos[k].sort((a, b) => (b[1].fecha || '').localeCompare(a[1].fecha || ''));
    return `<details class="diario-mes" ${k === Object.keys(grupos).sort().reverse()[0] ? 'open' : ''}><summary>${esc(tit[0].toUpperCase() + tit.slice(1))} <span class="muted">· ${items.length}</span></summary>
      ${items.map(([s, m]) => `<button class="reciente" data-irficha="${esc(s.id)}"><span class="d-dia">${m.fecha ? +m.fecha.slice(8) : '·'}</span>
        <span>${tipoIc(s.tipo)} <b>${esc(s.nombre)}</b> <small class="muted">${esc(s.municipio)}</small>${m.estrellas ? ` <small>${'⭐'.repeat(m.estrellas)}</small>` : ''}${m.nota ? `<br><i class="muted">«${esc(m.nota)}»</i>` : ''}</span></button>`).join('')}
    </details>`;
  }).join('');
}

// ---------- 🖨️ Resumen del año ----------
function añosConVisitas() {
  const a = new Set([new Date().getFullYear()]);
  misFuimos().forEach(([, m]) => { if (m.fecha) a.add(+m.fecha.slice(0, 4)); });
  return [...a].sort((x, y) => y - x);
}
function resumenBotonesHTML() {
  return `<div class="card"><p class="muted">Una hoja con lo que habéis hecho en el año: sitios, municipios, mapa y quién lleva más. Al abrirla, elige «Guardar como PDF».</p>
    <div class="acciones">${añosConVisitas().map(a => `<button class="sec mini" data-resumen="${a}">🖨️ ${a}</button>`).join('')}</div></div>`;
}
// Mapa de la isla en SVG con los sitios del año (silueta aproximada de app.js).
function mapaResumenSVG(sitios) {
  const W = 360, H = 260, lo0 = -16.95, lo1 = -16.08, la0 = 27.97, la1 = 28.62;
  const X = lo => ((lo - lo0) / (lo1 - lo0) * W).toFixed(1), Y = la => ((la1 - la) / (la1 - la0) * H).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" class="r-mapa"><path d="M${ISLA.map(([lo, la]) => X(lo) + ',' + Y(la)).join('L')}Z" fill="#e9e5d6" stroke="#9c957d" stroke-width="1.5"/>
    ${sitios.map(s => `<circle cx="${X(s.lon)}" cy="${Y(s.lat)}" r="4.5" fill="#1d7a3a" stroke="#fff" stroke-width="1.5"/>`).join('')}</svg>`;
}
function resumenHTML(año) {
  const del = misFuimos().filter(([, m]) => m.fecha && m.fecha.startsWith(String(año))).sort((a, b) => a[1].fecha.localeCompare(b[1].fecha));
  const sinFecha = misFuimos().filter(([, m]) => !m.fecha).length;
  const munis = new Set(del.map(([s]) => s.municipio)), tipos = {};
  del.forEach(([s]) => { tipos[s.tipo] = (tipos[s.tipo] || 0) + 1; });
  const tipoTop = Object.entries(tipos).sort((a, b) => b[1] - a[1])[0];
  const mejor = del.filter(([, m]) => m.estrellas).sort((a, b) => b[1].estrellas - a[1].estrellas)[0];
  const quien = typeof NUBE !== 'undefined' && NUBE.perfil ? NUBE.perfil : null;
  // Del grupo: cuántos sitios marcó cada uno con ✅ y fecha de ese año.
  let ranking = '';
  if (typeof enGrupo === 'function' && enGrupo()) {
    const c = {};
    for (const ms of Object.values(NUBE.marcasGrupo)) for (const [u, m] of Object.entries(ms)) if (m.estado === 'fuimos' && String(m.fecha || '').startsWith(String(año))) c[u] = (c[u] || 0) + 1;
    const filas = Object.entries(c).sort((a, b) => b[1] - a[1]);
    if (filas.length) ranking = `<h3>👥 ${esc(NUBE.grupo.nombre)}</h3><table class="r-tabla">${filas.map(([u, n], i) => `<tr><td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</td><td>${esc(perfilDe(u).emoji)} ${esc(perfilDe(u).nombre)}</td><td><b>${n}</b> sitio${n === 1 ? '' : 's'}</td></tr>`).join('')}</table>`;
  }
  const porMes = {}; del.forEach(([s, m]) => { (porMes[+m.fecha.slice(5, 7)] = porMes[+m.fecha.slice(5, 7)] || []).push([s, m]); });
  return `<div class="r-hoja">
    <div class="r-cab"><img src="icons/icon-192.png" alt=""><div><h1>Escapadas ${año}</h1><div>${quien ? esc(quien.emoji + ' ' + quien.nombre) + ' · ' : ''}Tenerife</div></div></div>
    <div class="r-cifras"><div><b>${del.length}</b>sitio${del.length === 1 ? '' : 's'}</div><div><b>${munis.size}</b>de 31 municipios</div><div><b>${tipoTop ? tipoIc(tipoTop[0]) : '—'}</b>${tipoTop ? esc(tipoNom(tipoTop[0])) : 'tipo favorito'}</div></div>
    ${mejor ? `<p class="r-mejor">⭐ Lo mejor del año: <b>${esc(mejor[0].nombre)}</b> (${'⭐'.repeat(mejor[1].estrellas)})</p>` : ''}
    ${mapaResumenSVG(del.map(([s]) => s))}
    ${ranking}
    <h3>📔 Mes a mes</h3>
    ${del.length ? Object.keys(porMes).sort((a, b) => a - b).map(n => `<div class="r-mes"><b>${esc(MESES[n - 1][0].toUpperCase() + MESES[n - 1].slice(1))}</b><ul>${porMes[n].map(([s, m]) => `<li>${+m.fecha.slice(8)} · ${tipoIc(s.tipo)} ${esc(s.nombre)} <span class="muted">(${esc(s.municipio)})</span>${m.estrellas ? ' ' + '⭐'.repeat(m.estrellas) : ''}${m.nota ? `<br><i>«${esc(m.nota)}»</i>` : ''}</li>`).join('')}</ul></div>`).join('')
      : '<p class="muted">Ningún sitio con fecha en este año todavía.</p>'}
    ${sinFecha ? `<p class="muted">Además, ${sinFecha} sitio${sinFecha > 1 ? 's' : ''} con ✅ sin fecha (no salen aquí).</p>` : ''}
    <p class="r-pie">Escapadas · Familia de A Muchis · hecho el ${esc(new Date().toLocaleDateString('es-ES'))}</p></div>`;
}
function abrirResumen(año) {
  let r = document.getElementById('resumen');
  if (!r) { r = document.createElement('div'); r.id = 'resumen'; document.body.appendChild(r); }
  r.innerHTML = `<div class="r-barra"><button data-resumenprint>🖨️ Guardar PDF</button><button class="sec" data-resumencerrar>✕ Cerrar</button></div>${resumenHTML(año)}`;
  document.body.classList.add('con-resumen'); window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-resumen]'); if (b) { abrirResumen(+b.dataset.resumen); return; }
  if (e.target.closest('[data-resumenprint]')) { window.print(); return; }
  if (e.target.closest('[data-resumencerrar]')) { const r = document.getElementById('resumen'); if (r) r.remove(); document.body.classList.remove('con-resumen'); }
});
