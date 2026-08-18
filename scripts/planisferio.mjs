/**
 * Genera el mapa del juego a partir de datos geográficos de verdad.
 *
 * Alan lo pidió con tres referencias: "quiero un mapa bien como el de Google
 * Maps u Open Maps o ArcGIS". Lo que tienen en común esas tres no es la marca:
 * es que las costas son datos medidos y no un contorno dibujado a ojo. La
 * versión anterior de este mapa eran treinta puntos por continente escritos a
 * mano, y a treinta puntos Italia no tiene bota y el Golfo de México no existe.
 *
 * La fuente es Natural Earth (naturalearthdata.com), escala 1:50m. Es de
 * dominio público —sin atribución obligatoria, sin licencia que arrastrar— y es
 * la base cartográfica que traen QGIS y los tutoriales de ArcGIS. No se copia
 * ningún mapa de nadie: se usan las coordenadas y se dibuja con nuestros
 * colores, nuestra proyección y nuestro recorte.
 *
 * Este script corre a mano, no en cada build:
 *
 *     node scripts/planisferio.mjs
 *
 * Baja los tres archivos que necesita si no están, recorta al área del juego,
 * simplifica y escribe `src/lib/ui/planisferio.ts`. El resultado queda
 * commiteado, así que el juego no le pide nada a internet ni en build ni en
 * runtime: sigue andando sin conexión y sin ninguna clave de API.
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const CACHE = join(RAIZ, '.cache/naturalearth');
const SALIDA = join(RAIZ, 'src/lib/ui/planisferio.ts');

const FUENTE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

const ARCHIVOS = {
	paises: 'ne_50m_admin_0_countries.geojson',
	lagos: 'ne_50m_lakes.geojson'
};

/**
 * El recorte que se dibuja.
 *
 * De la costa oeste de México a Turquía, y de Islandia a Tierra del Fuego: es
 * donde están las trece ligas del juego. El planisferio entero dejaría el
 * Pacífico y Oceanía vacíos ocupando la mitad del ancho.
 */
const RECORTE = { oeste: -125, este: 48, norte: 66, sur: -57 };

/**
 * Cuánto se simplifica, en unidades del dibujo.
 *
 * El mapa se dibuja en una caja de 100 de ancho, y en pantalla mide unos 400
 * píxeles: una unidad son cuatro píxeles. Con 0,06 el error máximo es de un
 * cuarto de píxel —invisible— y el archivo baja de dos megas a unas decenas de
 * kilobytes. Guardar más detalle que el que la pantalla puede mostrar es pagar
 * bytes por nada.
 */
const TOLERANCIA = 0.06;

/**
 * Y qué tan chico tiene que ser algo para no dibujarlo.
 *
 * A este tamaño, una isla de menos de un cuarto de unidad cuadrada es un punto
 * de menos de un píxel. Se van cientos de islotes del Ártico y del Caribe que
 * sólo aportaban ruido y peso.
 */
const AREA_MINIMA = 0.25;

// ---------------------------------------------------------------------------
// Bajar
// ---------------------------------------------------------------------------

async function traer(nombre) {
	const destino = join(CACHE, nombre);
	if (existsSync(destino)) return JSON.parse(readFileSync(destino, 'utf8'));

	mkdirSync(CACHE, { recursive: true });
	process.stdout.write(`bajando ${nombre}… `);
	const r = await fetch(`${FUENTE}/${nombre}`);
	if (!r.ok) throw new Error(`No se pudo bajar ${nombre}: ${r.status}`);
	const texto = await r.text();
	writeFileSync(destino, texto);
	console.log(`${(texto.length / 1e6).toFixed(1)} MB`);
	return JSON.parse(texto);
}

// ---------------------------------------------------------------------------
// Proyectar: Mercator, como los mapas web
// ---------------------------------------------------------------------------

/**
 * La proyección.
 *
 * Mercator y no lineal, que es lo que usan Google, OpenStreetMap y ArcGIS en
 * sus mapas web. La diferencia se nota: con una proyección lineal, Europa
 * queda achatada contra el borde de arriba y las siluetas no coinciden con la
 * imagen que uno tiene del mundo. Mercator agranda el norte —Groenlandia
 * enorme es su defecto famoso— pero mantiene las formas locales, que es
 * justamente lo que hace que un país se reconozca.
 */
