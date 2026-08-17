import { club, contexto, clubesDe } from '../../../content/mundo';
import { jugadoresActualesDe } from './mercado';
import { rngPara } from './rng';
import type { Minijuego } from './ocasiones';
import type { Estado } from './tipos';

/**
 * Los momentos del representante.
 *
 * Hernán jugó la partida entera de este lado y lo dijo sin vueltas: "por la
 * parte de representante es súper plana, todos los turnos son iguales". Tenía
 * razón. El futbolista tenía tres momentos por temporada con la probabilidad a
 * la vista y una rueda que gira; el representante tenía una lista de gestiones
 * que se elegía una vez y no cambiaba en quince años.
 *
 * El problema de fondo no era la falta de botones: era que al representante no
 * le pasaba nada. Las cosas le pasaban al otro y él las miraba. Acá le pasan a
 * él: lo llama un dirigente, aparece un pibe al que hay que convencer, se sabe
 * que su representado estuvo donde no tenía que estar. Y son cosas que el
 * futbolista no puede resolver ni ver, que es lo que las hace suyas.
 *
 * Los momentos son los mismos que ya conoce el otro rol —contexto, opciones con
 * la probabilidad de verdad, un minijuego que la dibuja— porque la forma ya
 * estaba bien: lo que faltaba era el contenido.
 */

/** Lo que mueve un momento del representante. */
export type EfectoDelRepresentante = {
	dineroUsd?: number;
	prestigio?: number;
	negociacion?: number;
	scouting?: number;
	contactos?: number;
	carisma?: number;
	representadosExtra?: number;
	confianza?: number;
	/** Lo poco que toca del otro lado: la prensa y la moral son compartidas. */
	prensa?: number;
	moral?: number;
};

export type OpcionDelRepresentante = {
	id: string;
	etiqueta: string;
	detalle: string;
	probabilidad: number;
	siSale: string;
	siFalla: string;
	premio: EfectoDelRepresentante;
	castigo: EfectoDelRepresentante;
};

export type MomentoDelRepresentante = {
	id: string;
	titulo: string;
	contexto: string;
	juego: Minijuego;
	opciones: OpcionDelRepresentante[];
};

export type ResultadoDelMomento = {
	momentoId: string;
	opcionId: string;
	salio: boolean;
	texto: string;
	efecto: EfectoDelRepresentante;
};

export const MOMENTOS_POR_TEMPORADA = 2;

/**
 * Y uno en el mercado.
 *
 * Uno solo, no dos: el mercado ya tiene la decisión más pesada del juego —a
 * qué club se va— y meterle dos momentos más antes de esa charla la tapa. Lo
 * que hace falta ahí no es más para hacer, es que el año no termine siempre
 * con la misma pantalla.
 */
export const MOMENTOS_EN_EL_MERCADO = 1;

/**
 * El carisma.
 *
 * Es el cuarto atributo del representante y lo pidió Hernán con una idea
 * concreta: que para fichar a un pibe haya una pregunta, y que "aunque
 * contestes mal, igual el pibe se sume" si tenés carisma. Eso es exactamente lo
 * que hace acá: no cambia la probabilidad de la respuesta que elegís —eso sería
 * lo mismo que los otros atributos—, sino que aparece cuando la respuesta salió
 * mal y a veces salva la reunión igual.
 *
 * Las partidas que empezaron antes de que existiera no lo tienen guardado, así
 * que se lee con un piso.
 */
export const CARISMA_POR_DEFECTO = 32;

export function carismaDe(estado: Estado): number {
	return estado.representante.atributos.carisma ?? CARISMA_POR_DEFECTO;
}

/**
 * Cuántas veces el carisma salva algo que salió mal.
 *
 * A propósito no salva siempre ni salva nunca: con carisma 30 rescata una de
 * cada cinco, con carisma 80 más de la mitad. Es lo que hace que valga la pena
 * subirlo sin que reemplace a elegir bien.
 */
export function cuantoSalvaElCarisma(estado: Estado): number {
	return Math.round(Math.max(5, Math.min(65, carismaDe(estado) * 0.72)));
}

function chance(base: number, atributo: number, peso = 0.6): number {
	return Math.round(Math.max(8, Math.min(92, base + (atributo - 40) * peso)));
}

// ---------------------------------------------------------------------------
// El escenario
// ---------------------------------------------------------------------------

