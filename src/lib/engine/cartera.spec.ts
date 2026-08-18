import { describe, expect, it } from 'vitest';
import {
	DISPONIBILIDAD_MAXIMA,
	DISPONIBILIDAD_MINIMA,
	cuantosRepresenta,
	disponibilidadDe,
	factorDeTiempo,
	loQueDejaLaCarteraAlAnio,
	loQueSumaLaCarteraAlAnio
} from './cartera';
import { estadoInicial } from './estado';
import { accionesDe, probabilidadDe } from './gestion';
import { momentosDelRepresentante } from './momentos';
import { resolverFase } from './fases';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * La cartera del representante.
 *
 * "Que tenga una cantidad de jugadores a su cargo, que al tener más gana
 * prestigio, gana más plata pero tiene menos tiempo." Las tres cosas se miden
 * acá, y sobre todo la tercera: sin el costo, fichar siempre sería la jugada
 * obvia y no habría decisión ninguna.
 */
function unaAgencia(cuantos = 0): Estado {
	const e = estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: 'centrodelantero',
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar-huracan'
			},
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('cartera', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
	e.representante.representadosExtra = cuantos;
	return e;
}

describe('cuántos lleva', () => {
	it('cuenta al de la partida', () => {
		expect(cuantosRepresenta(unaAgencia(0))).toBe(1);
		expect(cuantosRepresenta(unaAgencia(9))).toBe(10);
	});
});

describe('lo que da', () => {
	it('cada representado deja plata todos los años', () => {
		const solo = unaAgencia(0);
		const conCinco = unaAgencia(5);
		expect(loQueDejaLaCarteraAlAnio(solo)).toBe(0);
		expect(loQueDejaLaCarteraAlAnio(conCinco)).toBeGreaterThan(0);
	});

	it('y deja más cuanto más prestigio tiene', () => {
		// Es el motivo por el que subir el prestigio vale más allá del cartel: los
		// representados de un tipo conocido firman contratos mejores.
		const humilde = unaAgencia(5);
		humilde.representante.prestigio = 10;
		const grande = unaAgencia(5);
		grande.representante.prestigio = 80;
		expect(loQueDejaLaCarteraAlAnio(grande)).toBeGreaterThan(loQueDejaLaCarteraAlAnio(humilde));
	});

	it('la agencia grande suma prestigio y la chica no', () => {
		expect(loQueSumaLaCarteraAlAnio(unaAgencia(0))).toBe(0);
		expect(loQueSumaLaCarteraAlAnio(unaAgencia(4))).toBe(1);
		expect(loQueSumaLaCarteraAlAnio(unaAgencia(10))).toBe(2);
	});

	it('la plata de la cartera llega de verdad a la caja al cerrar el año', () => {
		// Que la fórmula esté bien no sirve si nadie la llama.
		function alCabo(cuantos: number): number {
			let e = unaAgencia(cuantos);
			for (let i = 0; i < 4 && !e.carreraTerminada; i++) {
				e = resolverFase(
					e,
					[
						{ rol: 'futbolista', nota: '' },
						{ rol: 'representante', nota: '' }
					],
					'cartera'
				).estado;
			}
			return e.representante.dineroUsd;
		}
		expect(alCabo(6)).toBeGreaterThan(alCabo(0));
	});
});

describe('lo que cuesta', () => {
	it('cada representado se lleva un pedazo del día', () => {
		expect(disponibilidadDe(unaAgencia(0))).toBe(DISPONIBILIDAD_MAXIMA);
		expect(disponibilidadDe(unaAgencia(3))).toBeLessThan(DISPONIBILIDAD_MAXIMA);
		expect(disponibilidadDe(unaAgencia(3))).toBeGreaterThan(disponibilidadDe(unaAgencia(6)));
	});

	it('pero nunca se queda sin nada', () => {
		// Sin piso, la agencia grande dejaba de ser una decisión y pasaba a ser un
		// suicidio: todo daba la probabilidad mínima.
		expect(disponibilidadDe(unaAgencia(40))).toBe(DISPONIBILIDAD_MINIMA);
		expect(factorDeTiempo(unaAgencia(40))).toBeGreaterThan(0.6);
	});

	it('sin tiempo, las gestiones salen peor', () => {
		const solo = unaAgencia(0);
		const lleno = unaAgencia(10);
		solo.fase = 1;
		lleno.fase = 1;

		for (const accion of accionesDe(1)) {
			const holgado = probabilidadDe(accion, solo);
			const apurado = probabilidadDe(accion, lleno);
			// Las que salen siempre siguen saliendo siempre: no hacer nada no
			// necesita tiempo.
			if (holgado >= 100) expect(apurado, accion.id).toBe(100);
			else expect(apurado, accion.id).toBeLessThan(holgado);
		}
	});

	it('y los momentos también', () => {
		const solo = unaAgencia(0);
		const lleno = unaAgencia(10);
		solo.fase = 2;
		lleno.fase = 2;

		const deSolo = momentosDelRepresentante(solo, 'cartera');
		const deLleno = momentosDelRepresentante(lleno, 'cartera');
		expect(deSolo.map((m) => m.id)).toEqual(deLleno.map((m) => m.id));

		let bajoAlguna = false;
		for (const [i, m] of deSolo.entries()) {
			for (const [j, o] of m.opciones.entries()) {
				const apurada = deLleno[i].opciones[j].probabilidad;
				if (o.probabilidad >= 100) expect(apurada, o.id).toBe(100);
				else if (apurada < o.probabilidad) bajoAlguna = true;
			}
		}
		expect(bajoAlguna).toBe(true);
	});
});
