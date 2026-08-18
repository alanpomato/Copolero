import { club } from '../../../content/mundo';
import { media } from './estado';
import { PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO } from './temporada';
import { TEMPORADAS_MAXIMAS } from './fases';
import { comoVaElSueno, sueno } from './suenos';
import type { Estado, Rol } from './tipos';

/**
 * Lo que hay que decirle en la cara.
 *
 * El juego tiene varias formas de terminar mal en silencio: no jugar nunca,
 * quedarse hasta que el cuerpo no da más, romper la relación. Todas se ven en
 * los números, pero los números no gritan, y una partida que se muere de a poco
 * es una partida que se abandona.
 *
 * Una alerta no decide nada ni cambia nada: dice qué está pasando, qué va a
 * pasar si sigue así, y cuál es la salida. La decisión sigue siendo de los dos
 * jugadores, que es la única regla que no se toca.
 */

export type Alerta = {
	id: string;
	titulo: string;
	texto: string;
	/** Qué hacer. Una sola cosa, y concreta. */
	salida: string;
	gravedad: 'roja' | 'amarilla';
};

/** Temporadas seguidas sin jugar antes de que el juego lo diga en voz alta. */
const TEMPORADAS_DE_BANCO_PARA_ALARMARSE = 2;

/** Partidos por debajo de los cuales una temporada no fue una temporada. */
const APENAS_JUGO = 8;

/**
 * La alerta de este momento, o `null` si no hay ninguna.
 *
 * Se devuelve una sola. Con tres avisos a la vez no se lee ninguno, así que
 * están ordenadas por lo que mata antes la carrera.
 */
