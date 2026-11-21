// Prueba de humo: abre todas las pestañas (sin grupo y con grupo), cuenta errores y hace una captura de cada una.
// Uso: node pruebas/humo.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir(), caps = [];
  const pestañas = ['finde', 'tiempo', 'eventos', 'sitios', 'mapa', 'grupo', 'mas'];
  for (const t of pestañas) { await P.tab(p, t); caps.push(await P.captura(p, 'sin-grupo-' + t)); }
  await P.conGrupo(p);
  for (const t of ['finde', 'sitios', 'mapa']) { await P.tab(p, t); caps.push(await P.captura(p, 'grupo-' + t)); }
  const datos = await p.evaluate(() => ({ version: VERSION, sitios: SITIOS.length, eventos: SITIOS.filter(s => s.tipo === 'evento').length, festivos: !!FESTIVOS }));
  console.log('Datos:', JSON.stringify(datos));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  console.log('Capturas:', caps.length, '→', caps[0].replace(/[^/]+$/, ''));
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
