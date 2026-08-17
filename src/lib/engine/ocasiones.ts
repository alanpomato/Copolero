import { club, contexto, clubesDe } from '../../../content/mundo';
import { arqueroActualDe, dtActualDe, jugadoresActualesDe } from './mercado';
import { media } from './estado';
import { rngPara } from './rng';
import type { Atributos, CambiosMundo, Estado, Posicion } from './tipos';

/**
 * La rueda de ocasión.
 *
 * Tres o cuatro momentos marcados por temporada donde el futbolista elige qué
 * hacer, con las probabilidades a la vista. La gracia es justamente ésa: el
 * juego te dice que definir cruzado sale 38% y tocarla al compañero sale 74%,
 * y vos elegís. Perder con la probabilidad a la vista se banca; perder sin
 * saberla, no.
 *
 * Las probabilidades salen de los atributos, así que la misma ocasión se juega
 * distinto a los 17 que a los 27. Y el resultado sale de la semilla: no se
 * puede recargar la página para que salga mejor.
 */

/** Lo que mueve una ocasión cuando sale, o cuando no. */
export type Efecto = {
	goles?: number;
	asistencias?: number;
	fama?: number;
	moral?: number;
	dt?: number;
	hinchada?: number;
	prensa?: number;
	confianza?: number;
	desgaste?: number;
};

export type Opcion = {
	id: string;
	etiqueta: string;
	/** Qué significa elegir esto. Se muestra abajo del botón. */
	detalle: string;
	/** 0–100. Se muestra siempre: es el corazón del minijuego. */
	probabilidad: number;
	siSale: string;
	siFalla: string;
	premio: Efecto;
	castigo: Efecto;
};

/**
 * Con qué se juega este momento.
 *
 * Los tres momentos del año eran siempre la misma rueda, y tres temporadas más
 * tarde ya no se miraba: se elegía la opción de arriba y se apretaba. Un
 * minijuego que se repite quince años seguidos deja de ser un minijuego.
 *
 * Así que cada momento se juega con lo que le corresponde. No es variedad por
 * variedad: un penal no es una ruleta, es un arco con alguien adentro; y una
 * charla con el técnico no es un arco, es una tirada contra tu número. Lo que
 * cambia es la forma de mirar la misma probabilidad, que sigue siendo la de
 * verdad en los tres casos.
 *
 *  - `ruleta`: la rueda que gira. Para lo que pasa con la pelota en movimiento.
 *  - `arco`:   el arco y el que ataja. Para definir, patear y atajar.
 *  - `dado`:   un número contra el tuyo. Para lo que se juega fuera de la cancha.
 *  - `quiz`:   una charla en la que hay que contestar. Para los momentos del
 *              representante, donde lo que se juega es lo que se dice.
 */
export type Minijuego = 'ruleta' | 'arco' | 'dado' | 'quiz';

export type Ocasion = {
	id: string;
	titulo: string;
	/** El planteo, ya narrado y con los nombres reales del mundo. */
	contexto: string;
	/** Con qué se juega. Lo decide el momento, no la pantalla. */
	juego: Minijuego;
	opciones: Opcion[];
};

export type ResultadoDeOcasion = {
	ocasionId: string;
	opcionId: string;
	salio: boolean;
	texto: string;
	efecto: Efecto;
};

export const OCASIONES_POR_TEMPORADA = 3;

// ---------------------------------------------------------------------------
// El escenario: contra quién y con quién
// ---------------------------------------------------------------------------

type Escenario = {
	/** Un rival de la misma liga, distinto del club propio. */
	rival: string;
	/** El arquero del rival, si es alguien conocido. */
	arqueroRival: string | null;
	/** Un jugador de campo conocido del rival. */
	figuraRival: string | null;
	/** El técnico propio, si es alguien conocido. */
	tecnico: string | null;
};

