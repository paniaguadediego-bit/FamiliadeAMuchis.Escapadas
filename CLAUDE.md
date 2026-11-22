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
- `finde.js`: 🏠 Este finde (tiempo por zona de Open-Meteo, 🎲 Sorpréndeme, casa).
- `diario.js`: 📔 diario (tus ✅ por fecha) y 🖨️ Resumen del año (hoja + Imprimir → PDF).
- `planes.js`: 📅 planes del grupo y calendario de los próximos 10 findes.
- `agenda.js`: 🎭 ¿Qué hay? (buscador cultural en Este finde).
- `propios.js`: 👥 sitios que añade el grupo (`BASE` = catálogo; `mezclarSitios()` → `SITIOS`).
- `eventos.js`: 🎟️ fechas de eventos (regla `cuando`), portada de Este finde, pestaña Eventos y agenda automática.
- `herramientas/agenda_webtenerife.py` → `data/agenda.json` (lo ejecuta `.github/workflows/eventos.yml`).
- `herramientas/cartelera_sensacine.py` → `data/cine.json` (cada mañana con `.github/workflows/cine.yml`).
- `herramientas/guachinches_cabildo.py`: guachinches del censo del Cabildo (ids `gua-…`).
- `herramientas/fiestas_boc.py`: fiestas patronales (eventos `fiesta-…`) desde `data/festivos.json`.
- `festivos.js` + `data/festivos.json`: 🎉 festivos nacionales/Canarias/Tenerife (BOE) y los 2 locales de cada
  municipio (BOC, con sus enlaces en `fuentes`). Los locales que se ven, los del municipio elegido en Más (`esc.mimuni`).
- `islas.js`: islas (Tenerife activa, el resto «pronto») y la identidad de cada
  municipio (`MUNI`: tono `h`, emoji, lema, `portada` = sitio cuya foto va en el banner).
- `data/fotos.json`: `{ sitioId: { src, archivo } }`, foto principal del artículo de
  Wikipedia (Wikimedia Commons). Sin banderas, escudos, logos ni mapas.
- Orden de carga (index.html): firebase-config, islas, festivos, nube, eventos, planes, propios, finde, agenda, diario, app.
  Los archivos anteriores a app.js no usan load/save/SITIOS al cargar, solo dentro de funciones.
  Se carga antes que `app.js`: nada de `load`/`save` al cargar, solo dentro de funciones.
- `firebase-config.js`: `window.FIREBASE_CONFIG` (null = sin nube).
- `vendor/firebase-10.14.1/`: SDK compat (app, auth, firestore), precacheado.
- `firebase/firestore.rules`: reglas. Se publican SOLAS al subirlas a `main`
  (`.github/workflows/reglas-firestore.yml` + `firebase.json`). El usuario no toca la consola.
- `GUIA-FIREBASE.md`: pasos para crear el proyecto desde el móvil.
- `manifest.json` · `icons/` (icon.svg, 192, 512, apple-touch-icon).
- `data/sitios.json`: catálogo público de sitios.
- `PROGRESO.md`: qué se hizo en cada versión y qué falta.
- `IDEAS.md`: ideas del usuario para más adelante (mirar al empezar cada sesión).

## Datos
`data/sitios.json` (público): `[{id, municipio, nombre, tipo, lat, lon,
desc, fuente, url, verificar?, duracion?, dificultad?, acceso?, isla?, cuando?, cuandoTxt?}]`.
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
- Pestañas (v29, 5): 🏠 Planes · 🧭 Explorar (📋 Lista ⇄ 🗺️ Mapa) · 🎟️ Eventos · 👥 Grupo · ☰ Más. 🌤️ Tiempo se abre desde Planes.
- 🕐 media jornada (Sorpréndeme); 🌤️ es solo el tiempo.
- Marcas: 🔖 Quiero ir · ✅ Visitado (en datos sigue siendo `fuimos`) · ✖️ No · ⭐ valoración · 📝 nota · 🧸 bien con niños.
- 🎬 cine (cartelera y categoría de eventos) · 🗣️ versión original.
- 🌐 Google Maps (abrir fuera) · 🔍 buscar · ⚠️ VERIFICAR · 📚 fuente.
- Días: 👍 puedo ese día · 🙅 no puedo · 🎉 festivo · 🌆 víspera (tarde antes de un festivo).
- Planes: 🎠 carrusel de un finde · 💡 idea (sitio que encaja) · 🔎 nivel de zoom del mapa · 💫 mejor día · 🗳️ votar fechas · 📤 compartir.
- 🏞️ orden «por zona» en Sitios (🧭 es Explorar).
- Tema: 🌓 auto · ☀️ claro · 🌙 oscuro.

