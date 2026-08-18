import { atributosQueUsa } from './puestos';
import { rngPara } from './rng';
import type { Estado, InversionComprada, Rol } from './tipos';

/**
 * En qué se gasta la plata.
 *
 * Hasta acá el dinero del futbolista era un número que subía y no servía para
 * nada: cobraba veinte años, juntaba millones y se retiraba con ellos sin haber
 * decidido nunca nada al respecto. El del representante al menos puntuaba al
 * final, pero tampoco se gastaba. Una economía donde no se puede comprar nada
 * no es una economía.
 *
 * Cada inversión se paga una vez y después cuesta todos los años. Ése es el
 * punto: no es una lista de mejoras para tildar todas, es una cuenta que hay
 * que poder sostener. El que se llena de gastos con el sueldo de un club chico
 * los pierde cuando el sueldo baja, que es exactamente lo que le pasa a la
 * gente.
 *
 * Nada de esto toca los números que decide el motor: cambian las condiciones,
 * no los resultados.
 */

/**
 * Qué tan difícil es que aparezca, y qué tan gorda es cuando aparece.
 *
 * Alan lo pidió con los números adentro: cuarenta y cinco cartas, veinticinco
 * comunes, diez de bronce, siete de plata y tres doradas. La rareza no es una
 * etiqueta de color: es lo que decide cuántas veces vas a ver esa carta en la
 * vidriera a lo largo de una carrera. Las comunes están casi siempre; una
 * dorada puede no aparecer nunca, y ésa es la que se recuerda.
 */
export type Rareza = 'comun' | 'bronce' | 'plata' | 'dorada';

/** Cómo se lee cada rareza en la pantalla. */
export const NOMBRE_RAREZA: Record<Rareza, string> = {
	comun: 'Común',
	bronce: 'Bronce',
	plata: 'Plata',
	dorada: 'Dorada'
};

/**
 * Lo que una inversión mueve, declarado en vez de programado.
 *
 * Antes cada efecto era un `if (item.id === 'preparador')` adentro de la
 * función que los aplica, y eso servía con diecisiete cartas. Con cuarenta y
 * cinco no: cada carta nueva era código nuevo en tres lugares distintos y la
 * tarjeta podía decir una cosa mientras el motor hacía otra. Declarándolo, la
 * carta es un dato y no hay dónde equivocarse.
 */
export type LoQueDa = {
	/** Del futbolista. */
	desgaste?: number;
	forma?: number;
	moral?: number;
	fama?: number;
	prensa?: number;
	hinchada?: number;
	dt?: number;
	confianza?: number;
	/** El atributo que más usa su puesto: distinto para un nueve y para un cinco. */
	loQueMasUsa?: number;
	/** Del representante. */
	negociacion?: number;
	scouting?: number;
	contactos?: number;
	carisma?: number;
	prestigio?: number;
};

export type Inversion = {
	id: string;
	de: Rol;
	rareza: Rareza;
	nombre: string;
	detalle: string;
	/** Lo que hace, en una línea, para la tarjeta. */
	efecto: string;
	/**
	 * Qué tan cara es, de 1 a 5. No es un precio en dólares a propósito.
	 *
	 * Un futbolista cobra mil dólares por mes a los 16 y medio millón a los 28.
	 * Un precio fijo es imposible a los 16 y no se siente a los 28: medido, una
	 * carrera junta entre diez y cincuenta millones, así que cualquier número
	 * fijo que sirva de joven es calderilla después. El precio sale de lo que
	 * gana hoy, y así la decisión pesa igual a los dos extremos de la carrera.
	 */
	peso: number;
	/**
	 * Cuántas temporadas dura, si es un consumible.
	 *
	 * Las que no lo dicen son para siempre —el staff, la casa— y se pagan todos
	 * los años. Un consumible se paga una vez, dura lo que dura y se va solo. Es
	 * la compra del que tiene un año importante por delante y no quiere atarse a
	 * un gasto para el resto de la carrera.
	 */
	dura?: number;
	/** Si ya no tiene sentido comprarla. */
	sirveAun?: (estado: Estado) => boolean;
	/**
	 * Cómo se llama cuando se ata para siempre, si es un consumible.
	 *
	 * Un consumible se puede dejar de comprar todos los años y pasar a tenerlo
	 * fijo: en vez de un par de botines por temporada, un contrato con la marca.
	 * Cuesta más de entrada y se paga todos los años, pero no se termina nunca y
	 * no hay que acordarse. Es la misma decisión que existe en la vida: alquilar
	 * o atarse.
	 */
	fijo?: { nombre: string; detalle: string; efecto: string };
	/** El empujón único del día que se compra. */
	alComprar?: LoQueDa;
	/** Y lo que da todos los años que la tenga. */
	porTemporada?: LoQueDa;
	/**
	 * Lo que multiplica, que no se suma a un número sino a una cuenta.
	 *
	 * `crecimiento` es cuánto más rinde una temporada jugada; `produccion`,
	 * cuánto más produce en la cancha; `lesion`, cuánto le baja el riesgo de
	 * romperse. Se multiplican entre sí cuando tiene varias.
	 */
	multiplica?: { crecimiento?: number; produccion?: number; lesion?: number };
	/** El piso al que no puede bajar la moral mientras la tenga. */
	pisoDeMoral?: number;
};

