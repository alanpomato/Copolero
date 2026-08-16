import { media } from './estado';
import type { ContratoRepresentacion, Estado } from './tipos';

/**
 * El contrato entre los dos.
 *
 * Es el único trato que negocian entre ellos, y hasta ahora no existía: el
 * representante cobraba 5% y 5% desde el debut hasta el retiro, sin poder
 * mejorarlo nunca. Eso dejaba su rol a mitad de camino, porque el prestigio y
 * la plata le llegaban solos.
 *
 * Funciona con la misma regla que el pase, que es la regla del juego: **los dos
 * eligen y solo hay trato si eligen lo mismo**. El representante pide, el
 * futbolista acepta hasta dónde está dispuesto, y si no coinciden no hay
 * contrato nuevo. No hay forma de que uno le imponga el número al otro.
 *
 * Lo que hace que no sea una pelea es que al futbolista le conviene tener un
 * representante caro: el que cobra más se mueve más, y el fijo del
 * representante sale de su prestigio, no del bolsillo del jugador.
 */

export type Trato = {
	id: string;
	nombre: string;
	detalle: string;
	pctSalario: number;
	pctTransferencia: number;
	duracionTemporadas: number;
	/** Lo que el futbolista gana a cambio de ceder ese porcentaje. */
	acambio: string;
};

/**
 * Los cuatro tratos posibles, del más barato al más caro.
 *
 * Están ordenados a propósito: el futbolista elige hasta dónde está dispuesto a
 * llegar y el representante cuánto se anima a pedir. Que la lista sea la misma
 * para los dos es lo que hace que se pueda hablar de un número concreto.
 */
export const TRATOS: Trato[] = [
	{
		id: 'minimo',
		nombre: 'Lo mínimo',
		detalle: '3% del sueldo, 3% de cada pase, 2 temporadas.',
		pctSalario: 3,
		pctTransferencia: 3,
		duracionTemporadas: 2,
		acambio: 'Casi no te cuesta, y casi no le importa.'
	},
	{
		id: 'estandar',
		nombre: 'Lo de siempre',
		detalle: '5% del sueldo, 6% de cada pase, 3 temporadas.',
		pctSalario: 5,
		pctTransferencia: 6,
		duracionTemporadas: 3,
		acambio: 'Lo que firma todo el mundo. Nadie se queja y nadie se entusiasma.'
	},
	{
		id: 'fuerte',
		nombre: 'Lo que pide uno bueno',
		detalle: '8% del sueldo, 10% de cada pase, 3 temporadas.',
		pctSalario: 8,
		pctTransferencia: 10,
		duracionTemporadas: 3,
		acambio: 'Cobra bien, y por eso se mueve. Le conviene que te vaya bien.'
	},
	{
		id: 'socios',
		nombre: 'Socios',
		detalle: '10% del sueldo, 14% de cada pase, 5 temporadas.',
		pctSalario: 10,
		pctTransferencia: 14,
		duracionTemporadas: 5,
		acambio: 'Se juega la carrera con vos. Si te va mal, se funde con vos.'
	}
];

export const SIN_TRATO = 'sin-trato';

export function trato(id: string): Trato | null {
	return TRATOS.find((t) => t.id === id) ?? null;
}

/**
 * ¿Toca renegociar?
 *
 * El contrato de representación vence solo, como cualquier contrato. Cuando
 * llega a cero, la pretemporada siguiente es la de sentarse a hablar.
 */
export function tocaRenegociar(estado: Estado): boolean {
	return !estado.carreraTerminada && estado.contratoRepresentacion.duracionTemporadas <= 0;
}

/**
 * Hasta dónde puede pedir el representante.
 *
 * Un representante sin prestigio pidiendo el 14% de un pase es una broma, y el
 * futbolista lo sabe. La negociación y el prestigio son lo que le abren los
 * tratos de arriba.
 */
export function tratosQuePuedePedir(estado: Estado): Trato[] {
	const r = estado.representante;
	const peso = r.prestigio + r.atributos.negociacion * 0.5 + estado.confianza * 0.25;

	return TRATOS.filter((t) => {
		if (t.id === 'socios') return peso >= 70;
		if (t.id === 'fuerte') return peso >= 40;
		return true;
	});
}

