// v30: portada de Planes (bienvenida, botones rápidos, carruseles, calendario de 2 semanas). Uso: node pruebas/portada.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  console.log('Sin grupo:', (await p.textContent('.portada-tx')).replace(/\s+/g, ' ').trim());
  await P.conGrupo(p); await P.tab(p, 'finde');
  for (const k of ['plan', 'sorp', 'agenda']) {
    await p.click(`[data-panel="${k}"]`); await p.waitForTimeout(200);
    console.log(`Botón ${k}:`, await p.evaluate(() => { const x = document.querySelector('.panel-rapido'); return x ? x.firstElementChild.className : 'nada'; }));
  }
  await p.click('[data-panel="agenda"]'); await p.waitForTimeout(150); console.log('Se cierra al tocar otra vez:', await p.locator('.panel-rapido').count() === 0);
  await p.click('[data-panel="plan"]'); await p.fill('#pl-destino', 'Merienda'); await p.click('[data-plan="crear"]'); await p.waitForTimeout(400);
  console.log('Plan rápido creado:', await p.evaluate(() => Object.values(__store.planes || {}).some(x => x.destino === 'Merienda')), '| panel cerrado:', await p.locator('.panel-rapido').count() === 0);
  console.log('Calendario 2 semanas:', await p.locator('.cal-d').count(), 'días');
  await p.click('[data-calvista="mes"]'); await p.waitForTimeout(150); console.log('Mes entero:', await p.locator('.cal-d').count(), 'días');
  await p.click('[data-calvista="semanas"]');
  console.log('Captura:', await P.captura(p, 'portada'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