export const INVERSIONES: Inversion[] = [
	// --- Del futbolista ------------------------------------------------------
	{
		id: 'preparador',
		rareza: 'bronce',
		de: 'futbolista',
		nombre: 'Preparador físico propio',
		detalle: 'Uno que te conoce el cuerpo y te arma el año a vos, no al plantel.',
		efecto: 'El cuerpo aguanta más: −2 de desgaste por temporada',
		peso: 3,
		porTemporada: { desgaste: -2 }
	},
	{
		id: 'nutricionista',
		rareza: 'comun',
		de: 'futbolista',
		nombre: 'Nutricionista y cocinero',
		detalle: 'Comer como se debe todo el año, no solo en pretemporada.',
		efecto: 'Llegás mejor a cada temporada: +7 de forma',
		peso: 2,
		porTemporada: { forma: 7 }
	},
	{
		id: 'psicologo',
		rareza: 'comun',
		de: 'futbolista',
		nombre: 'Psicólogo deportivo',
		detalle: 'Alguien con quien hablar cuando el año viene mal. Sirve justo ahí.',
		efecto: 'La moral no se te cae abajo de 40',
		peso: 2,
		pisoDeMoral: 40
	},
	{
		id: 'analista',
		rareza: 'plata',
		de: 'futbolista',
		nombre: 'Analista de video propio',
		detalle: 'Ver tus propios partidos con alguien que sepa qué mirar.',
		efecto: 'Aprovechás más cada temporada: crecés un 18% más rápido',
		peso: 4,
		multiplica: { crecimiento: 1.18 }
	},
	{
		id: 'casa',
		rareza: 'plata',
		de: 'futbolista',
		nombre: 'La casa de la familia',
		detalle: 'Sacarlos del barrio. Es lo primero que compra casi todo el mundo.',
		efecto: 'Se te va un peso de encima: +15 de moral y +2 todos los años',
		peso: 5,
		alComprar: { moral: 15 },
		porTemporada: { moral: 2 }
	},

	// --- Consumibles del futbolista ------------------------------------------
	{
		id: 'botines',
		rareza: 'comun',
		de: 'futbolista',
		nombre: 'Botines nuevos',
		detalle: 'Un par hecho a tu pie para el año que viene. Se gastan y listo.',
		efecto: 'Una temporada: goles y asistencias +12%',
		peso: 2,
		multiplica: { produccion: 1.12 },
		dura: 1,
		fijo: {
			nombre: 'Contrato con la marca',
			detalle: 'Que te manden los botines hechos a tu pie todos los años, sin acordarte.',
			efecto: 'Todas las temporadas: goles y asistencias +12%'
		}
	},
	{
		id: 'fisio',
		rareza: 'bronce',
		de: 'futbolista',
		nombre: 'Fisio para toda la temporada',
		detalle: 'Uno solo para vos durante el año. Después vuelve al plantel.',
		efecto: 'Dos temporadas: mitad de riesgo de lesión',
		peso: 3,
		multiplica: { lesion: 0.5 },
		dura: 2,
		fijo: {
			nombre: 'Tu fisio, para siempre',
			detalle: 'Contratarlo vos. Deja el plantel y trabaja solo con tu cuerpo, todos los años.',
			efecto: 'Siempre: mitad de riesgo de lesión'
		}
	},
	{
		id: 'concentracion',
		rareza: 'plata',
		de: 'futbolista',
		nombre: 'Irte a entrenar afuera',
		detalle: 'Un verano entero en un centro de alto rendimiento, lejos de todo.',
		efecto: 'Una temporada: crecés un 30% más rápido',
		peso: 4,
		multiplica: { crecimiento: 1.3 },
		dura: 1,
		fijo: {
			nombre: 'Tu propio centro de entrenamiento',
			detalle: 'Un lugar tuyo donde entrenar cada verano. Se sostiene todos los años.',
			efecto: 'Todas las temporadas: crecés un 30% más rápido'
		}
	},

	{
		id: 'mudanza',
		rareza: 'bronce',
		de: 'futbolista',
		nombre: 'Mudarte al lado del predio',
		detalle:
			'Dejar de perder dos horas por día en el auto. Se nota en el cuerpo antes que en la cabeza.',
		efecto: 'Tres temporadas: −3 de desgaste y +4 de moral por año',
		peso: 3,
		porTemporada: { desgaste: -3, moral: 4 },
		dura: 3,
		fijo: {
			nombre: 'La casa al lado del predio',
			detalle: 'Comprarla en vez de alquilarla. Ya no te mudás más.',
			efecto: 'Siempre: −3 de desgaste y +4 de moral por año'
		}
	},
	{
		id: 'especialista',
		rareza: 'plata',
		de: 'futbolista',
		nombre: 'Un profe solo para vos',
		detalle: 'Media hora más, todos los días, sobre lo único que de verdad te hace falta.',
		efecto: 'Tres temporadas: +2 por año en lo que más usás de tu puesto',
		peso: 4,
		porTemporada: { loQueMasUsa: 2 },
		dura: 3,
		fijo: {
			nombre: 'Tu entrenador personal',
			detalle: 'Que viaje con vos y esté todos los años, no tres.',
			efecto: 'Siempre: +2 por año en lo que más usás de tu puesto'
		}
	},

	// --- Del representante ---------------------------------------------------
	{
		id: 'oficina',
		rareza: 'bronce',
		de: 'representante',
		nombre: 'Una oficina de verdad',
		detalle: 'Dejar de atender del celular en un bar. Cambia con quién te sentás.',
		efecto: '+8 de contactos, y +1 todas las temporadas',
		peso: 2,
		alComprar: { contactos: 8 },
		porTemporada: { contactos: 1 }
	},
	{
		id: 'abogado',
		rareza: 'bronce',
		de: 'representante',
		nombre: 'Un abogado propio',
		detalle: 'Los contratos los mira alguien que sabe, no vos a las tres de la mañana.',
		efecto: '+10 de negociación',
		peso: 3,
		alComprar: { negociacion: 10 }
	},
	{
		id: 'ojeadores',
		rareza: 'bronce',
		de: 'representante',
		nombre: 'Dos ojeadores',
		detalle: 'Gente tuya mirando inferiores mientras vos estás en otra cosa.',
		efecto: '+10 de scouting, y +1 todas las temporadas',
		peso: 3,
		alComprar: { scouting: 10 },
		porTemporada: { scouting: 1 }
	},
	{
		id: 'prensa-propia',
		rareza: 'comun',
		de: 'representante',
		nombre: 'Alguien que le maneje la prensa',
		detalle: 'Que las notas salgan como tienen que salir.',
		efecto: 'La prensa del futbolista sube sola: +3 por temporada',
		peso: 2,
		porTemporada: { prensa: 3 }
	},

	// --- Consumibles del representante ---------------------------------------
	// Le faltaban: tenía cuatro cosas para siempre y ninguna decisión de plazo,
	// así que después de la cuarta temporada no le quedaba nada para comprar.
	{
		id: 'socio-europa',
		rareza: 'plata',
		de: 'representante',
		nombre: 'Un socio en Europa',
		detalle: 'Alguien que atienda del otro lado del charco mientras vos dormís.',
		efecto: 'Tres temporadas: +3 de contactos por año',
		peso: 3,
		porTemporada: { contactos: 3 },
		dura: 3,
		fijo: {
			nombre: 'Oficina en Europa',
			detalle: 'Poner la tuya allá en vez de depender de un socio.',
			efecto: 'Siempre: +3 de contactos por año'
		}
	},
	{
		id: 'campana',
		rareza: 'bronce',
		de: 'representante',
		nombre: 'Una campaña para instalarlo',
		detalle: 'Que aparezca donde tiene que aparecer hasta que el nombre suene solo.',
		efecto: 'Tres temporadas: +4 de fama por año',
		peso: 2,
		porTemporada: { fama: 4 },
		dura: 3,
		fijo: {
			nombre: 'Una agencia de imagen',
			detalle: 'Que el nombre no deje de sonar nunca más.',
			efecto: 'Siempre: +4 de fama por año'
		}
	},
	{
		id: 'viajes',
		rareza: 'comun',
		de: 'representante',
		nombre: 'Viajar a verlos jugar',
		detalle: 'Estar en la cancha y no mirar el video. Se ve otra cosa y te ven a vos.',
		efecto: 'Dos temporadas: +3 de scouting por año',
		peso: 2,
		porTemporada: { scouting: 3 },
		dura: 2,
		fijo: {
			nombre: 'Viajar siempre',
			detalle: 'Que ir a verlos deje de ser una excepción.',
			efecto: 'Siempre: +3 de scouting por año'
		}
	},
	// --- Comunes del futbolista ----------------------------------------------
	// Chicas, baratas y de todos los días. Son las que se compran a los 17 con
	// el primer sueldo, y las que hacen que la vidriera tenga algo cada año.
	{
		id: 'masajista',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Masajista una vez por semana',
		detalle: 'Los martes, dos horas. No es lujo: es que el jueves llegás entero.',
		efecto: 'El cuerpo descansa: −2 de desgaste por temporada',
		peso: 2,
		porTemporada: { desgaste: -2 }
	},
	{
		id: 'gimnasio-en-casa',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Un gimnasio en tu casa',
		detalle: 'Para no depender del horario del club ni del tránsito.',
		efecto: 'Llegás mejor: −1 de desgaste y +3 de forma por temporada',
		peso: 2,
		porTemporada: { desgaste: -1, forma: 3 }
	},
	{
		id: 'chofer',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Alguien que te maneje',
		detalle: 'Dos horas por día que dejás de manejar y pasás durmiendo.',
		efecto: '−1 de desgaste y +2 de moral por temporada',
		peso: 2,
		porTemporada: { desgaste: -1, moral: 2 }
	},
	{
		id: 'dormir',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'El cuarto para dormir bien',
		detalle: 'Cortinas negras, colchón como corresponde, el teléfono afuera.',
		efecto: '−1 de desgaste y +2 de forma por temporada',
		peso: 1,
		porTemporada: { desgaste: -1, forma: 2 }
	},
	{
		id: 'camara',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Cámara hiperbárica alquilada',
		detalle: 'Dos temporadas de recuperación acelerada. Después se devuelve.',
		efecto: 'Dos temporadas: 15% menos de riesgo de lesión',
		peso: 3,
		dura: 2,
		multiplica: { lesion: 0.85 }
	},
	{
		id: 'idioma',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Un profesor de idiomas',
		detalle: 'Para el día que te toque un vestuario donde no entendés nada.',
		efecto: '+2 con el técnico y +2 de moral por temporada',
		peso: 1,
		porTemporada: { dt: 2, moral: 2 }
	},
	{
		id: 'redes',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Alguien que te maneje las redes',
		detalle: 'Que suba lo que hay que subir y no conteste a las dos de la mañana.',
		efecto: '+3 de fama por temporada',
		peso: 2,
		porTemporada: { fama: 3 }
	},
	{
		id: 'palco',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Un palco para la familia',
		detalle: 'Que los tuyos te vean jugar sentados y sin que los apuren.',
		efecto: 'Te sacás un peso de encima: +8 de moral al comprarlo',
		peso: 2,
		// Un pago y listo: lo que deja, deja para siempre, pero no es
		// alguien a quien haya que seguir pagándole todos los años.
		dura: 1,
		alComprar: { moral: 8 }
	},
	{
		id: 'secundario',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'Terminar el secundario',
		detalle: 'De noche, con un profesor particular. Por si esto se termina antes.',
		efecto: '+5 de moral al empezar y +3 por temporada',
		peso: 1,
		alComprar: { moral: 5 },
		porTemporada: { moral: 3 }
	},
	{
		id: 'auto',
		de: 'futbolista',
		rareza: 'comun',
		nombre: 'El auto que querías',
		detalle: 'El que mirabas de pibe. Sostenerlo cuesta más que comprarlo.',
		efecto: '+10 de moral al comprarlo, y −1 por temporada de tenerlo',
		peso: 3,
		alComprar: { moral: 10 },
		porTemporada: { moral: -1 }
	},

	// --- Comunes del representante -------------------------------------------
	{
		id: 'segundo-telefono',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Un segundo teléfono',
		detalle: 'Uno para los clubes y otro para tu casa. Es más de lo que parece.',
		efecto: '+2 de contactos por temporada',
		peso: 1,
		porTemporada: { contactos: 2 }
	},
	{
		id: 'abono',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Abono para ver partidos',
		detalle: 'Entrar a cualquier cancha del país sin pedirle permiso a nadie.',
		efecto: '+2 de scouting por temporada',
		peso: 1,
		porTemporada: { scouting: 2 }
	},
	{
		id: 'contador',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Un contador',
		detalle: 'Que los números de tus contratos los mire alguien que sabe.',
		efecto: '+4 de negociación al empezar y +1 por temporada',
		peso: 2,
		alComprar: { negociacion: 4 },
		porTemporada: { negociacion: 1 }
	},
	{
		id: 'traductor',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Un traductor para las mesas de afuera',
		detalle: 'Firmar en un idioma que no hablás es firmar a ciegas.',
		efecto: '+2 de contactos por temporada',
		peso: 2,
		porTemporada: { contactos: 2 }
	},
	{
		id: 'curso',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Un curso de negociación',
		detalle: 'Cuatro meses, dos veces por semana. Sirve más de lo que suena.',
		efecto: '+6 de negociación al terminarlo',
		peso: 2,
		// Un pago y listo: lo que deja, deja para siempre, pero no es
		// alguien a quien haya que seguir pagándole todos los años.
		dura: 1,
		alComprar: { negociacion: 6 }
	},
	{
		id: 'ropa',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Ropa para las mesas',
		detalle: 'A los dirigentes les importa, aunque digan que no.',
		efecto: '+5 de carisma al comprarla y +1 por temporada',
		peso: 1,
		alComprar: { carisma: 5 },
		porTemporada: { carisma: 1 }
	},
	{
		id: 'base-de-datos',
		de: 'representante',
		rareza: 'comun',
		nombre: 'La base de datos de scouting',
		detalle: 'Todos los partidos de todas las inferiores, en una pantalla.',
		efecto: '+3 de scouting por temporada',
		peso: 2,
		porTemporada: { scouting: 3 }
	},
	{
		id: 'becario',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Un pibe que te ayude',
		detalle: 'Que atienda cuando estás manejando y anote lo que no te acordás.',
		efecto: '+1 de contactos y +1 de scouting por temporada',
		peso: 1,
		porTemporada: { contactos: 1, scouting: 1 }
	},
	{
		id: 'almuerzos',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Almorzar con dirigentes',
		detalle: 'Dos temporadas de invitar vos. Se devuelve solo, y tarde.',
		efecto: 'Dos temporadas: +3 de contactos por año',
		peso: 2,
		dura: 2,
		porTemporada: { contactos: 3 }
	},
	{
		id: 'sala',
		de: 'representante',
		rareza: 'comun',
		nombre: 'Una sala para reunirte',
		detalle: 'Dejar de arreglar contratos en la mesa de un bar.',
		efecto: '+4 de prestigio al alquilarla',
		peso: 2,
		// Un pago y listo: lo que deja, deja para siempre, pero no es
		// alguien a quien haya que seguir pagándole todos los años.
		dura: 1,
		alComprar: { prestigio: 4 }
	},

	// --- Bronce --------------------------------------------------------------
	{
		id: 'kinesiologo',
		de: 'futbolista',
		rareza: 'bronce',
		nombre: 'Kinesiólogo propio',
		detalle: 'El que te trata siempre y sabe cómo se te rompe el cuerpo a vos.',
		efecto: '25% menos de riesgo de lesión y −1 de desgaste por temporada',
		peso: 3,
		multiplica: { lesion: 0.75 },
		porTemporada: { desgaste: -1 }
	},
	{
		id: 'sparring',
		de: 'futbolista',
		rareza: 'bronce',
		nombre: 'Un sparring para después del entrenamiento',
		detalle: 'Alguien pago para que te haga repetir lo mismo mil veces.',
		efecto: '+1 por temporada en lo que más usás de tu puesto',
		peso: 3,
		porTemporada: { loQueMasUsa: 1 }
	},
	{
		id: 'cazatalentos',
		de: 'representante',
		rareza: 'bronce',
		nombre: 'Un cazatalentos con nombre',
		detalle: 'Uno de los que trabajaron en clubes grandes, ahora para vos.',
		efecto: '+2 de scouting y +2 de contactos por temporada',
		peso: 3,
		porTemporada: { scouting: 2, contactos: 2 }
	},

	// --- Plata ---------------------------------------------------------------
	{
		id: 'clinica',
		de: 'futbolista',
		rareza: 'plata',
		nombre: 'La clínica de Europa',
		detalle: 'La que usan los que se rompen en serio. Un chequeo por año, allá.',
		efecto: '40% menos de riesgo de lesión y −2 de desgaste por temporada',
		peso: 4,
		multiplica: { lesion: 0.6 },
		porTemporada: { desgaste: -2 }
	},
	{
		id: 'agencia-de-datos',
		de: 'representante',
		rareza: 'plata',
		nombre: 'Un equipo de datos',
		detalle: 'Dos analistas que te dicen quién va a valer antes de que valga.',
		efecto: '+4 de scouting y +2 de negociación por temporada',
		peso: 4,
		porTemporada: { scouting: 4, negociacion: 2 }
	},

	// --- Doradas -------------------------------------------------------------
	// Tres en cuarenta y cinco, y así tiene que ser: son las que se ven una vez
	// en una carrera y se cuentan después.
	{
		id: 'cuerpo-tecnico',
		de: 'futbolista',
		rareza: 'dorada',
		nombre: 'Tu propio cuerpo técnico',
		detalle:
			'Preparador, kinesiólogo, analista y cocinero, todos tuyos, viajando con vos. ' +
			'Lo tienen tres jugadores en el mundo.',
		efecto:
			'−4 de desgaste, +6 de forma y +1 en lo tuyo por temporada; crecés un 20% más rápido y te rompés un 30% menos',
		peso: 5,
		porTemporada: { desgaste: -4, forma: 6, loQueMasUsa: 1 },
		multiplica: { crecimiento: 1.2, lesion: 0.7 }
	},
	{
		id: 'documental',
		de: 'futbolista',
		rareza: 'dorada',
		nombre: 'Un documental sobre vos',
		detalle: 'Un año de cámaras adentro de tu casa y del vestuario. Se estrena en todo el mundo.',
		efecto: '+20 de fama y +8 con la gente al estrenarse, y +5 de fama por temporada',
		peso: 5,
		alComprar: { fama: 20, hinchada: 8 },
		porTemporada: { fama: 5, prensa: 3 }
	},
	{
		id: 'agencia-global',
		de: 'representante',
		rareza: 'dorada',
		nombre: 'Oficinas en tres países',
		detalle: 'Dejar de ser un representante y pasar a ser una empresa. No se vuelve de ahí.',
		efecto: '+12 de prestigio y +10 de contactos al abrirlas, y +4, +2 y +2 por temporada',
		peso: 5,
		alComprar: { prestigio: 12, contactos: 10 },
		porTemporada: { contactos: 4, prestigio: 2, scouting: 2 }
	}
];

