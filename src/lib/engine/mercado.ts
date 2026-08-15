import { clubes, contexto, directoresTecnicos, jugadores, personas } from '../../../content/mundo';
import type { Persona } from '../../../content/mundo';
import { rngPara, type Rng } from './rng';
import { MUNDO_SIN_CAMBIOS, type CambiosMundo } from './tipos';

export { MUNDO_SIN_CAMBIOS, type CambiosMundo };

/**
 * El mercado de pases del mundo.
 *
 * El contenido de `content/mundo/personas.ts` es una foto del día que se
 * escribió. Esto la despega de esa fecha: al cerrar cada temporada la gente se
 * mueve sola, y a las dos o tres temporadas el mundo de cada partida es propio.
 * Un dato que quedó viejo deja de importar; lo que importa es que se mueva con
 * lógica.
 *
 * La lógica es la de la vida real, simplificada:
 *   - Los pibes buenos suben de liga. Los grandes compran.
 *   - Los veteranos bajan, y el último sueldo suele estar lejos de Europa.
 *   - Los muy veteranos se retiran.
 *   - A los técnicos los echan seguido, y los buenos caen parados.
 *
 * Todo sale de la semilla de la partida: dos partidas con la misma semilla ven
 * exactamente los mismos pases.
 */

export type TipoMovimiento = 'pase' | 'retiro' | 'cambio_de_banco';

export type Movimiento = {
	tipo: TipoMovimiento;
	personaId: string;
	nombre: string;
	/** Club de origen, o null si dirigía una selección. */
	desde: string | null;
	/** Club de destino, o null si se retiró. */
	hacia: string | null;
	/** Listo para mostrar en el resumen de la temporada. */
	texto: string;
};

// ---------------------------------------------------------------------------
// Consultar
// ---------------------------------------------------------------------------

/** Dónde está hoy una persona, mirando primero los cambios de la partida. */
export function clubActual(persona: Persona, cambios: CambiosMundo): string | null {
	return persona.id in cambios.movidos ? cambios.movidos[persona.id] : persona.clubId;
}

export function estaRetirado(persona: Persona, cambios: CambiosMundo): boolean {
	return persona.id in cambios.movidos && cambios.movidos[persona.id] === null;
}

/** El DT de un club en esta partida, ya con los cambios aplicados. */
export function dtActualDe(clubId: string, cambios: CambiosMundo) {
	return directoresTecnicos.find((d) => clubActual(d, cambios) === clubId) ?? null;
}

/** Los jugadores conocidos que hoy están en ese club, en esta partida. */
export function jugadoresActualesDe(clubId: string, cambios: CambiosMundo) {
	return jugadores.filter((p) => clubActual(p, cambios) === clubId);
}

/** El arquero más conocido de un club: a quién le hacés el gol. */
export function arqueroActualDe(clubId: string, cambios: CambiosMundo) {
	return (
		jugadoresActualesDe(clubId, cambios)
			.filter((p) => p.posicion === 'arquero')
			.sort((a, b) => b.fama - a.fama)[0] ?? null
	);
}

// ---------------------------------------------------------------------------
// Simular
// ---------------------------------------------------------------------------

/** Chance de retirarse, por edad. Sube fuerte después de los 35. */
function chanceDeRetiro(edad: number): number {
	if (edad < 33) return 0;
	if (edad >= 41) return 1;
	return (edad - 32) * 0.16;
}

function chanceDeRetiroDeTecnico(edad: number): number {
	if (edad < 66) return 0;
	if (edad >= 78) return 1;
	return (edad - 65) * 0.1;
}

/**
 * Elige club nuevo para un jugador.
 *
 * Un pibe de 22 con fama alta apunta más arriba de donde está; un veterano de
 * 34 baja, y suele terminar lejos de las ligas grandes. En el medio, la mayoría
 * se mueve de costado.
 */