## Marcas
- En el móvil: `localStorage['esc.marcas']` = `{ [sitioId]: {estado: 'quiero'|'fuimos'|'no',
  estrellas: 0-5, nota, fecha, actualizado} }`. Siempre se guardan aquí primero.
- En el grupo (S4, `nube.js`): `grupos/{gid}/marcas/{uid}_{sitioId}` con los mismos
  campos + uid y sitioId. `setMarca` (app.js) llama a `subirMarca` (nube.js).
- Quitar una marca = subirla vacía (estado '', estrellas 0, nota ''), nunca borrar
  el documento; `localStorage['esc.borradas']` guarda cuándo se quitó hasta subirla.
- Al conectar con el grupo (`sincronizarMias`): por cada sitio gana lo más
  reciente (`actualizado`) entre el móvil y la nube.
- Las de todos llegan con `onSnapshot` → `NUBE.marcasGrupo[sitioId][uid]`.
  Sin red, la persistencia de Firestore guarda lo escrito y lo envía al volver.
- Copia de seguridad: Más → Exportar / Importar marcas (archivo JSON).

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
  - `grupos/{gid}/planes/{id}`: sitioId ('' si es destino libre), destino, isla,
    fecha (AAAA-MM-DD), hasta (opcional), nota, propone, apuntados [uid], creado,
    planB? { sitioId, destino } (lo pone o cambia cualquiera del grupo). Cada uno se apunta/borra a sí mismo; quien propone
    edita fecha y nota o lo cancela.
- Reglas de seguridad en `firebase/firestore.rules`. Las publica GitHub Actions
  al cambiar en `main`, con el secreto `FIREBASE_REGLAS_KEY` (llave JSON de la cuenta
  de servicio `reglas-github`, roles «Administrador de reglas de Firebase» y
  «Consumidor de Service Usage»: no puede leer ni tocar datos). La llave NUNCA va al
  repo ni al chat. Tras cambiar reglas: comprobar que la ejecución termina en verde.
  Lo que permiten: cada uno escribe solo sus marcas y su perfil;
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
- **S6** Planes propuestos al grupo (proponer fecha, apuntarse), diario y
  Resumen anual en PDF. (El Trivial canario se descartó por decisión del usuario.)

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
- Guachinches (v28): los 97 del censo de hostelería del Cabildo (datos abiertos CC BY), con `herramientas/guachinches_cabildo.py`
  (ids `gua-…`; solo nombre, municipio y coordenadas, nunca teléfonos ni direcciones; VERIFICAR: abren por temporada).
  Restaurantes: no se cargan (miles); los añade el grupo.

## Este finde (S5)
- Zonas (elegidas por el usuario, 6): 🌅 Oeste (Santiago del Teide, Guía de Isora),
  🏝️ Sur (Adeje… Fasnia, Vilaflor), ⚓ Este (Santa Cruz, El Rosario costa, Candelaria,
  Güímar, Arafo), 🏛️ La Laguna (+ Tegueste, La Esperanza), 🌿 Norte (resto + costa
  norte y cumbres de Anaga, lat > 28.53), 🌋 Teide y alrededores (< 11 km del pico al
  sur de lat 28.33, y La Orotava por encima de lat 28.35).
- Tiempo: Open-Meteo, una petición para las 6 zonas y 16 días, guardada en `esc.tiempo16`
  (como mucho cada 3 h; sin red se ve la última). En Este finde, la tabla cambia entre los
  findes con previsión (este, el que viene, en 2 semanas; aviso si es a más de una semana);
  en el calendario, cada finde con previsión lleva una línea con el tiempo por zona.
