// v40: senderos oficiales del Cabildo (circulares, ficha con km y desnivel, trazado en el mapa). Uso: node pruebas/senderos.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir(); await p.waitForFunction(() => Object.keys(TRAZOS).length > 100);
  await P.tab(p, 'sitios'); await p.click('[data-filtro="fCol"][data-v="circulares"]'); await p.waitForTimeout(200);
  console.log('Circulares:', await p.evaluate(() => filtrados().length));
  await p.evaluate(() => { abiertas.add('sen-sl-tf-294'); render(); });
  console.log('Ficha:', (await p.textContent('#f-sen-sl-tf-294 .datos').catch(() => 'no')).trim());
  await p.click('#f-sen-sl-tf-294 [data-vermapa]').catch(async () => p.evaluate(() => { const s = sitio('sen-sl-tf-294'); MP.sel = s.id; MP.c = [s.lat, s.lon]; MP.z = 14; ir('mapa'); }));
  await p.waitForTimeout(500);
  console.log('Trazado en el mapa:', await p.locator('.mp-traza polyline').count(), '| zoom', await p.evaluate(() => MP.z));
  console.log('Captura:', await P.captura(p, 'senderos'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
