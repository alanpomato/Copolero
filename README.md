# Copolero

Juego de carrera de futbolista para **dos personas**. Uno juega al futbolista,
el otro a su representante. Por turnos y asincrónico: cada uno entra cuando
puede, y la partida no avanza hasta que los dos cerraron su parte.

- **Diseño**: `docs/diseno-tecnico.md` (las decisiones), más
  `docs/diseno-inicial.md` y `docs/spec-bebo.md` (los dos documentos de partida).
- **Estado del proyecto**: se publica solo en GitHub Pages en cada push.

## Qué anda hoy — hito M0

Crear partida, código de invitación, los dos roles y las tres fases con
barrera. Todavía sin contenido de juego: los eventos llegan en el M1.

- Se crea una partida eligiendo rol y armando al futbolista.
- Sale un código de 6 letras; el otro entra con ese código y toma el rol libre.
- Cada temporada tiene tres fases (Pretemporada, Temporada, Mercado y cierre) y
  **ninguna avanza hasta que los dos cierran la suya**.
- Al cerrar la fase 3 pasa un año: el futbolista envejece y cobra, el
  representante cobra su fijo más la comisión, sube el desgaste y la confianza
  se enfría sola.
- Cada rol ve su propio diario. Lo del otro no se esconde en el navegador: no
  viaja.

## Cómo levantarlo

Hace falta Node 22 o más nuevo.

```bash
npm install
cp .env.example .env      # con DATABASE_URL=local.db alcanza
npm run dev               # http://localhost:5173
```

Para probar los dos roles a la vez, abrí la partida en una ventana normal y la
invitación en una de incógnito: cada rol es un link distinto.

### En producción

```bash
npm run build
DATABASE_URL=/ruta/al/disco/copolero.db \
  ORIGIN=https://tu-dominio \
  PORT=3000 \
  node build/index.js
```

`ORIGIN` es obligatorio: sin eso SvelteKit rechaza los formularios por su
protección contra CSRF.

Las migraciones se aplican solas al arrancar, así que un deploy es build,
reiniciar y listo. La base es un único archivo SQLite: para respaldarla,
copiala.

## Comandos

| Comando                            | Qué hace                                 |
| ---------------------------------- | ---------------------------------------- |
| `npm run dev`                      | Servidor de desarrollo                   |
| `npm test`                         | Tests del motor y de la barrera          |
| `npm run check`                    | Chequeo de tipos                         |
| `npm run format`                   | Formatea con Prettier                    |
| `npm run db:generate`              | Genera una migración a partir del schema |
| `node scripts/construir-sitio.mjs` | Arma la página de progreso en `sitio/`   |

## Cómo está armado

Las cuatro capas están separadas a propósito (ver `docs/diseno-tecnico.md` § 9):

```
src/lib/engine/     El motor. Módulo puro, sin I/O ni base de datos.
src/lib/server/     El estado: schema, barrera transaccional, proyección por rol.
src/routes/         La interfaz, una vista por rol. Mobile-first.
content/            Eventos y textos (llega en el M1).
```

Dos reglas que sostienen todo lo demás:

1. **El motor es una función pura.** `resolverFase(estado, decisiones, semilla)`
   devuelve un estado nuevo. No lee ni escribe nada, así que se puede simular
   una carrera entera sin levantar un servidor.
2. **El azar es determinista.** Cada tirada sale de la semilla de la partida más
   las coordenadas de dónde ocurre, así que recargar la página no vuelve a tirar
   el dado y una partida se puede reproducir para depurarla.
