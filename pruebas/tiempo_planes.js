// v66: el Tiempo vuelve a ser pestaña (entre Cultura y Grupo), con el mapita por zonas arriba. Uso: node pruebas/tiempo_planes.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  console.log('Pestañas:', await p.$$eval('#tabs button', x => x.map(e => e.textContent.replace(/\d+\+?$/, '').trim()).join(' · ')));
  await p.click('#tabs [data-tab="tiempo"]'); await p.waitForTimeout(400);
  console.log('Tiempo:', await p.evaluate(() => tab), '| mapita:', await p.locator('svg.mapa-t').count(), '| zonas:', await p.locator('.mapa-t g').count(), '| días:', await p.locator('[data-mtdia]').count());
  await p.locator('[data-mtdia]').nth(1).click(); await p.waitForTimeout(200);
  console.log('Cambia de día:', await p.$eval('[data-mtdia].on', b => b.textContent), '| sigue en Tiempo:', await p.evaluate(() => tab));
  console.log('Captura:', await P.captura(p, 'tiempo-tab'));
  await p.click('#tabs [data-tab="finde"]'); await p.waitForTimeout(300);
  console.log('Planes sin el tiempo:', await p.locator('.tiempo-caja').count() === 0);
  await p.evaluate(() => ir('tiempo')); await p.waitForTimeout(200); console.log('«Ver el tiempo» abre la pestaña:', await p.evaluate(() => tab));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
