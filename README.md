# Rutas de Lectura

PWA de exploración del conocimiento que busca libros en **Google Books** y **Open Library**, combina registros equivalentes y explica las recomendaciones mediante coincidencias verificables.

## Funciones

- Búsqueda por título, autor, palabras clave o ISBN.
- Consulta paralela a Google Books y Open Library.
- Normalización y deduplicación por ISBN o por título + autor.
- Título, autores, portada, fecha, editorial, descripción, ISBN, temas/categorías e idioma cuando las fuentes los proporcionan.
- Procedencia visible en cada ficha. La app muestra `No disponible` cuando un dato no existe; no lo infiere.
- Recomendaciones basadas en autores y temas/categorías devueltos por las APIs, con explicación de la coincidencia.
- Historial de búsquedas y libros vistos, favoritos, valoraciones y preferencias en `localStorage`.
- Catálogo de `books.json` como respaldo sin conexión.
- PWA instalable y compatible con GitHub Pages.

## Publicación en GitHub Pages

No necesita compilación. En **Settings → Pages**, selecciona `Deploy from a branch`, la rama `main` y `/(root)`. Los archivos deben permanecer en la raíz.

Para probar localmente, sirve la carpeta mediante HTTP (abrir `index.html` directamente puede impedir las solicitudes):

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080`.

Pruebas de la lógica principal:

```bash
node tests/app.test.cjs
```

## APIs y claves

La versión pública usa estos endpoints sin clave:

- `https://www.googleapis.com/books/v1/volumes`
- `https://openlibrary.org/search.json`

No hay claves ni secretos en el repositorio. Google Books permite solicitudes sin clave, pero aplica cuotas y controles de abuso más restrictivos. Si en el futuro se usa una clave, **no debe agregarse a `app.js` ni a GitHub Pages**: hace falta un endpoint de servidor o función serverless que guarde la clave en una variable de entorno. GitHub Pages es alojamiento estático y no puede ocultar secretos.

## Privacidad y almacenamiento

La actividad se guarda solo en el navegador del dispositivo bajo claves con prefijo `rutas:`. No se envía a un servidor propio ni se sincroniza entre dispositivos. La sección Actividad permite exportar una copia JSON y Preferencias permite borrar los datos locales.

## Limitaciones conocidas

- La calidad y disponibilidad de metadatos dependen de las dos fuentes; algunas ediciones no tienen descripción, portada, editorial, idioma, ISBN o temas.
- Un mismo libro puede tener muchas ediciones. La app une registros solo si comparten ISBN o coinciden exactamente en título normalizado y primer autor; prefiere conservar duplicados dudosos antes que fusionar obras distintas.
- Las categorías de Google Books y los temas de Open Library no forman una taxonomía uniforme.
- Las recomendaciones no usan IA ni inventan relaciones: solo aparecen si comparten autor o temas/categorías publicados por las APIs.
- Las APIs públicas pueden responder lentamente, estar temporalmente indisponibles o limitar consultas. En esos casos se informa el error y se usa el catálogo local.
- El modo sin conexión ofrece el catálogo local y los datos ya guardados, pero no puede buscar obras nuevas en servicios externos.

## Archivos principales

- `index.html`: interfaz accesible.
- `app.js`: adaptadores, normalización, almacenamiento y recomendaciones.
- `books.json`: respaldo local.
- `service-worker.js`: caché de la aplicación; no almacena respuestas de las APIs.
- `manifest.json`: instalación PWA.
