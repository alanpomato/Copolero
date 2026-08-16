import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { ofertasPara } from './pases';
import { opcionesDeFase } from './pantalla';
import {
	ESPERAR,
	FIRMAR,
	estaLibre,
	ofertaDeRenovacion,
	resolverRenovacion,
	tocaRenovar
} from './renovacion';
import { rngPara } from './rng';
import type { Decision, EntradaLog, Estado } from './tipos';

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
			representante: { nombre: 'Alan' }
		},
		rngPara('renov', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
	// Lo ponemos en nivel para que el club lo quiera: si no, no hay oferta.
	for (const k of Object.keys(e.futbolista.atributos)) {
		e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = 62;
	}
	e.futbolista.edad = 24;
	e.futbolista.contrato.temporadasRestantes = 1;
	return e;
}

const NADA: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

describe('cuándo se sienta a hablar con el club', () => {
	it('con dos temporadas por delante no toca renovar', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 2;
		expect(tocaRenovar(e)).toBe(false);
		expect(ofertaDeRenovacion(e, 'renov')).toBeNull();
	});

	it('con una temporada, o vencido, sí', () => {
		const e = unJugador();
		expect(tocaRenovar(e)).toBe(true);
		e.futbolista.contrato.temporadasRestantes = 0;
		expect(tocaRenovar(e)).toBe(true);
		expect(estaLibre(e)).toBe(true);
	});

	it('al que no juega el club no lo renueva', () => {
		// Un pibe de media 62 en el Manchester City no tiene renovación que
		// discutir, y enterarse de eso es la mitad de la información.
		const e = unJugador('en-mancity');
		expect(tocaRenovar(e)).toBe(true);
		expect(ofertaDeRenovacion(e, 'renov')).toBeNull();
	});

	it('la oferta mejora lo que cobra hoy', () => {
		const e = unJugador();
		const o = ofertaDeRenovacion(e, 'renov')!;
		expect(o.salarioMensual).toBeGreaterThan(e.futbolista.contrato.salarioMensual);
		expect(o.temporadas).toBeGreaterThanOrEqual(1);
		expect(o.comisionUsd).toBeGreaterThan(0);
	});

	it('a los treinta y pico nadie firma cuatro años', () => {
		const e = unJugador();
		e.futbolista.edad = 34;
		expect(ofertaDeRenovacion(e, 'renov')!.temporadas).toBe(1);
	});
});

describe('la mesa con el club', () => {
	it('firman los dos y queda firmado', () => {
		const e = unJugador();
		const o = ofertaDeRenovacion(e, 'renov')!;
		const log: EntradaLog[] = [];
		const antes = e.representante.dineroUsd;

		resolverRenovacion(e, 'renov', FIRMAR, FIRMAR, log);

		expect(e.futbolista.contrato.salarioMensual).toBe(o.salarioMensual);
		expect(e.futbolista.contrato.temporadasRestantes).toBe(o.temporadas);
		expect(e.representante.dineroUsd).toBe(antes + o.comisionUsd);
	});

	it('si eligen distinto no se firma nada y la confianza lo paga', () => {
		const e = unJugador();
		const salario = e.futbolista.contrato.salarioMensual;
		const confianza = e.confianza;

		resolverRenovacion(e, 'renov', FIRMAR, ESPERAR, []);

		expect(e.futbolista.contrato.salarioMensual).toBe(salario);
		expect(e.confianza).toBeLessThan(confianza);
	});

	it('esperar cuesta la relación con el técnico', () => {
		const e = unJugador();
		const dt = e.futbolista.dt;

		resolverRenovacion(e, 'renov', ESPERAR, ESPERAR, []);

		expect(e.futbolista.dt).toBeLessThan(dt);
		// Y el contrato sigue como estaba: nadie firmó nada.
		expect(e.futbolista.contrato.temporadasRestantes).toBe(1);
	});

	it('el que no elige, firma: una partida no se traba por no tocar un botón', () => {
		const e = unJugador();
		resolverRenovacion(e, 'renov', undefined, undefined, []);
		expect(e.futbolista.contrato.temporadasRestantes).toBeGreaterThan(1);
	});
});

