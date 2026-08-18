import type { Rng } from './rng';
import type { Posicion } from './tipos';

/**
 * Cómo va a jugar el año.
 *
 * Bebo lo dijo mejor que nadie: "es muy difícil hacer una buena temporada, y no
 * hay nada que puedas hacer como para empujar eso para arriba". Tenía razón.
 * El futbolista elegía plan de pretemporada —que mueve un atributo dos puntos—
 * y después miraba cómo le iba. La temporada le pasaba por al lado.
 *
 * El objetivo es la palanca que faltaba: algo con efecto en la misma temporada.
 * Ninguno es mejor que otro; cada uno sube una parte de la nota y baja otra. Ir
 * siempre al gol te hace goleador y te saca del juego colectivo; jugar para el
 * equipo te da asistencias y el equipo termina más arriba; ganarte al técnico
 * te da minutos, que es lo que de verdad hace crecer; cuidarte te deja entero
 * para tres temporadas más.
 *
 * Alan lo pidió sacar como decisión explícita: "que una de las 3 decisiones de
 * la temporada lo defina, según el azar". Antes era una cuarta tarjeta para
 * elegir en la pretemporada, al lado de plan, intensidad y rasgo; ahora sale
 * solo, sorteado, pesado por la intensidad que ya se elige —`objetivoPorAzar`—
 * y se entera junto con el resto en el diario. Sigue sin regalar nada: mueve de
 * dónde sale lo que ya iba a pasar, solo que ya no lo elige nadie.
 */

export type Objetivo = {
	id: string;
	nombre: string;
	detalle: string;
	/** Lo que sube, en palabras cortas para la tarjeta. */
	sube: string;
	/** Y lo que se resigna. */
	cuesta: string;

	/** Multiplicadores sobre la temporada. 1 = no cambia nada. */
	goles: number;
	asistencias: number;
	/** Puntos que se suman al porcentaje de minutos. */
	minutos: number;
	/** Multiplicador del riesgo de lesión. */
	lesion: number;
	/** Puntos de desgaste extra al final del año. */
	desgaste: number;
	/** Lo que mueve la relación con el técnico. */
	dt: number;
	/** Empujón al puesto del equipo en la liga. */
	equipo: number;
};

export const OBJETIVOS: Objetivo[] = [
	{
		id: 'gol',
		nombre: 'Ir siempre al gol',
		detalle: 'Buscar el arco de entrada. Si entra, sos el goleador del año.',
		sube: 'Goles +30%',
		cuesta: 'Asistencias −35% · el técnico te lo marca',
		goles: 1.3,
		asistencias: 0.65,
		minutos: 0,
		lesion: 1.1,
		desgaste: 1,
		dt: -4,
		equipo: 0
	},
	{
		id: 'equipo',
		nombre: 'Jugar para el equipo',
		detalle: 'Dar el pase de más. El equipo termina mejor y a vos se te nota menos.',
		sube: 'Asistencias +45% · el equipo termina más arriba',
		cuesta: 'Goles −20%',
		goles: 0.8,
		asistencias: 1.45,
		minutos: 0,
		lesion: 1,
		desgaste: 0,
		dt: 5,
		equipo: 2
	},
	{
		id: 'titular',
		nombre: 'Ganarte al técnico',
		detalle:
			'Primero en llegar, último en irse. Se traduce en minutos, que es lo que te hace mejor.',
		sube: 'Más minutos · el técnico te banca',
		cuesta: 'Menos goles por partido · desgasta más',
		goles: 0.88,
		asistencias: 0.95,
		minutos: 12,
		lesion: 1.1,
		desgaste: 2,
		dt: 10,
		equipo: 0
	},
	{
		id: 'cuidarse',
		nombre: 'Llegar entero',
		detalle: 'Administrarse. Vas a rendir un poco menos y vas a jugar tres temporadas más.',
		sube: 'Mitad de riesgo de lesión · casi no desgasta',
		cuesta: 'Goles y asistencias −12% · menos minutos',
		goles: 0.88,
		asistencias: 0.88,
		minutos: -5,
		lesion: 0.5,
		desgaste: -2,
		dt: 0,
		equipo: 0
	}
];

export const OBJETIVO_POR_DEFECTO = 'equipo';

export function objetivo(id: string | undefined): Objetivo {
	return (
		OBJETIVOS.find((o) => o.id === id) ?? OBJETIVOS.find((o) => o.id === OBJETIVO_POR_DEFECTO)!
	);
}

/**
 * Qué objetivos tienen sentido para el puesto.
 *
 * A un arquero no se le pide que vaya siempre al gol. Se filtran en vez de
 * dejarlos y castigarlos: una opción que nunca conviene no es una decisión, es
 * una trampa.
 */
export function objetivosPara(posicion: Posicion): Objetivo[] {
	if (posicion === 'arquero') return OBJETIVOS.filter((o) => o.id !== 'gol');
	if (posicion === 'defensor') return OBJETIVOS.filter((o) => o.id !== 'gol');
	return OBJETIVOS;
}

/**
 * Cuánto pesa cada objetivo según la intensidad de pretemporada elegida.
 *
 * No es arbitrario: cada intensidad ya tiene una intención propia (ver
 * `entrenamiento.ts`), y el objetivo sorteado sigue esa misma intención en vez
 * de contradecirla. "Suave" es cuidarse, así que "cuidarse" pesa el triple que
 * en las otras dos; "a matar" es jugarse entero, así que "ir siempre al gol" y
 * "ganarte al técnico" —las dos apuestas— pesan más que en "suave"; "firme" es
 * lo del medio, sin favorito.
 */
const PESO_OBJETIVO_POR_INTENSIDAD: Record<string, Record<string, number>> = {
	suave: { cuidarse: 55, equipo: 25, titular: 15, gol: 5 },
	firme: { equipo: 35, titular: 30, gol: 25, cuidarse: 10 },
	'a-matar': { gol: 40, titular: 35, equipo: 15, cuidarse: 10 }
};

/**
 * Sortea el objetivo del año, pesado por la intensidad elegida.
 *
 * Reemplaza la tarjeta de "cómo vas a jugar el año": ya no lo elige el
 * futbolista, sale solo al cerrar la pretemporada, como consecuencia de la
 * intensidad que sí eligió. Sigue filtrado por puesto —un arquero nunca sale
 * "ir siempre al gol"— y sigue siendo la misma tirada para la misma partida:
 * `rng` ya viene de `rngPara`, así que dos corridas con la misma semilla dan el
 * mismo objetivo.
 */
export function objetivoPorAzar(posicion: Posicion, intensidad: string | undefined, rng: Rng): Objetivo {
	const disponibles = objetivosPara(posicion);
	const pesos = PESO_OBJETIVO_POR_INTENSIDAD[intensidad ?? 'firme'] ?? PESO_OBJETIVO_POR_INTENSIDAD.firme;
	const conPeso = disponibles.map((o) => ({ o, peso: pesos[o.id] ?? 10 }));
	const total = conPeso.reduce((suma, x) => suma + x.peso, 0);

	let tirada = rng.siguiente() * total;
	for (const { o, peso } of conPeso) {
		if (tirada < peso) return o;
		tirada -= peso;
	}
	return conPeso[conPeso.length - 1].o;
}
