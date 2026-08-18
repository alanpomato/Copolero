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

			// Las seis últimas se sumaron con el catálogo grande: sin ellas, este
			// test daba por muertos a los rasgos que sólo mueven fama, hinchada,
			// prensa, moral, confianza o valor de mercado.
			const encendido =
				r.goles ||
				r.asistencias ||
				r.lesion ||
				r.minutos ||
				r.desgaste ||
				r.dt ||
				r.equipo ||
				r.crecimiento ||
				r.fama ||
				r.hinchada ||
				r.prensa ||
				r.moral ||
				r.confianza ||
				r.valor;
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

// ---------------------------------------------------------------------------
// Lo que se agregó cuando el catálogo pasó de trece rasgos a treinta y ocho
// ---------------------------------------------------------------------------

/**
 * Y sobre todo: que lo que prometen pase.
 *
 * Al ir a agregar rasgos nuevos aparecieron tres viejos que prometían cosas que
 * el motor no aplicaba nunca. "De fierro: te lesionás un 30% menos" estaba
 * declarado, se mostraba al elegirlo, y la línea que calcula el riesgo leía el
 * multiplicador del plan del año y no el del rasgo. Lo mismo el desgaste de
 * "Espalda ancha" y el de "Elástico".
 *
 * Un rasgo que miente es peor que no tenerlo: se elige por lo que promete y se
 * juega una carrera entera creyendo que algo está pasando. El test de abajo no
 * verifica una fórmula: corre dos carreras idénticas que sólo se diferencian en
 * el rasgo, y exige que se note.
 */

/** El puesto con el que se prueba cada posición. */
const PUESTO_DE: Record<string, string> = {
	arquero: 'arquero',
	defensor: 'central',
	mediocampista: 'cinco',
	delantero: 'centrodelantero'
};

/**
 * El control: un rasgo que no existe.
 *
 * `null` no serviría, porque entonces la primera pretemporada elige uno sola y
 * la carrera «sin rasgo» terminaría con el primero de los tres que le tocaron.
 * Un id inventado deja `estado.rasgo` ocupado —así no se elige nada— y
 * `loQueAporta` devuelve todo en neutro, que es el control que hace falta.
 */
const NINGUNO = 'sin-rasgo-para-el-test';

/** Lo observable de una carrera, para comparar dos que sólo difieren en el rasgo. */
function comoLeFue(posicion: string, rasgoId: string, semilla: string, anios = 8) {
	let e = unPibe(PUESTO_DE[posicion], semilla);
	e.rasgo = rasgoId;
	for (let i = 0; i < anios * 4 && !e.carreraTerminada; i++) {
		e = resolverFase(e, NADA, semilla).estado;
	}
	const f = e.futbolista;
	return [
		f.goles,
		f.asistencias,
		f.minutos,
		f.partidos,
		f.desgaste,
		f.fama,
		f.hinchada,
		f.prensa,
		f.moral,
		f.dt,
		f.valorMercadoUsd,
		e.confianza,
		e.historial.length,
		e.historial.reduce((suma, h) => suma + h.nota, 0)
	].join('·');
}

