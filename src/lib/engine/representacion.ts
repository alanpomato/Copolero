import { rngPara } from './rng';
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
 * Sigue funcionando con la misma regla del pase, que es la regla del juego: los
 * dos eligen, sin verse. El representante pide, el futbolista dice hasta dónde
 * llega. Lo que cambió es qué pasa cuando no coinciden.
 *
 * Alan lo dijo mirándola: "la mesa del contrato entre ustedes dos es medio
 * aburrida". Tenía razón, y el motivo era concreto: pedido y techo eran el
 * mismo número de la misma lista de cuatro, comparado por índice. Si el pedido
 * quedaba un escalón arriba, no había nada que hacer —no discutían, no cedían
 * nada, la mesa se levantaba sola—. Elegir un número de una lista no es
 * negociar.
 *
 * Ahora, si el pedido queda por encima del techo, no se corta ahí: hay una
 * chance de que el tira y afloje cierre igual, un escalón más arriba de lo que
 * el futbolista ofrecía —ninguno de los dos se sale con la suya entera—, y esa
 * chance depende de cuánto pidió de más y de la negociación, el prestigio y la
 * confianza del representante. Pedir lejos sigue siendo una apuesta; pedir
 * cerca del techo del otro ahora tiene premio.
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

/** Los bordes de esta chance en particular: pedir de más nunca es gratis, pero tampoco imposible. */
export const CHANCE_MINIMA_TIRA_Y_AFLOJA = 4;
export const CHANCE_MAXIMA_TIRA_Y_AFLOJA = 88;

/**
 * Qué chance hay de cerrar la brecha entre el techo y el pedido.
 *
 * `brecha` es en escalones de la lista de tratos: 1 si pidió un escalón más de
 * lo que el otro ofrecía, 2 si pidió dos, etc. Cuanto más lejos, más difícil
 * —una brecha de tres pesa el triple que una de uno—, y lo que la achica es la
 * negociación, el prestigio y la relación entre los dos: llegar a esta mesa con
 * la confianza rota hace que cualquier pedido de más se sienta como una
 * provocación.
 */
export function chanceDeCerrarLaBrecha(estado: Estado, brecha: number): number {
	const a = estado.representante.atributos;
	const bruto =
		20 -
		brecha * 18 +
		(a.negociacion - 40) * 0.5 +
		(estado.representante.prestigio - 40) * 0.3 +
		(estado.confianza - 50) * 0.3;

	const chance = 100 / (1 + Math.exp(-bruto / 16));
	return Math.max(
		CHANCE_MINIMA_TIRA_Y_AFLOJA,
		Math.min(CHANCE_MAXIMA_TIRA_Y_AFLOJA, Math.round(chance))
	);
}

/**
 * Resuelve la negociación con lo que eligieron los dos.
 *
 * El futbolista elige el techo al que está dispuesto a llegar; el
 * representante, lo que pide, sin verse el uno al otro. Si el pedido entra
 * dentro del techo, hay trato al número que pidió —quien pone el precio es el
 * que cobra—.
 *
 * Si se pasó, ya no se corta ahí solo. Hay un tira y afloje: una chance de
 * cerrar en un escalón más arriba de lo que el futbolista ofrecía —ninguno de
 * los dos se sale con la suya entera, que es lo que de verdad se siente cuando
 * dos personas ceden—. Si ni así, no hay trato: el contrato viejo se estira una
 * temporada más y la relación se enfría, más cuanto más lejos se pidió.
 */
export function resolverNegociacion(
	estado: Estado,
	semilla: string,
	eligeFutbolista: string | undefined,
	eligeRepresentante: string | undefined
): ResultadoNegociacion {
	const techo = trato(eligeFutbolista ?? 'estandar');
	const pedido = trato(eligeRepresentante ?? 'estandar');

	/** La confianza se resiente distinto según qué falló: acá se mutan los dos juntos. */
	const conConfianzaPerdida = (resultado: ResultadoNegociacion, cuanto: number): ResultadoNegociacion => {
		estado.confianza = Math.max(0, Math.min(100, estado.confianza - cuanto));
		return resultado;
	};

	// El futbolista puede cortar la relación, y es su derecho.
	if (eligeFutbolista === SIN_TRATO) {
		return conConfianzaPerdida(
			{
				hubo: false,
				contrato: { ...estado.contratoRepresentacion, duracionTemporadas: 1 },
				lineas: [
					{
						visiblePara: 'ambos',
						texto: `${estado.futbolista.nombre} no quiso firmar de nuevo. Siguen juntos por inercia, un año más.`
					}
				]
			},
			6
		);
	}

	if (!techo || !pedido) {
		return conConfianzaPerdida(
			{
				hubo: false,
				contrato: { ...estado.contratoRepresentacion, duracionTemporadas: 1 },
				lineas: []
			},
			6
		);
	}

	const indice = (t: Trato) => TRATOS.findIndex((x) => x.id === t.id);
	const idxTecho = indice(techo);
	const idxPedido = indice(pedido);
	const brecha = idxPedido - idxTecho;

	const firmar = (acordado: Trato, texto: string): ResultadoNegociacion => ({
		hubo: true,
		contrato: {
			pctSalario: acordado.pctSalario,
			pctTransferencia: acordado.pctTransferencia,
			duracionTemporadas: acordado.duracionTemporadas,
			clausulaSalida: estado.contratoRepresentacion.clausulaSalida
		},
		lineas: [{ visiblePara: 'ambos', texto }]
	});

	if (brecha <= 0) {
		return firmar(
			pedido,
			`Firmaron: ${pedido.pctSalario}% del sueldo y ${pedido.pctTransferencia}% de cada pase, ` +
				`por ${pedido.duracionTemporadas} temporadas.`
		);
	}

	// El tira y afloje: pidió más de lo que el otro ofrecía. No se corta acá.
	const chance = chanceDeCerrarLaBrecha(estado, brecha);
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 1,
		clave: 'mesa-representacion'
	});

	if (rng.ocurre(chance / 100)) {
		// Ceden los dos: un escalón más de lo que el futbolista ofrecía, no lo
		// que el representante pedía —salvo que ya estuviera a un escalón, en
		// cuyo caso el pedido entero es el punto medio.
		const acordado = TRATOS[Math.min(idxTecho + 1, idxPedido)];
		return firmar(
			acordado,
			`Tira y afloje: ${estado.representante.nombre} pedía ${pedido.nombre.toLowerCase()} y ` +
				`${estado.futbolista.nombre} ofrecía ${techo.nombre.toLowerCase()}. Cerraron en el medio, en ` +
				`${acordado.nombre.toLowerCase()}: ${acordado.pctSalario}% del sueldo y ` +
				`${acordado.pctTransferencia}% de cada pase, por ${acordado.duracionTemporadas} temporadas.`
		);
	}

	// Ni el tira y afloje alcanzó: cuanto más lejos pidió, más se resiente.
	return conConfianzaPerdida(
		{
			hubo: false,
			contrato: { ...estado.contratoRepresentacion, duracionTemporadas: 1 },
			lineas: [
				{
					visiblePara: 'ambos',
					texto:
						`No se pusieron de acuerdo: ${estado.representante.nombre} pedía ${pedido.nombre.toLowerCase()} ` +
						`y ${estado.futbolista.nombre} llegaba hasta ${techo.nombre.toLowerCase()}. Se tiraron y ` +
						'aflojaron, pero no alcanzó. Siguen con lo de antes, un año más.'
				}
			]
		},
		6 + (brecha - 1) * 2
	);
}
