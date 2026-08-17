import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { temporadas, unaTemporada } from './probar';
import {
	SIN_TRATO,
	TRATOS,
	resolverNegociacion,
	tocaRenegociar,
	tratosQuePuedePedir
} from './representacion';
import { rngPara } from './rng';
import type { Decision, Estado } from './tipos';

function unaPartida(): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: 'centrodelantero',
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar2-moron'
			},
			representante: { nombre: 'Alan' }
		},
		rngPara('mesa', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

describe('el contrato entre los dos', () => {
	it('arranca vigente y vence solo', () => {
		let estado = unaPartida();
		expect(tocaRenegociar(estado)).toBe(false);

		const cierran: Decision[] = [
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '' }
		];
		// Dos temporadas completas: el contrato inicial dura dos.
		estado = temporadas(estado, 2, cierran, 'mesa');

		expect(tocaRenegociar(estado)).toBe(true);
	});

	it('hay trato si el representante pide dentro del techo', () => {
		const estado = unaPartida();
		const r = resolverNegociacion(estado, 'fuerte', 'estandar');

		expect(r.hubo).toBe(true);
		// Firman al número que pidió el representante, no al techo.
		expect(r.contrato.pctSalario).toBe(5);
		expect(r.contrato.pctTransferencia).toBe(6);
	});

	it('no hay trato si se pasa del techo', () => {
		const estado = unaPartida();
		const r = resolverNegociacion(estado, 'minimo', 'socios');

		expect(r.hubo).toBe(false);
		// El contrato viejo se estira una temporada.
		expect(r.contrato.pctSalario).toBe(estado.contratoRepresentacion.pctSalario);
		expect(r.contrato.duracionTemporadas).toBe(1);
		expect(r.lineas[0].texto).toContain('No se pusieron de acuerdo');
	});

	it('el futbolista puede negarse a firmar', () => {
		const estado = unaPartida();
		const r = resolverNegociacion(estado, SIN_TRATO, 'estandar');

		expect(r.hubo).toBe(false);
		expect(r.lineas[0].texto).toContain('no quiso firmar');
	});

	it('un representante sin prestigio no puede pedir el trato grande', () => {
		const estado = unaPartida();
		const puede = tratosQuePuedePedir(estado).map((t) => t.id);

		expect(puede).toContain('minimo');
		expect(puede).toContain('estandar');
		expect(puede).not.toContain('socios');
	});

	it('con prestigio y confianza se abren los de arriba', () => {
		const estado = unaPartida();
		estado.representante.prestigio = 60;
		estado.representante.atributos.negociacion = 70;
		estado.confianza = 90;

		expect(tratosQuePuedePedir(estado).map((t) => t.id)).toContain('socios');
	});

	it('los tratos van de menor a mayor y no hay dos iguales', () => {
		for (let i = 1; i < TRATOS.length; i++) {
			expect(TRATOS[i].pctSalario).toBeGreaterThan(TRATOS[i - 1].pctSalario);
			expect(TRATOS[i].pctTransferencia).toBeGreaterThan(TRATOS[i - 1].pctTransferencia);
		}
		expect(new Set(TRATOS.map((t) => t.id)).size).toBe(TRATOS.length);
	});

	it('no ponerse de acuerdo enfría la relación', () => {
		let estado = unaPartida();
		estado.contratoRepresentacion.duracionTemporadas = 0;
		const antes = estado.confianza;

		estado = resolverFase(
			estado,
			[
				{ rol: 'futbolista', nota: '', trato: 'minimo' },
				{ rol: 'representante', nota: '', trato: 'estandar' }
			],
			'mesa'
		).estado;

		expect(estado.confianza).toBeLessThan(antes);
	});

	it('firmar más caro hace que el representante cobre más', () => {
		const base = unaPartida();
		base.contratoRepresentacion.duracionTemporadas = 0;

		const correr = (trato: string) => {
			let e = structuredClone(base);
			const d: Decision[] = [
				{ rol: 'futbolista', nota: '', trato: 'socios' },
				{ rol: 'representante', nota: '', trato }
			];
			// La fase 1 lleva el trato firmado; el resto del año se juega solo. La
			// comisión se cobra al cerrar la temporada, así que hay que llegar
			// hasta ahí y no contar fases: el mercado son dos. Ver `probar.ts`.
			e = resolverFase(e, d, 'mesa').estado;
			e = unaTemporada(e, undefined, 'mesa');
			return e.representante.dineroUsd;
		};

		expect(correr('fuerte')).toBeGreaterThan(correr('minimo'));
	});
});
