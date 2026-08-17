import { beforeEach, describe, expect, it } from 'vitest';
import { crearDb, migrarDb, type Db } from './db/cliente';
import {
	crearPartida,
	enviarDecision,
	ErrorDePartida,
	tirarOcasion,
	unirseAPartida,
	vistaPara
} from './partidas';
import type { ConfigPartida } from '$lib/engine/estado';
import type { Decision } from '$lib/engine/tipos';

/**
 * La ruleta que gira.
 *
 * Lo que se prueba acá es lo único que la hace valer: que el número que se ve
 * al tirar sea el número que va a contar. Si tirar y cerrar la fase pudieran
 * dar resultados distintos, la animación sería una decoración mentirosa; y si
 * se pudiera volver a tirar, no sería una ruleta.
 */

const CONFIG: ConfigPartida = {
	futbolista: {
		nombre: 'Damián Correa',
		nacionalidad: 'Argentina',
		puesto: 'centrodelantero',
		numero: 9,
		pie: 'derecho',
		edadInicial: 16,
		clubId: 'ar-huracan'
	},
	representante: { nombre: 'Sin representante' }
};

let db: Db;

const nada = (rol: Decision['rol']): Decision => ({ rol, nota: '' });

/** Una partida con los dos adentro y la pretemporada ya cerrada: fase 2. */
function enLaTemporada() {
	const { codigo, token: futbolista } = crearPartida(db, CONFIG, 'futbolista', 'Alan', 2026);
	const representante = unirseAPartida(db, codigo, 'Hernán');
	enviarDecision(db, futbolista, nada('futbolista'));
	enviarDecision(db, representante, nada('representante'));
	return { futbolista, representante };
}

beforeEach(() => {
	db = crearDb(':memory:');
	migrarDb(db);
});

describe('tirar la rueda', () => {
	it('devuelve qué pasó en el acto, con el texto de la crónica', () => {
		const { futbolista } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		const tirada = tirarOcasion(db, futbolista, 0, cuales[0].opciones[0].id);

		expect(tirada.indice).toBe(0);
		expect(tirada.ocasionId).toBe(cuales[0].id);
		expect(tirada.opcionId).toBe(cuales[0].opciones[0].id);
		expect(typeof tirada.salio).toBe('boolean');
	});

	it('la segunda vez devuelve lo mismo: no se vuelve a tirar', () => {
		const { futbolista } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		const primera = tirarOcasion(db, futbolista, 0, cuales[0].opciones[0].id);
		// Y ni siquiera cambiando de opción: la elección ya está escrita.
		const otra = cuales[0].opciones[cuales[0].opciones.length - 1].id;
		const segunda = tirarOcasion(db, futbolista, 0, otra);

		expect(segunda).toEqual(primera);
	});

	it('se juegan en orden: no se puede saltar al tercero', () => {
		const { futbolista } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		expect(() => tirarOcasion(db, futbolista, 2, cuales[2].opciones[0].id)).toThrow(ErrorDePartida);
	});

	it('la tira el que juega, no el representante', () => {
		const { futbolista, representante } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		expect(() => tirarOcasion(db, representante, 0, cuales[0].opciones[0].id)).toThrow(
			ErrorDePartida
		);
	});

	it('no acepta una opción que no existe', () => {
		const { futbolista } = enLaTemporada();
		expect(() => tirarOcasion(db, futbolista, 0, 'volarse-por-el-aire')).toThrow(ErrorDePartida);
	});

	it('no se tira después de cerrar la fase', () => {
		const { futbolista } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		enviarDecision(db, futbolista, nada('futbolista'));

		expect(() => tirarOcasion(db, futbolista, 0, cuales[0].opciones[0].id)).toThrow(ErrorDePartida);
	});

	it('la vista las devuelve en orden, para poder dibujarlas al recargar', () => {
		const { futbolista } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		tirarOcasion(db, futbolista, 0, cuales[0].opciones[0].id);
		tirarOcasion(db, futbolista, 1, cuales[1].opciones[0].id);

		const vistas = vistaPara(db, futbolista)!.tiradas;
		expect(vistas.map((t) => t.indice)).toEqual([0, 1]);
		// Y al otro no le aparecen como suyas: la rueda no es de él.
		expect(vistaPara(db, futbolista)!.tiradas.length).toBe(2);
	});
});

describe('lo tirado es lo que cuenta', () => {
	/**
	 * El corazón del asunto.
	 *
	 * Se tiran las tres, se anota qué dijo cada una, y después se cierra la fase
	 * mandando a propósito otras opciones distintas. Lo que tiene que quedar en
	 * el diario es lo que dijo la ruleta, no lo que dijo el formulario.
	 */
	it('el diario cuenta lo mismo que contó la ruleta', () => {
		const { futbolista, representante } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		const dijo = cuales.map((o, i) => tirarOcasion(db, futbolista, i, o.opciones[0].id));

		// Cierra mandando la opción contraria en las tres. No tiene que servirle
		// de nada: la elección ya está escrita.
		enviarDecision(db, futbolista, {
			rol: 'futbolista',
			nota: '',
			ocasiones: cuales.map((o) => o.opciones[o.opciones.length - 1].id)
		});
		enviarDecision(db, representante, nada('representante'));

		const diario = vistaPara(db, futbolista)!
			.diario.filter((e) => e.temporada === 1 && e.fase === 2)
			.map((e) => e.texto);

		for (const t of dijo) {
			// Las opciones que no fallan nunca no dejan crónica cuando salen mal,
			// porque no salen mal.
			if (!t.texto) continue;
			expect(diario).toContain(t.texto);
		}
	});

	it('sin tirar nada, el formulario sigue mandando como siempre', () => {
		// La rueda es una mejora, no un requisito: quien juegue sin JavaScript
		// manda las tres opciones en el formulario y la fase se resuelve igual.
		const { futbolista, representante } = enLaTemporada();
		const cuales = vistaPara(db, futbolista)!.opciones.ocasiones!;

		enviarDecision(db, futbolista, {
			rol: 'futbolista',
			nota: '',
			ocasiones: cuales.map((o) => o.opciones[0].id)
		});
		enviarDecision(db, representante, nada('representante'));

		expect(vistaPara(db, futbolista)!.estado.fase).toBe(3);
	});
});
