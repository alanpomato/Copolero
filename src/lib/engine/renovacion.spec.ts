import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { enLaEleccion, hastaLaFase, unaTemporada } from './probar';
import { ofertasPara } from './pases';
import { opcionesDeFase } from './pantalla';
import {
	ESPERAR,
	FIRMAR,
	TEMPORADAS_DE_SOBRA_PARA_RENEGOCIAR,
	anosEnElClub,
	chanceDeRenegociarTemprano,
	estaLibre,
	ofertaDeRenovacion,
	rendimientoRecienteEnElClub,
	resolverRenegociarTemprano,
	resolverRenovacion,
	tocaOfrecerRenegociarTemprano,
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
		// Directo al segundo tiempo del mercado: acá se prueba el pase, y pasar
		// por el filtro del representante ataría el test a su azar. Ver `probar.ts`.
		const e = enLaEleccion(libreEnElMercado());
		const oferta = ofertasPara(e, 'renov')[0];
		const antes = e.futbolista.dineroUsd;

		const despues = resolverFase(
			e,
			[{ rol: 'futbolista', nota: '', destino: oferta.clubId }],
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
		e = enLaEleccion(e);

		const mostradas = opcionesDeFase(e, 'futbolista', 'renov').ofertas!;
		expect(mostradas.length).toBeGreaterThan(0);

		const elegida = mostradas[0];
		const despues = resolverFase(
			e,
			[{ rol: 'futbolista', nota: '', destino: elegida.clubId }],
			'renov'
		).estado;

		expect(despues.futbolista.contrato.clubId).toBe(elegida.clubId);
		expect(despues.futbolista.contrato.salarioMensual).toBe(elegida.salarioMensual);
		expect(despues.futbolista.contrato.temporadasRestantes).toBe(elegida.temporadas);
	});

	it('al que le quedaba una temporada, el mercado lo encuentra libre', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 1;
		// El primer tiempo del mercado, que es cuando el representante ve las seis.
		e.fase = 3;

		// La temporada que se acaba de jugar consumió el último año. Se miran las
		// cartas del representante, que es lo que él ve en el mercado: las ofertas
		// del futbolista son el subconjunto que él deje pasar.
		for (const o of opcionesDeFase(e, 'representante', 'renov').cartas!) {
			expect(o.montoUsd).toBe(0);
			expect(o.primaUsd).toBeGreaterThan(0);
		}
	});
});

