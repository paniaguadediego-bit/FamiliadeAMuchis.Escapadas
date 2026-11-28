// v53: varios grupos (familia y hermanos) y cambiar entre ellos sin perder los planes; Más con un botón por utilidad.
// Uso: node pruebas/grupos.js
const P = require('./comun');
(async () => {
  const { p, errores, cerrar } = await P.abrir();
  await P.conGrupo(p);
  // Segundo grupo en la «nube» falsa: cada grupo con sus planes (el mock guarda por colección; se separan por gid aquí).
  await p.evaluate(() => {
    const porGrupo = { PRUEBA23: {}, HERMANO8: {} }, subs = {};
    const emit = (g, c) => setTimeout(() => { const docs = Object.entries((porGrupo[g][c]) || {}).map(([id, d]) => ({ id, data: () => d })); (subs[g + c] || []).forEach(f => f({ docs, forEach: fn => docs.forEach(fn) })); }, 5);
    const col = (g, c) => ({ onSnapshot: f => { (subs[g + c] = subs[g + c] || []).push(f); emit(g, c); return () => { subs[g + c] = (subs[g + c] || []).filter(x => x !== f); }; },
      add: async d => { const id = 'x' + Math.random().toString(36).slice(2, 7); ((porGrupo[g][c]) = porGrupo[g][c] || {})[id] = d; emit(g, c); return { id }; },
      doc: id => ({ set: async d => { (porGrupo[g][c] = porGrupo[g][c] || {})[id] = d; emit(g, c); }, update: async () => {}, delete: async () => { delete porGrupo[g][c][id]; emit(g, c); } }) });
    const grupos = { PRUEBA23: { nombre: 'Familia', miembros: ['u1', 'u2', 'u3'] }, HERMANO8: { nombre: 'Hermanos', miembros: ['u1', 'u4'] } };
    NUBE.db = { collection: () => ({ doc: g => ({ collection: c => col(g, c), onSnapshot: f => { setTimeout(() => f({ id: g, exists: true, data: () => grupos[g] }), 5); return () => {}; } }) }) };
    NUBE.miembros.u4 = { nombre: 'Hermano', emoji: '🐬', color: '#0891b2' };
    porGrupo.PRUEBA23.planes = { a: { sitioId: 'teide', destino: '', isla: 'tenerife', fecha: masDias(proximoSabado(), 7), nota: 'Plan de la familia', propone: 'u2', apuntados: ['u2'], creado: 1 } };
    porGrupo.HERMANO8.planes = { b: { sitioId: '', destino: 'Cena de hermanos', isla: 'tenerife', fecha: masDias(proximoSabado(), 7), nota: '', propone: 'u4', apuntados: ['u4'], creado: 1 } };
    NUBE.misGrupos = [{ id: 'PRUEBA23', nombre: 'Familia', n: 3 }, { id: 'HERMANO8', nombre: 'Hermanos', n: 2 }];
    window.__porGrupo = porGrupo; NUBE.grupo = null; seguirGrupo('PRUEBA23');
  });
  await p.waitForTimeout(300); await P.tab(p, 'finde'); await p.waitForTimeout(300);
  const planes = () => p.evaluate(() => NUBE.planes.map(x => x.nota || x.destino).join(', '));
  console.log('Selector en Planes:', await p.locator('.grupos-sel.en-planes .chip').count(), '| grupo:', await p.evaluate(() => NUBE.grupo.nombre), '| planes:', await planes());
  await p.click('[data-cambiagrupo="HERMANO8"]'); await p.waitForTimeout(300);
  console.log('Tras cambiar:', await p.evaluate(() => NUBE.grupo.nombre), '| planes:', await planes(), '| miembros:', await p.evaluate(() => NUBE.grupo.miembros.join(',')));
  await p.click('[data-cambiagrupo="PRUEBA23"]'); await p.waitForTimeout(300);
  console.log('De vuelta:', await p.evaluate(() => NUBE.grupo.nombre), '| planes:', await planes(), '| recuerda el grupo:', await p.evaluate(() => localStorage.getItem('esc.grupo')));
  await P.tab(p, 'grupo'); await p.waitForTimeout(200);
  console.log('En Grupo: tus grupos', await p.locator('.grupos-sel.en-grupo .chip').count(), '| unirse/crear otro:', await p.locator('.otro-grupo').count());
  console.log('Captura Grupo:', await P.captura(p, 'grupos', true));
  // Más: un botón por utilidad, letra a la vista, sin tema
  await P.tab(p, 'mas'); await p.waitForTimeout(200);
  console.log('Más: botones', await p.locator('.mas-btn').count(), '| letra visible:', await p.locator('[data-setletra]').count(), '| tema en Más:', await p.locator('.view [data-settema], #view [data-settema]').count());
  await p.click('[data-massec="festivos"]'); await p.waitForTimeout(150);
  console.log('Abre festivos:', await p.locator('.mas-item.on .mas-panel').count()); await p.click('[data-massec="copia"]'); await p.waitForTimeout(150);
  console.log('Solo uno abierto:', await p.locator('.mas-panel').count(), '| es copia:', await p.locator('.mas-item.on [data-exportar]').count());
  console.log('Captura Más:', await P.captura(p, 'mas'));
  console.log('Errores de página:', errores.length ? errores.join(' | ') : 'ninguno');
  await cerrar(); process.exit(errores.length ? 1 : 0);
})();
