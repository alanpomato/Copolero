import { rngPara } from './rng';
import type { Atributos, Estado, Posicion } from './tipos';

/**
 * Qué clase de jugador sos.
 *
 * Se elige una sola vez, en la primera pretemporada, entre tres que trae el
 * azar. No se cambia nunca más. Es la decisión más chica del juego y la que más
 * dura: dos carreras que arrancan igual dejan de parecerse desde ahí.
 *
 * Cada rasgo sube un atributo de golpe —que es lo que se ve— y deja algo
 * encendido para siempre —que es lo que se siente—. Ninguno es mejor: el olfato
 * de gol hace goleadores y el pulmón hace jugadores que llegan a los 36.
 *
 * Que sean tres y no la lista entera es a propósito. Elegir entre cuatro
 * caminos abiertos es un menú; elegir entre las tres cartas que te tocaron es
 * una decisión, y encima hace que la próxima partida no sea igual.
 */

export type Rasgo = {
	id: string;
	nombre: string;
	detalle: string;
	posiciones: Posicion[];
	/** El golpe inicial, que es lo que se ve al elegirlo. */
	atributo: keyof Atributos;
	cuanto: number;
	/** Y lo que deja encendido para siempre, dicho en una línea. */
	siempre: string;

	/** Multiplicadores permanentes sobre la temporada. 1 = no cambia nada. */
	goles?: number;
	asistencias?: number;
	lesion?: number;
	/** Puntos de minutos y de desgaste por temporada. */
	minutos?: number;
	desgaste?: number;
	/** Lo que le suma al técnico y al equipo, todos los años. */
	dt?: number;
	equipo?: number;
	/** Cuánto más aprovecha cada temporada. */
	crecimiento?: number;
};

export const CUANTOS_SE_OFRECEN = 3;

export const RASGOS: Rasgo[] = [
	// --- Ataque --------------------------------------------------------------
	{
		id: 'olfato',
		nombre: 'Olfato de gol',
		detalle: 'Estás donde va a caer la pelota antes de que caiga. No se enseña.',
		posiciones: ['delantero'],
		atributo: 'definicion',
		cuanto: 8,
		siempre: 'Metés un 14% más de goles, toda la carrera',
		goles: 1.14
	},
	{
		id: 'arranque',
		nombre: 'Arranque corto',
		detalle: 'Los primeros cinco metros los ganás siempre. Con eso alcanza.',
		posiciones: ['delantero', 'mediocampista'],
		atributo: 'velocidad',
		cuanto: 8,
		siempre: 'Jugás más minutos y el técnico te pone de arranque',
		minutos: 7,
		dt: 2
	},
	{
		id: 'espalda',
		nombre: 'Espalda ancha',
		detalle: 'Aguantás de espaldas contra dos centrales y no te sacan la pelota.',
		posiciones: ['delantero'],
		atributo: 'potencia',
		cuanto: 8,
		siempre: 'El cuerpo te dura más: −1 de desgaste por año',
		desgaste: -1
	},
	{
		id: 'pegada',
		nombre: 'Pegada',
		detalle: 'Cuando la agarrás de zurda o de derecha, va a donde vos querés.',
		posiciones: ['delantero', 'mediocampista'],
		atributo: 'regate',
		cuanto: 8,
		siempre: 'Das un 20% más de asistencias',
		asistencias: 1.2
	},

	// --- Mediocampo ----------------------------------------------------------
	{
		id: 'panorama',
		nombre: 'Panorama',
		detalle: 'Levantás la cabeza antes de recibir y ya sabés dónde está todo el mundo.',
		posiciones: ['mediocampista', 'defensor'],
		atributo: 'pase',
		cuanto: 8,
		siempre: 'Das un 25% más de asistencias',
		asistencias: 1.25
	},
	{
		id: 'pulmon',
		nombre: 'Pulmón',
		detalle: 'Corrés los noventa como si fueran los primeros diez.',
		posiciones: ['mediocampista', 'defensor'],
		atributo: 'resistencia',
		cuanto: 8,
		siempre: 'Más minutos y menos desgaste: vas a llegar entero a los 35',
		minutos: 6,
		desgaste: -1
	},
	{
		id: 'gambeta',
		nombre: 'Gambeta',
		detalle: 'Uno contra uno no perdés casi nunca, y eso rompe cualquier defensa.',
		posiciones: ['mediocampista', 'delantero'],
		atributo: 'regate',
		cuanto: 8,
		siempre: 'Metés un 10% más de goles y el equipo termina más arriba',
		goles: 1.1,
		equipo: 1
	},
	{
		id: 'jerarquia',
		nombre: 'Jerarquía',
		detalle: 'En los partidos difíciles la pedís vos. El vestuario lo nota.',
		posiciones: ['mediocampista', 'defensor', 'arquero'],
		atributo: 'liderazgo',
		cuanto: 8,
		siempre: 'El técnico te banca siempre: +4 todos los años',
		dt: 4
	},

	// --- Defensa -------------------------------------------------------------
	{
		id: 'anticipo',
		nombre: 'Anticipo',
		detalle: 'Le ganás de arriba y de abajo, y casi nunca tenés que barrerte.',
		posiciones: ['defensor'],
		atributo: 'defensa',
		cuanto: 8,
		siempre: 'Tu equipo termina más arriba en la tabla',
		equipo: 2
	},
	{
		id: 'fierro',
		nombre: 'De fierro',
		detalle: 'No te rompés. Jugaste con tres puntos y no se lo contaste a nadie.',
		posiciones: ['defensor', 'arquero', 'delantero'],
		atributo: 'potencia',
		cuanto: 8,
		siempre: 'Te lesionás un 30% menos que el resto',
		lesion: 0.7
	},

	// --- Arco ----------------------------------------------------------------
	{
		id: 'reflejos',
		nombre: 'Reflejos',
		detalle: 'Sacás pelotas que ya estaban adentro. El estadio se levanta.',
		posiciones: ['arquero'],
		atributo: 'potencia',
		cuanto: 8,
		siempre: 'Tu equipo termina bastante más arriba',
		equipo: 3
	},
	{
		id: 'con-los-pies',
		nombre: 'Juega con los pies',
		detalle: 'El arquero que arranca la jugada. Los técnicos de ahora te buscan.',
		posiciones: ['arquero', 'defensor'],
		atributo: 'pase',
		cuanto: 8,
		siempre: 'Más minutos: sos el que el técnico quiere para jugar de atrás',
		minutos: 8
	},

	// --- Para cualquiera -----------------------------------------------------
	{
		id: 'cabeza',
		nombre: 'Cabeza',
		detalle: 'Mirás video, preguntás, anotás. Aprendés más rápido que los demás.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'liderazgo',
		cuanto: 6,
		siempre: 'Crecés un 15% más rápido en cada temporada',
		crecimiento: 1.15
	}
];