export const NADA = 'nada';

/**
 * Lo que cada rol gana en un año, que es contra lo que se miden los precios.
 *
 * Del futbolista es el sueldo, que es lo que cobra seguro. Del representante,
 * el fijo más lo que le deja el porcentaje del sueldo: las comisiones de pase
 * son un golpe de suerte y no un ingreso con el que se pueda contar.
 */
export function ingresoAnual(estado: Estado, rol: Rol): number {
	if (rol === 'futbolista') return estado.futbolista.contrato.salarioMensual * 12;
	const delSueldo =
		(estado.futbolista.contrato.salarioMensual * 12 * estado.contratoRepresentacion.pctSalario) /
		100;
	return 4_000 + 600 * estado.representante.prestigio + delSueldo;
}

/**
 * Lo que sale comprarla hoy: unos meses de lo que gana.
 *
 * Estaba en 0.3 por punto de peso, o sea que el analista costaba un año y
 * cuarto de sueldo entero. Junto con el mantenimiento de abajo, armar el
 * equipo propio era una carrera entera de ahorro, y la vidriera terminaba
 * siendo una lista de cosas que se miran y no se compran nunca.
 */
const LO_QUE_SALE_POR_PUNTO = 0.18;

/**
 * Y lo que sale atarse.
 *
 * Un consumible fijo cuesta más de entrada que el consumible suelto: hay que
 * poder pagar el año de golpe y encima quedar enganchado al gasto. Si costara
 * lo mismo, atarse sería gratis y nadie compraría nunca la versión suelta.
 */
