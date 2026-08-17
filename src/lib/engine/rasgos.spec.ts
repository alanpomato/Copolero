import { describe, expect, it } from 'vitest';
import { estadoInicial, media } from './estado';
import { resolverFase } from './fases';
import { temporadas, unaTemporada } from './probar';
import { opcionesDeFase } from './pantalla';
import {
	CUANTOS_SE_OFRECEN,
	RASGOS,
	elegirRasgo,
	loQueAporta,
	rasgosQueLeTocaron,
	tocaElegirRasgo
} from './rasgos';
import { resumirRetiro } from './retiro';
import { rngPara } from './rng';
import { POSICIONES, type Decision, type Estado } from './tipos';

function unPibe(puesto = 'centrodelantero', semilla = 'rasgo'): Estado {
	return estadoInicial(
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
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

const NADA: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

describe('el catálogo de rasgos', () => {
	it('todos suben algo y dejan algo encendido', () => {
		for (const r of RASGOS) {
			expect(r.cuanto, r.id).toBeGreaterThan(0);
			expect(r.posiciones.length, r.id).toBeGreaterThan(0);
			expect(r.siempre.length, r.id).toBeGreaterThan(10);

			const encendido =
				r.goles ||
				r.asistencias ||
				r.lesion ||
				r.minutos ||
				r.desgaste ||
				r.dt ||
				r.equipo ||
				r.crecimiento;
			expect(encendido, `${r.id} no deja nada encendido`).toBeTruthy();
		}
	});

	it('cada puesto tiene al menos tres para elegir', () => {
		for (const p of POSICIONES) {
			expect(RASGOS.filter((r) => r.posiciones.includes(p)).length, p).toBeGreaterThanOrEqual(
				CUANTOS_SE_OFRECEN
			);
		}
	});
});

describe('las tres cartas', () => {
	it('son tres, del puesto, y sin repetir', () => {
		for (const puesto of ['arquero', 'central', 'volante-central', 'centrodelantero']) {
			const e = unPibe(puesto);
			const tres = rasgosQueLeTocaron(e, 'rasgo');
			expect(tres).toHaveLength(CUANTOS_SE_OFRECEN);
			expect(new Set(tres.map((r) => r.id)).size, puesto).toBe(CUANTOS_SE_OFRECEN);
			for (const r of tres)
				expect(r.posiciones, `${puesto}/${r.id}`).toContain(e.futbolista.posicion);
		}
	});

	it('la misma partida ofrece siempre las mismas', () => {
		// Si no, se recarga la pantalla hasta que salga la que uno quiere.
		const a = rasgosQueLeTocaron(unPibe(), 'igual').map((r) => r.id);
		const b = rasgosQueLeTocaron(unPibe(), 'igual').map((r) => r.id);
		expect(a).toEqual(b);
	});

	it('partidas distintas traen cartas distintas', () => {
		const semillas = ['s1', 's2', 's3', 's4', 's5', 's6'];
		const combinaciones = new Set(
			semillas.map((s) =>
				rasgosQueLeTocaron(unPibe(), s)
					.map((r) => r.id)
					.sort()
					.join('+')
			)
		);
		expect(combinaciones.size).toBeGreaterThan(1);
	});
});

describe('elegir', () => {
	it('sube el atributo y queda para siempre', () => {
		const e = unPibe();
		const cual = rasgosQueLeTocaron(e, 'rasgo')[1];
		const antes = e.futbolista.atributos[cual.atributo];

		const linea = elegirRasgo(e, 'rasgo', cual.id);

		expect(linea).toContain(cual.nombre);
		expect(e.rasgo).toBe(cual.id);
		expect(e.futbolista.atributos[cual.atributo]).toBe(antes + cual.cuanto);
		expect(e.atributosQueSubieron).toContain(cual.atributo);
	});

	it('no se puede elegir dos veces', () => {
		const e = unPibe();
		elegirRasgo(e, 'rasgo', rasgosQueLeTocaron(e, 'rasgo')[0].id);
		const media1 = media(e.futbolista.atributos, e.futbolista.posicion);

		expect(tocaElegirRasgo(e)).toBe(false);
		expect(elegirRasgo(e, 'rasgo', rasgosQueLeTocaron(e, 'rasgo')[1].id)).toBeNull();
		expect(media(e.futbolista.atributos, e.futbolista.posicion)).toBe(media1);
	});

	it('no se puede elegir uno que no te tocó', () => {
		const e = unPibe();
		const tres = rasgosQueLeTocaron(e, 'rasgo').map((r) => r.id);
		const ajeno = RASGOS.find((r) => !tres.includes(r.id))!;

		elegirRasgo(e, 'rasgo', ajeno.id);
		// Cae en el primero de los tres, no en el que pidió.
		expect(e.rasgo).toBe(tres[0]);
	});

	it('el que no elige igual se lleva uno: la partida no se traba', () => {
		const e = unPibe();
		elegirRasgo(e, 'rasgo', undefined);
		expect(e.rasgo).not.toBeNull();
	});

	it('sin rasgo, lo que aporta es todo neutro', () => {
		const nada = loQueAporta(unPibe());
		expect(nada.goles).toBe(1);
		expect(nada.asistencias).toBe(1);
		expect(nada.lesion).toBe(1);
		expect(nada.minutos).toBe(0);
	});
});

describe('en una partida de verdad', () => {
	it('se elige en la primera pretemporada y aparece en el diario', () => {
		const e = unPibe();
		expect(opcionesDeFase(e, 'futbolista', 'rasgo').rasgos).toHaveLength(CUANTOS_SE_OFRECEN);
		// El representante no elige qué clase de jugador es el otro.
		expect(opcionesDeFase(e, 'representante', 'rasgo').rasgos).toBeUndefined();

		const { estado, log } = resolverFase(e, NADA, 'rasgo');
		expect(estado.rasgo).not.toBeNull();
		expect(log.some((l) => l.tipo === 'rasgo')).toBe(true);

		// Y a partir de ahí lo ven los dos, siempre.
		expect(opcionesDeFase(estado, 'futbolista', 'rasgo').rasgoElegido?.id).toBe(estado.rasgo);
		expect(opcionesDeFase(estado, 'representante', 'rasgo').rasgoElegido?.id).toBe(estado.rasgo);
		expect(opcionesDeFase(estado, 'futbolista', 'rasgo').rasgos).toBeUndefined();
	});

	it('el rasgo se nota en la temporada', () => {
		// Dos carreras iguales salvo el rasgo: la del que tiene olfato de gol
		// termina con más goles que la del que tiene pulmón.
		function conRasgo(id: string): number {
			let e = unPibe('centrodelantero', 'nota');
			for (const k of Object.keys(e.futbolista.atributos)) {
				e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = 60;
			}
			e.rasgo = id;
			e = temporadas(e, 2, NADA, 'nota');
			return e.futbolista.goles;
		}
		expect(conRasgo('olfato')).toBeGreaterThan(conRasgo('pulmon'));
	});

	it('una carrera entera con rasgo no rompe nada', () => {
		let e = unPibe();
		let vueltas = 0;
		while (!e.carreraTerminada && vueltas < 30) {
			e = unaTemporada(e, NADA, 'larga');
			vueltas++;
		}
		expect(e.carreraTerminada).toBe(true);
		expect(e.rasgo).not.toBeNull();
	});
});

describe('el retiro lo recuerda', () => {
	it('la pantalla final dice qué clase de jugador fue', () => {
		let e = unPibe();
		while (!e.carreraTerminada) e = resolverFase(e, NADA, 'fin').estado;

		const r = resumirRetiro(e);
		expect(r.rasgo?.nombre.length).toBeGreaterThan(3);
		expect(r.carrera.temporadas).toBeGreaterThan(5);
		expect(r.carrera.partidos).toBe(e.futbolista.partidos);
		expect(r.carrera.mediaMaxima).toBeGreaterThan(0);
	});
});
