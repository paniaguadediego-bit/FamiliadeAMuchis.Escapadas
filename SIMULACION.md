# Simulación de uso (v19 → v20, 20 de noviembre de 2026)

Prueba con un Pixel 7 simulado (Playwright), con datos reales del catálogo y de la agenda de Turismo de
Tenerife, y el tiempo y el grupo simulados. Tres personas: un **recién llegado** sin grupo, un **local**
que usa la app con su familia y un **organizador de tours y eventos** que mira la calidad de los datos.

Velocidad: arranca en ~0,25 s y cada pestaña se dibuja en ~0,1 s. Sitios es la más pesada (~6000
elementos en pantalla) pero sigue yendo fluida.

## 1. Recién llegado (no conoce la isla, sin grupo)
Lo bueno: la portada entra por los ojos (3 eventos grandes de este finde con fecha y lugar), el tiempo por
zonas se entiende de un vistazo y 🎲 Sorpréndeme propone cosas variadas (Casa Lercaro, Siete Lomas,
Barranco del Infierno).

Problemas:
- **Buscar «teide» sacaba primero Erjos o Chío** (lo nombran en la descripción) antes que el Parque
  Nacional. → *Arreglado en v20*: al buscar, lista seguida con lo que lo lleva en el nombre primero.
- «guachinche» no da nada: no hay guachinches hasta que los añada el grupo. Un recién llegado no lo sabe.
  → *Idea*: al buscar sin resultados, decir por qué y ofrecer «➕ Añadir un sitio».
- «niños» solo da 2 playas: no hay etiqueta «con niños» en los sitios. → *Idea*: marcar 👶 lo apto para
  niños (solo con fuente) y filtro.
- Pestaña 👥 Grupo vacía si no tienes grupo; 7 pestañas con letra pequeña.
  → *Idea*: en Grupo, explicar qué gana con unirse y el botón de entrar.
- Los eventos de la agenda van al centro del municipio (aproximado). Bien avisado, pero el que no conoce
  la isla necesita el lugar exacto: «🌐 Google Maps» ya busca por el nombre del lugar.

## 2. Local (con grupo, planea los findes)
Lo bueno: proponer un plan desde una ficha es un toque; el calendario muestra quién no puede (🙅) y los
eventos de cada finde; el aviso de tiempo con ideas de plan B funciona.

Problemas:
- **Los chips de eventos del calendario incluían martes y jueves** (Lucía Galán «mar 24» en el finde del
  28). → *Arreglado en v20*: solo lo que cae de viernes a domingo.
- **Aviso contradictorio**: «🌧️ El tiempo pinta mal en Norte: ⛅ nubes y claros» para un plan de playa
  (no llovía; faltaba sol y calor). → *Arreglado en v20*: dice el motivo («🏖️ Fresco para playa (20°)» o
  «Poco sol para playa»).
- Este finde mide ~4,4 pantallas. Lo importante (eventos y planes) está arriba, que era lo pedido, pero
  Sorpréndeme y ¿Qué hay? quedan lejos. → *Idea*: botones rápidos arriba (🎲 · 🎭 · ➕ plan).
- Sin probar todavía con un segundo móvil real: entrada con Google en la app instalada y marcas al
  momento entre dos personas. → *Pendiente*: prueba real con alguien de la familia.

## 3. Organizador de tours y eventos (calidad de datos)
- 247 sitios, 55 eventos (41 de la agenda automática). 88 sitios con ⚠️ VERIFICAR y 18 sin foto.
- **Eventos por finde**: 6, 11, 8, 6, 5, 7, 1, 0 en los próximos 8. La agenda de Turismo publica con unas
  6 semanas de antelación; más allá queda casi vacío (se llenará solo, lunes y jueves).
- **Categorías**: casi nada de 🎉 fiestas en la agenda (1): Turismo de Tenerife publica conciertos, teatro
  y deporte, pero poco de fiestas de pueblo. Las 14 fiestas grandes del catálogo lo compensan en parte.
  → *Idea*: segunda fuente de fiestas patronales (calendarios oficiales de ayuntamientos) cuando haya una
  pública y estable.
- **Mal clasificados** como «Otros»: carreras (5KM Nocturna, K42 Anaga, Echo HY-RACE), conciertos de
  artistas sin la palabra «concierto». → *Arreglado en v20* (deporte: km, race, running, nocturna, k42;
  música: tour, gira, piano, guitarra…).
- 1 evento sin municipio (DEKA TENERIFE 2026): sale en Este finde pero no en filtros de zona.
- Eventos largos (expos y shows de meses) ya no tapan a los del finde, pero siguen en «Y además».
- Descripciones de la agenda recortadas a ~240 caracteres: la página original lleva el resto (📚).

## Prioridades propuestas (para las próximas sesiones)
1. Prueba real con dos móviles (entrar con Google en la app instalada, marcas y planes al momento).
2. ~~Búsqueda sin resultados que explica y ofrece añadir; Grupo con invitación clara~~ (hecho en v26).
3. ~~Atajos arriba en Este finde~~ (v22: carruseles con planes, eventos e ideas).
4. Etiqueta «con niños» con fuente.
5. Más fiestas de pueblo con fuente oficial.
6. Ir quitando ⚠️ VERIFICAR del catálogo (v25: quedan 52, cada uno con su motivo).
