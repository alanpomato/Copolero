/**
 * Acomoda una carpeta de imágenes en `static/escudos/`.
 *
 * El juego busca cada escudo por el id del club (`ar-boca.png`), y ninguna
 * carpeta de imágenes del mundo viene nombrada así. Renombrar 268 archivos a
 * mano es media tarde perdida, así que esto lo hace solo: mira el nombre de
 * cada archivo, lo compara con los nombres de los clubes y copia lo que
 * reconoce.
 *
 *   node scripts/escudos.mjs ~/Descargas/logos          # copia lo que reconoce
 *   node scripts/escudos.mjs ~/Descargas/logos --probar # muestra sin copiar
 *   node scripts/escudos.mjs --faltan                   # qué clubes no tienen
 *   node scripts/escudos.mjs --urls lista.txt           # baja de una lista de links
 *
 * Lo que no reconoce con confianza no lo toca y lo lista al final, así que
 * quedan diez o veinte para acomodar a mano en vez de doscientos sesenta y
 * ocho. Un club sin archivo no es un problema: sigue usando el dibujado.
 */

import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const DESTINO = join(RAIZ, 'static', 'escudos');
const EXTENSIONES = new Set(['.png', '.svg', '.webp', '.jpg', '.jpeg']);

/**
 * La lista de clubes, leída del contenido como texto.
 *
 * Se parsea en vez de importarse para que esto corra con `node` pelado, sin
 * TypeScript ni dependencias: el que lo va a usar está en Windows y no tiene
 * por qué instalar nada para acomodar una carpeta de imágenes.
 */
async function leerClubes() {
	const fuente = await readFile(join(RAIZ, 'content', 'mundo', 'clubes.ts'), 'utf8');
	const patron =
		/\bc\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(?:'([^']*)'|"([^"]*)")\s*,[^)]*?(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;

	const salida = [];
	for (const m of fuente.matchAll(patron)) {
		salida.push({ id: m[1], ligaId: m[2], nombre: m[3] ?? m[4], prestigio: Number(m[5]) });
	}
	if (salida.length === 0) {
		throw new Error('No pude leer los clubes de content/mundo/clubes.ts');
	}
	return salida;
}

const clubes = await leerClubes();

// --- Comparar nombres -------------------------------------------------------

/**
 * Deja un nombre en su mínima expresión comparable.
 *
 * "C.A. Boca Juniors (Argentina).png" y "boca-juniors" tienen que dar lo
 * mismo, así que se saca todo lo que no distingue: acentos, puntuación, las
 * siglas de siempre y las palabras que tienen la mitad de los clubes.
 */
const RUIDO = new Set([
	'fc',
	'cf',
	'ca',
	'cd',
	'sc',
	'ac',
	'ss',
	'as',
	'us',
	'sd',
	'ud',
	'rc',
	'afc',
	'club',
	'atletico',
	'deportivo',
	'deportes',
	'sporting',
	'sport',
	'futbol',
	'football',
	'de',
	'del',
	'la',
	'las',
	'los',
	'el',
	'y',
	'do',
	'da',
	'of',
	'and',
	'logo',
	'escudo',
	'crest',
	'badge'
]);

