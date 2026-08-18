import { describe, expect, it } from 'vitest';
import { contexto } from '../../../content/mundo';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { ofertasPara } from './pases';
import { rngPara } from './rng';
import {
	CONFEDERACIONES,
	cuantoLlega,
	dondePuedeSondear,
	entraEnElMercado,
	laDeCasa,
	losDeEsteMercado
} from './sondeo';
import type { Estado } from './tipos';

/**
 * Dónde sale a buscar el representante.
 *
 * "Que el repre tenga la posibilidad de sondear por continente según cantidad
 * de temporadas. O sea, no debería tener ofertas de todos los continentes sino
 * de 2 máximo." Lo que se prueba acá es el "2 máximo", que es la parte que
 * cambia el juego: sin tope, el trabajo del representante no se ve en ningún
 * lado porque el mercado ya trae el mundo entero.
 */
function unaAgencia(clubId = 'ar-huracan'): Estado {
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
			representante: { nombre: 'Rubén Bravo' }
		},
		rngPara('sondeo', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

describe('hasta dónde llega', () => {
	it('la de casa la tiene siempre, sin importar el alcance', () => {
		const e = unaAgencia();
		e.representante.atributos.contactos = 0;
		e.representante.prestigio = 0;

		const casa = dondePuedeSondear(e).find((d) => d.esLaDeCasa)!;
		expect(casa.id).toBe('conmebol');
		expect(casa.alcanza).toBe(true);
	});

	it('a Europa hay que llegar: el que recién empieza no llega', () => {
		const e = unaAgencia();
		e.representante.atributos.contactos = 12;
		e.representante.prestigio = 5;

		const europa = dondePuedeSondear(e).find((d) => d.id === 'uefa')!;
		expect(europa.alcanza).toBe(false);
		expect(europa.falta).toBeGreaterThan(0);
	});

	it('y el que trabajó diez años con contactos, sí', () => {
		const e = unaAgencia();
		e.temporada = 11;
		e.representante.atributos.contactos = 70;
		e.representante.prestigio = 60;

		expect(cuantoLlega(e)).toBeGreaterThanOrEqual(78);
		expect(dondePuedeSondear(e).find((d) => d.id === 'uefa')!.alcanza).toBe(true);
	});

	it('todas las confederaciones del mundo están en la lista', () => {
		const e = unaAgencia();
		expect(dondePuedeSondear(e).map((d) => d.id)).toEqual(CONFEDERACIONES.map((c) => c.id));
	});
});

describe('dos y no más', () => {
	it('sin elegir nada, sólo el continente donde ya trabaja', () => {
		const e = unaAgencia();
		expect(losDeEsteMercado(e)).toEqual([laDeCasa(e)]);
	});

	it('eligiendo uno al que llega, dos', () => {
		const e = unaAgencia();
		e.temporada = 11;
		e.representante.atributos.contactos = 80;
		e.representante.prestigio = 70;
		e.sondeo = 'uefa';

		expect(losDeEsteMercado(e)).toEqual(['conmebol', 'uefa']);
	});

	it('eligiendo uno al que no llega, uno: la pantalla no puede prometer lo que el motor no da', () => {
		const e = unaAgencia();
		e.representante.atributos.contactos = 10;
		e.representante.prestigio = 0;
		e.sondeo = 'uefa';

		expect(losDeEsteMercado(e)).toEqual(['conmebol']);
		expect(entraEnElMercado(e, 'en-arsenal')).toBe(false);
	});

	it('nunca son tres, por más grande que sea la agencia', () => {
		const e = unaAgencia();
		e.temporada = 20;
		e.representante.atributos.contactos = 99;
		e.representante.prestigio = 99;
		e.sondeo = 'uefa';

		expect(losDeEsteMercado(e).length).toBeLessThanOrEqual(2);
	});
});

describe('lo que llega al mercado', () => {
	it('las ofertas salen de los continentes sondeados y de ningún otro', () => {
		const e = unaAgencia();
		e.temporada = 6;
		e.futbolista.fama = 82;
		for (const k of Object.keys(
			e.futbolista.atributos
		) as (keyof typeof e.futbolista.atributos)[]) {
			e.futbolista.atributos[k] = 78;
		}
		e.futbolista.contrato.salarioMensual = 20_000;
		e.representante.atributos.contactos = 80;
		e.representante.prestigio = 70;
		e.sondeo = 'uefa';

		const ofertas = ofertasPara(e, 'sondeo');
		expect(ofertas.length).toBeGreaterThan(0);
		for (const o of ofertas) {
			expect(['conmebol', 'uefa'], o.clubId).toContain(contexto(o.clubId).pais.confederacion);
		}
	});

	it('sondear cambia de verdad quién llama', () => {
		/*
		 * La prueba de que esto no es decoración: el mismo jugador, la misma
		 * semilla, y lo único distinto es dónde salió a buscar su representante.
		 */
		function conSondeo(donde: string): Set<string> {
			const e = unaAgencia();
			e.temporada = 6;
			e.futbolista.fama = 82;
			// Un jugador que de verdad podría jugar en Europa: si no, sondear allá no
			// cambia nada porque igual no lo llamaría nadie, y el test no probaría
			// el sondeo sino el nivel.
			for (const k of Object.keys(
				e.futbolista.atributos
			) as (keyof typeof e.futbolista.atributos)[]) {
				e.futbolista.atributos[k] = 78;
			}
			e.futbolista.contrato.salarioMensual = 20_000;
			e.representante.atributos.contactos = 80;
			e.representante.prestigio = 70;
			e.sondeo = donde;
			return new Set(ofertasPara(e, 'sondeo').map((o) => contexto(o.clubId).pais.confederacion));
		}

		expect(conSondeo('uefa')).not.toEqual(conSondeo('conmebol'));
	});

	it('la elección se guarda al cerrar la pretemporada', () => {
		const e = unaAgencia();
		e.representante.atributos.contactos = 90;
		e.representante.prestigio = 90;
		e.temporada = 8;

		const { estado } = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '' },
				{ rol: 'representante', nota: '', sondeo: 'uefa' }
			],
			'sondeo'
		);
		expect(estado.sondeo).toBe('uefa');
	});

	it('y si eligió uno al que no llega, se guarda el de casa y no el que pidió', () => {
		const e = unaAgencia();
		e.representante.atributos.contactos = 5;
		e.representante.prestigio = 0;

		const { estado } = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '' },
				{ rol: 'representante', nota: '', sondeo: 'uefa' }
			],
			'sondeo'
		);
		expect(estado.sondeo).toBe('conmebol');
	});
});