const LO_QUE_SALE_ATARSE = 1.7;

export function precioDe(estado: Estado, item: Inversion, fijo = false): number {
	const cuanto = item.peso * LO_QUE_SALE_POR_PUNTO * (fijo ? LO_QUE_SALE_ATARSE : 1);
	return Math.max(2_000, Math.round((ingresoAnual(estado, item.de) * cuanto) / 500) * 500);
}

/**
 * Y lo que va a costar sostenerla todos los años.
 *
 * Se congela al comprarla, con el sueldo de ese momento. Es la parte que hace
 * que tener plata sea una decisión y no un marcador: el que se llena de gastos
 * en su mejor año no los puede sostener cuando el sueldo baja, y eso es
 * exactamente lo que le pasa a la gente.
 */
/**
 * Cuánto cuesta sostenerla, por punto de peso y por año.
 *
 * Estaba en 0.055, y los pesos del futbolista suman 16: tener todo costaba el
 * 88% de lo que ganaba en el año. No era una decisión difícil, era una decisión
 * imposible —Hernán lo dijo jugando: "los precios anuales son impagables"—.
 *
 * Con 0.018 tener todo cuesta cerca de un tercio del ingreso. Sigue doliendo,
 * que es la idea: el que se llena de gastos en su mejor año no los sostiene
 * cuando el sueldo baja. Pero se puede.
 */
