# PROGRESO

## v43 · Planes en lista y retoques (2026-11-22)
- Planes: «Este finde» y «El que viene» en lista vertical (4 y «Ver más»); los planes del grupo primero y el resto en orden
  aleatorio, que cambia cada vez que se abre la app.
- Eventos sin el enlace a cine/teatro/música (tienen su pestaña). Tiempo sin la zona bajo cada lugar.

## v42 · 🆕 Novedades de la agenda (2026-11-22)
- La agenda automática mira 12 meses por delante (antes 4) y guarda el día en que apareció cada evento (`visto`).
- Contador rojo en las pestañas Eventos y Cultura con lo publicado desde tu última visita; arriba de cada una,
  «🆕 Nuevo en la agenda» (3 últimas semanas) con «🎟️ Entradas e info» (la página del evento). Rango «Próximo año».
- Prueba nueva: `node pruebas/novedades.js`.

## v41 · El tiempo con nombre de lugar (2026-11-22)
- La pestaña Tiempo dice el sitio desde donde se calcula cada previsión: Playa San Juan, Los Cristianos, Santa Cruz,
  La Laguna, La Orotava y Las Cañadas (con la zona debajo). El punto del Sur pasa de Arona casco (≈ 600 m) a Los Cristianos.

## v40 · Senderos oficiales (2026-11-22)
- 139 senderos de la red oficial del Cabildo (datos abiertos, CC BY), 36 circulares: en la ficha, km, desnivel de subida
  y si es circular; filtro «🔁 Senderos circulares»; en el mapa se dibuja el trazado (y se encuadra entero al abrirlo).
  `herramientas/senderos_cabildo.py` → ids `sen-…` y `data/senderos.json` (trazados simplificados, 100 KB).
- Prueba nueva: `node pruebas/senderos.js`.

## v39 · Pestaña Cultura (2026-11-22)
- 🎨 Cultura: interruptor 🎬 Cine (cartelera) · 🎭 Teatro · 🎵 Música (próximos 4 meses por semanas plegables, por zona).
  Eventos se queda con fiestas, deporte, expos, ferias, niños y otros. Un concierto u obra se abre en Cultura.
- Prueba nueva: `node pruebas/cultura.js`.

## v38 · Planes sin tiempo y filtros sin repeticiones (2026-11-22)
- Planes ya no muestra el tiempo (tiene su pestaña): fuera la línea de la bienvenida y el botón redondo.
- Explorar → Lista: las colecciones repetían los filtros; las dos que no (🌧️ Día de lluvia, 💦 Charcos y piscinas) pasan
  a una fila de los filtros junto a 🧸 Con niños.

## v37 · Más eventos conocidos (2026-11-22)
- 5 eventos anuales con fecha de su fuente (Wikipedia), buscados por el investigador y revisados: Corazones de Tejina
  (destacado), Baile de Magos de Santa Cruz, Cristo de Tacoronte, Virgen del Carmen de Los Cristianos y San Isidro de
  Granadilla. Descartados los repetidos con las fiestas del BOC y los que no dan día exacto.

## v36 · Tiempo como pestaña, Explorar más claro, municipios en el mapa y Eventos plegables (2026-11-22)
- 🌤️ Tiempo vuelve a ser pestaña propia (6 pestañas).
- Explorar: interruptor Lista ⇄ Mapa grande; colecciones en botones pequeños que caben sin deslizar.
- Mapa: «📍 Municipios» para ver solo los puntos de los municipios elegidos (por zona o uno a uno); se encuadra en ellos.
- Planes: calendario con esta semana y las 4 siguientes (sin «ver el mes»).
- Eventos: categorías que se marcan una a una, con «Todas», «Ninguna» y «Solo cine»; cada semana se pliega.
- Prueba nueva: `node pruebas/v36.js`.

## v35 · Comentarios en los planes (2026-11-22)
- 💬 Cada plan tiene su conversación: se ve el último comentario y, al abrir, todos con carita y hora. Cada uno escribe
  y borra solo los suyos (reglas nuevas). Prueba: `node pruebas/comentarios.js`.

## v34 · Pasaporte de Tenerife (2026-11-22)
- 🛂 Los 31 municipios en casillas que se colorean al visitar algo allí, progreso por zonas y un reto (la zona más
  cerca de completarse). Con grupo, en la pestaña Grupo y con lo de todos; sin grupo, en Más. Prueba: `node pruebas/pasaporte.js`.