type Escenario = {
	/** Un club de la liga donde juega el representado, distinto del suyo. */
	otroClub: string;
	/** Un pibe con nombre, para el que hay que ir a buscar. */
	pibe: string;
	/** De qué club sale el pibe. */
	clubDelPibe: string;
};

const NOMBRES = [
	'Thiago Ferreyra',
	'Lautaro Benítez',
	'Matías Ocampo',
	'Bruno Salvatierra',
	'Ignacio Quiroga',
	'Joaquín Miranda',
	'Emiliano Vergara',
	'Santino Aguirre',
	'Facundo Ledesma',
	'Tomás Cardozo'
];

function escenario(estado: Estado, indice: number, semilla: string): Escenario {
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: estado.fase,
		clave: 'escenario-representante',
		indice
	});

	const propio = estado.futbolista.contrato.clubId;
	const { liga } = contexto(propio);
	const otros = clubesDe(liga.id).filter((c) => c.id !== propio);
	const otroClub = otros.length > 0 ? rng.elegir(otros).id : propio;

	// El pibe sale de un club chico: es lo que hace que buscarlo tenga mérito.
	const chicos = clubesDe(liga.id).filter((c) => c.prestigio <= 45);
	const clubDelPibe = chicos.length > 0 ? rng.elegir(chicos).id : otroClub;

	return { otroClub, pibe: rng.elegir(NOMBRES), clubDelPibe };
}

// ---------------------------------------------------------------------------
// Las plantillas
// ---------------------------------------------------------------------------

type Plantilla = (estado: Estado, e: Escenario) => MomentoDelRepresentante;

