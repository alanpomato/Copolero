import { describe, expect, it } from 'vitest';
import { club } from '../../../content/mundo';
import {
	CARTAS_QUE_DEJA_PASAR,
	cartasDelMercado,
	chanceDeQueLlegue,
	filtrar,
	loQueValenJuntos
} from './cartas';
import { estadoInicial } from './estado';
import { pasoDelMercado, quienesDeciden, resolverFase } from './fases';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * El mercado en dos tiempos.
 *
 * Lo que se prueba acá no es una fórmula: es que el representante tenga un
 * trabajo de verdad en el mercado y que elegir mal le cueste algo al otro. Es
 * la respuesta a lo que dijo Bebo jugando —"ahí el representante no tiene
 * ningún rol de negociación"— y a lo que pidió Alan después.
 */

function unaPartida(clubId = 'ar-huracan'): Estado {
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
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('cartas', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

/**
 * En el mercado, y con un jugador que de verdad tenga mercado.
 *
 * Un pibe de 16 en Huracán no recibe seis ofertas, y con menos de seis no se
 * puede probar un filtro: filtrar tres de tres no es filtrar. Así que acá va
 * uno hecho, que es donde la decisión del representante existe.
 */
function enElMercado(): Estado {
	const e = unaPartida();
	e.fase = 3;
	e.temporada = 5;
	e.futbolista.edad = 21;
	e.futbolista.fama = 60;
	for (const k of Object.keys(e.futbolista.atributos)) {
		(e.futbolista.atributos as Record<string, number>)[k] = 68;
	}
	return e;
}

describe('quién decide y cuándo', () => {
	it('en el mercado decide primero el representante, solo', () => {
		const e = enElMercado();
		expect(pasoDelMercado(e)).toBe('filtro');
		expect(quienesDeciden(e)).toEqual(['representante']);
	});

	it('y después decide el futbolista, solo', () => {
		let e = enElMercado();
		e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas: [] }], 'cartas').estado;

		expect(e.fase).toBe(3);
		expect(pasoDelMercado(e)).toBe('eleccion');
		expect(quienesDeciden(e)).toEqual(['futbolista']);
	});

	it('el primer tiempo no cierra la temporada: la deja a mitad de camino', () => {
		let e = enElMercado();
		const temporada = e.temporada;
		e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas: [] }], 'cartas').estado;
		expect(e.temporada).toBe(temporada);
	});

	it('fuera del mercado siguen decidiendo los dos', () => {
		const e = unaPartida();
		e.fase = 1;
		expect(quienesDeciden(e)).toEqual(['futbolista', 'representante']);
		e.fase = 2;
		expect(quienesDeciden(e)).toEqual(['futbolista', 'representante']);
	});

	/*
	 * Las partidas que venían de antes no tienen `mercado` guardado. Que arranquen
	 * por el primer tiempo es lo correcto: nadie filtró todavía.
	 */
	it('una partida vieja entra al mercado por el primer tiempo', () => {
		const e = enElMercado();
		delete e.mercado;
		expect(pasoDelMercado(e)).toBe('filtro');
	});
});

