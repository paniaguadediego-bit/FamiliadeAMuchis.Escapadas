// Cartelera de cine en Eventos. Uso: node pruebas/cine.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await p.route(/acsta\.net/, r => r.abort());
  await P.tab(p, 'eventos'); await p.waitForTimeout(300);
  console.log('Aviso en Eventos:', (await p.textContent('[data-v="cine"].ev-enlace').catch(() => 'no sale')).replace(/\s+/g, ' ').trim());
  await p.click('[data-v="cine"].ev-enlace'); await p.waitForTimeout(300);
  console.log('Cines:', await p.$$eval('[data-cine]', x => x.map(e => e.textContent.trim()).join(' | ')));
  console.log('Películas en el primero:', await p.locator('.peli').count());
  await p.click('[data-cinevo]'); await p.waitForTimeout(200);
  console.log('Solo VOSE:', await p.locator('.peli').count(), 'películas,', await p.locator('.ses.vo').count(), 'sesiones');
  await p.selectOption('#cine-orden', 'publico'); await p.waitForTimeout(200);
  console.log('Orden por público:', await p.evaluate(() => [...document.querySelectorAll('.peli')].slice(0, 3).map(x => (x.querySelector('.peli-notas span') || {}).textContent).join(' · ')));
  console.log('Captura:', await P.captura(p, 'cine'));
  await p.click('[data-cine] >> nth=1'); await p.waitForTimeout(200); await p.click('[data-cinevo]'); await p.waitForTimeout(200);
  console.log('Segundo cine:', await p.locator('.peli').count(), 'películas');
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
