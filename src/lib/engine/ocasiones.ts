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

/**
 * Y una en el mercado.
 *
 * Una sola: la fase 3 ya tiene la decisión más pesada del juego —a qué club se
 * va— y meterle tres momentos antes la tapa. Lo que hace falta ahí no es más
 * para hacer, es que el año no termine siempre con la misma pantalla.
 */
export const OCASIONES_EN_EL_MERCADO = 1;

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
		fase: estado.fase,
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
		id: 'el-cabezazo',
		juego: 'arco',
		titulo: 'El centro que llega',
		contexto: `Viene el centro desde la derecha y vos entrás de frente contra ${club(e.rival).nombre}. El central te va a buscar.`,
		opciones: [
			{
				id: 'ir-de-frente',
				etiqueta: 'Ir a buscarla de arriba',
				detalle: 'Chocar y ganar. Es la jugada de los nueve que aguantan.',
				probabilidad: chance(48, (a.potencia + a.definicion) / 2),
				siSale: 'Le ganaste de arriba y la bajaste al piso, cruzada. Adentro.',
				siFalla: 'Chocaron los dos y la peinó el central. Quedaste en el piso.',
				premio: { goles: 1, fama: 4, moral: 6, hinchada: 5 },
				castigo: { moral: -3, desgaste: 1 }
			},
			{
				id: 'engancharse',
				etiqueta: 'Anticiparlo por adelante',
				detalle: 'Si le ganás el tiempo, el arquero no llega. Si no, es falta.',
				probabilidad: chance(38, a.velocidad),
				siSale: 'Le ganaste el tiempo y la tocaste apenas. El arquero ni la vio.',
				siFalla: 'Te adelantaste de más y el árbitro cobró falta en ataque.',
				premio: { goles: 1, fama: 6, moral: 7, prensa: 4 },
				castigo: { moral: -4, dt: -2 }
			},
			{
				id: 'dejarla-pasar',
				etiqueta: 'Dejarla pasar para el que viene',
				detalle: 'El gol es del otro. Pero al técnico le encanta.',
				probabilidad: chance(72, a.pase, 0.3),
				siSale: 'La dejaste pasar y el segundo palo la empujó. Jugada de pizarrón.',
				siFalla: 'La dejaste pasar y atrás no había nadie. Se perdió sola.',
				premio: { asistencias: 1, dt: 5, moral: 2 },
				castigo: { dt: -2, moral: -2 }
			}
		]
	}),
	(a, e) => ({
		id: 'el-clasico',
		juego: 'ruleta',
		titulo: 'El clásico',
		contexto: `Clásico contra ${club(e.rival).nombre}, cero a cero, y la cancha no respira. Te toca la pelota en la puerta del área.`,
		opciones: [
			{
				id: 'reventarla',
				etiqueta: 'Sacar el zurdazo de una',
				detalle: 'Sin pensarlo. En los clásicos entran las que no entran nunca.',
				probabilidad: chance(32, a.definicion, 0.5),
				siSale: 'La reventaste de primera y se metió contra el palo. La cancha se vino abajo.',
				siFalla: 'Le pegaste con todo y se fue a la tribuna. Se escuchó el silbido.',
				premio: { goles: 1, fama: 9, moral: 10, hinchada: 12, prensa: 7 },
				castigo: { moral: -4, hinchada: -3 }
			},
			{
				id: 'aguantarla',
				etiqueta: 'Aguantarla y esperar que suban',
				detalle: 'Lo que hace el que ya jugó clásicos. Aburrido y correcto.',
				probabilidad: chance(64, (a.resistencia + a.pase) / 2, 0.35),
				siSale: 'La aguantaste, subieron los de atrás y de esa jugada salió el gol.',
				siFalla: 'Te la sacaron de atrás y salieron de contra. Casi te matan.',
				premio: { asistencias: 1, dt: 6, moral: 4, hinchada: 4 },
				castigo: { dt: -5, moral: -3 }
			},
			{
				id: 'ir-al-piso',
				etiqueta: 'Buscar el penal',
				detalle: 'Se usa. También se paga si el árbitro no te la compra.',
				probabilidad: chance(30, a.regate, 0.4),
				siSale: 'Te fue a buscar el defensor, lo esperaste, y el árbitro señaló el punto.',
				siFalla: 'El árbitro te sacó amarilla por simular. Toda la cancha rival cantándote.',
				premio: { fama: 5, hinchada: 6, moral: 4 },
				castigo: { prensa: -7, hinchada: -5, moral: -4 }
			}
		]
	}),
	(a, e) => ({
		id: 'la-sequia',
		juego: 'dado',
		titulo: 'La sequía',
		contexto: `Hace seis fechas que no metés y contra ${club(e.rival).nombre} tenés la primera clara del partido. Lo pensás una milésima de más.`,
		opciones: [
			{
				id: 'meterla',
				etiqueta: 'Reventarla sin pensar',
				detalle: 'Volver a lo que hacías cuando no pensabas nada.',
				probabilidad: chance(46, a.definicion),
				siSale: 'La reventaste sin mirar y entró. Te la sacaste de encima gritando.',
				siFalla: 'Le pegaste con todo y le pegaste al arquero en la cara. Otra más.',
				premio: { goles: 1, moral: 12, fama: 4, hinchada: 6 },
				castigo: { moral: -8, hinchada: -3 }
			},
			{
				id: 'acomodarla',
				etiqueta: 'Acomodarla al palo',
				detalle: 'Con calma, como en el entrenamiento. Si tenés cabeza fría.',
				probabilidad: chance(40, (a.definicion + a.liderazgo) / 2),
				siSale: 'La acomodaste despacio al segundo palo. Se cortó la racha.',
				siFalla: 'Te tomaste un segundo de más y te la taparon.',
				premio: { goles: 1, moral: 10, dt: 4 },
				castigo: { moral: -7, dt: -3 }
			},
			{
				id: 'darsela',
				etiqueta: 'Dársela al que está mejor',
				detalle: 'La sequía sigue, pero el equipo gana.',
				probabilidad: chance(76, a.pase, 0.3),
				siSale: 'Se la diste al que estaba solo. Gol, y el abrazo igual fue tuyo.',
				siFalla: 'Se la diste mal y se perdió. Lo peor de los dos mundos.',
				premio: { asistencias: 1, dt: 5, moral: -1 },
				castigo: { moral: -6, dt: -3, hinchada: -3 }
			}
		]
	}),
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
		id: 'el-partido-trabado',
		juego: 'dado',
		titulo: 'El partido trabado',
		contexto: `Contra ${club(e.rival).nombre} no pasa nada hace media hora. Te dan la pelota en la mitad y todos te miran a vos.`,
		opciones: [
			{
				id: 'la-de-treinta',
				etiqueta: 'Buscar el pase de treinta metros',
				detalle: 'La que rompe el partido, si sale.',
				probabilidad: chance(38, a.pase, 0.55),
				siSale: 'Levantaste la cabeza y la pusiste al vacío. De ahí salió el gol.',
				siFalla: 'Se la regalaste al lateral rival y salieron de contra.',
				premio: { asistencias: 1, fama: 6, moral: 6, dt: 5 },
				castigo: { dt: -5, moral: -4 }
			},
			{
				id: 'conducir',
				etiqueta: 'Agarrarla y meterse',
				detalle: 'Romper la línea con la pelota al pie. Cansa y expone.',
				probabilidad: chance(42, a.regate),
				siSale: 'Te metiste entre tres y saliste del otro lado. Se hizo otro partido.',
				siFalla: 'Te la sacaron a mitad de camino y quedaste vendido.',
				premio: { asistencias: 1, fama: 5, hinchada: 6, desgaste: 1 },
				castigo: { moral: -4, desgaste: 2 }
			},
			{
				id: 'tocar-atras',
				etiqueta: 'Tocarla atrás y empezar de nuevo',
				detalle: 'No pasa nada, no se rompe nada.',
				probabilidad: 100,
				siSale: 'La tocaste atrás. El partido siguió igual de trabado.',
				siFalla: '',
				premio: { dt: 1 },
				castigo: {}
			}
		]
	}),
	(a, e) => ({
		id: 'el-que-te-marca',
		juego: 'ruleta',
		titulo: 'El que te sigue a todos lados',
		contexto: `${club(e.rival).nombre} te puso a uno encima desde el minuto uno. Te sigue hasta al banco. Hay que hacer algo.`,
		opciones: [
			{
				id: 'llevarlo',
				etiqueta: 'Llevártelo lejos y abrir el hueco',
				detalle: 'No tocás una pelota, pero el equipo juega mejor.',
				probabilidad: chance(64, a.liderazgo, 0.35),
				siSale: 'Te lo llevaste a la banda y por el medio pasó todo. El técnico lo vio.',
				siFalla: 'Te fuiste del partido y encima el hueco no lo usó nadie.',
				premio: { dt: 8, asistencias: 1, moral: 2 },
				castigo: { dt: -3, moral: -5 }
			},
			{
				id: 'ganarle',
				etiqueta: 'Ganarle en el mano a mano',
				detalle: 'De frente. Si le ganás una vez, no te sigue más.',
				probabilidad: chance(40, a.regate, 0.55),
				siSale: 'Lo sentaste dos veces seguidas y el técnico rival lo sacó.',
				siFalla: 'Te ganó todas y encima terminaste caliente.',
				premio: { fama: 6, hinchada: 7, moral: 6 },
				castigo: { moral: -6, prensa: -2 }
			},
			{
				id: 'calentarlo',
				etiqueta: 'Calentarlo hasta que lo echen',
				detalle: 'Sucio y efectivo. Si sale mal, el que se va sos vos.',
				probabilidad: chance(34, a.liderazgo, 0.4),
				siSale: 'Se comió la roja a los veinte minutos. Jugaron con uno menos.',
				siFalla: 'El árbitro te vio a vos. Amarilla y el técnico puteando desde afuera.',
				premio: { fama: 4, hinchada: 6, dt: 3 },
				castigo: { dt: -8, prensa: -5, moral: -3 }
			}
		]
	}),
	(a, e) => ({
		id: 'la-cinta',
		juego: 'quiz',
		titulo: 'La cinta de capitán',
		contexto: `Se lesionó el capitán y ${e.tecnico ?? 'el técnico'} mira para el costado buscando a quién dársela. Te mira a vos.`,
		opciones: [
			{
				id: 'agarrarla',
				etiqueta: 'Agarrarla',
				detalle: 'Hablar, ordenar, bancar. Se paga y se cobra.',
				probabilidad: chance(46, a.liderazgo, 0.6),
				siSale: 'La agarraste y se notó. El vestuario te empezó a mirar distinto.',
				siFalla: 'La agarraste y te quedó grande. Se notó eso también.',
				premio: { dt: 8, hinchada: 6, moral: 7, fama: 4 },
				castigo: { moral: -6, dt: -3 }
			},
			{
				id: 'pasarla',
				etiqueta: 'Señalar al de más años',
				detalle: 'Que la lleve el que corresponde. Nadie te lo va a reprochar.',
				probabilidad: 100,
				siSale: 'Señalaste al más veterano. Te agradeció con un gesto y siguió el partido.',
				siFalla: '',
				premio: { dt: 2, moral: 1 },
				castigo: {}
			}
		]
	}),
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
		id: 'el-ultimo-hombre',
		juego: 'dado',
		titulo: 'Último hombre',
		contexto: `Se les escapó ${e.figuraRival ?? 'el nueve'} de ${club(e.rival).nombre} y atrás no hay nadie más que vos. Falta media cancha.`,
		opciones: [
			{
				id: 'aguantarlo',
				etiqueta: 'Aguantarlo hasta que llegue alguien',
				detalle: 'Correr para atrás y no comprarse el amague.',
				probabilidad: chance(52, (a.velocidad + a.defensa) / 2),
				siSale: 'Lo fuiste llevando a la banda hasta que llegaron los dos de atrás.',
				siFalla: 'Te ganó en velocidad y quedó solo contra el arquero.',
				premio: { dt: 7, moral: 5, hinchada: 4 },
				castigo: { moral: -5, dt: -4 }
			},
			{
				id: 'barrerlo',
				etiqueta: 'Barrerlo y que sea lo que sea',
				detalle: 'Si es afuera del área, es roja pero salvás el partido.',
				probabilidad: chance(44, a.defensa, 0.5),
				siSale: 'Se la sacaste limpia con el pie estirado. Amarilla y aplauso.',
				siFalla: 'Llegaste tarde. Roja directa y quince minutos con uno menos.',
				premio: { dt: 8, hinchada: 9, fama: 5 },
				castigo: { dt: -10, hinchada: -6, moral: -7 }
			},
			{
				id: 'dejarlo',
				etiqueta: 'No arriesgar y volver al área',
				detalle: 'Que definan ellos. Vos no regalás nada.',
				probabilidad: chance(58, a.defensa, 0.3),
				siSale: 'Te acomodaste en el área y le achicaste el ángulo. La tiró afuera.',
				siFalla: 'Le diste todo el tiempo del mundo y la puso donde quiso.',
				premio: { dt: 3, moral: 2 },
				castigo: { moral: -4, hinchada: -3 }
			}
		]
	}),
	(a, e) => ({
		id: 'el-corner-a-favor',
		juego: 'arco',
		titulo: 'El córner del final',
		contexto: `Último minuto contra ${club(e.rival).nombre}, van perdiendo por uno, y es córner a favor. ${e.tecnico ? e.tecnico + ' te grita que subas.' : 'El técnico te grita que subas.'}`,
		opciones: [
			{
				id: 'subir',
				etiqueta: 'Subir a buscarla',
				detalle: 'Un central en el área es un problema. También lo es el contragolpe.',
				probabilidad: chance(34, a.potencia, 0.5),
				siSale: 'Le ganaste a todos de arriba y la mandaste adentro. Sos el héroe del día.',
				siFalla: 'Saliste segundo, salieron de contra y te comieron el segundo gol.',
				premio: { goles: 1, fama: 9, hinchada: 12, moral: 10 },
				castigo: { dt: -5, moral: -5, hinchada: -2 }
			},
			{
				id: 'quedarse',
				etiqueta: 'Quedarte a cubrir',
				detalle: 'Alguien tiene que quedarse. Casi nunca es noticia.',
				probabilidad: chance(70, a.defensa, 0.3),
				siSale: 'Te quedaste, cortaste la contra y el partido terminó ahí.',
				siFalla: 'Ni el córner ni la contra: nada. Se terminó el partido igual.',
				premio: { dt: 5, moral: 1 },
				castigo: { moral: -1 }
			}
		]
	}),
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
		id: 'la-que-no-se-ve',
		juego: 'arco',
		titulo: 'El remate entre la gente',
		contexto: `Tiran de afuera del área y la pelota se te viene entre seis piernas. La ves cuando ya salió.`,
		opciones: [
			{
				id: 'tirarse',
				etiqueta: 'Tirarte a donde creés',
				detalle: 'Adivinar. A veces es lo único que hay.',
				probabilidad: chance(38, a.velocidad, 0.5),
				siSale: 'Te tiraste antes de verla y la sacaste con los dedos. No se explica.',
				siFalla: 'Te tiraste para el otro lado. Gol, y la repetición no te ayuda.',
				premio: { fama: 7, moral: 8, hinchada: 8, prensa: 5 },
				castigo: { moral: -6, hinchada: -4 }
			},
			{
				id: 'esperarla',
				etiqueta: 'Aguantar parado hasta verla',
				detalle: 'Si la ves, la sacás. Si la ves tarde, no llegás.',
				probabilidad: chance(50, a.defensa, 0.45),
				siSale: 'La esperaste, la viste salir entre las piernas y la mandaste al córner.',
				siFalla: 'La viste demasiado tarde. Se te metió abajo del cuerpo.',
				premio: { fama: 4, moral: 5, dt: 4 },
				castigo: { moral: -6, dt: -4, prensa: -3 }
			}
		]
	}),
	(a, e) => ({
		id: 'el-grito',
		juego: 'quiz',
		titulo: 'El grito',
		contexto: `Vas perdiendo por dos contra ${club(e.rival).nombre} y la defensa está desarmada. Desde el arco lo ves todo y nadie está diciendo nada.`,
		opciones: [
			{
				id: 'gritar',
				etiqueta: 'Gritarles a todos',
				detalle: 'Sacudirlos de una. Funciona o se pudre.',
				probabilidad: chance(44, a.liderazgo, 0.6),
				siSale: 'Los cagaste a gritos y se acomodaron. No te hicieron un gol más.',
				siFalla: 'Se lo tomaron mal y encima llegó el tercero.',
				premio: { dt: 7, hinchada: 5, moral: 5 },
				castigo: { moral: -5, dt: -4 }
			},
			{
				id: 'hablarles',
				etiqueta: 'Llamarlos y hablarles bajo',
				detalle: 'Uno por uno, en el próximo tiro libre. Más lento, más seguro.',
				probabilidad: chance(58, a.liderazgo, 0.4),
				siSale: 'Los juntaste y les hablaste tranquilo. Se acomodaron sin que se note.',
				siFalla: 'Nadie te escuchó: estaban en cualquier lado.',
				premio: { dt: 5, moral: 4 },
				castigo: { moral: -3 }
			},
			{
				id: 'callarse',
				etiqueta: 'Atajar y callarte',
				detalle: 'No es tu trabajo ordenarlos. Aunque los veas.',
				probabilidad: 100,
				siSale: 'Te quedaste callado y atajaste lo que pudiste.',
				siFalla: '',
				premio: {},
				castigo: { dt: -2 }
			}
		]
	}),
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
		id: 'el-pibe-del-club',
		juego: 'quiz',
		titulo: 'El pibe de inferiores',
		contexto: `Subió un pibe de la séptima a entrenar con el plantel y no le habla nadie. Lo mismo que te pasó a vos.`,
		opciones: [
			{
				id: 'bancarlo',
				etiqueta: 'Sentarte con él',
				detalle: 'Diez minutos. No te cuesta nada y a él le cambia la semana.',
				probabilidad: chance(74, a.liderazgo, 0.3),
				siSale:
					'Le hablaste, entrenó suelto y la rompió. Todo el club se enteró de quién lo bancó.',
				siFalla: 'Se puso más nervioso todavía y no le salió una. Igual te lo agradeció.',
				premio: { dt: 5, hinchada: 4, moral: 4 },
				castigo: { moral: 1 }
			},
			{
				id: 'exigirle',
				etiqueta: 'Exigirle como al resto',
				detalle: 'Nadie te regaló nada a vos tampoco.',
				probabilidad: chance(46, a.liderazgo, 0.45),
				siSale: 'Lo apuraste todo el entrenamiento y respondió. Después te lo agradeció.',
				siFalla: 'Se fue llorando al vestuario y el técnico te lo hizo saber.',
				premio: { dt: 6, moral: 3 },
				castigo: { dt: -5, prensa: -2 }
			},
			{
				id: 'ignorarlo',
				etiqueta: 'Dejarlo que se arregle solo',
				detalle: 'Así se aprende. O eso dicen.',
				probabilidad: 100,
				siSale: 'No le dijiste nada. Entrenó, se fue, y nadie se acordó.',
				siFalla: '',
				premio: {},
				castigo: {}
			}
		]
	}),
	(a, e) => ({
		id: 'la-multa',
		juego: 'dado',
		titulo: 'La multa',
		contexto: `Llegaste tarde a la concentración por segunda vez en el mes. ${e.tecnico ? e.tecnico + ' te espera' : 'El técnico te espera'} en la puerta con cara de pocos amigos.`,
		opciones: [
			{
				id: 'pedir-disculpas',
				etiqueta: 'Pedir disculpas y bancarte la multa',
				detalle: 'Pagar y no discutir. Es lo más barato que hay.',
				probabilidad: chance(70, a.liderazgo, 0.3),
				siSale: 'Pagaste sin chistar y ahí murió. Al otro día ni se hablaba del tema.',
				siFalla: 'Igual quedó picando. Te lo van a recordar la próxima.',
				premio: { dt: 3 },
				castigo: { dt: -3, moral: -2 }
			},
			{
				id: 'explicarle',
				etiqueta: 'Explicarle qué pasó',
				detalle: 'Si tenés motivo y sabés contarlo. Si no, es una excusa.',
				probabilidad: chance(44, a.liderazgo, 0.5),
				siSale: 'Le contaste lo que pasaba en tu casa y te levantó la multa él mismo.',
				siFalla: 'Le sonó a excusa. Multa doble y una charla que no querías tener.',
				premio: { dt: 6, moral: 4 },
				castigo: { dt: -7, moral: -4 }
			},
			{
				id: 'plantarse',
				etiqueta: 'Decirle que es un problema suyo',
				detalle: 'Nunca es buena idea. A veces igual se dice.',
				probabilidad: chance(24, a.liderazgo, 0.4),
				siSale: 'Le paraste el carro y te respetó. No a todos les sale.',
				siFalla: 'Te mandó al banco tres fechas y lo contó a la prensa.',
				premio: { dt: 4, hinchada: 3, moral: 5 },
				castigo: { dt: -14, prensa: -6, moral: -5 }
			}
		]
	}),
	(a, e) => ({
		id: 'la-fundacion',
		juego: 'quiz',
		titulo: 'El barrio',
		contexto: `Te llaman del club donde empezaste: se les llueve el vestuario y no tienen para arreglarlo. No te piden nada, te lo cuentan.`,
		opciones: [
			{
				id: 'ponerla',
				etiqueta: 'Poner la plata vos',
				detalle: 'Sale de tu bolsillo. No sale en ningún lado.',
				probabilidad: chance(82, a.liderazgo, 0.2),
				siSale:
					'Arreglaron el vestuario y le pusieron tu nombre. No lo pediste y no lo pudiste evitar.',
				siFalla: 'La plata se usó mal y quedó a medio hacer. Igual lo intentaste.',
				premio: { hinchada: 8, prensa: 6, moral: 8, fama: 3 },
				castigo: { moral: -2 }
			},
			{
				id: 'conseguirla',
				etiqueta: 'Conseguir que la ponga alguien',
				detalle: 'Usar el nombre para que aparezca otro. Cuesta más llamadas.',
				probabilidad: chance(48, a.liderazgo, 0.5),
				siSale: 'Conseguiste un sponsor y quedaron todos contentos, vos incluido.',
				siFalla: 'No te atendió nadie. Quedaste como el que promete y no cumple.',
				premio: { hinchada: 6, prensa: 5, fama: 4 },
				castigo: { prensa: -4, moral: -3 }
			},
			{
				id: 'no-puedo',
				etiqueta: 'Decirles que ahora no podés',
				detalle: 'Es la verdad y no te va a hacer sentir bien igual.',
				probabilidad: 100,
				siSale: 'Les dijiste que ahora no. Lo entendieron. Vos no tanto.',
				siFalla: '',
				premio: {},
				castigo: { moral: -2 }
			}
		]
	}),
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
// El mercado
// ---------------------------------------------------------------------------