export function rasgo(id: string | null | undefined): Rasgo | null {
	return RASGOS.find((r) => r.id === id) ?? null;
}

/** Cuándo se elige: la primera pretemporada y ninguna más. */
export function tocaElegirRasgo(estado: Estado): boolean {
	return !estado.carreraTerminada && estado.temporada === 1 && !estado.rasgo;
}

/**
 * Las tres cartas que le tocaron.
 *
 * Deterministas: salen de la semilla de la partida, así que la pantalla y la
 * resolución ofrecen exactamente las mismas y nadie puede recargar hasta que
 * salga la que quiere.
 */
export function rasgosQueLeTocaron(estado: Estado, semilla: string): Rasgo[] {
	const suyos = RASGOS.filter((r) => r.posiciones.includes(estado.futbolista.posicion));
	if (suyos.length <= CUANTOS_SE_OFRECEN) return suyos;

	const rng = rngPara(semilla, { temporada: 1, fase: 1, clave: 'rasgos' });
	const quedan = [...suyos];
	const salieron: Rasgo[] = [];
	while (salieron.length < CUANTOS_SE_OFRECEN && quedan.length > 0) {
		salieron.push(...quedan.splice(rng.entero(0, quedan.length - 1), 1));
	}
	return salieron;
}

/**
 * Lo deja elegido y aplica el golpe inicial.
 *
 * Si no eligió, se le da el primero de los tres: una partida no se traba porque
 * alguien no tocó un botón, y quedarse sin rasgo sería quedarse sin la mitad de
 * lo que hace distinta a una carrera.
 */
export function elegirRasgo(
	estado: Estado,
	semilla: string,
	id: string | undefined
): string | null {
	if (!tocaElegirRasgo(estado)) return null;

	const ofrecidos = rasgosQueLeTocaron(estado, semilla);
	if (ofrecidos.length === 0) return null;

	const elegido = ofrecidos.find((r) => r.id === id) ?? ofrecidos[0];
	estado.rasgo = elegido.id;

	const f = estado.futbolista;
	f.atributos[elegido.atributo] = Math.min(99, f.atributos[elegido.atributo] + elegido.cuanto);
	estado.atributosQueSubieron = [
		...new Set([...(estado.atributosQueSubieron ?? []), elegido.atributo])
	];

	return `${elegido.nombre}: +${elegido.cuanto} de ${elegido.atributo}. ${elegido.siempre}.`;
}

/**
 * Lo que el rasgo aporta a la temporada.
 *
 * Devuelve siempre algo, con todo en neutro si no hay rasgo elegido, para que
 * quien lo use no tenga que preguntar.
 */
export function loQueAporta(
	estado: Estado
): Required<
	Pick<
		Rasgo,
		'goles' | 'asistencias' | 'lesion' | 'minutos' | 'desgaste' | 'dt' | 'equipo' | 'crecimiento'
	>
> {
	const r = rasgo(estado.rasgo);
	return {
		goles: r?.goles ?? 1,
		asistencias: r?.asistencias ?? 1,
		lesion: r?.lesion ?? 1,
		minutos: r?.minutos ?? 0,
		desgaste: r?.desgaste ?? 0,
		dt: r?.dt ?? 0,
		equipo: r?.equipo ?? 0,
		crecimiento: r?.crecimiento ?? 1
	};
}