const LO_QUE_CUESTA_SOSTENERLA = 0.018;

export function mantenimientoDe(estado: Estado, item: Inversion, fijo = false): number {
	// Un consumible suelto no se mantiene: se compra, se usa y se termina. Uno
	// atado sí, y por eso es lo que lo hace una decisión y no un regalo.
	if (item.dura && !fijo) return 0;
	return Math.max(
		500,
		Math.round((ingresoAnual(estado, item.de) * item.peso * LO_QUE_CUESTA_SOSTENERLA) / 500) * 500
	);
}

/**
 * Una inversión ya comprada, con el gasto que quedó fijado ese día.
 *
 * `quedan` solo existe en los consumibles: es cuántas temporadas les faltan.
 */
/**
 * Una inversión ya comprada, con el gasto que quedó fijado ese día.
 *
 * `fijo` marca el consumible que se ató para siempre: no se gasta y se paga
 * todos los años, igual que el staff. Lo que cambia no es el efecto sino la
 * forma de pagarlo, así que es una bandera y no otro artículo del catálogo —el
 * efecto ya está escrito una sola vez—.
 */
export type Comprada = InversionComprada;

export function inversion(id: string | undefined): Inversion | null {
	return INVERSIONES.find((i) => i.id === id) ?? null;
}

/** Lo mismo que `Inversion` pero con los números de hoy puestos. */
/**
 * Un renglón de la vidriera, con lo que sale hoy y qué se hace con él.
 *
 * `modo` es la novedad. Antes la vidriera solo sabía ofrecer lo que todavía no
 * se tenía: un consumible comprado desaparecía de la lista y volvía recién
 * cuando se gastaba, así que no había forma de estirarlo antes de quedarse sin
 * ni de dejar de comprarlo todos los años. Bebo lo pidió con esas palabras:
 * "faltan consumibles renovables".
 *
 *  - `comprar`: no lo tiene.
 *  - `renovar`: lo tiene y le suma temporadas, al mismo precio.
 *  - `fijar`:   lo tiene suelto y lo ata para siempre, con gasto anual.
 */
