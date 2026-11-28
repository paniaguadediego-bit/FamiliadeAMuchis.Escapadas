// v49: 📰 Por revisar (avisos de los ayuntamientos): añadir con fecha → Eventos; sin fecha → «Anunciados sin fecha»;
// descartar; con grupo se guarda en grupos/{gid}/revision. Uso: node pruebas/revision.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  const sab = await p.evaluate(() => proximoSabado());
  const doc = { notas: ['Santa Cruz de Tenerife: su web no responde a programas'], avisos: [
    { id: 'rv-aro-1', municipio: 'Arona', clase: 'agenda', titulo: 'Festival de Magia de prueba', url: 'https://www.arona.org/Agenda?id=1', desde: sab, hasta: sab, lugar: 'Auditorio Infanta Leonor', extracto: 'Espectáculo de magia.', categoria: 'teatro', foto: '', lat: 28.05, lon: -16.71, visto: sab },
    { id: 'rv-lagn-x', municipio: 'San Cristóbal de La Laguna', clase: 'noticia', titulo: 'La Laguna prepara su gran fiesta navideña', url: 'https://www.aytolalaguna.es/x/', desde: '', hasta: '', lugar: '', extracto: '', categoria: 'feria', foto: '', lat: null, lon: null, visto: sab },
    { id: 'rv-pue-9', municipio: 'Puerto de la Cruz', clase: 'noticia', titulo: 'Concierto que no interesa', url: 'https://www.puertodelacruz.es/n/', desde: sab, hasta: sab, lugar: '', extracto: '', categoria: 'musica', foto: '', lat: null, lon: null, visto: sab }] };
  await p.evaluate(d => { cargarRevision(d); mezclarSitios(); }, doc);
  await P.tab(p, 'eventos'); await p.waitForTimeout(300);
  console.log('Bandeja (con fecha):', (await p.textContent('[data-revcaja="esc.revabierta"] summary')).replace(/\s+/g, ' ').trim(), '| avisos:', await p.locator('[data-revcaja="esc.revabierta"] .rev-item').count());
  const pos = await p.evaluate(() => { const v = document.getElementById('view') || document.body, c = [...v.querySelectorAll('*')]; const s = document.querySelector('[data-revcaja="esc.sinfabierta"]'); return [!!s, s && !s.open, s && !s.nextElementSibling]; });
  console.log('Sin fecha al final y cerrado:', JSON.stringify(pos));
  await p.click('[data-revcaja="esc.sinfabierta"] summary'); await p.waitForTimeout(150);
  console.log('Captura:', await P.captura(p, 'revision'));
  await p.click('[data-rev="si"][data-id="rv-aro-1"]'); await p.waitForTimeout(200);
  console.log('Magia en Eventos:', await p.evaluate(() => SITIOS.some(s => s.id === 'rv-aro-1' && s.verificar)), '| este finde:', await p.evaluate(() => eventosEntre(masDias(proximoSabado(), -1), masDias(proximoSabado(), 1)).some(([s]) => s.id === 'rv-aro-1')));
  await p.click('[data-rev="si"][data-id="rv-lagn-x"]'); await p.waitForTimeout(200);
  console.log('Sin fecha añadido (abajo):', await p.locator('.rev-sinf-caja:has-text("Añadidos")').count(), '| no entra en Eventos:', await p.evaluate(() => !SITIOS.some(s => s.id === 'rv-lagn-x')));
  await p.click('[data-rev="no"][data-id="rv-pue-9"]'); await p.waitForTimeout(200);
  console.log('Bandeja de arriba vacía tras decidir:', await p.locator('[data-revcaja="esc.revabierta"]').count() === 0, '| guardado en el móvil:', JSON.stringify(await p.evaluate(() => load('esc.revision', {}))));
  // Con grupo: lo decide uno y lo ve todo el grupo
  await p.evaluate(() => localStorage.removeItem('esc.revision')); await P.conGrupo(p);
  await p.evaluate(() => { seguirRevision('PRUEBA23'); }); await p.waitForTimeout(100); await P.tab(p, 'eventos'); await p.waitForTimeout(200);
  await p.click('[data-rev="si"][data-id="rv-aro-1"]'); await p.waitForTimeout(200);
  console.log('En la nube:', JSON.stringify(await p.evaluate(() => __store.revision)).replace(/"actualizado":\d+/, '"actualizado":…'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
