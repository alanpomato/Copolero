/**
 * La geometría del velocímetro, aparte de Svelte.
 *
 * Vive acá y no adentro del componente por dos razones. La primera es vieja:
 * apareció un bug al escribirlo —la aguja de "Firme" apuntaba al verde en vez
 * de al amarillo, porque restarle 90° de más a un ángulo que ya venía en el
 * sistema de la rotación del arco corre la aguja un tercio entero— y con un
 * relleno continuo casi no se nota; con tres casilleros de color fijo se ve a
 * la primera. La segunda es nueva: ahora la aguja se mueve con el dedo, así
 * que además de "para este índice, qué ángulo" hace falta la cuenta al
 * revés, "para este ángulo, qué índice", y las dos tienen que usar
 * exactamente la misma escala o la aguja no apunta a donde se tocó.
 */

export const R = 42;
export const CENTRO = 50;
/** Cuánto queda abierto abajo. Más que el reloj: acá se busca la forma de
    tablero de auto, no la de un reloj de pared. */
export const ABIERTO = 108;
/** Dónde arranca el arco activo, en el sistema de `<g transform="rotate(...)">`. */
export const INICIO = 90 + ABIERTO / 2;
/** Cuánto recorre el arco activo desde `INICIO`. */
export const RANGO = 360 - ABIERTO;

/** El ángulo, en el mismo sistema que usa la rotación del arco, para el medio de una zona. */
export function anguloDe(indice: number, cuantos: number): number {
	const valor = ((indice + 0.5) / Math.max(1, cuantos)) * 100;
	return INICIO + (RANGO * valor) / 100;
}

export function puntaDe(angulo: number, radio: number = R - 10) {
	const rad = (angulo * Math.PI) / 180;
	return { x: CENTRO + Math.cos(rad) * radio, y: CENTRO + Math.sin(rad) * radio };
}

/**
 * De un ángulo cualquiera —el del dedo o el mouse— a qué zona corresponde.
 *
 * El arco activo va de `INICIO` a `INICIO + RANGO`, cruzando la costura de
 * 360°/0° en el camino —con `ABIERTO = 108` eso siempre pasa—. Lo que cae en
 * el hueco de abajo (donde no hay arco dibujado) se pega al borde más
 * cercano: tocar un poco de más cerca del límite tiene que elegir la zona de
 * ese lado, no la opuesta.
 */
export function zonaDesdeAngulo(anguloGrados: number, cuantos: number): number {
	if (cuantos <= 1) return 0;
	const normal = ((anguloGrados % 360) + 360) % 360;
	let offset = ((normal - INICIO) % 360) + 360;
	offset = offset % 360;

	if (offset > RANGO) {
		const mitadDelHueco = RANGO + (360 - RANGO) / 2;
		offset = offset < mitadDelHueco ? RANGO : 0;
	}

	const valor = (offset / RANGO) * 100;
	const indice = Math.floor((valor / 100) * cuantos);
	return Math.max(0, Math.min(cuantos - 1, indice));
}

/** El ángulo del puntero (mouse, dedo) contra el centro del velocímetro, en coordenadas del `viewBox`. */
export function anguloDelPuntero(
	puntoX: number,
	puntoY: number,
	centro: number = CENTRO
): number {
	const dx = puntoX - centro;
	const dy = puntoY - centro;
	let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
	if (ang < 0) ang += 360;
	return ang;
}