## v33 · Colecciones (2026-11-21)
- Explorar → Lista empieza con colecciones: 🌧️ Día de lluvia, 🧸 Con niños, 💦 Charcos y piscinas, 🍷 Ruta de guachinches,
  👀 Miradores, 🌱 Nadie del grupo ha ido y 🔖 Lo que el grupo quiere (`COLECCIONES` en app.js, con datos de la app).

## v32 · Ordenar películas (2026-11-21)
- Cartelera: ordenar por estrenos, ⭐ público, ⭐ prensa o título (se recuerda en el móvil).

## v31 · Cine con notas y sinopsis (2026-11-21)
- Cada película de la cartelera lleva la nota media del público y de la prensa (sobre 5, de SensaCine), su sinopsis
  plegable y un enlace «Ver en FilmAffinity ›». FilmAffinity no permite lectura automática, así que no se copian sus notas.

## v30 · Portada nueva de Planes (2026-11-21)
- Arriba, tarjeta de bienvenida con lo esencial del finde (planes, eventos, tiempo y mejor día) y 4 botones rápidos:
  ➕ Plan, 🎲 Sorpréndeme, 🎭 ¿Qué hay? y 🌤️ Tiempo (se despliegan ahí mismo).
- Carruseles más limpios, calendario como franja de 2 semanas que se despliega al mes y «Con ganas de ir» en carrusel.
- Arreglada la tarjeta «Mejor día» que salía vacía. Página un 20 % más corta. Prueba nueva: `node pruebas/portada.js`.

## v29 · 5 pestañas, mejor día, votar fechas y compartir (2026-11-21)
- Ideas de apps muy valoradas (AllTrails, Howbout, Fever). Navegación de 5 pestañas: Planes · Explorar (Lista ⇄ Mapa)
  · Eventos · Grupo · Más; el Tiempo, desde Planes.
- 💫 Mejor día para quedar: el finde, festivo o víspera con más gente que puede.
- 🗳️ Votar fechas: al proponer un plan se pueden poner hasta 3 días; cada uno vota y quien propone fija el elegido.
- 📤 Compartir fichas y planes por WhatsApp; el enlace abre la app en esa ficha o ese día.
- Prueba nueva: `node pruebas/v29.js`.

## v28 · Guachinches del Cabildo (2026-11-21)
- 97 guachinches del censo de locales de hostelería del Cabildo de Tenerife (datos abiertos, CC BY): nombre, municipio
  y ubicación en el mapa. Sin teléfonos ni direcciones. Todos con VERIFICAR: abren por temporada y muchos datos son
  de 2015-2019 (el grupo marca ✅ los que conoce y ✖️ los cerrados).
- Restaurantes no se cargan (son miles): los sigue añadiendo el grupo.
- Prueba nueva: `node pruebas/guachinches.js`.

## v27 · Con niños, fiestas patronales y cartelera de cine (2026-11-21)
- 🧸 Con niños: 21 sitios del catálogo con el motivo de su fuente, botón «Bien para ir con niños» en cada ficha (lo ve
  el grupo) y filtro en Sitios.
- 🎉 42 fiestas patronales de 30 municipios con su día festivo oficial (BOC); el programa, a verificar en el ayuntamiento.
- 🎬 Cartelera de hoy de 5 cines (Meridiano, Multicines La Laguna, La Villa, X-Sur, Zentral) con horas y VOSE, desde
  SensaCine; se actualiza sola cada mañana. En Eventos → Cine.
- Pruebas nuevas: `node pruebas/cine.js`, `node pruebas/ninos_fiestas.js`.

## v26 · Búsqueda sin resultados y ventajas del grupo (2026-11-21)
- Buscar algo que no está explica por qué (guachinches y restaurantes los añade el grupo; el catálogo sale de
  Wikipedia) y ofrece: quitar filtros, 🌐 buscar en Google Maps o «➕ Añadir» con el nombre ya escrito.
- Pestaña Grupo sin sesión o sin grupo: «Qué ganas» con las 4 ventajas.
- Prueba nueva: `node pruebas/sin_resultados.js`.

## v25 · Catálogo: revisión de los ⚠️ VERIFICAR (2026-11-21)
- Revisados los 88 sitios marcados con su artículo de Wikipedia: 36 confirmados (se quita el aviso) y 52 siguen
  marcados, ahora con el motivo visible en la ficha («⚠️ VERIFICAR: …»).
- Primer trabajo real de los agentes de OpenCode (investigador en 3 tandas; revisión por muestreo del director).

