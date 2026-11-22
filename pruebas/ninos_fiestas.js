// 🧸 Con niños (catálogo + marca del grupo) y fiestas patronales del BOC. Uso: node pruebas/ninos_fiestas.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await P.conGrupo(p);
  await p.evaluate(() => { NUBE.marcasGrupo['masca'] = { u2: { uid: 'u2', sitioId: 'masca', estado: 'fuimos', ninos: true } }; });
  await P.tab(p, 'sitios'); await p.click('button.fm[data-filtro="fNinos"]'); await p.waitForTimeout(300);
  console.log('Filtro con niños:', await p.evaluate(() => filtrados().length), 'sitios · incluye Masca (marcado por Ana):', await p.evaluate(() => filtrados().some(s => s.id === 'masca')));
  await p.evaluate(() => { abiertas.add('loro-parque'); render(); });
  console.log('Ficha Loro Parque:', (await p.textContent('#f-loro-parque .datos').catch(() => '')).trim().slice(0, 80));
  await p.$eval('#f-loro-parque [data-ninos]', b => b.click()); await p.waitForTimeout(200);
  console.log('Marca mía con niños:', await p.evaluate(() => JSON.stringify(marca('loro-parque'))), '| subida:', await p.evaluate(() => JSON.stringify((__store.marcas || {})['u1_loro-parque'] || null)));
  const f = await p.evaluate(() => SITIOS.filter(s => s.id.startsWith('fiesta-')).length);
  console.log('Fiestas del BOC:', f, '| Santa Catalina (Tacoronte) próxima:', await p.evaluate(() => JSON.stringify(proximaVez(sitio('fiesta-tacoronte-santa-catalina')))));
  await p.evaluate(() => { ponerCats(['fiestas']); evRango = 'todo'; }); await P.tab(p, 'eventos');
  console.log('Fiestas en Eventos (4 meses):', await p.locator('.ficha').count());
  await P.tab(p, 'mapa'); console.log('Puntos del mapa sin «Evento»:', await p.evaluate(() => puntos().filter(s => s.id.startsWith('fiesta-')).length));
  console.log('Captura:', await P.captura(p, 'fiestas', true));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