const rad = (g) => (g * Math.PI) / 180;
const mercatorY = (lat) =>
	Math.log(Math.tan(Math.PI / 4 + rad(Math.max(-84, Math.min(84, lat))) / 2));

const ANCHO = 100;
const X0 = rad(RECORTE.oeste);
const X1 = rad(RECORTE.este);
const Y0 = mercatorY(RECORTE.norte);
const Y1 = mercatorY(RECORTE.sur);
const ESCALA = ANCHO / (X1 - X0);
const ALTO = (Y0 - Y1) * ESCALA;

const proyectar = ([lon, lat]) => [(rad(lon) - X0) * ESCALA, (Y0 - mercatorY(lat)) * ESCALA];

// ---------------------------------------------------------------------------
// Recortar
// ---------------------------------------------------------------------------

/**
 * Sutherland–Hodgman contra la caja del dibujo.
 *
 * Recortar y no simplemente descartar lo que se sale: un país que cruza el
 * borde tiene que quedar cortado por el borde, no desaparecer ni salirse con
 * coordenadas enormes que después el navegador tiene que descartar en cada
 * cuadro.
 */
function recortar(anillo, caja) {
	const dentro = {
		izq: (p) => p[0] >= caja.x0,
		der: (p) => p[0] <= caja.x1,
		arr: (p) => p[1] >= caja.y0,
		aba: (p) => p[1] <= caja.y1
	};
	const cruce = {
		izq: (a, b) => [caja.x0, a[1] + ((b[1] - a[1]) * (caja.x0 - a[0])) / (b[0] - a[0])],
		der: (a, b) => [caja.x1, a[1] + ((b[1] - a[1]) * (caja.x1 - a[0])) / (b[0] - a[0])],
		arr: (a, b) => [a[0] + ((b[0] - a[0]) * (caja.y0 - a[1])) / (b[1] - a[1]), caja.y0],
		aba: (a, b) => [a[0] + ((b[0] - a[0]) * (caja.y1 - a[1])) / (b[1] - a[1]), caja.y1]
	};

	let salida = anillo;
	for (const lado of ['izq', 'der', 'arr', 'aba']) {
		const entrada = salida;
		salida = [];
		if (entrada.length === 0) break;
		let previo = entrada[entrada.length - 1];
		for (const actual of entrada) {
			const estaActual = dentro[lado](actual);
			const estaPrevio = dentro[lado](previo);
			if (estaActual) {
				if (!estaPrevio) salida.push(cruce[lado](previo, actual));
				salida.push(actual);
			} else if (estaPrevio) {
				salida.push(cruce[lado](previo, actual));
			}
			previo = actual;
		}
	}
	return salida;
}

// ---------------------------------------------------------------------------
// Simplificar
// ---------------------------------------------------------------------------

/** Douglas–Peucker: saca los puntos que no cambian la silueta. */
function simplificar(puntos, tol) {
	if (puntos.length <= 3) return puntos;

	const distancia = (p, a, b) => {
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const largo = dx * dx + dy * dy;
		if (largo === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
		let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo;
		t = Math.max(0, Math.min(1, t));
		return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
	};

	const quedan = new Array(puntos.length).fill(false);
	quedan[0] = true;
	quedan[puntos.length - 1] = true;

	const pila = [[0, puntos.length - 1]];
	while (pila.length > 0) {
		const [desde, hasta] = pila.pop();
		let peor = 0;
		let cual = -1;
		for (let i = desde + 1; i < hasta; i++) {
			const d = distancia(puntos[i], puntos[desde], puntos[hasta]);
			if (d > peor) {
				peor = d;
				cual = i;
			}
		}
		if (peor > tol && cual !== -1) {
			quedan[cual] = true;
			pila.push([desde, cual], [cual, hasta]);
		}
	}

	return puntos.filter((_, i) => quedan[i]);
}

/** El área del anillo, para descartar islotes. */
function area(anillo) {
	let a = 0;
	for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
		a += anillo[j][0] * anillo[i][1] - anillo[i][0] * anillo[j][1];
	}
	return Math.abs(a / 2);
}

// ---------------------------------------------------------------------------
// De GeoJSON a `d` de SVG
// ---------------------------------------------------------------------------

const CAJA = { x0: 0, y0: 0, x1: ANCHO, y1: ALTO };

