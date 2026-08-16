import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { opcionesDeFase } from './pantalla';
import { portadaDe } from './portada';
import { resumirRetiro } from './retiro';
import { comoVaElDuelo, correrleElAnio } from './rival';
import { rngPara } from './rng';
import { contexto } from '../../../content/mundo';
import type { Decision, Estado } from './tipos';

function unaPartida(semilla = 'riv', clubId = 'ar2-moron'): Estado {
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
			representante: { nombre: 'Alan' }
		},
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

const NADA: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

describe('el otro de la camada', () => {
	it('aparece al empezar la partida, en la misma liga y en otro club', () => {
		const e = unaPartida();
		expect(e.rival).not.toBeNull();
		expect(e.rival!.clubId).not.toBe(e.futbolista.contrato.clubId);
		expect(contexto(e.rival!.clubId).liga.id).toBe(contexto(e.futbolista.contrato.clubId).liga.id);
		expect(e.rival!.edad).toBe(e.futbolista.edad);
		expect(e.rival!.nombre.split(' ')).toHaveLength(2);
	});

	it('empieza sin nada hecho y sin duelo', () => {
		const r = unaPartida().rival!;
		expect(r.goles).toBe(0);
		expect(r.partidos).toBe(0);
		expect(r.ganadasPorEl + r.ganadasPorVos).toBe(0);
		expect(r.ultimaTemporada).toBeNull();
	});

	it('partidas distintas traen rivales distintos', () => {
		const nombres = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => unaPartida(s).rival!.nombre));
		expect(nombres.size).toBeGreaterThan(1);
	});

	it('la misma partida trae siempre el mismo', () => {
		expect(unaPartida('igual').rival).toEqual(unaPartida('igual').rival);
	});
});

describe('su carrera', () => {
	it('juega, produce y cumple años', () => {
		const e = unaPartida();
		correrleElAnio(e, 'riv');
		const r = e.rival!;

		expect(r.partidos).toBeGreaterThan(0);
		expect(r.edad).toBe(17);
		expect(r.ultimaTemporada).not.toBeNull();
		expect(r.ultimaTemporada!.partidos).toBe(r.partidos);
	});

	it('crece de pibe y se le va de grande', () => {
		const joven = unaPartida();
		joven.rival!.potencial = 90;
		const nivelJoven = joven.rival!.nivel;
		correrleElAnio(joven, 'riv');
		expect(joven.rival!.nivel).toBeGreaterThan(nivelJoven);

		const viejo = unaPartida();
		viejo.rival!.edad = 34;
		viejo.rival!.potencial = 40;
		const nivelViejo = viejo.rival!.nivel;
		correrleElAnio(viejo, 'riv');
		expect(viejo.rival!.nivel).toBeLessThan(nivelViejo);
	});

	it('lo que le pasa al rival no toca al futbolista', () => {
		// Es la regla que lo hace seguro: corre en su propio chorro de azar y no
		// escribe una sola cosa del jugador.
		const e = unaPartida();
		const antes = structuredClone(e.futbolista);
		correrleElAnio(e, 'riv');
		expect(e.futbolista).toEqual(antes);
	});

	it('nunca termina en el mismo club que el futbolista', () => {
		// Verlos a los dos con el mismo escudo rompe todo lo que la comparación
		// quiere decir.
		for (const semilla of ['j1', 'j2', 'j3', 'j4']) {
			let e = unaPartida(semilla);
			let vueltas = 0;
			while (!e.carreraTerminada && vueltas < 15) {
				for (let f = 0; f < 3; f++) e = resolverFase(e, NADA, semilla).estado;
				expect(e.rival!.clubId, semilla).not.toBe(e.futbolista.contrato.clubId);
				vueltas++;
			}
		}
	});

	it('el duelo cuenta temporadas ganadas por cada uno', () => {
		let e = unaPartida();
		let vueltas = 0;
		while (!e.carreraTerminada && vueltas < 12) {
			for (let f = 0; f < 3; f++) e = resolverFase(e, NADA, 'riv').estado;
			vueltas++;
		}
		const r = e.rival!;
		expect(r.ganadasPorEl + r.ganadasPorVos).toBeGreaterThan(0);
		expect(r.ganadasPorEl + r.ganadasPorVos).toBeLessThanOrEqual(vueltas);
		expect(r.partidos).toBeGreaterThan(0);
	});
});

describe('cómo se cuenta', () => {
	it('no hay duelo antes de la primera temporada', () => {
		expect(comoVaElDuelo(unaPartida())).toBeNull();
	});

	it('la línea dice el año del otro y cómo va el general', () => {
		let e = unaPartida();
		for (let f = 0; f < 3; f++) e = resolverFase(e, NADA, 'riv').estado;

		const linea = comoVaElDuelo(e)!;
		expect(linea).toContain(e.rival!.nombre);
		expect(linea.toLowerCase()).toContain('duelo general');
	});

	it('llega a la tapa del diario', () => {
		let e = unaPartida();
		for (let f = 0; f < 3; f++) e = resolverFase(e, NADA, 'riv').estado;

		const p = portadaDe(e)!;
		expect(p.notas.some((n) => n.titulo === 'El de la camada')).toBe(true);
		expect(p.notas.length).toBeLessThanOrEqual(4);
	});

	it('el duelo termina parejo casi siempre', () => {
		// Un rival que nunca te gana no es un rival, es un adorno. La primera
		// versión terminaba 18 a 0 porque producía con factores más bajos que el
		// futbolista y su techo se sorteaba suelto. Medido sobre varias semillas,
		// la mayoría de los duelos tienen que quedar en la misma conversación.
		const semillas = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
		let parejos = 0;

		for (const s of semillas) {
			let e = unaPartida(s);
			while (!e.carreraTerminada) e = resolverFase(e, NADA, s).estado;

			const r = e.rival!;
			const total = r.ganadasPorVos + r.ganadasPorEl;
			expect(total, s).toBeGreaterThan(0);
			if (Math.abs(r.ganadasPorVos - r.ganadasPorEl) <= total * 0.5) parejos++;
		}

		expect(parejos).toBeGreaterThanOrEqual(semillas.length - 2);
	});

	it('el retiro cierra el duelo con un resultado', () => {
		let e = unaPartida();
		while (!e.carreraTerminada) e = resolverFase(e, NADA, 'riv').estado;

		const d = resumirRetiro(e).duelo!;
		expect(d.nombre).toBe(e.rival!.nombre);
		expect(d.golesYAsistencias).toBe(e.futbolista.goles + e.futbolista.asistencias);
		expect(d.suyos).toBe(e.rival!.goles + e.rival!.asistencias);
		expect(d.texto.length).toBeGreaterThan(30);
	});

	it('y a la ficha, para los dos roles', () => {
		const e = unaPartida();
		for (const rol of ['futbolista', 'representante'] as const) {
			const suyo = opcionesDeFase(e, rol, 'riv').rival;
			expect(suyo?.nombre).toBe(e.rival!.nombre);
		}
	});
});
