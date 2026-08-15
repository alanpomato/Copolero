import { describe, expect, it } from 'vitest';
import { rngPara } from './rng';
import { estadoInicial, media, type ConfigPartida } from './estado';
import { estadoSincronizacion, resolverFase, TEMPORADAS_MAXIMAS } from './fases';
import type { Decision, Estado } from './tipos';

const SEMILLA = 'semilla-de-prueba';

const CONFIG: ConfigPartida = {
	futbolista: {
		nombre: 'Damián Correa',
		nacionalidad: 'Argentina',
		posicion: 'delantero',
		edadInicial: 16,
		clubId: 'ar-huracan'
	},
	representante: { nombre: 'Alan' }
};

function nuevoEstado(semilla = SEMILLA): Estado {
	const rng = rngPara(semilla, { temporada: 1, fase: 1, clave: 'creacion' });
	return estadoInicial(CONFIG, rng, 2026);
}

const CIERRAN_LOS_DOS: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

describe('azar determinista', () => {
	it('da la misma secuencia para las mismas coordenadas', () => {
		const a = rngPara(SEMILLA, { temporada: 3, fase: 2, clave: 'gol', indice: 1 });
		const b = rngPara(SEMILLA, { temporada: 3, fase: 2, clave: 'gol', indice: 1 });
		expect([a.siguiente(), a.siguiente(), a.siguiente()]).toEqual([
			b.siguiente(),
			b.siguiente(),
			b.siguiente()
		]);
	});

	it('da secuencias distintas si cambia cualquier coordenada', () => {
		const base = rngPara(SEMILLA, { temporada: 3, fase: 2, clave: 'gol', indice: 1 }).siguiente();
		const otraTemporada = rngPara(SEMILLA, {
			temporada: 4,
			fase: 2,
			clave: 'gol',
			indice: 1
		}).siguiente();
		const otroIndice = rngPara(SEMILLA, {
			temporada: 3,
			fase: 2,
			clave: 'gol',
			indice: 2
		}).siguiente();
		const otraSemilla = rngPara('otra', {
			temporada: 3,
			fase: 2,
			clave: 'gol',
			indice: 1
		}).siguiente();

		expect(new Set([base, otraTemporada, otroIndice, otraSemilla]).size).toBe(4);
	});

	it('reproduce la misma partida a partir de la misma semilla', () => {
		expect(nuevoEstado()).toEqual(nuevoEstado());
	});
});

describe('estado inicial', () => {
	it('arranca en la temporada 1, fase 1, con la confianza en 60', () => {
		const estado = nuevoEstado();
		expect(estado.temporada).toBe(1);
		expect(estado.fase).toBe(1);
		expect(estado.confianza).toBe(60);
		expect(estado.carreraTerminada).toBe(false);
	});

	it('respeta lo que se eligió al crear la partida', () => {
		const estado = nuevoEstado();
		expect(estado.futbolista.nombre).toBe('Damián Correa');
		expect(estado.futbolista.edad).toBe(16);
		expect(estado.futbolista.contrato.clubId).toBe('ar-huracan');
	});

	it('pondera la media según el puesto', () => {
		const atributos = {
			definicion: 90,
			velocidad: 20,
			potencia: 20,
			resistencia: 20,
			pase: 20,
			regate: 20,
			defensa: 20,
			liderazgo: 20
		};
		// El mismo jugador vale mucho más de 9 que de 5.
		expect(media(atributos, 'delantero')).toBeGreaterThan(media(atributos, 'mediocampista'));
	});
});

