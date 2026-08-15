import { describe, expect, it } from 'vitest';
import { estadoInicial, media } from './estado';
import { resolverFase } from './fases';
import { ofertasPara } from './pases';
import { rngPara } from './rng';
import { contexto } from '../../../content/mundo';
import { PUESTOS, puesto } from './puestos';
import type { Decision, Estado } from './tipos';

/**
 * Carreras enteras, de punta a punta.
 *
 * Estos tests no verifican una fórmula: verifican que una carrera completa se
 * sienta como una carrera. Que el pibe suba, que el veterano baje, que el
 * cuerpo se termine antes que las ganas, y que ninguna de las dos formas de
 * jugar —cuidarse o romperse— sea la obvia. Es la red que avisa cuando un
 * número tocado por balance rompe el arco entero.
 */

type Estrategia = {
	intensidad: string;
	/** Si acepta el mejor pase disponible, y con qué exigencia de mejora. */
	mejoraMinima: number;
	gestion: string;
};

function correrCarrera(
	semilla: string,
	puestoId: string,
	clubInicial: string,
	estrategia: Estrategia
) {
	let estado: Estado = estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: puestoId,
				numero: puesto(puestoId).numero,
				pie: 'derecho',
				edadInicial: 16,
				clubId: clubInicial
			},
			representante: { nombre: 'Alan' }
		},
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);

	const clubes = [clubInicial];
	const notas: number[] = [];
	let vueltas = 0;

	while (!estado.carreraTerminada && vueltas < 30) {
		for (const fase of [1, 2, 3] as const) {
			let destino = 'quedarse';
			if (fase === 3) {
				const mejor = ofertasPara(estado, semilla)
					.filter((o) => o.brecha > -6)
					.sort((a, b) => b.salarioMensual - a.salarioMensual)[0];
				if (
					mejor &&
					mejor.salarioMensual > estado.futbolista.contrato.salarioMensual * estrategia.mejoraMinima
				) {
					destino = mejor.clubId;
				}
			}

			const decisiones: Decision[] = [
				{ rol: 'futbolista', nota: '', intensidad: estrategia.intensidad, destino },
				{ rol: 'representante', nota: '', gestion: estrategia.gestion, destino }
			];
			estado = resolverFase(estado, decisiones, semilla).estado;
		}

		const resumen = estado.ultimaTemporada!;
		notas.push(resumen.nota);
		if (clubes[clubes.length - 1] !== estado.futbolista.contrato.clubId) {
			clubes.push(estado.futbolista.contrato.clubId);
		}
		vueltas++;
	}

	return { estado, clubes, notas, temporadas: vueltas };
}

const AMBICIOSO: Estrategia = { intensidad: 'a-matar', mejoraMinima: 1.3, gestion: 'renovar' };
const PRUDENTE: Estrategia = { intensidad: 'suave', mejoraMinima: 3, gestion: 'acompanar' };

describe('una carrera entera', () => {
	it('termina sola, y ni muy corta ni eterna', () => {
		const { estado, temporadas } = correrCarrera('c1', 'centrodelantero', 'ar2-moron', AMBICIOSO);

		expect(estado.carreraTerminada).toBe(true);
		expect(temporadas).toBeGreaterThan(9);
		expect(temporadas).toBeLessThanOrEqual(24);
		expect(estado.futbolista.edad).toBeGreaterThanOrEqual(28);
		expect(estado.futbolista.edad).toBeLessThanOrEqual(41);
	});

	it('el que se cuida dura más que el que se rompe', () => {
		const roto = correrCarrera('c2', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		const entero = correrCarrera('c2', 'centrodelantero', 'ar2-moron', PRUDENTE);

		expect(entero.estado.futbolista.edad).toBeGreaterThan(roto.estado.futbolista.edad);
	});

	it('pero el que se rompe llega más arriba', () => {
		const roto = correrCarrera('c2', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		const entero = correrCarrera('c2', 'centrodelantero', 'ar2-moron', PRUDENTE);

		const techo = (r: typeof roto) => Math.max(...r.clubes.map((c) => contexto(c).liga.fuerza));
		expect(techo(roto)).toBeGreaterThanOrEqual(techo(entero));
		expect(roto.estado.futbolista.dineroUsd).toBeGreaterThan(entero.estado.futbolista.dineroUsd);
	});

	it('el que arranca en el Ascenso puede terminar en otra liga', () => {
		const { clubes } = correrCarrera('c3', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		expect(clubes.length).toBeGreaterThan(1);
		expect(contexto(clubes[clubes.length - 1]).liga.id).not.toBe('ar-2');
	});

	it('la media sube de joven y se frena de grande', () => {
		const { estado } = correrCarrera('c4', 'enganche', 'ar2-moron', AMBICIOSO);
		const final = media(estado.futbolista.atributos, estado.futbolista.posicion);
		expect(final).toBeGreaterThan(50);
		// El potencial es un techo de verdad: nadie lo pasa por mucho.
		expect(final).toBeLessThan(estado.futbolista.potencial + 12);
	});

	it('el representante termina con plata y con prestigio', () => {
		const { estado } = correrCarrera('c5', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		expect(estado.representante.dineroUsd).toBeGreaterThan(50_000);
		expect(estado.representante.prestigio).toBeGreaterThan(10);
	});

	it('las notas se mueven: no es siempre 5 ni siempre 9', () => {
		const { notas } = correrCarrera('c6', 'centrodelantero', 'ar2-moron', AMBICIOSO);
		expect(Math.max(...notas) - Math.min(...notas)).toBeGreaterThan(1.5);
		for (const nota of notas) {
			expect(nota).toBeGreaterThanOrEqual(1);
			expect(nota).toBeLessThanOrEqual(10);
		}
	});

	it('la misma semilla da la misma carrera', () => {
		const a = correrCarrera('igual', 'central', 'ar2-ferro', AMBICIOSO);
		const b = correrCarrera('igual', 'central', 'ar2-ferro', AMBICIOSO);
		expect(a.clubes).toEqual(b.clubes);
		expect(a.notas).toEqual(b.notas);
		expect(a.estado).toEqual(b.estado);
	});

	it('los once puestos llegan al final sin romperse', () => {
		for (const p of PUESTOS) {
			const { estado, temporadas } = correrCarrera(`p-${p.id}`, p.id, 'ar2-moron', AMBICIOSO);
			expect(estado.carreraTerminada, p.nombre).toBe(true);
			expect(temporadas, p.nombre).toBeGreaterThan(6);
		}
	});
});
