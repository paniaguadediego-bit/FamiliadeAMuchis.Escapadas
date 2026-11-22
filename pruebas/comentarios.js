// v35: comentarios en los planes. Uso: node pruebas/comentarios.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir(); await P.conGrupo(p);
  await p.evaluate(() => { __store.planes = { a: { sitioId: 'teide', destino: '', isla: 'tenerife', fecha: hoyISO(), hasta: '', nota: '', propone: 'u2', apuntados: ['u2'] } };
    __store.comentarios = { c1: { planId: 'a', uid: 'u2', texto: 'Llevo la tortilla', creado: Date.now() - 6e5 } }; seguirPlanes('PRUEBA23'); seguirComentarios('PRUEBA23'); });
  await P.tab(p, 'finde'); await p.waitForTimeout(300);
  console.log('Resumen cerrado:', (await p.textContent('.dia-sel .coment button')).replace(/\s+/g, ' ').trim());
  await p.click('.dia-sel [data-plan="coment-ver"]'); await p.waitForTimeout(200);
  await p.fill('.dia-sel #cm-a', 'Yo pongo el coche'); await p.press('.dia-sel #cm-a', 'Enter'); await p.waitForTimeout(400);
  console.log('Comentarios:', await p.evaluate(() => (NUBE.coment.a || []).map(c => c.uid + ': ' + c.texto).join(' | ')));
  await p.click('.dia-sel [data-plan="coment-borrar"]'); await p.waitForTimeout(300);
  console.log('Tras borrar el mío:', await p.evaluate(() => (NUBE.coment.a || []).length));
  console.log('Captura:', await P.captura(p, 'comentarios'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno'); await cerrar(); process.exit(errores.length ? 1 : 0);
})();