- (v21) «Mi casa» se quitó. «📍 Más cerca de mí» pide la ubicación solo al elegir ese orden y la deja en memoria.
- Sorpréndeme: sin ✅ ni ✖️ tuyos; «que nadie haya ido» mira al grupo; descarta por
  tiempo (playa: sol y ≥ 21°; cumbre: nieve o viento ≥ 60; lluvia: solo museos) y por
  rato (☕ ≤ 25 min sin senderos, 🌤️ ≤ 50 min, 🎒 todo). Más papeletas a lo que
  tú o el grupo tenéis en 🔖.

## Diario y resumen (S6)
- La fecha de una visita es `fecha` de la marca: se pone sola al marcar ✅ y se puede
  cambiar en la ficha («📅 Fuimos el») o dejar vacía (no sale en el resumen).
- Resumen del año: `#resumen` encima de la app; `@media print` oculta todo lo demás.
  El móvil lo guarda en PDF con Imprimir → Guardar como PDF (sin librerías).

## Aspecto (v9, inspirado en viaje-corea)
- Banner por municipio (31): degradado `hsl(h 55% 28%) → hsl(h+35 62% 42%)` con su foto
  de portada encima y un velo del mismo color para que se lea el texto blanco.
- Fotos: miniatura (330 px, si no existe se usa la de 960) en la ficha cerrada; foto
  grande con crédito «📷 Wikimedia Commons» al abrirla; en el mapa, los planes,
  Sorpréndeme y la portada de Este finde (foto del próximo plan o el Teide).
- El service worker guarda las fotos vistas en `escapadas-fotos` (no se borra al
  actualizar); en Más, «Descargar todas las fotos» (~15 MB) para ir sin cobertura.
- Sitios sin foto en data/fotos.json: banner o icono de color, sin inventar fotos.

## Otras islas (esqueleto)
- DECISIÓN DEL USUARIO (v18): por ahora SOLO Tenerife, para afinarlo todo antes. Las islas con
  `activa: false` no se enseñan en ningún sitio (filtros, formulario de planes). El esqueleto queda.
- El mapa solo dibuja los sitios de la isla elegida (`enIsla`), para no cargar puntos de todas.
- Para activar una isla: sitios con `"isla": "<id>"`, `activa: true` y datos en
  islas.js, municipios y portadas, zonas del tiempo en finde.js y silueta del mapa.

## Eventos con fecha (v10)
- Son sitios de tipo `evento` con `cuando` (regla de fecha) y `cuandoTxt` (cómo lo dice la fuente):
  `{"tipo":"fija","mes":9,"dia":7,"dias":2}` · `{"tipo":"pascua","desde":-51,"hasta":-42}` (días
  respecto al Domingo de Pascua, calculado) · `{"tipo":"semana","mes":7,"dow":0,"n":2}` (n-ésimo
  día de la semana; n = -1 el último) · `{"tipo":"fechas","lista":[["AAAA-MM-DD","AAAA-MM-DD"]]}`.
- La regla sale SIEMPRE de la fuente (frase literal del artículo). Si la fuente no da el día
  exacto (programas que cambian), VERIFICAR.
- Se ven en la ficha («📅 Próxima»), en Este finde («🎟️ Este finde hay…» y «Lo próximo», 120 días)
  y como chips en el calendario de findes. Sorpréndeme no propone eventos.

## Compacto, letra e icono (v11)
- Todo se mide en `rem`: el tamaño de letra de ☰ Más (`esc.letra`: compacta 14,5 px por
  defecto, normal 16, grande 18; `data-letra` en <html>, puesto ya en index.html) escala la app.
- Un finde libre del calendario ocupa una línea. 🙅 = «no puedo ese finde» (solo ese significado).
- `grupos/{gid}/disponibilidad/{uid}`: { uid, nopuedo: [sábados AAAA-MM-DD], actualizado }; cada
  uno escribe el suyo, lo ve el grupo; las fechas pasadas se limpian al cambiar.
