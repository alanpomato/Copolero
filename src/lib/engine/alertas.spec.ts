import { describe, expect, it } from 'vitest';
import { alertaDe } from './alertas';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { temporadas } from './probar';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import type { Decision, Estado, HitoTemporada } from './tipos';

function unPibe(clubId = 'ar2-moron'): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: 'centrodelantero',
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId
			},
			representante: { nombre: 'Alan' }
		},
		rngPara('alerta', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

function unHito(cambios: Partial<HitoTemporada> = {}): HitoTemporada {
	return {
		temporada: 1,
		anio: 2026,
		edad: 17,
		clubId: 'ar-boca',
		media: 50,
		nota: 6,
		partidos: 25,
		goles: 6,
		asistencias: 3,
		fama: 20,
		valorUsd: 500_000,
		campeon: false,
		titulo: false,
		lesionado: false,
		mundial: null,
		seFue: false,
		...cambios
	};
}

describe('las alertas', () => {
	it('no molesta cuando no pasa nada', () => {
		const e = unPibe();
		e.historial = [unHito({ temporada: 1 }), unHito({ temporada: 2, anio: 2027, media: 55 })];
		expect(alertaDe(e, 'futbolista')).toBeNull();
	});

	it('avisa cuando lleva dos temporadas sin jugar, y dice cómo salir', () => {
		const e = unPibe('ar-boca');
		e.historial = [
			unHito({ temporada: 1, partidos: 2 }),
			unHito({ temporada: 2, anio: 2027, partidos: 1 })
		];

		const a = alertaDe(e, 'futbolista')!;
		expect(a.id).toBe('no-juega');
		expect(a.gravedad).toBe('roja');
		// Lo importante no es que avise: es que diga qué hacer.
		expect(a.salida.length).toBeGreaterThan(20);
		expect(a.salida.toLowerCase()).toContain('titular');
	});

	it('una sola temporada mala todavía no es una alerta', () => {
		const e = unPibe('ar-boca');
		e.historial = [unHito({ temporada: 1, partidos: 24 }), unHito({ temporada: 2, partidos: 1 })];
		expect(alertaDe(e, 'futbolista')?.id).not.toBe('no-juega');
	});

	it('cada rol recibe una salida distinta, porque no pueden hacer lo mismo', () => {
		const e = unPibe('ar-boca');
		e.historial = [
			unHito({ temporada: 1, partidos: 2 }),
			unHito({ temporada: 2, anio: 2027, partidos: 1 })
		];
		const delJugador = alertaDe(e, 'futbolista')!;
		const delRepre = alertaDe(e, 'representante')!;
		expect(delJugador.id).toBe(delRepre.id);
		expect(delJugador.salida).not.toBe(delRepre.salida);
	});

	it('el cuerpo gastado se avisa antes de que sea tarde', () => {
		const e = unPibe();
		e.futbolista.desgaste = 85;
		e.futbolista.edad = 32;
		expect(alertaDe(e, 'futbolista')!.id).toBe('cuerpo');
	});

	it('la relación rota también se avisa', () => {
		const e = unPibe();
		e.confianza = 12;
		expect(alertaDe(e, 'representante')!.id).toBe('relacion');
	});

	it('no jugar pesa más que cualquier otra cosa', () => {
		const e = unPibe('ar-boca');
		e.confianza = 5;
		e.futbolista.desgaste = 90;
		e.historial = [
			unHito({ temporada: 1, partidos: 0 }),
			unHito({ temporada: 2, anio: 2027, partidos: 0 })
		];
		// Se muestra una sola, y tiene que ser la que mata la carrera más rápido.
		expect(alertaDe(e, 'futbolista')!.id).toBe('no-juega');
	});

	it('avisa cuando hace tres años que no crece, siendo joven y jugando', () => {
		const e = unPibe();
		e.futbolista.edad = 24;
		e.historial = [
			unHito({ temporada: 1, media: 61, partidos: 30 }),
			unHito({ temporada: 2, anio: 2027, media: 61, partidos: 28 }),
			unHito({ temporada: 3, anio: 2028, media: 62, partidos: 31 })
		];
		expect(alertaDe(e, 'futbolista')!.id).toBe('estancado');
	});

	it('llega a la pantalla, para los dos roles', () => {
		let e = unPibe('ar-boca');
		// Dos temporadas en un grande siendo un pibe: el banco garantizado.
		const nada: Decision[] = [
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '' }
		];
		e = temporadas(e, 2, nada, 'alerta');

		expect(opcionesDeFase(e, 'futbolista', 'alerta').alerta?.id).toBe('no-juega');
		expect(opcionesDeFase(e, 'representante', 'alerta').alerta?.id).toBe('no-juega');
	});
});
