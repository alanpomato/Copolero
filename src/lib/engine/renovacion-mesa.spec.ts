import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { RENOVACION, momentosDelRepresentante } from './momentos';
import { QUEDARSE } from './pases';
import { rngPara } from './rng';
import type { Estado } from './tipos';

/**
 * La mesa de renovación.
 *
 * Bebo lo encontró jugando una temporada entera: "cuando se te agota el
 * contrato te aparece la opción negociar un año más, ponés eso y
 * automáticamente te elige una de las opciones de los equipos que te ofrecen
 * abajo al azar". Reproducido, el diario se contradecía en la misma temporada:
 * "se quedó en el club, los dos estuvieron de acuerdo" y dos líneas más abajo
 * "hubo que firmar a las apuradas", en otro club.
 *
 * La raíz era que nadie negociaba la renovación: el motor la resolvía solo, a
 * espaldas de los dos, así que elegir quedarse no significaba nada. Ahora la
 * negocia el representante, que es de quien es el trabajo.
 */

function conElContratoTerminandose(media: number): Estado {
	const e = estadoInicial(
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
		rngPara('mesa', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
	for (const k of Object.keys(e.futbolista.atributos)) {
		e.futbolista.atributos[k as keyof typeof e.futbolista.atributos] = media;
	}
	e.futbolista.edad = 26;
	e.temporada = 6;
	e.fase = 3;
	e.futbolista.contrato.temporadasRestantes = 1;
	return e;
}

const cierran = (renovacion: string) => [
	{ rol: 'futbolista' as const, nota: '', destino: QUEDARSE },
	{ rol: 'representante' as const, nota: '', destino: QUEDARSE, momentos: [renovacion] }
];

describe('cuando se termina el contrato', () => {
	it('el mercado del representante es la mesa, y ninguna otra cosa', () => {
		for (const media of [44, 60, 75]) {
			const e = conElContratoTerminandose(media);
			const suyos = momentosDelRepresentante(e, 'mesa');
			expect(suyos.length).toBe(1);
			expect(suyos[0].id).toBe(RENOVACION);
			// Y las probabilidades salen de sus atributos, como pidió Bebo.
			expect(suyos[0].opciones.some((o) => o.probabilidad > 0 && o.probabilidad < 100)).toBe(true);
		}
	});

	it('al que el club quiere, le cuesta menos', () => {
		const figura = conElContratoTerminandose(78);
		const suplente = conElContratoTerminandose(40);

		const deLaFigura = momentosDelRepresentante(figura, 'mesa')[0];
		const delSuplente = momentosDelRepresentante(suplente, 'mesa')[0];

		const pedirMejora = (m: typeof deLaFigura) =>
			m.opciones.find((o) => o.id === 'pedir-mas')!.probabilidad;

		expect(pedirMejora(deLaFigura)).toBeGreaterThan(pedirMejora(delSuplente));
	});

	it('si la mesa sale bien, se queda: aunque el club no lo hubiera renovado solo', () => {
		// El caso que rompía. Con media baja, `ofertaDeRenovacion` dice que no, y
		// antes eso mandaba al jugador a otro club aunque hubieran elegido
		// quedarse. Ahora, si el representante consiguió la firma, hay firma.
		let cuantasSeQuedaron = 0;

		for (let t = 5; t <= 16; t++) {
			const e = conElContratoTerminandose(48);
			e.temporada = t;
			const suClub = e.futbolista.contrato.clubId;

			const { estado, log } = resolverFase(e, cierran('renovar-igual'), 'mesa');

			if (estado.futbolista.contrato.clubId === suClub) {
				cuantasSeQuedaron++;
				// Y con contrato de verdad, no cero temporadas.
				expect(estado.futbolista.contrato.temporadasRestantes).toBeGreaterThan(0);
				// El diario no puede decir que se fue.
				expect(log.some((l) => l.texto.includes('firmar a las apuradas'))).toBe(false);
			}
		}

		expect(cuantasSeQuedaron).toBeGreaterThan(0);
	});

	it('el diario nunca dice que se quedó y lo manda a otro club', () => {
		// El síntoma exacto que vio Bebo: las dos líneas juntas, misma temporada.
		for (let t = 4; t <= 18; t++) {
			for (const media of [42, 55, 70]) {
				const e = conElContratoTerminandose(media);
				e.temporada = t;
				const suClub = e.futbolista.contrato.clubId;

				const { estado, log } = resolverFase(e, cierran('renovar-igual'), 'mesa');
				const seFue = estado.futbolista.contrato.clubId !== suClub;
				const dijoQueSeQuedo = log.some((l) => l.texto.includes('Los dos estuvieron de acuerdo'));

				expect(seFue && dijoQueSeQuedo, `t${t} media ${media}`).toBe(false);
			}
		}
	});

	it('elegir no renovar sale al mercado, y lo dice', () => {
		const e = conElContratoTerminandose(70);
		const { log } = resolverFase(e, cierran('no-renovar'), 'mesa');

		expect(log.some((l) => l.texto.includes('no renovar'))).toBe(true);
	});

	it('y si nadie toca nada, se intenta renovar y no se sale sin club', () => {
		// La opción por defecto es la última de la lista. En esta mesa lo prudente
		// es firmar: el que cierra sin mirar no puede quedarse sin equipo por eso.
		const e = conElContratoTerminandose(60);
		const laQueSeManda = momentosDelRepresentante(e, 'mesa')[0].opciones.at(-1)!;

		expect(laQueSeManda.id).not.toBe('no-renovar');
	});
});