/**
 * Lo que le pasa al futbolista mientras se define su pase.
 *
 * Acá no hay pelota: la fase 3 pasa entre el vestuario, la calle y el teléfono.
 * Lo que se juega es lo que dice y a quién se lo dice, y todo cae sobre las
 * mismas variables que después deciden si el pase sale —la relación con el
 * técnico, con la gente, con la prensa, con su representante—.
 *
 * Va antes de elegir club, a propósito: no es un adorno previo a la decisión,
 * es parte de con qué se llega a ella.
 */
const EN_EL_MERCADO: Plantilla[] = [
	(a, e) => ({
		id: 'el-hincha',
		titulo: 'El hincha',
		contexto:
			`Salís a comprar algo a la vuelta de tu casa y te para un hincha. Sabe que hay clubes ` +
			`preguntando por vos y te lo pregunta de frente, sin agresión: quiere saber si te vas.`,
		juego: 'quiz',
		opciones: [
			{
				id: 'la-verdad',
				etiqueta: 'Decirle la verdad',
				detalle: 'Que todavía no sabés. Es lo que pasa, aunque no sea lo que quiere escuchar.',
				probabilidad: chance(56, a.liderazgo, 0.5),
				siSale:
					'Te agradeció que no le mintieras. Lo contó en todos lados y la gente lo tomó bien.',
				siFalla:
					'Se fue diciendo que ya tenías un pie afuera. Para la tarde lo sabía media ciudad.',
				premio: { hinchada: 6, prensa: 3, moral: 2 },
				castigo: { hinchada: -7, prensa: -3 }
			},
			{
				id: 'me-quedo',
				etiqueta: '«Yo me quedo acá»',
				detalle: 'Lo que quiere escuchar. Si después te vas, se acuerdan.',
				probabilidad: chance(72, a.liderazgo, 0.3),
				siSale: 'Le hiciste el día. Esa frase dio la vuelta y la cancha te la cantó el domingo.',
				siFalla: 'Lo dijiste sin ganas y se le notó. Quedó peor que si no hubieras dicho nada.',
				premio: { hinchada: 10, moral: 3 },
				castigo: { hinchada: -4, moral: -2 }
			},
			{
				id: 'esquivar',
				etiqueta: 'Sonreír y seguir de largo',
				detalle: 'No decir nada nunca fue noticia.',
				probabilidad: 100,
				siSale: 'Le sonreíste, le firmaste la remera y seguiste. No pasó nada.',
				siFalla: '',
				premio: { hinchada: 1 },
				castigo: {}
			}
		]
	}),

	(a, e) => ({
		id: 'el-dt-aparte',
		titulo: e.tecnico ? `${e.tecnico} te lleva aparte` : 'El técnico te lleva aparte',
		contexto: e.tecnico
			? `Terminó el entrenamiento y ${e.tecnico} te hace señas de que te quedes. Sabe que hay ` +
				`ofertas y te quiere decir algo antes de que decidas.`
			: `Terminó el entrenamiento y el técnico te hace señas de que te quedes. Sabe que hay ` +
				`ofertas y te quiere decir algo antes de que decidas.`,
		juego: 'quiz',
		opciones: [
			{
				id: 'escucharlo',
				etiqueta: 'Escucharlo hasta el final',
				detalle: 'Sin prometer nada. A veces lo único que quieren es que los escuches.',
				probabilidad: chance(66, a.liderazgo, 0.35),
				siSale: 'Te dijo que sos parte de lo que está armando. Salieron los dos mejor de ahí.',
				siFalla: 'Habló diez minutos de él y ni te miró. Salió peor de lo que entró.',
				premio: { dt: 10, moral: 3 },
				castigo: { dt: -3, moral: -3 }
			},
			{
				id: 'pedirle',
				etiqueta: 'Pedirle que te banque si te vas',
				detalle: 'Jugado. Si te entiende, es un aliado; si no, te lo cobra en la cancha.',
				probabilidad: chance(44, a.liderazgo, 0.55),
				siSale: 'Te dijo que él también fue jugador y que va a decir lo que hay que decir.',
				siFalla: 'Le cayó como una traición. Desde ese día te habla lo justo.',
				premio: { dt: 6, prensa: 4, moral: 4 },
				castigo: { dt: -14, moral: -4 }
			},
			{
				id: 'cortar',
				etiqueta: 'Decirle que lo hablás con tu representante',
				detalle: 'Lo correcto y lo frío. No suma ni resta casi nada.',
				probabilidad: 100,
				siSale: 'Le dijiste que lo maneja tu representante. Asintió y te dejó ir.',
				siFalla: '',
				premio: {},
				castigo: { dt: -1 }
			}
		]
	}),

	(a, e) => ({
		id: 'la-revision',
		titulo: 'La revisión',
		contexto:
			`Un club te quiere y quiere revisarte antes. Te subís a una camilla a que te miren la ` +
			`rodilla, el tobillo y todo lo que arrastrás de estos años.`,
		juego: 'dado',
		opciones: [
			{
				id: 'ir-entero',
				etiqueta: 'Ir y que miren todo',
				detalle: 'Sin esconder nada. Si algo aparece, aparece.',
				probabilidad: chance(60, a.resistencia, 0.5),
				siSale: 'Pasaste la revisión sin una observación. El club se quedó tranquilo.',
				siFalla: 'Encontraron algo viejo. No es grave, pero quedó escrito en un informe.',
				premio: { fama: 3, moral: 3 },
				castigo: { moral: -5, prensa: -3 }
			},
			{
				id: 'infiltrarse',
				etiqueta: 'Taparlo con lo que haga falta',
				detalle: 'Que ese día no te duela nada. Después se verá.',
				probabilidad: chance(68, a.potencia, 0.35),
				siSale: 'Pasaste sin que se note. Nadie preguntó nada.',
				siFalla: 'Se dieron cuenta y quedó peor que si no hubieras hecho nada.',
				premio: { fama: 4, desgaste: 2 },
				castigo: { moral: -6, prensa: -5, desgaste: 3 }
			},
			{
				id: 'postergar',
				etiqueta: 'Pedir que sea la semana que viene',
				detalle: 'Ganar unos días para llegar mejor. El club se impacienta.',
				probabilidad: chance(52, a.liderazgo, 0.4),
				siSale: 'Aceptaron esperar y llegaste entero. Salió limpia.',
				siFalla: 'Se leyó como que escondés algo y bajaron el interés.',
				premio: { moral: 2 },
				castigo: { fama: -2, moral: -3 }
			}
		]
	})
];

