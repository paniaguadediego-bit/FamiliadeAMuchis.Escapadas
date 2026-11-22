// v42: 🆕 Novedades (contador en pestañas, lista con enlace a entradas, eventos hasta un año vista). Uso: node pruebas/novedades.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await p.evaluate(() => { const h = hoyISO(), lejos = masDias(h, 240);
    AGENDA_SITIOS.slice(0, 2).forEach(s => { s.visto = h; });
    AGENDA_SITIOS.push({ id: 'ag-prueba-concierto', nombre: 'Gran concierto de prueba', tipo: 'evento', municipio: 'Santa Cruz de Tenerife', lat: 28.46, lon: -16.25, aprox: true, agenda: true,
      categoria: 'musica', lugar: 'Auditorio', desc: 'Prueba', fuente: 'Agenda', url: 'https://www.webtenerife.com/agenda/', cuando: { tipo: 'fechas', lista: [[lejos, lejos]] }, visto: h });
    mezclarSitios(); render(); });
  console.log('Contadores:', await p.$$eval('#tabs i.badge', x => x.map(e => e.closest('button').dataset.tab + '=' + e.textContent).join(' ')));
  await p.click('#tabs [data-tab="cultura"]'); await p.waitForTimeout(300);
  console.log('Cultura:', (await p.textContent('details.novedades summary')).replace(/\s+/g, ' ').trim(), '|', (await p.textContent('.nov')).replace(/\s+/g, ' ').trim().slice(0, 120));
  console.log('Contador de Cultura apagado:', await p.locator('#tabs [data-tab="cultura"] i.badge').count() === 0);
  await p.click('.nov [data-irficha="ag-prueba-concierto"]'); await p.waitForTimeout(800);
  console.log('Abre el concierto de dentro de 8 meses:', await p.evaluate(() => tab + '/' + culSec), '| ficha:', await p.locator('#f-ag-prueba-concierto[open]').count());
  console.log('Captura:', await P.captura(p, 'novedades'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