function escenario(estado: Estado, indice: number, semilla: string): Escenario {
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 2,
		clave: 'escenario',
		indice
	});

	const propio = estado.futbolista.contrato.clubId;
	const { liga } = contexto(propio);
	const rivales = clubesDe(liga.id).filter((c) => c.id !== propio);
	const rival = rivales.length > 0 ? rng.elegir(rivales).id : propio;

	const cambios = estado.cambiosMundo;
	const arquero = arqueroActualDe(rival, cambios);
	const deCampo = jugadoresActualesDe(rival, cambios)
		.filter((p) => p.posicion !== 'arquero')
		.sort((a, b) => b.fama - a.fama);

	return {
		rival,
		arqueroRival: arquero?.nombre ?? null,
		figuraRival: deCampo[0]?.nombre ?? null,
		tecnico: dtActualDe(propio, cambios)?.nombre ?? null
	};
}

// ---------------------------------------------------------------------------
// Las probabilidades
// ---------------------------------------------------------------------------

/**
 * Convierte una puntería cruda en una probabilidad que se pueda mostrar.
 *
 * `base` es lo que sale con atributo 50 y ninguna ventaja. Cada punto de
 * atributo por encima o por debajo mueve la aguja, pero nunca a los extremos:
 * nada baja de 8% ni sube de 92%, porque una ocasión que sale siempre no es
 * una ocasión.
 */
function chance(base: number, atributo: number, peso = 0.55): number {
	return Math.round(Math.max(8, Math.min(92, base + (atributo - 50) * peso)));
}

// ---------------------------------------------------------------------------
// Las plantillas
// ---------------------------------------------------------------------------

type Plantilla = (a: Atributos, e: Escenario) => Ocasion;

const arqueroDelRival = (e: Escenario) => e.arqueroRival ?? `el arquero de ${club(e.rival).nombre}`;

/** Para las frases que arrancan con un nombre que puede venir en minúscula. */
const Mayus = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * "a" delante de un nombre que a veces es una persona y a veces un puesto.
 *
 * El rival puede ser "Franco Armani" o "el arquero de Temperley", según si el
 * club tiene a alguien conocido en el arco. Concatenar "a" con las dos daba
 * "Se la cruzaste a el arquero", que en castellano no existe.
 */
const aQuien = (quien: string) => (quien.startsWith('el ') ? `al ${quien.slice(3)}` : `a ${quien}`);

const PARA_DELANTERO: Plantilla[] = [
	(a, e) => ({
		id: 'mano-a-mano',
		juego: 'arco',
		titulo: 'Mano a mano',
		contexto: `Te quedaste solo contra ${arqueroDelRival(e)}. Sale a achicarte.`,
		opciones: [
			{
				id: 'cruzado',
				etiqueta: 'Definir cruzado, al segundo palo',
				detalle: 'Lo que haría un nueve. Si entra, es golazo.',
				probabilidad: chance(46, a.definicion),
				siSale: `Se la cruzaste ${aQuien(arqueroDelRival(e))} y la clavaste contra el palo.`,
				siFalla: `${Mayus(arqueroDelRival(e))} te adivinó el palo y la sacó al córner.`,
				premio: { goles: 1, fama: 3, moral: 6, hinchada: 4, prensa: 3 },
				castigo: { moral: -4, hinchada: -1 }
			},
			{
				id: 'amagar',
				etiqueta: 'Amagar y esperar a que se tire',
				detalle: 'Más difícil, pero si sale es la jugada de la fecha.',
				probabilidad: chance(34, (a.regate + a.definicion) / 2),
				siSale: `Lo sentaste ${aQuien(arqueroDelRival(e))} y la empujaste sin arco. La repitieron todo el día.`,
				siFalla: `Amagaste de más y ${arqueroDelRival(e)} te comió los tiempos.`,
				premio: { goles: 1, fama: 6, moral: 8, hinchada: 7, prensa: 6 },
				castigo: { moral: -6, hinchada: -3, dt: -3 }
			},
			{
				id: 'tocarla',
				etiqueta: 'Tocarla al que viene por el medio',
				detalle: 'El gol es del otro, pero el equipo lo festeja igual.',
				probabilidad: chance(70, a.pase, 0.35),
				siSale: 'La tocaste al medio y la empujaron. Asistencia y abrazo.',
				siFalla: 'El pase salió pasado y se perdió la más clara del partido.',
				premio: { asistencias: 1, moral: 3, dt: 4, confianza: 1 },
				castigo: { moral: -3, hinchada: -4 }
			}
		]
	}),
	(a, e) => ({
		id: 'penal',
		juego: 'arco',
		titulo: 'El penal',
		contexto: `Penal en el último minuto contra ${club(e.rival).nombre}. Nadie quiere agarrar la pelota.`,
		opciones: [
			{
				id: 'patear',
				etiqueta: 'Agarrar la pelota vos',
				detalle: 'Si entra sos el que la puso. Si la errás, también.',
				probabilidad: chance(72, a.definicion, 0.4),
				siSale: `Se la pusiste abajo del ángulo ${aQuien(arqueroDelRival(e))}. Explotó la cancha.`,
				siFalla: `${Mayus(arqueroDelRival(e))} te la sacó abajo. Silencio.`,
				premio: { goles: 1, fama: 5, moral: 8, hinchada: 8 },
				castigo: { moral: -10, hinchada: -6, prensa: -4 }
			},
			{
				id: 'dejarsela',
				etiqueta: 'Dejársela al capitán',
				detalle: 'No es tu responsabilidad. Tampoco tu gol.',
				probabilidad: 100,
				siSale: 'Se la dejaste al capitán. La metió él, y el abrazo fue para él.',
				siFalla: '',
				premio: { moral: 1, dt: 1 },
				castigo: {}
			}
		]
	})
];