const EN_LA_TEMPORADA: Plantilla[] = [
	// --- El pibe. La idea es de Hernán, tal cual la escribió. ----------------
	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-pibe',
			titulo: 'El pibe',
			contexto:
				`Te hablaron de ${e.pibe}, 17 años, de ${club(e.clubDelPibe).nombre}. Fuiste a verlo y ` +
				`es de los que aparecen cada tanto. Después del partido te sentás con él y con el padre, ` +
				`y el padre te pregunta por qué tendría que firmar con vos y no con los otros tres que lo ` +
				`vinieron a buscar.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'la-verdad',
					etiqueta: '«Porque no le voy a mentir»',
					detalle: 'Decirle que va a tardar, que va a haber años malos, y que vas a estar.',
					probabilidad: chance(52, a.negociacion, 0.5),
					siSale: `Al padre le cerró. ${e.pibe} firma con vos.`,
					siFalla: `El padre quería escuchar otra cosa. Se fue con otro.`,
					premio: { representadosExtra: 1, prestigio: 4, carisma: 2, scouting: 2 },
					castigo: { prestigio: -1 }
				},
				{
					id: 'la-plata',
					etiqueta: '«Porque conmigo va a Europa»',
					detalle: 'Prometer alto. Si después no pasa, se acuerdan.',
					probabilidad: chance(46, a.contactos, 0.55),
					siSale: `Los deslumbraste. ${e.pibe} firma con vos, y con expectativas.`,
					siFalla: 'El padre te preguntó a quién llevaste a Europa. No supiste qué contestar.',
					premio: { representadosExtra: 1, prestigio: 6, contactos: 2 },
					castigo: { prestigio: -3, carisma: -1 }
				},
				{
					id: 'los-numeros',
					etiqueta: 'Mostrarle los números',
					detalle: 'Qué cobra hoy, qué cobraría, cuánto te llevás. Sin discurso.',
					probabilidad: chance(58, a.scouting, 0.45),
					siSale: `El padre entendió todo y firmaron ahí mismo. ${e.pibe} es tuyo.`,
					siFalla: 'Se les hizo largo. Dijeron que lo iban a pensar y no llamaron más.',
					premio: { representadosExtra: 1, prestigio: 3, negociacion: 2 },
					castigo: {}
				}
			]
		};
	},

	// --- El llamado del dirigente -------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		const donde = club(estado.futbolista.contrato.clubId).nombre;
		return {
			id: 'el-dirigente',
			titulo: 'El llamado',
			contexto:
				`Te llama un dirigente de ${club(e.otroClub).nombre} a las once de la noche. No dice qué ` +
				`quiere, pero te llamó a vos y no al club: quiere saber por ${estado.futbolista.nombre} ` +
				`sin que en ${donde} se entere.`,
			juego: 'dado',
			opciones: [
				{
					id: 'escuchar',
					etiqueta: 'Escuchar y no comprometerte',
					detalle: 'Dejar la puerta abierta sin decir nada que te puedan repetir.',
					probabilidad: chance(64, a.negociacion, 0.4),
					siSale: 'Quedaron en hablar en el mercado. Nadie se enteró y vos ya tenés un teléfono.',
					siFalla: 'Se te fue una frase y a los dos días estaba en el diario.',
					premio: { contactos: 3, prestigio: 2 },
					castigo: { prensa: -4, confianza: -3 }
				},
				{
					id: 'pedirle',
					etiqueta: 'Preguntarle cuánto pone',
					detalle: 'Ir directo. Si hay plata de verdad, aparece ahora.',
					probabilidad: chance(44, a.negociacion, 0.6),
					siSale: 'Te tiró un número que no esperabas. Ese club va a llamar en el mercado.',
					siFalla: 'Se ofendió y cortó. Los dirigentes hablan entre ellos.',
					premio: { contactos: 4, prestigio: 4, dineroUsd: 0 },
					castigo: { contactos: -3, prestigio: -2 }
				},
				{
					id: 'cortar',
					etiqueta: 'Decirle que hable con el club',
					detalle: 'Lo correcto. No te trae nada, pero no te cuesta nada.',
					probabilidad: 100,
					siSale: 'Le dijiste que llame al club. Te agradeció y cortó.',
					siFalla: '',
					premio: { confianza: 1 },
					castigo: {}
				}
			]
		};
	},

	// --- El boliche. También es idea de Hernán. -----------------------------
	(estado) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'el-boliche',
			titulo: 'La foto',
			contexto:
				`Son las seis de la mañana y te llega una foto de ${f.nombre} en un boliche, tres días ` +
				`antes de un partido. Todavía no la tiene nadie más, pero la tiene alguien.`,
			juego: 'ruleta',
			opciones: [
				{
					id: 'comprarla',
					etiqueta: 'Comprar la foto',
					detalle: 'Pagar para que no salga. Sale plata y a veces sale igual.',
					probabilidad: chance(58, a.contactos, 0.5),
					siSale: 'Pagaste y la foto no existió nunca. Nadie se enteró de nada.',
					siFalla: 'Pagaste y salió igual. Ahora perdiste la plata y quedaste como el que paga.',
					premio: { dineroUsd: -8_000, confianza: 5 },
					castigo: { dineroUsd: -8_000, prensa: -8, prestigio: -3 }
				},
				{
					id: 'adelantarse',
					etiqueta: 'Sacarla vos primero',
					detalle: 'Contarlo como una salida normal antes de que lo cuenten como escándalo.',
					probabilidad: chance(48, a.contactos, 0.55),
					siSale: 'Salió como una noche cualquiera. Al día siguiente nadie hablaba de eso.',
					siFalla: 'Se leyó como que lo estabas tapando, que es peor que la foto.',
					premio: { prensa: 4, prestigio: 3, carisma: 2 },
					castigo: { prensa: -6, confianza: -4 }
				},
				{
					id: 'hablarle',
					etiqueta: 'No hacer nada y hablar con él',
					detalle: 'Que salga lo que salga, pero que no vuelva a pasar.',
					probabilidad: chance(50, a.negociacion, 0.5),
					siSale: 'Lo escuchó. Salió la foto, pasó en dos días, y no volvió a pasar.',
					siFalla: 'Te dijo que hace lo que quiere con su vida. Y tiene razón, y es un problema.',
					premio: { confianza: 6, carisma: 1, moral: -2 },
					castigo: { confianza: -6, prensa: -5 }
				}
			]
		};
	},

	// --- El colega ------------------------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'el-colega',
			titulo: 'El que te lo quiere sacar',
			contexto:
				`Un representante grande le está hablando a ${f.nombre} por atrás. No te lo dijo él: te ` +
				`lo contó un tercero, que es como se entera uno de estas cosas.`,
			juego: 'ruleta',
			opciones: [
				{
					id: 'preguntarle',
					etiqueta: 'Preguntarle de frente',
					detalle: 'Si es verdad, mejor saberlo ahora. Si no lo es, queda que desconfiás.',
					probabilidad: chance(56, a.negociacion, 0.5),
					siSale: 'Te lo contó todo. Quedaron mejor que antes de la charla.',
					siFalla: 'Le cayó pésimo que dudes de él. Quedó frío.',
					premio: { confianza: 8, prestigio: 1 },
					castigo: { confianza: -7 }
				},
				{
					id: 'mejorarle',
					etiqueta: 'Ofrecerle mejores condiciones',
					detalle: 'Bajar tu porcentaje antes de que lo tenga que pedir. Cuesta plata.',
					probabilidad: chance(70, a.contactos, 0.35),
					siSale: 'Lo tomó como lo que era: que preferís cobrar menos antes que perderlo.',
					siFalla: 'Lo tomó como que estabas asustado, y eso le confirmó que valía más.',
					premio: { confianza: 10, dineroUsd: -3_000 },
					castigo: { confianza: -3, dineroUsd: -3_000, prestigio: -2 }
				},
				{
					id: 'ignorar',
					etiqueta: 'No decir nada y trabajar',
					detalle: 'Que decida por lo que hacés, no por lo que decís.',
					probabilidad: chance(46, a.scouting, 0.5),
					siSale: 'Le conseguiste algo esa misma semana. El otro dejó de llamar.',
					siFalla: 'El otro siguió llamando y vos no hiciste nada. Se nota.',
					premio: { confianza: 6, contactos: 2 },
					castigo: { confianza: -8 }
				}
			]
		};
	},

	// --- El pase de otro ------------------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		const cambios = estado.cambiosMundo;
		const plantel = jugadoresActualesDe(e.otroClub, cambios).sort((x, y) => y.fama - x.fama);
		const quien = plantel[0]?.nombre ?? 'un jugador del plantel';
		return {
			id: 'el-favor',
			titulo: 'El favor',
			contexto:
				`Un colega te pide una mano con el pase de ${quien}, de ${club(e.otroClub).nombre}. Él ` +
				`pone el jugador, vos ponés el teléfono, y se reparte. No es tu representado, así que a ` +
				`${estado.futbolista.nombre} no le suma nada.`,
			juego: 'dado',
			opciones: [
				{
					id: 'meterse',
					etiqueta: 'Meterte y cobrar',
					detalle: 'Plata rápida por un pase que no es tuyo. El tiempo sale de algún lado.',
					probabilidad: chance(52, a.contactos, 0.55),
					siSale: 'Salió el pase y te tocó una parte. Nada mal para una semana de llamados.',
					siFalla: 'Se cayó a último momento y perdiste la semana en algo que no era tuyo.',
					premio: { dineroUsd: 25_000, contactos: 3, confianza: -2 },
					castigo: { confianza: -4, prestigio: -1 }
				},
				{
					id: 'presentar',
					etiqueta: 'Presentarlo y no cobrar',
					detalle: 'Los contactos se devuelven. No hoy.',
					probabilidad: chance(74, a.contactos, 0.3),
					siSale: 'Quedó debiéndote una. Esas se cobran cuando hacen falta.',
					siFalla: 'Usó tu teléfono y no se acordó más de vos.',
					premio: { contactos: 5, prestigio: 3 },
					castigo: { contactos: -1 }
				},
				{
					id: 'nogracias',
					etiqueta: 'Decir que no tenés tiempo',
					detalle: 'Tu tiempo entero para el tuyo. Se nota.',
					probabilidad: 100,
					siSale: 'Le dijiste que no. Esa semana la usaste en lo tuyo.',
					siFalla: '',
					premio: { confianza: 3 },
					castigo: {}
				}
			]
		};
	}
];

/**
 * Y los del mercado.
 *
 * El mercado era la única fase donde no pasaba nada más que elegir club: la
 * misma pantalla con tres ofertas, quince años seguidos. Estos momentos van
 * antes de esa charla y la condicionan, que es lo que los hace valer —no son
 * un adorno previo, son lo que después se negocia—.
 */
const EN_EL_MERCADO: Plantilla[] = [
	// --- La plata por abajo de la mesa --------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'por-abajo',
			titulo: 'Por abajo de la mesa',
			contexto:
				`Un intermediario de ${club(e.otroClub).nombre} te ofrece una parte para vos, aparte de ` +
				`tu comisión, si empujás a ${estado.futbolista.nombre} para ese lado. No lo dice así, ` +
				`pero lo dice.`,
			juego: 'dado',
			opciones: [
				{
					id: 'agarrar',
					etiqueta: 'Agarrarla y no decir nada',
					detalle: 'Plata que nadie va a poder rastrear. Salvo que alguien hable.',
					probabilidad: chance(56, a.contactos, 0.5),
					siSale: 'Cobraste y no se enteró nadie. Es plata que no existe en ningún papel.',
					siFalla: 'Alguien habló. No salió en ningún lado, pero en el ambiente se sabe.',
					premio: { dineroUsd: 60_000, confianza: -3 },
					castigo: { dineroUsd: 60_000, prestigio: -8, confianza: -10 }
				},
				{
					id: 'contarselo',
					etiqueta: 'Contárselo a él',
					detalle: 'Que sepa que te la ofrecieron y que la rechazaste. Es una carta fuerte.',
					probabilidad: chance(70, a.negociacion, 0.35),
					siSale: 'Se lo contaste. No lo dijo, pero desde ese día te mira distinto.',
					siFalla: 'Se lo contaste y lo único que escuchó fue que hay clubes moviéndose sin él.',
					premio: { confianza: 12, prestigio: 3, carisma: 2 },
					castigo: { confianza: -4 }
				},
				{
					id: 'nogracias',
					etiqueta: 'Decir que no y olvidarlo',
					detalle: 'Ni la plata ni el crédito. Solo dormir bien.',
					probabilidad: 100,
					siSale: 'Le dijiste que no y cortaste. No pasó nada, que es lo que querías.',
					siFalla: '',
					premio: { prestigio: 1 },
					castigo: {}
				}
			]
		};
	},

	// --- Apretar al club que vende ------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		const donde = club(estado.futbolista.contrato.clubId).nombre;
		return {
			id: 'apretar-al-club',
			titulo: 'La reunión en el club',
			contexto:
				`Te sentás con los dirigentes de ${donde} antes de que se mueva nada. Si hay pase, ` +
				`querés que tu parte esté escrita antes y no después, cuando ya no tenés con qué ` +
				`discutir.`,
			juego: 'ruleta',
			opciones: [
				{
					id: 'pedir-todo',
					etiqueta: 'Pedir un porcentaje del pase',
					detalle: 'Lo que más plata deja. También lo que más los incomoda.',
					probabilidad: chance(42, a.negociacion, 0.6),
					siSale: 'Te lo firmaron. Si sale el pase, cobrás como cobran los grandes.',
					siFalla: 'Se rieron y te dijeron que el jugador es del club. Quedó frío el ambiente.',
					premio: { dineroUsd: 40_000, prestigio: 5, contactos: 2 },
					castigo: { prestigio: -3, contactos: -2 }
				},
				{
					id: 'pedir-poco',
					etiqueta: 'Pedir poco y quedar bien',
					detalle: 'Menos plata, pero la puerta queda abierta para el próximo.',
					probabilidad: chance(74, a.contactos, 0.3),
					siSale: 'Cerraron rápido y te dijeron que vuelvas cuando tengas otro.',
					siFalla: 'Ni eso te dieron. Al menos no te cerraron la puerta.',
					premio: { dineroUsd: 12_000, contactos: 4 },
					castigo: { contactos: 1 }
				},
				{
					id: 'no-ir',
					etiqueta: 'No ir a la reunión',
					detalle: 'Que hablen con vos cuando haya algo concreto.',
					probabilidad: 100,
					siSale: 'No fuiste. El club siguió con lo suyo y vos con lo tuyo.',
					siFalla: '',
					premio: {},
					castigo: {}
				}
			]
		};
	},

	// --- El periodista -------------------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'el-periodista',
			titulo: 'La llamada del periodista',
			contexto:
				`Te llama un periodista: quiere saber si es verdad que ${f.nombre} se va. Todavía no ` +
				`hay nada firmado y lo que digas hoy va a estar mañana en todos lados.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'confirmar',
					etiqueta: 'Decirle que hay ofertas',
					detalle: 'Que se sepa. Los clubes leen el diario igual que vos.',
					probabilidad: chance(50, a.contactos, 0.55),
					siSale: 'Salió que hay clubes interesados y aparecieron dos más que no estaban.',
					siFalla: 'Salió como que lo estabas ofreciendo. En el club no les gustó nada.',
					premio: { prestigio: 4, prensa: 5, contactos: 3 },
					castigo: { prensa: -6, confianza: -4 }
				},
				{
					id: 'negar',
					etiqueta: 'Negar todo',
					detalle: 'Está feliz donde está. Aunque los dos sepan que no.',
					probabilidad: chance(62, a.negociacion, 0.4),
					siSale: 'Quedó como que no pasaba nada. El mercado siguió por debajo, tranquilo.',
					siFalla: 'A los dos días salió lo contrario y quedaste como el que miente.',
					premio: { prensa: 3, confianza: 2 },
					castigo: { prestigio: -4, prensa: -5 }
				},
				{
					id: 'no-atender',
					etiqueta: 'No atenderle',
					detalle: 'No decir nada nunca fue noticia.',
					probabilidad: 100,
					siSale: 'No atendiste. Publicaron lo que ya sabían, que era nada.',
					siFalla: '',
					premio: {},
					castigo: {}
				}
			]
		};
	}
];

