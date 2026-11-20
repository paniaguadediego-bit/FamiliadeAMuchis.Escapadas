# FamiliadeAMuchis · Escapadas (Tenerife)

Reglas del proyecto. Viene de `ARRANQUE-TENERIFE.md` del repo
`paniaguadediego-bit/viaje-corea`. Diario de versiones: `PROGRESO.md`.

## Qué es
PWA para el móvil (instalable, funciona sin conexión) para descubrir Tenerife
en grupo: sitios por **municipio**, marcarlos (🔖 Quiero ir / ✅ Fuimos /
✖️ No) con ⭐ y nota, y **ver lo que ha marcado cada miembro del grupo, al
momento y sin pasarse archivos**. Para animarse a hacer planes los fines de
semana y, al proponer uno, saber quién ya lo ha hecho.

## Punto de partida
Esqueleto tomado de `paniaguadediego-bit/viaje-corea` (repo público): service
worker y caché offline, manifest, pestañas inferiores, fichas plegables,
marcas y estrellas, mapa propio sin librerías (puntos offline y calles de
OpenStreetMap con conexión), buscador sin tildes, tema claro/oscuro.
Lo de Corea **no se trae** (Naver, Kakao, hangul, idioma, ₩/€, metro, vuelos,
traslados, seguro, Lonely Planet, trip.json…). Mejor borrar que arrastrar.
Cuando haga falta algo más de allí (tiempo de Open-Meteo, diario, Resumen en
Word/PDF con `exportar.js`, Trivial con `trivial.js`) se copia en su sesión y
se adapta, sin restos de Corea.

## Reglas
1. Repo PÚBLICO (GitHub Pages). Nunca subir direcciones de casa, emails,
   teléfonos, cuentas de servicio ni claves privadas de Firebase. El
   `firebaseConfig` de la app web sí puede ir en el código: es público y
   lo que protege los datos son las reglas de Firestore.
2. HTML, CSS y JS puro. Sin frameworks, sin CDN, sin build.
   Excepción aprobada: **Firebase** (Auth con Google y Firestore) como
   única nube, con su SDK copiado en el repo (`vendor/`).
3. Rutas relativas en todo (vive en /FamiliadeAMuchis.Escapadas/):
   start_url "./index.html", sin id ni scope.
4. Funciona sin conexión: las marcas se guardan primero en el móvil y se
   envían en cuanto hay red (cola en localStorage; desde S4, persistencia
   offline de Firestore).
5. Dato dudoso = "VERIFICAR" (`verificar: true` en el sitio). No inventar
   horarios, precios, teléfonos ni coordenadas: cada sitio con su fuente.
6. Mobile-first, una mano, tema claro/oscuro. Un icono por significado
   (ver «Iconos» abajo; no reutilizar uno para otra cosa).
7. Cada sesión acaba con: cómo probarlo en modo avión, versión subida
   (CACHE en sw.js, VERSION en app.js y --css-ver en styles.css, iguales),
   PROGRESO.md actualizado y commit (en `main`, o en la rama de trabajo de
   la sesión y después se fusiona a `main`). Resumen en 5 líneas y
   "Para continuar escribe: Sigue".

## Archivos
- `index.html` · `styles.css` · `app.js` (la app) · `sw.js` (caché).
- `nube.js`: Firebase (entrada con Google, perfil, grupo; desde S4, marcas).
- `firebase-config.js`: `window.FIREBASE_CONFIG` (null = sin nube).
- `vendor/firebase-10.14.1/`: SDK compat (app, auth, firestore), precacheado.
- `firebase/firestore.rules`: reglas; el usuario las pega en la consola.
- `GUIA-FIREBASE.md`: pasos para crear el proyecto desde el móvil.
- `manifest.json` · `icons/` (icon.svg, 192, 512, apple-touch-icon).
- `data/sitios.json`: catálogo público de sitios.
- `PROGRESO.md`: qué se hizo en cada versión y qué falta.

## Datos
`data/sitios.json` (público): `[{id, municipio, nombre, tipo, lat, lon,
desc, fuente, url, verificar?, duracion?, dificultad?, acceso?}]`.
- `id`: corto, sin tildes ni espacios, estable (las marcas van por id: no
  cambiarlo nunca una vez publicado).
- `municipio`: exactamente uno de los 31 de abajo.
- `desc`: redacción propia, 1-3 frases. `fuente`: de dónde sale el dato
  (nombre) y `url`: enlace a esa fuente.

Tipos: 🥾 sendero, 🏖️ playa/charco, 👀 mirador, 🏘️ pueblo, 🏛️ museo,
🌳 naturaleza, 🍷 guachinche, 🍽️ restaurante, 🎟️ evento, ✨ curioso.
(Claves en el JSON: `sendero, playa, mirador, pueblo, museo, naturaleza,
guachinche, restaurante, evento, curioso`.)

Municipios (31): Adeje, Arafo, Arico, Arona, Buenavista del Norte,
Candelaria, El Rosario, El Sauzal, El Tanque, Fasnia, Garachico,
Granadilla de Abona, Guía de Isora, Güímar, Icod de los Vinos, La Guancha,
La Matanza de Acentejo, La Orotava, La Victoria de Acentejo, Los Realejos,
Los Silos, Puerto de la Cruz, San Cristóbal de La Laguna, San Juan de la
Rambla, San Miguel de Abona, Santa Cruz de Tenerife, Santa Úrsula,
Santiago del Teide, Tacoronte, Tegueste, Vilaflor de Chasna.

