import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

/**
 * Sirve los escudos propios desde el disco, en caliente.
 *
 * Lo que está en `static/` se copia al compilar, así que un archivo dejado en el
 * servidor después del build no lo vería nadie hasta la próxima compilación.
 * Esto lo lee del disco en el momento: se deja el archivo, se recarga la página
 * y ya está. Sin recompilar, sin reiniciar.
 *
 * La carpeta se puede mover con `ESCUDOS_DIR`. Por defecto es `static/escudos`
 * relativo al directorio de trabajo, que en el servidor es `/opt/copolero`.
 */

const CARPETA = resolve(env.ESCUDOS_DIR || 'static/escudos');

/**
 * Solo nombres que podrían ser un id de club más una extensión conocida.
 *
 * Es lo único que separa esto de servir cualquier archivo del disco: nada de
 * barras, ni puntos seguidos, ni nombres que no sean minúsculas y guiones.
 */
const NOMBRE_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(png|svg|webp)$/;

/** Dos megas es de sobra para un escudo y de menos para un problema. */
const TAMANO_MAXIMO = 2 * 1024 * 1024;

const TIPOS: Record<string, string> = {
	png: 'image/png',
	svg: 'image/svg+xml',
	webp: 'image/webp'
};

export const GET: RequestHandler = ({ params }) => {
	const archivo = params.archivo;
	if (!NOMBRE_VALIDO.test(archivo)) error(404, 'No existe ese escudo.');

	const ruta = join(CARPETA, archivo);
	// Después de la validación esto no debería poder fallar, pero es la clase de
	// comprobación que sale gratis y evita un mal día.
	if (!ruta.startsWith(CARPETA)) error(404, 'No existe ese escudo.');

	let contenido: Buffer;
	try {
		const info = statSync(ruta);
		if (!info.isFile()) error(404, 'No existe ese escudo.');
		// Un escudo pesa kilobytes. Si alguien dejó ahí un archivo enorme es un
		// error suyo, y no vale la pena cargarlo en memoria para descubrirlo.
		if (info.size > TAMANO_MAXIMO) error(404, 'Ese escudo es demasiado grande.');
		contenido = readFileSync(ruta);
	} catch {
		// Que un club no tenga escudo propio es lo normal: usa el dibujado.
		error(404, 'No existe ese escudo.');
	}

	const extension = archivo.slice(archivo.lastIndexOf('.') + 1);

	return new Response(new Uint8Array(contenido), {
		headers: {
			'content-type': TIPOS[extension],
			'content-length': String(contenido.length),
			// Corto a propósito: si cambiás un escudo querés verlo enseguida, y son
			// unos pocos kilobytes.
			'cache-control': 'public, max-age=300'
		}
	});
};
