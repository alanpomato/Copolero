import { club, clubes, contexto } from '../../../content/mundo';
import { media } from './estado';
import { rngPara, type Rng } from './rng';
import type { Estado, Posicion } from './tipos';

/**
 * El otro pibe de la camada.
 *
 * Debutó el mismo año que vos, en el mismo puesto, en otro club. No lo elegiste
 * y no te lo podés sacar de encima: todos los años el diario los compara, y a
 * las diez temporadas el duelo general es media carrera contada en una línea.
 *
 * Es la pieza que le pone escala a los números propios. Doce goles no son
 * muchos ni pocos; doce goles cuando el otro hizo diecinueve son pocos, y ahí
 * la temporada tiene un resultado además de una nota. Cuesta poquísimo —una
 * fila más en el estado— y es de lo que más se recuerda de una partida.
 *
 * No es una persona real. Los nombres salen de un par de listas, así que no hay
 * nadie de verdad a quien se le atribuyan goles que no hizo.
 */

const NOMBRES = [
	'Matías',
	'Lucas',
	'Iván',
	'Thiago',
	'Bruno',
	'Nahuel',
	'Franco',
	'Julián',
	'Emiliano',
	'Alexis',
	'Gonzalo',
	'Facundo',
	'Ezequiel',
	'Maximiliano',
	'Santino',
	'Benjamín'
];

const APELLIDOS = [
	'Bustos',
	'Quiroga',
	'Alcaraz',
	'Ferreyra',
	'Zapata',
	'Ojeda',
	'Villalba',
	'Cardozo',
	'Maidana',
	'Peralta',
	'Sosa',
	'Arrieta',
	'Barrios',
	'Godoy',
	'Rivarola',
	'Escalante'
];

export type Rival = {
	nombre: string;
	clubId: string;
	/** Su nivel, que crece y baja con los años igual que el del jugador. */
	nivel: number;
	potencial: number;
	edad: number;
	/** Acumulados de su carrera. */
	goles: number;
	asistencias: number;
	partidos: number;
	titulos: number;
	/** Temporadas que le ganó cada uno, contando goles más asistencias. */
	ganadasPorEl: number;
	ganadasPorVos: number;
	/** Lo que hizo el año que acaba de cerrar. */
	ultimaTemporada: { goles: number; asistencias: number; partidos: number } | null;
};

/**
 * Lo inventa al empezar la partida.
 *
 * Arranca en la misma liga y con un nivel parecido —un poco mejor, a propósito:
 * conviene que al principio vaya adelante— y con un potencial que puede ser
 * cualquiera. Que el otro termine siendo un crack o quedándose en el camino es
 * parte de lo que hace que la comparación tenga sentido.
 */
export function inventarRival(estado: Estado, rng: Rng): Rival {
	const f = estado.futbolista;
	const suLiga = contexto(f.contrato.clubId).liga.id;

	const posibles = clubes.filter(
		(c) => contexto(c.id).liga.id === suLiga && c.id !== f.contrato.clubId
	);
	const donde = posibles.length > 0 ? rng.elegir(posibles) : rng.elegir(clubes);

	return {
		nombre: `${rng.elegir(NOMBRES)} ${rng.elegir(APELLIDOS)}`,
		clubId: donde.id,
		nivel: media(f.atributos, f.posicion) + rng.entero(1, 6),
		potencial: rng.entero(60, 92),
		edad: f.edad,
		goles: 0,
		asistencias: 0,
		partidos: 0,
		titulos: 0,
		ganadasPorEl: 0,
		ganadasPorVos: 0,
		ultimaTemporada: null
	};
}

/** Cuánto produce cada 90 minutos alguien de ese nivel en ese puesto. */
function produccionPor90(
	nivel: number,
	posicion: Posicion
): { goles: number; asistencias: number } {
	const factorGol: Record<Posicion, number> = {
		delantero: 0.62,
		mediocampista: 0.24,
		defensor: 0.08,
		arquero: 0
	};
	const factorAsistencia: Record<Posicion, number> = {
		delantero: 0.22,
		mediocampista: 0.34,
		defensor: 0.11,
		arquero: 0.01
	};
	return {
		goles: (factorGol[posicion] * nivel) / 100,
		asistencias: (factorAsistencia[posicion] * nivel) / 100
	};
}

/**
 * Le corre un año.
 *
 * Muta el rival que recibe. Se resuelve al cerrar la temporada, con su propio
 * chorro de azar: lo que le pasa al rival no puede cambiar lo que le pasa al
 * jugador, ni al revés.
 */
