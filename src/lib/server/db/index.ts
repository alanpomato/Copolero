import { env } from '$env/dynamic/private';
import { crearDb } from './cliente';

if (!env.DATABASE_URL) throw new Error('Falta la variable de entorno DATABASE_URL');

export const db = crearDb(env.DATABASE_URL);

export * from './schema';
export type { Db } from './cliente';
