# Escapadas · instrucciones para los agentes de OpenCode

Resumen corto a propósito (si existe este archivo, OpenCode no carga `CLAUDE.md`, que es grande).
Las reglas completas están en `CLAUDE.md`: léelo SOLO por secciones (`grep -n "^## " CLAUDE.md` y luego `sed -n`).

- PWA en HTML + CSS + JS puro: sin frameworks, CDN, build ni npm en la app. Rutas relativas.
- **Prohibido leer, buscar o tocar `vendor/`** (SDK de Firebase, 520 KB). Búsquedas: `rg -n "patrón" -g '!vendor'`
  o `grep -rn --exclude-dir=vendor "patrón" .`
- Ya estás en la raíz del repo: NO empieces las órdenes con `cd` ni las encadenes con `&&` (se bloquean).
  Una orden por llamada; para leer un trozo de archivo, mejor la herramienta de lectura.
- Repo PÚBLICO: nunca escribir emails, teléfonos, direcciones, llaves ni claves privadas.
- No inventar datos (horarios, precios, coordenadas, fiestas, festivos): siempre con fuente; si hay duda `verificar: true`.
- No cambiar claves de datos ni ids: la marca «Visitado» se guarda como `fuimos`; la pestaña Planes es `finde`;
  claves de día `AAAA-MM-DD` y `AAAA-MM-DDT` (la tarde).
- Scripts antes de `app.js` (orden en index.html) no usan `load`/`save`/`SITIOS` al cargar, solo dentro de funciones.
- CSS: los cambios nuevos al final de `styles.css`; la clase `dia` solo para los botones de día; los botoncitos
  nuevos necesitan `width: auto` (el `button` genérico ocupa todo el ancho).
- `PROGRESO.md`: lee solo las primeras 20 líneas.
- No hagas `git push` ni toques `main`: eso lo hace el director.
- Respuesta final CORTA (≤ 10 líneas): archivos tocados, qué comprobaste, problemas. Nunca pegues archivos ni logs.