- Icono: el archipiélago canario (icons/icon.svg; icon-maskable.svg para Android, más pequeño y
  sin esquinas). Se regenera con un script de Playwright (PNG 192, 512, maskable 512, apple 180).
  Provisional: el usuario puede entregar su propia imagen.

## Estilo y filtros (v12, como viaje-corea)
- Fondo de papel cálido (`--papel`) con textura diagonal suave; franja azul-amarillo-blanco
  (bandera de Canarias) bajo la cabecera; tarjetas blancas con sombra (`--sombra`); pestaña
  activa en pastilla; buscador en píldora.
- Sitios: nada de filas que se deslizan. «⚙️ Filtros ▾» abre un panel con rejillas de botones
  (icono arriba): Tipo, Tus marcas, El grupo (nadie ha ido / alguien quiere ir / alguien fue),
  Zona (las 6 del tiempo) e Isla. Los activos salen como etiquetas con ✕.
- «↕️ Orden» (desplegable, se recuerda en `esc.orden`): por municipio (banners), por zona
  (banners), nombre, más cerca de casa, mejor valorados (media de ⭐ tuyas y del grupo),
  más deseados (🔖 tuyas y del grupo).
- Mapa: un desplegable de tipo; la isla se elige en el panel de filtros de Sitios.

## Plan B (v13)
- 🅱️ = plan B (solo ese significado). Se pone al proponer, o después en la tarjeta del plan.
- Si hay previsión para el día del plan (10 días) y `tiempoVale` dice que no (lluvia, viento,
  nieve en el Teide, playa sin sol), sale «🌧️ El tiempo pinta mal» con el plan B (y si su zona
  acompaña) o 3 ideas: que encajen con el tiempo, cerca del plan A, primero museos y lo que el
  grupo quiere (🔖). «🅱️ Usar» las guarda como plan B.

## Sitios del grupo (v16)
- `grupos/{gid}/sitios/{id}`: { nombre, tipo, municipio, lat, lon, desc, url, autor, creado,
  actualizado }. Los añade cualquiera del grupo (Sitios → «➕ Añadir un sitio»); solo el autor
  los edita o borra. En la app: id `g-<id>`, `propio: true`, fuente «Añadido por …», sin foto.
- Ubicación: «📍 Estoy aquí» (GPS), «🗺️ Tocar en el mapa» (`MP.elegir`) o pegar un enlace largo
  de Google Maps (`@lat,lon`, `!3d…!4d…`, `?q=lat,lon`). Municipio propuesto: el del sitio del
  catálogo más cercano (se puede cambiar).
- Es la vía para guachinches y restaurantes mientras no haya una fuente pública fiable: no los
  inventa la app, los aporta el grupo.

## ¿Qué hay? (v17)
- 🎭 = buscador cultural (solo ese significado). En Este finde: qué (teatro, cine, conciertos,
  fiestas de pueblo, con niños, exposiciones, mercadillos), dónde (isla o municipio) y qué finde.
- No hay agenda abierta que leer y no se inventan programaciones ni direcciones de webs: se arma
  la búsqueda con las fechas exactas (Google y Google Noticias), se listan los sitios del catálogo
  que encajan con «🔎 Programación» y, en fiestas, los eventos con fecha de ese finde.
- «📅 Proponer al grupo lo que encuentres» abre el formulario de plan de ese finde.

## Este finde, Tiempo y mapa (v18, pedido del usuario)
- Este finde, en este orden: fechas (viernes · sábado · domingo) → 🎟️ eventos en grande (los de
  este finde, los de las 2 semanas siguientes y los `destacado: true` de los próximos 4 meses; hasta
  4, con cuenta atrás) → planes y calendario → 🌤️ resumen del tiempo (buen/regular/mal tiempo por
  zonas; al tocarlo, pestaña Tiempo) → 🎭 ¿Qué hay? → 🎲 Sorpréndeme → ganas.
- Eventos destacados (`destacado: true` en sitios.json): Carnaval, alfombras del Corpus de La Orotava,
  Romería del Socorro, Peregrinación a Candelaria, Fiestas de la Cruz de Los Realejos, Semana Santa
  de La Laguna, San Benito, Gran Poder y Carmen del Puerto.