export type ModoDeCompra = 'comprar' | 'renovar' | 'fijar';

export type EnLaVidriera = Inversion & {
	precioUsd: number;
	porTemporadaUsd: number;
	modo: ModoDeCompra;
	/** Cuántas temporadas le quedan, si ya lo tiene y es un consumible. */
	quedan?: number;
	/** Qué id hay que mandar para esta acción. */
	pedido: string;
};

/** El id que viaja en el formulario para cada acción. */
export function pedidoDe(id: string, modo: ModoDeCompra): string {
	return modo === 'comprar' ? id : `${id}:${modo}`;
}

function partirPedido(pedido: string): { id: string; modo: ModoDeCompra } {
	const [id, cual] = pedido.split(':');
	const modo: ModoDeCompra = cual === 'renovar' || cual === 'fijar' ? cual : 'comprar';
	return { id, modo };
}

/** Lo que este rol puede comprar, renovar o atar hoy. */
export const CUANTAS_EN_LA_VIDRIERA = 8;

/**
 * Cuánto pesa cada rareza en el sorteo de la vidriera.
 *
 * Una común aparece casi todos los años; una dorada, con suerte una vez en una
 * carrera. Ése es todo el sistema: no hay cartas que no se puedan comprar, hay
 * cartas que no se ofrecen casi nunca, y la diferencia entre las dos cosas es
 * lo que hace que abrir la pretemporada valga la pena.
 */
const CUANTO_APARECE: Record<Rareza, number> = {
	comun: 1,
	bronce: 0.75,
	plata: 0.4,
	dorada: 0.12
};

/**
 * Las que se ofrecen este año, sorteadas y sin repetir.
 *
 * Determinista con la semilla y la temporada: la vidriera de la pretemporada 4
 * es siempre la misma, así que recargar la página no la cambia. Y lo que ya
 * tiene comprado no pasa por acá —eso se muestra siempre, que es lo que Alan
 * pidió: "los consumibles está bien que aparezcan solo en pretemporada, pero
 * después se borran y no sabés qué tenés"—.
 */
function lasQueSeOfrecen(estado: Estado, rol: Rol, semilla: string): Set<string> {
	const compradas = new Set((estado.inversiones?.[rol] ?? []).map((c) => c.id));
	const candidatas = INVERSIONES.filter(
		(i) => i.de === rol && !compradas.has(i.id) && (i.sirveAun?.(estado) ?? true)
	);

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 1,
		clave: `vidriera-${rol}`
	});

	// Sorteo con pesos, sacando de la bolsa lo que ya salió.
	const bolsa = [...candidatas];
	const salieron = new Set<string>();
	while (salieron.size < CUANTAS_EN_LA_VIDRIERA && bolsa.length > 0) {
		const total = bolsa.reduce((suma, i) => suma + CUANTO_APARECE[i.rareza], 0);
		let corte = rng.siguiente() * total;
		let elegida = bolsa[bolsa.length - 1];
		for (const i of bolsa) {
			corte -= CUANTO_APARECE[i.rareza];
			if (corte <= 0) {
				elegida = i;
				break;
			}
		}
		salieron.add(elegida.id);
		bolsa.splice(bolsa.indexOf(elegida), 1);
	}

	return salieron;
}

export function loQuePuedeComprar(estado: Estado, rol: Rol, semilla: string): EnLaVidriera[] {
	const compradas = new Map((estado.inversiones?.[rol] ?? []).map((c) => [c.id, c]));
	const enVidriera = lasQueSeOfrecen(estado, rol, semilla);
	const vidriera: EnLaVidriera[] = [];

	for (const item of INVERSIONES) {
		if (item.de !== rol) continue;
		if (!(item.sirveAun?.(estado) ?? true)) continue;
		// Lo que ya tiene sigue apareciendo para renovarlo o atarlo; lo que no
		// tiene, sólo si salió sorteado este año.
		if (!compradas.has(item.id) && !enVidriera.has(item.id)) continue;

		const ya = compradas.get(item.id);

		if (!ya) {
			vidriera.push({
				...item,
				precioUsd: precioDe(estado, item),
				porTemporadaUsd: mantenimientoDe(estado, item),
				modo: 'comprar',
				pedido: pedidoDe(item.id, 'comprar')
			});
			// Y si es un consumible, también se puede atar de una: el que ya sabe
			// que lo va a querer todos los años no tiene por qué empezar suelto.
			if (item.dura && item.fijo) {
				vidriera.push({
					...item,
					precioUsd: precioDe(estado, item, true),
					porTemporadaUsd: mantenimientoDe(estado, item, true),
					modo: 'fijar',
					pedido: pedidoDe(item.id, 'fijar')
				});
			}
			continue;
		}

		// Ya lo tiene. Un consumible suelto se puede estirar o atar; lo fijo y el
		// staff no se compran dos veces.
		if (item.dura && !ya.fijo) {
			vidriera.push({
				...item,
				precioUsd: precioDe(estado, item),
				porTemporadaUsd: 0,
				modo: 'renovar',
				quedan: ya.quedan,
				pedido: pedidoDe(item.id, 'renovar')
			});
			if (item.fijo) {
				vidriera.push({
					...item,
					precioUsd: precioDe(estado, item, true),
					porTemporadaUsd: mantenimientoDe(estado, item, true),
					modo: 'fijar',
					quedan: ya.quedan,
					pedido: pedidoDe(item.id, 'fijar')
				});
			}
		}
	}

	return vidriera;
}

