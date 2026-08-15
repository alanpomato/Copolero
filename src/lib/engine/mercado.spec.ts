import { describe, expect, it } from 'vitest';
import { clubes, contexto, jugadores, personas, salarioTipico } from '../../../content/mundo';
import {
	MUNDO_SIN_CAMBIOS,
	clubActual,
	estaRetirado,
	simularMercado,
	titulares,
	type CambiosMundo
} from './mercado';

/** Una temporada de mercado con la semilla que se le pase. */
function unaTemporada(semilla: string, anio = 2027) {
	return simularMercado(MUNDO_SIN_CAMBIOS, semilla, 1, anio);
}

/** Corre `cuantas` temporadas seguidas y devuelve el estado final del mundo. */
function correr(semilla: string, cuantas: number, anioInicial = 2027) {
	let cambios: CambiosMundo = MUNDO_SIN_CAMBIOS;
	const todos = [];
	for (let t = 0; t < cuantas; t++) {
		const paso = simularMercado(cambios, semilla, t + 1, anioInicial + t);
		cambios = paso.cambios;
		todos.push(...paso.movimientos);
	}
	return { cambios, movimientos: todos };
}

describe('el mercado es determinista', () => {
	it('la misma semilla da exactamente los mismos pases', () => {
		const a = unaTemporada('semilla-fija');
		const b = unaTemporada('semilla-fija');
		expect(a.movimientos).toEqual(b.movimientos);
		expect(a.cambios).toEqual(b.cambios);
	});

	it('semillas distintas dan mercados distintos', () => {
		const a = unaTemporada('una');
		const b = unaTemporada('otra');
		expect(a.movimientos).not.toEqual(b.movimientos);
	});

	it('no toca los cambios que recibe', () => {
		const antes: CambiosMundo = { movidos: { 'jg-messi': 'ar-boca' } };
		const copia = structuredClone(antes);
		simularMercado(antes, 's', 1, 2027);
		expect(antes).toEqual(copia);
	});
});

describe('los movimientos son creíbles', () => {
	it('todos van a un club que existe, o a ningún lado', () => {
		const { movimientos } = correr('creible', 5);
		const ids = new Set(clubes.map((c) => c.id));
		for (const m of movimientos) {
			if (m.hacia !== null) expect(ids.has(m.hacia), `${m.nombre} → ${m.hacia}`).toBe(true);
			expect(m.hacia).not.toBe(m.desde);
		}
	});

	it('nadie termina en dos clubes a la vez', () => {
		const { cambios } = correr('creible', 5);
		for (const persona of personas) {
			const donde = clubActual(persona, cambios);
			if (donde !== null) expect(() => contexto(donde)).not.toThrow();
		}
	});

	it('cada movimiento trae un texto listo para mostrar', () => {
		const { movimientos } = correr('texto', 3);
		expect(movimientos.length).toBeGreaterThan(0);
		for (const m of movimientos) {
			expect(m.texto).toContain(m.nombre);
			expect(m.texto.endsWith('.')).toBe(true);
		}
	});
});

