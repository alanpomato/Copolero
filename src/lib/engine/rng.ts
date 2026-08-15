/**
 * Azar determinista.
 *
 * Toda tirada del juego se deriva de la semilla de la partida más las
 * coordenadas de dónde ocurre: temporada, fase, clave e índice. Eso da tres
 * propiedades que necesitamos:
 *
 *   1. El resultado no depende del orden en que llegaron las decisiones.
 *   2. Recargar la página no vuelve a tirar el dado.
 *   3. Una carrera entera es reproducible a partir de la semilla, así que se
 *      puede depurar y testear.
 *
 * Nunca usar Math.random() en el motor.
 */

/** Hash de string a entero de 32 bits (xmur3). */
function hashSemilla(texto: string): number {
	let h = 1779033703 ^ texto.length;
	for (let i = 0; i < texto.length; i++) {
		h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	h = Math.imul(h ^ (h >>> 16), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	return (h ^= h >>> 16) >>> 0;
}

/** Generador mulberry32: rápido, determinista y suficiente para un juego. */
function mulberry32(estado: number): () => number {
	return () => {
		estado = (estado + 0x6d2b79f5) | 0;
		let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export type Coordenadas = {
	temporada: number;
	fase: number;
	clave: string;
	indice?: number;
};

export type Rng = {
	/** Número en [0, 1). */
	siguiente(): number;
	/** Entero en [min, max], ambos incluidos. */
	entero(min: number, max: number): number;
	/** true con probabilidad p. */
	ocurre(p: number): boolean;
	/** Un elemento al azar de la lista. */
	elegir<T>(lista: readonly T[]): T;
};

/**
 * Construye un generador para un punto concreto de la partida. Dos llamadas con
 * la misma semilla y las mismas coordenadas dan exactamente la misma secuencia.
 */
export function rngPara(semilla: string, c: Coordenadas): Rng {
	const clave = `${semilla}|${c.temporada}|${c.fase}|${c.clave}|${c.indice ?? 0}`;
	const siguiente = mulberry32(hashSemilla(clave));

	return {
		siguiente,
		entero(min, max) {
			return min + Math.floor(siguiente() * (max - min + 1));
		},
		ocurre(p) {
			return siguiente() < p;
		},
		elegir(lista) {
			if (lista.length === 0) throw new Error('elegir() recibió una lista vacía');
			return lista[Math.floor(siguiente() * lista.length)];
		}
	};
}

/** Semilla nueva para una partida nueva. Se guarda y no se vuelve a tocar. */
export function nuevaSemilla(): string {
	return crypto.randomUUID();
}