const PARA_MEDIO: Plantilla[] = [
	(a, e) => ({
		id: 'pase-filtrado',
		juego: 'ruleta',
		titulo: 'La pelota que parte el partido',
		contexto: `Te la dieron de espaldas contra ${club(e.rival).nombre}. Tenés un segundo para levantar la cabeza.`,
		opciones: [
			{
				id: 'filtrar',
				etiqueta: 'El pase filtrado entre los centrales',
				detalle: 'Si le pega bien, es gol y es tuyo.',
				probabilidad: chance(42, a.pase),
				siSale:
					'Metiste el pase justo entre los centrales y la definieron. Asistencia de las que se guardan.',
				siFalla: 'El pase murió en el central y quedó el contragolpe.',
				premio: { asistencias: 1, fama: 4, moral: 6, dt: 5, prensa: 4 },
				castigo: { moral: -4, dt: -4 }
			},
			{
				id: 'girar',
				etiqueta: 'Girar y encarar vos',
				detalle: 'Salir jugando con la pelota atada al pie.',
				probabilidad: chance(38, a.regate),
				siSale: 'Giraste, te sacaste dos de encima y quedó todo el campo por delante.',
				siFalla: `${e.figuraRival ?? 'un rival'} te la robó de atrás y quedaron mano a mano.`,
				premio: { fama: 3, moral: 5, hinchada: 5 },
				castigo: { moral: -5, dt: -6, hinchada: -3 }
			},
			{
				id: 'devolver',
				etiqueta: 'Devolverla y volver a pedirla',
				detalle: 'No pasa nada. Tampoco se pierde nada.',
				probabilidad: chance(88, a.pase, 0.2),
				siSale: 'La devolviste limpia y el equipo siguió teniendo la pelota.',
				siFalla: 'Hasta la devolución te salió mal.',
				premio: { dt: 2 },
				castigo: { moral: -2, dt: -2 }
			}
		]
	}),
	(a, e) => ({
		id: 'tiro-libre',
		juego: 'arco',
		titulo: 'Tiro libre al borde del área',
		contexto: `Falta al borde del área, con ${arqueroDelRival(e)} armando la barrera.`,
		opciones: [
			{
				id: 'pegarle',
				etiqueta: 'Pegarle vos',
				detalle: 'Por encima de la barrera.',
				probabilidad: chance(26, (a.definicion + a.pase) / 2),
				siSale: `La colgaste del ángulo. ${arqueroDelRival(e)} ni se movió.`,
				siFalla: 'Se la pegaste a la barrera.',
				premio: { goles: 1, fama: 7, moral: 8, hinchada: 8, prensa: 7 },
				castigo: { moral: -3 }
			},
			{
				id: 'centrar',
				etiqueta: 'Tirar el centro al segundo palo',
				detalle: 'Menos glamour, más probable.',
				probabilidad: chance(52, a.pase, 0.4),
				siSale: 'Centro medido al segundo palo y cabezazo adentro. Tuya la asistencia.',
				siFalla: 'El centro se fue largo y no la agarró nadie.',
				premio: { asistencias: 1, moral: 4, dt: 3 },
				castigo: { moral: -2 }
			}
		]
	})
];