/**
 * Los momentos de esta temporada. Determinista, como todo lo demás.
 *
 * "El pibe" no aparece siempre: fichar a alguien nuevo cada año convertiría la
 * agencia en una lista y le sacaría el peso a cada firma. Aparece cuando el
 * representante ya tiene con qué —algo de scouting— y aun así no todos los
 * años.
 */
export function momentosDelRepresentante(
	estado: Estado,
	semilla: string
): MomentoDelRepresentante[] {
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: estado.fase,
		clave: 'momentos-representante'
	});

	const deEstaFase = estado.fase === 3 ? EN_EL_MERCADO : EN_LA_TEMPORADA;
	const cuantos = estado.fase === 3 ? MOMENTOS_EN_EL_MERCADO : MOMENTOS_POR_TEMPORADA;

	const posibles = deEstaFase.filter((plantilla) => {
		const id = plantilla(estado, escenario(estado, 0, semilla)).id;
		if (id !== 'el-pibe') return true;
		return estado.representante.atributos.scouting >= 35 && rng.ocurre(0.45);
	});

	const elegidas: Plantilla[] = [];
	const restantes = [...posibles];
	while (elegidas.length < Math.min(cuantos, restantes.length)) {
		const cual = rng.elegir(restantes);
		elegidas.push(cual);
		restantes.splice(restantes.indexOf(cual), 1);
	}

	return elegidas.map((plantilla, i) => plantilla(estado, escenario(estado, i, semilla)));
}