## Iconos (uno por significado)
- Pestañas: 🏠 Este finde · 📍 Sitios · 🗺️ Mapa · 👥 Grupo · ☰ Más.
- Marcas: 🔖 Quiero ir · ✅ Fuimos · ✖️ No · ⭐ valoración · 📝 nota.
- 🌐 Google Maps (abrir fuera) · 🔍 buscar · ⚠️ VERIFICAR · 📚 fuente.
- Tema: 🌓 auto · ☀️ claro · 🌙 oscuro.

## Marcas en el móvil (S1-S3)
`localStorage['esc.marcas']` = `{ [sitioId]: {estado: 'quiero'|'fuimos'|'no',
estrellas: 0-5, nota, fecha, actualizado} }`. Mismos campos que tendrán en
Firestore (`grupos/{gid}/marcas/{uid}_{sitioId}`), para subirlas tal cual en S4.
Copia de seguridad: Más → Exportar / Importar marcas (archivo JSON).

## Compartir en el grupo (Firebase, de Google)
- El usuario lo hace todo desde el móvil: la sesión le guía con pasos muy
  sencillos para crear el proyecto en console.firebase.google.com (gratis,
  plan Spark), activar la entrada con Google y Firestore, añadir
  `paniaguadediego-bit.github.io` a los dominios autorizados y pegar en el
  chat el `firebaseConfig` de la app web.
- Entrada con **cuenta de Google** (`signInWithPopup`; en una PWA instalada
  el redirect falla por el bloqueo de almacenamiento de terceros: probarlo
  en el móvil del usuario). Una vez por móvil.
- SDK de Firebase (app, auth y firestore) **copiado en el repo** (carpeta
  `vendor/`, versión fija y precacheada), sin CDN.
- Datos en Firestore:
  - `perfiles/{uid}`: nombre, emoji, color
  - `grupos/{gid}`: nombre, codigoInvitacion, miembros [uid], creadoPor, creado.
    El id del grupo ES el código de invitación (8 caracteres al azar de
    `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, se muestra ABCD-2345): no se puede
    listar ni adivinar; con él uno se añade a sí mismo (arrayUnion).
  - `grupos/{gid}/marcas/{uid}_{sitioId}`: uid, sitioId, estado
    (quiero|fuimos|no), estrellas, nota, fecha, actualizado
  - Más adelante `grupos/{gid}/planes/{id}`: sitioId, fecha, propone,
    apuntados [uid]
- Reglas de seguridad en `firebase/firestore.rules` (en el repo; el usuario
  las pega en la consola): cada uno escribe solo sus marcas y su perfil;
  lee las marcas de los grupos en los que está; se entra a un grupo con
  su código de invitación.
- Al día y sin conexión: `onSnapshot` (las marcas de los demás aparecen al
  momento) y la persistencia offline de Firestore (lo marcado sin red se
  envía solo al volver).
- En cada ficha: caritas de quién fue (✅), quién quiere ir (🔖) y sus ⭐.
  Pestaña 👥 Grupo: quién lleva más sitios, últimas marcas y «nadie ha ido
  todavía».

## Hoja de ruta (una por sesión, en orden)
- **S1** Esqueleto desde viaje-corea, limpio de Corea. Pestañas: 🏠 Este
  finde, 📍 Sitios (por municipio y tipo), 🗺️ Mapa, 👥 Grupo (vacío de
  momento), ☰ Más. Unos 20 sitios de ejemplo REALES con fuente. Marcas
  solo en el móvil. Instrucciones para activar GitHub Pages.
- **S2** Catálogo: unos 100-150 sitios repartidos por los 31 municipios,
  con coordenadas, descripción propia y fuente; dudosos con VERIFICAR.
- **S3** Firebase: guía para crear el proyecto desde el móvil, reglas de
  Firestore, entrada con Google, perfil (nombre y emoji), grupo
  «Familia de A Muchis» con código de invitación.
- **S4** Marcas compartidas al momento (onSnapshot), sin conexión con la
  persistencia de Firestore, caritas en fichas y mapa, pestaña Grupo.
- **S5** Este finde: tiempo por zona (norte/sur/cumbre), «🎲 Sorpréndeme»
  (algo que nadie del grupo o tú no hayáis hecho, según tiempo y tiempo
  disponible), distancia desde casa (la ubicación de casa solo en el móvil).
- **S6** Planes propuestos al grupo (proponer fecha, apuntarse), diario,
  Resumen anual en PDF y Trivial canario.

## Decisiones ya tomadas por el usuario
- Nombre: FamiliadeAMuchis.Escapadas.
- Organización por municipios.
- El catálogo inicial lo prepara Claude.
- Lo ya visitado se marcará con la app hecha.
- Marcas compartidas y automáticas desde el principio del diseño; amigos
  poco a poco (grupos con código de invitación).
- Nube: Firebase con cuenta de Google (no Supabase: ya tiene 2 proyectos).
- Todo se hace desde el móvil.

## Cómo se hace el catálogo (S2)
- Fuente principal: Wikipedia en español. `list=geosearch` por una cuadrícula
  de la isla da los artículos con coordenadas; `prop=extracts` (intro) da el
  texto para comprobar el municipio y redactar la descripción propia.
- La API de Wikipedia exige un User-Agent identificable (sin datos personales),
  p. ej. `EscapadasCatalogo/1.0 (https://github.com/paniaguadediego-bit/FamiliadeAMuchis.Escapadas)`,
  y pausas entre peticiones (si no, 429).
- Coordenadas = las del artículo. Municipio = el que dice el artículo; si no
  lo dice, VERIFICAR. Horarios, precios, reservas: nunca de memoria → VERIFICAR.
- Guachinches y restaurantes: sin fuente fiable todavía; no se añaden hasta tenerla.