const PARA_DEFENSOR: Plantilla[] = [
	(a, e) => ({
		id: 'el-cruce',
		juego: 'ruleta',
		titulo: 'El cruce',
		contexto: `${e.figuraRival ?? 'El nueve del rival'} te ganó la espalda y va solo al arco.`,
		opciones: [
			{
				id: 'barrer',
				etiqueta: 'Barrerlo limpio',
				detalle: 'Si llegás, es la jugada del partido. Si no, es roja.',
				probabilidad: chance(44, (a.defensa + a.velocidad) / 2),
				siSale: `Lo barriste limpio ${aQuien(e.figuraRival ?? 'el nueve')} justo antes del área. La cancha se paró a aplaudir.`,
				siFalla: 'Llegaste tarde, lo tocaste y te fuiste expulsado.',
				premio: { fama: 4, moral: 7, hinchada: 8, dt: 5 },
				castigo: { moral: -9, dt: -8, hinchada: -6, prensa: -4 }
			},
			{
				id: 'aguantar',
				etiqueta: 'Aguantarlo y llevarlo afuera',
				detalle: 'No lo frenás, pero lo mandás al córner.',
				probabilidad: chance(66, a.defensa, 0.4),
				siSale: 'Lo aguantaste, lo fuiste llevando afuera y terminó tirando el centro a nadie.',
				siFalla: 'Te encaró, te pasó y definió cruzado.',
				premio: { dt: 4, moral: 3 },
				castigo: { moral: -5, dt: -3, hinchada: -4 }
			}
		]
	}),
	(a, e) => ({
		id: 'salida',
		juego: 'ruleta',
		titulo: 'Salir jugando',
		contexto: `${club(e.rival).nombre} te vino a presionar arriba y el arquero te la dio a vos.`,
		opciones: [
			{
				id: 'jugar',
				etiqueta: 'Salir jugando por abajo',
				detalle: 'Lo que pide el técnico. Y lo que te matan si sale mal.',
				probabilidad: chance(50, (a.pase + a.liderazgo) / 2),
				siSale: 'Saliste jugando por abajo, partiste la presión y el equipo salió limpio.',
				siFalla: 'Te la robaron en la salida y fue gol. De los que se ven todo el año.',
				premio: { dt: 6, moral: 4, prensa: 3 },
				castigo: { moral: -8, dt: -5, hinchada: -7, prensa: -5 }
			},
			{
				id: 'reventar',
				etiqueta: 'Reventarla a la tribuna',
				detalle: 'Feo, seguro, y el técnico va a poner cara.',
				probabilidad: 100,
				siSale: 'La reventaste a la tribuna. Nadie te aplaudió, nadie te puteó.',
				siFalla: '',
				premio: { hinchada: 1 },
				castigo: {}
			}
		]
	})
];