## Herramientas · Agentes de OpenCode (2026-11-21, sin cambios en la app)
- 6 agentes de OpenCode con modelos gratuitos (`.opencode/agents/`), `AGENTS.md` corto, lanzador
  `herramientas/lanzar_agente.sh` y pruebas automáticas en `pruebas/` (`node pruebas/humo.js`).
- Probados: explorador, vigía y probador. La cuota gratuita del modelo principal se agotó en unas 6 llamadas.

## v24 · Cine, planes cualquier día y víspera más clara (2026-11-20)
- 🎬 Cine, categoría nueva de Eventos (también en el lector de la agenda).
- Calendario: un día entre semana se abría encogido y a la izquierda (choque de estilos); ahora se ve bien y se
  propone plan cualquier día (un cumpleaños un miércoles…). En un día suelto no salen los atajos de finde.
- Víspera: un 🌆 pequeño en la casilla en vez de la raya discontinua.

## v23 · Zoom del mapa a medida (2026-11-20)
- Iconos de cada tipo desde el zoom 12 (antes 14) y zoom máximo 16 (antes 18), como pidió el usuario.

## v22 · Calendario mensual, vísperas y carruseles de planes (2026-11-20)
- Planes: dos carruseles, «Este finde» y «El que viene», con los planes del grupo (quién va y apuntarse), los eventos
  (proponer) y 3 ideas que encajan con el tiempo.
- Calendario mensual en vez de tarjetas por finde: festivos, vísperas, planes y quién puede; al tocar un día, su detalle.
- Vísperas de festivo: su tarde se marca y se propone como el viernes tarde; también en Sorpréndeme.
- Mapa: referencia de zoom («🔎 Zoom 14 de 18») para decir cuándo se ven pequeños los iconos.

## v21 · Planes, días que puedes, festivos y mapa por tipos (2026-11-20)
- «Este finde» pasa a ser **Planes**: carrusel con todos los eventos del finde (apuntarse o proponerlo desde ahí),
  «Próximos findes y festivos» con cada finde en su tarjeta y quién va a cada plan. Fuera el bloque del tiempo.
- Disponibilidad por día: viernes tarde, sábado y domingo (y festivos), cada uno 👍 / 🙅, o todo el finde de un toque.
- Festivos oficiales 2026-2027 (BOE y BOC, incluido el cambio del Martes de Carnaval del 20-11-2026): nacionales,
  Canarias, Tenerife y los locales del municipio elegido en Más. También en Sorpréndeme.
- Enlaces a eventos y sitios llevan directo a su ficha (antes volvía arriba y había que bajar).
- Mapa: varios tipos a la vez, iconos solo muy de cerca, marcar desde el punto. Sitios: filtros pequeños a la vista.
- «Fuimos» pasa a «Visitado». Fuera «Mi casa» (ahora «📍 Más cerca de mí» con el GPS del momento). Menús centrados
  y franja de Canarias más alta.

## v20 · Simulación con tres usuarios y arreglos (2026-11-20)
- Simulación como recién llegado, local con grupo y organizador de eventos: informe en `SIMULACION.md`
  (problemas, arreglos y prioridades).
- Buscar: lista seguida con lo que coincide en el nombre primero («teide» ya saca el Parque Nacional).
- Calendario de findes: los eventos de cada fila son solo los de viernes a domingo.
- Aviso de tiempo de un plan de playa: dice el motivo («Fresco para playa (20°)», «Poco sol para playa»)
  en vez de «pinta mal» con nubes y claros.
- Agenda: carreras (km, race, nocturna…) a 🏃 deporte; giras y recitales a 🎵 música.

## v19 · Eventos automáticos, pestaña Eventos y lluvia en el calendario (2026-11-20)
- Agenda automática: GitHub Actions lee la agenda de Turismo de Tenerife (lunes y jueves) y actualiza
  `data/agenda.json` (41 eventos ahora). Salen en Este finde (en grande lo que empieza este finde, el
  resto en lista), en la pestaña Eventos, en el calendario (3 por semana + «más») y se pueden marcar
  y proponer como plan.
- Pestaña 🎟️ Eventos con categorías, fechas, zonas, descripción (extracto de la fuente), foto y enlaces
  a Este finde; el grupo puede añadir sus propios eventos con fecha.
