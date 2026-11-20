# PROGRESO

## v3 · S3 · Firebase: entrada, perfil y grupo (2026-11-20)
Hecho:
- SDK de Firebase 10.14.1 (compat: app, auth, firestore) copiado en `vendor/` y precacheado.
- `nube.js`: entrada con Google (`signInWithPopup`), perfil (nombre, emoji, color),
  crear grupo «Familia de A Muchis» con código de invitación, unirse con código,
  pasar el código (compartir/copiar), lista de miembros al momento (onSnapshot),
  salir del grupo y cerrar sesión. Persistencia offline de Firestore activada.
- `firebase/firestore.rules`: perfiles (cada uno el suyo), grupos (solo miembros;
  con el código, uno se añade a sí mismo), marcas preparadas para S4.
- `GUIA-FIREBASE.md`: pasos desde el móvil.
- Sin `firebase-config.js` relleno la app sigue igual (Grupo dice «aún no conectado»).

Probado: sin configuración; con configuración falsa (el SDK carga, sale «Entrar
con Google»); pantallas de perfil y grupo simuladas. **Sin probar contra Firebase
real**: falta que el usuario cree el proyecto y pegue `firebaseConfig`.
Pendiente de probar en el móvil: el popup de Google con la app instalada.

Siguiente: pegar la configuración → probar entrada y grupo → **S4** marcas compartidas.

## v2 · S2 · Catálogo (2026-11-20)
Hecho:
- `data/sitios.json`: 148 sitios en los 31 municipios (mín. 1 por municipio;
  Santa Cruz 26, La Laguna 11, La Orotava 11…). Tipos: 48 pueblos, 28 curiosos,
  19 playas/charcos, 17 senderos, 12 museos, 11 miradores, 11 naturaleza, 2 eventos.
- Coordenadas sacadas de Wikipedia (geosearch); las de la S1 que eran de memoria
  quedan sustituidas. Descripción propia a partir del resumen de cada artículo;
  fuente y enlace en cada ficha.
- Municipios comprobados con el texto del artículo; corregidos: Roque del Conde y
  Tijoco (Adeje), Molino de Llano del Moro y Pico del Inglés (Santa Cruz),
  Montaña de Tejina (Guía de Isora).
- 57 sitios con VERIFICAR (horarios, precios, reservas, accesos o municipio).
  Charco de la Laja y Mirador de Humboldt siguen con coordenadas aproximadas
  (su artículo no tiene coordenadas).
- Mapa: con la isla entera, puntitos (blancos sin marcar, azul 🔖, verde ✅);
  al acercar, iconos por tipo, separados si se pisan.
- Ids de la S1 conservados (las marcas guardadas siguen valiendo).

Pendiente: guachinches y restaurantes (sin fuente fiable aún); más eventos con fecha.
Siguiente: **S3** Firebase.

## v1 · S1 · Esqueleto (2026-11-20)
Hecho:
- `CLAUDE.md` a partir de `ARRANQUE-TENERIFE.md` (viaje-corea), con las reglas,
  el modelo de datos, los iconos y la hoja de ruta S1-S6.
- PWA nueva y limpia (nada de Corea): `index.html`, `styles.css`, `app.js`,
  `sw.js` (caché `escapadas-v1` + caché aparte `escapadas-mapa` para las calles
  vistas), `manifest.json` (rutas relativas, sin id ni scope), iconos propios.
- Pestañas: 🏠 Este finde (fechas del finde, recuento, 🔖 lo que queréis hacer,
  💡 3 ideas sin marcar que cambian cada día) · 📍 Sitios (por municipio,
  filtros por tipo y marca, buscador sin tildes, fichas plegables) ·
  🗺️ Mapa propio (OpenStreetMap con conexión; sin ella, puntos sobre la
  silueta de la isla; filtro por tipo; ficha con «Ver ficha» y 🌐 Google Maps) ·
  👥 Grupo (vacío, explica lo que llegará) · ☰ Más (tema, exportar/importar
  marcas, instalar, sobre los datos, borrar).
- Marcas solo en el móvil (`localStorage['esc.marcas']`): 🔖 / ✅ / ✖️, ⭐ 1-5
  y nota, con `fecha` y `actualizado` (mismos campos que irán a Firestore).
- `data/sitios.json`: 22 sitios reales en 15 municipios, cada uno con fuente
  (Wikipedia).

Pendiente / avisos:
- ⚠️ Las coordenadas de los 22 sitios son aproximadas y están todas con
  VERIFICAR: en esta sesión no se pudo abrir Wikipedia (red bloqueada) para
  comprobarlas. Revisarlas en S2.
- Horarios, precios, reservas y accesos: no se han puesto; donde importan,
  van en el texto de VERIFICAR.
- La silueta de la isla del mapa sin conexión es aproximada (solo de fondo).

Probado (Chromium, Pixel 7 emulado): marcar, estrellas, nota, buscador,
filtros, mapa, tema oscuro y recarga en modo avión con todo funcionando.

Siguiente: **S2** catálogo de 100-150 sitios por los 31 municipios.
