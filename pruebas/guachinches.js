// Guachinches del censo del Cabildo en Sitios, en la búsqueda y en el mapa. Uso: node pruebas/guachinches.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await P.tab(p, 'sitios'); await p.click('button.fm[data-v="guachinche"]'); await p.waitForTimeout(300);
  console.log('Filtro guachinche:', await p.evaluate(() => filtrados().length), 'sitios');
  await p.click('button.fm[data-v="guachinche"]'); await p.fill('#q', 'guachinche'); await p.waitForTimeout(400);
  console.log('Buscar «guachinche»:', await p.evaluate(() => filtrados().length));
  await P.tab(p, 'mapa'); await p.click('[data-mptipo="guachinche"]'); await p.waitForTimeout(300);
  console.log('Mapa solo guachinches:', await p.evaluate(() => puntos().length), 'puntos');
  await p.evaluate(() => { MP.z = 13; MP.c = [28.42, -16.48]; pintarMapa(); }); await p.waitForTimeout(300);
  console.log('Captura:', await P.captura(p, 'guachinches'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
