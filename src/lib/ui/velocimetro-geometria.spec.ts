import { describe, expect, it } from 'vitest';
import { ABIERTO, anguloDe, anguloDelPuntero, puntaDe, zonaDesdeAngulo } from './velocimetro-geometria';

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
		expect(punta.x).toBeCloseTo(50, 0);
		expect(punta.y).toBeLessThan(50 - 20);
	});

	it('el primero (Suave) cae del lado izquierdo, el último (A matar) del derecho', () => {
		const izquierda = puntaDe(anguloDe(0, 3));
		const derecha = puntaDe(anguloDe(2, 3));
		expect(izquierda.x).toBeLessThan(50);
		expect(derecha.x).toBeGreaterThan(50);
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

describe('tocar la aguja: del ángulo a la zona', () => {
	/*
	 * Alan lo pidió jugando: "que uno mueva la aguja y según adonde mueva le
	 * diga suave/firme/a matar". La ida (índice → ángulo) ya estaba; esto es
	 * la vuelta, y las dos tienen que ser inversas exactas o la aguja no
	 * apunta a donde tocaste.
	 */
	it('el centro de cada tercio vuelve a su propio índice', () => {
		for (let i = 0; i < 3; i++) {
			const angulo = anguloDe(i, 3);
			expect(zonaDesdeAngulo(angulo, 3), `tercio ${i}`).toBe(i);
		}
	});

	it('justo en el borde entre dos zonas, cae de un lado o del otro sin quedar afuera', () => {
		const inicio = 90 + ABIERTO / 2;
		const total = 360 - ABIERTO;
		const borde = inicio + total / 3;

		const zona = zonaDesdeAngulo(borde, 3);
		expect([0, 1]).toContain(zona);
	});

	it('tocando en el hueco de abajo, más cerca del final del arco, elige la última zona', () => {
		// El hueco va de (90-ABIERTO/2) a (90+ABIERTO/2), con el arco activo
		// arrancando en (90+ABIERTO/2) y terminando ahí mismo dando la vuelta.
		// Medido: 89° (un grado antes del medio del hueco) cae más cerca del
		// final del arco —"A matar"— que de su arranque.
		expect(zonaDesdeAngulo(89, 3)).toBe(2);
	});

	it('tocando en el hueco de abajo, más cerca del arranque del arco, elige la primera zona', () => {
		// Y 91° (un grado después del medio) cae del otro lado: más cerca de
		// donde arranca el arco —"Suave"—.
		expect(zonaDesdeAngulo(91, 3)).toBe(0);
	});

	it('funciona igual con dos niveles', () => {
		expect(zonaDesdeAngulo(anguloDe(0, 2), 2)).toBe(0);
		expect(zonaDesdeAngulo(anguloDe(1, 2), 2)).toBe(1);
	});

	it('el ángulo del puntero se calcula igual que el de la aguja: arriba es negativo en y', () => {
		// Un punto arriba del centro (y menor) tiene que dar el mismo ángulo que
		// apunta la aguja de "Firme", que va derecho para arriba.
		const angulo = anguloDelPuntero(50, 10);
		expect(zonaDesdeAngulo(angulo, 3)).toBe(1);
	});
});
