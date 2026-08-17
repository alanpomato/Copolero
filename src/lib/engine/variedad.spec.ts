import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { ocasionesDe } from './ocasiones';
import { momentosDelRepresentante } from './momentos';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * Que una carrera no sea la misma temporada quince veces.
 *
 * "El juego está bien pero se siente plano y repetitivo", dijo Hernán. Medido,
 * tenía toda la razón y por un motivo concreto: la función que elegía los
 * momentos del año copiaba la lista a un array llamado `mezcla` y le hacía
 * `slice(0, 2)` sin mezclar nada. Salían siempre las dos primeras, las mismas
 * dieciocho temporadas seguidas: un delantero veía siete momentos distintos en
 * toda su carrera y dos de ellos eran la mitad de todo lo que le pasaba.
 *
 * Este test es el que hubiera cantado eso, así que queda para que no vuelva.
 */

function unaCarrera(puesto: string): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto,
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar-huracan'
			},
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('var', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

/** Cuántas veces le tocó cada momento en una carrera entera. */
function loQueLePasa(e: Estado, deQuien: 'futbolista' | 'representante'): Record<string, number> {
	const cuenta: Record<string, number> = {};
	for (let t = 1; t <= 18; t++) {
		e.temporada = t;
		for (const fase of [2, 3] as const) {
			e.fase = fase;
			const momentos =
				deQuien === 'futbolista' ? ocasionesDe(e, 'var') : momentosDelRepresentante(e, 'var');
			for (const m of momentos) cuenta[m.id] = (cuenta[m.id] ?? 0) + 1;
		}
	}
	return cuenta;
}

const PUESTOS = ['centrodelantero', 'cinco', 'central', 'arquero'];

describe('la variedad de una carrera', () => {
	it('a un futbolista le pasan al menos diez cosas distintas', () => {
		for (const puesto of PUESTOS) {
			const cuenta = loQueLePasa(unaCarrera(puesto), 'futbolista');
			expect(Object.keys(cuenta).length, puesto).toBeGreaterThanOrEqual(10);
		}
	});

	it('y ninguna se lleva más de un quinto de la carrera', () => {
		// El número exacto importa menos que el techo: si una sola cosa se lleva
		// un tercio de todo lo que te pasa en quince años, eso es lo que vas a
		// recordar del juego.
		for (const puesto of PUESTOS) {
			const cuenta = loQueLePasa(unaCarrera(puesto), 'futbolista');
			const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
			const [masRepetida, veces] = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
			expect(veces / total, `${puesto}: ${masRepetida}`).toBeLessThan(0.2);
		}
	});

	it('ninguna aparece todas las temporadas', () => {
		// El síntoma exacto del bug: `slice(0, 2)` sobre una lista sin mezclar.
		for (const puesto of PUESTOS) {
			const cuenta = loQueLePasa(unaCarrera(puesto), 'futbolista');
			for (const [id, veces] of Object.entries(cuenta)) {
				expect(veces, `${puesto}: ${id}`).toBeLessThan(18);
			}
		}
	});

	it('al representante también le pasan cosas distintas', () => {
		const e = unaCarrera('centrodelantero');
		e.representante.atributos.scouting = 60;
		const cuenta = loQueLePasa(e, 'representante');

		expect(Object.keys(cuenta).length).toBeGreaterThanOrEqual(7);
		const total = Object.values(cuenta).reduce((a, b) => a + b, 0);
		const veces = Object.values(cuenta).sort((a, b) => b - a)[0];
		expect(veces / total).toBeLessThan(0.25);
	});

	it('dos puestos distintos no juegan la misma carrera', () => {
		const delNueve = new Set(Object.keys(loQueLePasa(unaCarrera('centrodelantero'), 'futbolista')));
		const delArquero = new Set(Object.keys(loQueLePasa(unaCarrera('arquero'), 'futbolista')));

		// Comparten los que son de cualquier puesto, pero no los de pelota.
		const solosDelNueve = [...delNueve].filter((id) => !delArquero.has(id));
		expect(solosDelNueve.length).toBeGreaterThanOrEqual(3);
	});
});
