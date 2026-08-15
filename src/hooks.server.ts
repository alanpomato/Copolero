import { db } from '$lib/server/db';
import { migrarDb } from '$lib/server/db/cliente';

// Las migraciones se aplican al arrancar. Para un servicio chico en un VPS es
// más simple y más seguro que acordarse de correrlas a mano en cada deploy.
migrarDb(db);

export {};
