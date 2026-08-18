import { club, contexto, clubesDe } from '../../../content/mundo';
import { jugadoresActualesDe } from './mercado';
import { rngPara } from './rng';
import { tocaRenovar } from './renovacion';
import { brechaCon } from './temporada';
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

/**
 * De qué palo es un momento del representante.
 *
 * Alan lo pidió después de jugar: "agregar más eventos de representante (está
 * bien que sean 2 pero agregar de sociales, familiares, turbios, etc.)". La
 * familia no es una etiqueta decorativa: es lo que hace que en el mismo año no
 * caigan dos momentos del mismo palo, y que de un año al otro no se repita.
 */
export type FamiliaDelRepre =
	'cartera' | 'club' | 'colega' | 'prensa' | 'familiar' | 'social' | 'turbio' | 'plata';

/**
 * El orden en que rotan, fijo y escrito a mano.
 *
 * A mano y no sacado de la lista de momentos: la primera versión lo derivaba
 * del orden de aparición en `EN_LA_TEMPORADA`, y como "el pibe" no aparece
 * todos los años, los años en que quedaba afuera la familia `cartera` se corría
 * del primer lugar al último y toda la rotación se desfasaba. Se veía como dos
 * años seguidos con el mismo palo, que es exactamente lo que la rotación venía
 * a evitar. Acá el orden no depende de qué momento puede pasar hoy.
 */
export const FAMILIAS_DEL_REPRE: FamiliaDelRepre[] = [
	'cartera',
	'club',
	'turbio',
	'colega',
	'plata',
	'familiar',
	'social',
	'prensa'
];

