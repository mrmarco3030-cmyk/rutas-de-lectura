# Rutas de Lectura

Aplicación web progresiva (PWA) para explorar libros e ideas.

## Cómo probarla en una computadora

No abras `index.html` directamente, porque la instalación y el modo sin conexión requieren un servidor local.

Con Python instalado:

```bash
python -m http.server 8080
```

Después abre:

```text
http://localhost:8080
```

## Cómo instalarla en el teléfono

1. Publica esta carpeta en un alojamiento HTTPS, por ejemplo GitHub Pages, Netlify o Vercel.
2. Abre la dirección desde Chrome en Android o Safari en iPhone.
3. Usa “Agregar a pantalla de inicio” o el botón “Instalar app”.

## Qué incluye esta versión

- Cuatro libros de partida.
- Selección de temas y enfoques.
- Recomendaciones explicadas.
- Valoración de relaciones.
- Libros guardados.
- Historial local de rutas.
- Funcionamiento básico sin conexión.

## Limitaciones

Es un prototipo sin servidor ni inteligencia artificial real. Las recomendaciones se toman de un catálogo local. Para una versión completa se necesitaría una base de datos, usuarios y un motor de recomendación conectado a una API.
