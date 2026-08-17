import type { Atributos, Posicion } from './tipos';

/**
 * Los puestos de la cancha.
 *
 * El motor razona con cuatro posiciones (arquero, defensor, mediocampista,
 * delantero) porque es lo que necesita para calcular medias y goles. Pero al
 * crear el jugador eso alcanza para nada: no es lo mismo un cinco que un
 * enganche, ni un lateral que un central, y elegirlo es la mitad de la gracia
 * de armar al pibe.
 *
 * Así que acá viven los puestos de verdad. Cada uno cae en una de las cuatro
 * posiciones del motor, trae su número clásico y sesga los atributos con los
 * que arranca: un lateral nace más rápido, un central más fuerte, un enganche
 * con mejor pase.
 *
 * Son siete y no once. Estaban separados el lateral derecho del izquierdo y el
 * extremo por derecha del extremo por izquierda, y también el ocho del cinco y
 * el segundo delantero del nueve: cuatro pares de tarjetas que se diferenciaban
 * en un par de puntos de sesgo y en de qué lado juega. Al elegir no era una
 * decisión, era una lista larga. La banda por la que juega ya la decide el pie.
 */

export type Puesto = {
	id: string;
	nombre: string;
	/** Con qué posición lo trata el motor. */
	posicion: Posicion;
	/** El número que le corresponde de toda la vida. */
	numero: number;
	detalle: string;
	/** Qué atributos empuja al arrancar, y cuánto. */
	sesgo: Partial<Record<keyof Atributos, number>>;
	/** Se juega pegado a una banda: ahí el pie zurdo vale. */
	deBanda?: boolean;
};

export const PUESTOS: Puesto[] = [
	{
		id: 'arquero',
		nombre: 'Arquero',
		posicion: 'arquero',
		numero: 1,
		detalle: 'El que ataja. Otra carrera, otro reloj: se retiran más tarde.',
		sesgo: { potencia: 8, defensa: 6, liderazgo: 5 }
	},
	{
		id: 'lateral',
		nombre: 'Lateral',
		posicion: 'defensor',
		numero: 4,
		detalle: 'Sube y baja la banda los noventa minutos. Vive del fondo físico.',
		sesgo: { velocidad: 8, resistencia: 8, defensa: 4 },
		deBanda: true
	},
	{
		id: 'central',
		nombre: 'Marcador central',
		posicion: 'defensor',
		numero: 2,
		detalle: 'Anticipo, cruce y cabezazo. El puesto que más perdona la edad.',
		sesgo: { defensa: 10, potencia: 8, liderazgo: 4 }
	},
	{
		id: 'cinco',
		nombre: 'Cinco de marca',
		posicion: 'mediocampista',
		numero: 5,
		detalle: 'Recupera, ordena y da el primer pase. El que sostiene al equipo.',
		sesgo: { defensa: 8, pase: 7, resistencia: 6 }
	},
	{
		id: 'enganche',
		nombre: 'Enganche',
		posicion: 'mediocampista',
		numero: 10,
		detalle: 'El diez. La pelota pasa por él o no pasa. Corre menos y decide más.',
		sesgo: { pase: 10, regate: 8, definicion: 4 }
	},
	{
		id: 'extremo',
		nombre: 'Extremo',
		posicion: 'delantero',
		numero: 7,
		detalle: 'Uno contra uno pegado a la raya. Encarar, tirar el centro o entrar.',
		sesgo: { velocidad: 10, regate: 8, definicion: 3 },
		deBanda: true
	},
	{
		id: 'centrodelantero',
		nombre: 'Centrodelantero',
		posicion: 'delantero',
		numero: 9,
		detalle: 'El nueve de área. Vive del gol, y de nada más.',
		sesgo: { definicion: 12, potencia: 7, velocidad: 3 }
	}
];

export const PUESTO_POR_DEFECTO = 'centrodelantero';

export type Pie = 'derecho' | 'izquierdo' | 'ambos';

export type PerfilDePie = {
	id: Pie;
	nombre: string;
	detalle: string;
};

export const PIES: PerfilDePie[] = [
	{ id: 'derecho', nombre: 'Derecho', detalle: 'Lo normal: ocho de cada diez.' },
	{
		id: 'izquierdo',
		nombre: 'Izquierdo',
		detalle: 'Hay pocos, y por eso valen. Rinde más por la izquierda.'
	},
	{
		id: 'ambos',
		nombre: 'Los dos',
		detalle: 'Raro de verdad. Juega en cualquier lado de la cancha.'
	}
];