- Próximos findes: el tiempo solo aparece si se prevé lluvia.
- Descartada la extracción automática de fiestas de Wikipedia (poco fiable).
- Red de la sesión: se añadieron datos.tenerife.es, datos.canarias.es, www.santacruzdetenerife.es y
  www.webtenerife.com (solo se usa la agenda de webtenerife.com).

## v18 · Este finde con eventos arriba, pestaña Tiempo, viernes tarde y mapa por niveles (2026-11-20)
- Este finde empieza por los eventos en grande (este finde, las 2 semanas siguientes y los destacados
  de la isla, con cuenta atrás), y siguen los planes. El tiempo, resumido por zonas y enlazado.
- Pestaña nueva 🌤️ Tiempo: el finde (con viernes por la tarde, 14-20 h, de la previsión por horas)
  para los 3 próximos findes y los próximos 7 días por zona.
- Mapa: puntitos minúsculos con la isla entera; al ampliar 2 veces, el icono de cada tipo. Solo se
  dibujan los sitios de la isla elegida.
- Solo Tenerife por ahora: las demás islas no se enseñan (el esqueleto queda en islas.js).
- 8 eventos marcados como destacados. «Media jornada» pasa a 🕐 (🌤️ queda para el tiempo).

## v17 · 🎭 ¿Qué hay? Buscador cultural (2026-11-20)
- En Este finde: teatro, cine, conciertos, fiestas de pueblo, con niños, exposiciones y mercadillos;
  dónde (toda la isla o municipio) y qué finde (este, el que viene, en 2 semanas).
- Abre la búsqueda en Google y Google Noticias con las fechas exactas; lista los sitios de la app
  que encajan (Teatro Guimerá, Leal, Auditorio, TEA, museos…) con «🔎 Programación»; en fiestas,
  los eventos con fecha de ese finde. «📅 Proponer al grupo lo que encuentres».
- Sin programación propia: no hay agenda pública abierta que la app pueda leer, y no se inventa.

## v16 · Sitios del grupo: guachinches, restaurantes y rincones propios (2026-11-20)
- «➕ Añadir un sitio» en Sitios: nombre, tipo, municipio, nota, enlace y ubicación (GPS, tocar en el
  mapa o enlace de Google Maps). Lo ve todo el grupo al momento como un sitio más (ficha, mapa,
  filtros, marcas, planes, Sorpréndeme), con «👥 Añadido por …». Su autor lo edita o lo borra.
- Regla de Firestore nueva (`sitios`), publicada sola.

## v15 · Más museos y sitios (2026-11-20)
- 46 sitios nuevos (206 en total, 188 con foto), todos de Wikipedia con coordenadas y descripción
  propia: museos (Arte Sacro de La Orotava, Bellas Artes y Casa del Carnaval en Santa Cruz),
  castillos (Paso Alto, Castillo Negro), teatros (Guimerá, Leal), faros (Rasca, Punta del Hidalgo,
  Buenavista), caseríos de Anaga (El Draguillo, Las Carboneras, Roque Negro), playas (Antequera,
  Las Gaviotas), charcos (Charco del Viento), cumbre (Observatorio, Pozos de Nieve, Guajara,
  Ermita de las Nieves) y más pueblos.
- VERIFICAR en los de municipio dudoso (zonas entre municipios) y en horarios, visitas y accesos.
- Pendiente: Fasnia, La Guancha, La Matanza, La Victoria y San Miguel siguen con 2 sitios.

## v14 · Tiempo de los próximos findes (2026-11-20)
- Previsión de 16 días (antes 10). En Este finde, la tabla del tiempo se cambia entre «Este finde»,
  «El que viene» y «En 2 semanas» (con aviso: a más de una semana puede cambiar).
- Calendario de findes: los que tienen previsión llevan una línea con el tiempo de las 6 zonas
  (sábado / domingo). El aviso del plan B también llega ya a esos findes.

## v13 · Planes alternativos: plan B y aviso del tiempo (2026-11-20)
- Cada plan puede llevar un 🅱️ plan B (sitio de la app o texto libre): al proponer o luego en la
  tarjeta; cualquiera del grupo lo pone, lo cambia (✏️) o lo quita.
- Si la previsión del día pinta mal en la zona del plan, aviso 🌧️ con el plan B (dice si su zona
  tiene buen tiempo) o 3 ideas cercanas que sí encajan, con «🅱️ Usar».
- Regla de Firestore ampliada (`planB`), publicada sola por GitHub Actions.