function destinoParaJugador(
	persona: Persona,
	edad: number,
	clubDeHoy: string,
	rng: Rng
): string | null {
	const { club: actual, liga: ligaActual } = contexto(clubDeHoy);

	// Hacia dónde apunta: >0 sube, <0 baja.
	const empuje = edad <= 26 ? 1 : edad <= 31 ? 0 : -1;

	const objetivoPrestigio = Math.max(
		10,
		Math.min(100, actual.prestigio + empuje * rng.entero(4, 22) + rng.entero(-6, 6))
	);

	const candidatos = clubes.filter((c) => {
		if (c.id === clubDeHoy) return false;
		const { liga } = contexto(c.id);

		// Un veterano que baja no vuelve a una liga más fuerte de la que estaba.
		if (empuje < 0 && liga.fuerza > ligaActual.fuerza + 5) return false;

		// Un pibe en subida no acepta un club más chico del que tiene, salvo que
		// sea para irse a una liga más fuerte: ese es el pase real de River a un
		// club mediano de España. Y si no hay nada mejor, se queda donde está.
		const esSaltoDeLiga = liga.fuerza > ligaActual.fuerza + 5;
		if (empuje > 0 && !esSaltoDeLiga && c.prestigio < actual.prestigio) return false;
		// Y tampoco retrocede de liga: a los 24 nadie vuelve del Calcio al Ascenso.
		if (empuje > 0 && liga.fuerza < ligaActual.fuerza - 3) return false;

		// Nadie salta de golpe a un club mucho más grande de lo que su nombre da.
		// Con los pibes el techo es más alto: comprarle el futuro a alguien es
		// justamente lo que hacen los clubes grandes.
		if (c.prestigio > persona.fama + (empuje > 0 ? 18 : 12)) return false;

		return Math.abs(c.prestigio - objetivoPrestigio) <= 14;
	});

	if (candidatos.length === 0) return null;
	return rng.elegir(candidatos).id;
}

/** Adónde va un técnico al que echaron: a otro banco de tamaño parecido. */
function destinoParaTecnico(persona: Persona, clubDeHoy: string, rng: Rng): string | null {
	const actual = contexto(clubDeHoy).club;

	const candidatos = clubes.filter((c) => {
		if (c.id === clubDeHoy) return false;
		if (c.prestigio > persona.fama + 8) return false;
		return Math.abs(c.prestigio - actual.prestigio) <= 18;
	});

	if (candidatos.length === 0) return null;
	return rng.elegir(candidatos).id;
}

function nombreClub(id: string | null): string {
	return id ? contexto(id).club.nombre : 'sin club';
}

/**
 * Corre un mercado de pases y devuelve los cambios y lo que pasó.
 *
 * Función pura: no toca el contenido ni el estado que recibe.
 */
export function simularMercado(
	cambios: CambiosMundo,
	semilla: string,
	temporada: number,
	anio: number
): { cambios: CambiosMundo; movimientos: Movimiento[] } {
	const nuevos: Record<string, string | null> = { ...cambios.movidos };
	const movimientos: Movimiento[] = [];

	personas.forEach((persona, indice) => {
		const rng = rngPara(semilla, { temporada, fase: 3, clave: 'mercado', indice });

		const previo: CambiosMundo = { movidos: nuevos };
		if (estaRetirado(persona, previo)) return;

		const donde = clubActual(persona, previo);
		// Los técnicos de selección no entran al mercado de clubes.
		if (donde === null) return;

		const edad = anio - persona.nacimiento;
		const esTecnico = 'posicion' in persona === false;

		// --- ¿Se retira? -----------------------------------------------------
		const chance = esTecnico ? chanceDeRetiroDeTecnico(edad) : chanceDeRetiro(edad);
		if (chance > 0 && rng.ocurre(chance)) {
			nuevos[persona.id] = null;
			movimientos.push({
				tipo: 'retiro',
				personaId: persona.id,
				nombre: persona.nombre,
				desde: donde,
				hacia: null,
				texto: esTecnico
					? `${persona.nombre} deja la dirección técnica a los ${edad} años.`
					: `${persona.nombre} se retira a los ${edad} años.`
			});
			return;
		}

		// --- ¿Se mueve? ------------------------------------------------------
		// A los técnicos los echan mucho más seguido que lo que se van los
		// jugadores. Es la parte más real de todo esto.
		const chanceDeMoverse = esTecnico ? 0.32 : 0.18;
		if (!rng.ocurre(chanceDeMoverse)) return;

		const destino = esTecnico
			? destinoParaTecnico(persona, donde, rng)
			: destinoParaJugador(persona, edad, donde, rng);

		if (!destino) return;

		nuevos[persona.id] = destino;
		movimientos.push({
			tipo: esTecnico ? 'cambio_de_banco' : 'pase',
			personaId: persona.id,
			nombre: persona.nombre,
			desde: donde,
			hacia: destino,
			texto: esTecnico
				? `${persona.nombre} deja ${nombreClub(donde)} y agarra ${nombreClub(destino)}.`
				: `${persona.nombre} pasa de ${nombreClub(donde)} a ${nombreClub(destino)}.`
		});
	});

	return { cambios: { movidos: nuevos }, movimientos };
}

/** Los movimientos más jugosos, para el resumen de la temporada. */
export function titulares(movimientos: Movimiento[], cuantos = 4): Movimiento[] {
	const fama = new Map(personas.map((p) => [p.id, p.fama]));
	return [...movimientos]
		.sort((a, b) => (fama.get(b.personaId) ?? 0) - (fama.get(a.personaId) ?? 0))
		.slice(0, cuantos);
}
