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
 * Así que acá viven los once puestos de verdad. Cada uno cae en una de las
 * cuatro posiciones del motor, trae su número clásico y sesga los atributos con
 * los que arranca: un lateral nace más rápido, un central más fuerte, un
 * enganche con mejor pase.
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
	/** Los zurdos rinden más de este lado. */
	lado?: 'derecho' | 'izquierdo';
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
		id: 'lateral-derecho',
		nombre: 'Lateral derecho',
		posicion: 'defensor',
		numero: 4,
		detalle: 'Sube y baja la banda los noventa minutos. Vive del fondo físico.',
		sesgo: { velocidad: 8, resistencia: 8, defensa: 4 },
		lado: 'derecho'
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
		id: 'lateral-izquierdo',
		nombre: 'Lateral izquierdo',
		posicion: 'defensor',
		numero: 3,
		detalle: 'Lo mismo por la otra banda, y hay la mitad de zurdos en el mundo.',
		sesgo: { velocidad: 8, resistencia: 8, pase: 4 },
		lado: 'izquierdo'
	},
	{
		id: 'cinco',
		nombre: 'Volante central',
		posicion: 'mediocampista',
		numero: 5,
		detalle: 'El cinco: recupera, ordena y da el primer pase.',
		sesgo: { defensa: 8, pase: 7, resistencia: 6 }
	},
	{
		id: 'ocho',
		nombre: 'Volante mixto',
		posicion: 'mediocampista',
		numero: 8,
		detalle: 'El ocho: va y vuelve todo el partido. Llega al área de segunda línea.',
		sesgo: { resistencia: 9, pase: 6, definicion: 4 }
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
		id: 'extremo-derecho',
		nombre: 'Extremo por derecha',
		posicion: 'delantero',
		numero: 7,
		detalle: 'Uno contra uno pegado a la raya. Encarar y tirar el centro.',
		sesgo: { velocidad: 10, regate: 8, pase: 3 },
		lado: 'derecho'
	},
	{
		id: 'extremo-izquierdo',
		nombre: 'Extremo por izquierda',
		posicion: 'delantero',
		numero: 11,
		detalle: 'Lo mismo por la izquierda, con el arco de frente para el zurdo.',
		sesgo: { velocidad: 10, regate: 8, definicion: 3 },
		lado: 'izquierdo'
	},
	{
		id: 'segundo-delantero',
		nombre: 'Segundo delantero',
		posicion: 'delantero',
		numero: 9,
		detalle: 'Entre líneas. Juega de espaldas, se da vuelta y define.',
		sesgo: { definicion: 8, regate: 7, pase: 5 }
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
 * Un zurdo por la izquierda tiene ventaja real, y un ambidiestro tiene ventaja
 * en todos lados pero más chica. Es poco: cuatro puntos no hacen una carrera,
 * pero explican por qué a los zurdos los buscan.
 */
export function ventajaDePie(p: Puesto, pie: Pie): number {
	if (pie === 'ambos') return 3;
	if (!p.lado) return 0;
	return p.lado === pie ? 4 : -2;
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
