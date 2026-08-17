import { contexto } from '../../../content/mundo';
import { media } from './estado';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * La selección y el Mundial.
 *
 * Es lo único del juego que se espera. Todo lo demás pasa dentro de la
 * temporada y se resuelve en la misma pantalla; el Mundial está a tres años,
 * llega solo, y desde la primera temporada se puede ver cuánto falta y qué tan
 * lejos está de que lo llamen. Un objetivo que no se puede apurar es lo que
 * hace volver.
 *
 * Y es la parte de ficción que el juego se permite: la liga se simula con
 * cuidado, el Mundial es la historia que uno quiere que le pase.
 */

/** Cada cuánto hay Mundial, y cuándo fue el primero de esta era. */
export const ANIO_DEL_PRIMER_MUNDIAL = 2026;
export const CADA_CUANTOS_ANIOS = 4;

export type ResultadoDeMundial =
	'campeon' | 'final' | 'semifinal' | 'cuartos' | 'fase-de-grupos' | 'no-fue';

export type Mundial = {
	anio: number;
	resultado: ResultadoDeMundial;
	partidos: number;
	goles: number;
};

export type Seleccion = {
	/** Si ya debutó alguna vez. */
	debuto: boolean;
	partidos: number;
	goles: number;
	mundiales: Mundial[];
};

export const SELECCION_VACIA: Seleccion = { debuto: false, partidos: 0, goles: 0, mundiales: [] };

/**
 * Qué tan fuerte es cada selección.
 *
 * Define dos cosas: cuánto hay que valer para que te llamen —en Brasil hay que
 * ser mucho mejor que en Chile— y hasta dónde puede llegar el equipo en el
 * Mundial. Es lo que hace que ponerle una nacionalidad al pibe sea una decisión
 * y no un adorno.
 */
const FUERZA: Record<string, number> = {
	Argentina: 92,
	Brasil: 92,
	Francia: 92,
	España: 90,
	Inglaterra: 88,
	Portugal: 86,
	Alemania: 86,
	Italia: 84,
	'Países Bajos': 82,
	Uruguay: 80,
	México: 72,
	Turquía: 70,
	Chile: 68
};

const FUERZA_POR_DEFECTO = 65;

export function fuerzaDeLaSeleccion(nacionalidad: string): number {
	return FUERZA[nacionalidad] ?? FUERZA_POR_DEFECTO;
}

/**
 * Cuánta media hay que tener para entrar en esa selección.
 *
 * Va aparte de `FUERZA` y no es un capricho. `FUERZA` está en la escala de los
 * equipos —Argentina 92, Chile 68— y sirve para saber hasta dónde llega el
 * seleccionado en el Mundial. Pero se estaba usando también como la vara para
 * que te llamen, y las varas no son la misma cosa: medí treinta carreras de
 * cada tipo y la media más alta que alcanza cualquiera es 78. Contra una vara
 * de 92, un argentino restaba cuarenta y cinco puntos de chance por existir.
 *
 * El resultado era que la selección funcionaba perfecto para México y Chile
 * —30 de 30 debutaban— y era imposible para las ocho grandes, que son
 * justamente las que uno elige. El Mundial se anunciaba en todas las pantallas
 * y llegaba al 3% de las partidas.
 *
 * Esta escala está en la de los jugadores: Argentina 80, Chile 71. Una buena
 * carrera argentina queda en el filo y una muy buena entra, que es como tiene
 * que ser.
 */
export function loQueHayQueSerPara(nacionalidad: string): number {
	return 45 + fuerzaDeLaSeleccion(nacionalidad) * 0.38;
}

/** El próximo Mundial a partir de un año. */
export function proximoMundial(anio: number): number {
	const desde = anio - ANIO_DEL_PRIMER_MUNDIAL;
	const faltan = (CADA_CUANTOS_ANIOS - (desde % CADA_CUANTOS_ANIOS)) % CADA_CUANTOS_ANIOS;
	return anio + faltan;
}

export function esAnioDeMundial(anio: number): boolean {
	return (anio - ANIO_DEL_PRIMER_MUNDIAL) % CADA_CUANTOS_ANIOS === 0;
}

/**
 * Qué tan cerca está de que lo llamen, 0–100.
 *
 * Se muestra siempre, desde la primera temporada, aunque esté en cero. Ver que
 * falta muchísimo también es información: es lo que le dice al futbolista que
 * jugar en el Ascenso no lo va a llevar a ningún lado.
 */