export function alertaDe(estado: Estado, rol: Rol): Alerta | null {
	const f = estado.futbolista;
	const historial = estado.historial ?? [];
	const ultimas = historial.slice(-TEMPORADAS_DE_BANCO_PARA_ALARMARSE);
	const donde = club(f.contrato.clubId).nombre;

	// --- No juega -------------------------------------------------------------
	// Es la peor, y de lejos: sin minutos no mejora, y sin mejorar no va a jugar
	// nunca. Es la única espiral del juego de la que no se sale sola.
	if (
		ultimas.length === TEMPORADAS_DE_BANCO_PARA_ALARMARSE &&
		ultimas.every((h) => h.partidos < APENAS_JUGO)
	) {
		const total = ultimas.reduce((suma, h) => suma + h.partidos, 0);
		return {
			id: 'no-juega',
			titulo: 'No está jugando',
			texto:
				`${total} ${total === 1 ? 'partido' : 'partidos'} en las últimas ` +
				`${TEMPORADAS_DE_BANCO_PARA_ALARMARSE} temporadas. En ${donde} le queda grande el puesto, y ` +
				`el que no juega no mejora: los minutos son lo que sube los atributos. ` +
				`Cada año más acá es un año de carrera perdido.`,
			salida:
				rol === 'futbolista'
					? 'En el mercado, buscá un club donde seas titular aunque sea más chico. Bajar para jugar es cómo se salva una carrera.'
					: 'Buscale un club donde entre. Un pase para abajo hoy vale más que una renovación que lo deja en el banco.',
			gravedad: 'roja'
		};
	}

	// --- Se está quedando sin cuerpo -----------------------------------------
	if (f.desgaste >= 82) {
		return {
			id: 'cuerpo',
			titulo: 'El cuerpo se está terminando',
			texto:
				`Desgaste ${f.desgaste} de 100. A los ${f.edad} años cada pretemporada exigida ` +
				`acorta lo que queda, y en 100 se retira.`,
			salida:
				rol === 'futbolista'
					? 'Entrená suave. Vas a subir menos, pero vas a llegar a jugar dos o tres temporadas más.'
					: 'Es el momento de cerrar el último contrato bueno, no de exigirle otra temporada.',
			gravedad: 'roja'
		};
	}

	// --- La relación ----------------------------------------------------------
	if (estado.confianza < 25) {
		return {
			id: 'relacion',
			titulo: 'La relación está rota',
			texto:
				`Confianza ${estado.confianza} de 100. Así no se ponen de acuerdo en el mercado, y un ` +
				`pase que se cae por no hablarse la baja todavía más.`,
			salida:
				rol === 'futbolista'
					? 'Hablá antes de cerrar la fase: dejale una nota con lo que querés hacer.'
					: 'Dejá de sacarle plata una fase y acompañalo. La confianza sube estando.',
			gravedad: 'roja'
		};
	}

	// --- Lo que se juega en este mercado --------------------------------------
	// El que va por las diez temporadas en la misma camiseta y lleva seis tiene
	// que saber, antes de mirar las ofertas, que aceptar una lo devuelve a cero.
	// Es la advertencia más importante del juego, porque es la única decisión que
	// borra de un saque el trabajo de media carrera, y encima es la decisión donde
	// el representante cobra comisión: los dos tienen que ver el mismo número.
	const casa = sueno('el-de-la-casa');
	if (estado.fase === 3 && estado.suenos?.futbolista === 'el-de-la-casa' && casa) {
		const acumuladas = estado.temporadasPorClub?.[f.contrato.clubId] ?? 0;
		if (acumuladas >= 4 && acumuladas < casa.meta) {
			return {
				id: 'sueno-se-va',
				titulo: `Se juega ${acumuladas} ${acumuladas === 1 ? 'temporada' : 'temporadas'} en este mercado`,
				texto:
					`Lleva ${acumuladas} temporadas en ${donde} y su sueño son ${casa.meta} en el mismo club. ` +
					`Si acepta un pase, la cuenta vuelve a cero y ya no le da el tiempo para empezarla ` +
					`de nuevo en otro lado.`,
				salida:
					rol === 'futbolista'
						? 'Si querés el sueño, este mercado se cierra con "quedarse", por más que la oferta sea buena.'
						: 'Sabelo antes de empujar el pase: la comisión la cobrás una vez y el sueño de él se pierde para siempre. Habláchenlo.',
				gravedad: 'amarilla'
			};
		}
	}

	// --- No le va a dar el tiempo ---------------------------------------------
	// Al ritmo que viene y con las temporadas que le quedan, no llega. Se dice una
	// sola vez y tarde —recién pasada la mitad de la carrera—, porque avisarle en
	// la cuarta temporada que le faltan noventa goles no es información, es
	// desánimo. Dicho a tiempo, en cambio, todavía se puede corregir: subir de
	// liga, entrenar a matar —que empuja el sorteo del objetivo para ese lado—,
	// jugar más.
	const suSueno = comoVaElSueno(estado, rol);
	if (suSueno && !suSueno.cumplido && estado.temporada >= 9) {
		const quedan = Math.max(0, TEMPORADAS_MAXIMAS - estado.temporada);
		const ritmo = suSueno.cuanto / Math.max(1, estado.temporada - 1);
		const alcanzaria = suSueno.cuanto + ritmo * quedan;
		if (quedan >= 2 && alcanzaria < suSueno.meta * 0.85) {
			return {
				id: 'sueno-no-llega',
				titulo: 'Al ritmo de ahora no llega',
				texto:
					`${suSueno.falta} para ${suSueno.nombre.toLowerCase()}, y quedan unas ${quedan} temporadas. ` +
					`Con lo que viene haciendo por año no da: hace falta que cambie algo.`,
				salida:
					rol === 'futbolista'
						? 'Entrená a matar —empuja el sorteo del objetivo hacia el gol o los minutos— y buscá un club donde juegues todo. Los minutos son lo único que mueve todos los números a la vez.'
						: 'Es el momento de mover el pase que le cambie el año, no de estirar el contrato que ya tiene.',
				gravedad: 'amarilla'
			};
		}
	}

	// --- Estancado ------------------------------------------------------------
	// Joven, jugando, y hace tres años que no se mueve la media: o llegó a su
	// techo o está en el club equivocado. Las dos cosas hay que saberlas.
	const tres = historial.slice(-3);
	if (
		f.edad <= 25 &&
		tres.length === 3 &&
		tres.every((h) => h.partidos >= APENAS_JUGO) &&
		tres[2].media - tres[0].media <= 1
	) {
		return {
			id: 'estancado',
			titulo: 'Hace tres temporadas que no crece',
			texto:
				`Su media está en ${media(f.atributos, f.posicion)} desde hace tres años, y todavía tiene ` +
				`${f.edad}. Puede ser que haya llegado a su techo, o que en ${donde} no le exijan lo suficiente ` +
				`como para mejorar.`,
			salida:
				rol === 'futbolista'
					? 'Probá subir de liga: se mejora jugando contra mejores. Si tampoco pasa nada, ése es tu techo.'
					: 'Mirá si hay ofertas de una liga más fuerte. Contra mejores rivales se crece más rápido.',
			gravedad: 'amarilla'
		};
	}

	// --- Se le vence y no lo llaman -------------------------------------------
	if (
		f.contrato.temporadasRestantes === 0 &&
		(estado.ultimaTemporada?.partidos ?? 0) < PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO
	) {
		return {
			id: 'sin-contrato',
			titulo: 'Se le vence el contrato y no está jugando',
			texto:
				`El contrato con ${donde} se termina y la última temporada apenas jugó. ` +
				`Sin minutos que mostrar, las ofertas que lleguen van a ser peores que las de ahora.`,
			salida:
				rol === 'futbolista'
					? 'Este mercado es el mejor que vas a tener en un rato. Elegí dónde vas a jugar, no cuánto vas a cobrar.'
					: 'Cerrá algo este mercado. El año que viene, sin partidos encima, vale menos.',
			gravedad: 'amarilla'
		};
	}

	return null;
}