## v12 · Estilo como viaje-corea y filtros desplegables (2026-11-20)
- Estilo: papel cálido con textura, franja con los colores de Canarias bajo la cabecera, tarjetas
  blancas con sombra, pestaña activa en pastilla, buscador en píldora. Oscuro ajustado.
- Sitios: «⚙️ Filtros ▾» con panel desplegable de rejillas (tipo, tus marcas, el grupo, zona, isla)
  y etiquetas ✕ de lo activo. «↕️ Orden»: municipio, zona, nombre, cerca de casa, valorados, deseados.
  Con casa guardada, cada ficha dice los km en la lista.
- Mapa: desplegable de tipo en lugar de chips. Los chips de isla pasan al panel de filtros.

## v11 · Compacta, icono de Canarias y «No puedo ese finde» (2026-11-20)
- App más compacta: letra base 14,5 px y todo en rem (alturas, botones, chips, banners, fichas,
  pestañas, mapa); los findes libres ocupan una línea. En Más, 🔠 Letra: Compacta / Normal / Grande.
- Icono nuevo: el archipiélago canario sobre el mar, con el sol y el Teide (versión normal y
  «maskable» para Android). Provisional hasta que el usuario entregue su imagen.
- 🙅 No puedo ese finde: botón en cada finde del calendario; se ve quién no puede; sin red se
  ve al momento y se envía al volver. Regla nueva de Firestore (`disponibilidad`), publicada sola.
- IDEAS.md: añadido buscador de teatro, cine y fiestas de pueblo.

## v10 · Eventos con fecha (2026-11-20)
- 14 eventos (12 nuevos + Carnaval y Romería del Socorro con fecha), todos con su regla tomada
  de Wikipedia: San Andrés (29 nov), Gran Poder y Carmen (13-15 jul), Peregrinación a Candelaria
  (14-15 ago) y Candelaria (2 feb), San Benito (2.º domingo de julio), Fiestas de la Cruz de Los
  Realejos (2-3 may), San Isidro Los Realejos (último domingo de mayo), Romería de Tegueste
  (último domingo de abril), San Roque Garachico (16 ago), Semana Santa de La Laguna,
  Corpus/alfombras y San Isidro de La Orotava (según Pascua), Carnaval (según Pascua, VERIFICAR).
- Fechas calculadas cada año (Pascua por algoritmo). En ficha, Este finde, «Lo próximo» y
  calendario de findes.
- IDEAS.md con las ideas del usuario para más adelante.
Pendiente: más fiestas (patronales de cada municipio, Navidad, Día de Canarias…) con fuente.

## Reglas de Firestore automáticas (2026-11-20)
- GitHub Actions publica `firebase/firestore.rules` al cambiar en `main` (o a mano desde Actions).
- Cuenta de servicio `reglas-github` solo con permisos de reglas; llave en el secreto
  `FIREBASE_REGLAS_KEY`. Primera ejecución: «Deploy complete!» (reglas de v9 publicadas).

## v9 · Aspecto, fotos, calendario de findes y esqueleto de islas (2026-11-20)
Hecho (a petición del usuario, con el estilo de viaje-corea):
- Banners por municipio (31): color propio, emoji, lema (sacado del catálogo) y foto de portada.
- Fotos de Wikimedia Commons (130 de 148 sitios; las del artículo de Wikipedia de cada sitio):
  miniatura en la lista, foto grande al abrir la ficha (con crédito), en el mapa, en los planes,
  en Sorpréndeme y en la portada de Este finde. Se guardan en el móvil; en Más se pueden
  descargar todas.
- 📅 Próximos findes: calendario de 10 fines de semana con los planes de cada uno, «Libre» y ＋
  para proponer en cualquiera. Un plan puede ser un sitio, un destino libre o otra isla, y
  durar varios días (ida y vuelta). «Más adelante» para lo que queda más lejos.
- 🏝️ Islas: chips con Tenerife y el resto «pronto»; datos y pasos para activarlas en islas.js.
- Reglas de Firestore ampliadas (destino, isla, hasta): hay que volver a publicarlas.

Probado con fotos simuladas (la sesión no llega a Wikimedia) y nube simulada: calendario,
proponer un finde en La Gomera, banners, fichas, mapa y tema oscuro. Sin errores.
Pendiente: ver las fotos reales en el móvil; publicar reglas; probar con otra persona.

## v8 · S6 · Planes, diario y resumen del año (2026-11-20)
Hecho:
- Tiempo en 6 zonas (pedido del usuario): Oeste, Sur, Este, La Laguna, Norte y
  Teide y alrededores. Sorpréndeme usa la zona de cada sitio.