export function chanceDeConvocatoria(estado: Estado): number {
	const f = estado.futbolista;
	if (f.edad < 17 || f.edad > 36) return 0;

	const exigencia = loQueHayQueSerPara(f.nacionalidad);
	const suNivel = media(f.atributos, f.posicion);

	// Dónde juega no suma: multiplica.
	//
	// Cuando sumaba, un goleador de Primera Nacional juntaba fama a fuerza de
	// goles, la fama lo metía en la selección, la selección le daba más fama y
	// terminaba yendo al Mundial desde el Ascenso. El bucle existe de verdad
	// —jugar en la selección te hace conocido— pero no se puede entrar en él sin
	// que alguien te vea primero, y a la Primera Nacional no va nadie a mirar.
	const dondeJuega = contexto(f.contrato.clubId).liga.fuerza;
	const loVen = Math.max(0.35, Math.min(1.2, (dondeJuega - 30) / 50));
	const visibilidad = ((dondeJuega - 45) * 0.45 + f.fama * 0.35) * loVen;

	const bruto = 50 + (suNivel - exigencia) * 3.2 + visibilidad - 22;
	return Math.max(0, Math.min(96, Math.round(bruto)));
}

/** Lo que hace falta para que lo llamen, dicho en palabras. */
export function loQueFalta(estado: Estado): string {
	const f = estado.futbolista;
	const chance = chanceDeConvocatoria(estado);
	const exigencia = loQueHayQueSerPara(f.nacionalidad);
	const suNivel = media(f.atributos, f.posicion);
	const liga = contexto(f.contrato.clubId).liga;

	if (chance >= 70) return 'Está en la lista corta. Si sigue así, lo llaman.';
	if (suNivel < exigencia - 10) {
		return `Le faltan ${Math.round(exigencia - 10 - suNivel)} puntos de media para siquiera aparecer en el radar de ${f.nacionalidad}.`;
	}
	if (liga.fuerza < 65) {
		return `Juega bien, pero en ${liga.nombre} no lo ve nadie. Al que quiere la selección lo tienen que ver.`;
	}
	if (f.fama < 45) return 'Nivel tiene. Le falta que lo conozcan.';
	return 'Está cerca. Una buena temporada más y suena.';
}

// ---------------------------------------------------------------------------
// Lo que pasa cada temporada
// ---------------------------------------------------------------------------

export type NovedadDeSeleccion = {
	texto: string;
	/** Efectos que el motor aplica: fama, moral y el resto. */
	fama: number;
	moral: number;
	prestigio: number;
	/** Solo cuando jugó un Mundial. */
	mundial?: Mundial;
	debut?: boolean;
	partidos: number;
	goles: number;
};

/**
 * Resuelve la selección de una temporada.
 *
 * Se llama al cerrar el año. Si es año de Mundial y el futbolista está en nivel,
 * se juega el Mundial; si no, son los amistosos y las eliminatorias de siempre.
 */
export function jugarConLaSeleccion(estado: Estado, semilla: string): NovedadDeSeleccion | null {
	const f = estado.futbolista;
	const sel = estado.seleccion ?? SELECCION_VACIA;
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 3,
		clave: 'seleccion'
	});

	const chance = chanceDeConvocatoria(estado);
	if (chance <= 0 || !rng.ocurre(chance / 100)) return null;

	const esMundial = esAnioDeMundial(estado.anio);
	const debut = !sel.debuto;

	if (!esMundial) {
		const partidos = rng.entero(2, 8);
		const goles = golesEnLaSeleccion(estado, partidos, rng.entero(60, 140) / 100);
		return {
			texto: debut
				? `Debutó en la selección de ${f.nacionalidad}. Se le llenaron los ojos.`
				: `Jugó ${partidos} partidos con ${f.nacionalidad}${goles > 0 ? ` y metió ${goles}` : ''}.`,
			fama: debut ? 12 : 3 + goles,
			moral: debut ? 15 : 4,
			prestigio: debut ? 4 : 1,
			debut,
			partidos,
			goles
		};
	}

	// --- Mundial -------------------------------------------------------------
	const resultado = comoLeFueEnElMundial(estado, rng.siguiente());
	const partidos = PARTIDOS_POR_RESULTADO[resultado];
	const goles = golesEnLaSeleccion(estado, partidos, rng.entero(70, 150) / 100);

	return {
		texto: narrarMundial(estado, resultado, goles),
		fama: FAMA_POR_RESULTADO[resultado] + goles * 2,
		moral: resultado === 'campeon' ? 30 : resultado === 'fase-de-grupos' ? -8 : 12,
		prestigio: Math.round(FAMA_POR_RESULTADO[resultado] / 3),
		mundial: { anio: estado.anio, resultado, partidos, goles },
		debut,
		partidos,
		goles
	};
}