export function correrleElAnio(estado: Estado, semilla: string): void {
	const r = estado.rival;
	if (!r) return;

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 3,
		clave: 'rival'
	});

	// Crece como cualquiera: fuerte de pibe, nada después de los 30.
	const margen = r.potencial - r.nivel;
	const porEdad = r.edad <= 21 ? 1 : r.edad <= 25 ? 0.7 : r.edad <= 29 ? 0.35 : 0;
	if (margen > 0)
		r.nivel += Math.round(Math.min(4, margen * 0.3) * porEdad * (rng.entero(70, 130) / 100));
	if (r.edad >= 31) r.nivel -= rng.entero(1, 2);

	const ajuste = 58 / (contexto(r.clubId).liga.fuerza + 20);
	const partidos = Math.max(
		0,
		Math.min(34, Math.round(20 + (r.nivel - 55) / 2 + rng.entero(-5, 5)))
	);
	const noventas = (partidos * 78) / 90;
	const por90 = produccionPor90(r.nivel, estado.futbolista.posicion);

	const goles = Math.round(por90.goles * noventas * ajuste * (rng.entero(65, 140) / 100));
	const asistencias = Math.round(
		por90.asistencias * noventas * ajuste * (rng.entero(65, 140) / 100)
	);

	r.partidos += partidos;
	r.goles += goles;
	r.asistencias += asistencias;
	r.edad += 1;
	r.ultimaTemporada = { goles, asistencias, partidos };
	if (rng.ocurre(contexto(r.clubId).club.prestigio / 900)) r.titulos += 1;

	// Cada tanto lo compran. Sube si le está yendo bien, y así el duelo se
	// mantiene interesante en vez de quedar congelado en la misma liga.
	//
	// Nunca al club del futbolista: son rivales, y verlos a los dos con el mismo
	// escudo rompe todo lo que la comparación quiere decir.
	if (rng.ocurre(0.18)) {
		const arriba = clubes.filter((c) => {
			const l = contexto(c.id).liga;
			return (
				c.id !== r.clubId &&
				c.id !== estado.futbolista.contrato.clubId &&
				l.fuerza <= r.nivel + 6 &&
				l.fuerza >= r.nivel - 22
			);
		});
		if (arriba.length > 0) r.clubId = rng.elegir(arriba).id;
	}

	// Y si el futbolista se fue al club donde está el rival, el rival se corre:
	// el pase del jugador se resuelve antes, así que esto es lo último que puede
	// dejarlos juntos.
	if (r.clubId === estado.futbolista.contrato.clubId) {
		const otros = clubes.filter(
			(c) =>
				c.id !== r.clubId &&
				Math.abs(contexto(c.id).liga.fuerza - contexto(r.clubId).liga.fuerza) <= 12
		);
		if (otros.length > 0) r.clubId = rng.elegir(otros).id;
	}

	// Y quién ganó el año: goles más asistencias, que es como se compara en el
	// bar y no hace falta explicarlo.
	const suyas = estado.ultimaTemporada;
	if (suyas && suyas.temporada === estado.temporada) {
		const mias = suyas.goles + suyas.asistencias;
		const delOtro = goles + asistencias;
		if (mias > delOtro) r.ganadasPorVos += 1;
		else if (delOtro > mias) r.ganadasPorEl += 1;
	}
}

/**
 * La línea del duelo para el diario.
 *
 * Devuelve `null` la primera temporada, cuando todavía no hay con qué
 * comparar.
 */
export function comoVaElDuelo(estado: Estado): string | null {
	const r = estado.rival;
	if (!r?.ultimaTemporada) return null;

	const suyas = estado.ultimaTemporada;
	if (!suyas) return null;

	const mias = suyas.goles + suyas.asistencias;
	const delOtro = r.ultimaTemporada.goles + r.ultimaTemporada.asistencias;
	const donde = club(r.clubId).nombre;

	const suAnio =
		`${r.nombre} hizo ${r.ultimaTemporada.goles} ${r.ultimaTemporada.goles === 1 ? 'gol' : 'goles'} ` +
		`y ${r.ultimaTemporada.asistencias} ${r.ultimaTemporada.asistencias === 1 ? 'asistencia' : 'asistencias'} en ${donde}`;

	const quienVaGanando =
		r.ganadasPorVos === r.ganadasPorEl
			? `En el duelo general van ${r.ganadasPorVos} a ${r.ganadasPorEl}: empatados.`
			: r.ganadasPorVos > r.ganadasPorEl
				? `En el duelo general vas arriba ${r.ganadasPorVos} a ${r.ganadasPorEl}.`
				: `En el duelo general vas atrás ${r.ganadasPorVos} a ${r.ganadasPorEl}.`;

	if (delOtro > mias) return `${suAnio}, y este año te ganó. ${quienVaGanando}`;
	if (mias > delOtro) return `${suAnio}. Este año le ganaste vos. ${quienVaGanando}`;
	return `${suAnio}: empataron el año. ${quienVaGanando}`;
}