- 🌤️ Tiempo (pestaña): el finde (viernes tarde, sábado, domingo) con los 3 findes con previsión, y
  los próximos 7 días por zona. Viernes tarde = horas 14-20 de la previsión por horas, guardado como
  «AAAA-MM-DDT» (lo peor de esas horas). Caché `esc.tiempo16h`.
- Mapa: puntitos de 7 px hasta 1 nivel de zoom por encima del de la isla entera (`MP.zFit`); desde
  2 niveles, el icono de cada tipo (separados si se pisan).

## Eventos automáticos y pestaña Eventos (v19)
- Fuente automática: la agenda pública de Turismo de Tenerife (webtenerife.com/agenda; su robots.txt
  la permite). `herramientas/agenda_webtenerife.py` lee de cada página el bloque schema.org «Event»
  (nombre, fechas, descripción, foto, dirección), deduce municipio y categoría del texto y guarda
  `data/agenda.json` (próximos 4 meses; sin exposiciones de más de 120 días). Lo ejecuta GitHub Actions
  lunes y jueves y al cambiar el lector; solo sube a `main` si cambian los eventos.
- En la app: sitios `agenda: true`, id `ag-<slug>`, `cuando` de tipo fechas, foto en `FOTOS_AG` (crédito
  «📷 Turismo de Tenerife»), fuente = su página. Sin coordenadas: centro del municipio (`aprox`), no
  salen en Sitios ni en el mapa salvo con el tipo «Evento»; Google Maps busca por el lugar.
- Descartado: sacar fiestas de los artículos de municipios de Wikipedia de forma automática (casi todas
  las fechas del texto eran de otras cosas: plenos, himnos…). Las fiestas siguen siendo las 14 revisadas.
- Pestaña 🎟️ Eventos: categorías (🎉 fiestas, 🎵 música, 🎬 cine (v24), 🎭 teatro, 🏃 deporte, 🖼️ expos, 🛍️ ferias,
  🧸 niños), cuándo (este finde, el que viene, próximo mes, 4 meses) y zona; agrupados por semana; enlace
  a Este finde. «➕ Añadir un evento» del grupo (sitios del grupo con `desde`/`hasta`).
- Orden de importancia (portada y listas): lo que empieza en esas fechas, lo corto, destacados, con foto.
- Calendario de findes: el tiempo solo si se prevé lluvia (zonas y días, incluido el viernes tarde).

## Planes, disponibilidad y festivos (v21, pedido del usuario)
- La pestaña 🏠 «Este finde» pasa a ser **Planes**: fechas → carrusel con todos los eventos de este finde (deslizable,
  primero los especiales; cada uno con «🙋 Me apunto» o «📅 Proponer al grupo») → 📅 Próximos findes y festivos →
  🎲 ¿Qué hacemos? (Sorpréndeme) → 🎭 ¿Qué hay? → ganas. Sin bloque del tiempo (está en su pestaña).
- Próximos findes y festivos: cada finde en su tarjeta (viernes tarde —o el viernes entero si es festivo—, sábado,
  domingo, y jueves/lunes festivos como puente); los festivos de entre semana, en su propia tarjeta. Sin chips de
  eventos: es para ver planes y quién va. Solo la línea de lluvia si se prevé.
- Disponibilidad por día: `grupos/{gid}/disponibilidad/{uid}`: { uid, no: [claves], si: [claves], actualizado }, clave
  'AAAA-MM-DD' o 'AAAA-MM-DDT' (viernes tarde). Cada día se toca: · → 👍 → 🙅 → ·; atajos «👍 Todo libre» / «🙅 No puedo».
  El antiguo `nopuedo: [sábados]` se lee como todo el finde.
- Sorpréndeme: días = viernes tarde, sábado, domingo y festivos de las próximas 4 semanas.
- Saltar a una ficha (`data-irficha`) va directo a ella: los eventos en la pestaña Eventos, el resto en Sitios.
- Sitios: filtros siempre a la vista en botoncitos (tocar otra vez quita). Mapa: tipos como botones (ninguno =
  todos, uno o varios); iconos desde el zoom 12 y zoom máximo 16 (v23, pedido del usuario: `MPZ`, `MPZ_ICONOS`), puntitos antes; al tocar un punto
  se marca 🔖/✅/✖️ desde ahí. Menús centrados. Franja de Canarias blanco-azul-amarillo, 8 px.