describe('salir libre', () => {
	function libreEnElMercado(): Estado {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 0;
		e.fase = 3;
		e.futbolista.fama = 45;
		return e;
	}

	it('el pase no cuesta nada y aparece una prima por firmar', () => {
		const ofertas = ofertasPara(libreEnElMercado(), 'renov');
		expect(ofertas.length).toBeGreaterThan(0);
		for (const o of ofertas) {
			expect(o.montoUsd).toBe(0);
			expect(o.primaUsd).toBeGreaterThan(0);
		}
	});

	it('libre le pagan más sueldo que con contrato', () => {
		const conContrato = { ...libreEnElMercado() };
		conContrato.futbolista = structuredClone(conContrato.futbolista);
		conContrato.futbolista.contrato.temporadasRestantes = 2;

		const librePromedio = promedio(
			ofertasPara(libreEnElMercado(), 'renov').map((o) => o.salarioMensual)
		);
		const atadoPromedio = promedio(ofertasPara(conContrato, 'renov').map((o) => o.salarioMensual));

		// Lo que el club se ahorra en el pase lo pone en el sueldo. Es toda la
		// razón por la que dejar vencer el contrato es una apuesta y no un error.
		expect(librePromedio).toBeGreaterThan(atadoPromedio);
	});

	it('el representante igual cobra: su porcentaje sale de la prima', () => {
		for (const o of ofertasPara(libreEnElMercado(), 'renov')) {
			expect(o.comisionUsd).toBeGreaterThan(0);
		}
	});

	it('la prima se la queda el futbolista al firmar', () => {
		const e = libreEnElMercado();
		const oferta = ofertasPara(e, 'renov')[0];
		const antes = e.futbolista.dineroUsd;

		const despues = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '', destino: oferta.clubId },
				{ rol: 'representante', nota: '', destino: oferta.clubId }
			],
			'renov'
		).estado;

		if (despues.futbolista.contrato.clubId === oferta.clubId) {
			expect(despues.futbolista.dineroUsd).toBeGreaterThan(antes);
		}
	});
});

describe('lo que se ve es lo que se firma', () => {
	it('las ofertas de la pantalla son las mismas que resuelve el motor', () => {
		// El contrato corre un año antes del mercado. Cuando cada lado hacía esa
		// cuenta por su cuenta, la pantalla mostraba un pase millonario y el motor
		// firmaba uno libre: los dos jugadores decidían sobre números que no eran.
		let e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 1;
		e.fase = 3;

		const mostradas = opcionesDeFase(e, 'futbolista', 'renov').ofertas!;
		expect(mostradas.length).toBeGreaterThan(0);

		const elegida = mostradas[0];
		const despues = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '', destino: elegida.clubId },
				{ rol: 'representante', nota: '', destino: elegida.clubId }
			],
			'renov'
		).estado;

		expect(despues.futbolista.contrato.clubId).toBe(elegida.clubId);
		expect(despues.futbolista.contrato.salarioMensual).toBe(elegida.salarioMensual);
		expect(despues.futbolista.contrato.temporadasRestantes).toBe(elegida.temporadas);
	});

	it('al que le quedaba una temporada, el mercado lo encuentra libre', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 1;
		e.fase = 3;

		// La temporada que se acaba de jugar consumió el último año.
		for (const o of opcionesDeFase(e, 'representante', 'renov').ofertas!) {
			expect(o.montoUsd).toBe(0);
			expect(o.primaUsd).toBeGreaterThan(0);
		}
	});
});

describe('en una partida de verdad', () => {
	it('el club puede renovarlo sobre la hora en vez de dejarlo ir', () => {
		// Que se le termine el contrato no es que lo echen. Sin esta regla, el que
		// firmaba un año quedaba expulsado al terminarlo aunque las dos partes
		// estuvieran contentas, y una carrera entera en un mismo club era
		// imposible.
		let e = unJugador('ar2-moron');
		e.futbolista.contrato.temporadasRestantes = 1;

		let vueltas = 0;
		while (!e.carreraTerminada && vueltas < 8) {
			for (let f = 0; f < 3; f++) e = resolverFase(e, NADA, 'quedarse').estado;
			vueltas++;
		}
		// Nunca se quedó sin club: en un club donde juega, siempre hay renovación.
		expect(e.futbolista.contrato.clubId).toBe('ar2-moron');
	});

	it('la mesa con el club llega a los dos roles con los mismos números', () => {
		const e = unJugador();
		const delJugador = opcionesDeFase(e, 'futbolista', 'renov').renovacion;
		const delRepre = opcionesDeFase(e, 'representante', 'renov').renovacion;
		expect(delJugador).toEqual(delRepre);
		expect(delJugador?.oferta).not.toBeNull();
	});

	it('una carrera entera no se rompe con la renovación puesta', () => {
		let e = estadoInicial(
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
			rngPara('larga', { temporada: 0, fase: 1, clave: 'inicio' }),
			2026
		);

		let vueltas = 0;
		while (!e.carreraTerminada && vueltas < 30) {
			for (let f = 0; f < 3; f++) e = resolverFase(e, NADA, 'larga').estado;
			vueltas++;
			// El contrato nunca queda en un estado imposible.
			expect(e.futbolista.contrato.temporadasRestantes).toBeGreaterThanOrEqual(0);
			expect(e.futbolista.contrato.salarioMensual).toBeGreaterThan(0);
		}
		expect(e.carreraTerminada).toBe(true);
	});
});

function promedio(numeros: number[]): number {
	return numeros.reduce((a, b) => a + b, 0) / Math.max(1, numeros.length);
}