describe('la probabilidad de cada carta', () => {
	it('subir a un club más grande cuesta más que bajar', () => {
		const e = enElMercado();
		const arriba = chanceDeQueLlegue(e, 'ar-boca');
		const abajo = chanceDeQueLlegue(e, 'ar2-moron');
		expect(abajo).toBeGreaterThan(arriba);
	});

	it('un futbolista mejor empuja la operación', () => {
		const flojo = enElMercado();
		const bueno = enElMercado();
		for (const k of Object.keys(bueno.futbolista.atributos)) {
			(bueno.futbolista.atributos as Record<string, number>)[k] = 90;
		}
		expect(chanceDeQueLlegue(bueno, 'ar-boca')).toBeGreaterThan(
			chanceDeQueLlegue(flojo, 'ar-boca')
		);
	});

	/*
	 * Es la mitad del sentido del rol: si el prestigio del representante no
	 * moviera la aguja, filtrar sería tirar una moneda y su trabajo sería
	 * decorativo.
	 */
	it('y un representante con prestigio también', () => {
		const nadie = enElMercado();
		const capo = enElMercado();
		nadie.representante.prestigio = 5;
		capo.representante.prestigio = 95;
		expect(chanceDeQueLlegue(capo, 'ar-boca')).toBeGreaterThan(chanceDeQueLlegue(nadie, 'ar-boca'));
	});

	it('nunca es imposible ni está regalado', () => {
		const e = enElMercado();
		for (const id of ['ar-boca', 'es-realmadrid', 'ar2-moron', 'ar-instituto']) {
			const chance = chanceDeQueLlegue(e, id);
			expect(chance).toBeGreaterThanOrEqual(10);
			expect(chance).toBeLessThanOrEqual(95);
		}
	});

	it('lo que valen juntos pesa más el jugador que el representante', () => {
		const base = enElMercado();
		const mejorJugador = enElMercado();
		const mejorRepre = enElMercado();
		for (const k of Object.keys(mejorJugador.futbolista.atributos)) {
			(mejorJugador.futbolista.atributos as Record<string, number>)[k] += 20;
		}
		mejorRepre.representante.prestigio += 20;

		const subeElJugador = loQueValenJuntos(mejorJugador) - loQueValenJuntos(base);
		const subeElRepre = loQueValenJuntos(mejorRepre) - loQueValenJuntos(base);
		expect(subeElJugador).toBeGreaterThan(subeElRepre);
	});
});

describe('el filtro', () => {
	it('deja pasar como mucho tres, aunque manden seis', () => {
		const e = enElMercado();
		const todas = cartasDelMercado(e, 'cartas').map((c) => c.clubId);
		expect(todas.length).toBeGreaterThan(CARTAS_QUE_DEJA_PASAR);

		const r = filtrar(e, todas, 'cartas');
		expect(r.llegaron.length + r.seCayeron.length).toBe(CARTAS_QUE_DEJA_PASAR);
	});

	/* Un formulario editado no puede inventar un club que nunca estuvo. */
	it('ignora lo que no estaba sobre la mesa', () => {
		const e = enElMercado();
		const r = filtrar(e, ['es-madrid-inventado', 'no-existe'], 'cartas');
		expect(r.llegaron).toEqual([]);
		expect(r.seCayeron).toEqual([]);
	});

	it('ni repetir la misma tres veces para tener tres tiradas', () => {
		const e = enElMercado();
		const una = cartasDelMercado(e, 'cartas')[0].clubId;
		const r = filtrar(e, [una, una, una], 'cartas');
		expect(r.llegaron.length + r.seCayeron.length).toBe(1);
	});

	it('no dejar pasar nada deja al futbolista sin nada', () => {
		const e = enElMercado();
		const r = filtrar(e, [], 'cartas');
		expect(r.llegaron).toEqual([]);
	});

	it('es determinista: recargar la página no cambia el resultado', () => {
		const e = enElMercado();
		const tres = cartasDelMercado(e, 'cartas')
			.slice(0, CARTAS_QUE_DEJA_PASAR)
			.map((c) => c.clubId);
		expect(filtrar(e, tres, 'cartas')).toEqual(filtrar(e, tres, 'cartas'));
	});

	/*
	 * La consecuencia que hace que el rol exista: elegir las imposibles le deja
	 * al futbolista menos mundo. No es un castigo escondido —las probabilidades
	 * estaban a la vista— y por eso elegir bien vale algo.
	 */
	it('elegir las difíciles deja llegar menos que elegir las fáciles', () => {
		let conFaciles = 0;
		let conDificiles = 0;

		for (const semilla of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']) {
			const e = enElMercado();
			const ordenadas = [...cartasDelMercado(e, semilla)].sort(
				(a, b) => b.probabilidad - a.probabilidad
			);
			if (ordenadas.length < CARTAS_QUE_DEJA_PASAR * 2) continue;

			const faciles = ordenadas.slice(0, CARTAS_QUE_DEJA_PASAR).map((c) => c.clubId);
			const dificiles = ordenadas.slice(-CARTAS_QUE_DEJA_PASAR).map((c) => c.clubId);

			conFaciles += filtrar(e, faciles, semilla).llegaron.length;
			conDificiles += filtrar(e, dificiles, semilla).llegaron.length;
		}

		expect(conFaciles).toBeGreaterThan(conDificiles);
	});
});

