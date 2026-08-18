import { club } from '../../../content/mundo';
import { chance, unCompaniero, type Plantilla } from './ocasion-tipos';

/**
 * Los momentos que no pasan con la pelota.
 *
 * Alan lo pidió con la lista adentro: "hay que empezar a poner momentos más
 * icónicos, como te llaman de un programa de chimentos"; y antes: "tenemos que
 * tener una batería de momentos (sociales, prensa, lesiones, comidas, incluso
 * cosas turbias, momento del partido, árbitros, tarjetas, etc.)".
 *
 * Eran cinco. Con cinco, un jugador de quince temporadas veía tres veces el
 * mismo micrófono y dos veces la misma multa, y para la sexta ya sabía de
 * memoria cuál era la opción buena. Ahora son veintitrés, repartidos en
 * familias, y el sorteo no repite familia dentro del mismo año.
 *
 * Lo que tienen en común es que no se resuelven con los pies. La probabilidad
 * de casi todos sale del liderazgo —que es lo más parecido a "cómo se para
 * frente a la gente" que tiene el jugador— y algunos usan resistencia cuando
 * lo que se juega es el cuerpo. Los que dependen del físico no se pueden ganar
 * con carisma, y ésa es justamente la gracia de que existan.
 */
export const DE_LA_VIDA: Plantilla[] = [
	// -------------------------------------------------------------------------
	// Vestuario
	// -------------------------------------------------------------------------
	(a) => ({
		id: 'el-pibe-del-club',
		juego: 'quiz',
		familia: 'vestuario',
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
		familia: 'vestuario',
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
		id: 'el-pedido',
		juego: 'dado',
		familia: 'vestuario',
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
	}),
	(a, e) => ({
		id: 'la-cinta-del-vestuario',
		juego: 'quiz',
		familia: 'vestuario',
		titulo: 'El que se tiene que ir',
		contexto:
			`${unCompaniero(e)} está afuera del equipo hace tres meses y en el vestuario ya se habla de ` +
			`que se va. Te para en el pasillo y te pregunta si vos harías lío.`,
		opciones: [
			{
				id: 'bancarlo',
				etiqueta: 'Decirle que haga lío',
				detalle: 'Es tu compañero. Después el técnico se entera de quién le dijo qué.',
				probabilidad: chance(44, a.liderazgo, 0.5),
				siSale: 'Hizo lío, lo pusieron, y la metió. Se acuerda de quién lo empujó.',
				siFalla: 'Hizo lío, lo mandaron a la reserva, y el cuerpo técnico ató cabos.',
				premio: { moral: 5, hinchada: 3 },
				castigo: { dt: -8, moral: -3 }
			},
			{
				id: 'calmarlo',
				etiqueta: 'Decirle que se aguante',
				detalle: 'Lo que dice el que ya la pasó. No siempre es lo que se quiere escuchar.',
				probabilidad: chance(64, a.liderazgo, 0.35),
				siSale:
					'Se aguantó, entró contra ' + club(e.rival).nombre + ' y la rompió. Te abrazó a vos.',
				siFalla: 'Se aguantó, no jugó más, y no te habló hasta que se fue.',
				premio: { dt: 6, moral: 4, hinchada: 2 },
				castigo: { moral: -4 }
			},
			{
				id: 'no-meterse',
				etiqueta: 'No meterte',
				detalle: 'No es tu tema. Tampoco te va a costar nada.',
				probabilidad: 100,
				siSale: 'Le dijiste que no sabías qué decirle. Era verdad.',
				siFalla: '',
				premio: {},
				castigo: { moral: -1 }
			}
		]
	}),

	// -------------------------------------------------------------------------
	// Prensa
	// -------------------------------------------------------------------------
	(a, e) => ({
		id: 'la-camara',
		juego: 'dado',
		familia: 'prensa',
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
		id: 'el-programa',
		juego: 'quiz',
		familia: 'prensa',
		titulo: 'El programa de chimentos',
		contexto:
			`Te llaman del programa de la tarde. No es un programa de fútbol: es el de los chimentos, el ` +
			`que mira todo el país mientras almuerza. ${e.periodista} quiere media hora con vos y avisa, ` +
			`sin vueltas, que va a preguntar por tu vida privada.`,
		opciones: [
			{
				id: 'ir',
				etiqueta: 'Ir y bancarte las preguntas',
				detalle: 'Media hora en horario central. Te conoce gente que no mira fútbol.',
				probabilidad: chance(48, a.liderazgo, 0.5),
				siSale:
					'Saliste simpático, contestaste todo sin ofender a nadie y al otro día te reconocían en la calle.',
				siFalla:
					'Te sacaron una frase de contexto y la pasaron en loop tres días. En el club no cayó bien.',
				premio: { fama: 14, prensa: 7, moral: 3 },
				castigo: { fama: 6, prensa: -9, dt: -4, confianza: -3 }
			},
			{
				id: 'condiciones',
				etiqueta: 'Ir, pero pactando de qué se habla',
				detalle: 'Menos ruido y menos alcance. Hay que saber pedirlo.',
				probabilidad: chance(58, a.liderazgo, 0.4),
				siSale: 'Aceptaron las condiciones y salió una nota amable. Ganaste sin pagar nada.',
				siFalla: 'Aceptaron y después preguntaron igual. En vivo no se puede cortar.',
				premio: { fama: 7, prensa: 5 },
				castigo: { fama: 4, prensa: -5, moral: -3 }
			},
			{
				id: 'no-ir',
				etiqueta: 'Decir que no',
				detalle: 'No sale nada. Tampoco pasa nada.',
				probabilidad: 100,
				siSale: 'Dijiste que no. Hablaron de vos igual, pero sin vos.',
				siFalla: '',
				premio: {},
				castigo: { fama: 1, prensa: -1 }
			}
		]
	}),
	(a, e) => ({
		id: 'la-operacion',
		juego: 'dado',
		familia: 'prensa',
		titulo: 'La nota que no diste',
		contexto:
			`Salió una nota firmada por ${e.periodista} con cosas que vos no dijiste nunca. No es un error: ` +
			`está armada, y en el club hay alguien que la mandó a armar.`,
		opciones: [
			{
				id: 'desmentir',
				etiqueta: 'Salir a desmentir',
				detalle: 'Cuanto antes mejor. También le da otro día de vida.',
				probabilidad: chance(52, a.liderazgo, 0.45),
				siSale: 'Lo desmentiste con nombre y apellido y el que la armó quedó expuesto.',
				siFalla: 'Le diste otro día de aire. Ahora la nota es que vos desmentiste.',
				premio: { prensa: 7, hinchada: 4, moral: 3 },
				castigo: { prensa: -6, moral: -4 }
			},
			{
				id: 'buscarlo',
				etiqueta: 'Buscar al que la mandó',
				detalle: 'Adentro del club. Si acertás, se termina. Si no, hiciste un enemigo.',
				probabilidad: chance(36, a.liderazgo, 0.5),
				siSale: 'Diste con el que la mandó, se lo dijiste de frente y no hubo segunda nota.',
				siFalla: 'Apuntaste al que no era. Ahora tenés dos.',
				premio: { moral: 6, dt: 3, prensa: 3 },
				castigo: { dt: -7, moral: -5, prensa: -3 }
			},
			{
				id: 'callarse',
				etiqueta: 'No decir nada',
				detalle: 'A los tres días no se acuerda nadie. Casi siempre.',
				probabilidad: chance(66, a.liderazgo, 0.25),
				siSale: 'No dijiste nada y murió sola, como mueren casi todas.',
				siFalla: 'El silencio se leyó como que era verdad.',
				premio: { prensa: 2 },
				castigo: { prensa: -5, hinchada: -3 }
			}
		]
	}),
	(a) => ({
		id: 'las-redes',
		juego: 'dado',
		familia: 'prensa',
		titulo: 'El comentario',
		contexto:
			`Perdieron, subiste una foto del partido y abajo hay dos mil comentarios. El primero, con ` +
			`ocho mil "me gusta", te putea a vos y a tu familia. Son las dos de la mañana y lo estás leyendo.`,
		opciones: [
			{
				id: 'contestar',
				etiqueta: 'Contestarle',
				detalle: 'A las dos de la mañana. Nunca sale bien; a veces sale glorioso.',
				probabilidad: chance(34, a.liderazgo, 0.45),
				siSale: 'Le contestaste con una sola línea y fue lo más compartido de la semana.',
				siFalla: 'Le contestaste y captura. Al mediodía estaba en la tele.',
				premio: { fama: 9, hinchada: 6, moral: 4 },
				castigo: { fama: 4, prensa: -7, dt: -3, moral: -5 }
			},
			{
				id: 'borrar',
				etiqueta: 'Borrar la foto y cerrar todo',
				detalle: 'Sacar la mano del fuego. Te vas a dormir peor igual.',
				probabilidad: chance(72, a.liderazgo, 0.25),
				siSale: 'Borraste todo y te dormiste. Al otro día entrenaste como si nada.',
				siFalla: 'Alguien vio que borraste y ésa fue la noticia.',
				premio: { moral: 2 },
				castigo: { prensa: -3, moral: -3 }
			},
			{
				id: 'apagarlo',
				etiqueta: 'Apagar el teléfono',
				detalle: 'Lo que dice el psicólogo del club. Y tiene razón.',
				probabilidad: 100,
				siSale: 'Apagaste el teléfono. Al otro día seguían ahí, pero vos habías dormido.',
				siFalla: '',
				premio: { moral: 2, confianza: 1 },
				castigo: {}
			}
		]
	}),

	// -------------------------------------------------------------------------
	// Árbitros y tarjetas
	// -------------------------------------------------------------------------
	(a, e) => ({
		id: 'el-arbitro',
		juego: 'ruleta',
		familia: 'arbitro',
		titulo: 'El penal que no cobró',
		contexto:
			`${e.arbitro} no cobró un penal que vio todo el estadio. Vas caminando hacia él y todavía ` +
			`estás a tiempo de decidir qué le decís.`,
		opciones: [
			{
				id: 'gritarle',
				etiqueta: 'Írsele al humo',
				detalle: 'Lo que quiere la tribuna. Y lo que tiene el reglamento escrito.',
				probabilidad: chance(28, a.liderazgo, 0.4),
				siSale: 'Se la bancó, te escuchó y te dio la razón sin decirlo. No te sacó nada.',
				siFalla: 'Amarilla directa por protestar, y encima el penal sigue sin cobrarse.',
				premio: { hinchada: 8, moral: 5 },
				castigo: { hinchada: 3, dt: -5, moral: -4, desgaste: 1 }
			},
			{
				id: 'hablarle',
				etiqueta: 'Hablarle al oído',
				detalle: 'Sin gestos, sin cámara. A los árbitros les gusta más así.',
				probabilidad: chance(58, a.liderazgo, 0.45),
				siSale: 'Te escuchó, te dijo que la próxima la mira mejor, y la próxima la miró mejor.',
				siFalla: 'Te dijo que siga el juego y se dio vuelta.',
				premio: { moral: 4, dt: 4, hinchada: 2 },
				castigo: { moral: -2 }
			},
			{
				id: 'seguir',
				etiqueta: 'No decir nada y seguir jugando',
				detalle: 'La mejor respuesta es el segundo tiempo.',
				probabilidad: 100,
				siSale: 'No dijiste nada. En el banco lo notaron.',
				siFalla: '',
				premio: { dt: 3, moral: 1 },
				castigo: {}
			}
		]
	}),
	(a, e) => ({
		id: 'la-amarilla',
		juego: 'dado',
		familia: 'arbitro',
		titulo: 'La amarilla que te deja afuera',
		contexto:
			`Tenés cuatro amarillas. La quinta te deja afuera del partido con ${club(e.rival).nombre}, que ` +
			`es el que querés jugar. Va la pelota dividida y el que llega primero sos vos.`,
		opciones: [
			{
				id: 'entrar',
				etiqueta: 'Entrar igual',
				detalle: 'No se juega a la mitad. El árbitro decide después.',
				probabilidad: chance(46, a.potencia, 0.4),
				siSale: 'Le ganaste limpio y salió jugada de gol. Nadie sacó nada.',
				siFalla: 'Llegaste tarde. Quinta amarilla, y el clásico lo ves de afuera.',
				premio: { hinchada: 6, dt: 5, moral: 5 },
				castigo: { dt: -4, moral: -7, hinchada: -2 }
			},
			{
				id: 'aflojar',
				etiqueta: 'Aflojar y no entrar',
				detalle: 'Guardarse para el que viene. Se ve desde la tribuna.',
				probabilidad: chance(70, a.liderazgo, 0.25),
				siSale: 'Aflojaste, no pasó nada, y llegaste entero al clásico.',
				siFalla: 'Aflojaste, salió el gol de ellos, y se vio clarito quién no fue.',
				premio: { moral: 2 },
				castigo: { hinchada: -7, dt: -6, moral: -4 }
			},
			{
				id: 'buscar-la-quinta',
				etiqueta: 'Buscar la quinta a propósito ahora',
				detalle: 'Sacártela hoy para llegar limpio al que importa. Si se dan cuenta, es peor.',
				probabilidad: chance(40, a.liderazgo, 0.4),
				siSale: 'Salió como jugada de juego y la sacaste sin que nadie sospeche. Clásico limpio.',
				siFalla: 'Fue tan obvio que lo comentaron en la transmisión. Y el clásico igual lo perdés.',
				premio: { moral: 4, dt: 2 },
				castigo: { prensa: -6, dt: -6, hinchada: -4, moral: -3 }
			}
		]
	}),
	(a, e) => ({
		id: 'la-roja-del-companiero',
		juego: 'ruleta',
		familia: 'arbitro',
		titulo: 'La roja del compañero',
		contexto:
			`${e.arbitro} echó a ${unCompaniero(e)} por una que no fue. Quedaron diez, faltan veinte ` +
			`minutos, y todos los de tu equipo están mirando adónde vas vos.`,
		opciones: [
			{
				id: 'ir-al-arbitro',
				etiqueta: 'Encarar al árbitro con todos',
				detalle: 'Ya está echado. Lo que se juega ahora es el resto del partido.',
				probabilidad: chance(30, a.liderazgo, 0.45),
				siSale: 'Se armó el lío pero el árbitro aflojó el resto del partido. No cobró una más.',
				siFalla: 'Terminaron nueve. Y el que se fue segundo fuiste vos.',
				premio: { hinchada: 9, moral: 5 },
				castigo: { dt: -9, hinchada: 2, moral: -6, desgaste: 2 }
			},
			{
				id: 'ordenar',
				etiqueta: 'Ordenar a los tuyos',
				detalle: 'Juntarlos, reacomodar, y aguantar veinte minutos con uno menos.',
				probabilidad: chance(56, (a.liderazgo + a.resistencia) / 2, 0.45),
				siSale: 'Los ordenaste, aguantaron el resultado, y se fueron aplaudidos con diez.',
				siFalla: 'No alcanzó: se cayeron igual y en el segundo palo no había nadie.',
				premio: { dt: 10, hinchada: 7, moral: 6, desgaste: 2 },
				castigo: { moral: -4, desgaste: 2 }
			},
			{
				id: 'jugar-lo-tuyo',
				etiqueta: 'Jugar lo tuyo y nada más',
				detalle: 'Cada uno con lo suyo. Nadie te va a decir nada.',
				probabilidad: 100,
				siSale: 'Jugaste lo tuyo. Ni bien ni mal: jugaste lo tuyo.',
				siFalla: '',
				premio: {},
				castigo: { hinchada: -2 }
			}
		]
	}),

	// -------------------------------------------------------------------------
	// El cuerpo
	// -------------------------------------------------------------------------
	(a, e) => ({
		id: 'el-tironcito',
		juego: 'dado',
		familia: 'lesion',
		titulo: 'El tironcito',
		contexto:
			`Sentiste algo atrás del muslo en el calentamiento. No es nada, o es todo. Falta media hora ` +
			`para jugar con ${club(e.rival).nombre} y el médico te está mirando de lejos.`,
		opciones: [
			{
				id: 'callarse',
				etiqueta: 'No decir nada y jugar',
				detalle: 'Lo que hace todo el mundo. Lo que sale mal una de cada tres veces.',
				probabilidad: chance(48, a.resistencia, 0.5),
				siSale: 'Aguantó los noventa y ni te acordaste. A veces es nada.',
				siFalla: 'Se cortó a los veinte minutos. Salió en camilla y hay tres semanas afuera.',
				premio: { dt: 6, moral: 4, desgaste: 2 },
				castigo: { moral: -9, desgaste: 6, dt: -3 }
			},
			{
				id: 'avisar',
				etiqueta: 'Avisarle al médico',
				detalle: 'Lo correcto. Te perdés el partido y hay quien lo va a leer distinto.',
				probabilidad: chance(76, a.resistencia, 0.2),
				siSale: 'Te sacaron a tiempo, no pasó a mayores y en dos días estabas entrenando.',
				siFalla: 'Igual estabas roto: eran tres semanas desde el calentamiento.',
				premio: { moral: 2, desgaste: -4 },
				castigo: { moral: -5, desgaste: 3, hinchada: -2 }
			},
			{
				id: 'infiltrarse',
				etiqueta: 'Pedir que te infiltren',
				detalle: 'Hoy no lo sentís. En seis meses sí.',
				probabilidad: chance(62, a.resistencia, 0.35),
				siSale: 'Jugaste sin sentir nada y fue de los mejores partidos del año.',
				siFalla: 'Jugaste sin sentir nada, y por eso lo rompiste del todo.',
				premio: { dt: 7, hinchada: 5, moral: 5, desgaste: 5 },
				castigo: { moral: -8, desgaste: 10 }
			}
		]
	}),
	(a) => ({
		id: 'la-recaida',
		juego: 'dado',
		familia: 'lesion',
		titulo: 'La vuelta',
		contexto:
			`Estuviste dos meses afuera y el kinesiólogo dice una semana más. El técnico dice que te ` +
			`necesita el sábado. Los dos te están preguntando a vos.`,
		opciones: [
			{
				id: 'volver-ya',
				etiqueta: 'Volver el sábado',
				detalle: 'El que vuelve antes gana el puesto. El que recae pierde el año.',
				probabilidad: chance(44, a.resistencia, 0.5),
				siSale: 'Volviste, aguantaste sesenta minutos y recuperaste el puesto de una.',
				siFalla: 'Volviste antes de tiempo y a los diez minutos era lo mismo de nuevo, pero peor.',
				premio: { dt: 9, moral: 7, hinchada: 4, desgaste: 3 },
				castigo: { moral: -10, desgaste: 9, dt: -4 }
			},
			{
				id: 'esperar',
				etiqueta: 'Esperar la semana',
				detalle: 'Lo que dice el que sabe. El puesto lo puede agarrar otro.',
				probabilidad: chance(78, a.resistencia, 0.2),
				siSale: 'Esperaste, volviste entero, y no lo sentiste más en todo el año.',
				siFalla: 'Esperaste igual y cuando volviste el puesto ya tenía dueño.',
				premio: { moral: 4, desgaste: -8 },
				castigo: { dt: -6, moral: -4, desgaste: -5 }
			}
		]
	}),

	// -------------------------------------------------------------------------
	// La mesa
	// -------------------------------------------------------------------------
	(a, e) => ({
		id: 'el-asado',
		juego: 'quiz',
		familia: 'mesa',
		titulo: 'El asado del plantel',
		contexto:
			`Hicieron un asado en lo de ${unCompaniero(e)} para juntar al grupo. Es martes, se juega el ` +
			`sábado, y a las once de la noche todavía está la mesa puesta.`,
		opciones: [
			{
				id: 'quedarse',
				etiqueta: 'Quedarte hasta el final',
				detalle: 'El grupo se hace ahí. El cuerpo se paga el sábado.',
				probabilidad: chance(56, a.liderazgo, 0.4),
				siSale: 'Se hizo grupo de verdad esa noche y el sábado se notó en la cancha.',
				siFalla: 'Se hizo tarde, el sábado te faltó aire, y alguien sacó una foto.',
				premio: { moral: 7, dt: 3, hinchada: 2, desgaste: 2 },
				castigo: { desgaste: 5, dt: -4, prensa: -3 }
			},
			{
				id: 'irse-temprano',
				etiqueta: 'Comer e irte',
				detalle: 'Estuviste, saludaste, dormiste. No es lo mismo que quedarse.',
				probabilidad: chance(80, a.liderazgo, 0.15),
				siSale: 'Comiste, saludaste a todos y te fuiste a dormir. Nadie te dijo nada.',
				siFalla: 'Te fuiste temprano y quedó el chiste de que sos el profesional del grupo.',
				premio: { moral: 2, desgaste: -1 },
				castigo: { moral: -2 }
			},
			{
				id: 'no-ir',
				etiqueta: 'No ir',
				detalle: 'Descansás perfecto. Y el grupo se arma sin vos.',
				probabilidad: 100,
				siSale: 'No fuiste. Dormiste nueve horas y el lunes te preguntaron por qué.',
				siFalla: '',
				premio: { desgaste: -3 },
				castigo: { moral: -3, dt: -2 }
			}
		]
	}),
	(a) => ({
		id: 'el-peso',
		juego: 'dado',
		familia: 'mesa',
		titulo: 'La balanza',
		contexto:
			`Volviste de las vacaciones con dos kilos y medio de más y en el club pesan los lunes. El ` +
			`preparador físico anotó el número y no dijo nada, que es peor que si dijera algo.`,
		opciones: [
			{
				id: 'doble-turno',
				etiqueta: 'Doble turno hasta bajarlos',
				detalle: 'Se baja en tres semanas. Se llega cansado a las tres semanas.',
				probabilidad: chance(68, a.resistencia, 0.4),
				siSale: 'Bajaste los dos kilos y medio y llegaste al debut mejor que el año pasado.',
				siFalla: 'Bajaste el peso y llegaste fundido. Se notó en los primeros partidos.',
				premio: { moral: 5, dt: 6, desgaste: 2 },
				castigo: { desgaste: 7, moral: -3 }
			},
			{
				id: 'nutricionista',
				etiqueta: 'Pagarte un nutricionista',
				detalle: 'Más lento, más caro, y no se vuelve a subir.',
				probabilidad: chance(74, a.liderazgo, 0.25),
				siSale: 'Cambiaste cómo comés y no volviste a ver ese número nunca más.',
				siFalla: 'Duraste tres semanas con la dieta y volviste a lo de antes.',
				premio: { desgaste: -6, moral: 4, dt: 3 },
				castigo: { moral: -3 }
			},
			{
				id: 'ignorarlo',
				etiqueta: 'Son dos kilos',
				detalle: 'Y tenés razón. Hasta el partido número diez.',
				probabilidad: chance(40, a.resistencia, 0.45),
				siSale: 'Eran dos kilos. A la tercera fecha no los tenías más y nadie se enteró.',
				siFalla: 'A la décima fecha te faltaban veinte minutos de partido y el técnico lo vio.',
				premio: {},
				castigo: { desgaste: 6, dt: -5, moral: -3 }
			}
		]
	}),

	// -------------------------------------------------------------------------
	// Lo social
	// -------------------------------------------------------------------------
	(a) => ({
		id: 'la-fundacion',
		juego: 'quiz',
		familia: 'social',
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
		id: 'el-casamiento',
		juego: 'dado',
		familia: 'social',
		titulo: 'El casamiento',
		contexto:
			`Se casa tu hermano. Es el sábado a las ocho de la noche, a seiscientos kilómetros, y el ` +
			`sábado a las cinco jugás con ${club(e.rival).nombre}. No hay avión que llegue.`,
		opciones: [
			{
				id: 'pedir-permiso',
				etiqueta: 'Pedirle al técnico que te deje ir',
				detalle: 'Se pide una vez en la vida. A veces alcanza.',
				probabilidad: chance(50, a.liderazgo, 0.45),
				siSale: 'Te dejó ir. Jugaste, saliste a los sesenta y llegaste al brindis.',
				siFalla: 'Te dijo que no, y que si te ibas no volvías a la lista.',
				premio: { moral: 10, confianza: 3 },
				castigo: { moral: -8, dt: -3 }
			},
			{
				id: 'irse-igual',
				etiqueta: 'Ir igual y bancarte lo que venga',
				detalle: 'Tu hermano se casa una vez. El partido es uno de treinta.',
				probabilidad: chance(34, a.liderazgo, 0.4),
				siSale: 'Fuiste. Y cuando volviste el lunes, el vestuario entero te la bancó.',
				siFalla: 'Fuiste, y volviste a la reserva. Ni el técnico ni la prensa lo dejaron pasar.',
				premio: { moral: 12, hinchada: 3 },
				castigo: { dt: -14, prensa: -6, moral: 4 }
			},
			{
				id: 'no-ir',
				etiqueta: 'No ir',
				detalle: 'Es tu laburo. Y va a doler igual.',
				probabilidad: 100,
				siSale: 'No fuiste. Jugaste bien. Lo viste por video a la una de la mañana.',
				siFalla: '',
				premio: { dt: 4 },
				castigo: { moral: -7 }
			}
		]
	}),
	(a) => ({
		id: 'el-amigo',
		juego: 'quiz',
		familia: 'social',
		titulo: 'El amigo de siempre',
		contexto:
			`Un amigo de toda la vida te viene a pedir plata para poner un negocio. No es la primera ` +
			`vez que alguien te pide, pero es la primera vez que te lo pide él.`,
		opciones: [
			{
				id: 'darsela',
				etiqueta: 'Dársela sin preguntar',
				detalle: 'Es un amigo. Y así se pierden los amigos.',
				probabilidad: chance(46, a.liderazgo, 0.35),
				siSale: 'Le fue bien, te devolvió todo, y siguen siendo amigos. Pasa.',
				siFalla: 'Se fundió, no te devolvió nada, y ahora no se hablan.',
				premio: { moral: 6, confianza: 2 },
				castigo: { moral: -8 }
			},
			{
				id: 'ser-socio',
				etiqueta: 'Entrar como socio',
				detalle: 'Ponés plata y ponés nombre. Los dos se pueden perder.',
				probabilidad: chance(42, a.liderazgo, 0.4),
				siSale: 'Salió bien y te quedó algo tuyo fuera del fútbol. No es poco.',
				siFalla: 'Salió mal, salió con tu nombre, y salió en el diario.',
				premio: { moral: 5, fama: 4, confianza: 3 },
				castigo: { moral: -6, prensa: -5 }
			},
			{
				id: 'decirle-que-no',
				etiqueta: 'Decirle que no',
				detalle: 'Lo más difícil de la lista.',
				probabilidad: 100,
				siSale: 'Le dijiste que no y le explicaste por qué. Se lo bancó mejor de lo que esperabas.',
				siFalla: '',
				premio: { confianza: 2 },
				castigo: { moral: -3 }
			}
		]
	}),

	// -------------------------------------------------------------------------
	// Lo turbio
	// -------------------------------------------------------------------------
	(a, e) => ({
		id: 'el-sobre',
		juego: 'dado',
		familia: 'turbio',
		titulo: 'El partido que no importa',
		contexto:
			`Faltan dos fechas, ustedes no se juegan nada y ${club(e.rival).nombre} se juega la ` +
			`permanencia. Alguien que no te dice para quién trabaja te hace saber que hay plata para ` +
			`el que juegue tranquilo.`,
		opciones: [
			{
				id: 'agarrar',
				etiqueta: 'Agarrar',
				detalle: 'Nadie se entera. Casi nadie.',
				probabilidad: chance(52, a.liderazgo, 0.3),
				siSale: 'Nadie se enteró nunca. Vos sí.',
				siFalla:
					'Alguien habló. No hubo pruebas, pero en el ambiente quedó y en el ambiente alcanza.',
				premio: { moral: -4 },
				castigo: { prensa: -14, hinchada: -12, dt: -8, moral: -10, confianza: -8 }
			},
			{
				id: 'avisar',
				etiqueta: 'Contarlo en el club',
				detalle: 'Lo correcto. También te convierte en el que habló.',
				probabilidad: chance(58, a.liderazgo, 0.4),
				siSale: 'Lo contaste, lo manejaron puertas adentro, y quedaste como alguien serio.',
				siFalla: 'Se filtró que fuiste vos el que habló. En el vestuario se enfrió todo.',
				premio: { dt: 8, prensa: 6, moral: 6, confianza: 4 },
				castigo: { moral: -4, dt: -3 }
			},
			{
				id: 'decir-que-no',
				etiqueta: 'Decir que no y no contarlo',
				detalle: 'Ni plata ni problema. Y el tipo va a preguntarle a otro.',
				probabilidad: 100,
				siSale: 'Le dijiste que no y colgaste. Se lo habrá preguntado a otro.',
				siFalla: '',
				premio: { moral: 2 },
				castigo: {}
			}
		]
	}),
	(a) => ({
		id: 'la-apuesta',
		juego: 'dado',
		familia: 'turbio',
		titulo: 'La app',
		contexto:
			`Empezaste jugando por deporte y hace tres meses que apostás todas las noches. Esta semana ` +
			`va el sueldo de un mes. Nadie lo sabe.`,
		opciones: [
			{
				id: 'parar',
				etiqueta: 'Parar y contárselo a alguien',
				detalle: 'Lo único que funciona. Y lo más difícil de apretar.',
				probabilidad: chance(60, a.liderazgo, 0.4),
				siSale: 'Se lo contaste al psicólogo del club, borraste todo, y no volviste a abrirla.',
				siFalla: 'Lo contaste, aguantaste dos semanas y volviste. Pasa muchas veces.',
				premio: { moral: 8, confianza: 5 },
				castigo: { moral: -5 }
			},
			{
				id: 'recuperar',
				etiqueta: 'Recuperar lo perdido y ahí parar',
				detalle: 'Lo que dice todo el mundo antes de perder el doble.',
				probabilidad: chance(24, a.liderazgo, 0.2),
				siSale: 'Recuperaste, cerraste la cuenta y zafaste. No le pasa a casi nadie.',
				siFalla: 'Perdiste el doble. Y ahora hay alguien afuera del club que sabe cuánto debés.',
				premio: { moral: 3 },
				castigo: { moral: -12, confianza: -8, prensa: -6, dt: -4 }
			},
			{
				id: 'seguir',
				etiqueta: 'No es un problema',
				detalle: 'Todavía no.',
				probabilidad: chance(38, a.liderazgo, 0.25),
				siSale: 'Esta vez ganaste. Eso es lo peor que podía pasar.',
				siFalla: 'Esta semana fue el sueldo. La que viene va a ser más.',
				premio: { moral: 2 },
				castigo: { moral: -9, confianza: -5 }
			}
		]
	}),

	// -------------------------------------------------------------------------
	// La plata
	// -------------------------------------------------------------------------
	(a) => ({
		id: 'la-marca',
		juego: 'quiz',
		familia: 'plata',
		titulo: 'La marca',
		contexto:
			`Te ofrecen ser la cara de una marca de gaseosas por un año. Es buena plata, es mucha ` +
			`exposición, y hay que filmar tres días en pleno campeonato.`,
		opciones: [
			{
				id: 'firmar',
				etiqueta: 'Firmar',
				detalle: 'Plata y cámara. Tres días que salen del descanso.',
				probabilidad: chance(66, a.liderazgo, 0.3),
				siSale: 'Salió la campaña, la vio todo el país y no se resintió tu rendimiento.',
				siFalla: 'Se te hizo pesado el mes y el técnico ató la baja de nivel a la filmación.',
				premio: { fama: 11, prensa: 5, moral: 3, desgaste: 2 },
				castigo: { fama: 7, dt: -6, desgaste: 4, moral: -3 }
			},
			{
				id: 'negociar',
				etiqueta: 'Pedir que filmen en la pretemporada',
				detalle: 'Menos plata, cero costo deportivo. Hay que saber pedirlo.',
				probabilidad: chance(52, a.liderazgo, 0.4),
				siSale: 'Aceptaron correrlo a la pretemporada. Ganaste todo y no perdiste nada.',
				siFalla: 'No aceptaron y se cayó. Se lo ofrecieron a otro esa misma semana.',
				premio: { fama: 8, prensa: 4, confianza: 3 },
				castigo: { fama: -1 }
			},
			{
				id: 'no-firmar',
				etiqueta: 'No firmar',
				detalle: 'Este año, a lo tuyo.',
				probabilidad: 100,
				siSale: 'Dijiste que no. Todo el año fue fútbol y nada más.',
				siFalla: '',
				premio: { dt: 3 },
				castigo: {}
			}
		]
	}),
	(a) => ({
		id: 'el-sueldo-atrasado',
		juego: 'quiz',
		familia: 'plata',
		titulo: 'Los sueldos atrasados',
		contexto:
			`El club debe tres meses. Los pibes de inferiores viajan de su bolsillo y hay dos que no ` +
			`comen bien. El plantel se junta y todos miran a los que tienen espalda para hablar.`,
		opciones: [
			{
				id: 'no-entrenar',
				etiqueta: 'Proponer no entrenar hasta que paguen',
				detalle: 'Es lo que funciona. Es lo que la tribuna no perdona.',
				probabilidad: chance(42, a.liderazgo, 0.5),
				siSale: 'Pararon dos días, aparecieron dos meses, y los pibes cobraron primero.',
				siFalla: 'Salió que los millonarios no querían entrenar. La tribuna se les vino encima.',
				premio: { moral: 8, confianza: 5, hinchada: 3 },
				castigo: { hinchada: -10, prensa: -8, dt: -4 }
			},
			{
				id: 'hablar-con-dirigentes',
				etiqueta: 'Ir vos solo a hablar con los dirigentes',
				detalle: 'Sin ruido y sin cámaras. Y sin fuerza, también.',
				probabilidad: chance(50, a.liderazgo, 0.45),
				siSale: 'Fuiste, hablaste, y a la semana estaba depositado. Nadie se enteró de por qué.',
				siFalla: 'Te dieron una fecha y no la cumplieron. Perdiste dos semanas.',
				premio: { moral: 7, dt: 5, confianza: 4 },
				castigo: { moral: -4 }
			},
			{
				id: 'poner-vos',
				etiqueta: 'Poner vos lo de los pibes',
				detalle: 'Arregla a los pibes. No arregla el problema.',
				probabilidad: chance(84, a.liderazgo, 0.15),
				siSale: 'Los pibes viajaron y comieron. No lo contó nadie y se supo igual.',
				siFalla: 'Lo contó alguien y quedó como una foto. Igual los pibes comieron.',
				premio: { moral: 9, hinchada: 6, confianza: 3 },
				castigo: { moral: 5, prensa: -3 }
			}
		]
	})
];