/**
 * Qué le conviene al futbolista, para que la pantalla se lo pueda decir.
 *
 * No es una recomendación disfrazada: es información. Un representante que
 * cobra más se mueve más, y eso al futbolista le sirve mientras la relación
 * esté bien. Con la confianza rota, pagarle más es tirar plata.
 */
export function loQueLeConviene(estado: Estado): string {
	const f = estado.futbolista;
	const suMedia = media(f.atributos, f.posicion);

	if (estado.confianza < 35) {
		return 'La relación está rota. Atarte cinco temporadas a alguien en quien no confiás es el peor negocio posible.';
	}
	if (f.edad <= 22 && suMedia >= 55) {
		return 'Sos joven y valés: los pases que vienen son los grandes. Un representante que cobre bien va a pelearlos como si fueran suyos, porque lo son.';
	}
	if (f.edad >= 31) {
		return 'A esta altura quedan pocos pases grandes. Lo que se lleve de tu sueldo ya no vuelve.';
	}
	return 'Cuanto más se lleva, más se mueve. Es plata tuya, y también es su motivo para levantar el teléfono.';
}

export type ResultadoNegociacion = {
	hubo: boolean;
	contrato: ContratoRepresentacion;
	/** Una línea por cada rol que la ve. */
	lineas: { visiblePara: 'ambos' | 'futbolista' | 'representante'; texto: string }[];
};

/**
 * Resuelve la negociación con lo que eligieron los dos.
 *
 * El futbolista elige el techo al que está dispuesto a llegar; el representante,
 * lo que pide. Si el pedido entra dentro del techo, hay trato al número que
 * pidió el representante —no al techo—, porque quien pone el precio es el que
 * cobra. Si se pasó, no hay trato: el contrato viejo se estira una temporada
 * más y la relación se enfría.
 */
export function resolverNegociacion(
	estado: Estado,
	eligeFutbolista: string | undefined,
	eligeRepresentante: string | undefined
): ResultadoNegociacion {
	const techo = trato(eligeFutbolista ?? 'estandar');
	const pedido = trato(eligeRepresentante ?? 'estandar');

	// El futbolista puede cortar la relación, y es su derecho.
	if (eligeFutbolista === SIN_TRATO) {
		return {
			hubo: false,
			contrato: { ...estado.contratoRepresentacion, duracionTemporadas: 1 },
			lineas: [
				{
					visiblePara: 'ambos',
					texto: `${estado.futbolista.nombre} no quiso firmar de nuevo. Siguen juntos por inercia, un año más.`
				}
			]
		};
	}

	if (!techo || !pedido) {
		return {
			hubo: false,
			contrato: { ...estado.contratoRepresentacion, duracionTemporadas: 1 },
			lineas: []
		};
	}

	const indice = (t: Trato) => TRATOS.findIndex((x) => x.id === t.id);

	if (indice(pedido) > indice(techo)) {
		return {
			hubo: false,
			contrato: { ...estado.contratoRepresentacion, duracionTemporadas: 1 },
			lineas: [
				{
					visiblePara: 'ambos',
					texto:
						`No se pusieron de acuerdo: ${estado.representante.nombre} pedía ${pedido.nombre.toLowerCase()} ` +
						`y ${estado.futbolista.nombre} llegaba hasta ${techo.nombre.toLowerCase()}. ` +
						'Siguen con lo de antes, un año más.'
				}
			]
		};
	}

	return {
		hubo: true,
		contrato: {
			pctSalario: pedido.pctSalario,
			pctTransferencia: pedido.pctTransferencia,
			duracionTemporadas: pedido.duracionTemporadas,
			clausulaSalida: estado.contratoRepresentacion.clausulaSalida
		},
		lineas: [
			{
				visiblePara: 'ambos',
				texto:
					`Firmaron: ${pedido.pctSalario}% del sueldo y ${pedido.pctTransferencia}% de cada pase, ` +
					`por ${pedido.duracionTemporadas} temporadas.`
			}
		]
	};
}
