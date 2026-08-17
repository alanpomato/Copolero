import { club } from '../../../content/mundo';
import { media } from './estado';
import { ofertasPara, type Oferta } from './pases';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * El mercado en dos tiempos.
 *
 * Hasta acá el mercado era simétrico y terminaba en un problema: los dos
 * elegían club y el pase se hacía solo si coincidían. Eso convertía la decisión
 * más importante del juego en un ejercicio de ponerse de acuerdo por fuera del
 * juego, y dejaba al representante sin ningún trabajo propio —Bebo lo dijo con
 * todas las letras: "ahí el representante no tiene ningún rol de negociación".
 *
 * Ahora el mercado tiene dos tiempos, y el trabajo del representante está en el
 * primero. A él le llegan seis clubes. De cada uno sabe qué chance hay de que
 * la operación prospere, y esa chance sale de cruzar lo que pesa el club con lo
 * que valen los dos juntos: la media del futbolista y el prestigio del
 * representante. Elige tres. Cada una de las tres se juega su probabilidad por
 * separado, y solo las que pasan llegan al segundo tiempo.
 *
 * En el segundo tiempo decide el futbolista, y del lado de él ya no hay
 * probabilidades: son los clubes que quedaron, con el sueldo, el pase y los
 * años puestos. Elige uno.
 *
 * La consecuencia es la que Alan buscaba y es la que hace que el rol exista: un
 * representante que elige mal deja al futbolista con dos opciones en vez de
 * tres, o con una, o con ninguna. No le arruina la carrera de un saque, pero le
 * achica el mundo, y eso se siente temporada a temporada.
 */

/** Cuántas le llegan al representante. */
export const CARTAS_DEL_REPRESENTANTE = 6;

/** Y cuántas puede dejar pasar. */
export const CARTAS_QUE_DEJA_PASAR = 3;

export type Carta = Oferta & {
	/** 0–100. Qué chance hay de que esta llegue a manos del futbolista. */
	probabilidad: number;
};

/**
 * Lo que valen los dos juntos.
 *
 * La media pesa más que el prestigio porque al que quieren es al jugador: el
 * representante abre la puerta, no juega el partido. Pero pesa, y ésa es la
 * diferencia entre tener representante y no tenerlo.
 */
export function loQueValenJuntos(estado: Estado): number {
	const f = estado.futbolista;
	const suMedia = media(f.atributos, f.posicion);
	return Math.round(suMedia * 0.7 + estado.representante.prestigio * 0.3);
}

/**
 * Qué chance hay de que el club de verdad avance.
 *
 * Se mide contra el club donde está hoy, no contra un número absoluto: subir de
 * Huracán a Boca y subir de Boca al Madrid son el mismo salto para el que lo
 * da, aunque los prestigios no se parezcan en nada. Lo que empuja es lo que
 * valen los dos juntos, y lo que frena es cuánto más grande es el club nuevo.
 *
 * Bajar de categoría casi siempre sale: al club más chico le sobra con que
 * quieras ir. Lo que hay que ganarse es el salto para arriba.
 */
export function chanceDeQueLlegue(estado: Estado, clubId: string): number {
	const suyo = club(estado.futbolista.contrato.clubId).prestigio;
	const salto = club(clubId).prestigio - suyo;
	const empuje = (loQueValenJuntos(estado) - 50) * 0.55;
	return Math.max(10, Math.min(95, Math.round(72 - salto * 1.9 + empuje)));
}

/** Las seis que le llegan al representante, con su chance puesta. */
export function cartasDelMercado(estado: Estado, semilla: string): Carta[] {
	return ofertasPara(estado, semilla).map((oferta) => ({
		...oferta,
		probabilidad: chanceDeQueLlegue(estado, oferta.clubId)
	}));
}

export type Filtrado = {
	/** Las que el representante dejó pasar y de verdad llegaron. */
	llegaron: string[];
	/** Las que eligió y se le cayeron. Se cuentan: la falla tiene que verse. */
	seCayeron: string[];
};

/**
 * El filtro: qué queda de lo que el representante eligió.
 *
 * Cada carta tira por separado y contra su propia probabilidad. No hay una
 * tirada global ni un "al menos una pasa siempre": si eligió tres imposibles,
 * pueden caerse las tres, y el futbolista se queda sin nada que elegir. Eso no
 * es un castigo escondido —las tres probabilidades estaban a la vista cuando
 * las eligió— y es lo que hace que elegir bien valga algo.
 *
 * Determinista, como todo lo demás: la misma partida da siempre el mismo
 * resultado, así que recargar la página no cambia nada.
 */
export function filtrar(estado: Estado, elegidas: readonly string[], semilla: string): Filtrado {
	const cartas = cartasDelMercado(estado, semilla);
	const llegaron: string[] = [];
	const seCayeron: string[] = [];

	// Solo se miran las que de verdad estaban sobre la mesa, y como mucho tres:
	// un formulario editado no puede dejar pasar seis ni inventar un club.
	const validas = elegidas
		.filter((id, i) => elegidas.indexOf(id) === i)
		.filter((id) => cartas.some((c) => c.clubId === id))
		.slice(0, CARTAS_QUE_DEJA_PASAR);

	for (const [i, clubId] of validas.entries()) {
		const carta = cartas.find((c) => c.clubId === clubId)!;
		const rng = rngPara(semilla, {
			temporada: estado.temporada,
			fase: 3,
			clave: 'filtro-del-representante',
			indice: i
		});
		if (rng.entero(1, 100) <= carta.probabilidad) llegaron.push(clubId);
		else seCayeron.push(clubId);
	}

	return { llegaron, seCayeron };
}