/** Las que ya compró, con el gasto que le quedó fijado. */
export function loQueTiene(estado: Estado, rol: Rol): EnLaVidriera[] {
	const compradas = estado.inversiones?.[rol] ?? [];
	return compradas
		.map((c): EnLaVidriera | null => {
			const item = inversion(c.id);
			if (!item) return null;
			return {
				...item,
				// Lo atado se muestra con su otro nombre: es lo que lo hace distinto.
				nombre: c.fijo && item.fijo ? item.fijo.nombre : item.nombre,
				efecto: c.fijo && item.fijo ? item.fijo.efecto : item.efecto,
				precioUsd: precioDe(estado, item, c.fijo),
				porTemporadaUsd: c.porTemporadaUsd,
				modo: 'comprar' as const,
				quedan: c.quedan,
				// Lo atado ya no se gasta: se muestra sin cuenta regresiva.
				dura: c.fijo ? undefined : item.dura,
				pedido: item.id
			};
		})
		.filter((i): i is EnLaVidriera => i !== null);
}

function idsDe(estado: Estado, rol: Rol): string[] {
	return (estado.inversiones?.[rol] ?? []).map((c) => c.id);
}

function plataDe(estado: Estado, rol: Rol): number {
	return rol === 'futbolista' ? estado.futbolista.dineroUsd : estado.representante.dineroUsd;
}

function cobrarle(estado: Estado, rol: Rol, cuanto: number): void {
	if (rol === 'futbolista') estado.futbolista.dineroUsd -= cuanto;
	else estado.representante.dineroUsd -= cuanto;
}

/** Lo que se le va todos los años en lo que ya tiene. */
export function gastoAnual(estado: Estado, rol: Rol): number {
	return (estado.inversiones?.[rol] ?? []).reduce((suma, c) => suma + c.porTemporadaUsd, 0);
}

/**
 * Compra una inversión, si le alcanza.
 *
 * No avisa cuando no le alcanza: la pantalla ya muestra el precio y lo que
 * tiene. Devuelve la línea para el diario, o `null` si no compró nada.
 */
export function comprar(estado: Estado, rol: Rol, pedido: string | undefined): string | null {
	if (!pedido || pedido === NADA) return null;

	const { id, modo } = partirPedido(pedido);
	const item = inversion(id);
	if (!item || item.de !== rol) return null;

	const yaTiene = estado.inversiones?.[rol] ?? [];
	const ya = yaTiene.find((c) => c.id === item.id);

	/*
	 * Qué se puede hacer con cada cosa.
	 *
	 * Renovar necesita tenerlo suelto: no se estira lo que no existe ni lo que
	 * ya no se gasta. Atar no lo necesita —se puede empezar atado, el que ya
	 * sabe que lo va a querer todos los años no tiene por qué empezar suelto—,
	 * pero sí que sea un consumible con versión fija y que no esté ya atado.
	 * Y comprar suelto es solo para lo que no se tiene.
	 */
	if (modo === 'renovar' && (!ya || !item.dura || ya.fijo)) return null;
	if (modo === 'fijar' && (!item.dura || !item.fijo || ya?.fijo)) return null;
	if (modo === 'comprar' && ya) return null;

	const fijo = modo === 'fijar';
	const precio = precioDe(estado, item, fijo);
	if (plataDe(estado, rol) < precio) return null;

	cobrarle(estado, rol, precio);
	const porTemporadaUsd = mantenimientoDe(estado, item, fijo);

	estado.inversiones = {
		futbolista: [...(estado.inversiones?.futbolista ?? [])],
		representante: [...(estado.inversiones?.representante ?? [])]
	};

	if (!ya) {
		// No lo tenía: entra nuevo, suelto o atado según lo que haya pedido.
		estado.inversiones[rol] = [
			...yaTiene,
			{
				id: item.id,
				porTemporadaUsd,
				...(item.dura && !fijo ? { quedan: item.dura } : {}),
				...(fijo ? { fijo: true } : {})
			}
		];
		// El empujón único es de comprarlo, no de renovarlo: se siente una vez.
		aplicarDeUnaVez(estado, item);
	} else if (modo === 'renovar') {
		// Le suma temporadas a lo que le quedaba: renovar antes de que se termine
		// no desperdicia lo que sobraba, que sería castigar al que se adelanta.
		estado.inversiones[rol] = yaTiene.map((c) =>
			c.id === item.id ? { ...c, quedan: (c.quedan ?? 0) + (item.dura ?? 1) } : c
		);
	} else {
		// Atarlo: deja de gastarse y pasa a pagarse todos los años.
		estado.inversiones[rol] = yaTiene.map((c) =>
			c.id === item.id ? { id: c.id, porTemporadaUsd, fijo: true } : c
		);
	}

	const cuanto = `USD ${precio.toLocaleString('es-AR')}`;
	const porAnio = `USD ${porTemporadaUsd.toLocaleString('es-AR')} por año`;

	if (modo === 'renovar') {
		const restan = (ya?.quedan ?? 0) + (item.dura ?? 1);
		return (
			`${item.nombre}, renovado por ${cuanto}. Te ${restan === 1 ? 'queda' : 'quedan'} ` +
			`${restan} ${restan === 1 ? 'temporada' : 'temporadas'}.`
		);
	}
	if (fijo) {
		const nombre = item.fijo?.nombre ?? item.nombre;
		return `${nombre}: ${cuanto}, y ${porAnio} de acá en adelante. Ya no se te termina nunca.`;
	}
	if (item.dura) {
		return (
			`${item.nombre}: ${cuanto} por ${item.dura} ` +
			`${item.dura === 1 ? 'temporada' : 'temporadas'}. ${item.efecto}.`
		);
	}
	return `${item.nombre}: ${cuanto}, y ${porAnio} de acá en adelante. ${item.efecto}.`;
}

/**
 * Aplica un `LoQueDa`. Es lo único que sabe cómo se cobra una carta.
 *
 * Un solo lugar, y a propósito: mientras estuvo repartido en `if (item.id ===
 * ...)` había tres funciones que podían discrepar entre sí y con el texto de
 * la tarjeta.
 */
