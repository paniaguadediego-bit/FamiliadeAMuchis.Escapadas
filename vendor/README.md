# vendor

Código de terceros copiado tal cual (sin CDN, regla 2 de CLAUDE.md).

- `firebase-10.14.1/`: Firebase JS SDK 10.14.1, builds «compat» del paquete npm
  `firebase@10.14.1` (app, auth, firestore). Licencia Apache-2.0
  (https://github.com/firebase/firebase-js-sdk). Solo se ha quitado la línea
  `sourceMappingURL` del final. Para cambiar de versión: nueva carpeta con la
  versión en el nombre, actualizar `nube.js` y `sw.js`.
