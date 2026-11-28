// v46: rueda de eventos en Planes. Uso: node pruebas/rueda.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir(); await P.tab(p, 'finde'); await p.waitForTimeout(400);
  const est = () => p.$$eval('[data-rueda="0"] .ev-tarjeta', x => x.slice(0, 5).map(e => (e.classList.contains('en-centro') ? '[C]' : '') + (+e.style.opacity).toFixed(2)).join(' '));
  console.log('Ruedas:', await p.locator('[data-rueda]').count(), '| tarjetas en la primera:', await p.locator('[data-rueda="0"] .ev-tarjeta').count());
  console.log('Al empezar (opacidad):', await est());
  await p.$eval('[data-rueda="0"]', r => r.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  console.log('Captura inicio:', await P.captura(p, 'rueda1'));
  await p.$eval('[data-rueda="0"]', r => { r.scrollTop += r.querySelector('.ev-tarjeta').offsetHeight + 6; }); await p.waitForTimeout(500);
  console.log('Tras girar una:', await est());
  console.log('Captura girada:', await P.captura(p, 'rueda2'));
  const antes = await p.evaluate(() => tab);
  await p.click('[data-rueda="0"] .ev-tarjeta:not(.en-centro) .ev-ban >> nth=0'); await p.waitForTimeout(700);
  console.log('Tocar una de fuera la centra (no abre):', await p.evaluate(() => tab) === antes, '|', await est());
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
