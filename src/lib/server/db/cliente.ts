import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

/**
 * Abre una base SQLite con los pragmas que necesitamos.
 *
 * No lee variables de entorno a propósito: así los tests pueden levantar una
 * base en memoria sin arrastrar nada del framework.
 */
export function crearDb(url: string): Db {
	const sqlite = new Database(url);

	// WAL: deja leer mientras se escribe. Para un juego por turnos con dos
	// personas alcanza y sobra, y evita bloqueos al cerrar una fase.
	sqlite.pragma('journal_mode = WAL');
	// SQLite las tiene apagadas por defecto; sin esto el ON DELETE CASCADE del
	// schema no haría nada.
	sqlite.pragma('foreign_keys = ON');
	// Si otra conexión está escribiendo, esperar en vez de fallar al toque.
	sqlite.pragma('busy_timeout = 5000');

	return drizzle(sqlite, { schema });
}

/** Aplica las migraciones pendientes. Se llama al arrancar el servidor. */
export function migrarDb(db: Db, carpeta = './drizzle'): void {
	migrate(db, { migrationsFolder: carpeta });
}
