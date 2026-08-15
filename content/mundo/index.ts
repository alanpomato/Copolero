import { paises } from './paises';
import { ligas } from './ligas';
import { clubes } from './clubes';
import { directoresTecnicos, jugadores, personas } from './personas';
import { validarMundo, type Club, type Liga, type Mundo, type Pais } from './tipos';

export type { Club, Liga, Pais, Mundo } from './tipos';
export type { Persona, DirectorTecnico, Jugador } from './personas';
export { directoresTecnicos, jugadores, personas } from './personas';

/**
 * El mundo, armado y validado.
 *
 * La validación corre al importar el módulo: si un club apunta a una liga que
 * no existe, o un DT a un club que borraste, el juego no arranca. Es preferible
 * romper acá que descubrirlo a mitad de una carrera.
 */
export const mundo: Mundo = validarMundo({ paises, ligas, clubes, personas });

export { paises, ligas, clubes };

// --- Búsquedas -------------------------------------------------------------

const porIdClub = new Map(clubes.map((c) => [c.id, c]));
const porIdLiga = new Map(ligas.map((l) => [l.id, l]));
const porIdPais = new Map(paises.map((p) => [p.id, p]));

export function club(id: string): Club {
	const encontrado = porIdClub.get(id);
	if (!encontrado) throw new Error(`No existe el club ${id}`);
	return encontrado;
}

export function liga(id: string): Liga {
	const encontrada = porIdLiga.get(id);
	if (!encontrada) throw new Error(`No existe la liga ${id}`);
	return encontrada;
}

export function pais(id: string): Pais {
	const encontrado = porIdPais.get(id);
	if (!encontrado) throw new Error(`No existe el país ${id}`);
	return encontrado;
}

export function clubesDe(ligaId: string): Club[] {
	return clubes.filter((c) => c.ligaId === ligaId);
}

/** La liga a la que pertenece un club, con su país. */
export function contexto(clubId: string): { club: Club; liga: Liga; pais: Pais } {
	const c = club(clubId);
	const l = liga(c.ligaId);
	return { club: c, liga: l, pais: pais(l.paisId) };
}

// --- Gente -----------------------------------------------------------------

/** El DT de un club, si es uno de los cargados a mano. */
export function dtDe(clubId: string) {
	return directoresTecnicos.find((d) => d.clubId === clubId) ?? null;
}

/** Los jugadores conocidos que están en ese club. */
export function jugadoresDe(clubId: string) {
	return jugadores.filter((p) => p.clubId === clubId);
}

/** El arquero más conocido de un club: a quién le hacés el gol. */
export function arqueroDe(clubId: string) {
	return (
		jugadoresDe(clubId)
			.filter((p) => p.posicion === 'arquero')
			.sort((a, b) => b.fama - a.fama)[0] ?? null
	);
}

/**
 * Gente lo bastante conocida como para que valga la pena nombrarla en un
 * evento. Por debajo de 70 el nombre no le dice nada a nadie.
 */
export function famosos(famaMinima = 70) {
	return personas.filter((p) => p.fama >= famaMinima);
}

// --- Plata -----------------------------------------------------------------

/**
 * Salario mensual típico en un club, en USD, para un jugador de esa media.
 *
 * Sale de tres cosas: cuánto paga la liga, cuánta plata tiene el club dentro de
 * su liga, y qué tan bueno sos. Es la fórmula que hace que subir del Ascenso a
 * Primera multiplique el sueldo por cuatro, y que dar el salto a Europa lo
 * multiplique por treinta.
 */
export function salarioTipico(clubId: string, media: number): number {
	const { liga: l, club: c } = contexto(clubId);

	// Calibrado contra cuatro puntos que sabemos cómo se sienten:
	//   Ascenso, club chico, media 40   →  ~1.200 USD  (el primer contrato)
	//   Ascenso, club grande, media 55  →  ~2.500 USD
	//   Primera, River, media 65        →  ~25.000 USD
	//   LaLiga, Real Madrid, media 85   →  ~320.000 USD
	const base = 3200;
	const porClub = 0.45 + (c.presupuesto / 100) * 1.1;
	const porNivel = Math.pow(Math.max(32, media) / 55, 1.8);

	return Math.round((base * l.indiceDinero * porClub * porNivel) / 100) * 100;
}
