// Base para probar Escapadas en un móvil simulado con Playwright (Chromium ya instalado).
// - Sirve la raíz del repo con un servidor propio (sin python ni npm).
// - Pixel 7, service worker bloqueado, Firebase falso, Open-Meteo y fotos simulados.
// Uso: const P = require('./comun'); const { p, errores, cerrar } = await P.abrir(); ... await P.conGrupo(p); ...
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const RAIZ = path.resolve(__dirname, '..'), CAPTURAS = path.join(__dirname, 'capturas');
const TIPOS = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
// PNG de 1×1 gris para las fotos (no se descargan fotos reales en las pruebas).
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN4/P8/AAX/Av4N70QqAAAAAElFTkSuQmCC', 'base64');

function servidor() {
  return new Promise(ok => {
    const s = http.createServer((req, res) => {
      const ruta = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!ruta.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
      fs.readFile(ruta, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TIPOS[path.extname(ruta)] || 'application/octet-stream' }); res.end(d); });
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
// Tiempo simulado: 16 días; zonas La Laguna y Norte con lluvia uno de cada tres días.
function tiempoFalso() {
  const dias = [], horas = [];
  for (let i = 0; i < 16; i++) { const d = new Date(); d.setDate(d.getDate() + i); const f = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); dias.push(f); for (let h = 0; h < 24; h++) horas.push(`${f}T${String(h).padStart(2, '0')}:00`); }
  const z = (ll, mx) => ({ daily: { time: dias, weather_code: dias.map((_, i) => ll && i % 3 === 1 ? 61 : 2), temperature_2m_max: dias.map(() => mx), temperature_2m_min: dias.map(() => mx - 7),
    precipitation_probability_max: dias.map((_, i) => ll && i % 3 === 1 ? 70 : 10), wind_speed_10m_max: dias.map(() => 20) },
    hourly: { time: horas, weather_code: horas.map(() => 2), temperature_2m: horas.map(() => mx - 3), precipitation_probability: horas.map(() => 10), wind_speed_10m: horas.map(() => 15) } });
  return JSON.stringify([z(false, 24), z(false, 25), z(false, 23), z(true, 18), z(true, 20), z(false, 11)]);
}
async function abrir({ dispositivo = 'Pixel 7' } = {}) {
  const srv = await servidor(), url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const b = await chromium.launch(), ctx = await b.newContext({ ...devices[dispositivo], serviceWorkers: 'block' });
  const p = await ctx.newPage(), errores = [];
  p.on('pageerror', e => { if (!/firebase is not defined/.test(e.message)) errores.push(e.message); });
  p.on('dialog', d => d.accept());
  await p.route('**/firebase-config.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.FIREBASE_CONFIG={apiKey:"x"};' }));
  await p.route('**/vendor/**', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await p.route(/wikimedia\.org|webtenerife\.com\/-\/media|tile\.openstreetmap\.org/, r => r.fulfill({ contentType: 'image/png', body: PIXEL }));
  await p.route('https://api.open-meteo.com/**', r => r.fulfill({ contentType: 'application/json', body: tiempoFalso() }));
  await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForFunction(() => typeof SITIOS !== 'undefined' && SITIOS.length > 100, null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const cerrar = async () => { await b.close(); srv.close(); };
  return { p, errores, cerrar };
}
// Entra en un grupo falso («Familia», tú + Ana + Leo) con Firestore en memoria: window.__store tiene lo guardado.
async function conGrupo(p) {
  await p.evaluate(async () => {
    window.firebase = { firestore: { FieldValue: { serverTimestamp: () => Date.now(), arrayUnion: x => ({ u: x }), arrayRemove: x => ({ r: x }), delete: () => ({ del: 1 }) } } };
    const store = {}, subs = {};
    const emit = c => setTimeout(() => { const docs = Object.entries(store[c] || {}).map(([id, d]) => ({ id, data: () => d })); (subs[c] || []).forEach(f => f({ docs, forEach: fn => docs.forEach(fn) })); }, 5);
    const col = c => ({ onSnapshot: f => { (subs[c] = subs[c] || []).push(f); emit(c); return () => {}; },
      add: async d => { const id = 'x' + Math.random().toString(36).slice(2, 7); (store[c] = store[c] || {})[id] = d; emit(c); return { id }; },
      doc: id => ({ set: async d => { (store[c] = store[c] || {})[id] = d; emit(c); }, delete: async () => { delete store[c][id]; emit(c); },
        update: async u => { const d = store[c][id]; for (const [k0, v] of Object.entries(u)) { const ps = k0.split('.'), k = ps.pop(), o = ps.reduce((a, x) => (a[x] = a[x] || {}), d);
          if (v && v.del) delete o[k]; else o[k] = v && v.u ? [...new Set([...(o[k] || []), v.u])] : v && v.r ? (o[k] || []).filter(x => x !== v.r) : v; } emit(c); } }) });
    NUBE.db = { collection: () => ({ doc: () => ({ collection: c => col(c) }) }) }; window.__store = store;
    NUBE.estado = 'lista'; NUBE.user = { uid: 'u1', email: 'x' }; NUBE.perfil = { nombre: 'Yo', emoji: '🌋', color: '#d97706' };
    NUBE.grupo = { id: 'PRUEBA23', nombre: 'Familia', miembros: ['u1', 'u2', 'u3'] };
    NUBE.miembros = { u1: NUBE.perfil, u2: { nombre: 'Ana', emoji: '🐢', color: '#db2777' }, u3: { nombre: 'Leo', emoji: '🦎', color: '#2563eb' } };
    seguirMarcas('PRUEBA23'); seguirPlanes('PRUEBA23'); seguirDisponibilidad('PRUEBA23'); seguirPropios('PRUEBA23');
    await new Promise(r => setTimeout(r, 150)); render();
  });
}
// Pestaña de abajo si existe (planes, explorar, eventos, grupo, mas); si no, la vista (sitios, mapa, tiempo).
const tab = async (p, t) => { if (await p.locator(`#tabs [data-tab="${t}"]`).count()) await p.click(`#tabs [data-tab="${t}"]`); else await p.evaluate(x => ir(x), t); await p.waitForTimeout(300); };
const captura = async (p, nombre, entera = false) => { fs.mkdirSync(CAPTURAS, { recursive: true }); const f = path.join(CAPTURAS, nombre + '.png'); await p.screenshot({ path: f, fullPage: entera }); return path.relative(RAIZ, f); };
module.exports = { abrir, conGrupo, tab, captura };
