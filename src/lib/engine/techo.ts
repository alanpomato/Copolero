import type { Estado, HitoTemporada, VisiblePara } from './tipos';

/**
 * El techo se mueve.
 *
 * El potencial se sorteaba a los 16 y no cambiaba nunca más. Es una idea vieja
 * y ordenada —el talento es el que es— y produce el peor defecto que tuvo el
 * juego hasta ahora. Alan lo encontró jugando: media 62 a los 21 y media 62 a
 * los 28, ocho temporadas sin moverse, "jugué un mundial y no sube, está raro".
 *
 * Medí veinticinco carreras enteras y no era su partida. Una de ellas promedió
 * 7,4 de nota durante quince temporadas seguidas, con dos 8,4 adentro, y su
 * media nunca pasó de 60: doce de veintiún años completamente planos. El juego
 * le decía todos los domingos que era el mejor de la cancha y todos los años
 * que no había mejorado nada. Eso no es una carrera difícil, es una carrera que
 * no escucha.
 *
 * Así que el techo pasa a ser lo que en el fútbol de verdad es: una estimación
 * que se corrige con lo que va pasando. Nadie sabía a los dieciséis que Kanté
 * iba a jugar en el Chelsea. Lo que mueve el techo son exactamente las cosas
 * que en la vida cambian lo que un jugador puede llegar a ser: una temporada
 * enorme, un título ganado jugando, y sobre todo un Mundial.
 *
 * Tres reglas lo mantienen honesto:
 *
 *  - Sube poco y cada vez menos. El empuje se achica a medida que el techo
 *    crece: al de 60 le abre una puerta grande, al de 90 casi nada. No se puede
 *    entrenar hasta ser Messi.
 *  - Hay que ganárselo jugando. Una temporada de 7,2 con mil quinientos minutos
 *    no es "estar en el plantel": es haber sido importante todo el año.
 *  - Y se termina. Después de los 30 el cuerpo manda y el techo ya no discute.
 *
 * El número sigue siendo invisible para los dos jugadores, como siempre. Lo que
 * se cuenta es que algo cambió, sin decir cuánto: ver `loQueSeCuenta`.
 */

/** Hasta qué edad el techo todavía se puede correr. */
export const ULTIMA_EDAD_QUE_EMPUJA = 30;

/** Tope duro: ni el mejor año de la historia te hace otro jugador de un saque. */
export const LO_MAXIMO_QUE_SUBE_EN_UN_ANIO = 4;

/** Y el techo del techo. */
export const TECHO_MAXIMO = 95;

/** Qué hace falta para que un año cuente como temporadón. */
export const NOTA_DE_TEMPORADON = 7.2;
export const MINUTOS_DE_TEMPORADON = 1500;

export type Empujon = {
	/** Por qué subió. Se usa para contarlo. */
	motivo: 'mundial' | 'mundial-lejos' | 'temporadon' | 'campeon';
	/** Cuánto, ya con el freno por cercanía al techo aplicado. */
	cuanto: number;
};

/**
 * Cuánto pesa cada motivo antes de frenarlo.
 *
 * El Mundial pesa más que cualquier otra cosa y llegar lejos pesa el doble, y
 * es a propósito: es lo que más cambia lo que el mundo cree que podés llegar a
 * ser, y era justamente lo que no hacía nada.
 */
const CUANTO_PESA: Record<Empujon['motivo'], number> = {
	'mundial-lejos': 9,
	mundial: 5.5,
	temporadon: 4.5,
	campeon: 3
};

/**
 * El freno: cuanto más alto el techo, menos se lo puede empujar.
 *
 * A los 60 un temporadón abre casi dos puntos; a los 90, medio. Sin esto, una
 * carrera buena y larga llegaría a 95 sola y el potencial dejaría de significar
 * algo.
 */
function cuantoDeja(potencial: number): number {
	return Math.max(0.08, (TECHO_MAXIMO - potencial) / 100);
}

/**
 * Y la edad, que es la parte que hace que esto sirva de algo.
 *
 * La primera versión movía el techo igual a los diecisiete que a los
 * veintiocho, y no alcanzaba: el techo subía pero el jugador ya no tenía años
 * para usarlo. Crecer contra el techo se frena con la edad —eso está bien y es
 * lo que pasa—, así que un techo que se corre a los veintisiete es un permiso
 * que llega cuando ya no se puede aprovechar.
 *
 * Un pibe de diecisiete con una temporada enorme es un descubrimiento y hay que
 * tratarlo como tal: se le abre el futuro entero. El mismo año a los veintiocho
 * es un buen profesional teniendo un buen año, y mueve poco. Así el techo se
 * corrige cuando todavía queda carrera para llenarlo.
 */
function porLaEdad(edad: number): number {
	if (edad <= 19) return 2;
	if (edad <= 22) return 1.5;
	if (edad <= 25) return 1;
	if (edad <= 28) return 0.55;
	return 0.3;
}