describe('en una partida de verdad', () => {
	it('nunca se queda sin club por dejar vencer un contrato', () => {
		// Que se le termine el contrato no es que lo echen. Sin esta regla, el que
		// firmaba un año quedaba expulsado al terminarlo aunque las dos partes
		// estuvieran contentas, y una carrera entera en un mismo club era
		// imposible.
		//
		// Lo que este test comprobaba antes era más fuerte: que se quedara en el
		// mismo club las ocho temporadas. Eso era cierto porque el motor renovaba
		// solo, sin que nadie negociara nada, y ésa era exactamente la raíz del
		// bug que encontró Bebo. Ahora la renovación se juega en una mesa y puede
		// salir mal; lo que no puede pasar nunca es quedarse sin equipo.
		let e = unJugador('ar2-moron');
		e.futbolista.contrato.temporadasRestantes = 1;

		let vueltas = 0;
		while (!e.carreraTerminada && vueltas < 8) {
			e = unaTemporada(e, NADA, 'quedarse');
			vueltas++;
			expect(e.futbolista.contrato.clubId.length).toBeGreaterThan(0);
			expect(e.futbolista.contrato.temporadasRestantes).toBeGreaterThanOrEqual(0);
		}
		expect(e.carreraTerminada).toBe(false);
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
			e = unaTemporada(e, NADA, 'larga');
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

/** Una fila de historial cualquiera, para armar el pasado sin escribir carrera. */
function unaFila(clubId: string, nota: number) {
	return {
		temporada: 1,
		anio: 2026,
		edad: 20,
		clubId,
		media: 60,
		nota,
		partidos: 30,
		goles: 5,
		asistencias: 5,
		fama: 40,
		valorUsd: 1_000_000,
		campeon: false,
		titulo: false,
		lesionado: false,
		mundial: null,
		seFue: false
	};
}

describe('renegociar antes de tiempo, como acción del repre en el mercado', () => {
	it('solo con contrato de sobra: si quedara poco, ya está la mesa de siempre', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = TEMPORADAS_DE_SOBRA_PARA_RENEGOCIAR - 1;
		expect(tocaOfrecerRenegociarTemprano(e)).toBe(false);

		e.futbolista.contrato.temporadasRestantes = TEMPORADAS_DE_SOBRA_PARA_RENEGOCIAR;
		expect(tocaOfrecerRenegociarTemprano(e)).toBe(true);
	});

	it('cuenta las temporadas seguidas en el club de hoy, y un pase corta la cuenta', () => {
		const e = unJugador('ar-huracan');
		e.historial = [
			unaFila('ar2-moron', 6),
			unaFila('ar-huracan', 7),
			unaFila('ar-huracan', 7),
			unaFila('ar-huracan', 8)
		];
		expect(anosEnElClub(e)).toBe(3);
	});

	it('sin historial en el club, ni una temporada', () => {
		const e = unJugador();
		e.historial = [];
		expect(anosEnElClub(e)).toBe(0);
	});

	/*
	 * El bug que encontré jugando: el representante filtra las cartas del
	 * mercado ANTES de que `anotarEnElHistorial` escriba la fila del año que
	 * se acaba de jugar —eso pasa recién en el segundo tiempo, cuando el
	 * futbolista resuelve el pase—. Contra `estado.historial` a secas, un
	 * jugador con una temporada de verdad en el club aparecía en la tarjeta de
	 * "Renegociar" con 0 años ahí. `ultimaTemporada` es la fila que todavía no
	 * se escribió, y hay que sumarla a mano.
	 */
	function unResumen(clubId: string, nota: number, temporada = 1) {
		return {
			temporada,
			clubId,
			partidos: 30,
			goles: 5,
			asistencias: 5,
			minutos: 2500,
			puesto: 5,
			equipos: 20,
			nota,
			lesionado: false,
			campeon: false
		};
	}

	it('en el primer tiempo del mercado, cuenta la temporada que se acaba de jugar aunque el historial no la tenga todavía', () => {
		const e = unJugador('ar-huracan');
		e.historial = [unaFila('ar-huracan', 7)];
		e.ultimaTemporada = unResumen('ar-huracan', 8, 2);
		e.futbolista.contrato.temporadasRestantes = 3;

		// Sin la fix, esto daba 1 (solo lo que ya estaba escrito en el historial).
		expect(anosEnElClub(e)).toBe(2);
	});

	it('no la cuenta dos veces si el historial ya la tiene escrita', () => {
		const e = unJugador('ar-huracan');
		e.historial = [unaFila('ar-huracan', 7), { ...unaFila('ar-huracan', 8), temporada: 2 }];
		e.ultimaTemporada = unResumen('ar-huracan', 8, 2);

		expect(anosEnElClub(e)).toBe(2);
	});

	it('el rendimiento reciente mira la nota de verdad, no la media de hoy', () => {
		const e = unJugador('ar-huracan');
		e.historial = [
			unaFila('ar-huracan', 5),
			unaFila('ar-huracan', 8),
			unaFila('ar-huracan', 9),
			unaFila('ar-huracan', 8)
		];
		// Las últimas tres: 8, 9, 8.
		expect(rendimientoRecienteEnElClub(e)).toBeCloseTo((8 + 9 + 8) / 3, 5);
	});

	it('sin historial, un rendimiento neutro y no un cero que hunda la cuenta', () => {
		const e = unJugador();
		e.historial = [];
		expect(rendimientoRecienteEnElClub(e)).toBe(6);
	});

	it('un jugador mejor, con más años y mejor rendimiento, tiene más chance', () => {
		const flojo = unJugador();
		flojo.futbolista.contrato.temporadasRestantes = 3;
		flojo.historial = [unaFila(flojo.futbolista.contrato.clubId, 5)];

		const bueno = unJugador();
		bueno.futbolista.contrato.temporadasRestantes = 3;
		for (const k of Object.keys(bueno.futbolista.atributos)) {
			(bueno.futbolista.atributos as Record<string, number>)[k] = 85;
		}
		bueno.historial = [
			unaFila(bueno.futbolista.contrato.clubId, 8),
			unaFila(bueno.futbolista.contrato.clubId, 8),
			unaFila(bueno.futbolista.contrato.clubId, 9)
		];

		expect(chanceDeRenegociarTemprano(bueno)).toBeGreaterThan(chanceDeRenegociarTemprano(flojo));
	});

	it('y un representante que negocia mejor también empuja la chance', () => {
		const e1 = unJugador();
		e1.futbolista.contrato.temporadasRestantes = 3;
		const e2 = unJugador();
		e2.futbolista.contrato.temporadasRestantes = 3;
		e2.representante.atributos.negociacion = 90;
		e2.representante.atributos.contactos = 90;
		e2.representante.prestigio = 80;

		expect(chanceDeRenegociarTemprano(e2)).toBeGreaterThan(chanceDeRenegociarTemprano(e1));
	});

	it('no se ofrece nada si no toca: no muta y no pasa nada', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 1;
		const salario = e.futbolista.contrato.salarioMensual;
		const log: EntradaLog[] = [];

		resolverRenegociarTemprano(e, 'renov', log);

		expect(e.futbolista.contrato.salarioMensual).toBe(salario);
		expect(log).toEqual([]);
	});

	it('si sale bien, mejora el sueldo y suma temporadas, y el repre cobra su parte', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 4;
		for (const k of Object.keys(e.futbolista.atributos)) {
			(e.futbolista.atributos as Record<string, number>)[k] = 88;
		}
		e.representante.atributos.negociacion = 95;
		e.representante.atributos.contactos = 90;
		e.representante.prestigio = 85;
		e.historial = [
			unaFila(e.futbolista.contrato.clubId, 9),
			unaFila(e.futbolista.contrato.clubId, 9),
			unaFila(e.futbolista.contrato.clubId, 9)
		];

		let saliobien = false;
		for (const semilla of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
			const copia = structuredClone(e);
			const antes = copia.futbolista.contrato.salarioMensual;
			const antesTemporadas = copia.futbolista.contrato.temporadasRestantes;
			const antesPlata = copia.representante.dineroUsd;
			const log: EntradaLog[] = [];

			resolverRenegociarTemprano(copia, semilla, log);

			if (copia.futbolista.contrato.salarioMensual > antes) {
				saliobien = true;
				expect(copia.futbolista.contrato.temporadasRestantes).toBeGreaterThan(antesTemporadas);
				expect(copia.representante.dineroUsd).toBeGreaterThan(antesPlata);
				expect(log.some((l) => l.tipo === 'contrato' && l.visiblePara === 'ambos')).toBe(true);
			}
		}
		expect(saliobien).toBe(true);
	});

	it('si sale mal, no toca el contrato y el aviso es solo para el repre', () => {
		const e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 3;
		e.representante.atributos.negociacion = 5;
		e.representante.atributos.contactos = 5;
		e.representante.prestigio = 5;
		e.historial = [unaFila(e.futbolista.contrato.clubId, 3)];

		let salioMal = false;
		for (const semilla of ['a', 'b', 'c', 'd', 'e', 'f']) {
			const copia = structuredClone(e);
			const antes = copia.futbolista.contrato.salarioMensual;
			const log: EntradaLog[] = [];

			resolverRenegociarTemprano(copia, semilla, log);

			if (copia.futbolista.contrato.salarioMensual === antes) {
				salioMal = true;
				expect(log.every((l) => l.visiblePara === 'representante')).toBe(true);
			}
		}
		expect(salioMal).toBe(true);
	});

	it('es una acción del repre en el mercado: se juega junto con el filtro de cartas', () => {
		const e = unJugador();
		e.fase = 3;
		e.futbolista.contrato.temporadasRestantes = 5;
		e.futbolista.fama = 60;
		for (const k of Object.keys(e.futbolista.atributos)) {
			(e.futbolista.atributos as Record<string, number>)[k] = 70;
		}
		e.representante.atributos.negociacion = 90;
		e.representante.atributos.contactos = 90;
		e.representante.prestigio = 90;
		e.historial = [unaFila(e.futbolista.contrato.clubId, 9)];

		const antes = e.futbolista.contrato.salarioMensual;
		const despues = resolverFase(
			e,
			[{ rol: 'futbolista', nota: '' }, { rol: 'representante', nota: '', filtradas: [], renegociar: true }],
			'renegociando'
		).estado;

		// No hace falta que salga bien para que el mercado siga funcionando.
		expect(despues.fase).toBe(3);
		expect(despues.futbolista.contrato.salarioMensual).toBeGreaterThanOrEqual(antes);
	});

	/*
	 * El mismo bug de arriba, pero jugado de verdad en vez de armado a mano:
	 * una temporada entera, con `unaTemporada`, hasta llegar al primer tiempo
	 * del mercado —donde el representante ve la tarjeta de "Renegociar"—. Si
	 * `anosEnElClub` mirara solo `estado.historial`, acá daría 0 después de
	 * jugar una temporada entera en el club, que es exactamente lo que se vio
	 * jugando.
	 */
	it('la tarjeta del mercado ya cuenta la temporada recién jugada, no la anterior', () => {
		let e = unJugador();
		e.futbolista.contrato.temporadasRestantes = 5;
		e = hastaLaFase(e, 3); // fase 1 y fase 2, con las decisiones por defecto.

		expect(e.fase).toBe(3);
		expect(e.historial).toEqual([]); // Todavía no se escribió: recién en el segundo tiempo.

		const suyas = opcionesDeFase(e, 'representante', 'test');
		expect(suyas.renegociarTemprano?.anosEnElClub).toBe(1);
	});
});