## Calendario y carruseles (v22, pedido del usuario)
- Planes: fechas → 🎠 Este finde y 🎠 El que viene (carruseles: primero 🙋 planes del grupo con caritas y «Me apunto»,
  luego 🎟️ eventos con «📅 Proponer» y 3 💡 ideas que encajan con el tiempo; sin grupo, eventos e ideas) → Ver todos
  los eventos → 📅 Calendario mensual → 🔭 Más planes por delante → 🎲 → 🎭 → ganas.
- Calendario: rejilla del mes (L-D, ‹ ›), 10 semanas por delante. Findes tintados, 🎉 festivos en amarillo, vísperas
  con 🌆 pequeño (v24), punto azul = planes, 👍/🙅 tuyo y 👍n del grupo. Al tocar un día, debajo: festivo/víspera, lluvia,
  ¿puedes? de su bloque (`bloqueDe`), sus planes y «＋ Plan este día». Vale cualquier día de la semana (tipo
  `suelto`, p. ej. un cumpleaños un miércoles); no usar la clase CSS `dia` fuera de los botones de día.
- Vísperas: la tarde (clave 'AAAA-MM-DDT', tiempo de 14 a 20 h de cualquier día) antes de un festivo de lunes a jueves
  cuenta como el viernes tarde: se marca 👍/🙅, se propone plan y Sorpréndeme la ofrece (🌆). Jueves/viernes festivos
  forman puente con el finde (y la tarde de su víspera).
- Mapa: etiqueta «🔎 Zoom N de 16 · iconos desde 12» arriba a la izquierda, para hablar de zoom con números.

## Agentes de OpenCode (pedido del usuario, para ahorrar tokens)
- El director (Claude Code) planifica y revisa; el trabajo mecánico lo hacen agentes de OpenCode 2 con modelos gratuitos.
- `AGENTS.md`: resumen corto de reglas para ellos (con él, OpenCode no carga este CLAUDE.md).
- `.opencode/agents/`: explorador (solo lectura), editor (cambios mecánicos; no toca data, firebase ni .github),
  versionador (versión en 3 sitios + PROGRESO + commit), probador (Playwright con `pruebas/`), investigador (datos
  con fuente en data/), vigia (GitHub Actions con `gh api`). Permisos con `deny` explícito porque se lanzan con `--auto`;
  ninguno puede hacer `git push` ni tocar `vendor/`.
- Lanzar: escribir `tareas/<agente>_<tema>.md` y `herramientas/lanzar_agente.sh <agente> <tema> [modelo]` → `logs/`.
  Leer solo las últimas líneas del log y comprobar la entrega uno mismo (`git diff --stat`, `node --check`, pruebas).
- Modelos: `opencode/deepseek-v4.1-flash-free` (ve imágenes); si se agota la cuota gratuita, `opencode/big-pickle`
  (no ve imágenes) o `opencode/nemotron-3.5-super-vl-free` (sí ve). `tareas/`, `logs/`, `ESTADO_AGENTES.md` y
  `pruebas/capturas/` no se suben.
- Pruebas: `node pruebas/humo.js` (todas las pestañas, sin grupo y con grupo falso); `pruebas/comun.js` para guiones nuevos.
- OpenCode no viene instalado en las sesiones en la nube: instalarlo al empezar (o con el script de arranque del entorno).

## Con niños, fiestas patronales y cine (v27, pedido del usuario)
- 🧸 Con niños: `ninos` en sitios.json = lo que dice la fuente (lo decidió el investigador con el texto de Wikipedia; 21
  sitios) y `ninos: true` en la marca de cada uno («🧸 Bien para ir con niños» en la ficha; va al grupo; reglas: bool).
  Filtro «🧸 Con niños» en Sitios: del catálogo, tuyo o de alguien del grupo.
