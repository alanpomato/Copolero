import { describe, expect, it } from 'vitest';
import { estadoInicial, media } from './estado';
import { rngPara } from './rng';
import { temporadas } from './probar';
import {
	NOTA_DE_TEMPORADON,
	TECHO_MAXIMO,
	ULTIMA_EDAD_QUE_EMPUJA,
	empujarElTecho,
	loQueEmpujaElTecho,
	loQueSeCuenta
} from './techo';
import type { Estado, HitoTemporada } from './tipos';

/**
 * El techo que se mueve.
 *
 * Lo que se prueba acá es la respuesta a lo que encontró Alan jugando: media 62
 * a los 21 y media 62 a los 28, y un Mundial en el medio que no cambió nada.
 */

function unPibe(semilla = 'techo'): Estado {
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
			representante: { nombre: 'Alan' }
		},
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

function unAnio(cambios: Partial<HitoTemporada> = {}): HitoTemporada {
	return {
		temporada: 3,
		anio: 2028,
		edad: 18,
		clubId: 'ar-huracan',
		media: 60,
		nota: 6,
		partidos: 30,
		goles: 8,
		asistencias: 4,
		fama: 30,
		valorUsd: 1_000_000,
		campeon: false,
		titulo: false,
		lesionado: false,
		mundial: null,
		seFue: false,
		...cambios
	};
}

describe('qué mueve el techo', () => {
	it('un año del montón no lo mueve', () => {
		const e = unPibe();
		expect(loQueEmpujaElTecho(e, unAnio({ nota: 6.4 }))).toEqual([]);
		expect(empujarElTecho(e, unAnio({ nota: 6.4 }))).toBe(0);
	});

	/* Es el caso exacto que reportó Alan: jugó un Mundial y no subió nada. */
	it('jugar un Mundial lo mueve', () => {
		const e = unPibe();
		const antes = e.futbolista.potencial;
		expect(empujarElTecho(e, unAnio({ mundial: 'cuartos' }))).toBeGreaterThan(0);
		expect(e.futbolista.potencial).toBeGreaterThan(antes);
	});

	it('y llegar lejos lo mueve más', () => {
		const corto = unPibe();
		const largo = unPibe();
		const a = empujarElTecho(corto, unAnio({ mundial: 'fase-de-grupos' }));
		const b = empujarElTecho(largo, unAnio({ mundial: 'semifinal' }));
		expect(b).toBeGreaterThan(a);
	});

	/*
	 * `no-fue` es un valor válido del resultado de Mundial. Hoy el motor no lo
	 * escribe en el historial, pero si algún día lo escribiera, el que se lo
	 * perdió no puede llevarse el premio del que lo jugó.
	 */
	it('no haber ido no cuenta como haber ido', () => {
		const e = unPibe();
		expect(empujarElTecho(e, unAnio({ mundial: 'no-fue' }))).toBe(0);
	});

	it('un temporadón lo mueve', () => {
		const e = unPibe();
		expect(empujarElTecho(e, unAnio({ nota: NOTA_DE_TEMPORADON, partidos: 30 }))).toBeGreaterThan(
			0
		);
	});

	/*
	 * Una nota alta en ocho partidos es un buen semestre, no un año. Sin los
	 * minutos, el suplente que entra a hacer goles subiría más que el titular que
	 * aguantó treinta fechas.
	 */
	it('pero una nota alta en pocos partidos no', () => {
		const e = unPibe();
		expect(empujarElTecho(e, unAnio({ nota: 8.5, partidos: 8 }))).toBe(0);
	});

	it('un título ganado jugando lo mueve, y estar en la foto no', () => {
		const suyo = unPibe();
		const ajeno = unPibe();
		expect(empujarElTecho(suyo, unAnio({ titulo: true, campeon: true }))).toBeGreaterThan(0);
		expect(empujarElTecho(ajeno, unAnio({ titulo: false, campeon: true }))).toBe(0);
	});

	it('varias cosas el mismo año suman', () => {
		const una = unPibe();
		const todas = unPibe();
		const a = empujarElTecho(una, unAnio({ mundial: 'cuartos' }));
		const b = empujarElTecho(todas, unAnio({ mundial: 'cuartos', nota: 7.8, titulo: true }));
		expect(b).toBeGreaterThan(a);
	});
});