- 📅 Planes del grupo: en la ficha, «Proponer plan» (día y nota); en Este finde,
  los próximos planes con quién va, quién ya fue (para saber si les apetece repetir),
  «Me apunto / Ya no voy» y «Cancelar plan» para quien propone. En Grupo, aviso de
  planes a la vista. Reglas de Firestore ampliadas (hay que volver a publicarlas).
- 📔 Diario (☰ Más): tus ✅ por mes con ⭐ y notas; en la ficha, «📅 Fuimos el» para
  poner el día real (o dejarlo sin fecha).
- 🖨️ Resumen del año (☰ Más): hoja con cifras, lo mejor del año, mapa con los sitios,
  ranking del grupo y mes a mes; «Guardar PDF» abre Imprimir del móvil.
- Trivial canario: descartado por el usuario.

Probado con nube simulada: zonas, apuntarse, proponer desde la ficha, fecha de
visita subida al grupo, diario y PDF generado (2 páginas A4).
Pendiente: publicar las reglas nuevas; probar planes con otra persona del grupo.

Hoja de ruta S1-S6 terminada.

## v7 · S5 · Este finde (2026-11-20)
Hecho:
- 🌤️ Tiempo del sábado y domingo en 3 zonas (Norte, Sur y este, Cumbre) con Open-Meteo:
  cielo, máx/mín, lluvia si ≥ 20 %, viento si ≥ 40 km/h. Se guarda para verlo sin red.
- 🎲 Sorpréndeme: elige día, rato (☕ / 🌤️ / 🎒) y «que nadie haya ido» o «que yo no
  haya ido»; tiene en cuenta el tiempo de cada zona y la distancia a casa. Dice por qué
  lo propone. «Otra idea» no repite hasta agotar.
- 🏠 Casa (☰ Más): con el GPS, solo en el móvil. Cada ficha dice km y ≈ min en coche.
- Este finde: tus 🔖, «👥 Al grupo le apetece» y el recuento. Las «ideas» fijas se van:
  las sustituye Sorpréndeme.

Probado con tiempo simulado (lluvia norte, sol sur, viento cumbre) y casa en La Laguna:
75 sorteos, todos cumplen tiempo, rato y distancia. Sin probar contra Open-Meteo real
(la red de la sesión no llega); en el móvil sí debería.

Siguiente: **S6** planes al grupo, diario, Resumen anual en PDF y Trivial canario.

## v6 · S4 · Marcas compartidas al momento (2026-11-20)
Hecho:
- Cada marca (🔖 ✅ ✖️, ⭐, nota) se guarda en el móvil y se sube al grupo; sin red,
  la persistencia de Firestore la envía al volver.
- Las marcas de todos llegan al momento (onSnapshot). Tus marcas también se
  sincronizan entre tus móviles (gana la más reciente; las quitadas no «resucitan»).
- Fichas: caritas de quién fue (con sus ⭐), quién quiere ir y sus notas; en la ficha
  cerrada, los emojis de quien fue.
- Mapa: puntito naranja si alguien del grupo ha ido; caritas en la ficha del mapa.
- Pestaña Grupo: 🏆 quién lleva más, 🕒 últimas marcas (toca → ficha),
  🌱 «nadie ha ido todavía» con botón al filtro nuevo de Sitios «🌱 Nadie del grupo».

Probado con una nube simulada (dos miembros más, sincronización móvil↔nube,
marca quitada sin red, filtro y mapa). **Pendiente de probar con el grupo real**
cuando se una otra persona.

Siguiente: **S5** Este finde (tiempo por zona, 🎲 Sorpréndeme, distancia desde casa).

## v5 · S3 · Ajustes tras la primera prueba real (2026-11-20)
- Entrar con Google funciona en el móvil del usuario (Chrome).
- Arriba, junto a la versión: emoji y nombre de quien usa la app, con su color (toca → 👥 Grupo).
- El perfil ya no se queda esperando en silencio: a los 10 s avisa si no puede leer la base de datos.
- Mensaje claro si falta activar la entrada con Google (`auth/configuration-not-found`).

## v4 · S3 · Configuración de Firebase (2026-11-20)
- `firebase-config.js` con la app web del proyecto `familiadeamuchis-escapadas`.
- Pendiente de comprobar en el móvil: entrar con Google (navegador y app instalada),
  crear el grupo y unirse con el código desde otro móvil.

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
