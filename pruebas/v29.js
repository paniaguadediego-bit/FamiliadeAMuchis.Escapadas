// v29: 5 pestañas con Explorar (Lista ⇄ Mapa), 💫 mejor día, 🗳️ votar fechas y 📤 compartir. Uso: node pruebas/v29.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  console.log('Pestañas:', await p.$$eval('#tabs button', x => x.map(e => e.textContent.trim()).join(' · ')));
  // (v57) Mapa es pestaña propia y el Tiempo va plegado en Planes: ver pruebas/tiempo_planes.js
  await P.conGrupo(p);
  await p.evaluate(() => { const s = proximoSabado(); __store.disponibilidad = { u2: { uid: 'u2', si: [masDias(s, 7)], no: [] }, u3: { uid: 'u3', si: [masDias(s, 7)], no: [] } }; seguirDisponibilidad('PRUEBA23'); });
  await P.tab(p, 'finde'); await p.waitForTimeout(300);
  console.log('Mejor día:', (await p.textContent('[data-ircal]').catch(() => 'no sale')).replace(/\s+/g, ' ').trim());
  // Proponer con 3 fechas para votar
  await p.$eval('.dia-sel [data-plan="abrir"]', x => x.click()); await p.waitForTimeout(200);
  await p.fill('#pl-destino', 'Cena de Navidad'); await p.click('.pl-votar summary');
  const [a, b] = await p.evaluate(() => [masDias(proximoSabado(), 7), masDias(proximoSabado(), 14)]);
  await p.fill('#pl-op2', a); await p.fill('#pl-op3', b); await p.click('[data-plan="crear"]'); await p.waitForTimeout(400);
  const plan = await p.evaluate(() => Object.entries(__store.planes).find(([, x]) => x.destino === 'Cena de Navidad'));
  console.log('Plan con votación:', JSON.stringify(plan[1].opciones), JSON.stringify(plan[1].votos));
  await p.$eval(`[data-plan="votar"][data-f="${a}"]`, x => x.click()); await p.waitForTimeout(200);
  console.log('Mi voto:', JSON.stringify(await p.evaluate(id => __store.planes[id].votos, plan[0])));
  console.log('Captura:', await P.captura(p, 'votacion', true));
  await p.$eval(`[data-plan="fijar"][data-f="${a}"]`, x => x.click()); await p.waitForTimeout(200);
  console.log('Fijado:', JSON.stringify(await p.evaluate(id => { const x = __store.planes[id]; return [x.fecha, x.opciones, x.votos]; }, plan[0])));
  // Compartir (sin navigator.share: abre WhatsApp)
  await p.evaluate(() => { window.__abiertos = []; window.open = u => { __abiertos.push(u); }; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
  await p.evaluate(() => compartir('s:teide'));
  console.log('Compartir sitio:', decodeURIComponent(await p.evaluate(() => __abiertos[0])).slice(0, 140));
  // Enlace #f=teide
  await p.evaluate(() => { location.hash = 'f=teide'; }); await p.waitForTimeout(1200);
  console.log('Enlace abre:', await p.evaluate(() => tab), '| ficha Teide abierta:', await p.locator('#f-teide[open]').count());
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
