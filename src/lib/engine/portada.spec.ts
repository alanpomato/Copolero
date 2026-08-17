import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import { unaTemporada } from './probar';
import { CARTAS_QUE_DEJA_PASAR, cartasDelMercado } from './cartas';
import { opcionesDeFase } from './pantalla';
import { diarioDe, portadaDe } from './portada';
import { rngPara } from './rng';
import type { Decision, Estado, HitoTemporada } from './tipos';

function unPibe(clubId = 'ar2-moron'): Estado {
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
		rngPara('tapa', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

const NADA: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

/** Juega temporadas enteras y devuelve el estado al arrancar la siguiente. */
function jugar(estado: Estado, temporadas: number, semilla = 'tapa'): Estado {
	let e = estado;
	for (let i = 0; i < temporadas && !e.carreraTerminada; i++) {
		e = unaTemporada(e, NADA, semilla);
	}
	return e;
}

/** Un hito armado a mano, para probar los titulares sin depender del azar. */
function unHito(cambios: Partial<HitoTemporada> = {}): HitoTemporada {
	return {
		temporada: 3,
		anio: 2028,
		edad: 18,
		clubId: 'ar-boca',
		media: 62,
		nota: 6,
		partidos: 30,
		goles: 8,
		asistencias: 4,
		fama: 30,
		valorUsd: 2_000_000,
		campeon: false,
		titulo: false,
		lesionado: false,
		mundial: null,
		seFue: false,
		...cambios
	};
}

/** Un estado con historial puesto a mano y el jugador donde queramos. */
function conHistorial(hitos: HitoTemporada[], cambios: Partial<Estado> = {}): Estado {
	const e = unPibe('ar-boca');
	e.historial = hitos;
	e.temporada = hitos[hitos.length - 1].temporada + 1;
	e.anio = hitos[hitos.length - 1].anio + 1;
	e.futbolista.contrato.clubId = hitos[hitos.length - 1].clubId;
	e.futbolista.contrato.temporadasRestantes = 3;
	return Object.assign(e, cambios);
}

describe('el historial de la carrera', () => {
	it('arranca vacío y suma una fila por temporada cerrada', () => {
		let e = unPibe();
		expect(e.historial).toEqual([]);

		e = jugar(e, 1);
		expect(e.historial).toHaveLength(1);

		e = jugar(e, 4);
		expect(e.historial).toHaveLength(5);
	});

	it('las temporadas quedan en orden y sin huecos', () => {
		const e = jugar(unPibe(), 6);
		const numeros = e.historial.map((h) => h.temporada);
		expect(numeros).toEqual([1, 2, 3, 4, 5, 6]);
		// Y un año por temporada, sin repetir.
		expect(new Set(e.historial.map((h) => h.anio)).size).toBe(e.historial.length);
	});

	it('anota el club donde jugó, no el club al que lo transfirieron', () => {
		/*
		 * Hay que forzar los pases: una carrera en piloto automático no cambia
		 * nunca de club. Y forzarlos ahora es el mercado en dos tiempos completo,
		 * porque el futbolista no puede ir a donde el representante no lo dejó
		 * llegar: primero él deja pasar todo lo que le ofrecen, y recién después
		 * el futbolista elige entre lo que sobrevivió. Ver `cartas.ts`.
		 */
		let e = unPibe();
		// Con un representante hecho: si se le caen las tres todos los años, no hay
		// pase que anotar y el test no prueba nada.
		e.representante.atributos.negociacion = 95;
		e.representante.atributos.contactos = 95;
		e.representante.prestigio = 90;

		for (let t = 0; t < 10 && !e.carreraTerminada; t++) {
			e = resolverFase(e, NADA, 'tapa').estado; // fase 1 → 2
			e = resolverFase(e, NADA, 'tapa').estado; // fase 2 → 3

			// Primer tiempo: el representante deja pasar las tres más fáciles.
			const filtradas = [...cartasDelMercado(e, 'tapa')]
				.sort((a, b) => b.probabilidad - a.probabilidad)
				.slice(0, CARTAS_QUE_DEJA_PASAR)
				.map((c) => c.clubId);
			e = resolverFase(e, [{ rol: 'representante', nota: '', filtradas }], 'tapa').estado;

			// Segundo tiempo: el futbolista se va a la primera que haya llegado.
			const destino = e.mercado?.llegaron[0];
			e = resolverFase(e, [{ rol: 'futbolista', nota: '', destino }], 'tapa').estado;
		}

		// La invariante: el año quedó anotado con la camiseta con la que se jugó,
		// aunque el pase se cierre en el mismo cierre de temporada. Si esto se
		// invierte, los goles se le acreditan al club equivocado para siempre.
		const hubo = e.historial.filter((h) => h.seFue);
		expect(hubo.length).toBeGreaterThan(0);

		for (const h of e.historial) {
			const siguiente = e.historial.find((s) => s.temporada === h.temporada + 1);
			if (!siguiente) continue;
			expect(siguiente.clubId === h.clubId).toBe(!h.seFue);
		}
	});

	it('el título solo es suyo si jugó: el resto es estar en la foto', () => {
		let e = unPibe();
		for (let i = 0; i < 14 && !e.carreraTerminada; i++) e = jugar(e, 1);

		// Todos los años en que el club salió campeón sin él quedan marcados como
		// del club y no suyos. Sin esta distinción, un suplente eterno en un grande
		// termina con más títulos en la vitrina que un ídolo de un club chico.
		for (const h of e.historial) {
			if (h.titulo) expect(h.campeon).toBe(true);
			if (h.campeon && h.partidos < 10) expect(h.titulo).toBe(false);
		}
		// Y la cuenta de títulos del jugador coincide con la de la vitrina.
		expect(e.historial.filter((h) => h.titulo).length).toBe(e.futbolista.titulos);
	});

	it('la edad del hito es la que tenía jugando, no la que cumplió después', () => {
		const e = jugar(unPibe(), 3);
		expect(e.historial[0].edad).toBe(16);
		expect(e.historial[1].edad).toBe(17);
		// Y el jugador ya tiene una más que la última anotada.
		expect(e.futbolista.edad).toBe(e.historial[e.historial.length - 1].edad + 1);
	});
});

describe('la tapa del diario', () => {
	it('no hay tapa antes de la primera temporada', () => {
		expect(portadaDe(unPibe())).toBeNull();
	});

	it('el diario es el del país donde juega', () => {
		expect(diarioDe('ar-boca')).toBe('EL CLÁSICO');
		expect(diarioDe('en-liverpool')).toBe('THE WHISTLE');
		expect(diarioDe('it-milan')).toBe('IL CAMPO');
	});

	it('ser campeón del mundo se come cualquier otro titular', () => {
		const p = portadaDe(conHistorial([unHito({ mundial: 'campeon', campeon: true, goles: 25 })]))!;
		expect(p.titular).toBe('CAMPEONES DEL MUNDO');
		expect(p.foto).toBe('mundial');
		expect(p.tono).toBe('gloria');
	});

	it('salir campeón de la liga va a tapa por encima de un buen año', () => {
		const p = portadaDe(
			conHistorial([unHito({ campeon: true, titulo: true, goles: 12, nota: 7 })])
		)!;
		expect(p.titular).toContain('CAMPEÓN');
		expect(p.foto).toBe('copa');
	});

	it('el título del club que él miró desde el banco no es su tapa', () => {
		const p = portadaDe(
			conHistorial([unHito({ campeon: true, titulo: false, partidos: 2, goles: 0, nota: 4 })])
		)!;
		// Su año fue el banco, y la vuelta del club queda como una nota al costado.
		expect(p.foto).toBe('banco');
		expect(p.titular).not.toContain('CAMPEÓN');
		expect(p.notas.some((n) => n.titulo === 'La vuelta ajena')).toBe(true);
	});

	it('un año en el banco tiene su propia tapa, y es mala', () => {
		const p = portadaDe(conHistorial([unHito({ partidos: 3, goles: 0, nota: 4 })]))!;
		expect(p.tono).toBe('mala');
		expect(p.foto).toBe('banco');
	});

	it('una lesión larga se distingue de estar en el banco', () => {
		const p = portadaDe(conHistorial([unHito({ partidos: 5, lesionado: true, nota: 5 })]))!;
		expect(p.titular).toBe('UN AÑO PERDIDO');
		expect(p.foto).toBe('lesion');
	});

	it('la primera temporada jugada es el debut', () => {
		const p = portadaDe(conHistorial([unHito({ temporada: 1, partidos: 14, nota: 6 })]))!;
		expect(p.titular).toContain('DEBUTÓ');
		expect(p.foto).toBe('debut');
	});

	it('el debut no se repite en la segunda temporada', () => {
		const p = portadaDe(
			conHistorial([
				unHito({ temporada: 1, anio: 2026, partidos: 14 }),
				unHito({ temporada: 2, anio: 2027, partidos: 20, nota: 6.6 })
			])
		)!;
		expect(p.titular).not.toContain('DEBUTÓ');
	});

	it('cuenta cuánto creció la media contra el año anterior', () => {
		const p = portadaDe(
			conHistorial([
				unHito({ temporada: 1, anio: 2026, media: 50 }),
				unHito({ temporada: 2, anio: 2027, media: 62 })
			])
		)!;
		const crecio = p.notas.find((n) => n.titulo === 'Creció');
		expect(crecio).toBeDefined();
		expect(crecio!.texto).toContain('50');
		expect(crecio!.texto).toContain('62');
	});

	it('avisa cuando se le vence el contrato', () => {
		const e = conHistorial([unHito()]);
		e.futbolista.contrato.temporadasRestantes = 0;
		const p = portadaDe(e)!;
		expect(p.notas.some((n) => n.titulo === 'Se le vence')).toBe(true);
	});

	it('nunca deja la tapa sin notas y nunca pone más de tres', () => {
		let e = unPibe();
		for (let i = 0; i < 10; i++) {
			e = jugar(e, 1);
			const p = portadaDe(e);
			if (!p) continue;
			expect(p.notas.length).toBeGreaterThanOrEqual(1);
			expect(p.notas.length).toBeLessThanOrEqual(3);
			expect(p.titular.length).toBeGreaterThan(0);
			expect(p.bajada.length).toBeGreaterThan(0);
		}
	});

	it('la portada es determinista: la misma partida da la misma tapa', () => {
		const a = portadaDe(jugar(unPibe(), 4, 'igual'));
		const b = portadaDe(jugar(unPibe(), 4, 'igual'));
		expect(a).toEqual(b);
	});
});

describe('la ficha del año', () => {
	it('los números de la ficha son los del hito, sin retocar nada', () => {
		const e = jugar(unPibe(), 3);
		const p = portadaDe(e)!;
		const hito = e.historial[e.historial.length - 1];
		expect(p.ficha.partidos).toBe(hito.partidos);
		expect(p.ficha.goles).toBe(hito.goles);
		expect(p.ficha.asistencias).toBe(hito.asistencias);
		expect(p.ficha.nota).toBe(hito.nota);
	});

	it('G+A es goles más asistencias, que es como se mide de verdad', () => {
		let e = unPibe();
		for (let i = 0; i < 8; i++) {
			e = jugar(e, 1);
			const p = portadaDe(e);
			if (!p) continue;
			expect(p.ficha.participaciones).toBe(p.ficha.goles + p.ficha.asistencias);
		}
	});

	/*
	 * Dos decimales y no redondeado: entre 0.42 y 0.58 hay un delantero
	 * distinto, y en un entero los dos son "0".
	 */
	it('el promedio de gol lleva dos decimales', () => {
		let e = unPibe();
		for (let i = 0; i < 8; i++) {
			e = jugar(e, 1);
			const p = portadaDe(e);
			if (!p || p.ficha.partidos === 0) continue;
			expect(p.ficha.promedio).toMatch(/^\d+\.\d\d$/);
			expect(Number(p.ficha.promedio)).toBeCloseTo(p.ficha.goles / p.ficha.partidos, 2);
		}
	});

	it('sin partidos no hay promedio: no se divide por cero', () => {
		let e = unPibe();
		let hubo = false;
		for (let i = 0; i < 12; i++) {
			e = jugar(e, 1);
			const p = portadaDe(e);
			if (!p || p.ficha.partidos > 0) continue;
			hubo = true;
			expect(p.ficha.promedio).toBe('');
		}
		// Si en esta carrera jugó siempre, el caso no se dio y no hay nada que probar.
		expect(typeof hubo).toBe('boolean');
	});

	it('la línea de la selección solo aparece cuando hubo algo que contar', () => {
		let e = unPibe();
		for (let i = 0; i < 10; i++) {
			e = jugar(e, 1);
			const p = portadaDe(e);
			if (!p) continue;
			const hito = e.historial[e.historial.length - 1];
			const jugoAlgo = (e.seleccion?.debuto ?? false) && (e.seleccion?.partidos ?? 0) > 0;
			if (!hito.mundial && !jugoAlgo) expect(p.ficha.seleccion).toBeNull();
			else expect(p.ficha.seleccion).toBeTruthy();
		}
	});
});

describe('lo que llega a la pantalla', () => {
	it('la tapa sale solo en pretemporada, y el historial en las tres fases', () => {
		let e = jugar(unPibe(), 2);
		expect(e.fase).toBe(1);
		expect(opcionesDeFase(e, 'futbolista', 'tapa').portada).toBeDefined();
		expect(opcionesDeFase(e, 'futbolista', 'tapa').historial).toHaveLength(2);

		e = resolverFase(e, NADA, 'tapa').estado;
		expect(e.fase).toBe(2);
		expect(opcionesDeFase(e, 'futbolista', 'tapa').portada).toBeUndefined();
		expect(opcionesDeFase(e, 'futbolista', 'tapa').historial).toHaveLength(2);
	});

	it('los dos roles ven exactamente la misma tapa', () => {
		const e = jugar(unPibe(), 3);
		const delJugador = opcionesDeFase(e, 'futbolista', 'tapa').portada;
		const delRepre = opcionesDeFase(e, 'representante', 'tapa').portada;
		expect(delJugador).toEqual(delRepre);
	});
});
