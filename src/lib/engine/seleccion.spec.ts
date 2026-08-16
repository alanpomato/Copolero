import { describe, expect, it } from 'vitest';
import { estadoInicial, media } from './estado';
import { resolverFase } from './fases';
import { rngPara } from './rng';
import {
	chanceDeConvocatoria,
	esAnioDeMundial,
	fuerzaDeLaSeleccion,
	jugarConLaSeleccion,
	loQueFalta,
	proximoMundial,
	puntosDeSeleccion
} from './seleccion';
import type { Decision, Estado } from './tipos';

function unPibe(nacionalidad = 'Argentina', clubId = 'ar2-moron'): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad,
				puesto: 'centrodelantero',
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId
			},
			representante: { nombre: 'Alan' }
		},
		rngPara('sel', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

/** Un crack, para probar el otro extremo. */
function unCrack(nacionalidad = 'Argentina', clubId = 'es-realmadrid'): Estado {
	const e = unPibe(nacionalidad, clubId);
	for (const k of Object.keys(e.futbolista.atributos)) {
		e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = 88;
	}
	e.futbolista.fama = 90;
	e.futbolista.edad = 26;
	return e;
}

describe('el calendario del Mundial', () => {
	it('es cada cuatro años desde 2026', () => {
		expect(esAnioDeMundial(2026)).toBe(true);
		expect(esAnioDeMundial(2030)).toBe(true);
		expect(esAnioDeMundial(2027)).toBe(false);
		expect(esAnioDeMundial(2029)).toBe(false);
	});

	it('el próximo se calcula bien, y en año de Mundial es el mismo año', () => {
		expect(proximoMundial(2026)).toBe(2026);
		expect(proximoMundial(2027)).toBe(2030);
		expect(proximoMundial(2029)).toBe(2030);
		expect(proximoMundial(2031)).toBe(2034);
	});
});

describe('que te llamen', () => {
	it('a un pibe del Ascenso no lo llama nadie', () => {
		expect(chanceDeConvocatoria(unPibe())).toBe(0);
	});

	it('a un crack en el Real Madrid sí', () => {
		expect(chanceDeConvocatoria(unCrack())).toBeGreaterThan(60);
	});

	it('en una selección chica es más fácil entrar que en una grande', () => {
		const base = unCrack('Argentina', 'es-realmadrid');
		const chico = structuredClone(base);
		chico.futbolista.nacionalidad = 'Chile';

		expect(fuerzaDeLaSeleccion('Chile')).toBeLessThan(fuerzaDeLaSeleccion('Argentina'));
		expect(chanceDeConvocatoria(chico)).toBeGreaterThan(chanceDeConvocatoria(base));
	});

	it('el mismo jugador en una liga floja tiene menos chance que en una fuerte', () => {
		const enEuropa = unCrack('Argentina', 'es-realmadrid');
		const enChile = structuredClone(enEuropa);
		enChile.futbolista.contrato.clubId = 'cl-colocolo';

		expect(chanceDeConvocatoria(enChile)).toBeLessThan(chanceDeConvocatoria(enEuropa));
	});

	it('dice qué le falta, y no repite la misma frase para todos', () => {
		const frases = new Set([loQueFalta(unPibe()), loQueFalta(unCrack())]);
		expect(frases.size).toBe(2);
		for (const f of frases) expect(f.length).toBeGreaterThan(20);
	});

	it('a los 40 ya no lo llaman', () => {
		const viejo = unCrack();
		viejo.futbolista.edad = 40;
		expect(chanceDeConvocatoria(viejo)).toBe(0);
	});
});

describe('jugar el Mundial', () => {
	it('en año de Mundial, un crack lo juega', () => {
		const e = unCrack();
		e.anio = 2030;
		const jugados = ['a', 'b', 'c', 'd', 'e', 'f']
			.map((s) => jugarConLaSeleccion(e, s))
			.filter((n) => n?.mundial);
		expect(jugados.length).toBeGreaterThan(0);
	});

	it('fuera de año de Mundial no hay Mundial', () => {
		const e = unCrack();
		e.anio = 2029;
		for (const s of ['a', 'b', 'c', 'd']) {
			expect(jugarConLaSeleccion(e, s)?.mundial).toBeUndefined();
		}
	});

	it('salir campeón vale muchísimo más que ir', () => {
		const campeon = unCrack();
		campeon.seleccion = {
			debuto: true,
			partidos: 7,
			goles: 3,
			mundiales: [{ anio: 2030, resultado: 'campeon', partidos: 7, goles: 3 }]
		};
		const fue = structuredClone(campeon);
		fue.seleccion.mundiales = [{ anio: 2030, resultado: 'fase-de-grupos', partidos: 3, goles: 0 }];

		expect(puntosDeSeleccion(campeon)).toBeGreaterThan(puntosDeSeleccion(fue) * 3);
	});

	it('una carrera sin selección no suma nada', () => {
		expect(puntosDeSeleccion(unPibe())).toBe(0);
	});
});

function estadoTerminado(e: Estado): boolean {
	return e.carreraTerminada;
}

describe('en una partida de verdad', () => {
	it('al que juega donde no lo ve nadie no lo llaman', () => {
		// La regla, medida directamente y no a través de una carrera entera: el
		// mismo jugador, con la misma media y la misma fama, tiene mucha menos
		// chance desde el Ascenso que desde una liga fuerte. Es lo que hace que el
		// pase exista.
		//
		// Antes esto se probaba jugando dieciocho fases en piloto automático y
		// esperando que no lo llamaran nunca. Dejó de valer cuando jugar empezó a
		// hacer crecer: un pibe que gana la Primera Nacional seis años seguidos
		// termina con media 81, y a ése lo miran igual. Que lo miren está bien; lo
		// que hay que proteger es que sea por ser bueno y no por estar ahí.
		const enElAscenso = unPibe('Argentina', 'ar2-moron');
		for (const k of Object.keys(enElAscenso.futbolista.atributos)) {
			enElAscenso.futbolista.atributos[k as keyof typeof enElAscenso.futbolista.atributos] = 74;
		}
		enElAscenso.futbolista.edad = 24;
		enElAscenso.futbolista.fama = 40;

		const enEuropa = structuredClone(enElAscenso);
		enEuropa.futbolista.contrato.clubId = 'es-realmadrid';

		expect(chanceDeConvocatoria(enElAscenso)).toBeLessThan(chanceDeConvocatoria(enEuropa));
		expect(chanceDeConvocatoria(enElAscenso)).toBe(0);
	});

	it('y al del montón no lo llaman de ningún lado', () => {
		const delMonton = unPibe('Argentina', 'ar2-moron');
		const cierran: Decision[] = [
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '' }
		];
		// Tres temporadas: todavía es un pibe de 19 en el Ascenso.
		for (let i = 0; i < 9 && !estadoTerminado(delMonton); i++) {
			Object.assign(delMonton, resolverFase(delMonton, cierran, 'sel').estado);
		}
		expect(delMonton.seleccion.debuto).toBe(false);
	});

	it('un crack acumula partidos con la selección al pasar los años', () => {
		let estado = unCrack();
		estado.fase = 3;
		const cierran: Decision[] = [
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '' }
		];
		for (let i = 0; i < 5 && !estado.carreraTerminada; i++) {
			estado = resolverFase(estado, cierran, `sel-${i}`).estado;
			estado.fase = 3;
		}
		expect(estado.seleccion.partidos).toBeGreaterThan(0);
	});
});