function golesEnLaSeleccion(estado: Estado, partidos: number, suerte: number): number {
	const f = estado.futbolista;
	const factor =
		f.posicion === 'delantero'
			? 0.5
			: f.posicion === 'mediocampista'
				? 0.2
				: f.posicion === 'defensor'
					? 0.06
					: 0;
	const punteria = media(f.atributos, f.posicion) / 100;
	return Math.round(partidos * factor * punteria * suerte);
}

const PARTIDOS_POR_RESULTADO: Record<ResultadoDeMundial, number> = {
	campeon: 7,
	final: 7,
	semifinal: 6,
	cuartos: 5,
	'fase-de-grupos': 3,
	'no-fue': 0
};

const FAMA_POR_RESULTADO: Record<ResultadoDeMundial, number> = {
	campeon: 35,
	final: 22,
	semifinal: 16,
	cuartos: 10,
	'fase-de-grupos': 4,
	'no-fue': 0
};

/**
 * Hasta dónde llegó el equipo.
 *
 * Pesa la selección y pesa él: un jugador enorme mejora las chances de su país,
 * pero no gana un Mundial solo. Que Chile salga campeón tiene que poder pasar y
 * tiene que ser raro.
 */
function comoLeFueEnElMundial(estado: Estado, tirada: number): ResultadoDeMundial {
	const f = estado.futbolista;
	const fuerza = fuerzaDeLaSeleccion(f.nacionalidad);
	const aporte = (media(f.atributos, f.posicion) - 70) * 0.3;
	const nivel = fuerza + aporte;

	// Probabilidades acumuladas, calibradas para que una potencia salga campeona
	// una de cada seis o siete veces y una selección chica casi nunca.
	const campeon = Math.max(0.01, (nivel - 60) / 250);
	const final = campeon + Math.max(0.02, (nivel - 58) / 200);
	const semifinal = final + Math.max(0.04, (nivel - 55) / 160);
	const cuartos = semifinal + Math.max(0.08, (nivel - 50) / 120);

	if (tirada < campeon) return 'campeon';
	if (tirada < final) return 'final';
	if (tirada < semifinal) return 'semifinal';
	if (tirada < cuartos) return 'cuartos';
	return 'fase-de-grupos';
}

function narrarMundial(estado: Estado, resultado: ResultadoDeMundial, goles: number): string {
	const f = estado.futbolista;
	const anio = estado.anio;
	const conGoles = goles > 0 ? ` Metió ${goles}.` : '';

	switch (resultado) {
		case 'campeon':
			return `${f.nombre} salió CAMPEÓN DEL MUNDO con ${f.nacionalidad} en ${anio}.${conGoles} No hay nada más.`;
		case 'final':
			return `Perdió la final del Mundial ${anio} con ${f.nacionalidad}.${conGoles} De esas no se vuelve igual.`;
		case 'semifinal':
			return `Llegó a semifinales del Mundial ${anio} con ${f.nacionalidad}.${conGoles}`;
		case 'cuartos':
			return `Se quedó en cuartos del Mundial ${anio} con ${f.nacionalidad}.${conGoles}`;
		default:
			return `${f.nacionalidad} quedó afuera en la fase de grupos del Mundial ${anio}.${conGoles}`;
	}
}

/** Aplica la novedad al estado. Muta lo que recibe, que ya viene clonado. */
export function aplicarSeleccion(estado: Estado, novedad: NovedadDeSeleccion): void {
	const sel = estado.seleccion ?? structuredClone(SELECCION_VACIA);
	const f = estado.futbolista;
	const acotar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

	sel.debuto = true;
	sel.partidos += novedad.partidos;
	sel.goles += novedad.goles;
	if (novedad.mundial) sel.mundiales = [...sel.mundiales, novedad.mundial];

	estado.seleccion = sel;
	f.fama = acotar(f.fama + novedad.fama);
	f.moral = acotar(f.moral + novedad.moral);
	estado.representante.prestigio = acotar(estado.representante.prestigio + novedad.prestigio);
}

/** Lo que la selección le suma al puntaje final. */
export function puntosDeSeleccion(estado: Estado): number {
	const sel = estado.seleccion ?? SELECCION_VACIA;
	const mundiales = sel.mundiales.reduce((total, m) => {
		if (m.resultado === 'campeon') return total + 1500;
		if (m.resultado === 'final') return total + 700;
		if (m.resultado === 'semifinal') return total + 400;
		if (m.resultado === 'cuartos') return total + 200;
		return total + 80;
	}, 0);

	return 20 * sel.partidos + 30 * sel.goles + mundiales;
}
