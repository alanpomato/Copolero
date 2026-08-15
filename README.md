# Copolero

Juego de carrera de futbolista para **dos personas**. Uno juega al futbolista,
el otro a su representante. Por turnos y asincrónico: cada uno entra cuando
puede, y la partida no avanza hasta que los dos cerraron su parte.

- **Diseño**: `docs/diseno-tecnico.md` (las decisiones), más
  `docs/diseno-inicial.md` y `docs/spec-bebo.md` (los dos documentos de partida).
- **Estado del proyecto**: se publica solo en GitHub Pages en cada push.

## Qué anda hoy

Una carrera entera se puede jugar de punta a punta: de los 16 en el Ascenso
hasta el retiro, con pases, temporadas simuladas y las dos personas decidiendo
en paralelo.

**El mundo.** 268 clubes en 14 ligas de 13 países, con los técnicos y los
futbolistas reales. Se mueven solos: cada temporada hay mercado de pases, los
pibes suben de liga, los veteranos bajan y los muy veteranos se retiran. Es lo
que hace que la foto de nombres con la que arranca la partida no quede vieja.

**Las tres fases**, y ninguna avanza hasta que los dos cierran la suya:

1. **Pretemporada.** El futbolista elige qué entrenar y con cuánta intensidad.
   A matar sube rápido y rompe antes; suave llega entero y llega tarde. El
   representante elige una gestión: sondear el mercado, apretar por una mejora,
   instalarlo en los medios, formarse, o simplemente estar.
2. **Temporada.** Tres ocasiones marcadas donde el futbolista elige con las
   probabilidades a la vista, sacadas de sus propios atributos. Después se
   simula el año —minutos, goles, asistencias, puesto del equipo, lesiones— y
   se narran las jugadas con nombres de verdad: no es "metiste 12 goles", es
   "le metiste un gol a Emiliano Martínez en la cancha de Aston Villa".
3. **Mercado y cierre.** Aparecen ofertas, y **el pase se hace solo si los dos
   eligen el mismo club**. Si no coinciden, no hay pase y la confianza se paga.
   Después pasa el año: se cobra, se envejece, se desgasta, y el mundo se mueve.

**La confianza** se enfría cinco puntos por temporada. Lo único que la sostiene
de verdad es que el representante elija estar, y eso le cuesta las gestiones
que sí dan plata. Ésa es su decisión de todas las fases.

Cada rol ve su propio diario. Lo del otro no se esconde en el navegador: no
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

| Comando                            | Qué hace                                       |
| ---------------------------------- | ---------------------------------------------- |
| `npm run dev`                      | Servidor de desarrollo                         |
| `npm test`                         | Tests del motor, la barrera y carreras enteras |
| `npm run check`                    | Chequeo de tipos                               |
| `npm run format`                   | Formatea con Prettier                          |
| `npm run db:generate`              | Genera una migración a partir del schema       |
| `node scripts/construir-sitio.mjs` | Arma la página de progreso en `sitio/`         |

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
