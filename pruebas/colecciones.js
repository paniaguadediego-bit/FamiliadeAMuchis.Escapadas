// v33: colecciones en Explorar. Uso: node pruebas/colecciones.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir(); await P.conGrupo(p); await P.tab(p, 'sitios');
  console.log('Colecciones:', await p.$$eval('[data-col]', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
  await p.click('[data-col="charcos"]'); await p.waitForTimeout(200);
  console.log('Charcos y piscinas:', await p.evaluate(() => filtrados().map(s => s.nombre).slice(0, 5).join(', ')));
  await p.click('[data-col="charcos"]'); console.log('Se quita al tocar otra vez:', await p.evaluate(() => fCol === ''));
  console.log('Captura:', await P.captura(p, 'colecciones'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