export type MomentoDelRepresentante = {
	id: string;
	titulo: string;
	contexto: string;
	juego: Minijuego;
	/** De qué palo es. Los del mercado y la renovación no la declaran. */
	familia?: FamiliaDelRepre;
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
			familia: 'cartera',
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
			familia: 'club',
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
			familia: 'turbio',
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
			familia: 'colega',
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
		// Con nombre si el club tiene alguien conocido; si no, sin él. Decir "el
		// pase de un jugador del plantel, de Defensor Sporting" es decir dos veces
		// lo mismo y suena a plantilla sin llenar.
		const quien = plantel[0]
			? `${plantel[0].nombre}, de ${club(e.otroClub).nombre}`
			: `un jugador de ${club(e.otroClub).nombre}`;
		return {
			id: 'el-favor',
			familia: 'plata',
			titulo: 'El favor',
			contexto:
				`Un colega te pide una mano con el pase de ${quien}. Él ` +
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
	},
	// --- La familia ----------------------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'la-madre',
			familia: 'familiar',
			titulo: 'La madre',
			contexto:
				`Te llama la madre de ${f.nombre} un domingo a la mañana. No te llama por plata ni por ` +
				`contratos: te llama porque hace tres semanas que el hijo no le atiende el teléfono y ` +
				`vos sos el único que lo ve todos los días.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'ir-a-verlo',
					etiqueta: 'Ir a verlo esa misma tarde',
					detalle: 'Cancelar lo que tengas. No es trabajo y es lo más parecido a serlo.',
					probabilidad: chance(62, a.carisma ?? CARISMA_POR_DEFECTO, 0.5),
					siSale: 'Fuiste, comieron juntos, y a la noche llamó a la madre. Eso no se paga.',
					siFalla: 'Fuiste y no te quiso hablar. Igual se enteró de que fuiste.',
					premio: { confianza: 12, carisma: 2, moral: 8 },
					castigo: { confianza: 2, moral: -2 }
				},
				{
					id: 'llamarlo',
					etiqueta: 'Llamarlo y no decirle quién te avisó',
					detalle: 'Más rápido y menos comprometido. Si se da cuenta, es peor.',
					probabilidad: chance(52, a.negociacion, 0.45),
					siSale: 'Charlaron media hora por teléfono y esa misma noche la llamó a la madre.',
					siFalla: 'Se dio cuenta de que la madre te había llamado y le cayó pésimo.',
					premio: { confianza: 6, moral: 4 },
					castigo: { confianza: -7, moral: -3 }
				},
				{
					id: 'no-meterse',
					etiqueta: 'Decirle que no es tu tema',
					detalle: 'Y es verdad. Y las dos partes lo saben.',
					probabilidad: 100,
					siSale: 'Le dijiste que hablara con él directamente. Cortó antes de despedirse.',
					siFalla: '',
					premio: {},
					castigo: { carisma: -1, moral: -2 }
				}
			]
		};
	},

	(estado) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-cumpleanios',
			familia: 'familiar',
			titulo: 'El cumpleaños',
			contexto:
				`Tu hija cumple ocho el sábado y la fiesta es a las cuatro. A las cuatro y media aterriza ` +
				`el director deportivo que venís persiguiendo hace seis meses y se vuelve el domingo a ` +
				`la mañana. No hay forma de estar en los dos lados.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'la-fiesta',
					etiqueta: 'Ir a la fiesta',
					detalle: 'La reunión se puede volver a pedir. Los ocho años no.',
					probabilidad: chance(58, a.contactos, 0.5),
					siSale: 'Fuiste a la fiesta y el tipo te recibió el mes siguiente igual. Zafaste.',
					siFalla: 'Fuiste a la fiesta y el tipo firmó con otro. Así es esto.',
					premio: { moral: 8, carisma: 2 },
					castigo: { contactos: -3, prestigio: -2, moral: 6 }
				},
				{
					id: 'la-reunion',
					etiqueta: 'Ir a la reunión',
					detalle: 'Es el contacto del año. Y son los ocho años de tu hija una sola vez.',
					probabilidad: chance(64, a.negociacion, 0.45),
					siSale:
						'Salió la reunión, salió el contacto, y el lunes le compraste el regalo más caro.',
					siFalla: 'Ni siquiera salió la reunión: se le complicó el vuelo y no te vio.',
					premio: { contactos: 6, prestigio: 4, moral: -4 },
					castigo: { moral: -8, carisma: -1 }
				},
				{
					id: 'partir',
					etiqueta: 'Ir un rato a cada lado',
					detalle: 'Lo que hace todo el mundo. Y sale mal en los dos lados a la vez.',
					probabilidad: chance(34, a.carisma ?? CARISMA_POR_DEFECTO, 0.5),
					siSale: 'Llegaste a la torta y llegaste a la cena. No entendés cómo, pero salió.',
					siFalla: 'Te perdiste la torta y llegaste tarde a la cena. Dos por uno.',
					premio: { contactos: 4, prestigio: 2, moral: 4 },
					castigo: { contactos: -2, moral: -6 }
				}
			]
		};
	},

	// --- Lo social -----------------------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-asado-de-dirigentes',
			familia: 'social',
			titulo: 'El asado',
			contexto:
				`Hay un asado en una quinta a la salida de la ciudad. No es una reunión: es un asado, con ` +
				`gente de ${club(e.otroClub).nombre} y de otros tres clubes, y de esos asados salen la ` +
				`mitad de los pases del país. Te invitaron por primera vez.`,
			juego: 'dado',
			opciones: [
				{
					id: 'hablar-con-todos',
					etiqueta: 'Recorrer la quinta entera',
					detalle: 'Saludar a todos, quedarte con nadie. Es lo que hacen los que ya están.',
					probabilidad: chance(56, a.contactos, 0.5),
					siSale: 'Saliste con cuatro teléfonos nuevos y ninguna deuda con nadie.',
					siFalla: 'Te desparramaste y no quedaste con nadie. Te fuiste igual que como llegaste.',
					premio: { contactos: 6, prestigio: 3, carisma: 1 },
					castigo: { prestigio: -1 }
				},
				{
					id: 'quedarse-con-uno',
					etiqueta: 'Quedarte toda la noche con el que más pesa',
					detalle: 'Una sola apuesta. Si pega, pega fuerte.',
					probabilidad: chance(40, a.negociacion, 0.6),
					siSale:
						'Terminaron a las cuatro de la mañana y quedaste adentro de su rueda para siempre.',
					siFalla: 'Se dio cuenta de que lo estabas trabajando y se corrió a los veinte minutos.',
					premio: { contactos: 9, prestigio: 7, negociacion: 2 },
					castigo: { contactos: -2, prestigio: -3, carisma: -1 }
				},
				{
					id: 'comer-y-escuchar',
					etiqueta: 'Comer, escuchar y no pedir nada',
					detalle: 'La primera vez, mirar. No siempre alcanza, nunca sale mal.',
					probabilidad: 100,
					siSale: 'Comiste, escuchaste, y te enteraste de tres cosas que todavía no sabía nadie.',
					siFalla: '',
					premio: { contactos: 2, scouting: 2 },
					castigo: {}
				}
			]
		};
	},

	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-vecino',
			familia: 'social',
			titulo: 'El video del vecino',
			contexto:
				`Un vecino te para en la puerta de tu casa con el teléfono en la mano. Tiene un video del ` +
				`sobrino, quince años, jugando en una canchita de ${club(e.clubDelPibe).nombre}. Te lo ` +
				`quiere mostrar ahora, parados en la vereda.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'mirarlo',
					etiqueta: 'Mirarlo ahí mismo',
					detalle: 'Dos minutos parado en la vereda. La mayoría de las veces no es nada.',
					probabilidad: chance(38, a.scouting, 0.6),
					siSale: 'El pibe era bueno de verdad. Fuiste a verlo el sábado y no te lo sacó nadie.',
					siFalla: 'No era nada. Perdiste veinte minutos y quedaste bien con el vecino.',
					premio: { scouting: 3, contactos: 2, prestigio: 2 },
					castigo: { carisma: 1 }
				},
				{
					id: 'pedirle-que-lo-mande',
					etiqueta: 'Pedirle que te lo mande',
					detalle: 'Lo mirás en frío, con tiempo. Y a veces no lo mirás nunca.',
					probabilidad: chance(56, a.scouting, 0.4),
					siSale:
						'Te lo mandó, lo miraste el domingo con calma, y valía la pena mirarlo dos veces.',
					siFalla:
						'Te lo mandó y quedó sin abrir tres semanas. Cuando lo abriste ya tenía representante.',
					premio: { scouting: 2, contactos: 1 },
					castigo: { scouting: -1, carisma: -1 }
				},
				{
					id: 'sacarselo-de-encima',
					etiqueta: 'Decirle que no trabajás con juveniles',
					detalle: 'Es mentira y él lo sabe. Se termina rápido.',
					probabilidad: 100,
					siSale: 'Le dijiste que no y entraste a tu casa. No te saludó más.',
					siFalla: '',
					premio: {},
					castigo: { carisma: -2, prestigio: -1 }
				}
			]
		};
	},

	// --- La prensa -----------------------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		return {
			id: 'la-columna',
			familia: 'prensa',
			titulo: 'La columna en la radio',
			contexto:
				`Te ofrecen una columna fija los martes en el programa de la mañana. Media hora por ` +
				`semana hablando de mercado. No pagan casi nada y te escucha todo el ambiente.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'aceptar',
					etiqueta: 'Aceptar y contar cosas',
					detalle: 'Si contás de verdad te escuchan. Y si contás de verdad, te cierran puertas.',
					probabilidad: chance(48, a.contactos, 0.5),
					siSale:
						'Contaste dos primicias, quedaste como el que sabe, y te empezaron a llamar a vos.',
					siFalla:
						'Contaste una que no debías y el club de tu representado se enteró por la radio.',
					premio: { prestigio: 8, contactos: 4, prensa: 5 },
					castigo: { prestigio: -3, contactos: -4, confianza: -6, prensa: -5 }
				},
				{
					id: 'aceptar-prudente',
					etiqueta: 'Aceptar y no contar nada',
					detalle: 'Estar sin quemarse. Menos ruido, menos riesgo.',
					probabilidad: chance(72, a.carisma ?? CARISMA_POR_DEFECTO, 0.3),
					siSale: 'Media hora por semana de estar ahí. Te empezaron a conocer sin costarte nada.',
					siFalla: 'Te aburrieron los oyentes y a las seis semanas te sacaron del aire.',
					premio: { prestigio: 4, carisma: 2, prensa: 3 },
					castigo: { prestigio: -1 }
				},
				{
					id: 'no',
					etiqueta: 'Decir que no',
					detalle: 'Tu trabajo es el teléfono, no el micrófono.',
					probabilidad: 100,
					siSale: 'Dijiste que no. Se lo ofrecieron a un colega, que lo aprovechó.',
					siFalla: '',
					premio: {},
					castigo: { prestigio: -1 }
				}
			]
		};
	},

	(estado) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'el-buitre',
			familia: 'prensa',
			titulo: 'Al aire te trataron de buitre',
			contexto:
				`Un periodista dijo al aire, con tu nombre y apellido, que sos de los que le chupan la ` +
				`sangre a los pibes y que a ${f.nombre} lo estás usando. Lo levantaron tres portales en ` +
				`dos horas.`,
			juego: 'dado',
			opciones: [
				{
					id: 'ir-al-programa',
					etiqueta: 'Pedir ir al programa a contestarle',
					detalle: 'De frente y en su cancha. Si sabés hablar, se da vuelta.',
					probabilidad: chance(46, a.carisma ?? CARISMA_POR_DEFECTO, 0.6),
					siSale: 'Fuiste, contestaste sin levantar la voz, y salió de ahí siendo vos el serio.',
					siFalla: 'Te comió en vivo. La repitieron toda la semana.',
					premio: { prestigio: 8, carisma: 3, prensa: 6 },
					castigo: { prestigio: -6, carisma: -2, prensa: -6 }
				},
				{
					id: 'carta-documento',
					etiqueta: 'Mandarle carta documento',
					detalle: 'Lo frena. Y te convierte en el que manda cartas documento.',
					probabilidad: chance(64, a.negociacion, 0.35),
					siSale: 'Se retractó al aire dos días después. Nadie más volvió a nombrarte así.',
					siFalla: 'La leyó al aire y fue peor. Ahora sos el que quiere callar periodistas.',
					premio: { prestigio: 5, prensa: 2 },
					castigo: { prensa: -9, prestigio: -4 }
				},
				{
					id: 'no-contestar',
					etiqueta: 'No contestar nada',
					detalle: 'A los cuatro días se olvidan. Casi siempre.',
					probabilidad: chance(60, estado.representante.prestigio, 0.3),
					siSale: 'No dijiste nada y se murió solo, como se mueren casi todos.',
					siFalla: 'El silencio se leyó como que era cierto. Un club te dejó de atender.',
					premio: {},
					castigo: { prestigio: -3, contactos: -2 }
				}
			]
		};
	},

	// --- La cartera ----------------------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'dos-para-el-mismo-lugar',
			familia: 'cartera',
			titulo: 'Los dos para el mismo lugar',
			contexto:
				`${club(e.otroClub).nombre} busca un jugador del puesto de ${f.nombre} y vos tenés dos ` +
				`que sirven: él y otro de tu cartera. Te van a preguntar por uno solo, y el que ` +
				`recomiendes es el que va.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'el-tuyo-grande',
					etiqueta: `Empujar a ${f.nombre}`,
					detalle: 'Es el que más te deja. El otro se va a enterar.',
					probabilidad: chance(60, a.negociacion, 0.5),
					siSale: 'Lo tomaron a él y el otro nunca supo que había estado en la lista.',
					siFalla: 'No lo tomaron, y el otro se enteró de que ni lo habías nombrado.',
					premio: { dineroUsd: 18_000, prestigio: 3, confianza: 4 },
					castigo: { prestigio: -3, carisma: -2 }
				},
				{
					id: 'el-que-lo-necesita',
					etiqueta: 'Empujar al que lo necesita',
					detalle: 'El que hace un año que no juega. Deja menos plata y deja otra cosa.',
					probabilidad: chance(52, a.contactos, 0.5),
					siSale: 'Lo tomaron y volvió a jugar. En el ambiente se supo quién lo puso ahí.',
					siFalla: 'No lo tomaron y perdiste el lugar para los dos.',
					premio: { prestigio: 7, carisma: 3, contactos: 3 },
					castigo: { prestigio: -2, dineroUsd: -2_000 }
				},
				{
					id: 'los-dos',
					etiqueta: 'Presentarlos a los dos y que elijan',
					detalle: 'Honesto. Y en una mesa donde piden uno, se lee como que no sabés cuál.',
					probabilidad: chance(42, a.negociacion, 0.5),
					siSale: 'Los presentaste a los dos, eligieron uno, y nadie quedó mal con nadie.',
					siFalla: 'Dudaron y terminaron trayendo a uno de otro representante.',
					premio: { prestigio: 4, carisma: 4, confianza: 3 },
					castigo: { prestigio: -4, contactos: -2 }
				}
			]
		};
	},

	(estado) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-que-se-va',
			familia: 'cartera',
			titulo: 'El que se quiere ir',
			contexto:
				`Uno de tus representados —no el principal, uno de los otros— te avisa que se va con una ` +
				`agencia grande. No pide permiso: te avisa. Le queda un mes de contrato con vos.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'dejarlo-ir',
					etiqueta: 'Dejarlo ir bien',
					detalle: 'Firmarle la salida y desearle suerte. Se cuenta.',
					probabilidad: chance(78, a.carisma ?? CARISMA_POR_DEFECTO, 0.3),
					siSale: 'Se fue agradecido y a los dos años te trajo a dos pibes de su club.',
					siFalla: 'Se fue y no te volvió a atender. Pasa.',
					premio: { prestigio: 5, carisma: 3, contactos: 3, representadosExtra: -1 },
					castigo: { representadosExtra: -1, prestigio: -1 }
				},
				{
					id: 'hacer-valer',
					etiqueta: 'Hacer valer el mes que queda',
					detalle: 'Está en el contrato. Y en el ambiente se comenta.',
					probabilidad: chance(58, a.negociacion, 0.5),
					siSale: 'Cobraste la comisión del pase que ya estaba armado. Era tuya y la cobraste.',
					siFalla: 'Lo estiraste un mes, cobraste nada, y quedaste como el que aprieta.',
					premio: { dineroUsd: 22_000, negociacion: 2, representadosExtra: -1 },
					castigo: { prestigio: -5, carisma: -3, representadosExtra: -1 }
				},
				{
					id: 'retenerlo',
					etiqueta: 'Sentarte a convencerlo',
					detalle: 'Una charla. A veces alcanza y a veces confirma que se tiene que ir.',
					probabilidad: chance(36, a.carisma ?? CARISMA_POR_DEFECTO, 0.7),
					siSale: 'Se quedó. Y se quedó convencido, que no es lo mismo que quedarse.',
					siFalla: 'Se fue igual, y encima ahora sabe cuánto lo necesitabas.',
					premio: { prestigio: 4, carisma: 2, confianza: 3 },
					castigo: { representadosExtra: -1, prestigio: -2, carisma: -1 }
				}
			]
		};
	},

	// --- Lo turbio -----------------------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'la-comision-de-vuelta',
			familia: 'turbio',
			titulo: 'La comisión de vuelta',
			contexto:
				`El pase con ${club(e.otroClub).nombre} está cerrado y firmado. En la última reunión, el ` +
				`dirigente que lo firmó te dice, sin que quede nada escrito, que la mitad de tu comisión ` +
				`vuelve a un sobre. Si no, se cae.`,
			juego: 'dado',
			opciones: [
				{
					id: 'pagar',
					etiqueta: 'Pagar y cerrar',
					detalle: 'El pase sale, cobrás la mitad, y ese tipo te tiene agarrado para siempre.',
					probabilidad: chance(66, a.contactos, 0.35),
					siSale: 'Salió el pase. Cobraste la mitad y nadie se enteró de nada.',
					siFalla: 'Salió el pase, pagaste, y a los seis meses lo agarraron a él con todo escrito.',
					premio: { dineroUsd: 30_000, contactos: 2, prestigio: -1 },
					castigo: { dineroUsd: 30_000, prestigio: -12, prensa: -8, contactos: -4 }
				},
				{
					id: 'negarse',
					etiqueta: 'Decirle que no',
					detalle: 'Puede caerse el pase entero. Y él sabe que vos sabés.',
					probabilidad: chance(44, a.negociacion, 0.6),
					siSale: 'Le dijiste que no, se dio cuenta de que no ibas a ceder, y firmó igual.',
					siFalla: 'Se cayó el pase. Se lo dieron a otro y perdiste el año.',
					premio: { dineroUsd: 60_000, prestigio: 8, negociacion: 3 },
					castigo: { prestigio: 2, contactos: -5, confianza: -6 }
				},
				{
					id: 'grabarlo',
					etiqueta: 'Grabarlo',
					detalle: 'Para tenerlo. Si se sabe que grabás, no te sentás con nadie más.',
					probabilidad: chance(34, a.contactos, 0.4),
					siSale: 'Lo grabaste, se lo hiciste escuchar, y firmó sin pedir nada.',
					siFalla: 'Se dio cuenta. En quince días no te atendía nadie del ambiente.',
					premio: { dineroUsd: 60_000, prestigio: 5 },
					castigo: { contactos: -12, prestigio: -8, prensa: -4 }
				}
			]
		};
	},

	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-pase-inflado',
			familia: 'turbio',
			titulo: 'La triangulación',
			contexto:
				`Un colega te propone armar un pase con escala: el jugador pasa dos meses por un club ` +
				`chico del exterior y de ahí a ${club(e.otroClub).nombre} al triple de precio. Es legal ` +
				`en el papel y todo el mundo sabe lo que es.`,
			juego: 'dado',
			opciones: [
				{
					id: 'armarlo',
					etiqueta: 'Armarlo',
					detalle: 'Mucha plata. Y tu nombre en un expediente si alguien lo mira de cerca.',
					probabilidad: chance(56, a.negociacion, 0.5),
					siSale: 'Salió, cobraste como nunca, y en los papeles está todo impecable.',
					siFalla: 'Lo miraron de cerca. Salió tu nombre en una nota de dos páginas.',
					premio: { dineroUsd: 120_000, contactos: 3, prestigio: 2 },
					castigo: { dineroUsd: 20_000, prestigio: -14, prensa: -10, confianza: -5 }
				},
				{
					id: 'sin-la-escala',
					etiqueta: 'Proponerlo derecho',
					detalle: 'Mismo pase, sin la escala. Menos plata y ningún expediente.',
					probabilidad: chance(50, a.negociacion, 0.55),
					siSale: 'Lo compraron derecho. Menos plata, cero riesgo, y el club te quedó agradecido.',
					siFalla: 'Sin la escala no les cerraba el número y se cayó.',
					premio: { dineroUsd: 45_000, prestigio: 6, contactos: 3 },
					castigo: { prestigio: 1 }
				},
				{
					id: 'no-entrar',
					etiqueta: 'No entrar',
					detalle: 'Lo van a hacer igual, con otro.',
					probabilidad: 100,
					siSale:
						'Dijiste que no. Lo hicieron igual, con otro, y salió bien para todos menos para vos.',
					siFalla: '',
					premio: { prestigio: 2 },
					castigo: {}
				}
			]
		};
	},

	// --- El club -------------------------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'el-tecnico-nuevo',
			familia: 'club',
			titulo: 'El técnico nuevo',
			contexto:
				`Cambió el técnico de ${club(f.contrato.clubId).nombre} y el que llegó ya dijo puertas ` +
				`adentro que a ${f.nombre} no lo ve. Todavía no jugó un partido con él y ya está afuera ` +
				`de la lista.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'ir-a-verlo',
					etiqueta: 'Ir a verlo al técnico',
					detalle: 'Cara a cara, antes de que se endurezca. A algunos les gusta que vayas.',
					probabilidad: chance(48, a.carisma ?? CARISMA_POR_DEFECTO, 0.55),
					siSale: 'Te recibió, lo escuchó, y a la fecha siguiente estaba entre los once.',
					siFalla: 'Te recibió por compromiso y quedó peor: ahora sos el representante pesado.',
					premio: { confianza: 9, contactos: 3, prestigio: 3 },
					castigo: { confianza: -5, contactos: -2 }
				},
				{
					id: 'por-arriba',
					etiqueta: 'Ir por arriba, a los dirigentes',
					detalle: 'Los técnicos duran seis meses. Los dirigentes, años.',
					probabilidad: chance(44, a.contactos, 0.6),
					siSale: 'Bajó la orden de arriba y el técnico lo tuvo que poner. Funcionó.',
					siFalla: 'El técnico se enteró de que fuiste por arriba y no lo puso más nunca.',
					premio: { contactos: 4, prestigio: 4, confianza: 6 },
					castigo: { confianza: -9, prestigio: -4 }
				},
				{
					id: 'esperar',
					etiqueta: 'Esperar a que se caiga solo',
					detalle: 'Los técnicos se caen. La pregunta es si tu jugador aguanta hasta entonces.',
					probabilidad: chance(52, a.scouting, 0.35),
					siSale: 'Duró cuatro meses. Con el que vino después, tu jugador volvió a jugar.',
					siFalla: 'Duró dos años. Y tu jugador perdió dos años.',
					premio: { confianza: 4, prestigio: 2 },
					castigo: { confianza: -8, moral: -6 }
				}
			]
		};
	},

	(estado, e) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'la-revision-medica',
			familia: 'club',
			titulo: 'La revisión',
			contexto:
				`${club(e.otroClub).nombre} quiere revisar a ${f.nombre} con su propio médico antes de ` +
				`avanzar. Vos sabés que hay una rodilla con historia que no aparece en ningún informe.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'decirlo',
					etiqueta: 'Contarlo antes de que lo encuentren',
					detalle: 'Baja el precio y no te vuelve nunca.',
					probabilidad: chance(70, a.negociacion, 0.4),
					siSale:
						'Lo contaste, ajustaron el número, y firmaron igual. Quedaste como alguien serio.',
					siFalla: 'Lo contaste y se asustaron. Se cayó la operación.',
					premio: { prestigio: 8, contactos: 4, dineroUsd: 15_000 },
					castigo: { prestigio: 3, dineroUsd: -3_000 }
				},
				{
					id: 'callarlo',
					etiqueta: 'No decir nada',
					detalle: 'Si no lo encuentran, cobrás todo. Si lo encuentran, no cobrás nunca más ahí.',
					probabilidad: chance(44, a.contactos, 0.5),
					siSale: 'No lo encontraron. Firmaron por el número entero.',
					siFalla:
						'Lo encontraron en la primera resonancia. Se cayó todo y con ellos no hablás más.',
					premio: { dineroUsd: 40_000 },
					castigo: { prestigio: -10, contactos: -8, confianza: -5 }
				},
				{
					id: 'medico-propio',
					etiqueta: 'Pagar un estudio propio antes',
					detalle: 'Saber exactamente qué hay antes de que lo sepa el otro. Cuesta.',
					probabilidad: chance(74, a.scouting, 0.35),
					siSale: 'El estudio dijo que estaba mejor de lo que creías y lo usaste para negociar.',
					siFalla: 'El estudio confirmó lo peor. Al menos lo supiste vos primero.',
					premio: { dineroUsd: 20_000, negociacion: 2, prestigio: 3 },
					castigo: { dineroUsd: -4_000, scouting: 2 }
				}
			]
		};
	},

	// --- La plata ------------------------------------------------------------
	(estado) => {
		const a = estado.representante.atributos;
		return {
			id: 'la-oficina',
			familia: 'plata',
			titulo: 'La oficina',
			contexto:
				`Venís trabajando del teléfono y de la mesa de tu casa. Te ofrecen un local chico con ` +
				`cartel en la calle. Cuesta plata todos los meses y cambia cómo te miran cuando decís ` +
				`dónde te pueden ir a ver.`,
			juego: 'dado',
			opciones: [
				{
					id: 'alquilarla',
					etiqueta: 'Alquilarla',
					detalle: 'Gasto fijo. Y una dirección que no es tu casa.',
					probabilidad: chance(64, a.contactos, 0.4),
					siSale: 'Con oficina te empezaron a tomar en serio. Vinieron dos familias en un mes.',
					siFalla: 'Pagaste seis meses de alquiler y no entró nadie que no hubiera entrado igual.',
					premio: { dineroUsd: -18_000, prestigio: 9, contactos: 4 },
					castigo: { dineroUsd: -18_000, prestigio: 1 }
				},
				{
					id: 'tomar-a-alguien',
					etiqueta: 'Tomar a alguien en vez de la oficina',
					detalle: 'Una persona que atienda el teléfono vale más que un cartel.',
					probabilidad: chance(60, a.negociacion, 0.4),
					siSale: 'Con alguien atendiendo, dejaste de perder llamados. Se notó enseguida.',
					siFalla: 'No enganchó con el trabajo y a los tres meses estabas atendiendo vos igual.',
					premio: { dineroUsd: -14_000, contactos: 7, scouting: 3 },
					castigo: { dineroUsd: -14_000, contactos: -1 }
				},
				{
					id: 'seguir-igual',
					etiqueta: 'Seguir como estás',
					detalle: 'Cero gasto. Cero cambio.',
					probabilidad: 100,
					siSale: 'Seguiste con el teléfono y la mesa de tu casa. Funciona.',
					siFalla: '',
					premio: {},
					castigo: {}
				}
			]
		};
	},

	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-sponsor',
			familia: 'plata',
			titulo: 'La marca de botines',
			contexto:
				`Una marca de botines que recién entra al país quiere armar un plantel de jugadores ` +
				`jóvenes y te busca a vos para que le lleves tres. Pagan poco por cabeza y pagan todos ` +
				`los meses.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'llevar-tres',
					etiqueta: 'Llevarles tres',
					detalle: 'Plata fija para tus jugadores y para vos. Y los atás a una marca chica.',
					probabilidad: chance(66, a.negociacion, 0.45),
					siSale:
						'Firmaron los tres. La marca creció, y el contrato que parecía poco terminó siendo bueno.',
					siFalla: 'La marca duró un año en el país y los dejó colgados a mitad de contrato.',
					premio: { dineroUsd: 26_000, contactos: 3, confianza: 3 },
					castigo: { dineroUsd: 6_000, confianza: -5, prestigio: -3 }
				},
				{
					id: 'pedir-mas',
					etiqueta: 'Pedirles el triple',
					detalle: 'Si están entrando al país, tienen presupuesto. O no tienen nada.',
					probabilidad: chance(38, a.negociacion, 0.65),
					siSale: 'Pagaron el triple sin pestañear. Tenían mucho más de lo que decían.',
					siFalla: 'Se fueron a buscar a otro representante esa misma tarde.',
					premio: { dineroUsd: 70_000, negociacion: 3, prestigio: 4 },
					castigo: { contactos: -2 }
				},
				{
					id: 'no-atarlos',
					etiqueta: 'No atar a nadie todavía',
					detalle: 'Los pibes quedan libres para cuando llame una marca grande.',
					probabilidad: 100,
					siSale: 'Les dijiste que no. Tus jugadores quedaron libres, que es lo que valía.',
					siFalla: '',
					premio: { confianza: 2 },
					castigo: {}
				}
			]
		};
	},

	// --- Los colegas ---------------------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		return {
			id: 'el-colega-fundido',
			familia: 'colega',
			titulo: 'El que se funde',
			contexto:
				`Un representante viejo del ambiente está liquidando: se va, y tiene cuatro jugadores de ` +
				`${club(e.clubDelPibe).nombre} sin colocar. Te ofrece pasártelos a todos juntos por una ` +
				`cifra que puede pagar cualquiera.`,
			juego: 'dado',
			opciones: [
				{
					id: 'comprar-todo',
					etiqueta: 'Quedarte con los cuatro',
					detalle: 'Cuatro de golpe. Tres van a ser nada y uno puede ser algo.',
					probabilidad: chance(42, a.scouting, 0.6),
					siSale: 'De los cuatro, uno era bueno de verdad. Con ése solo ya pagaste todo.',
					siFalla: 'Los cuatro eran lo que parecían. Plata tirada y cuatro teléfonos que atender.',
					premio: { dineroUsd: -25_000, representadosExtra: 4, scouting: 3, prestigio: 3 },
					castigo: { dineroUsd: -25_000, representadosExtra: 4, prestigio: -2 }
				},
				{
					id: 'elegir-uno',
					etiqueta: 'Elegir uno y pagarlo aparte',
					detalle: 'Mirarlos bien y quedarte con el que sirve. Sale más caro por cabeza.',
					probabilidad: chance(58, a.scouting, 0.55),
					siSale: 'Elegiste bien. El que agarraste jugó en primera al año siguiente.',
					siFalla: 'Elegiste al que no era. El bueno se lo llevó otro por monedas.',
					premio: { dineroUsd: -12_000, representadosExtra: 1, scouting: 4, prestigio: 4 },
					castigo: { dineroUsd: -12_000, representadosExtra: 1, scouting: -1 }
				},
				{
					id: 'ayudarlo',
					etiqueta: 'Ayudarlo a colocarlos sin cobrar',
					detalle: 'No te deja plata. Deja otra cosa, y el ambiente es chico.',
					probabilidad: chance(64, a.contactos, 0.45),
					siSale: 'Colocaste a tres en una semana. El tipo lo contó en todos lados antes de irse.',
					siFalla: 'No colocaste a ninguno. Perdiste dos semanas y él se fue igual.',
					premio: { prestigio: 9, contactos: 5, carisma: 3 },
					castigo: { prestigio: 1 }
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
	},
	// --- El club que ofrece mucho y paga poco --------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'el-que-no-paga',
			familia: 'club',
			titulo: 'El que ofrece el doble',
			contexto:
				`${club(e.otroClub).nombre} ofrece el doble de lo que cobra ${f.nombre} hoy. También ` +
				`debe cuatro meses de sueldos a medio plantel, y eso lo sabe todo el ambiente menos el ` +
				`que va a firmar.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'blindarlo',
					etiqueta: 'Pedir garantías por escrito',
					detalle: 'Aval bancario o no se firma. Se puede caer el pase entero.',
					probabilidad: chance(46, a.negociacion, 0.6),
					siSale: 'Consiguiste el aval. Firmó por el doble y cobra el uno de cada mes.',
					siFalla: 'No pusieron ninguna garantía y se cayó la operación.',
					premio: { dineroUsd: 45_000, prestigio: 9, negociacion: 3, confianza: 6 },
					castigo: { prestigio: 2, confianza: -3 }
				},
				{
					id: 'firmar-igual',
					etiqueta: 'Firmar igual',
					detalle: 'El doble es el doble. Y el que no cobra te llama a vos.',
					probabilidad: chance(38, a.contactos, 0.45),
					siSale:
						'Pagaron todo en fecha. Zafaste y quedaste como el que consiguió el mejor contrato.',
					siFalla: 'A los tres meses no pagaban. Tu jugador te llama todos los días a vos.',
					premio: { dineroUsd: 60_000, prestigio: 5, confianza: 4 },
					castigo: { dineroUsd: 10_000, confianza: -14, prestigio: -6, moral: -8 }
				},
				{
					id: 'no-llevarlo',
					etiqueta: 'No llevárselo siquiera',
					detalle: 'Ni se lo contás. Es tu trabajo decidir qué le llevás.',
					probabilidad: chance(60, a.carisma ?? CARISMA_POR_DEFECTO, 0.4),
					siSale:
						'No se lo llevaste y nunca se enteró. Seis meses después ese club se fue al descenso.',
					siFalla: 'Se enteró por un tercero de que había una oferta y que vos no se la contaste.',
					premio: { prestigio: 3, confianza: 3 },
					castigo: { confianza: -12, carisma: -2 }
				}
			]
		};
	},

	// --- La cláusula ---------------------------------------------------------
	(estado, e) => {
		const a = estado.representante.atributos;
		const f = estado.futbolista;
		return {
			id: 'la-clausula',
			familia: 'club',
			titulo: 'La cláusula',
			contexto:
				`Está todo hablado con ${club(e.otroClub).nombre} menos una línea: la cláusula de salida. ` +
				`Ellos la quieren impagable para que ${f.nombre} no se les vaya nunca; vos la querés ` +
				`baja para poder moverlo dentro de dos años.`,
			juego: 'quiz',
			opciones: [
				{
					id: 'baja',
					etiqueta: 'Pelear una cláusula baja',
					detalle: 'Te deja las manos libres. Al club no le gusta nada.',
					probabilidad: chance(40, a.negociacion, 0.65),
					siSale: 'Quedó baja. En dos años lo movés cuando quieras y ellos lo saben.',
					siFalla:
						'No aflojaron, y encima quedaste como el que ya está pensando en el próximo pase.',
					premio: { negociacion: 3, prestigio: 6, contactos: 3 },
					castigo: { contactos: -3, prestigio: -2, confianza: -2 }
				},
				{
					id: 'alta-con-porcentaje',
					etiqueta: 'Cláusula alta, pero con porcentaje de futura venta',
					detalle: 'Le das lo que pide y te llevás un pedazo de lo que venga.',
					probabilidad: chance(52, a.contactos, 0.5),
					siSale: 'Firmaron con el porcentaje adentro. Si lo venden, cobrás dos veces.',
					siFalla: 'Cláusula alta y sin porcentaje. Perdiste las dos.',
					premio: { dineroUsd: 35_000, prestigio: 5, negociacion: 2 },
					castigo: { prestigio: -3, confianza: -3 }
				},
				{
					id: 'no-discutirla',
					etiqueta: 'No discutirla y cerrar',
					detalle: 'Se firma hoy. El problema es de dentro de dos años.',
					probabilidad: 100,
					siSale: 'Firmaron rápido y en buenos términos. La cláusula quedó como ellos querían.',
					siFalla: '',
					premio: { contactos: 3, confianza: 2 },
					castigo: {}
				}
			]
		};
	}
];

