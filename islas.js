'use strict';
// 🏝️ Islas y municipios: identidad visual (color, emoji, lema, foto de portada) y esqueleto para otras islas.
// Hoy solo Tenerife tiene catálogo; el resto sale «próximamente». Para activar una isla en el futuro:
// 1) sus sitios en data/sitios.json con "isla": "<id>"; 2) aquí, activa: true, centro, zoom, municipios y silueta;
// 3) zonas del tiempo de esa isla (finde.js) y su ISLA para el mapa sin conexión.

const ISLAS = {
  tenerife: { nombre: 'Tenerife', ic: '🌋', activa: true, centro: [28.29, -16.6] },
  'gran-canaria': { nombre: 'Gran Canaria', ic: '🏜️', activa: false, centro: [27.96, -15.6] },
  lanzarote: { nombre: 'Lanzarote', ic: '🌵', activa: false, centro: [29.04, -13.63] },
  fuerteventura: { nombre: 'Fuerteventura', ic: '🏄', activa: false, centro: [28.36, -14.05] },
  'la-palma': { nombre: 'La Palma', ic: '🔭', activa: false, centro: [28.68, -17.86] },
  'la-gomera': { nombre: 'La Gomera', ic: '🌳', activa: false, centro: [28.11, -17.22] },
  'el-hierro': { nombre: 'El Hierro', ic: '🐢', activa: false, centro: [27.74, -18.02] },
  'la-graciosa': { nombre: 'La Graciosa', ic: '🏝️', activa: false, centro: [29.25, -13.51] }
};
const islaDe = s => (s && s.isla) || 'tenerife';

// Cada municipio de Tenerife: tono de color (h, 0-360), emoji, lema (sacado de lo que dice el catálogo)
// y el sitio cuya foto hace de portada del banner.
const MUNI = {
  'Adeje': { h: 190, ic: '🏖️', lema: 'Costa, barrancos y el Roque del Conde', portada: 'barranco-infierno' },
  'Arafo': { h: 28, ic: '⛰️', lema: 'Medianías del valle de Güímar', portada: 'arafo' },
  'Arico': { h: 42, ic: '🌊', lema: 'Casco histórico y pueblos de costa', portada: 'faro-punta-abona' },
  'Arona': { h: 14, ic: '☀️', lema: 'Playas del sur y montañas volcánicas', portada: 'los-cristianos' },
  'Buenavista del Norte': { h: 140, ic: '🌄', lema: 'Teno: Masca, el faro y los caseríos', portada: 'masca' },
  'Candelaria': { h: 222, ic: '🕯️', lema: 'La Virgen de Candelaria y los menceyes', portada: 'basilica-candelaria' },
  'El Rosario': { h: 160, ic: '🌲', lema: 'De la cumbre de La Esperanza al mar', portada: 'la-esperanza' },
  'El Sauzal': { h: 262, ic: '🌅', lema: 'Asomado al mar del norte', portada: 'el-sauzal' },
  'El Tanque': { h: 98, ic: '🌿', lema: 'Medianías del noroeste, camino de Erjos', portada: 'el-tanque' },
  'Fasnia': { h: 36, ic: '🏜️', lema: 'Sureste tranquilo entre medianías y costa', portada: 'los-roques-fasnia' },
  'Garachico': { h: 2, ic: '🌋', lema: 'Villa histórica sobre la lava de 1706', portada: 'garachico-caleton' },
  'Granadilla de Abona': { h: 24, ic: '🏄', lema: 'El Médano, el viento y Montaña Roja', portada: 'el-medano' },
  'Guía de Isora': { h: 330, ic: '🌅', lema: 'Oeste soleado: costa y medianías', portada: 'alcala' },
  'Güímar': { h: 50, ic: '🗿', lema: 'Pirámides, malpaís y la romería del Socorro', portada: 'piramides-guimar' },
  'Icod de los Vinos': { h: 120, ic: '🌳', lema: 'El Drago y la Cueva del Viento', portada: 'drago-milenario' },
  'La Guancha': { h: 88, ic: '🏘️', lema: 'Medianías del norte', portada: '' },
  'La Matanza de Acentejo': { h: 280, ic: '⚔️', lema: 'Escenario de la primera batalla de Acentejo', portada: 'caleton-matanza' },
  'La Orotava': { h: 8, ic: '🌋', lema: 'Del valle al Teide: balcones y Cañadas', portada: 'teide' },
  'La Victoria de Acentejo': { h: 300, ic: '⚔️', lema: 'Donde terminó la conquista de Canarias', portada: '' },
  'Los Realejos': { h: 150, ic: '🌴', lema: 'Rambla de Castro y la ladera de Tigaiga', portada: 'rambla-castro' },
  'Los Silos': { h: 74, ic: '🌿', lema: 'Huertas del noroeste y monte de Teno', portada: 'monte-del-agua' },
  'Puerto de la Cruz': { h: 184, ic: '🌊', lema: 'Lago Martiánez y jardines tropicales', portada: 'lago-martianez' },
  'San Cristóbal de La Laguna': { h: 345, ic: '🏛️', lema: 'Patrimonio de la Humanidad y montes de Anaga', portada: 'catedral-laguna' },
  'San Juan de la Rambla': { h: 200, ic: '⛪', lema: 'Pequeño casco entre la carretera y el mar', portada: 'san-juan-rambla' },
  'San Miguel de Abona': { h: 46, ic: '🏘️', lema: 'Casco histórico del sur', portada: 'san-miguel' },
  'Santa Cruz de Tenerife': { h: 214, ic: '⚓', lema: 'La capital, el carnaval y el macizo de Anaga', portada: 'teresitas' },
  'Santa Úrsula': { h: 270, ic: '⛪', lema: 'Sobre el valle de La Orotava', portada: 'iglesia-santa-ursula' },
  'Santiago del Teide': { h: 205, ic: '🧗', lema: 'Los Gigantes y almendros en flor', portada: 'los-gigantes' },
  'Tacoronte': { h: 355, ic: '🏖️', lema: 'Playas de arena negra bajo el acantilado', portada: 'playa-arena-tacoronte' },
  'Tegueste': { h: 110, ic: '🌾', lema: 'Casco antiguo y valle del Socorro', portada: 'tegueste' },
  'Vilaflor de Chasna': { h: 130, ic: '🌲', lema: 'Pinares, Paisaje Lunar y el Hermano Pedro', portada: 'vilaflor' }
};
const muniTema = m => MUNI[m] || { h: 200, ic: '🏘️', lema: '', portada: '' };
// Variables CSS del banner: dos tonos del color del municipio.
const varsMuni = m => `--h:${muniTema(m).h}`;
