# Rutas de Lectura

PWA de exploración del conocimiento con un motor de relaciones propio. Google Books y Open Library se usan únicamente como catálogos de metadatos; no deciden qué libros se recomiendan.

## Funciones

- Búsqueda por título, autor, palabras clave o ISBN.
- Metadatos combinados de Google Books, Open Library y `books.json`.
- Procedencia visible y ausencia explícita de datos no disponibles.
- Temas principales y rutas por objetivo: contextualizar, ampliar, cuestionar, ficción relacionada o conocer al autor.
- Relaciones tipificadas con explicación, aporte, evidencia, fuentes, confianza, estado y procedencia.
- Historial de búsquedas, libros vistos y rutas; favoritos, valoraciones y preferencias en `localStorage`.
- PWA compatible con GitHub Pages y respaldo sin conexión.

## Arquitectura

La aplicación separa dos capas:

1. **Catálogo:** `app.js` consulta Google Books/Open Library y normaliza título, autor, portada, descripción, ISBN, categorías, materias y enlaces.
2. **Conocimiento:** `knowledge-engine.js` consulta `knowledge-base.json` y decide las recomendaciones. Una caída o cambio de las APIs puede reducir los metadatos de una ficha, pero no altera las relaciones editoriales.

`knowledge-base.json` es un documento versionado con un catálogo extensible de tipos:

- `amplia`
- `contextualiza`
- `cuestiona`
- `inspira`
- `responde`
- `misma_problematica`
- `mismo_periodo_historico`
- `mismo_autor`
- `biografia_autor`
- `adaptacion`

Cada relación incluye referencias estables a las obras, dirección, temas, explicación, aporte, afirmaciones y fuentes de evidencia, confianza, estado de moderación y procedencia.

Solo las relaciones `approved` aparecen por defecto. Un grupo vacío significa que todavía no existe conocimiento aprobado para esa ruta; la app no lo sustituye por similitudes generales de las APIs.

## Crecimiento del conocimiento

El motor acepta tres vías sin cambiar la arquitectura:

1. **Curación manual:** añadir relaciones validadas a `knowledge-base.json`.
2. **Usuarios:** `RutasKnowledge.submitProposal(...)` guarda propuestas locales con estado `proposed`.
3. **IA o servicios editoriales:** `RutasKnowledge.registerProvider({ id, load })` registra un adaptador. Todo registro pasa por el mismo esquema y una propuesta de IA no se aprueba automáticamente.

Los estados disponibles son `approved`, `proposed` y `rejected`. La moderación es deliberadamente independiente del origen de la propuesta.

## Desarrollo y pruebas

Sirve la carpeta mediante HTTP:

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080`.

```bash
node tests/app.test.cjs
node tests/knowledge-engine.test.cjs
```

## APIs y claves

La versión pública usa, sin clave:

- `https://www.googleapis.com/books/v1/volumes`
- `https://openlibrary.org/search.json`

No hay secretos en el repositorio. Si se añade una clave, debe guardarse en una variable de entorno de un servidor o función serverless; GitHub Pages no puede ocultarla.

## Privacidad

La actividad y las propuestas del usuario se guardan en el navegador bajo claves con prefijo `rutas:`. No se sincronizan ni se envían a un servidor propio.

## Limitaciones

- El grafo inicial es deliberadamente pequeño y crecerá mediante curación o contribuciones moderadas.
- Algunas ediciones no tienen portada, descripción, ISBN u otros metadatos.
- Las propuestas de usuarios o IA requieren aprobación antes de recomendarse.
- Sin conexión se conservan el catálogo local y el grafo propio, pero no pueden buscarse obras nuevas en servicios externos.

## Archivos principales

- `index.html`: interfaz.
- `app.js`: catálogo de metadatos e integración de la interfaz.
- `knowledge-engine.js`: validación, consulta, propuestas y proveedores.
- `knowledge-base.json`: grafo versionado de relaciones.
- `books.json`: respaldo bibliográfico local.
- `service-worker.js`: caché PWA.