/** Todos los anillos de una geometría, proyectados, recortados y simplificados. */
function anillosDe(geometria) {
	const crudos =
		geometria.type === 'Polygon'
			? geometria.coordinates
			: geometria.type === 'MultiPolygon'
				? geometria.coordinates.flat()
				: [];

	const listos = [];
	for (const anillo of crudos) {
		const proyectado = anillo.map(proyectar);
		const recortado = recortar(proyectado, CAJA);
		if (recortado.length < 4) continue;
		if (area(recortado) < AREA_MINIMA) continue;
		const simple = simplificar(recortado, TOLERANCIA);
		if (simple.length < 4) continue;
		listos.push(simple);
	}
	return listos;
}

const n = (v) => {
	const r = Math.round(v * 100) / 100;
	return Object.is(r, -0) ? 0 : r;
};

function comoPath(anillos) {
	return anillos
		.map((a) => a.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p[0])} ${n(p[1])}`).join('') + 'Z')
		.join('');
}

// ---------------------------------------------------------------------------
// Armar el archivo
// ---------------------------------------------------------------------------

const paises = await traer(ARCHIVOS.paises);
const lagos = await traer(ARCHIVOS.lagos);

const tierra = [];
for (const f of paises.features) {
	const anillos = anillosDe(f.geometry);
	if (anillos.length === 0) continue;
	const nombre = f.properties.NAME_ES ?? f.properties.NAME ?? f.properties.ADMIN ?? '';
	tierra.push({ nombre, d: comoPath(anillos) });
}
tierra.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

const agua = [];
for (const f of lagos.features) {
	const anillos = anillosDe(f.geometry);
	if (anillos.length === 0) continue;
	agua.push(comoPath(anillos));
}

const salida = `/**
 * El planisferio, generado a partir de Natural Earth 1:50m.
 *
 * ARCHIVO GENERADO. No se edita a mano: se vuelve a generar con
 *
 *     node scripts/planisferio.mjs
 *
 * y ahí está todo lo que hay que saber —de dónde salen los datos, cómo se
 * recortan y por qué la proyección es Mercator—. Los datos son de dominio
 * público (naturalearthdata.com), que es lo que permite tenerlos acá adentro
 * en vez de pedirle tiles a un servicio: el mapa se dibuja en el navegador,
 * anda sin conexión y no hay ninguna clave de API en ningún lado.
 *
 * ${tierra.length} países y ${agua.length} lagos, recortados al área donde están las ligas
 * del juego.
 */

/** Un punto del mundo: longitud (−180…180) y latitud (−90…90). */
export type Punto = [number, number];

/** El recorte que se dibuja: de la costa oeste de México a Turquía. */
export const RECORTE = ${JSON.stringify(RECORTE)};

/** La caja del dibujo. El alto sale de la proyección, no se elige. */
export const ANCHO = ${ANCHO};
export const ALTO = ${n(ALTO)};

const rad = (g: number) => (g * Math.PI) / 180;

/**
 * Mercator, la de los mapas web.
 *
 * Es la misma proyección que usan Google, OpenStreetMap y ArcGIS: agranda el
 * norte pero mantiene las formas locales, que es lo que hace que un país se
 * reconozca de un vistazo.
 */
const mercatorY = (lat: number) =>
	Math.log(Math.tan(Math.PI / 4 + rad(Math.max(-84, Math.min(84, lat))) / 2));

const X0 = rad(RECORTE.oeste);
const Y0 = mercatorY(RECORTE.norte);
const ESCALA = ANCHO / (rad(RECORTE.este) - X0);

/** De coordenadas del mundo a coordenadas del dibujo. */
export function proyectar([lon, lat]: Punto): { x: number; y: number } {
	return { x: (rad(lon) - X0) * ESCALA, y: (Y0 - mercatorY(lat)) * ESCALA };
}

/** Los países, cada uno con su contorno listo para un \`<path>\`. */
export const PAISES: readonly { nombre: string; d: string }[] = ${JSON.stringify(tierra, null, '\t')};

/** Los lagos, que van encima de la tierra y del color del fondo. */
export const LAGOS: readonly string[] = ${JSON.stringify(agua, null, '\t')};
`;

writeFileSync(SALIDA, salida);
console.log(
	`${tierra.length} países · ${agua.length} lagos · ${(salida.length / 1024).toFixed(0)} KB · caja ${ANCHO}×${n(ALTO)}`
);
