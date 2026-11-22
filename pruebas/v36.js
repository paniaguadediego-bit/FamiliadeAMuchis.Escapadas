// v36: pestaña Tiempo, Explorar (conmutador, colecciones), municipios en el mapa, eventos por categorías y semanas plegables.
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  console.log('Pestañas:', await p.$$eval('#tabs button', x => x.map(e => e.textContent.trim()).join(' · ')));
  await p.click('#tabs [data-tab="explorar"]'); await p.waitForTimeout(300); console.log('Lista:', await P.captura(p, 'v36-lista'));
  await p.click('.conmutador [data-tab="mapa"]'); await p.waitForTimeout(300);
  await p.click('[data-mpmunis]'); await p.click('[data-mpmuni="Santa Úrsula"]'); await p.click('[data-mpmuni="La Victoria de Acentejo"]');
  console.log('Captura panel:', await P.captura(p, 'v36-munis'));
  await p.click('.mp-mu-pie [data-mpmunis]'); await p.click('[data-mptipo="guachinche"]'); await p.waitForTimeout(400);
  console.log('Guachinches en 2 municipios:', await p.evaluate(() => puntos().length), '| zoom', await p.evaluate(() => MP.z));
  console.log('Mapa:', await P.captura(p, 'v36-mapa'));
  await p.evaluate(() => { mpMunis.clear(); mpTipos.clear(); });
  await P.tab(p, 'eventos'); await p.click('[data-evcats="ninguna"]'); await p.waitForTimeout(150);
  console.log('Ninguna:', await p.locator('.ficha').count(), 'fichas');
  await p.click('[data-evcat="musica"]'); await p.click('[data-evcat="teatro"]'); await p.waitForTimeout(150);
  console.log('Música y teatro:', await p.locator('.ficha').count(), '| semanas:', await p.locator('details.ev-sem').count());
  const sem = await p.$eval('details.ev-sem', d => d.dataset.sem); await p.click('details.ev-sem >> nth=0 >> summary'); await p.waitForTimeout(100);
  await p.click('[data-evcat="fiestas"]'); await p.waitForTimeout(150);
  console.log('Semana plegada se recuerda:', await p.evaluate(s => { const d = document.querySelector(`details.ev-sem[data-sem="${s}"]`); return d ? !d.open : 'no está'; }, sem));
  await p.click('[data-evcats="todas"]'); console.log('Eventos:', await P.captura(p, 'v36-eventos'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
