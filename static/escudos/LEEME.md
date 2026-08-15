# Escudos propios

El juego dibuja sus propios escudos: fondo, patrón e iniciales, con los colores
reales de cada club. Eso es lo que se ve si esta carpeta está vacía, que es como
viene.

Si querés usar otras imágenes, poné acá un archivo por club con el **id del
club** como nombre:

```
static/escudos/ar-boca.png
static/escudos/ar-river.svg
static/escudos/br-flamengo.webp
```

Se aceptan `.png`, `.svg` y `.webp`, y se prueban en ese orden. El que exista
gana; el club que no tenga archivo sigue usando el dibujado. No hay que tocar
código ni reiniciar nada: alcanza con dejar el archivo y recargar.

Los ids están todos en `content/mundo/clubes.ts`, y también los podés ver en la
pantalla `/escudos` del juego.

## No los renombres a mano

Hay 268. Si conseguiste una carpeta de imágenes con cualquier nombre, hay un
script que las acomoda solo:

```bash
npm run escudos -- ~/Descargas/logos --probar   # muestra qué haría
npm run escudos -- ~/Descargas/logos            # y esto lo hace
npm run escudos -- --faltan                     # qué clubes siguen sin escudo
```

Compara el nombre de cada archivo con el de cada club y copia lo que reconoce
con confianza. Lo que no reconoce, o lo que es ambiguo —hay un Everton en
Inglaterra y otro en Chile, un Liverpool en Inglaterra y otro en Uruguay— no lo
toca y te lo lista, así te quedan diez o veinte para acomodar a mano en vez de
doscientos sesenta y ocho.

No hace falta tenerlos todos: el que no está usa el dibujado, y los dos se
mezclan sin que se note. Con los cuarenta clubes que más se ven ya se siente
distinto.

**Tamaño recomendado**: 128×144 px, fondo transparente.

## Por qué la carpeta está vacía en el repositorio

El contenido de esta carpeta está en `.gitignore`. Los escudos de los clubes son
marcas registradas: el uso privado sin fin comercial es una cosa, y publicarlos
en un repositorio es otra. Dejando la carpeta fuera de git, cada quien decide qué
pone en su propio servidor y el repositorio no distribuye nada.
