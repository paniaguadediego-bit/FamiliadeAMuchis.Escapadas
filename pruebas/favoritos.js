// v50: 💛 favoritos (municipios y cines, de cada persona) y botones de Planes abajo. Uso: node pruebas/favoritos.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await P.tab(p, 'mas'); await p.waitForTimeout(200);
  await p.click('[data-fav="esc.favmunis"][data-v="Garachico"]'); await p.waitForTimeout(150);
  await p.click('[data-fav="esc.favcines"][data-v="E0622"]'); await p.waitForTimeout(150);
  console.log('Guardado:', await p.evaluate(() => JSON.stringify([load('esc.favmunis', []), load('esc.favcines', [])])));
  console.log('Captura Más:', await P.captura(p, 'favoritos'));
  await P.tab(p, 'sitios'); await p.waitForTimeout(300);
  console.log('Primer municipio en Explorar:', await p.$eval('#lista details.muni', d => d.dataset.muni));
  // El corazón del banner no abre el municipio
  await p.click('details.muni[data-muni="Adeje"] .fav-ban'); await p.waitForTimeout(150);
  console.log('Adeje favorito:', await p.evaluate(() => favMuni('Adeje')), '| sigue cerrado:', await p.$eval('details.muni[data-muni="Adeje"]', d => !d.open));
  console.log('Zona primera en el Tiempo:', await p.evaluate(() => zonasOrden()[0][0]));
  console.log('Sorpréndeme: peso de un sitio de Garachico:', await p.evaluate(() => favSitio(SITIOS.find(s => s.municipio === 'Garachico'))));
  await P.tab(p, 'cultura'); await p.waitForTimeout(300);
  console.log('Primer cine en la cartelera:', await p.$eval('.cine-sel .chip', b => b.textContent.trim()));
  await P.tab(p, 'finde'); await p.waitForTimeout(300);
  const orden = await p.evaluate(() => [...document.querySelector('.planes').children].map(x => x.className || x.tagName).join(' > '));
  console.log('Botones al final de Planes:', /rapidos/.test(orden.split(' > ').slice(-3).join(' ')));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
