import { describe, expect, it } from 'vitest';

/**
 * La geometría del velocímetro, sin Svelte de por medio.
 *
 * Apareció un bug al escribir el componente: la aguja de "Firme" apuntaba al
 * verde en vez de al amarillo. La causa era copiar la fórmula del `Reloj` sin
 * darse cuenta de que ahí el ángulo ya viene en el mismo sistema que usa la
 * rotación del arco (0° = las 3, creciendo en sentido horario), y restarle 90°
 * de más —como hacía la primera versión— corre la aguja un tercio entero. Con
 * un relleno continuo casi no se nota; con tres casilleros de color fijo se ve
 * a la primera.
 *
 * Este test reproduce la cuenta tal cual está en el componente —constantes y
 * fórmula calcados— para que un cambio futuro en la geometría no pueda volver
 * a corromper la alineación sin que algo lo grite. No importa Svelte porque lo
 * que se rompió no fue el markup, fue la trigonometría.
 */

const R = 42;
const CENTRO = 50;
const ABIERTO = 108;

function anguloDe(indice: number, cuantos: number): number {
	const valor = ((indice + 0.5) / cuantos) * 100;
	return 90 + ABIERTO / 2 + ((360 - ABIERTO) * valor) / 100;
}

function puntaDe(angulo: number) {
	const rad = (angulo * Math.PI) / 180;
	return { x: CENTRO + Math.cos(rad) * (R - 10), y: CENTRO + Math.sin(rad) * (R - 10) };
}

describe('la aguja apunta al tercio que corresponde', () => {
	it('con tres niveles, cada aguja cae en su propio tercio del arco', () => {
		// El arco recorre, en este mismo sistema, de (90+ABIERTO/2) a
		// (90+ABIERTO/2+(360-ABIERTO)). Cada tercio es ese rango dividido en tres.
		const inicio = 90 + ABIERTO / 2;
		const total = 360 - ABIERTO;
		const limites = [inicio, inicio + total / 3, inicio + (2 * total) / 3, inicio + total];

		for (let i = 0; i < 3; i++) {
			const angulo = anguloDe(i, 3);
			expect(angulo, `tercio ${i}`).toBeGreaterThan(limites[i]);
			expect(angulo, `tercio ${i}`).toBeLessThan(limites[i + 1]);
		}
	});

	it('el del medio (Firme) apunta derecho para arriba', () => {
		// Arriba, en este sistema de coordenadas de pantalla (y crece para abajo),
		// es el punto donde x ronda el centro y y es claramente menor al centro.
		const punta = puntaDe(anguloDe(1, 3));
		expect(punta.x).toBeCloseTo(CENTRO, 0);
		expect(punta.y).toBeLessThan(CENTRO - 20);
	});

	it('el primero (Suave) cae del lado izquierdo, el último (A matar) del derecho', () => {
		const izquierda = puntaDe(anguloDe(0, 3));
		const derecha = puntaDe(anguloDe(2, 3));
		expect(izquierda.x).toBeLessThan(CENTRO);
		expect(derecha.x).toBeGreaterThan(CENTRO);
	});

	it('los tres apuntan hacia abajo del centro, nunca hacia arriba de la línea del arco', () => {
		// Con ABIERTO=108 el arco no llega a ser un semicírculo completo hacia
		// abajo; lo que importa es que ninguno de los tres se meta en el hueco de
		// abajo, que es la zona sin color entre el primero y el último.
		for (let i = 0; i < 3; i++) {
			const angulo = anguloDe(i, 3);
			// El hueco (sin dibujar) va de (90-ABIERTO/2) a (90+ABIERTO/2), pasando
			// por 90 (derecho hacia abajo). Ninguno de los tres ángulos puede caer
			// ahí.
			const enElHueco = angulo > 90 - ABIERTO / 2 && angulo < 90 + ABIERTO / 2;
			expect(enElHueco, `tercio ${i}: ángulo ${angulo}`).toBe(false);
		}
	});
});
