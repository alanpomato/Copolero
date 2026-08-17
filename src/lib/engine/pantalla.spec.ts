import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import { ROLES, type Decision, type Estado } from './tipos';

/**
 * Lo que `opcionesDeFase` devuelve viaja del servidor al navegador.
 *
 * SvelteKit serializa lo que devuelve el `load`, así que cualquier cosa que no
 * sea JSON —una función, un Map, un Date— tira abajo la página entera con un
 * 500. Pasó de verdad: los sueños se mandaban con su función de contar adentro
 * y la primera pretemporada de toda partida nueva reventaba, con los 275 tests
 * del motor en verde. Los tipos tampoco lo agarran, porque una función es un
 * valor perfectamente válido de TypeScript.
 *
 * Este archivo es el que lo agarra.
 */

function unPibe(puesto: string, semilla: string): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto,
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar2-moron'
			},
			representante: { nombre: 'Alan' }
		},
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

const NADA: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

/** Recorre todo y devuelve la ruta de lo que no es JSON, o `null` si está bien. */
function loQueNoViaja(valor: unknown, camino = 'opciones'): string | null {
	if (valor === null || valor === undefined) return null;
	const tipo = typeof valor;
	if (tipo === 'function' || tipo === 'symbol' || tipo === 'bigint') {
		return `${camino} es ${tipo}`;
	}
	if (tipo !== 'object') return null;
	if (valor instanceof Date || valor instanceof Map || valor instanceof Set) {
		return `${camino} es ${valor.constructor.name}`;
	}
	if (Array.isArray(valor)) {
		for (let i = 0; i < valor.length; i++) {
			const mal = loQueNoViaja(valor[i], `${camino}[${i}]`);
			if (mal) return mal;
		}
		return null;
	}
	for (const [clave, adentro] of Object.entries(valor as Record<string, unknown>)) {
		const mal = loQueNoViaja(adentro, `${camino}.${clave}`);
		if (mal) return mal;
	}
	return null;
}

describe('lo que se le manda a la pantalla', () => {
	it('es todo JSON, en las tres fases y para los dos roles, toda la carrera', () => {
		for (const puesto of ['arquero', 'central', 'enganche', 'centrodelantero']) {
			let e = unPibe(puesto, `p-${puesto}`);
			// Una carrera entera: así pasan la pretemporada, la temporada, el
			// mercado, el retiro y todo lo que aparece una sola vez en el medio.
			for (let i = 0; i < 80 && !e.carreraTerminada; i++) {
				for (const rol of ROLES) {
					const opciones = opcionesDeFase(e, rol, 'pantalla');
					expect(
						loQueNoViaja(opciones),
						`${puesto} · temporada ${e.temporada} fase ${e.fase} · ${rol}`
					).toBeNull();
				}
				e = resolverFase(e, NADA, 'pantalla').estado;
			}
			// Y el final, que es una pantalla distinta a todas las demás.
			expect(e.carreraTerminada, puesto).toBe(true);
			for (const rol of ROLES) {
				expect(loQueNoViaja(opcionesDeFase(e, rol, 'pantalla')), `${puesto} · retiro`).toBeNull();
			}
		}
	});

	it('sobrevive el ida y vuelta por JSON sin perder nada', () => {
		const e = unPibe('centrodelantero', 'ida-y-vuelta');
		for (const rol of ROLES) {
			const opciones = opcionesDeFase(e, rol, 'pantalla');
			expect(JSON.parse(JSON.stringify(opciones))).toEqual(opciones);
		}
	});
});
