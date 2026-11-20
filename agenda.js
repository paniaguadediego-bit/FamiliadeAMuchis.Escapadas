'use strict';
// 🎭 ¿Qué hay? Buscador cultural: teatro, cine, conciertos, fiestas de pueblo, planes con niños…
// No hay una agenda pública abierta que la app pueda leer, así que no se inventa programación ni enlaces:
// se arma la búsqueda con el qué, el dónde y las fechas exactas del finde (Google y Google Noticias), se
// enseñan los sitios del catálogo que encajan (con «🔎 Programación») y, en fiestas, los eventos con fecha.

const AGENDA = {
  teatro: { ic: '🎭', n: 'Teatro', q: 'teatro', sitios: ['teatro-guimera', 'teatro-leal', 'auditorio'] },
  cine: { ic: '🎬', n: 'Cine', q: 'cartelera cine', sitios: [] },
  musica: { ic: '🎵', n: 'Conciertos', q: 'conciertos', sitios: ['auditorio', 'teatro-guimera', 'teatro-leal'] },
  fiestas: { ic: '🎉', n: 'Fiestas de pueblo', q: 'fiestas', sitios: [] },
  ninos: { ic: '🧸', n: 'Con niños', q: 'planes con niños', sitios: ['museo-ciencia', 'muna', 'palmetum', 'parque-granja', 'garcia-sanabria', 'loro-parque', 'siam-park'] },
  expo: { ic: '🖼️', n: 'Exposiciones', q: 'exposiciones', sitios: ['tea', 'bellas-artes-sc', 'muna', 'museo-historia', 'casa-carnaval', 'casa-carta'] },
  mercadillo: { ic: '🛍️', n: 'Mercadillos', q: 'mercadillo', sitios: ['mercado-africa'] }
};
let agCat = '', agDonde = '', agFinde = 0;

const MESES_AG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// «28 y 29 de noviembre de 2026» (o «31 de enero y 1 de febrero de 2027»).
function fechasTexto(sab) {
  const dom = masDias(sab, 1), d1 = new Date(sab + 'T12:00'), d2 = new Date(dom + 'T12:00');
  return d1.getMonth() === d2.getMonth() ? `${d1.getDate()} y ${d2.getDate()} de ${MESES_AG[d1.getMonth()]} de ${d1.getFullYear()}`
    : `${d1.getDate()} de ${MESES_AG[d1.getMonth()]} y ${d2.getDate()} de ${MESES_AG[d2.getMonth()]} de ${d2.getFullYear()}`;
}
const gBusca = q => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const gNoticias = q => `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=es&gl=ES&ceid=ES:es`;

function agendaHTML() {
  const sab0 = proximoSabado(), findes = [0, 1, 2].map(i => masDias(sab0, 7 * i));
  const sab = findes[agFinde] || sab0, lugar = agDonde || 'Tenerife', ft = fechasTexto(sab);
  let res = '';
  if (agCat) {
    const C = AGENDA[agCat], q = `${C.q} ${lugar}${agDonde && !/Tenerife/.test(agDonde) ? ' Tenerife' : ''} ${ft}`;
    const sitios = C.sitios.map(id => sitio(id)).filter(s => s && (!agDonde || s.municipio === agDonde));
    const evs = agCat === 'fiestas' && typeof eventosEntre === 'function' ? eventosEntre(masDias(sab, -1), masDias(sab, 1)).filter(([s]) => !agDonde || s.municipio === agDonde) : [];
    res = `<div class="ag-res">
      <div class="ag-q">${C.ic} <b>${esc(C.n)}</b> · ${esc(lugar)} · ${esc(ft)}</div>
      <div class="acciones"><a class="btn mini" href="${gBusca(q)}" target="_blank" rel="noopener">🔎 Buscar en Google</a>
        <a class="btn sec mini" href="${gNoticias(`${C.q} ${lugar} ${MESES_AG[new Date(sab + 'T12:00').getMonth()]}`)}" target="_blank" rel="noopener">📰 En las noticias</a></div>
      ${evs.length ? `<div class="ag-sub">🎟️ Fiestas de la app ese finde</div>${evs.map(([s, f]) => `<button class="reciente" data-irficha="${esc(s.id)}"><span class="d-dia">${+f[0].slice(8)}</span><span><b>${esc(s.nombre)}</b><br><small class="muted">${esc(s.municipio)}</small></span></button>`).join('')}` : ''}
      ${sitios.length ? `<div class="ag-sub">📍 Sitios de la app</div>${sitios.map(s => `<div class="ag-sitio"><button class="plan-b-s" data-irficha="${esc(s.id)}">${tipoIc(s.tipo)} ${esc(s.nombre)}</button><small class="muted"> ${esc(s.municipio)}</small>
        <a class="btn sec mini" href="${gBusca(`${s.nombre} programación ${MESES_AG[new Date(sab + 'T12:00').getMonth()]} ${sab.slice(0, 4)}`)}" target="_blank" rel="noopener">🔎 Programación</a></div>`).join('')}` : ''}
      ${typeof enGrupo === 'function' && enGrupo() ? `<button class="sec" data-agplan="${sab}">📅 Proponer al grupo lo que encuentres</button>` : ''}
      <p class="muted ag-nota">La app no tiene la programación: te lleva a buscarla con las fechas de ese finde. Confirma horarios y entradas en la web oficial.</p>
    </div>`;
  }
  return `<div class="card agenda">
    ${rejilla('agcat', agCat, Object.entries(AGENDA).map(([k, c]) => [k, c.ic, c.n]))}
    ${agCat ? `<div class="filtros-barra">
      <label class="orden-sel"><span class="vh">Dónde</span><select id="ag-donde"><option value="">📍 Toda la isla</option>${MUNICIPIOS.map(m => `<option ${agDonde === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
      <label class="orden-sel"><span class="vh">Cuándo</span><select id="ag-finde">${findes.map((f, i) => `<option value="${i}" ${agFinde === i ? 'selected' : ''}>📅 ${i === 0 ? 'Este finde' : i === 1 ? 'El que viene' : 'En 2 semanas'} (${+f.slice(8)})</option>`).join('')}</select></label>
    </div>` : '<p class="muted ag-nota">Elige qué te apetece y te digo dónde mirar.</p>'}
    ${res}</div>`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('[data-filtro="agcat"]'); if (c) { e.stopImmediatePropagation(); agCat = agCat === c.dataset.v ? '' : c.dataset.v; render(); return; }
  const p = e.target.closest('[data-agplan]'); if (p) { planForm = { sabado: p.dataset.agplan }; render(); setTimeout(() => { const f = document.querySelector('.plan-form'); if (f) f.scrollIntoView({ block: 'center' }); const d = document.getElementById('pl-destino'); if (d) d.focus(); }, 50); }
}, true);
document.addEventListener('change', e => {
  if (e.target.id === 'ag-donde') { agDonde = e.target.value; render(); }
  else if (e.target.id === 'ag-finde') { agFinde = +e.target.value; render(); }
});
