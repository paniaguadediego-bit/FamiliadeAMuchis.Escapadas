'use strict';
// 🎉 Festivos (data/festivos.json): nacionales y de Canarias (BOE), el de la isla (2 de febrero, Candelaria) y los dos
// locales de cada municipio (BOC). Los locales que se ven son los del municipio elegido en ☰ Más (solo en este móvil).
// Se carga antes que app.js: nada de load/save al cargar, solo dentro de funciones.
let FESTIVOS = null;
const miMuni = () => load('esc.mimuni', '');
function festivo(f) {
  if (!FESTIVOS || !f) return '';
  const d = f.slice(0, 10), m = miMuni();
  return FESTIVOS.comunes[d] || (m && (FESTIVOS.locales[m] || {})[d] ? `${FESTIVOS.locales[m][d]} (${m})` : '');
}
// [[fecha, nombre]] entre a y b (incluidos), por fecha.
function festivosEntre(a, b) {
  const r = []; if (!FESTIVOS) return r;
  for (let f = a; f <= b; f = masDias(f, 1)) { const n = festivo(f); if (n) r.push([f, n]); }
  return r;
}
const diaSemana = f => new Date(f.slice(0, 10) + 'T12:00').getDay();
function festivosHTML() {
  const m = miMuni();
  return `<div class="card"><p class="muted">Salen en Planes y en 🎲 Sorpréndeme los festivos nacionales, de Canarias y de Tenerife. Elige tu municipio para ver también sus 2 festivos locales (se guarda solo en este móvil).</p>
    <label class="orden-sel ancho"><span class="vh">Municipio</span><select id="mimuni"><option value="">🎉 Sin festivos locales</option>${MUNICIPIOS.map(x => `<option ${x === m ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
    ${FESTIVOS ? `<p class="muted fuente-fest">📚 ${FESTIVOS.fuentes.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n.split(' · ')[0])}</a>`).join(' · ')}</p>` : ''}</div>`;
}
document.addEventListener('change', e => { if (e.target.id === 'mimuni') { save('esc.mimuni', e.target.value); render(); } });
