import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { OCASIONES_EN_EL_MERCADO, ocasionesDe } from './ocasiones';
import {
	CARISMA_POR_DEFECTO,
	MOMENTOS_EN_EL_MERCADO,
	MOMENTOS_POR_TEMPORADA,
	aplicarMomento,
	carismaDe,
	cuantoSalvaElCarisma,
	momentosDelRepresentante,
	resolverMomento
} from './momentos';
import { opcionesDeFase } from './pantalla';
import { CARTAS_QUE_DEJA_PASAR } from './cartas';
import { enLaEleccion } from './probar';
import { rngPara } from './rng';
import type { Decision, Estado } from './tipos';

/**
 * Los momentos del representante.
 *
 * "Por la parte de representante es súper plana, todos los turnos son iguales",
 * dijo Hernán después de jugar una carrera entera de ese lado. Esto es lo que
 * se hizo con eso.
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
		rngPara('mom', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

describe('los momentos del representante', () => {
	it('le tocan dos por temporada, y no son siempre los mismos', () => {
		const vistos = new Set<string>();

		for (let t = 1; t <= 8; t++) {
			const e = unaPartida();
			e.temporada = t;
			const dos = momentosDelRepresentante(e, 'mom');

			expect(dos.length).toBe(MOMENTOS_POR_TEMPORADA);
			// Dos distintos el mismo año: no tiene sentido que le pase dos veces lo
			// mismo en la misma temporada.
			expect(new Set(dos.map((m) => m.id)).size).toBe(dos.length);
			for (const m of dos) vistos.add(m.id);
		}

		// Y a lo largo de una carrera aparecen varios: si siempre fuera el mismo,
		// seguiría siendo plano con más pasos.
		expect(vistos.size).toBeGreaterThanOrEqual(3);
	});

	it('todos traen el planteo, el minijuego y las opciones con su probabilidad', () => {
		const e = unaPartida();
		for (let t = 1; t <= 10; t++) {
			e.temporada = t;
			for (const m of momentosDelRepresentante(e, 'mom')) {
				expect(m.titulo.length).toBeGreaterThan(2);
				expect(m.contexto.length).toBeGreaterThan(40);
				expect(['ruleta', 'arco', 'dado', 'quiz']).toContain(m.juego);
				expect(m.opciones.length).toBeGreaterThanOrEqual(2);
				for (const o of m.opciones) {
					expect(o.probabilidad).toBeGreaterThanOrEqual(8);
					expect(o.probabilidad).toBeLessThanOrEqual(100);
					expect(o.siSale.length).toBeGreaterThan(10);
				}
			}
		}
	});

	it('son suyos: el futbolista no los recibe', () => {
		const e = unaPartida();
		e.fase = 2;

		expect(opcionesDeFase(e, 'representante', 'mom').momentos?.length).toBe(MOMENTOS_POR_TEMPORADA);
		expect(opcionesDeFase(e, 'futbolista', 'mom').momentos).toBeUndefined();
	});

	it('y lo que le pasa queda de su lado del diario', () => {
		const e = unaPartida();
		e.fase = 2;

		const decisiones: Decision[] = [
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '', gestion: 'acompanar' }
		];
		const { log } = resolverFase(e, decisiones, 'mom');

		const suyas = log.filter((l) => l.tipo === 'momento');
		expect(suyas.length).toBeGreaterThan(0);
		// Ni una sola visible para el otro: que a su representado lo estén
		// tanteando por atrás es exactamente lo que uno sabe y el otro no.
		for (const l of suyas) expect(l.visiblePara).toBe('representante');
	});
});

describe('el carisma', () => {
	it('las partidas viejas no lo tienen y no se rompen', () => {
		const e = unaPartida();
		// Como si viniera de una partida guardada antes de que existiera.
		delete e.representante.atributos.carisma;
		expect(carismaDe(e)).toBe(CARISMA_POR_DEFECTO);
		expect(cuantoSalvaElCarisma(e)).toBeGreaterThan(0);
	});

	it('salva más cuanto más alto, pero nunca siempre ni nunca nunca', () => {
		const e = unaPartida();

		e.representante.atributos.carisma = 0;
		const nada = cuantoSalvaElCarisma(e);
		e.representante.atributos.carisma = 100;
		const todo = cuantoSalvaElCarisma(e);

		expect(nada).toBeGreaterThan(0);
		expect(todo).toBeLessThan(100);
		expect(todo).toBeGreaterThan(nada * 2);
	});

	it('rescata reuniones que salieron mal, y lo dice', () => {
		// Con carisma al tope, sobre muchas tiradas de una opción difícil tiene que
		// aparecer al menos una salvada. Y cuando aparece, el texto lo cuenta: si
		// no lo contara, el jugador vería "salió bien" con una probabilidad que
		// decía otra cosa, y eso se lee como trampa.
		const e = unaPartida();
		e.representante.atributos.carisma = 100;

		let salvadas = 0;
		for (let t = 1; t <= 60; t++) {
			e.temporada = t;
			const momentos = momentosDelRepresentante(e, 'car');
			for (const [i, m] of momentos.entries()) {
				const dificil = [...m.opciones].sort((a, b) => a.probabilidad - b.probabilidad)[0];
				const r = resolverMomento(m, dificil.id, e, 'car', i);
				if (r.salio && r.texto.includes('les caíste bien')) salvadas++;
			}
		}

		expect(salvadas).toBeGreaterThan(0);
	});

	it('sin carisma, lo que salió mal salió mal', () => {
		const e = unaPartida();
		e.representante.atributos.carisma = 0;

		for (let t = 1; t <= 40; t++) {
			e.temporada = t;
			const momentos = momentosDelRepresentante(e, 'sin');
			for (const [i, m] of momentos.entries()) {
				const r = resolverMomento(m, m.opciones[0].id, e, 'sin', i);
				if (!r.salio) expect(r.texto).not.toContain('les caíste bien');
			}
		}
	});
});

describe('lo que dejan', () => {
	it('mueven lo del representante y casi nada del otro', () => {
		const e = unaPartida();
		const antes = { ...e.representante.atributos };

		aplicarMomento(e, { prestigio: 5, contactos: 3, carisma: 2, dineroUsd: 10_000 });

		expect(e.representante.atributos.contactos).toBe(antes.contactos + 3);
		expect(carismaDe(e)).toBe((antes.carisma ?? CARISMA_POR_DEFECTO) + 2);
		expect(e.representante.dineroUsd).toBeGreaterThan(0);
		// El futbolista no se enteró de nada.
		expect(e.futbolista.moral).toBe(unaPartida().futbolista.moral);
	});

	it('nada se va de rango, ni con muchos años encima', () => {
		const e = unaPartida();
		for (let i = 0; i < 200; i++) {
			aplicarMomento(e, { prestigio: 9, contactos: 9, carisma: 9, confianza: 9, prensa: 9 });
		}
		expect(e.representante.prestigio).toBeLessThanOrEqual(100);
		expect(carismaDe(e)).toBeLessThanOrEqual(100);
		expect(e.confianza).toBeLessThanOrEqual(100);

		for (let i = 0; i < 200; i++) {
			aplicarMomento(e, { prestigio: -9, contactos: -9, carisma: -9, confianza: -9, prensa: -9 });
		}
		expect(e.representante.prestigio).toBeGreaterThanOrEqual(0);
		expect(carismaDe(e)).toBeGreaterThanOrEqual(0);
		expect(e.confianza).toBeGreaterThanOrEqual(0);
		expect(e.representante.dineroUsd).toBeGreaterThanOrEqual(0);
	});

	it('la plata nunca queda en negativo', () => {
		const e = unaPartida();
		e.representante.dineroUsd = 1_000;
		aplicarMomento(e, { dineroUsd: -50_000 });
		expect(e.representante.dineroUsd).toBe(0);
	});
});

describe('el mercado', () => {
	/*
	 * A cada uno le pasa lo suyo, y en su tiempo del mercado.
	 *
	 * La fase 3 era la única donde no pasaba nada más que elegir club: la misma
	 * pantalla con tres ofertas, quince años seguidos.
	 *
	 * El mercado tiene dos tiempos y no son simultáneos: primero el
	 * representante deja pasar hasta tres de las seis que le llegaron, y recién
	 * después el futbolista elige entre las que prosperaron. El momento de cada
	 * uno va en su tiempo, para que el que juega tenga algo suyo y no sea un
	 * trámite. Ver `cartas.ts`.
	 */
	it('al representante le pasa algo mientras filtra', () => {
		const e = unaPartida();
		e.fase = 3;

		const suyos = opcionesDeFase(e, 'representante', 'merc');

		expect(suyos.momentos?.length).toBe(MOMENTOS_EN_EL_MERCADO);
		// Y las cartas siguen estando: el momento no reemplaza al trabajo.
		expect(suyos.cartas?.length).toBeGreaterThan(0);
		expect(suyos.cuantasDejaPasar).toBe(CARTAS_QUE_DEJA_PASAR);
	});

	it('y al futbolista le pasa algo mientras elige', () => {
		const e = enLaEleccion(unaPartida());

		const delOtro = opcionesDeFase(e, 'futbolista', 'merc');

		expect(delOtro.ocasiones?.length).toBe(OCASIONES_EN_EL_MERCADO);
		expect(delOtro.ofertas).toBeDefined();
	});

	/*
	 * Y ésta es la mitad de por qué el filtro pesa: el futbolista no se entera
	 * de que hubo seis ni de cuáles descartó el otro. Ve lo que le llegó, igual
	 * que en la vida. Si viera la lista completa, el filtro dejaría de ser una
	 * decisión del representante y pasaría a ser una excusa.
	 */
	it('el futbolista nunca ve las cartas del representante', () => {
		const e = unaPartida();
		e.fase = 3;

		expect(opcionesDeFase(e, 'futbolista', 'merc').cartas).toBeUndefined();
		expect(opcionesDeFase(enLaEleccion(e), 'futbolista', 'merc').cartas).toBeUndefined();
	});

	it('mientras el representante filtra, el futbolista no tiene nada para elegir', () => {
		const e = unaPartida();
		e.fase = 3;

		const delOtro = opcionesDeFase(e, 'futbolista', 'merc');
		expect(delOtro.mercado?.meToca).toBe(false);
		expect(delOtro.ofertas).toBeUndefined();
	});

	it('los del mercado no son los de la temporada', () => {
		const e = unaPartida();

		e.fase = 2;
		const enLaTemporada = momentosDelRepresentante(e, 'merc').map((m) => m.id);
		e.fase = 3;
		const enElMercado = momentosDelRepresentante(e, 'merc').map((m) => m.id);

		for (const id of enElMercado) expect(enLaTemporada).not.toContain(id);
	});

	it('y lo que dicen ahí cae sobre lo que después pesa en el pase', () => {
		const e = unaPartida();
		e.fase = 3;
		e.futbolista.hinchada = 50;
		e.futbolista.dt = 50;

		const suya = ocasionesDe(e, 'merc')[0];
		// La primera opción de cualquiera de los momentos del mercado mueve algo
		// de lo que el club mira: la gente, el técnico, la prensa o la moral.
		const premio = suya.opciones[0].premio;
		const mueve = premio.hinchada ?? premio.dt ?? premio.prensa ?? premio.moral ?? premio.fama ?? 0;
		expect(Math.abs(mueve)).toBeGreaterThan(0);
	});

	it('cada uno ve el suyo y el diario los separa', () => {
		const e = unaPartida();
		e.fase = 3;

		const { log } = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '' },
				{ rol: 'representante', nota: '' }
			],
			'merc'
		);

		const delMercado = log.filter((l) => l.tipo === 'mercado_momento');
		expect(delMercado.length).toBeGreaterThan(0);
		// Ninguno es 'ambos': lo que le pasa a cada uno en el mercado es suyo.
		for (const l of delMercado) expect(l.visiblePara).not.toBe('ambos');
	});
});