describe('barrera de fase', () => {
	it('reporta a quién se está esperando', () => {
		const estado = nuevoEstado();
		expect(estadoSincronizacion(estado, [])).toBe('WAITING_FOR_BOTH');
		expect(estadoSincronizacion(estado, ['futbolista'])).toBe('WAITING_FOR_AGENT');
		expect(estadoSincronizacion(estado, ['representante'])).toBe('WAITING_FOR_PLAYER');
		expect(estadoSincronizacion(estado, ['futbolista', 'representante'])).toBe('BOTH_READY');
	});

	it('no resuelve si falta una de las dos decisiones', () => {
		const estado = nuevoEstado();
		expect(() => resolverFase(estado, [{ rol: 'futbolista', nota: '' }], SEMILLA)).toThrow(
			/representante/
		);
		expect(() => resolverFase(estado, [], SEMILLA)).toThrow();
	});

	it('no toca el estado que recibe', () => {
		const estado = nuevoEstado();
		const copia = structuredClone(estado);
		resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA);
		expect(estado).toEqual(copia);
	});

	it('da el mismo resultado sin importar el orden de las decisiones', () => {
		const estado = nuevoEstado();
		const enUnOrden = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA);
		const enElOtro = resolverFase(estado, [...CIERRAN_LOS_DOS].reverse(), SEMILLA);
		expect(enUnOrden.estado).toEqual(enElOtro.estado);
	});
});

describe('avance de fases y temporadas', () => {
	it('va de la fase 1 a la 2 y de la 2 a la 3', () => {
		let estado = nuevoEstado();
		estado = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA).estado;
		expect(estado.fase).toBe(2);
		expect(estado.temporada).toBe(1);

		estado = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA).estado;
		expect(estado.fase).toBe(3);
		expect(estado.temporada).toBe(1);
	});

	it('al cerrar la fase 3 arranca la temporada siguiente', () => {
		let estado = nuevoEstado();
		const edadInicial = estado.futbolista.edad;

		for (let i = 0; i < 3; i++) {
			estado = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA).estado;
		}

		expect(estado.temporada).toBe(2);
		expect(estado.fase).toBe(1);
		expect(estado.anio).toBe(2027);
		expect(estado.futbolista.edad).toBe(edadInicial + 1);
	});

	it('el futbolista cobra y el representante cobra su fijo más la comisión', () => {
		let estado = nuevoEstado();
		const salarioAnual = estado.futbolista.contrato.salarioMensual * 12;
		const cajaPrevia = estado.representante.dineroUsd;
		const fijoEsperado = 4_000 + 600 * estado.representante.prestigio;
		const comisionEsperada = Math.round(
			(salarioAnual * estado.contratoRepresentacion.pctSalario) / 100
		);

		for (let i = 0; i < 3; i++) {
			estado = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA).estado;
		}

		expect(estado.futbolista.dineroUsd).toBe(salarioAnual);
		expect(estado.representante.dineroUsd).toBe(cajaPrevia + fijoEsperado + comisionEsperada);
	});

	it('el desgaste sube y la confianza se enfría sola', () => {
		let estado = nuevoEstado();
		const confianzaPrevia = estado.confianza;

		for (let i = 0; i < 3; i++) {
			estado = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA).estado;
		}

		expect(estado.futbolista.desgaste).toBeGreaterThan(0);
		expect(estado.confianza).toBe(confianzaPrevia - 2);
	});

	it('revela las notas de los dos al cerrar la fase', () => {
		const estado = nuevoEstado();
		const { log } = resolverFase(
			estado,
			[
				{ rol: 'futbolista', nota: 'Me quedo en el club' },
				{ rol: 'representante', nota: 'Estoy hablando con otro club' }
			],
			SEMILLA
		);

		const notas = log.filter((e) => e.tipo === 'nota');
		expect(notas).toHaveLength(2);
		expect(notas.every((n) => n.visiblePara === 'ambos')).toBe(true);
	});
});

describe('fin de la carrera', () => {
	it('termina en el tope duro de temporadas y no deja seguir', () => {
		let estado = nuevoEstado();

		// Con desgaste apagado, lo único que corta es el tope duro.
		for (let vuelta = 0; vuelta < TEMPORADAS_MAXIMAS * 3 + 10; vuelta++) {
			if (estado.carreraTerminada) break;
			estado = resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA).estado;
		}

		expect(estado.carreraTerminada).toBe(true);
		expect(() => resolverFase(estado, CIERRAN_LOS_DOS, SEMILLA)).toThrow(/terminó/);
	});
});