/** La del mercado: una sola, y de las que pasan fuera de la cancha. */
function delMercado(estado: Estado, semilla: string): Ocasion[] {
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 3,
		clave: 'ocasiones-mercado'
	});
	const elegidas: Plantilla[] = [];
	const restantes = [...EN_EL_MERCADO];
	while (elegidas.length < Math.min(OCASIONES_EN_EL_MERCADO, restantes.length)) {
		const cual = rng.elegir(restantes);
		elegidas.push(cual);
		restantes.splice(restantes.indexOf(cual), 1);
	}
	return elegidas.map((plantilla, i) =>
		plantilla(estado.futbolista.atributos, escenario(estado, i, semilla))
	);
}

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

	// En el mercado no hay pelota: lo que pasa es lo que se dice y con quién se
	// habla mientras se define adónde va. Ver `EN_EL_MERCADO`.
	if (estado.fase === 3) return delMercado(estado, semilla);

	const propias = POR_POSICION[futbolista.posicion];
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: estado.fase,
		clave: 'ocasiones'
	});

	/*
	 * Dos de puesto y una de las otras: que la temporada no sea siempre pelota.
	 *
	 * Las dos de puesto salen sorteadas y sin repetirse. Antes se copiaba la
	 * lista a un array llamado `mezcla` y se le hacía `slice(0, 2)` sin mezclar
	 * nada: salían siempre las dos primeras de la lista, las mismas dieciocho
	 * temporadas seguidas. Medido, un delantero veía siete momentos distintos en
	 * toda su carrera y dos de ellos eran el 50% del total. Era exactamente eso
	 * lo que se sentía repetitivo, y no la falta de contenido.
	 */
	const elegidas: Plantilla[] = [];
	const disponibles = [...propias];
	while (elegidas.length < OCASIONES_POR_TEMPORADA - 1 && disponibles.length > 0) {
		const cual = rng.elegir(disponibles);
		elegidas.push(cual);
		disponibles.splice(disponibles.indexOf(cual), 1);
	}
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
		fase: estado.fase,
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
