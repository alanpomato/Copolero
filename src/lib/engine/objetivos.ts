import type { Estado, Posicion } from './tipos';

/**
 * Cómo va a jugar el año.
 *
 * Bebo lo dijo mejor que nadie: "es muy difícil hacer una buena temporada, y no
 * hay nada que puedas hacer como para empujar eso para arriba". Tenía razón.
 * El futbolista elegía plan de pretemporada —que mueve un atributo dos puntos—
 * y después miraba cómo le iba. La temporada le pasaba por al lado.
 *
 * El objetivo es la palanca que faltaba: una decisión por año, con efecto en la
 * misma temporada, visible antes de elegir. Ninguno es mejor que otro; cada uno
 * sube una parte de la nota y baja otra. Ir siempre al gol te hace goleador y
 * te saca del juego colectivo; jugar para el equipo te da asistencias y el
 * equipo termina más arriba; ganarte al técnico te da minutos, que es lo que de
 * verdad hace crecer; cuidarte te deja entero para tres temporadas más.
 *
 * Los números los sigue decidiendo el motor. El objetivo no regala nada: mueve
 * de dónde sale lo que ya iba a pasar.
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
 * Lo que el objetivo elegido va a hacer, dicho antes de elegirlo.
 *
 * La rueda de ocasión muestra las probabilidades a la vista y ésta es la misma
 * idea: nadie tiene que adivinar qué hace un botón.
 */
export function loQueVaAPasar(estado: Estado, id: string | undefined): string {
	const o = objetivo(id);
	const f = estado.futbolista;

	if (o.id === 'cuidarse' && f.desgaste >= 60) {
		return `Con ${f.desgaste} de desgaste, cuidarte este año es lo que te deja llegar a los 34.`;
	}
	if (o.id === 'titular' && f.dt < 0) {
		return `El técnico hoy no te tiene. Ganártelo es lo que más te puede cambiar el año.`;
	}
	if (o.id === 'gol' && f.posicion === 'delantero') {
		return `Sos 9: si el año te sale, éste es el que te pone en la tapa del diario.`;
	}
	if (o.id === 'equipo' && f.posicion === 'mediocampista') {
		return `Es lo tuyo. Un 5 que hace jugar al equipo termina el año con mejor nota que uno que mete dos goles.`;
	}
	return o.detalle;
}
