// v57: previsión plegada al final de Planes con mapita; Mapa como pestaña propia. Uso: node pruebas/tiempo_planes.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  console.log('Pestañas:', await p.$$eval('#tabs button', x => x.map(e => e.textContent.replace(/\d+\+?$/, '').trim()).join(' · ')));
  await p.click('#tabs [data-tab="mapa"]'); await p.waitForTimeout(400);
  console.log('Mapa propio:', await p.evaluate(() => tab), '| resaltada:', await p.$eval('#tabs .on', e => e.dataset.tab), '| sin conmutador:', await p.locator('.conmutador').count() === 0);
  await p.click('#tabs [data-tab="explorar"]'); await p.waitForTimeout(300);
  console.log('Explorar = lista:', await p.evaluate(() => tab));
  await p.click('#tabs [data-tab="finde"]'); await p.waitForTimeout(400);
  const ult = await p.evaluate(() => { const c = document.querySelector('.planes'); return c.lastElementChild.className; });
  console.log('Último de Planes:', ult, '| cerrado:', await p.$eval('.tiempo-caja', d => !d.open));
  await p.click('.tiempo-caja summary'); await p.waitForTimeout(400);
  console.log('Abierto: mapita', await p.locator('.tiempo-caja svg.mapa-t').count(), '| zonas en el mapa:', await p.locator('.mapa-t g').count(), '| días:', await p.locator('[data-mtdia]').count());
  await p.locator('[data-mtdia]').nth(1).click(); await p.waitForTimeout(200);
  console.log('Cambia de día:', await p.$eval('[data-mtdia].on', b => b.textContent));
  await p.$eval('.tiempo-caja', x => x.scrollIntoView({ block: 'start' })); console.log('Captura:', await P.captura(p, 'tiempo-planes'));
  await p.evaluate(() => { save('esc.tiempoabierto', false); ir('tiempo'); }); await p.waitForTimeout(400);
  console.log('«Ver el tiempo» abre el desplegable:', await p.evaluate(() => tab), await p.$eval('.tiempo-caja', d => d.open));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
