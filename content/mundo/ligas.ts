import type { Liga } from './tipos';

/**
 * Las ligas del mundo, con los dos números que definen la escalera de la
 * carrera:
 *
 *   fuerza        qué tan difícil es destacarse ahí.
 *   indiceDinero  cuánto paga, tomando como 1 el Ascenso argentino, que es
 *                 donde suele arrancar la carrera.
 *
 * Con eso, subir de la Primera Nacional a la Liga Profesional multiplica el
 * sueldo por cuatro, y dar el salto a España lo multiplica por treinta. Son
 * órdenes de magnitud reales, y son el motivo por el que un pase al exterior
 * puede ser el mejor negocio del representante y el peor año del futbolista.
 *
 * Están para tocar: si el balance pide que Europa pague menos o que el Ascenso
 * duela más, se cambian estos números y no hace falta tocar nada más.
 */
export const ligas: Liga[] = [
	// --- Sudamérica ---------------------------------------------------------
	{
		id: 'ar-1',
		paisId: 'ar',
		nombre: 'Liga Profesional',
		nivel: 1,
		fuerza: 72,
		indiceDinero: 4,
		continental: 'libertadores'
	},
	{
		id: 'ar-2',
		paisId: 'ar',
		nombre: 'Primera Nacional',
		nivel: 2,
		fuerza: 45,
		indiceDinero: 1,
		continental: 'ninguno'
	},
	{
		id: 'br-1',
		paisId: 'br',
		nombre: 'Brasileirão Série A',
		nivel: 1,
		fuerza: 78,
		indiceDinero: 14,
		continental: 'libertadores'
	},
	{
		id: 'uy-1',
		paisId: 'uy',
		nombre: 'Primera División',
		nivel: 1,
		fuerza: 58,
		indiceDinero: 2.8,
		continental: 'libertadores'
	},
	{
		id: 'cl-1',
		paisId: 'cl',
		nombre: 'Primera División',
		nivel: 1,
		fuerza: 55,
		indiceDinero: 3.5,
		continental: 'libertadores'
	},

	// --- Concacaf -----------------------------------------------------------
	{
		id: 'mx-1',
		paisId: 'mx',
		nombre: 'Liga MX',
		nivel: 1,
		fuerza: 66,
		indiceDinero: 12,
		continental: 'concachampions'
	},

	// --- Europa -------------------------------------------------------------
	{
		id: 'es-1',
		paisId: 'es',
		nombre: 'LaLiga',
		nivel: 1,
		fuerza: 92,
		indiceDinero: 30,
		continental: 'champions'
	},
	{
		id: 'it-1',
		paisId: 'it',
		nombre: 'Serie A',
		nivel: 1,
		fuerza: 88,
		indiceDinero: 28,
		continental: 'champions'
	},
	{
		id: 'de-1',
		paisId: 'de',
		nombre: 'Bundesliga',
		nivel: 1,
		fuerza: 88,
		indiceDinero: 28,
		continental: 'champions'
	},
	{
		id: 'fr-1',
		paisId: 'fr',
		nombre: 'Ligue 1',
		nivel: 1,
		fuerza: 82,
		indiceDinero: 25,
		continental: 'champions'
	},
	{
		id: 'pt-1',
		paisId: 'pt',
		nombre: 'Primeira Liga',
		nivel: 1,
		fuerza: 76,
		indiceDinero: 13,
		continental: 'champions'
	},
	{
		id: 'nl-1',
		paisId: 'nl',
		nombre: 'Eredivisie',
		nivel: 1,
		fuerza: 74,
		indiceDinero: 12,
		continental: 'champions'
	},
	{
		id: 'en-1',
		paisId: 'en',
		nombre: 'Premier League',
		nivel: 1,
		fuerza: 95,
		indiceDinero: 30,
		continental: 'champions'
	},
	{
		id: 'tr-1',
		paisId: 'tr',
		nombre: 'Süper Lig',
		nivel: 1,
		fuerza: 70,
		indiceDinero: 15,
		continental: 'champions'
	}
];
