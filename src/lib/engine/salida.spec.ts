import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { unaTemporada } from './probar';
import { ofertasPara } from './pases';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import { PIDE, pedirLaSalida, puedePedirLaSalida } from './salida';
import type { Decision, Estado } from './tipos';

function unJugador(clubId = 'ar-huracan'): Estado {
	const e = estadoInicial(
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
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('sal', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
	// En nivel y con contrato: si no, no hay de qué pedir salir.
	for (const k of Object.keys(e.futbolista.atributos)) {
		e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = 62;
	}
	e.futbolista.edad = 24;
	e.futbolista.fama = 60;
	e.futbolista.contrato.temporadasRestantes = 3;
	return e;
}

describe('pedir la salida', () => {
	it('cuesta con el técnico y con la hinchada, en el acto', () => {
		const e = unJugador();
		e.futbolista.dt = 40;
		e.futbolista.hinchada = 60;

		const linea = pedirLaSalida(e, PIDE);

		expect(linea).toContain('pidió salir');
		expect(e.pidioLaSalida).toBe(true);
		expect(e.futbolista.dt).toBeLessThan(40);
		expect(e.futbolista.hinchada).toBeLessThan(60);
	});

	it('no pasa nada si no lo pide', () => {
		const e = unJugador();
		expect(pedirLaSalida(e, undefined)).toBeNull();
		expect(pedirLaSalida(e, 'cualquier-cosa')).toBeNull();
		expect(e.pidioLaSalida).toBe(false);
	});

	it('no se puede pedir dos veces el mismo año', () => {
		const e = unJugador();
		pedirLaSalida(e, PIDE);
		expect(puedePedirLaSalida(e)).toBe(false);
		expect(pedirLaSalida(e, PIDE)).toBeNull();
	});

	it('el que ya está libre no tiene de qué pedir salir', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 0;
		expect(puedePedirLaSalida(e)).toBe(false);
	});

	it('trae más ofertas y más baratas que quedarse callado', () => {
		// El mismo jugador, la misma semilla, el mismo club: lo único distinto es
		// haber dicho que se quiere ir.
		const callado = unJugador();
		const pidiendo = unJugador();
		pidiendo.pidioLaSalida = true;

		const sinPedir = ofertasPara(callado, 'mercado');
		const pidiendolo = ofertasPara(pidiendo, 'mercado');

		expect(pidiendolo.length).toBeGreaterThan(sinPedir.length);

		// Y el pase sale más barato: el club que vende ya no puede decir que no.
		const masCaroSinPedir = Math.max(...sinPedir.map((o) => o.montoUsd));
		const masCaroPidiendo = Math.max(...pidiendolo.map((o) => o.montoUsd));
		expect(masCaroPidiendo).toBeLessThan(masCaroSinPedir);
	});

	it('en la temporada se ofrece, y una vez pedido no se vuelve a ofrecer', () => {
		const e = unJugador();
		e.fase = 2;

		const antes = opcionesDeFase(e, 'futbolista', 'sal');
		expect(antes.salida?.aviso.length).toBeGreaterThan(30);
		// Y al representante no: el que pide salir es el que juega.
		expect(opcionesDeFase(e, 'representante', 'sal').salida).toBeUndefined();

		e.pidioLaSalida = true;
		expect(opcionesDeFase(e, 'futbolista', 'sal').salida).toBeUndefined();
	});

	it('se pide en la temporada y se apaga al cerrar el año', () => {
		let e = unJugador();
		e.fase = 2;

		const decisiones: Decision[] = [
			{ rol: 'futbolista', nota: '', pedirSalida: PIDE },
			{ rol: 'representante', nota: '', gestion: 'acompanar' }
		];
		const { estado: jugada, log } = resolverFase(e, decisiones, 'sal');
		expect(jugada.pidioLaSalida).toBe(true);
		// Los dos se enteran: es lo primero que el representante tiene que saber
		// antes de sentarse a negociar.
		expect(log.some((l) => l.tipo === 'salida' && l.visiblePara === 'ambos')).toBe(true);

		// Cierra el mercado y el pedido se apaga: vale para ese mercado, no para
		// siempre. El mercado son dos resoluciones —el representante y después
		// él—, así que se avanza hasta que arranque la temporada que viene.
		e = unaTemporada(jugada, undefined, 'sal');
		expect(e.pidioLaSalida).toBe(false);
	});
});
