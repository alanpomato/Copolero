import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { jugarTemporada } from './temporada';
import { OBJETIVOS, objetivo, objetivoPorAzar, objetivosPara } from './objetivos';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import type { Estado } from './tipos';

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
 * Le hace jugar la temporada directamente con el objetivo pedido, sin pasar
 * por el sorteo.
 *
 * `jugarTemporada` toma el id del objetivo como parámetro suelto —así lo usa
 * el motor una vez que `objetivoPorAzar` ya lo resolvió— así que probar el
 * efecto numérico de cada uno no necesita fingir un sorteo con la semilla
 * justa: se llama directo, como hace `fases.ts` después de sortear.
 */
function unaTemporadaCon(id: string, semilla = 'obj') {
	const e = unJugador();
	const temporada = jugarTemporada(e, [], semilla, id);
	return { estado: e, resumen: temporada.resumen };
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
		// La misma temporada, la misma semilla, y lo único distinto es con qué
		// objetivo se jugó: lo mismo que antes probaba la decisión, ahora prueba
		// el sorteo una vez resuelto.
		const alGol = unaTemporadaCon('gol');
		const alEquipo = unaTemporadaCon('equipo');

		expect(alGol.resumen.goles).toBeGreaterThan(alEquipo.resumen.goles);
		expect(alEquipo.resumen.asistencias).toBeGreaterThan(alGol.resumen.asistencias);
	});

	it('ganarse al técnico da más minutos que cuidarse', () => {
		expect(unaTemporadaCon('titular').resumen.minutos).toBeGreaterThan(
			unaTemporadaCon('cuidarse').resumen.minutos
		);
	});

	it('cuidarse deja menos desgaste al final del año', () => {
		const cuidado = unaTemporadaCon('cuidarse');
		const exigido = unaTemporadaCon('titular');

		expect(cuidado.estado.futbolista.desgaste).toBeLessThan(exigido.estado.futbolista.desgaste);
	});
});

describe('el objetivo ya no se elige: se sortea', () => {
	it('no hay tarjeta para elegirlo, ni en la pretemporada ni en el mercado', () => {
		const e = unJugador();
		const suyas: Record<string, unknown> = opcionesDeFase(e, 'futbolista', 'obj');
		expect('objetivos' in suyas).toBe(false);
		expect('consejoDelObjetivo' in suyas).toBe(false);
	});

	it('se sortea al cerrar la pretemporada y queda cerrado durante la temporada', () => {
		const e = unJugador();
		const conLaPretemporadaCerrada = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '', intensidad: 'firme' },
				{ rol: 'representante', nota: '', gestion: 'acompanar' }
			],
			'obj'
		).estado;

		expect(objetivosPara('delantero').some((o) => o.id === conLaPretemporadaCerrada.objetivoDelAnio)).toBe(
			true
		);

		const mirando: Record<string, unknown> = opcionesDeFase(conLaPretemporadaCerrada, 'futbolista', 'obj');
		expect('objetivos' in mirando).toBe(false);
		expect((mirando.objetivoCerrado as { id: string } | undefined)?.id).toBe(
			conLaPretemporadaCerrada.objetivoDelAnio
		);
	});

	it('un arquero nunca sortea "ir siempre al gol", pase lo que pase en el dado', () => {
		const arquero = unJugador('arquero');
		for (let i = 0; i < 200; i++) {
			const rng = rngPara(`arq-${i}`, { temporada: 1, fase: 1, clave: 'objetivo' });
			const salido = objetivoPorAzar(arquero.futbolista.posicion, 'a-matar', rng);
			expect(salido.id).not.toBe('gol');
		}
	});

	it('la misma semilla sortea siempre el mismo objetivo: no es azar de verdad, es determinista', () => {
		const rngA = rngPara('misma', { temporada: 1, fase: 1, clave: 'objetivo' });
		const rngB = rngPara('misma', { temporada: 1, fase: 1, clave: 'objetivo' });
		expect(objetivoPorAzar('delantero', 'firme', rngA).id).toBe(
			objetivoPorAzar('delantero', 'firme', rngB).id
		);
	});

	it('la intensidad pesa el sorteo: "suave" sale cuidarse mucho más seguido que "a matar"', () => {
		function contar(intensidad: string) {
			const conteo: Record<string, number> = {};
			for (let i = 0; i < 300; i++) {
				const rng = rngPara(`peso-${intensidad}-${i}`, { temporada: 1, fase: 1, clave: 'objetivo' });
				const o = objetivoPorAzar('delantero', intensidad, rng);
				conteo[o.id] = (conteo[o.id] ?? 0) + 1;
			}
			return conteo;
		}

		const suave = contar('suave');
		const aMatar = contar('a-matar');

		// "Suave" tiene que salir cuidarse mucho más seguido que "a matar".
		expect(suave.cuidarse ?? 0).toBeGreaterThan(aMatar.cuidarse ?? 0);
		// Y "a matar" tiene que salir ir al gol mucho más seguido que "suave".
		expect(aMatar.gol ?? 0).toBeGreaterThan(suave.gol ?? 0);
	});
});
