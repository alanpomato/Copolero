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
	/**
	 * Lo que cuesta, cuando cuesta algo.
	 *
	 * Aparte y no metido adentro de `siempre` porque se dibuja aparte: en verde
	 * lo que da, en rojo lo que saca. Es el mismo trato que ya tienen los
	 * momentos y las gestiones, y por el mismo motivo —"poner en cada tarjeta
	 * cuánto sube y cuánto baja"—: un rasgo que sólo enumera ventajas se elige
	 * sin pensar, y estos no son todos ventaja.
	 */
	pero?: string;

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

	/*
	 * Y las que se agregaron para que los rasgos nuevos no fueran el mismo
	 * rasgo con otro nombre. Con ocho palancas, la número catorce ya repetía a
	 * alguna de las trece anteriores; con estas seis, un rasgo puede ser "el que
	 * la gente quiere aunque juegue mal" o "el que se lleva bien con su
	 * representante", que son jugadores distintos y no números distintos.
	 */
	/** Por temporada, sobre lo que ya sube o baja solo. */
	fama?: number;
	hinchada?: number;
	prensa?: number;
	moral?: number;
	/** Cuánto menos se enfría la relación con el representante cada año. */
	confianza?: number;
	/** Multiplicador sobre el valor de mercado: hay quien vale más de lo que rinde. */
	valor?: number;
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
	},
	// --- Lo que sos fuera de la cancha ---------------------------------------
	/*
	 * Estos son los que hicieron falta para que el catálogo creciera de verdad.
	 *
	 * Eran trece y Alan pidió muchos más "para que la tirada saque cosas
	 * distintas". Con las ocho palancas que había, el rasgo número catorce era
	 * siempre alguno de los trece con otro nombre: más goles, más minutos, menos
	 * lesiones. Las seis palancas nuevas —fama, hinchada, prensa, moral,
	 * confianza y valor— son las que permiten escribir "el que la gente quiere
	 * aunque juegue mal" y "el que vale más de lo que rinde", que no son números
	 * distintos: son jugadores distintos.
	 */
	{
		id: 'idolo',
		nombre: 'Ídolo de la tribuna',
		detalle: 'La gente te canta aunque pierdan. No sabés bien por qué, pero pasa.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'liderazgo',
		cuanto: 6,
		siempre: 'La hinchada te sube 4 todos los años, juegues como juegues',
		hinchada: 4,
		fama: 1
	},
	{
		id: 'mediatico',
		nombre: 'Le gusta la cámara',
		detalle: 'Notas, programas, publicidades. Te conocen en todos lados.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'liderazgo',
		cuanto: 5,
		siempre: 'Ganás 5 de fama todos los años',
		pero: 'La prensa te castiga: −2 por año',
		fama: 5,
		prensa: -2
	},
	{
		id: 'callado',
		nombre: 'No habla nunca',
		detalle: 'Contestás con dos palabras y te vas. Nunca diste un titular.',
		posiciones: ['arquero', 'defensor', 'mediocampista'],
		atributo: 'defensa',
		cuanto: 6,
		siempre: 'La prensa nunca te pega: +4 por año',
		pero: 'Te conocen menos: −1 de fama por año',
		prensa: 4,
		fama: -1
	},
	{
		id: 'profesional',
		nombre: 'Profesional',
		detalle: 'Primero en llegar, último en irse, y nunca una nota de más.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'resistencia',
		cuanto: 6,
		siempre: 'El técnico te quiere y el cuerpo se te gasta menos',
		desgaste: -1,
		dt: 2
	},
	{
		id: 'de-palabra',
		nombre: 'Hombre de palabra',
		detalle: 'Al que te lleva la carrera lo llamás vos, y no sólo cuando necesitás algo.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'liderazgo',
		cuanto: 6,
		siempre: 'La relación con tu representante se enfría mucho más despacio',
		confianza: 3
	},
	{
		id: 'caro',
		nombre: 'Vende camisetas',
		detalle: 'Los clubes te compran por lo que movés, no sólo por lo que jugás.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'regate',
		cuanto: 5,
		siempre: 'Valés un 30% más de lo que dice tu rendimiento',
		pero: 'Al técnico no le gusta el ruido: −2 por año',
		valor: 1.3,
		dt: -2
	},
	{
		id: 'elastico',
		nombre: 'Elástico',
		detalle: 'Te doblás donde otros se cortan. Los kinesiólogos no te conocen.',
		posiciones: ['arquero', 'defensor', 'mediocampista', 'delantero'],
		atributo: 'resistencia',
		cuanto: 6,
		siempre: 'Te lesionás un 25% menos',
		lesion: 0.75
	},
	{
		id: 'tardio',
		nombre: 'De maduración lenta',
		detalle: 'A los 19 no jugabas. A los 26 sos otro. Hay que aguantar el medio.',
		posiciones: ['defensor', 'mediocampista', 'delantero'],
		atributo: 'pase',
		cuanto: 5,
		siempre: 'Crecés un 20% más rápido en cada temporada',
		pero: 'Jugás menos: −4 de minutos',
		crecimiento: 1.2,
		minutos: -4
	},
	{
		id: 'caracter',
		nombre: 'Carácter difícil',
		detalle: 'Discutís con todos y jugás mejor enojado. Los técnicos lo sufren.',
		posiciones: ['mediocampista', 'delantero'],
		atributo: 'liderazgo',
		cuanto: 6,
		siempre: 'La gente te ama y metés un 8% más de goles',
		pero: 'El técnico te sufre: −3 por año',
		goles: 1.08,
		hinchada: 5,
		dt: -3
	},

	// --- Más de ataque -------------------------------------------------------
	{
		id: 'penalero',
		nombre: 'El que patea los penales',
		detalle: 'Nadie te discute la pelota cuando cobran adentro del área.',
		posiciones: ['mediocampista', 'delantero'],
		atributo: 'definicion',
		cuanto: 7,
		siempre: 'Metés un 12% más de goles',
		goles: 1.12,
		fama: 1
	},
	{
		id: 'cabezazo',
		nombre: 'Va de arriba',
		detalle: 'En los centros la buscás vos, y en los córners te marcan dos.',
		posiciones: ['defensor', 'delantero'],
		atributo: 'potencia',
		cuanto: 8,
		siempre: 'Metés un 8% más de goles y el equipo termina un poco más arriba',
		goles: 1.08,
		equipo: 1
	},
	{
		id: 'contragolpe',
		nombre: 'Vive de la contra',
		detalle: 'Cuando el partido se abre aparecés vos. En los trabados, no tanto.',
		posiciones: ['delantero'],
		atributo: 'velocidad',
		cuanto: 8,
		siempre: 'Metés un 10% más de goles y jugás más',
		goles: 1.1,
		minutos: 3
	},
	{
		id: 'frio',
		nombre: 'Frío en el mano a mano',
		detalle: 'De frente al arquero no te tiembla nada. Ni en el noventa.',
		posiciones: ['delantero'],
		atributo: 'definicion',
		cuanto: 7,
		siempre: 'Metés un 10% más de goles y los años malos no te tumban',
		goles: 1.1,
		moral: 2
	},
	{
		id: 'desmarque',
		nombre: 'Se mueve entre líneas',
		detalle: 'Aparecés en el lugar donde no hay nadie. Los centrales no saben con quién ir.',
		posiciones: ['mediocampista', 'delantero'],
		atributo: 'pase',
		cuanto: 7,
		siempre: 'Das un 15% más de asistencias y metés un poco más',
		asistencias: 1.15,
		goles: 1.05
	},

	// --- Más de mediocampo ---------------------------------------------------
	{
		id: 'motor',
		nombre: 'Motor',
		detalle: 'Vas y volvés los noventa. El técnico te pone aunque estés cansado.',
		posiciones: ['mediocampista'],
		atributo: 'resistencia',
		cuanto: 8,
		siempre: 'Jugás mucho más: +8 de minutos',
		pero: 'El cuerpo lo paga: +1 de desgaste por año',
		minutos: 8,
		desgaste: 1
	},
	{
		id: 'pausa',
		nombre: 'Tiene la pausa',
		detalle: 'Cuando todos corren, vos parás la pelota y el equipo respira.',
		posiciones: ['mediocampista'],
		atributo: 'pase',
		cuanto: 7,
		siempre: 'Das un 18% más de asistencias y el técnico no te saca nunca',
		asistencias: 1.18,
		dt: 3
	},
	{
		id: 'pelota-parada',
		nombre: 'Pelota parada',
		detalle: 'Los tiros libres y los córners son tuyos, y de ahí salen partidos.',
		posiciones: ['defensor', 'mediocampista', 'delantero'],
		atributo: 'definicion',
		cuanto: 6,
		siempre: 'Metés un 9% más de goles y das un 10% más de asistencias',
		goles: 1.09,
		asistencias: 1.1
	},
	{
		id: 'recupero',
		nombre: 'Roba y sale jugando',
		detalle: 'Cortás y en vez de reventarla, la ponés. Ahí empieza el ataque.',
		posiciones: ['defensor', 'mediocampista'],
		atributo: 'defensa',
		cuanto: 7,
		siempre: 'Tu equipo termina más arriba y el técnico te tiene de titular',
		equipo: 2,
		dt: 2
	},

	// --- Más de defensa ------------------------------------------------------
	{
		id: 'barrera',
		nombre: 'No lo pasan',
		detalle: 'Uno contra uno en tu área no perdés. Los delanteros te esquivan la zona.',
		posiciones: ['defensor'],
		atributo: 'defensa',
		cuanto: 8,
		siempre: 'Tu equipo termina más arriba y te rompés un poco menos',
		equipo: 2,
		lesion: 0.9
	},
	{
		id: 'duro',
		nombre: 'Va al frente',
		detalle: 'Ponés la cara donde otros ponen el pie. La tribuna eso lo ve.',
		posiciones: ['defensor', 'mediocampista'],
		atributo: 'potencia',
		cuanto: 8,
		siempre: 'La gente te quiere y el equipo termina más arriba',
		pero: 'La prensa te castiga: −2 por año',
		equipo: 1,
		hinchada: 3,
		prensa: -2
	},
	{
		id: 'veterano',
		nombre: 'Sabe administrarse',
		detalle: 'Corrés lo justo y llegás siempre. A los 34 seguís siendo titular.',
		posiciones: ['arquero', 'defensor'],
		atributo: 'defensa',
		cuanto: 6,
		siempre: 'Se te gasta mucho menos el cuerpo y jugás un poco más',
		desgaste: -2,
		minutos: 2
	},

	// --- Más de arco ---------------------------------------------------------
	{
		id: 'atajapenales',
		nombre: 'Ataja penales',
		detalle: 'Los adivinás. En las definiciones el estadio te mira a vos.',
		posiciones: ['arquero'],
		atributo: 'defensa',
		cuanto: 7,
		siempre: 'Tu equipo termina más arriba y te conocen por eso',
		equipo: 2,
		fama: 2
	},
	{
		id: 'seguridad',
		nombre: 'Transmite seguridad',
		detalle: 'Con vos atrás, los cuatro de adelante juegan diez metros más arriba.',
		posiciones: ['arquero'],
		atributo: 'liderazgo',
		cuanto: 7,
		siempre: 'Tu equipo termina más arriba y el técnico no te saca nunca',
		equipo: 2,
		dt: 3
	},
	{
		id: 'arriesgado',
		nombre: 'Sale a cortar todo',
		detalle: 'Salís hasta la mitad de la cancha. Cuando sale bien, no hay contra.',
		posiciones: ['arquero'],
		atributo: 'velocidad',
		cuanto: 8,
		siempre: 'Tu equipo termina bastante más arriba',
		pero: 'Te rompés un 15% más seguido',
		equipo: 3,
		lesion: 1.15
	},
	{
		id: 'manos',
		nombre: 'Manos seguras',
		detalle: 'La pelota que agarrás no se te cae nunca. Ni con lluvia.',
		posiciones: ['arquero'],
		atributo: 'potencia',
		cuanto: 7,
		siempre: 'Tu equipo termina más arriba y la gente confía en vos',
		equipo: 2,
		hinchada: 2
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
		| 'goles'
		| 'asistencias'
		| 'lesion'
		| 'minutos'
		| 'desgaste'
		| 'dt'
		| 'equipo'
		| 'crecimiento'
		| 'fama'
		| 'hinchada'
		| 'prensa'
		| 'moral'
		| 'confianza'
		| 'valor'
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
		crecimiento: r?.crecimiento ?? 1,
		fama: r?.fama ?? 0,
		hinchada: r?.hinchada ?? 0,
		prensa: r?.prensa ?? 0,
		moral: r?.moral ?? 0,
		confianza: r?.confianza ?? 0,
		valor: r?.valor ?? 1
	};
}
