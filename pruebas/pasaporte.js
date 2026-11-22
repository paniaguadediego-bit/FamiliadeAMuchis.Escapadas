// v34: pasaporte de Tenerife (sin grupo en Más; con grupo en Grupo). Uso: node pruebas/pasaporte.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await p.evaluate(() => { setMarca('teide', { estado: 'fuimos' }); setMarca('lago-martianez', { estado: 'fuimos' }); });
  await P.tab(p, 'mas'); console.log('Sin grupo (Más):', (await p.textContent('.pas-cab')).replace(/\s+/g, ' '), '| reto:', await p.textContent('.pas-reto').catch(() => '—'));
  await P.conGrupo(p); await p.evaluate(() => { NUBE.marcasGrupo['masca'] = { u2: { estado: 'fuimos' } }; NUBE.marcasGrupo['garachico'] = { u3: { estado: 'fuimos' } }; });
  await P.tab(p, 'grupo'); await p.waitForTimeout(200);
  console.log('Con grupo:', (await p.textContent('.pas-cab').catch(() => 'no sale')).replace(/\s+/g, ' '));
  await p.evaluate(() => document.querySelector('.pasaporte') && document.querySelector('.pasaporte').scrollIntoView());
  console.log('Captura:', await P.captura(p, 'pasaporte'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