/**
 * Si de verdad lo jugó.
 *
 * `no-fue` es un valor válido del resultado de Mundial, y hoy el motor no lo
 * escribe nunca en el historial —sólo anota el Mundial cuando fue—, pero
 * apoyarse en eso es apoyarse en una casualidad: `if (hito.mundial)` sería
 * verdadero igual y le movería el techo al que se quedó mirándolo por
 * televisión.
 */
function loJugo(mundial: string | null): boolean {
	return mundial !== null && mundial !== 'no-fue';
}

/** Si el Mundial que jugó fue de los que se recuerdan. */
function llegoLejos(mundial: string | null): boolean {
	return mundial === 'campeon' || mundial === 'final' || mundial === 'semifinal';
}

/**
 * Qué le movió el techo este año, si algo se lo movió.
 *
 * Función pura: mira el año que cerró y devuelve los empujones, sin tocar nada.
 */
export function loQueEmpujaElTecho(estado: Estado, hito: HitoTemporada): Empujon[] {
	if (hito.edad > ULTIMA_EDAD_QUE_EMPUJA) return [];

	const cuanto = cuantoDeja(estado.futbolista.potencial) * porLaEdad(hito.edad);
	const empujones: Empujon[] = [];

	const anota = (motivo: Empujon['motivo']) => {
		const sube = Math.round(CUANTO_PESA[motivo] * cuanto * 10) / 10;
		if (sube >= 0.1) empujones.push({ motivo, cuanto: sube });
	};

	if (loJugo(hito.mundial)) anota(llegoLejos(hito.mundial) ? 'mundial-lejos' : 'mundial');

	/*
	 * El temporadón se mide con los minutos y no solo con la nota. Una nota alta
	 * en ocho partidos es un buen semestre, no un año: si contara igual, el
	 * suplente que entra a hacer goles subiría más que el titular que aguantó
	 * treinta fechas.
	 */
	if (hito.nota >= NOTA_DE_TEMPORADON && hito.partidos * 90 >= MINUTOS_DE_TEMPORADON) {
		anota('temporadon');
	}

	// El título tiene que ser suyo: estar en la foto no forma a nadie.
	if (hito.titulo) anota('campeon');

	return empujones;
}

/**
 * Le mueve el techo y devuelve cuánto subió de verdad.
 *
 * Muta el estado, que ya viene clonado, igual que el resto del cierre. Devuelve
 * `0` cuando no se movió, que es la mayoría de los años de la mayoría de las
 * carreras.
 */
export function empujarElTecho(estado: Estado, hito: HitoTemporada): number {
	const empujones = loQueEmpujaElTecho(estado, hito);
	if (empujones.length === 0) return 0;

	const suma = empujones.reduce((total, e) => total + e.cuanto, 0);
	const antes = estado.futbolista.potencial;
	/*
	 * Redondeado a un decimal antes de guardarlo. Sin esto el potencial termina
	 * siendo 88.80000000000001 después de tres empujones: nadie lo ve —es un
	 * número oculto— pero rompe la comparación de dos estados que tendrían que
	 * ser iguales, que es como están escritos los tests del motor.
	 */
	const despues =
		Math.round(Math.min(TECHO_MAXIMO, antes + Math.min(LO_MAXIMO_QUE_SUBE_EN_UN_ANIO, suma)) * 10) /
		10;

	estado.futbolista.potencial = despues;
	return Math.round((despues - antes) * 10) / 10;
}

/**
 * Cómo se cuenta, sin decir el número.
 *
 * El potencial es invisible para los dos jugadores desde el primer día y tiene
 * que seguir siéndolo: adivinarlo es medio juego. Pero que se mueva en silencio
 * sería peor que no moverlo —el jugador vuelve a no enterarse de nada—, así que
 * se cuenta lo que se siente, no lo que se calcula.
 *
 * Y se lo cuenta a los dos. Al representante le cambia lo que tiene entre
 * manos, y ésa es de las pocas noticias que de verdad quiere escuchar.
 */
export function loQueSeCuenta(
	empujones: readonly Empujon[],
	nombre: string
): { visiblePara: VisiblePara; texto: string } | null {
	if (empujones.length === 0) return null;

	// El motivo más gordo manda el texto: si el año trajo un Mundial y además un
	// título, lo que uno cuenta es el Mundial.
	const cual = [...empujones].sort((a, b) => b.cuanto - a.cuanto)[0];

	const textos: Record<Empujon['motivo'], string> = {
		'mundial-lejos':
			`Después de lo que hizo en el Mundial, ${nombre} volvió siendo otro. ` +
			`Se le nota en el entrenamiento: ahora se cree capaz de cosas que antes miraba de afuera.`,
		mundial:
			`Jugar un Mundial deja algo. ${nombre} volvió midiéndose con otra vara, ` +
			`y en el club lo notaron antes que él.`,
		temporadon:
			`Un año así no se explica solo con lo que ya sabía hacer. ${nombre} encontró ` +
			`un techo más arriba del que todos le calculaban.`,
		campeon:
			`Salir campeón jugando cambia a un jugador. ${nombre} volvió de las vacaciones ` +
			`convencido de que puede más, y por una vez tiene con qué respaldarlo.`
	};

	return { visiblePara: 'ambos', texto: textos[cual.motivo] };
}
