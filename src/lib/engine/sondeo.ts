import { contexto } from '../../../content/mundo';
import type { Estado } from './tipos';

/**
 * Dónde sale a buscar el representante.
 *
 * Alan lo pidió mirando el mercado: "que el repre tenga la posibilidad de
 * sondear por continente según cantidad de temporadas. O sea, no debería tener
 * ofertas de todos los continentes sino de 2 máximo".
 *
 * Y tenía dos razones distintas para pedirlo. Una es de verosimilitud: un tipo
 * que empezó el año pasado en Buenos Aires no tiene el teléfono de nadie en
 * Alemania, y que en su primer mercado le lleguen ofertas del Bayern rompe la
 * ilusión entera. La otra es de juego: cuando llegan clubes de todo el mundo,
 * el mercado se convierte en una lista y el trabajo del año anterior no se ve
 * en ningún lado. Acotándolo a dos, adónde va a poder ir el futbolista pasa a
 * depender de lo que su representante construyó, que es exactamente lo que el
 * rol tendría que sentirse.
 *
 * El de casa está siempre —donde ya trabaja, trabaja— y el segundo lo elige él
 * en la pretemporada, entre los que su alcance le permita.
 */

export type Confederacion = 'conmebol' | 'concacaf' | 'uefa';

export const CONFEDERACIONES: { id: Confederacion; nombre: string; cuestaLlegar: number }[] = [
	{ id: 'conmebol', nombre: 'Sudamérica', cuestaLlegar: 40 },
	{ id: 'concacaf', nombre: 'Norteamérica', cuestaLlegar: 50 },
	// Europa es el salto que hay que ganarse. Es la puerta más cara del juego y
	// es a propósito: si abrirla fuera gratis, no significaría nada cruzarla.
	{ id: 'uefa', nombre: 'Europa', cuestaLlegar: 78 }
];

/** Dónde está trabajando hoy. Ésa la tiene siempre. */
export function laDeCasa(estado: Estado): Confederacion {
	return contexto(estado.futbolista.contrato.clubId).pais.confederacion as Confederacion;
}

/**
 * Hasta dónde llega su agenda.
 *
 * Los contactos pesan más que todo lo demás porque es literalmente de lo que se
 * trata; el prestigio y los años suman de a poco. Un representante nuevo llega
 * a lo que tiene al lado; uno de diez temporadas con contactos altos llega a
 * cualquier lado —pero sigue eligiendo uno solo por año, que es lo que hace que
 * la decisión exista—.
 */
export function cuantoLlega(estado: Estado): number {
	const r = estado.representante;
	return Math.round(
		r.atributos.contactos + r.prestigio * 0.35 + Math.min(10, estado.temporada - 1) * 2
	);
}

export type Destino = {
	id: Confederacion;
	nombre: string;
	/** Si puede sondear ahí este año. */
	alcanza: boolean;
	/** La de casa: no se elige, se tiene. */
	esLaDeCasa: boolean;
	/** Qué le falta para llegar, cuando no llega. */
	falta: number;
};

/** Los continentes, con si llega a cada uno. Para la pantalla y para el motor. */
export function dondePuedeSondear(estado: Estado): Destino[] {
	const casa = laDeCasa(estado);
	const llega = cuantoLlega(estado);

	return CONFEDERACIONES.map((c) => ({
		id: c.id,
		nombre: c.nombre,
		esLaDeCasa: c.id === casa,
		alcanza: c.id === casa || llega >= c.cuestaLlegar,
		falta: Math.max(0, c.cuestaLlegar - llega)
	}));
}

/**
 * Los dos continentes de este mercado: el de casa y el que eligió.
 *
 * Si no eligió ninguno —o eligió uno al que no llega— queda solamente el de
 * casa. No es un castigo escondido: es que no salir a buscar es no salir a
 * buscar, y de eso también se trata el rol.
 */
export function losDeEsteMercado(estado: Estado): Confederacion[] {
	const casa = laDeCasa(estado);
	const elegido = estado.sondeo;
	if (!elegido || elegido === casa) return [casa];

	const destino = dondePuedeSondear(estado).find((d) => d.id === elegido);
	return destino?.alcanza ? [casa, destino.id] : [casa];
}

/** Si un club entra en el mercado de este año. */
export function entraEnElMercado(estado: Estado, clubId: string): boolean {
	const donde = losDeEsteMercado(estado);
	return donde.includes(contexto(clubId).pais.confederacion as Confederacion);
}

/** Cómo se cuenta, para la pantalla. */
export function comoSeCuenta(estado: Estado): string {
	const donde = losDeEsteMercado(estado).map(
		(id) => CONFEDERACIONES.find((c) => c.id === id)!.nombre
	);
	if (donde.length === 1) return `En el mercado sólo van a llamar clubes de ${donde[0]}.`;
	return `En el mercado van a llamar clubes de ${donde[0]} y de ${donde[1]}.`;
}
