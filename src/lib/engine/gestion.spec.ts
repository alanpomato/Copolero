import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { ACCIONES, accionesDe, cobrarLoQueMueve, resolverGestion } from './gestion';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * La gestión del representante.
 *
 * Dos pedidos de Alan que se resolvieron juntos: que cada tarjeta diga cuánto
 * sube y cuánto baja, y que se elija una sola vez por año.
 */

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
				clubId: 'ar-huracan'
			},
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('gest', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

describe('una sola por año', () => {
	/*
	 * Antes se elegía dos veces —fase 1 y otra vez fase 2— y eso la convertía en
	 * un trámite, además de competir con los momentos, que es lo que el
	 * representante de verdad tiene para hacer durante la temporada.
	 */
	it('se elige en la pretemporada y no vuelve a aparecer', () => {
		const e = unaPartida();
		expect(accionesDe(1).length).toBeGreaterThan(0);
		expect(accionesDe(2)).toEqual([]);
		expect(accionesDe(3)).toEqual([]);

		e.fase = 1;
		expect(opcionesDeFase(e, 'representante', 'gest').gestiones?.length).toBeGreaterThan(0);
		e.fase = 2;
		expect(opcionesDeFase(e, 'representante', 'gest').gestiones).toBeUndefined();
	});
});

describe('lo que dice la tarjeta es lo que cobra el motor', () => {
	it('todas declaran qué mueven', () => {
		for (const a of ACCIONES) {
			expect(a.siSale, a.id).toBeDefined();
			expect(a.siFalla, a.id).toBeDefined();
		}
	});

	/*
	 * La prueba que importa. Si `aplicar` volviera a mover una stat por su
	 * cuenta, la tarjeta prometería una cosa y el motor haría otra, que es
	 * exactamente lo que había antes.
	 */
	it('acompañar cobra lo que promete, ni más ni menos', () => {
		const e = unaPartida();
		const accion = ACCIONES.find((a) => a.id === 'acompanar')!;
		const confianzaAntes = e.confianza;
		const moralAntes = e.futbolista.moral;

		e.fase = 1;
		resolverGestion(e, 'acompanar', 'gest');

		expect(e.confianza).toBe(confianzaAntes + (accion.siSale.confianza ?? 0));
		expect(e.futbolista.moral).toBe(moralAntes + (accion.siSale.moral ?? 0));
	});

	it('lo declarado llega a la pantalla', () => {
		const e = unaPartida();
		e.fase = 1;
		const vistas = opcionesDeFase(e, 'representante', 'gest').gestiones!;
		for (const g of vistas) {
			expect(g.siSale, g.id).toBeDefined();
			expect(g.siFalla, g.id).toBeDefined();
		}
		// Y al menos una tiene algo que mostrar, o los chips no servirían de nada.
		expect(vistas.some((g) => Object.keys(g.siSale).length > 0)).toBe(true);
	});

	it('cobrar nada no rompe nada', () => {
		const e = unaPartida();
		const antes = structuredClone(e);
		cobrarLoQueMueve(e, {});
		expect(e).toEqual(antes);
	});

	it('nada se sale de rango, ni sumando ni restando', () => {
		const e = unaPartida();
		for (let i = 0; i < 60; i++) {
			cobrarLoQueMueve(e, { prestigio: 9, contactos: 9, confianza: 9, moral: 9, fama: 9 });
		}
		expect(e.representante.prestigio).toBeLessThanOrEqual(100);
		expect(e.confianza).toBeLessThanOrEqual(100);
		expect(e.futbolista.fama).toBeLessThanOrEqual(100);

		for (let i = 0; i < 60; i++) {
			cobrarLoQueMueve(e, { prestigio: -9, contactos: -9, confianza: -9, moral: -9, fama: -9 });
		}
		expect(e.representante.prestigio).toBeGreaterThanOrEqual(0);
		expect(e.confianza).toBeGreaterThanOrEqual(0);
		expect(e.futbolista.fama).toBeGreaterThanOrEqual(0);
	});
});
