import { describe, expect, it } from 'vitest';
import { estadoInicial } from '$lib/engine/estado';
import { resolverFase } from '$lib/engine/fases';
import { ocasionesDe } from '$lib/engine/ocasiones';
import { rngPara } from '$lib/engine/rng';
import type { Decision } from '$lib/engine/tipos';
import { chipsDe, escenaDe, escenasDe } from './efectos';

describe('los chips de una opción', () => {
	it('dice qué sube y qué baja, no el signo del número', () => {
		const [chip] = chipsDe({ goles: 2 });
		expect(chip.texto).toBe('+2 goles');
		expect(chip.tono).toBe('sube');
	});

	it('singular y plural, que "+1 goles" se lee mal', () => {
		expect(chipsDe({ goles: 1 })[0].texto).toBe('+1 gol');
		expect(chipsDe({ asistencias: 1 })[0].texto).toBe('+1 asistencia');
		expect(chipsDe({ asistencias: 3 })[0].texto).toBe('+3 asistencias');
	});

	/*
	 * El único campo donde el signo del número y el signo de la noticia no
	 * coinciden. Un chip verde que dijera "+4 de desgaste" estaría mintiendo.
	 */
	it('subir el desgaste es una mala noticia', () => {
		expect(chipsDe({ desgaste: 4 })[0].tono).toBe('baja');
		expect(chipsDe({ desgaste: -4 })[0].tono).toBe('sube');
	});

	it('perder algo bueno es rojo', () => {
		expect(chipsDe({ moral: -6 })[0].tono).toBe('baja');
		expect(chipsDe({ moral: -6 })[0].texto).toBe('−6 de moral');
	});

	it('la plata se escribe corta', () => {
		expect(chipsDe({ dineroUsd: 40_000 })[0].texto).toBe('+US$ 40K');
		expect(chipsDe({ dineroUsd: -1_500_000 })[0].texto).toBe('−US$ 1.5M');
		expect(chipsDe({ dineroUsd: 2_000_000 })[0].texto).toBe('+US$ 2M');
	});

	it('lo más gordo primero, no el orden en que se escribió el objeto', () => {
		const chips = chipsDe({ moral: 1, goles: 3 });
		expect(chips[0].texto).toBe('+3 goles');
	});

	/*
	 * Sin esto la plata gana siempre: 40000 contra 3 no es una comparación,
	 * es una escala distinta.
	 */
	it('la plata no arrasa con el orden por ser un número grande', () => {
		const chips = chipsDe({ dineroUsd: 20_000, prestigio: 5 });
		expect(chips[0].texto).toBe('+5 de prestigio');
	});

	it('lo que no mueve nada no ocupa un chip', () => {
		expect(chipsDe({ goles: 0, moral: undefined })).toHaveLength(0);
		expect(chipsDe({})).toHaveLength(0);
	});
});

describe('la escena de una opción', () => {
	it('se dibuja lo que la opción toca', () => {
		expect(escenaDe({ goles: 1 }, {})).toBe('remate');
		expect(escenaDe({ asistencias: 1 }, {})).toBe('pase');
		expect(escenaDe({}, { desgaste: 5 })).toBe('esfuerzo');
		expect(escenaDe({ dt: 4 }, {})).toBe('tecnico');
		expect(escenaDe({ hinchada: 4 }, {})).toBe('tribuna');
		expect(escenaDe({ dineroUsd: 10_000 }, {})).toBe('plata');
		expect(escenaDe({ representadosExtra: 1 }, {})).toBe('libreta');
		expect(escenaDe({ negociacion: 2 }, {})).toBe('mesa');
	});

	it('mira el castigo también: lo que se arriesga cuenta', () => {
		expect(escenaDe({}, { goles: -1 })).toBe('remate');
	});

	/* Un remate que además cansa es un remate, no un esfuerzo. */
	it('lo que más define a la opción manda', () => {
		expect(escenaDe({ goles: 2 }, { desgaste: 6 })).toBe('remate');
	});

	it('lo que no mueve nada conocido cae en la cancha', () => {
		expect(escenaDe({}, {})).toBe('cancha');
	});

	/*
	 * Un micrófono al lado de "si le ganás el tiempo, el arquero no llega" no es
	 * un desajuste chico: la imagen contradice el texto.
	 */
	it('una jugada con la pelota nunca termina dibujada como una nota de prensa', () => {
		const [uno, dos] = escenasDe([
			{ premio: { goles: 1, moral: 6 }, castigo: { moral: -3 } },
			{ premio: { goles: 1, prensa: 4 }, castigo: { moral: -4 } }
		]);
		expect(uno).toBe('remate');
		expect(dos).not.toBe('prensa');
	});

	/*
	 * La moral la mueven casi todas las opciones de casi todos los momentos, así
	 * que es el campo que menos distingue a una de la de al lado. Si pesara como
	 * las demás, media temporada se dibujaría con la misma foto del vestuario.
	 */
	it('un gol manda sobre la moral aunque el número sea más chico', () => {
		expect(escenaDe({ goles: 1, moral: 6 }, { moral: -3 })).toBe('remate');
	});
});

