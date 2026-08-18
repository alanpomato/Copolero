import { describe, expect, it } from 'vitest';
import { clubes, contexto } from '../../../content/mundo';
import { estadoInicial } from './estado';
import { ofertasPara } from './pases';
import { rngPara } from './rng';
import { brechaCon } from './temporada';
import type { Estado } from './tipos';

/**
 * Hasta dónde puede caer el que no juega.
 *
 * Hernán lo encontró jugando: en el Paris Saint-Germain, con una temporada de
 * nota 7, las ofertas que le llegaban eran de Los Andes. El motivo era que la
 * rama del mercado para el que está en el banco solo miraba "que allá seas
 * titular", y el club donde más titular sos es siempre el más chico que existe.
 *
 * Tiene que seguir habiendo salida hacia abajo —sin eso, una carrera mal
 * empezada no tiene arreglo— pero la caída tiene fondo.
 */

function suplenteEn(clubId: string, media: number): Estado {
	const e = estadoInicial(
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
		rngPara('banco', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
	for (const k of Object.keys(e.futbolista.atributos)) {
		e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = media;
	}
	e.futbolista.edad = 27;
	e.futbolista.fama = 70;
	e.temporada = 8;
	e.futbolista.contrato.temporadasRestantes = 2;
	return e;
}

const PSG = 'fr-psg';

describe('el que está en el banco de un grande', () => {
	it('no recibe ofertas de la Primera Nacional argentina', () => {
		for (const media of [60, 64, 68]) {
			const e = suplenteEn(PSG, media);
			expect(brechaCon(e.futbolista, PSG)).toBeLessThan(-6);

			const ofertas = ofertasPara(e, 'banco');
			expect(ofertas.length).toBeGreaterThan(0);

			const deAca = contexto(PSG).liga.fuerza;
			for (const o of ofertas) {
				const allá = contexto(o.clubId).liga.fuerza;
				expect(
					allá,
					`media ${media}: ${contexto(o.clubId).club.nombre} juega en una liga de ${allá}`
				).toBeGreaterThanOrEqual(deAca - 20);
			}
		}
	});

	it('tampoco por una fracción de lo que gana', () => {
		const e = suplenteEn(PSG, 64);
		const gana = e.futbolista.contrato.salarioMensual;

		for (const o of ofertasPara(e, 'banco')) {
			expect(o.salarioMensual).toBeGreaterThan(gana * 0.35);
		}
	});

	it('pero sigue habiendo salida: en todos lados aparece dónde jugar', () => {
		// La razón de existir de esta rama. Si el piso deja a alguien sin ofertas,
		// el piso está mal puesto: la carrera se muere ahí.
		const grandes = clubes.filter((c) => c.prestigio >= 80).slice(0, 12);
		for (const c of grandes) {
			for (const media of [58, 66]) {
				const e = suplenteEn(c.id, media);
				if (brechaCon(e.futbolista, c.id) >= -6) continue;
				expect(ofertasPara(e, 'banco').length, `${c.nombre} con media ${media}`).toBeGreaterThan(0);
			}
		}
	});

	it('entre los que lo van a poner, primero los más grandes', () => {
		// El que no juega no busca ser la figura del club más chico: busca seguir
		// jugando lo más arriba que pueda.
		const e = suplenteEn(PSG, 68);
		const ofertas = ofertasPara(e, 'banco');
		const prestigios = ofertas.map((o) => contexto(o.clubId).club.prestigio);

		/*
		 * De mitad de tabla para arriba dentro de lo que puede aspirar.
		 *
		 * El número bajó de 50 a 45 por un motivo que vale la pena anotar, porque
		 * es un cambio de diseño y no un test que se aflojó. Antes el mercado era
		 * el mundo entero, así que a un suplente del PSG lo llamaban Boca, River o
		 * Flamengo: clubes enormes donde igual iba a ser titular. Desde que el
		 * mercado se acota a dos continentes (ver `sondeo.ts`), un jugador de
		 * Europa que no salió a sondear afuera recibe ofertas europeas, y los
		 * clubes de Europa donde un media 68 es titular son los de mitad de tabla,
		 * no los de arriba.
		 *
		 * Eso no es un empeoramiento: es lo que hace que el representante sirva.
		 * Si quiere que a su jugador lo llame Boca, tiene que sondear Sudamérica.
		 */
		for (const p of prestigios) expect(p).toBeGreaterThanOrEqual(45);
	});
});
