# Conectar Escapadas con Firebase (desde el móvil)

Unos 10 minutos. Gratis (plan Spark). Usa Chrome; si algún menú no aparece,
activa ⋮ → «Versión para ordenador».

## 1. Crear el proyecto
1. Abre https://console.firebase.google.com con tu cuenta de Google.
2. «Crear un proyecto» (o «Empezar»). Nombre: `familiadeamuchis-escapadas`.
3. Google Analytics: **desactívalo** (no hace falta). → «Crear proyecto» → «Continuar».

## 2. Entrada con Google
1. Menú ☰ → **Compilación → Authentication** → «Comenzar».
2. Pestaña «Método de inicio de sesión» → **Google** → activa el interruptor,
   elige tu correo como «correo de asistencia» → «Guardar».
3. Pestaña **Configuración → Dominios autorizados** → «Agregar dominio» →
   `paniaguadediego-bit.github.io` → «Agregar».

## 3. Base de datos (Firestore)
1. Menú ☰ → **Compilación → Firestore Database** → «Crear base de datos».
2. Ubicación: **eur3 (Europe)** o `europe-southwest1 (Madrid)` (no se puede cambiar luego).
3. Modo: **producción** → «Crear».
4. Pestaña **Reglas**: borra todo, pega el contenido de
   [firebase/firestore.rules](firebase/firestore.rules) → «Publicar».

## 4. Registrar la app web y pasar la configuración
1. ⚙️ (junto a «Descripción general») → **Configuración del proyecto**.
2. Abajo, «Tus apps» → icono **`</>`** (Web). Apodo: `Escapadas`.
   **No** marques Firebase Hosting. → «Registrar app».
3. Aparece un bloque `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
   Cópialo entero y pégalo en el chat con Claude. (Es público, no es una contraseña.)
4. Claude lo pone en `firebase-config.js` y sube la versión.

## 5. Probar
1. Abre la app (con conexión) → 👥 Grupo → «Entrar con Google».
2. Elige nombre, emoji y color → «Guardar».
3. «Crear grupo» (Familia de A Muchis) → «📤 Pasar el código» por WhatsApp.
4. Los demás: 👥 Grupo → Entrar con Google → «Unirme con código».

Si al entrar sale «Falta añadir … dominios autorizados», repite el paso 2.3.
Si «Crear grupo» falla, revisa que las reglas del paso 3.4 estén publicadas.