- Fiestas patronales: 42 eventos `fiesta-<municipio>-<santo>` con el día festivo local del BOC (`herramientas/fiestas_boc.py`;
  rehacer al añadir un año a festivos.json). VERIFICAR: el programa lo publica el ayuntamiento. Sin Martes de Carnaval
  ni las que ya tienen ficha. Ubicación aproximada (centro del municipio): en el mapa solo con «Evento».
- Cine: SensaCine (robots.txt permite /cines/cine/…; los otros días van por /_/, prohibido → solo el día). Cines:
  Meridiano (E0627), Multicines La Laguna (E0284), La Villa (E0622), X-Sur (E0700), Zentral Center (E0541).
  `data/cine.json` {fecha, cines:[{peliculas:[{titulo, original, generos, edad, estreno, cartel, sesiones:[{h, v: Doblada|VOSE|VO, f?}]}]}]}.
  (v31) También `sinopsis` y `notas` {usuarios, prensa} (medias de SensaCine /5, de la misma página). FilmAffinity bloquea
  todo acceso automático (Cloudflare, incluso robots.txt): NO se lee; solo un enlace a su búsqueda que abre la persona.
  En Eventos → 🎬 Cine: cartelera por cine con «🗣️ Solo versión original»; en 🎭 ¿Qué hay? → Cine, enlace a la cartelera.

## Navegación, mejor día, votar fechas y compartir (v29, ideas de apps muy valoradas: AllTrails, Howbout, Fever)
- 5 pestañas. Vistas internas siguen siendo `finde, tiempo, eventos, sitios, mapa, grupo, mas`; `pestañaDe()` marca la
  de abajo y `ir('explorar')` abre la última de Lista/Mapa (`esc.explorar`). Tiempo: «🌤️ Ver el tiempo ›» en la línea
  de fechas de Planes y «‹ Planes» para volver.
- 💫 Mejor día (`mejorDia`): próximas 4 semanas, solo días de finde/festivo/víspera, el de más 👍 (mín. 2) y menos 🙅;
  tarjeta encima del calendario y casilla con borde morado.
- 🗳️ Votar fechas: al proponer, hasta 2 fechas más → plan con `opciones` [≤3] y `votos` {uid: [fechas]}; cada uno cambia
  solo su voto (`votos.<uid>`; reglas: diff de votos solo en tu uid); quien propone «Fija» (fecha = elegida y se borran
  opciones y votos). Mientras, el plan sale en todos los días de la votación con «🗳️ Día por decidir».
- 📤 Compartir (fichas y planes): `navigator.share` o WhatsApp (wa.me). Enlaces `#f=<sitioId>` (abre la ficha) y
  `#d=AAAA-MM-DD` (abre ese día del calendario), atendidos por `abrirEnlace()`.

## Portada de Planes (v30, pedido del usuario: «lavado de cara»)
- Orden: tarjeta de bienvenida (foto del Teide; saludo y nombre; planes del finde y a cuántos vas; eventos; tiempo del
  sábado en una línea `tiempoCorto` → Tiempo; 💫 mejor día → su día en el calendario) → 4 botones redondos (➕ Plan,
  🎲 Sorpréndeme, 🎭 ¿Qué hay?, 🌤️ Tiempo; los 3 primeros despliegan su panel debajo, `panelPlanes`) → 🎠 carruseles
  (el primero con «Todos los eventos ›») → 📅 Calendario en franja de 2 semanas («▾ Ver el mes entero», `esc.calvista`)
  y el detalle del día → 🔖 Con ganas de ir (carrusel: tuyas y del grupo) → contador.
- El formulario de «➕ Plan» rápido lleva `planForm.rapido` para no repetirse en el detalle del día.

## Colecciones (v33)
- `COLECCIONES` (app.js): [icono, nombre, filtro, soloGrupo]; filtro `fCol` en Explorar. Solo con datos ya presentes (tipo, `ninos`, texto, marcas).
  Iconos: 🌧️ lluvia · 💦 charcos · 🌱 sin estrenar (los demás, los de su tipo o marca).