const PARA_ARQUERO: Plantilla[] = [
	(a, e) => ({
		id: 'penal-atajado',
		juego: 'arco',
		titulo: 'El penal en contra',
		contexto: `Penal para ${club(e.rival).nombre} en el minuto 90. ${e.figuraRival ?? 'El nueve'} agarra la pelota.`,
		opciones: [
			{
				id: 'adivinar',
				etiqueta: 'Jugártela a un palo',
				detalle: 'O sos el héroe, o no pasó nada.',
				probabilidad: chance(30, (a.potencia + a.defensa) / 2),
				siSale: `Le adivinaste el palo ${aQuien(e.figuraRival ?? 'el nueve')} y la sacaste. Te fueron a abrazar todos.`,
				siFalla: 'Te tiraste antes y la puso del otro lado.',
				premio: { fama: 8, moral: 9, hinchada: 9, prensa: 7 },
				castigo: { moral: -3 }
			},
			{
				id: 'esperar',
				etiqueta: 'Esperar parado hasta el final',
				detalle: 'Menos épica, más chance de que te la pateen encima.',
				probabilidad: chance(22, a.liderazgo, 0.4),
				siSale:
					'Te quedaste parado y te la pateó al cuerpo. Quedaste de pie con la pelota en el pecho.',
				siFalla: 'Se la puso abajo, contra el palo. No había nada que hacer.',
				premio: { fama: 5, moral: 7, hinchada: 6, dt: 4 },
				castigo: { moral: -2 }
			}
		]
	}),
	(a, e) => ({
		id: 'salida-arquero',
		juego: 'ruleta',
		titulo: 'El centro que hay que sacar',
		contexto: `Córner para ${club(e.rival).nombre} en el descuento, con todos adentro del área.`,
		opciones: [
			{
				id: 'salir',
				etiqueta: 'Salir a descolgarla',
				detalle: 'Si salís y no llegás, queda el arco vacío.',
				probabilidad: chance(48, (a.potencia + a.liderazgo) / 2),
				siSale: 'Saliste entre todos y la descolgaste con una mano. Se terminó el partido ahí.',
				siFalla: 'Saliste, no llegaste, y la empujaron al arco vacío.',
				premio: { dt: 6, moral: 6, hinchada: 5 },
				castigo: { moral: -9, dt: -6, hinchada: -7 }
			},
			{
				id: 'quedarse',
				etiqueta: 'Quedarte en la línea',
				detalle: 'Lo que hacen los arqueros que duran.',
				probabilidad: chance(64, a.defensa, 0.35),
				siSale: 'Te quedaste en la línea y sacaste el cabezazo abajo del ángulo.',
				siFalla: 'Cabecearon al segundo palo y no llegaste.',
				premio: { moral: 4, dt: 3 },
				castigo: { moral: -5, hinchada: -3 }
			}
		]
	})
];

/** Ocasiones que no son de pelota: sirven para cualquier puesto. */
const PARA_CUALQUIERA: Plantilla[] = [
	(a, e) => ({
		id: 'la-camara',
		juego: 'dado',
		titulo: 'El micrófono',
		contexto: e.tecnico
			? `Salís del vestuario y te frenan con un micrófono. ${e.tecnico} te está mirando desde el pasillo.`
			: 'Salís del vestuario y te frenan con un micrófono.',
		opciones: [
			{
				id: 'hablar',
				etiqueta: 'Decir lo que pensás',
				detalle: 'La hinchada lo va a agradecer. El club, no tanto.',
				probabilidad: chance(45, a.liderazgo, 0.45),
				siSale: 'Dijiste lo que pensabas y quedó bien parado. Te lo citaron toda la semana.',
				siFalla: 'Te fuiste de boca y lo sacaron de contexto.',
				premio: { fama: 6, hinchada: 7, prensa: 5, moral: 3 },
				castigo: { prensa: -7, dt: -5, confianza: -3 }
			},
			{
				id: 'esquivar',
				etiqueta: 'Contestar con lugares comunes',
				detalle: 'Partido a partido. Nadie se enoja, nadie se acuerda.',
				probabilidad: 100,
				siSale: 'Dijiste que hay que ir partido a partido. Nadie se acordó al día siguiente.',
				siFalla: '',
				premio: { prensa: 1 },
				castigo: {}
			}
		]
	}),
	(a, e) => ({
		id: 'el-pedido',
		juego: 'dado',
		titulo: e.tecnico ? `El pedido de ${e.tecnico}` : 'El pedido del técnico',
		contexto: e.tecnico
			? `${e.tecnico} te pide que juegues en un puesto que no es el tuyo para el partido con ${club(e.rival).nombre}.`
			: `El técnico te pide que juegues fuera de puesto contra ${club(e.rival).nombre}.`,
		opciones: [
			{
				id: 'aceptar',
				etiqueta: 'Aceptar y jugar donde sea',
				detalle: 'Sumás con el técnico. Rendís peor.',
				probabilidad: chance(62, a.resistencia, 0.35),
				siSale: 'Jugaste fuera de puesto y la rompiste igual. El técnico no se lo va a olvidar.',
				siFalla: 'Jugaste fuera de puesto y se notó. Igual te lo agradecieron.',
				premio: { dt: 9, moral: 4, desgaste: 1 },
				castigo: { dt: 4, moral: -3, desgaste: 2 }
			},
			{
				id: 'negarse',
				etiqueta: 'Decirle que sos de tu puesto',
				detalle: 'Te la jugás con el técnico, pero jugás donde sabés.',
				probabilidad: chance(40, a.liderazgo, 0.4),
				siSale: 'Se lo dijiste de frente, te entendió y te dejó en tu puesto.',
				siFalla: 'No le gustó nada. Fuiste al banco el partido siguiente.',
				premio: { moral: 5, dt: 2, confianza: 2 },
				castigo: { dt: -10, moral: -4 }
			}
		]
	})
];