/**
 * Tira los dados de un momento ya elegido.
 *
 * El carisma entra solamente acá, cuando ya salió mal: es la reunión que se
 * salva porque el tipo cae bien, no la reunión que sale bien porque eligió
 * la respuesta correcta. Por eso no toca la probabilidad que se muestra —esa
 * sigue siendo la de verdad— y por eso el texto lo dice cuando pasa.
 */
export function resolverMomento(
	momento: MomentoDelRepresentante,
	opcionId: string | undefined,
	estado: Estado,
	semilla: string,
	indice: number
): ResultadoDelMomento {
	const opcion =
		momento.opciones.find((o) => o.id === opcionId) ??
		momento.opciones[momento.opciones.length - 1];

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: estado.fase,
		clave: `momento-${momento.id}`,
		indice
	});

	let salio = opcion.probabilidad >= 100 || rng.ocurre(opcion.probabilidad / 100);
	let texto = salio ? opcion.siSale : opcion.siFalla;

	if (!salio && opcion.probabilidad < 100) {
		const salvado = rng.ocurre(cuantoSalvaElCarisma(estado) / 100);
		if (salvado) {
			salio = true;
			texto = `${opcion.siFalla} Pero les caíste bien, y eso a veces alcanza. ${opcion.siSale}`;
		}
	}

	return {
		momentoId: momento.id,
		opcionId: opcion.id,
		salio,
		texto,
		efecto: salio ? opcion.premio : opcion.castigo
	};
}