/**
 * Qué atributos usa cada posición, del que más pesa al que menos.
 *
 * Es el mismo orden que los pesos de la media en `estado.ts`, escrito como una
 * lista porque hace falta en dos lados: para repartir de a uno los puntos que
 * se ganan jugando, y para no mostrarle a un arquero cuánta definición tiene.
 * Un número que no hace nada en tu puesto no es información: es ruido que
 * compite por la atención con los cinco que sí importan.
 */
const ATRIBUTOS_DEL_PUESTO: Record<Posicion, (keyof Atributos)[]> = {
	arquero: ['potencia', 'defensa', 'resistencia', 'liderazgo', 'pase'],
	defensor: ['defensa', 'potencia', 'resistencia', 'velocidad', 'pase', 'liderazgo'],
	mediocampista: ['pase', 'regate', 'resistencia', 'definicion', 'defensa', 'liderazgo'],
	delantero: ['definicion', 'velocidad', 'regate', 'potencia', 'pase']
};

export function atributosQueUsa(posicion: Posicion): (keyof Atributos)[] {
	return ATRIBUTOS_DEL_PUESTO[posicion];
}

export function puesto(id: string): Puesto {
	return PUESTOS.find((p) => p.id === id) ?? PUESTOS.find((p) => p.id === PUESTO_POR_DEFECTO)!;
}

export function esPuestoValido(id: string): boolean {
	return PUESTOS.some((p) => p.id === id);
}

export function esPieValido(id: string): boolean {
	return PIES.some((p) => p.id === id);
}

/**
 * Cuánto suma el pie en ese puesto.
 *
 * Antes cada banda era un puesto distinto —lateral derecho y lateral izquierdo,
 * extremo por derecha y extremo por izquierda— y el pie sumaba o restaba según
 * si coincidía con el lado. Al unificarlos, la banda dejó de ser algo que se
 * elige: la elige el pie.
 *
 * Así que la ventaja quedó en lo que siempre quiso decir: hay la mitad de
 * zurdos en el mundo y en los puestos de banda se los pelean. Un ambidiestro
 * suma en cualquier lado, pero menos. Es poco —cuatro puntos no hacen una
 * carrera— y alcanza para explicar por qué a los zurdos los buscan.
 */
export function ventajaDePie(p: Puesto, pie: Pie): number {
	if (pie === 'ambos') return 3;
	if (!p.deBanda) return 0;
	return pie === 'izquierdo' ? 4 : 0;
}

// ---------------------------------------------------------------------------
// El reparto de puntos
// ---------------------------------------------------------------------------

/**
 * Puntos que se reparten a mano al crear el pibe, y el techo por atributo.
 *
 * Es poco a propósito: sirve para inclinar al jugador hacia algo, no para
 * fabricarse un monstruo. Lo que define la carrera es el potencial, que nadie
 * ve, y lo que se entrena después.
 */
export const PUNTOS_A_REPARTIR = 12;
export const TOPE_POR_ATRIBUTO = 5;

export const NOMBRE_ATRIBUTO: Record<keyof Atributos, string> = {
	definicion: 'Definición',
	velocidad: 'Velocidad',
	potencia: 'Potencia',
	resistencia: 'Resistencia',
	pase: 'Pase',
	regate: 'Regate',
	defensa: 'Marca',
	liderazgo: 'Liderazgo'
};

export const ATRIBUTOS: (keyof Atributos)[] = [
	'definicion',
	'velocidad',
	'potencia',
	'resistencia',
	'pase',
	'regate',
	'defensa',
	'liderazgo'
];

/** Deja el reparto dentro de lo permitido: sin negativos, sin pasarse. */
export function repartoValido(reparto: Partial<Record<keyof Atributos, number>>): {
	reparto: Record<keyof Atributos, number>;
	gastados: number;
} {
	const limpio = {} as Record<keyof Atributos, number>;
	let gastados = 0;

	for (const atributo of ATRIBUTOS) {
		const pedido = Math.floor(Number(reparto[atributo] ?? 0));
		const acotado = Math.max(0, Math.min(TOPE_POR_ATRIBUTO, Number.isFinite(pedido) ? pedido : 0));
		// Si el formulario pidió más de lo que hay, se corta acá y no se reparte
		// lo que sobra: es más honesto que repartirlo solo.
		const cabe = Math.min(acotado, PUNTOS_A_REPARTIR - gastados);
		limpio[atributo] = cabe;
		gastados += cabe;
	}

	return { reparto: limpio, gastados };
}