describe('repartir las escenas de un momento', () => {
	it('dos opciones del mismo momento no se llevan el mismo dibujo', () => {
		const escenas = escenasDe([
			{ premio: { goles: 1, moral: 5 }, castigo: { moral: -3 } },
			{ premio: { goles: 1, fama: 4 }, castigo: { dt: -2 } }
		]);
		expect(new Set(escenas).size).toBe(2);
	});

	it('la primera se queda con la que más la define', () => {
		const [primera] = escenasDe([
			{ premio: { goles: 2 }, castigo: {} },
			{ premio: { goles: 1 }, castigo: {} }
		]);
		expect(primera).toBe('remate');
	});

	it('sin nada que repartir cae en la cancha y no se rompe', () => {
		expect(escenasDe([{ premio: {}, castigo: {} }])).toEqual(['cancha']);
	});

	/*
	 * "El cruce" —el nueve rival que te ganó la espalda— no mueve goles ni
	 * asistencias: mueve al técnico y a la gente. Por los números solos se
	 * dibujaba con un pizarrón y una tribuna, y eso pasa en el minuto treinta de
	 * un partido.
	 */
	it('lo que pasa en la cancha se dibuja en la cancha, aunque los números digan otra cosa', () => {
		const escenas = escenasDe(
			[
				{ premio: { hinchada: 8, dt: 5 }, castigo: { dt: -8 } },
				{ premio: { dt: 4, moral: 3 }, castigo: { hinchada: -4 } }
			],
			'ruleta'
		);
		for (const e of escenas) {
			expect(['remate', 'pase', 'duelo', 'gambeta', 'esfuerzo', 'cancha']).toContain(e);
		}
	});

	it('y lo que pasa afuera no se dibuja con una pelota', () => {
		const escenas = escenasDe(
			[
				{ premio: { dineroUsd: 40_000 }, castigo: { prestigio: -3 } },
				{ premio: { contactos: 4 }, castigo: { moral: -2 } }
			],
			'quiz'
		);
		for (const e of escenas) {
			expect(['remate', 'pase', 'duelo', 'gambeta']).not.toContain(e);
		}
	});

	/*
	 * La prueba que importa de verdad: no que la función reparta bien un caso
	 * inventado, sino que en las ocasiones que el motor genera de verdad no
	 * quede un momento con tres estampas iguales. Tres dibujos idénticos en el
	 * mismo cuadro son exactamente la repetición que hay que evitar.
	 */
	it('en las ocasiones de verdad, ningún momento repite las tres', () => {
		const NADA: Decision[] = [
			{ rol: 'futbolista', nota: '' },
			{ rol: 'representante', nota: '' }
		];
		let e = estadoInicial(
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
				representante: { nombre: 'Alan' }
			},
			rngPara('escenas', { temporada: 0, fase: 1, clave: 'inicio' }),
			2026
		);

		let mirados = 0;
		// Con un solo momento por temporada (Alan pidió bajar a dos por año en
		// total), cada visita a la fase 2 deja uno solo en vez de tres: hace
		// falta recorrer más años para juntar la misma muestra de siempre.
		for (let i = 0; i < 90 && !e.carreraTerminada; i++) {
			e = resolverFase(e, NADA, 'escenas').estado;
			if (e.fase !== 2) continue;
			for (const ocasion of ocasionesDe(e, 'escenas')) {
				const escenas = escenasDe(ocasion.opciones, ocasion.juego);
				mirados++;
				expect(new Set(escenas).size, `${ocasion.titulo}: ${escenas.join(', ')}`).toBe(
					escenas.length
				);
			}
		}
		expect(mirados).toBeGreaterThan(15);
	});
});