/**
 * La mesa que decide si se queda.
 *
 * Cuando el contrato se termina, el mercado deja de ser "a qué club te vas" y
 * pasa a ser "conseguí que te quieran en alguno". Bebo lo encontró jugando y
 * era peor de lo que parecía: elegía quedarse, el juego le contestaba "se quedó
 * en el club, los dos estuvieron de acuerdo", y dos líneas más abajo, en la
 * misma temporada, lo mandaba a otro club "por no haber arreglado nada".
 * Quedarse no significaba nada porque nadie estaba negociando la renovación:
 * el motor la resolvía solo, a espaldas de los dos.
 *
 * Acá la negocia el representante, que es de quien es el trabajo. Es el único
 * momento que no se sortea: cuando el contrato vence, es este y ningún otro.
 * "Y ahí el representante no tiene ningún rol de negociación, que sería genial
 * que haya un minijuego, y que las stats jueguen a favor" —eso, tal cual.
 */
export const RENOVACION = 'la-renovacion';

function laMesaFinal(estado: Estado): MomentoDelRepresentante {
	const a = estado.representante.atributos;
	const donde = club(estado.futbolista.contrato.clubId).nombre;
	const f = estado.futbolista;

	// Cómo lo ve el club es la mitad de la mesa: al que es figura lo renuevan
	// casi con lo que pida, y al que no juega hay que convencerlo de que lo
	// tengan. La otra mitad es cómo negocia el representante.
	const comoLoVen = Math.max(-14, Math.min(14, brechaCon(f, f.contrato.clubId)));

	return {
		id: RENOVACION,
		titulo: `La renovación con ${donde}`,
		contexto:
			`Se le termina el contrato a ${f.nombre} y en ${donde} todavía no dijeron nada. Si de acá ` +
			`no sale una firma, en junio hay que salir a buscar club, y el que sale a buscar en junio ` +
			`firma lo que le ofrezcan.`,
		juego: 'quiz',
		/*
		 * El orden importa acá más que en ningún otro momento.
		 *
		 * La última es la que se manda si nadie toca nada, y en esta mesa lo
		 * prudente es firmar, no quedarse sin club. En la rueda del futbolista la
		 * más conservadora también va última; la diferencia es que allá lo
		 * conservador es no arriesgar una jugada y acá es no arriesgar la carrera.
		 */
		opciones: [
			{
				id: 'no-renovar',
				etiqueta: 'No renovar y salir al mercado',
				detalle: 'Apostar a que afuera hay algo mejor. Sin contrato no hay red.',
				probabilidad: 100,
				siSale: `Decidieron no renovar. En junio ${f.nombre} sale al mercado sin contrato.`,
				siFalla: '',
				premio: { prestigio: 1 },
				castigo: {}
			},
			{
				id: 'pedir-mas',
				etiqueta: 'Sentarte a pedir una mejora',
				detalle: 'Renovar hacia arriba. Si el club te dice que no, quedan menos puentes.',
				probabilidad: chance(38 + comoLoVen * 1.4, a.negociacion, 0.55),
				siSale: `Firmaron renovación con mejora. ${f.nombre} sigue en ${donde} y cobrando más.`,
				siFalla: `Les pareció demasiado y cortaron la charla. No hay renovación.`,
				premio: { prestigio: 5, contactos: 2, confianza: 8, negociacion: 2 },
				castigo: { prestigio: -2, confianza: -5 }
			},
			{
				id: 'renovar-igual',
				etiqueta: 'Aceptar lo que haya',
				detalle:
					'Un año más en las mismas condiciones. Nadie se hace rico, nadie se queda sin club.',
				probabilidad: chance(62 + comoLoVen * 1.2, a.contactos, 0.35),
				siSale: `Firmaron la continuidad sin discutir números. Sigue en ${donde}.`,
				siFalla: `Ni así: en el club ya habían decidido no seguir.`,
				premio: { confianza: 5, prestigio: 1 },
				castigo: { confianza: -4 }
			}
		]
	};
}