const POR_POSICION: Record<Posicion, Plantilla[]> = {
	delantero: PARA_DELANTERO,
	mediocampista: PARA_MEDIO,
	defensor: PARA_DEFENSOR,
	arquero: PARA_ARQUERO
};

// ---------------------------------------------------------------------------
// Armar y resolver
// ---------------------------------------------------------------------------

/**
 * Las ocasiones de esta temporada.
 *
 * Función pura y determinista: el servidor la llama para mostrar la pantalla y
 * la vuelve a llamar para resolver, y las dos veces salen exactamente las
 * mismas ocasiones con las mismas probabilidades.
 */
export function ocasionesDe(estado: Estado, semilla: string): Ocasion[] {
	const { futbolista } = estado;
	const propias = POR_POSICION[futbolista.posicion];
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 2,
		clave: 'ocasiones'
	});

	// Dos de puesto y una de las otras: que la temporada no sea siempre pelota.
	const mezcla: Plantilla[] = [...propias];
	while (mezcla.length < OCASIONES_POR_TEMPORADA) mezcla.push(rng.elegir(propias));
	const elegidas = mezcla.slice(0, OCASIONES_POR_TEMPORADA - 1);
	elegidas.push(rng.elegir(PARA_CUALQUIERA));

	return elegidas.map((plantilla, i) =>
		plantilla(futbolista.atributos, escenario(estado, i, semilla))
	);
}

/**
 * Tira los dados de una ocasión ya elegida.
 *
 * Si el jugador no eligió nada —cerró la fase sin tocar la rueda— se toma la
 * opción más conservadora, que es siempre la última de la lista.
 */
export function resolverOcasion(
	ocasion: Ocasion,
	opcionId: string | undefined,
	estado: Estado,
	semilla: string,
	indice: number
): ResultadoDeOcasion {
	const opcion =
		ocasion.opciones.find((o) => o.id === opcionId) ??
		ocasion.opciones[ocasion.opciones.length - 1];

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 2,
		clave: `ocasion-${ocasion.id}`,
		indice
	});

	// La forma inclina un poco la cancha, sin tapar lo que dice el número: el
	// margen es de ±6 puntos sobre lo que se mostró.
	const ajuste = Math.round((estado.futbolista.forma - 55) / 8);
	const efectiva = Math.max(5, Math.min(97, opcion.probabilidad + ajuste));

	const salio = opcion.probabilidad >= 100 || rng.ocurre(efectiva / 100);

	return {
		ocasionId: ocasion.id,
		opcionId: opcion.id,
		salio,
		texto: salio ? opcion.siSale : opcion.siFalla,
		efecto: salio ? opcion.premio : opcion.castigo
	};
}

/** La media del futbolista, para mostrarla al lado de las probabilidades. */
export function mediaDe(estado: Estado): number {
	return media(estado.futbolista.atributos, estado.futbolista.posicion);
}

/** Los rivales conocidos de esta temporada, para la pantalla. */
export function rivalesDe(clubId: string, cambios: CambiosMundo) {
	const { liga } = contexto(clubId);
	return clubesDe(liga.id)
		.filter((c) => c.id !== clubId)
		.map((c) => ({
			club: c,
			arquero: arqueroActualDe(c.id, cambios)?.nombre ?? null,
			dt: dtActualDe(c.id, cambios)?.nombre ?? null
		}));
}
