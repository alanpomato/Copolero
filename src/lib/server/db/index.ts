import { env } from '$env/dynamic/private';
import { crearDb, migrarDb, type Db } from './cliente';

let instancia: Db | null = null;

/**
 * Devuelve la conexión a la base, creándola la primera vez.
 *
 * Es perezosa a propósito. El build de SvelteKit importa los módulos del
 * servidor para analizarlos, y ahí todavía no existe DATABASE_URL: la pone
 * systemd recién al arrancar el servicio. Si la conexión se abriera al
 * importar el módulo, no se podría compilar en el servidor.
 */
export function obtenerDb(): Db {
	if (!instancia) {
		if (!env.DATABASE_URL) throw new Error('Falta la variable de entorno DATABASE_URL');
		instancia = crearDb(env.DATABASE_URL);
		migrarDb(instancia);
	}
	return instancia;
}

export * from './schema';
export type { Db } from './cliente';
