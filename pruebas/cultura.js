// v39: pestaña Cultura (cine, teatro, música) y Eventos sin ellas. Uso: node pruebas/cultura.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  console.log('Pestañas:', await p.$$eval('#tabs button', x => x.map(e => e.textContent.trim()).join(' · ')));
  await p.click('#tabs [data-tab="cultura"]'); await p.waitForTimeout(300);
  console.log('Cine:', await p.locator('.peli').count(), 'películas');
  await p.click('[data-cul="teatro"]'); await p.waitForTimeout(200); console.log('Teatro:', (await p.textContent('.cuenta-lista')).trim());
  await p.click('[data-cul="musica"]'); await p.waitForTimeout(200); console.log('Música:', (await p.textContent('.cuenta-lista')).trim());
  console.log('Captura:', await P.captura(p, 'cultura'));
  await p.click('#tabs [data-tab="eventos"]'); await p.waitForTimeout(200);
  console.log('Categorías en Eventos:', await p.$$eval('[data-evcat]', x => x.map(e => e.textContent.trim()).join(' · ')));
  const id = await p.evaluate(() => (SITIOS.find(s => s.tipo === 'evento' && catDe(s) === 'musica') || {}).id);
  await p.evaluate(i => { const b = document.createElement('button'); b.dataset.irficha = i; document.body.append(b); b.click(); }, id); await p.waitForTimeout(800);
  console.log('Un concierto abre en:', await p.evaluate(() => tab + '/' + culSec), '| ficha abierta:', await p.locator('.ficha[open]').count());
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
