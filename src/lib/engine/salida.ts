import { club } from '../../../content/mundo';
import { brechaCon } from './temporada';
import type { Estado } from './tipos';

/**
 * Pedir la salida.
 *
 * El futbolista dice, en mitad de la temporada, que se quiere ir. No es un
 * pase: es el pedido que hace que el pase pueda existir. Hasta acá el mercado
 * era algo que le pasaba —llegaban ofertas o no llegaban— y el único que podía
 * mover algo era el representante con sus gestiones. Un jugador que quiere irse
 * y no tiene forma de decirlo no está jugando, está esperando.
 *
 * Cuesta y se paga en el acto, que es lo que lo convierte en una decisión:
 *
 *  - el técnico lo toma como lo toma un técnico, y eso son minutos,
 *  - la hinchada se entera —siempre se entera— y deja de bancarlo,
 *  - y si al final se queda, se queda habiendo dicho que se quería ir.
 *
 * A cambio, en el mercado que viene el club deja de retenerlo: aparecen más
 * ofertas, de clubes que antes ni miraban, y el pase sale más barato porque el
 * que vende ya no está en condiciones de pedir.
 */

/** Lo que le cuesta con el técnico, en el acto. */
export const LO_QUE_CUESTA_CON_EL_DT = 22;

/** Y con la gente. La hinchada es la que menos perdona. */
export const LO_QUE_CUESTA_CON_LA_HINCHADA = 18;

/** Cuánto más barato sale sacarlo cuando ya dijo que se quiere ir. */
export const DESCUENTO_EN_EL_PASE = 0.7;

/** Ofertas extra que aparecen por haber avisado que está disponible. */
export const OFERTAS_EXTRA = 2;

export const PIDE = 'si';

/**
 * Si tiene sentido ofrecérselo.
 *
 * No se puede pedir dos veces el mismo año, ni con la carrera terminada. Y
 * tampoco tiene sentido cuando ya está libre: si no hay contrato, no hay de qué
 * pedir salir.
 */
export function puedePedirLaSalida(estado: Estado): boolean {
	return (
		!estado.carreraTerminada &&
		!estado.pidioLaSalida &&
		estado.futbolista.contrato.temporadasRestantes > 0
	);
}

/**
 * Lo que le va a pasar si lo pide, dicho antes de pedirlo.
 *
 * Cambia según cómo lo esté viendo el club: al que es figura le cuesta mucho
 * más caro pedir salir —la gente lo quiere y el técnico cuenta con él— y al que
 * está en el banco casi no le cuesta nada, porque ya no había nada que romper.
 */
export function loQuePasaSiLoPide(estado: Estado): string {
	const donde = club(estado.futbolista.contrato.clubId).nombre;
	const brecha = brechaCon(estado.futbolista, estado.futbolista.contrato.clubId);

	if (brecha >= 8) {
		return (
			`Sos la figura de ${donde}. Pedir salir te va a costar caro con la gente y con el ` +
			`técnico, y el año lo terminás jugando menos. Pero si querés irte, es la única forma ` +
			`de que aparezcan ofertas de verdad.`
		);
	}
	if (brecha <= -6) {
		return (
			`En ${donde} ya casi no jugás, así que no hay mucho que romper. Decirlo es lo mejor ` +
			`que podés hacer: sin eso, el mercado va a seguir sin traerte nada.`
		);
	}
	return (
		`En ${donde} estás peleando el puesto. Pedir salir te va a costar minutos este año, y a ` +
		`cambio en el mercado van a aparecer clubes que hoy ni te miran.`
	);
}

/**
 * Lo aplica. Muta el estado, que ya viene clonado.
 *
 * Devuelve la línea para el diario, o `null` si no lo pidió. Los dos la ven: es
 * exactamente la clase de cosa que el representante tiene que saber antes de
 * sentarse a negociar.
 */
export function pedirLaSalida(estado: Estado, pedido: string | undefined): string | null {
	if (pedido !== PIDE || !puedePedirLaSalida(estado)) return null;

	const f = estado.futbolista;
	const donde = club(f.contrato.clubId).nombre;

	estado.pidioLaSalida = true;
	f.dt = Math.max(-100, f.dt - LO_QUE_CUESTA_CON_EL_DT);
	f.hinchada = Math.max(0, f.hinchada - LO_QUE_CUESTA_CON_LA_HINCHADA);
	f.moral = Math.max(0, f.moral - 5);

	return (
		`${f.nombre} pidió salir de ${donde}. El técnico se enteró antes que nadie y la gente ` +
		`lo silbó el domingo. En el mercado van a aparecer más ofertas.`
	);
}