describe('el catálogo, ahora que es grande', () => {
	it('los ids no se repiten', () => {
		expect(new Set(RASGOS.map((r) => r.id)).size).toBe(RASGOS.length);
	});

	it('cada puesto tiene de dónde elegir', () => {
		/*
		 * Eran cinco para el arquero y siete para el resto. Con siete y una tirada
		 * de tres, la segunda partida con el mismo puesto ya repetía caras. Alan lo
		 * pidió así: "poner muchas opciones para que la tirada saque cosas
		 * distintas".
		 */
		for (const posicion of POSICIONES) {
			const suyos = RASGOS.filter((r) => r.posiciones.includes(posicion));
			expect(suyos.length, posicion).toBeGreaterThanOrEqual(15);
		}
	});

	it('todos prometen algo por escrito y suben algo al elegirlos', () => {
		for (const r of RASGOS) {
			expect(r.nombre.length, r.id).toBeGreaterThan(3);
			expect(r.detalle.length, r.id).toBeGreaterThan(20);
			expect(r.siempre.length, r.id).toBeGreaterThan(15);
			expect(r.cuanto, r.id).toBeGreaterThan(0);
			expect(r.posiciones.length, r.id).toBeGreaterThan(0);
		}
	});

	it('el que tiene una contra la dice', () => {
		/*
		 * Los que sacan algo tienen que decirlo en el `pero`, que se dibuja en
		 * rojo. Un rasgo que baja el trato con el técnico y sólo enumera ventajas
		 * se elige sin pensar, y después la carrera no se entiende.
		 */
		for (const r of RASGOS) {
			const saca =
				(r.dt ?? 0) < 0 ||
				(r.prensa ?? 0) < 0 ||
				(r.hinchada ?? 0) < 0 ||
				(r.fama ?? 0) < 0 ||
				(r.moral ?? 0) < 0 ||
				(r.minutos ?? 0) < 0 ||
				(r.desgaste ?? 0) > 0 ||
				(r.lesion ?? 1) > 1;
			if (saca) expect(r.pero, `${r.id} saca algo y no lo dice`).toBeTruthy();
		}
	});

	it('ninguno es sólo el golpe inicial: todos dejan algo prendido', () => {
		for (const r of RASGOS) {
			const deja =
				r.goles ??
				r.asistencias ??
				r.lesion ??
				r.minutos ??
				r.desgaste ??
				r.dt ??
				r.equipo ??
				r.crecimiento ??
				r.fama ??
				r.hinchada ??
				r.prensa ??
				r.moral ??
				r.confianza ??
				r.valor;
			expect(deja, r.id).toBeDefined();
		}
	});
});

describe('lo que prometen, pasa', () => {
	/*
	 * El test que hubiera cantado el agujero.
	 *
	 * Dos carreras con la misma semilla, el mismo puesto y las mismas decisiones:
	 * lo único distinto es el rasgo. Si el rasgo no cambia absolutamente nada de
	 * lo observable en ocho temporadas, es porque el motor no lo está leyendo, y
	 * eso es exactamente lo que pasaba con `lesion` y `desgaste`.
	 */
	it('cada rasgo del catálogo cambia el resultado de una carrera', () => {
		const muertos: string[] = [];

		for (const r of RASGOS) {
			const posicion = r.posiciones[0];
			const cambia = ['a', 'b', 'c'].some(
				(semilla) => comoLeFue(posicion, r.id, semilla) !== comoLeFue(posicion, NINGUNO, semilla)
			);
			if (!cambia) muertos.push(r.id);
		}

		expect(muertos, `rasgos que el motor no aplica: ${muertos.join(', ')}`).toEqual([]);
	});
});

describe('la tirada', () => {
	it('ofrece tres', () => {
		for (const posicion of POSICIONES) {
			const e = unPibe(PUESTO_DE[posicion], 'tirada');
			expect(rasgosQueLeTocaron(e, 'tirada'), posicion).toHaveLength(CUANTOS_SE_OFRECEN);
		}
	});

	it('sólo ofrece rasgos del puesto', () => {
		for (const posicion of POSICIONES) {
			const e = unPibe(PUESTO_DE[posicion], 'tirada');
			for (const r of rasgosQueLeTocaron(e, 'tirada')) {
				expect(r.posiciones, `${posicion}: ${r.id}`).toContain(posicion);
			}
		}
	});

	it('no repite ninguno dentro de la misma tirada', () => {
		for (const posicion of POSICIONES) {
			for (const semilla of ['a', 'b', 'c', 'd']) {
				const tres = rasgosQueLeTocaron(unPibe(PUESTO_DE[posicion], semilla), semilla);
				expect(new Set(tres.map((r) => r.id)).size, `${posicion}/${semilla}`).toBe(tres.length);
			}
		}
	});

	it('y dos partidas distintas no ven siempre lo mismo', () => {
		// Es la mitad de para qué sirve que el catálogo sea grande.
		for (const posicion of POSICIONES) {
			const vistos = new Set<string>();
			for (const semilla of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
				for (const r of rasgosQueLeTocaron(unPibe(PUESTO_DE[posicion], semilla), semilla))
					vistos.add(r.id);
			}
			expect(vistos.size, posicion).toBeGreaterThanOrEqual(10);
		}
	});
});
