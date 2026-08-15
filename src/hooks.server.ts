import { building } from '$app/environment';
import { obtenerDb } from '$lib/server/db';

// Abrir la base y aplicar las migraciones al arrancar, para que un problema
// salte en el deploy y no en la cara del primero que entre a jugar.
//
// `building` es true mientras SvelteKit analiza los módulos para compilar: ahí
// no hay base ni DATABASE_URL todavía, así que no hay que tocar nada.
if (!building) {
	obtenerDb();
}

export {};