describe('el paso del tiempo', () => {
	it('el que se retira no vuelve a aparecer', () => {
		const { cambios, movimientos } = correr('retiros', 8);
		const retirados = movimientos.filter((m) => m.tipo === 'retiro');
		expect(retirados.length).toBeGreaterThan(0);

		for (const m of retirados) {
			const persona = personas.find((p) => p.id === m.personaId)!;
			expect(estaRetirado(persona, cambios), `${m.nombre} volvió después de retirarse`).toBe(true);
		}
		// Y no se retiró dos veces.
		const ids = retirados.map((m) => m.personaId);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('en veinte temporadas se retira casi toda la foto original', () => {
		const { cambios } = correr('veinte', 20);
		const siguenActivos = personas.filter((p) => !estaRetirado(p, cambios));
		expect(siguenActivos.length).toBeLessThan(personas.length * 0.35);
	});

	it('nadie se retira antes de los 33', () => {
		const anioInicial = 2027;
		let cambios: CambiosMundo = MUNDO_SIN_CAMBIOS;
		for (let t = 0; t < 6; t++) {
			const anio = anioInicial + t;
			const paso = simularMercado(cambios, 'jovenes', t + 1, anio);
			cambios = paso.cambios;
			for (const m of paso.movimientos) {
				if (m.tipo !== 'retiro') continue;
				const persona = personas.find((p) => p.id === m.personaId)!;
				expect(anio - persona.nacimiento, m.nombre).toBeGreaterThanOrEqual(33);
			}
		}
	});
});

describe('la lógica del mercado', () => {
	/** Junta un mercado grande promediando muchas semillas. */
	function muestra(cuantas = 40) {
		const movimientos = [];
		for (let i = 0; i < cuantas; i++) {
			movimientos.push(...unaTemporada(`muestra-${i}`).movimientos);
		}
		return movimientos;
	}

	it('a los técnicos los mueven mucho más que a los jugadores', () => {
		const movimientos = muestra();
		const bancos = movimientos.filter((m) => m.tipo === 'cambio_de_banco').length;
		const pases = movimientos.filter((m) => m.tipo === 'pase').length;

		// Hay bastantes más jugadores que DT en la foto, así que la comparación
		// justa es por tasa, no por total.
		const tasaBancos = bancos / personas.filter((p) => !('posicion' in p)).length;
		const tasaPases = pases / jugadores.length;
		expect(tasaBancos).toBeGreaterThan(tasaPases);
	});

	it('los pibes suben y los veteranos bajan', () => {
		const anio = 2027;
		const movimientos = muestra().filter((m) => m.tipo === 'pase' && m.desde && m.hacia);

		// La vara es el sueldo, no el prestigio del escudo: irse de River a un club
		// mediano de España es bajar de escudo y subir de carrera, y lo que el
		// futbolista y el representante miran es lo segundo.
		const salto = (m: (typeof movimientos)[number]) =>
			Math.log(salarioTipico(m.hacia!, 70) / salarioTipico(m.desde!, 70));
		const edadDe = (id: string) => anio - personas.find((p) => p.id === id)!.nacimiento;

		const pibes = movimientos.filter((m) => edadDe(m.personaId) <= 26).map(salto);
		const viejos = movimientos.filter((m) => edadDe(m.personaId) >= 33).map(salto);

		expect(pibes.length).toBeGreaterThan(10);
		expect(viejos.length).toBeGreaterThan(5);

		const promedio = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
		expect(promedio(pibes)).toBeGreaterThan(0);
		expect(promedio(viejos)).toBeLessThan(0);
	});

	it('un veterano no vuelve a una liga mucho más fuerte de la que está', () => {
		const anio = 2027;
		for (const m of muestra().filter((m) => m.tipo === 'pase' && m.desde && m.hacia)) {
			const edad = anio - personas.find((p) => p.id === m.personaId)!.nacimiento;
			if (edad < 32) continue;
			const antes = contexto(m.desde!).liga.fuerza;
			const despues = contexto(m.hacia!).liga.fuerza;
			expect(despues, `${m.nombre} a los ${edad}`).toBeLessThanOrEqual(antes + 5);
		}
	});

	it('nadie salta a un club mucho más grande de lo que su nombre da', () => {
		for (const m of muestra().filter((m) => m.hacia !== null)) {
			const persona = personas.find((p) => p.id === m.personaId)!;
			expect(contexto(m.hacia!).club.prestigio, m.nombre).toBeLessThanOrEqual(persona.fama + 18);
		}
	});
});

describe('los titulares del mercado', () => {
	it('trae primero a los más conocidos', () => {
		const { movimientos } = unaTemporada('titulares');
		const top = titulares(movimientos, 3);
		expect(top.length).toBeLessThanOrEqual(3);

		const fama = (id: string) => personas.find((p) => p.id === id)!.fama;
		const restoMasFamoso = Math.max(
			0,
			...movimientos.filter((m) => !top.includes(m)).map((m) => fama(m.personaId))
		);
		for (const m of top) {
			expect(fama(m.personaId)).toBeGreaterThanOrEqual(restoMasFamoso);
		}
	});

	it('con un mercado vacío no rompe', () => {
		expect(titulares([], 4)).toEqual([]);
	});
});