/** Aplica lo que dejó un momento. Muta el estado, que ya viene clonado. */
export function aplicarMomento(estado: Estado, efecto: EfectoDelRepresentante): void {
	const r = estado.representante;
	const acotar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

	if (efecto.dineroUsd) r.dineroUsd = Math.max(0, r.dineroUsd + efecto.dineroUsd);
	if (efecto.prestigio) r.prestigio = acotar(r.prestigio + efecto.prestigio);
	if (efecto.negociacion)
		r.atributos.negociacion = acotar(r.atributos.negociacion + efecto.negociacion);
	if (efecto.scouting) r.atributos.scouting = acotar(r.atributos.scouting + efecto.scouting);
	if (efecto.contactos) r.atributos.contactos = acotar(r.atributos.contactos + efecto.contactos);
	if (efecto.carisma) r.atributos.carisma = acotar(carismaDe(estado) + efecto.carisma);
	if (efecto.representadosExtra) r.representadosExtra += efecto.representadosExtra;
	if (efecto.confianza) estado.confianza = acotar(estado.confianza + efecto.confianza);
	if (efecto.prensa) estado.futbolista.prensa = acotar(estado.futbolista.prensa + efecto.prensa);
	if (efecto.moral) estado.futbolista.moral = acotar(estado.futbolista.moral + efecto.moral);
}
