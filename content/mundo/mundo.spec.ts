import { describe, expect, it } from 'vitest';
import {
	arqueroDe,
	club,
	clubes,
	clubesDe,
	contexto,
	directoresTecnicos,
	dtDe,
	famosos,
	jugadores,
	ligas,
	mundo,
	paises,
	salarioTipico
} from './index';

describe('el mundo carga y es consistente', () => {
	it('valida sin errores al importarse', () => {
		expect(mundo.paises.length).toBeGreaterThan(0);
	});

	it('tiene los países pedidos', () => {
		const esperados = [
			'ar',
			'br',
			'uy',
			'cl',
			'mx',
			'es',
			'it',
			'fr',
			'de',
			'pt',
			'nl',
			'tr',
			'en'
		];
		for (const id of esperados) {
			expect(paises.map((p) => p.id)).toContain(id);
		}
	});

	it('cada club apunta a una liga que existe', () => {
		const ids = new Set(ligas.map((l) => l.id));
		for (const c of clubes) {
			expect(ids.has(c.ligaId), `${c.nombre} apunta a ${c.ligaId}`).toBe(true);
		}
	});

	it('cada liga tiene una cantidad razonable de clubes', () => {
		for (const l of ligas) {
			expect(clubesDe(l.id).length, l.nombre).toBeGreaterThanOrEqual(16);
		}
	});

	it('no hay ids repetidos', () => {
		expect(new Set(clubes.map((c) => c.id)).size).toBe(clubes.length);
		expect(new Set(ligas.map((l) => l.id)).size).toBe(ligas.length);
	});

	it('tiene el Ascenso argentino, que es donde arranca la carrera', () => {
		const ascenso = ligas.find((l) => l.id === 'ar-2')!;
		expect(ascenso.nivel).toBe(2);
		expect(clubesDe('ar-2').length).toBeGreaterThanOrEqual(16);
	});
});

describe('la escalera de la carrera', () => {
	it('cada escalón paga más que el anterior', () => {
		const indice = (id: string) => ligas.find((l) => l.id === id)!.indiceDinero;

		expect(indice('ar-2')).toBeLessThan(indice('ar-1'));
		expect(indice('ar-1')).toBeLessThan(indice('br-1'));
		expect(indice('br-1')).toBeLessThan(indice('es-1'));
	});

	it('las ligas europeas grandes se juegan más fuerte que el Ascenso', () => {
		const fuerza = (id: string) => ligas.find((l) => l.id === id)!.fuerza;
		expect(fuerza('es-1')).toBeGreaterThan(fuerza('ar-1'));
		expect(fuerza('ar-1')).toBeGreaterThan(fuerza('ar-2'));
	});

	it('el mismo jugador cobra mucho más en Europa que en el Ascenso', () => {
		const enElAscenso = salarioTipico('ar2-moron', 60);
		const enPrimera = salarioTipico('ar-river', 60);
		const enEuropa = salarioTipico('es-realmadrid', 60);

		expect(enPrimera).toBeGreaterThan(enElAscenso * 2);
		expect(enEuropa).toBeGreaterThan(enPrimera * 5);
	});

	it('un jugador mejor cobra más en el mismo club', () => {
		expect(salarioTipico('ar-river', 80)).toBeGreaterThan(salarioTipico('ar-river', 55));
	});

	it('el primer contrato del Ascenso da para vivir, y poco más', () => {
		const sueldo = salarioTipico('ar2-tristansuarez', 40);
		expect(sueldo).toBeGreaterThan(700);
		expect(sueldo).toBeLessThan(2500);
	});

	it('una figura de una liga grande cobra una fortuna', () => {
		const sueldo = salarioTipico('es-realmadrid', 85);
		expect(sueldo).toBeGreaterThan(150_000);
		expect(sueldo).toBeLessThan(700_000);
	});
});

describe('la gente', () => {
	it('todos los DT y jugadores están en un club que existe, o en una selección', () => {
		const ids = new Set(clubes.map((c) => c.id));
		for (const p of [...directoresTecnicos, ...jugadores]) {
			if (p.clubId === null) {
				expect(p.seleccion, p.nombre).toBeTruthy();
			} else {
				expect(ids.has(p.clubId), `${p.nombre} en ${p.clubId}`).toBe(true);
			}
		}
	});

	it('encuentra al DT de un club', () => {
		expect(dtDe('en-mancity')?.nombre).toBe('Pep Guardiola');
		expect(dtDe('ar-river')?.nombre).toBe('Marcelo Gallardo');
	});

	it('encuentra al arquero de un club, que es a quien le hacés el gol', () => {
		expect(arqueroDe('en-astonvilla')?.nombre).toBe('Emiliano Martínez');
		expect(arqueroDe('es-realmadrid')?.nombre).toBe('Thibaut Courtois');
	});

	it('hay arqueros repartidos por varias ligas', () => {
		const ligasConArquero = new Set(
			jugadores
				.filter((p) => p.posicion === 'arquero')
				.map((p) => club(p.clubId!).ligaId)
				.map((ligaId) => ligas.find((l) => l.id === ligaId)!.paisId)
		);
		expect(ligasConArquero.size).toBeGreaterThanOrEqual(5);
	});

	it('los famosos son gente que cualquiera reconoce', () => {
		const nombres = famosos(90).map((p) => p.nombre);
		expect(nombres).toContain('Kylian Mbappé');
		expect(nombres).toContain('Pep Guardiola');
		expect(nombres.length).toBeGreaterThan(10);
	});

	it('nadie nació en el futuro ni es imposiblemente viejo', () => {
		for (const p of [...directoresTecnicos, ...jugadores]) {
			expect(p.nacimiento, p.nombre).toBeGreaterThan(1940);
			expect(p.nacimiento, p.nombre).toBeLessThan(2012);
		}
	});
});

describe('el contexto de un club', () => {
	it('devuelve club, liga y país juntos', () => {
		const { club: c, liga: l, pais: p } = contexto('ar-boca');
		expect(c.nombre).toBe('Boca Juniors');
		expect(l.nombre).toBe('Liga Profesional');
		expect(p.nombre).toBe('Argentina');
	});
});
