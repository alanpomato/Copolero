import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { OBJETIVOS, objetivo, objetivosPara } from './objetivos';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import type { Decision, Estado } from './tipos';

function unJugador(puesto = 'centrodelantero'): Estado {
	const e = estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto,
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar2-moron'
			},
			representante: { nombre: 'Alan' }
		},
		rngPara('obj', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
	// En nivel para que juegue: si no juega, ningún objetivo se nota.
	for (const k of Object.keys(e.futbolista.atributos)) {
		e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = 58;
	}
	e.futbolista.edad = 24;
	return e;
}

/**
 * Corre la pretemporada eligiendo el objetivo y después la temporada.
 *
 * Son dos fases porque el objetivo se elige en la pretemporada: se decide cómo
 * se va a jugar el año antes de que el año arranque, y después no se cambia.
 */
function conElObjetivo(id: string, semilla = 'obj'): Estado {
	const pretemporada = resolverFase(
		unJugador(),
		[
			{ rol: 'futbolista', nota: '', objetivo: id },
			{ rol: 'representante', nota: '', gestion: 'acompanar' }
		],
		semilla
	).estado;
	return resolverFase(
		pretemporada,
		[
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '', gestion: 'acompanar' }
		],
		semilla
	).estado;
}

function unaTemporadaCon(id: string, semilla = 'obj') {
	return conElObjetivo(id, semilla).ultimaTemporada!;
}

describe('cómo va a jugar el año', () => {
	it('un objetivo desconocido cae en el de siempre y no rompe nada', () => {
		expect(objetivo('cualquier-cosa').id).toBe(objetivo(undefined).id);
	});

	it('a un arquero no se le pide que vaya siempre al gol', () => {
		expect(objetivosPara('arquero').some((o) => o.id === 'gol')).toBe(false);
		expect(objetivosPara('delantero').some((o) => o.id === 'gol')).toBe(true);
		// Y a nadie se le queda sin opciones.
		for (const p of ['arquero', 'defensor', 'mediocampista', 'delantero'] as const) {
			expect(objetivosPara(p).length).toBeGreaterThanOrEqual(3);
		}
	});

	it('cada uno sube una cosa y baja otra: ninguno es gratis', () => {
		for (const o of OBJETIVOS) {
			const bueno = o.goles > 1 || o.asistencias > 1 || o.minutos > 0 || o.lesion < 1 || o.dt > 0;
			const caro = o.goles < 1 || o.asistencias < 1 || o.minutos < 0 || o.lesion > 1 || o.dt < 0;
			expect(bueno, `${o.id} no sube nada`).toBe(true);
			expect(caro, `${o.id} no cuesta nada`).toBe(true);
			expect(o.sube.length).toBeGreaterThan(3);
			expect(o.cuesta.length).toBeGreaterThan(3);
		}
	});

	it('ir al gol mete más goles que jugar para el equipo', () => {
		// Es la palanca que faltaba: la misma temporada, la misma semilla, y lo
		// único distinto es cómo decidió jugarla.
		const alGol = unaTemporadaCon('gol');
		const alEquipo = unaTemporadaCon('equipo');

		expect(alGol.goles).toBeGreaterThan(alEquipo.goles);
		expect(alEquipo.asistencias).toBeGreaterThan(alGol.asistencias);
	});

	it('ganarse al técnico da más minutos que cuidarse', () => {
		expect(unaTemporadaCon('titular').minutos).toBeGreaterThan(unaTemporadaCon('cuidarse').minutos);
	});

	it('cuidarse deja menos desgaste al final del año', () => {
		const cuidado = conElObjetivo('cuidarse');
		const exigido = conElObjetivo('titular');

		expect(cuidado.futbolista.desgaste).toBeLessThan(exigido.futbolista.desgaste);
	});

	it('se elige en la pretemporada y en la temporada ya está cerrado', () => {
		const e = unJugador();
		const suyas = opcionesDeFase(e, 'futbolista', 'obj');
		expect(suyas.objetivos?.length).toBeGreaterThan(2);
		expect(suyas.consejoDelObjetivo?.length).toBeGreaterThan(10);

		// Y no al representante, que no elige cómo juega el otro.
		expect(opcionesDeFase(e, 'representante', 'obj').objetivos).toBeUndefined();

		// Ya en la temporada no hay nada que elegir: se muestra con qué se juega.
		const enLaTemporada = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '', objetivo: 'gol' },
				{ rol: 'representante', nota: '', gestion: 'acompanar' }
			],
			'obj'
		).estado;
		const mirando = opcionesDeFase(enLaTemporada, 'futbolista', 'obj');
		expect(mirando.objetivos).toBeUndefined();
		expect(mirando.objetivoCerrado?.id).toBe('gol');
	});
});
