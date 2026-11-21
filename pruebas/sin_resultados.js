// Búsqueda sin resultados (con y sin grupo) y pestaña Grupo sin sesión. Uso: node pruebas/sin_resultados.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await P.tab(p, 'sitios'); await p.fill('#q', 'guachinche'); await p.waitForTimeout(400);
  console.log('Sin grupo:', (await p.textContent('.sin-res')).replace(/\s+/g, ' ').trim());
  await p.evaluate(() => { NUBE.estado = 'lista'; NUBE.user = null; }); await P.tab(p, 'grupo'); console.log('Grupo sin sesión, ventajas:', await p.locator('.ventajas li').count());
  await P.conGrupo(p); await P.tab(p, 'sitios'); await p.fill('#q', 'Guachinche El Lagar'); await p.waitForTimeout(400);
  await p.click('.sin-res [data-propio="nuevo"]'); await p.waitForTimeout(200);
  console.log('Formulario: nombre =', await p.inputValue('#pf-n'), '| tipo =', await p.inputValue('#pf-t'));
  console.log('Captura:', await P.captura(p, 'sin-resultados'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