## Pasaporte (v34)
- 🛂 `pasaporteHTML()` (diario.js): municipio «hecho» si hay algún sitio con ✅ (tuyo o, con grupo, de alguien). Grupo → en la
  pestaña Grupo; sin grupo → en Más. 🏁 reto = zona con menos municipios por completar.

## Comentarios (v35)
- 💬 `grupos/{gid}/comentarios/{id}` = { planId, uid, texto (≤300), creado (ms) }; una escucha (`seguirComentarios`) →
  `NUBE.coment[planId]`. Reglas: leer el grupo; crear con tu uid; borrar solo los tuyos.

## v36 (pedido del usuario)
- Pestañas (6): 🏠 Planes · 🌤️ Tiempo · 🧭 Explorar · 🎟️ Eventos · 👥 Grupo · ☰ Más.
- Mapa: `mpMunis` (esc.mpmunis), panel «📍 Municipios» por zonas; `mpEncuadrar()` ajusta el zoom a los puntos.
- Calendario: siempre 5 semanas desde el lunes actual (`fechasCal`); ya no hay vista de mes.
- Eventos: `evCats` (Set, esc.evcats; vacía = nada); «Solo cine» = cartelera completa; semanas en <details> (`evCerradas`).

## Cultura (v39) y filtros (v38)
- Pestañas (7): 🏠 Planes · 🌤️ Tiempo · 🧭 Explorar · 🎟️ Eventos · 🎨 Cultura · 👥 Grupo · ☰ Más. Planes no muestra el tiempo.
- `CULTURA = ['cine','teatro','musica']` (eventos.js): fuera de las categorías de Eventos; `viewCultura()` con `culSec` (esc.cultura).
- Colecciones: solo 🌧️ Día de lluvia y 💦 Charcos (no repiten filtros), en la fila temática de los filtros con 🧸.

## Senderos (v40, pedido del usuario: «la parte más interesante, sobre todo los circulares»)
- Fuente: «Itinerarios de la isla de Tenerife» (datos.tenerife.es, CC BY). `herramientas/senderos_cabildo.py <csv> <geojson>`:
  clase Sendero, modalidad Lineal/Circular → ids `sen-<matrícula>` con `km`, `desnivel` (subida), `circular`, `matricula`.
  OJO: en el GeoJSON las propiedades vienen descolocadas; los datos se toman del CSV y del GeoJSON solo la línea.
- `data/senderos.json`: trazados Douglas-Peucker (tol. 0,00025°) → `TRAZOS`; el mapa dibuja el del sitio elegido (o todos
  los visibles si solo está el tipo Sendero y zoom ≥ 12). Iconos: 🔁 circular · ⛰️ desnivel.

## Tiempo por lugar (v41)
- `ZONAS[z].lugar`: Playa San Juan, Los Cristianos (antes Arona casco), Santa Cruz, La Laguna, La Orotava, Las Cañadas.
  El Tiempo y el aviso de lluvia muestran el lugar; los filtros de Sitios siguen usando la zona (`nom`).

## Novedades (v42, pedido del usuario: enterarse de conciertos anunciados con meses de antelación)
- `agenda_webtenerife.py`: `MESES_ADELANTE = 12`; cada evento lleva `visto` (día en que lo encontró por primera vez; los
  anteriores a v42 quedaron con '').
- App: `novedades(area)` (eventos | cultura) = agenda con `visto` en los últimos 21 días; contador 🆕 en la pestaña con lo
  posterior a `esc.novvisto[area]` (se pone a hoy al abrirla). Notificaciones del móvil: descartadas por ahora (FCM).

## Auditorio de Tenerife (v44)
- `herramientas/agenda_auditorio.py`: sitemap `evento-sitemap*.xml` (páginas /es/evento/ modificadas en el último año); del texto:
  «N Función/es | fechas | Tipo/Ciclo | Sala | Entradas». Año deducido (futuro o < 1 mes). ids `au-…`, mismo formato que agenda.json.
- App: `cargarAgenda(doc, 'tenerife'|'auditorio')` junta y quita repetidos (nombre normalizado + día de inicio). Crédito de foto según fuente.