/**
 * Si este momento puede tocar hoy.
 *
 * Casi todos pueden siempre; los dos que no, no pueden por motivos distintos.
 * "El pibe" no aparece todos los años porque fichar a alguien nuevo cada
 * temporada convertiría la agencia en una lista y le sacaría el peso a cada
 * firma, y hace falta algo de scouting para que a uno lo llamen. "El que se
 * quiere ir" necesita que haya alguien más en la cartera: no se puede perder
 * un representado que no existe.
 *
 * No consume la tirada del sorteo a propósito —tiene su propia semilla—: si la
 * consumiera, agregar un momento nuevo a la lista correría todo lo demás.
 */
function puedePasar(id: string, estado: Estado, semilla: string): boolean {
	if (id === 'el-que-se-va') return estado.representante.representadosExtra > 0;
	if (id !== 'el-pibe') return true;
	if (estado.representante.atributos.scouting < 35) return false;
	return rngPara(semilla, {
		temporada: estado.temporada,
		fase: estado.fase,
		clave: 'aparece-el-pibe'
	}).ocurre(0.55);
}

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

	// Con el contrato terminándose, el mercado tiene un solo tema y es ése.
	if (estado.fase === 3 && tocaRenovar(estado)) return [laMesaFinal(estado)];

	if (estado.fase === 3) {
		const elegidas: Plantilla[] = [];
		const restantes = [...EN_EL_MERCADO];
		while (elegidas.length < Math.min(MOMENTOS_EN_EL_MERCADO, restantes.length)) {
			const cual = rng.elegir(restantes);
			elegidas.push(cual);
			restantes.splice(restantes.indexOf(cual), 1);
		}
		return elegidas.map((plantilla, i) => plantilla(estado, escenario(estado, i, semilla)));
	}

	/*
	 * En la temporada, dos y de familias distintas.
	 *
	 * Eran cinco momentos sorteados de una bolsa y se notaba: dos años seguidos
	 * te llamaba el mismo dirigente, o te llegaba dos veces la misma foto del
	 * boliche. Ahora son veinte repartidos en ocho familias —cartera, club,
	 * colega, prensa, familiar, social, turbio y plata— y lo que rota es la
	 * familia: dos por año, distintas entre sí, y avanzando de a dos para que el
	 * año que viene tampoco toquen las mismas.
	 */
	const e0 = escenario(estado, 0, semilla);
	const fichas = EN_LA_TEMPORADA.map((plantilla) => {
		const { id, familia } = plantilla(estado, e0);
		return { plantilla, id, familia: familia ?? 'club' };
	});

	const corrimiento = rngPara(semilla, {
		temporada: 0,
		fase: 0,
		clave: 'orden-del-representante'
	}).entero(0, FAMILIAS_DEL_REPRE.length - 1);

	const elegidas: Plantilla[] = [];
	for (let i = 0; i < MOMENTOS_POR_TEMPORADA; i++) {
		const paso = (estado.temporada - 1) * MOMENTOS_POR_TEMPORADA + i + corrimiento;
		const cual = FAMILIAS_DEL_REPRE[paso % FAMILIAS_DEL_REPRE.length];
		const dentro = fichas.filter((f) => f.familia === cual && puedePasar(f.id, estado, semilla));
		if (dentro.length === 0) continue;
		elegidas.push(dentro[Math.floor(paso / FAMILIAS_DEL_REPRE.length) % dentro.length].plantilla);
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
	if (efecto.representadosExtra)
		r.representadosExtra = Math.max(0, r.representadosExtra + efecto.representadosExtra);
	if (efecto.confianza) estado.confianza = acotar(estado.confianza + efecto.confianza);
	if (efecto.prensa) estado.futbolista.prensa = acotar(estado.futbolista.prensa + efecto.prensa);
	if (efecto.moral) estado.futbolista.moral = acotar(estado.futbolista.moral + efecto.moral);
}