describe('los frenos', () => {
	/* No se puede entrenar hasta ser Messi. */
	it('cuanto más alto el techo, menos se lo puede empujar', () => {
		const bajo = unPibe();
		const alto = unPibe();
		bajo.futbolista.potencial = 62;
		alto.futbolista.potencial = 90;

		const a = empujarElTecho(bajo, unAnio({ nota: 7.8 }));
		const b = empujarElTecho(alto, unAnio({ nota: 7.8 }));
		expect(a).toBeGreaterThan(b);
	});

	/*
	 * La parte que hace que esto sirva de algo: crecer contra el techo se frena
	 * con la edad, así que un techo que se corre a los veintiocho es un permiso
	 * que llega cuando ya no queda carrera para usarlo.
	 */
	it('a los diecisiete se mueve mucho más que a los veintiocho', () => {
		const pibe = unPibe();
		const grande = unPibe();
		const a = empujarElTecho(pibe, unAnio({ edad: 17, nota: 7.8 }));
		const b = empujarElTecho(grande, unAnio({ edad: 28, nota: 7.8 }));
		expect(a).toBeGreaterThan(b * 2);
	});

	it('y pasada la edad, ya no se mueve', () => {
		const e = unPibe();
		const hito = unAnio({ edad: ULTIMA_EDAD_QUE_EMPUJA + 1, nota: 8.5, mundial: 'campeon' });
		expect(empujarElTecho(e, hito)).toBe(0);
	});

	it('nunca pasa del tope', () => {
		const e = unPibe();
		e.futbolista.potencial = TECHO_MAXIMO;
		empujarElTecho(e, unAnio({ edad: 17, nota: 9, mundial: 'campeon', titulo: true }));
		expect(e.futbolista.potencial).toBeLessThanOrEqual(TECHO_MAXIMO);
	});

	/*
	 * El potencial es un número oculto y nadie lo mira, pero un flotante sucio
	 * rompe la comparación de dos estados que tendrían que ser iguales, que es
	 * como están escritos los tests del motor.
	 */
	it('queda redondo: nada de 88.80000000000001', () => {
		const e = unPibe();
		for (const edad of [17, 18, 19, 20, 21]) {
			empujarElTecho(e, unAnio({ edad, nota: 7.9, mundial: 'semifinal', titulo: true }));
		}
		expect(e.futbolista.potencial).toBe(Math.round(e.futbolista.potencial * 10) / 10);
	});
});

describe('cómo se cuenta', () => {
	it('no se dice el número: el techo sigue siendo invisible', () => {
		const e = unPibe();
		const linea = loQueSeCuenta(loQueEmpujaElTecho(e, unAnio({ mundial: 'campeon' })), 'Correa')!;
		expect(linea.texto).not.toMatch(/\d/);
		expect(linea.visiblePara).toBe('ambos');
	});

	it('manda el motivo más gordo', () => {
		const e = unPibe();
		const empujones = loQueEmpujaElTecho(
			e,
			unAnio({ edad: 18, mundial: 'campeon', nota: 7.4, titulo: true })
		);
		expect(loQueSeCuenta(empujones, 'Correa')!.texto).toContain('Mundial');
	});

	it('y si no se movió nada, no se dice nada', () => {
		expect(loQueSeCuenta([], 'Correa')).toBeNull();
	});
});

describe('en una carrera entera', () => {
	/*
	 * La prueba que importa. Medí veinticinco carreras con el techo fijo: una
	 * promedió 7,4 de nota durante quince temporadas y su media nunca pasó de 60,
	 * con doce años completamente planos. Lo que se verifica acá no es una
	 * fórmula sino que una carrera se sienta como una carrera: que el jugador
	 * siga creciendo mientras es joven y que jugar bien sirva para algo.
	 */
	it('una carrera crece durante años y no se clava a los veintidós', () => {
		let peorRacha = 0;

		for (const semilla of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
			let e = unPibe(semilla);
			e = temporadas(e, 30, undefined, semilla);
			const medias = e.historial.map((h) => h.media);
			expect(medias.length).toBeGreaterThan(8);

			// La racha más larga de años seguidos sin subir ni un punto, contada
			// solo hasta el pico: lo de después es la caída, y eso está bien.
			const pico = medias.indexOf(Math.max(...medias));
			let racha = 0;
			for (let i = 1; i <= pico; i++) {
				racha = medias[i] <= medias[i - 1] ? racha + 1 : 0;
				peorRacha = Math.max(peorRacha, racha);
			}
		}

		// Antes había carreras con doce años planos de veintiuno. Cuatro seguidos
		// es una meseta; doce es una pared.
		expect(peorRacha).toBeLessThanOrEqual(5);
	});

	it('y el que la rompe todos los años termina más arriba que el que no', () => {
		// Mismo jugador, misma semilla: la única diferencia es el techo que el
		// motor le fue reconociendo. Se compara contra su propio arranque.
		let e = unPibe('crece');
		const alArrancar = media(e.futbolista.atributos, e.futbolista.posicion);
		e = temporadas(e, 30, undefined, 'crece');
		const pico = Math.max(...e.historial.map((h) => h.media));
		expect(pico).toBeGreaterThan(alArrancar + 15);
	});
});