function cobrar(estado: Estado, da: LoQueDa | undefined): void {
	if (!da) return;
	const f = estado.futbolista;
	const r = estado.representante;
	const acotar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

	if (da.desgaste) f.desgaste = acotar(f.desgaste + da.desgaste);
	if (da.forma) f.forma = acotar(f.forma + da.forma);
	if (da.moral) f.moral = acotar(f.moral + da.moral);
	if (da.fama) f.fama = acotar(f.fama + da.fama);
	if (da.prensa) f.prensa = acotar(f.prensa + da.prensa, -100, 100);
	if (da.hinchada) f.hinchada = acotar(f.hinchada + da.hinchada);
	if (da.dt) f.dt = acotar(f.dt + da.dt, -100, 100);
	if (da.confianza) estado.confianza = acotar(estado.confianza + da.confianza);
	if (da.loQueMasUsa) {
		const cual = atributosQueUsa(f.posicion)[0];
		f.atributos[cual] = acotar(f.atributos[cual] + da.loQueMasUsa);
	}
	if (da.negociacion) r.atributos.negociacion = acotar(r.atributos.negociacion + da.negociacion);
	if (da.scouting) r.atributos.scouting = acotar(r.atributos.scouting + da.scouting);
	if (da.contactos) r.atributos.contactos = acotar(r.atributos.contactos + da.contactos);
	if (da.carisma) r.atributos.carisma = acotar((r.atributos.carisma ?? 32) + da.carisma);
	if (da.prestigio) r.prestigio = acotar(r.prestigio + da.prestigio);
}

/** El empujón único del momento de comprarla. */
function aplicarDeUnaVez(estado: Estado, item: Inversion): void {
	cobrar(estado, item.alComprar);
}

export type Mantenimiento = { texto: string; visiblePara: Rol }[];

/**
 * Lo que pasa al cerrar la temporada: se cobran los gastos y se aplica lo que
 * cada inversión da por año.
 *
 * El que no puede pagar la pierde. Sin eso, comprar sería una decisión de una
 * sola vez y no una cuenta que hay que sostener, y la mitad de la gracia de
 * tener plata es que se puede dejar de tener.
 */
export function cobrarMantenimiento(estado: Estado): Mantenimiento {
	const lineas: Mantenimiento = [];

	for (const rol of ['futbolista', 'representante'] as const) {
		const tiene = estado.inversiones?.[rol] ?? [];
		if (tiene.length === 0) continue;

		const quedan: Comprada[] = [];
		for (const comprada of tiene) {
			const item = inversion(comprada.id);
			if (!item) continue;

			// Los consumibles sueltos no se pagan otra vez: se gastan. Los atados sí,
			// y por eso caen abajo, con el staff: se cobran todos los años y se
			// pierden el año que no se puedan pagar.
			if (item.dura && !comprada.fijo) {
				const restan = (comprada.quedan ?? 1) - 1;
				if (restan > 0) {
					// Lo que hace todos los años lo hace también mientras dura: un
					// consumible que se paga por tres temporadas tiene que rendir las
					// tres, no solo la primera.
					aplicarPorTemporada(estado, item);
					quedan.push({ ...comprada, quedan: restan });
				} else {
					lineas.push({
						visiblePara: rol,
						texto: `Se te terminaron ${item.nombre.toLowerCase()}. Duraron lo que tenían que durar.`
					});
				}
				continue;
			}

			if (plataDe(estado, rol) >= comprada.porTemporadaUsd) {
				cobrarle(estado, rol, comprada.porTemporadaUsd);
				quedan.push(comprada);
				aplicarPorTemporada(estado, item);
			} else {
				const comoSeLlama =
					comprada.fijo && item.fijo ? item.fijo.nombre.toLowerCase() : item.nombre.toLowerCase();
				lineas.push({
					visiblePara: rol,
					texto: `No pudiste sostener ${comoSeLlama} y lo perdiste. La plata se termina.`
				});
			}
		}

		estado.inversiones = {
			futbolista: [...(estado.inversiones?.futbolista ?? [])],
			representante: [...(estado.inversiones?.representante ?? [])]
		};
		estado.inversiones[rol] = quedan;
	}

	return lineas;
}

/** Lo que cada inversión hace todas las temporadas. */
function aplicarPorTemporada(estado: Estado, item: Inversion): void {
	cobrar(estado, item.porTemporada);
}

/** Las que tiene puestas hoy, con su ficha completa. */
function lasQueTiene(estado: Estado, rol: Rol): Inversion[] {
	return (estado.inversiones?.[rol] ?? [])
		.map((c) => inversion(c.id))
		.filter((i): i is Inversion => i !== undefined);
}

/** Cuánto multiplican entre todas una de las tres cuentas. */
function multiplicador(estado: Estado, cual: 'crecimiento' | 'produccion' | 'lesion'): number {
	let total = 1;
	for (const item of lasQueTiene(estado, 'futbolista')) total *= item.multiplica?.[cual] ?? 1;
	return total;
}

/** El piso de moral que da el psicólogo, para que lo use la temporada. */
export function pisoDeMoral(estado: Estado): number {
	return Math.max(0, ...lasQueTiene(estado, 'futbolista').map((i) => i.pisoDeMoral ?? 0));
}

function tiene(estado: Estado, id: string): boolean {
	return (estado.inversiones?.futbolista ?? []).some((c) => c.id === id);
}

/** Cuánto más se aprovecha una temporada con analista propio. */
export function aprovechaExtra(estado: Estado): number {
	return multiplicador(estado, 'crecimiento');
}

/** Cuánto multiplican los botines lo que produce en la cancha. */
export function empujeDeLosBotines(estado: Estado): number {
	return multiplicador(estado, 'produccion');
}

/** Y cuánto le baja el fisio el riesgo de romperse. */
export function riesgoDeLesionExtra(estado: Estado): number {
	return multiplicador(estado, 'lesion');
}