describe('lo que ve cada uno', () => {
	it('el representante ve las seis con su probabilidad', () => {
		const e = enElMercado();
		const suyas = opcionesDeFase(e, 'representante', 'cartas');

		expect(suyas.cartas!.length).toBeGreaterThan(CARTAS_QUE_DEJA_PASAR);
		for (const c of suyas.cartas!) {
			expect(c.probabilidad).toBeGreaterThanOrEqual(10);
			expect(club(c.clubId).nombre.length).toBeGreaterThan(0);
		}
	});

	/*
	 * De su lado ya no se apuesta nada: se elige. Poner una probabilidad ahí
	 * sería pedirle que apueste dos veces por lo mismo.
	 */
	it('el futbolista ve las que llegaron, sin probabilidades', () => {
		let e = enElMercado();
		const dos = cartasDelMercado(e, 'cartas')
			.slice(0, 2)
			.map((c) => c.clubId);
		e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas: dos }], 'cartas').estado;

		const suyas = opcionesDeFase(e, 'futbolista', 'cartas');
		expect(suyas.cartas).toBeUndefined();
		for (const o of suyas.ofertas ?? []) {
			expect(e.mercado!.llegaron).toContain(o.clubId);
			expect(o).not.toHaveProperty('probabilidad');
		}
	});

	it('y solo esas: de las que se cayeron no se entera', () => {
		let e = enElMercado();
		const todas = cartasDelMercado(e, 'cartas').map((c) => c.clubId);
		e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas: todas }], 'cartas').estado;

		const ofrecidas = (opcionesDeFase(e, 'futbolista', 'cartas').ofertas ?? []).map(
			(o) => o.clubId
		);
		for (const caido of e.mercado!.seCayeron) {
			expect(ofrecidas).not.toContain(caido);
		}
	});

	it('la pantalla dice a quién le toca', () => {
		const e = enElMercado();
		expect(opcionesDeFase(e, 'representante', 'cartas').mercado!.meToca).toBe(true);
		expect(opcionesDeFase(e, 'futbolista', 'cartas').mercado!.meToca).toBe(false);
	});
});

describe('el pase, al final', () => {
	it('el futbolista se va a donde el representante lo dejó llegar', () => {
		let e = enElMercado();
		const todas = cartasDelMercado(e, 'cartas').map((c) => c.clubId);
		e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas: todas }], 'cartas').estado;

		const llegaron = e.mercado!.llegaron;
		if (llegaron.length === 0) return;

		const destino = llegaron[0];
		const despues = resolverFase(e, [{ rol: 'futbolista', nota: '', destino }], 'cartas').estado;
		expect(despues.futbolista.contrato.clubId).toBe(destino);
	});

	/*
	 * La regla que sostiene todo: sin esto, el filtro sería decorativo y el
	 * futbolista podría irse a un club que su representante nunca consiguió.
	 */
	it('y no puede irse a uno que no llegó, ni editando el formulario', () => {
		let e = enElMercado();
		const todas = cartasDelMercado(e, 'cartas');
		// Deja pasar una sola, y el futbolista intenta irse a otra.
		e = resolverFase(
			e,
			[{ rol: 'representante', nota: '', filtradas: [todas[0].clubId] }],
			'cartas'
		).estado;

		const nuncaLlego = todas.find((c) => !e.mercado!.llegaron.includes(c.clubId))!;
		const despues = resolverFase(
			e,
			[{ rol: 'futbolista', nota: '', destino: nuncaLlego.clubId }],
			'cartas'
		).estado;

		expect(despues.futbolista.contrato.clubId).not.toBe(nuncaLlego.clubId);
	});

	it('al cerrar el año el mercado queda limpio para el que viene', () => {
		let e = enElMercado();
		e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas: [] }], 'cartas').estado;
		e = resolverFase(e, [{ rol: 'futbolista', nota: '' }], 'cartas').estado;

		expect(e.temporada).toBe(6);
		expect(e.mercado).toBeUndefined();
		expect(pasoDelMercado(e)).toBe('filtro');
	});
});
