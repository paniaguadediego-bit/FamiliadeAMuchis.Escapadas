// v56: aviso propio «¿Seguro?» al salir del grupo y al cerrar sesión; pasaporte con aspecto de pasaporte. Uso: node pruebas/avisos.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await P.conGrupo(p);
  await p.evaluate(() => { NUBE.auth = { signOut: async () => { window.__salio = true; } }; });
  await P.tab(p, 'grupo'); await p.waitForTimeout(200);
  await p.click('[data-nube="salirgrupo"]'); await p.waitForTimeout(150);
  console.log('Aviso al salir del grupo:', (await p.textContent('.confirma h3')).trim());
  console.log('Captura:', await P.captura(p, 'aviso'));
  await p.click('[data-cf="no"]'); await p.waitForTimeout(150);
  console.log('Cancelar: sigue en el grupo:', await p.evaluate(() => !!NUBE.grupo), '| aviso cerrado:', await p.locator('.confirma').count() === 0);
  await p.click('[data-nube="salir"]'); await p.waitForTimeout(150);
  console.log('Aviso al cerrar sesión:', (await p.textContent('.confirma h3')).trim());
  await p.click('[data-cf="si"]'); await p.waitForTimeout(150);
  console.log('Aceptar: cierra sesión:', await p.evaluate(() => !!window.__salio));
  // Pasaporte
  await p.evaluate(() => { const s = SITIOS.filter(x => !x.agenda && x.tipo !== 'evento'); ['Garachico', 'La Orotava', 'Adeje', 'San Cristóbal de La Laguna', 'Santa Cruz de Tenerife'].forEach(m => { const x = s.find(y => y.municipio === m); if (x) setMarca(x.id, { estado: 'fuimos' }); }); });
  await P.tab(p, 'grupo'); await p.waitForTimeout(300);
  await p.$eval('.pasaporte', x => x.scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -70));
  console.log('Pasaporte: sellos', await p.locator('.pasaporte .pas-m.si').count(), '| captura:', await P.captura(p, 'pasaporte'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