function limpiar(texto) {
	return (
		texto
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			// Los packs suelen traer caracteres invisibles pegados de una web.
			.replace(/[\u200b-\u200f\ufeff]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim()
	);
}

/** El nombre entero, solo sin acentos ni puntuación. */
function normalizarEntero(texto) {
	return limpiar(texto);
}

/** El nombre sin las palabras que tienen la mitad de los clubes. */
function normalizar(texto) {
	const partes = limpiar(texto)
		.split(' ')
		.filter((p) => p.length > 0 && !RUIDO.has(p));
	// Si sacando el ruido no queda nada (un club que se llama "Racing Club"),
	// vale más el nombre entero que la cadena vacía.
	return partes.length > 0 ? partes.join(' ') : limpiar(texto);
}

/** Parecido entre dos textos, 0 a 1, contando pares de letras en común. */
function parecido(a, b) {
	if (a === b) return 1;
	if (a.length < 2 || b.length < 2) return 0;

	const pares = (texto) => {
		const sinEspacios = texto.replace(/ /g, '');
		const salida = new Map();
		for (let i = 0; i < sinEspacios.length - 1; i++) {
			const par = sinEspacios.slice(i, i + 2);
			salida.set(par, (salida.get(par) ?? 0) + 1);
		}
		return salida;
	};

	const unos = pares(a);
	const otros = pares(b);
	let comunes = 0;
	let totalUnos = 0;
	let totalOtros = 0;
	for (const n of unos.values()) totalUnos += n;
	for (const n of otros.values()) totalOtros += n;
	for (const [par, n] of unos) comunes += Math.min(n, otros.get(par) ?? 0);

	return (2 * comunes) / (totalUnos + totalOtros);
}

// --- Emparejar --------------------------------------------------------------

/** Qué tan seguro hay que estar para copiar sin preguntar. */
const UMBRAL = 0.78;
/** Y a partir de acá se sugiere, pero no se copia. */
const UMBRAL_DUDOSO = 0.6;
/**
 * Cuánto tiene que sacarle el primero al segundo para no considerarse empate.
 *
 * Hay Everton en Inglaterra y en Chile, Liverpool en Inglaterra y en Uruguay,
 * River Plate en Argentina y en Uruguay, Nacional en Uruguay y en Portugal. Un
 * archivo llamado "everton.png" es genuinamente ambiguo, y elegir uno de los dos
 * en silencio es peor que preguntar.
 */
const MARGEN_MINIMO = 0.06;

/**
 * Un club se compara contra varias formas de su nombre.
 *
 * Los packs nombran los archivos pegando las palabras: `atleticotucuman`,
 * `atlmadrid`, `bmonchengladbach`. Contra el nombre sin ruido —"tucuman"— eso
 * da un parecido pobre; contra el nombre entero —"atletico tucuman"— da
 * exacto. Por eso van las dos formas, más el id.
 */
/**
 * Una clave que es puro ruido no distingue nada.
 *
 * El id de Atlético de Madrid es `es-atletico`, que da la clave "atletico", y
 * con ésa cualquier archivo que empiece con "atletico" le cae encima:
 * `atleticosl` es Atlético San Luis y se lo llevaba Madrid. Las claves que solo
 * tienen palabras genéricas se descartan.
 */
function claveSirve(clave) {
	const partes = clave.split(' ').filter((p) => p.length > 0);
	return partes.length > 0 && partes.some((p) => !RUIDO.has(p));
}

const candidatos = clubes.map((c) => ({
	id: c.id,
	nombre: c.nombre,
	claves: [
		...new Set([
			normalizarEntero(c.nombre),
			normalizar(c.nombre),
			normalizar(c.id.replace(/^[a-z]{2}\d?-/, ''))
		])
	].filter(claveSirve)
}));

/**
 * Cosas que no son clubes y que todos los packs traen igual: banderas de
 * selecciones y logos de marcas de ropa. Se descartan antes de comparar, porque
 * "chile.png" se parece bastante a "Universidad de Chile" y "joma.png" a "Roma".
 */
const NO_SON_CLUBES = new Set(
	[
		'adidas',
		'nike',
		'puma',
		'umbro',
		'joma',
		'kappa',
		'errea',
		'macron',
		'lotto',
		'topper',
		'penalty',
		'mizuno',
		'hummel',
		'newbalance',
		'asianfc',
		'conmebol',
		'uefa',
		'fifa',
		'argentina',
		'brasil',
		'uruguay',
		'chile',
		'mexico',
		'espana',
		'italia',
		'francia',
		'alemania',
		'portugal',
		'holanda',
		'paisesbajos',
		'turquia',
		'inglaterra',
		'colombia',
		'peru',
		'paraguay',
		'bolivia',
		'ecuador',
		'venezuela',
		'belgica',
		'grecia',
		'gales',
		'escocia',
		'irlanda',
		'suiza',
		'austria',
		'polonia',
		'croacia',
		'serbia',
		'dinamarca',
		'suecia',
		'noruega',
		'japon',
		'corea',
		'australia',
		'canada',
		'estadosunidos',
		'marruecos',
		'senegal',
		'nigeria',
		'ghana',
		'camerun',
		'egipto',
		'tunez',
		'argelia',
		'arabiasaudita',
		'qatar',
		'iran',
		'salvador',
		'elsalvador',
		'honduras',
		'panama',
		'costarica',
		'jamaica'
	].map((n) => n.replace(/ /g, ''))
);

/** `argentina2`, `espana_fem`, `brasil3`: variantes del mismo no-club. */
function pareceUnPais(normalizado) {
	const raiz = normalizado.replace(/ /g, '').replace(/(fem|\d+)$/g, '');
	return NO_SON_CLUBES.has(raiz);
}

function mejorClub(nombreDeArchivo) {
	const entero = normalizarEntero(nombreDeArchivo);
	const buscado = normalizar(nombreDeArchivo);
	if (!buscado) return null;
	if (pareceUnPais(entero)) return null;

	// El puntaje de un club es el mejor entre todas las combinaciones de cómo se
	// escribe el archivo y cómo se escribe el club.
	const formas = [...new Set([entero, buscado])];
	const puntuados = candidatos
		.map((club) => ({
			club,
			puntaje:
				club.claves.length === 0
					? 0
					: Math.max(
							...formas.flatMap((forma) => club.claves.map((clave) => parecido(forma, clave)))
						)
		}))
		.sort((a, b) => b.puntaje - a.puntaje);

	const primero = puntuados[0];
	if (!primero || primero.puntaje === 0) return null;

	const segundo = puntuados[1];
	const empatado = segundo ? primero.puntaje - segundo.puntaje < MARGEN_MINIMO : false;

	return {
		club: primero.club,
		puntaje: primero.puntaje,
		empatado,
		rival: empatado ? segundo.club : null
	};
}

// --- Correr -----------------------------------------------------------------

async function yaTienen() {
	let archivos = [];
	try {
		archivos = await readdir(DESTINO);
	} catch {
		return new Set();
	}
	return new Set(
		archivos
			.filter((a) => EXTENSIONES.has(extname(a).toLowerCase()))
			.map((a) => basename(a, extname(a)))
	);
}

async function listarLoQueFalta() {
	const puestos = await yaTienen();
	const faltan = clubes.filter((c) => !puestos.has(c.id));

	// La carpeta se imprime siempre: cuando alguien dice "puse los escudos y
	// sigo viendo los dibujados", casi siempre están en otra carpeta que la que
	// el servidor lee.
	console.log(`\nCarpeta que lee el juego: ${DESTINO}`);
	console.log(`Tienen escudo propio: ${puestos.size} de ${clubes.length}`);
	if (puestos.size === 0) {
		console.log(
			'\nNo hay ningún archivo ahí. Copiá los tuyos con:\n' +
				'  npm run escudos -- /ruta/a/tus/logos\n' +
				'No hace falta recompilar: el juego los lee del disco al pedirlos.'
		);
	}
	if (faltan.length === 0) {
		console.log('No falta ninguno.');
		return;
	}

	console.log(`\nFaltan ${faltan.length}. Los que más se ven van primero:\n`);
	for (const c of [...faltan].sort((a, b) => b.prestigio - a.prestigio)) {
		console.log(`  ${c.id.padEnd(26)} ${c.nombre}`);
	}
	console.log('\nLos que no estén siguen usando el escudo dibujado, que no molesta.');
}

async function acomodar(origen, soloProbar) {
	const info = await stat(origen).catch(() => null);
	if (!info?.isDirectory()) {
		console.error(`No encuentro la carpeta: ${origen}`);
		process.exit(1);
	}

	const archivos = (await readdir(origen)).filter((a) => EXTENSIONES.has(extname(a).toLowerCase()));
	if (archivos.length === 0) {
		console.error(`En ${origen} no hay imágenes (.png, .svg, .webp, .jpg).`);
		process.exit(1);
	}

	await mkdir(DESTINO, { recursive: true });

	const copiados = [];
	const dudosos = [];
	const perdidos = [];
	// Si dos archivos apuntan al mismo club gana el que dio más puntaje.
	const tomados = new Map();

	for (const archivo of archivos) {
		const encontrado = mejorClub(basename(archivo, extname(archivo)));

		if (!encontrado || encontrado.puntaje < UMBRAL_DUDOSO) {
			perdidos.push(archivo);
			continue;
		}
		// Ni si no estoy seguro, ni si hay dos clubes que se llaman igual.
		if (encontrado.puntaje < UMBRAL || encontrado.empatado) {
			dudosos.push({ archivo, ...encontrado });
			continue;
		}

		const previo = tomados.get(encontrado.club.id);
		if (previo && previo.puntaje >= encontrado.puntaje) continue;
		tomados.set(encontrado.club.id, { archivo, puntaje: encontrado.puntaje });
	}

	for (const [clubId, { archivo }] of tomados) {
		const destino = join(DESTINO, clubId + extname(archivo).toLowerCase());
		if (!soloProbar) await copyFile(join(origen, archivo), destino);
		copiados.push({ archivo, clubId });
	}

	// --- Contar lo que pasó ---------------------------------------------------
	console.log(
		soloProbar
			? `\nPrueba: no se copió nada.\n`
			: `\nCopiados ${copiados.length} escudos a static/escudos/\n`
	);

	for (const { archivo, clubId } of copiados.sort((a, b) => a.clubId.localeCompare(b.clubId))) {
		console.log(`  ✓ ${archivo.padEnd(38)} → ${clubId}`);
	}

	if (dudosos.length > 0) {
		console.log(`\nEstos no los copié porque no estoy seguro. Miralos y renombralos a mano:\n`);
		for (const { archivo, club, puntaje, rival } of dudosos) {
			const cual = rival
				? `¿${club.nombre} (${club.id}) o ${rival.nombre} (${rival.id})?`
				: `¿${club.nombre}? → ${club.id}   [${Math.round(puntaje * 100)}%]`;
			console.log(`  ? ${archivo.padEnd(38)} ${cual}`);
		}
	}

	if (perdidos.length > 0) {
		console.log(`\nEstos no se parecen a ningún club del mundo:\n`);
		for (const archivo of perdidos) console.log(`  · ${archivo}`);
	}

	console.log('');
	await listarLoQueFalta();
}

// --- Bajar de una lista de links --------------------------------------------

/**
 * Baja las imágenes de un archivo de texto con una URL por línea.
 *
 * Sirve cuando encontraste una página que las tiene todas: guardás la lista de
 * links y esto las trae con el nombre que tengan en la web, que casi siempre es
 * el del club. Después se acomodan igual que cualquier carpeta.
 *
 * Las líneas vacías y las que empiezan con # se ignoran, así se puede comentar
 * la lista.
 */
async function bajarDeLista(listado) {
	const texto = await readFile(listado, 'utf8').catch(() => null);
	if (texto === null) {
		console.error(`No pude leer la lista: ${listado}`);
		process.exit(1);
	}

	const urls = texto
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith('#'));

	if (urls.length === 0) {
		console.error('La lista está vacía.');
		process.exit(1);
	}

	const temporal = join(RAIZ, '.escudos-bajados');
	await mkdir(temporal, { recursive: true });

	console.log(`\nBajando ${urls.length} imágenes a ${temporal}\n`);

	let bajadas = 0;
	const fallidas = [];

	for (const [i, url] of urls.entries()) {
		// El nombre que tiene en la web, que casi siempre es el del club.
		let nombre;
		try {
			nombre = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
		} catch {
			fallidas.push(`${url} (no es una URL válida)`);
			continue;
		}
		if (!EXTENSIONES.has(extname(nombre).toLowerCase())) {
			fallidas.push(`${url} (no termina en una extensión de imagen)`);
			continue;
		}

		try {
			const respuesta = await fetch(url);
			if (!respuesta.ok) {
				fallidas.push(`${url} (${respuesta.status})`);
				continue;
			}
			const datos = Buffer.from(await respuesta.arrayBuffer());
			await writeFile(join(temporal, nombre.replace(/[/\\]/g, '_')), datos);
			bajadas++;
			process.stdout.write(`\r  ${i + 1}/${urls.length}  ${nombre.slice(0, 48).padEnd(50)}`);
		} catch (e) {
			fallidas.push(`${url} (${e instanceof Error ? e.message : 'falló'})`);
		}
	}

	console.log(`\r  Bajadas ${bajadas} de ${urls.length}.${' '.repeat(40)}`);
	if (fallidas.length > 0) {
		console.log(`\nNo pude bajar ${fallidas.length}:\n`);
		for (const f of fallidas) console.log(`  · ${f}`);
	}

	if (bajadas === 0) process.exit(1);
	return temporal;
}

// --- Correr -----------------------------------------------------------------

const argumentos = process.argv.slice(2);
const soloProbar = argumentos.includes('--probar');
const desdeUrls = argumentos.includes('--urls');
const suelto = argumentos.find((a) => !a.startsWith('--'));

if (argumentos.includes('--faltan') || (!suelto && !desdeUrls)) {
	await listarLoQueFalta();
	if (!suelto && !argumentos.includes('--faltan')) {
		console.log('\nPara cargar una carpeta:      node scripts/escudos.mjs <carpeta>');
		console.log('Para bajar de una lista:      node scripts/escudos.mjs --urls lista.txt');
	}
} else if (desdeUrls) {
	if (!suelto) {
		console.error('Falta el archivo con la lista: node scripts/escudos.mjs --urls lista.txt');
		process.exit(1);
	}
	const carpeta = await bajarDeLista(suelto);
	await acomodar(carpeta, soloProbar);
} else {
	await acomodar(suelto, soloProbar);
}
