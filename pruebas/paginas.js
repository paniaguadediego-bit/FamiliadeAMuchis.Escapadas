// v47: findes en páginas (deslizar a la derecha), rueda sin «Proponer» y La Noche en Blanco. Uso: node pruebas/paginas.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir(); await P.tab(p, 'finde'); await p.waitForTimeout(400);
  console.log('Páginas:', await p.locator('.finde-pag').count(), '| botones Proponer en la rueda:', await p.locator('.rueda [data-plan="abrir"]').count());
  console.log('Noche en Blanco este finde:', await p.evaluate(() => eventosEntre(masDias(proximoSabado(), -1), masDias(proximoSabado(), 1)).some(([s]) => s.id === 'noche-blanco-laguna')));
  await p.$eval('[data-pager]', x => x.scrollIntoView({ block: 'start' })); console.log('Captura 1:', await P.captura(p, 'pagina1'));
  await p.$eval('[data-pager]', x => { x.scrollLeft = x.clientWidth; }); await p.waitForTimeout(400);
  console.log('Tras deslizar: página', await p.evaluate(() => paginaFinde), '|', await p.$eval('.pager-puntos .on', b => b.getAttribute('aria-label')));
  console.log('Captura 2:', await P.captura(p, 'pagina2'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
