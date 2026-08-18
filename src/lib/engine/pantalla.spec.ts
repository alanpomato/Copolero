import { describe, expect, it } from 'vitest';
import { club } from '../../../content/mundo';
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

/**
 * Y que todo club que la pantalla nombra exista.
 *
 * `club()` y `contexto()` tiran si el id no existe, y la pantalla los llama
 * para dibujar un escudo, un nombre o una bandera. Un `clubId` en `null`
 * viajando entre las opciones no rompe la serialización —`null` es JSON
 * perfectamente válido— pero revienta el render del lado del navegador, que es
 * el peor lugar donde puede reventar: la página queda a medias y los tests del
 * motor siguen todos en verde.
 *
 * Pasó exactamente eso. Se veía en la consola del navegador y en ningún test.
 */
function clubesQueNoExisten(valor: unknown, camino = 'opciones'): string[] {
	const rotos: string[] = [];

	const mirar = (v: unknown, donde: string) => {
		if (v === null || v === undefined) return;
		if (Array.isArray(v)) {
			v.forEach((x, i) => mirar(x, `${donde}[${i}]`));
			return;
		}
		if (typeof v !== 'object') return;

		for (const [clave, dentro] of Object.entries(v as Record<string, unknown>)) {
			// Los campos que la pantalla va a pasarle a `club()`: por nombre, que es
			// como los reconoce cualquiera que lea el código.
			const esUnClub = /clubId$|^clubId|^desde$|^hacia$|clubIdFinal/.test(clave);
			if (esUnClub && typeof dentro === 'string' && dentro.length > 0) {
				try {
					club(dentro);
				} catch {
					rotos.push(`${donde}.${clave} = ${dentro}`);
				}
			}
			mirar(dentro, `${donde}.${clave}`);
		}
	};

	mirar(valor, camino);
	return rotos;
}

describe('los clubes que la pantalla nombra', () => {
	it('existen todos, en toda la carrera y para los dos roles', () => {
		for (const puesto of ['centrodelantero', 'cinco', 'central', 'arquero']) {
			let estado = unPibe(puesto, `real-${puesto}`);

			for (let vuelta = 0; vuelta < 60 && !estado.carreraTerminada; vuelta++) {
				for (const rol of ROLES) {
					const opciones = opcionesDeFase(estado, rol, `real-${puesto}`);
					const rotos = clubesQueNoExisten(opciones);
					expect(
						rotos,
						`${puesto} · ${rol} · temporada ${estado.temporada} fase ${estado.fase}`
					).toEqual([]);
				}
				estado = resolverFase(estado, NADA, `real-${puesto}`).estado;
			}
		}
	});
});

describe('la carrera con la selección, para la tabla de la trayectoria', () => {
	it('sin nada jugado con la selección, va en cero y no en undefined', () => {
		const e = unPibe('centrodelantero', 'sin-seleccion');
		const opciones = opcionesDeFase(e, 'futbolista', 'sin-seleccion');
		expect(opciones.seleccionCarrera).toEqual({ partidos: 0, goles: 0, mundialesGanados: 0 });
	});

	it('lo que jugó y lo que ganó con la selección, tal cual está en el estado', () => {
		const e = unPibe('centrodelantero', 'con-seleccion');
		e.seleccion = {
			debuto: true,
			partidos: 40,
			goles: 12,
			mundiales: [
				{ anio: 2030, resultado: 'campeon', partidos: 7, goles: 3 },
				{ anio: 2034, resultado: 'cuartos', partidos: 4, goles: 1 }
			]
		};
		const opciones = opcionesDeFase(e, 'futbolista', 'con-seleccion');
		expect(opciones.seleccionCarrera).toEqual({ partidos: 40, goles: 12, mundialesGanados: 1 });
	});
});
