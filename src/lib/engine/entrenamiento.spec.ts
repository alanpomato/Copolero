import { describe, expect, it } from 'vitest';
import { PLANES, PLANES_QUE_SE_OFRECEN, planesPara } from './entrenamiento';
import { atributosQueUsa } from './puestos';
import { POSICIONES } from './tipos';

/**
 * Qué se ofrece entrenar.
 *
 * "Qué entrenás: solo 3 opciones en horizontal", pidió Alan. Tres no es un
 * número decorativo: seis tarjetas en columna eran media pantalla de scroll
 * antes de llegar a la intensidad, que es la decisión que de verdad importa. Y
 * de las seis, la mitad no eran una opción real para ese puesto.
 */
describe('los planes que se ofrecen', () => {
	it('son tres, siempre', () => {
		for (const posicion of POSICIONES) {
			for (let t = 1; t <= 20; t++) {
				expect(planesPara(posicion, t), `${posicion} T${t}`).toHaveLength(PLANES_QUE_SE_OFRECEN);
			}
		}
	});

	it('dos de los tres son los que ese puesto de verdad usa', () => {
		for (const posicion of POSICIONES) {
			const usa = atributosQueUsa(posicion);
			for (let t = 1; t <= 20; t++) {
				const suyos = planesPara(posicion, t).filter((p) =>
					p.atributos.some((a) => usa.includes(a))
				);
				expect(suyos.length, `${posicion} T${t}`).toBeGreaterThanOrEqual(2);
			}
		}
	});

	it('el tercero rota: no es la misma terna quince años seguidos', () => {
		for (const posicion of POSICIONES) {
			const ternas = new Set<string>();
			for (let t = 1; t <= 8; t++) {
				ternas.add(
					planesPara(posicion, t)
						.map((p) => p.id)
						.join('+')
				);
			}
			expect(ternas.size, posicion).toBeGreaterThanOrEqual(3);
		}
	});

	it('siempre salen en el orden del catálogo, para que la fila no se reordene sola', () => {
		for (const posicion of POSICIONES) {
			for (let t = 1; t <= 8; t++) {
				const indices = planesPara(posicion, t).map((p) => PLANES.indexOf(p));
				expect(
					[...indices].sort((a, b) => a - b),
					`${posicion} T${t}`
				).toEqual(indices);
			}
		}
	});

	it('y con el correr de las temporadas se llegan a ofrecer todos', () => {
		// Ninguno queda escrito y sin usar: el que no aparece nunca sobra.
		for (const posicion of POSICIONES) {
			const vistos = new Set<string>();
			for (let t = 1; t <= 12; t++) for (const p of planesPara(posicion, t)) vistos.add(p.id);
			expect(vistos.size, posicion).toBe(PLANES.length);
		}
	});
});
