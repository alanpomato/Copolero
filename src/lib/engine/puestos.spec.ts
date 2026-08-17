import { describe, expect, it } from 'vitest';
import { atributosIniciales, estadoInicial, media } from './estado';
import { rngPara } from './rng';
import {
	ATRIBUTOS,
	PIES,
	PUESTOS,
	PUNTOS_A_REPARTIR,
	TOPE_POR_ATRIBUTO,
	esPuestoValido,
	puesto,
	repartoValido,
	ventajaDePie,
	type Pie
} from './puestos';

function unPibe(puestoId: string, pie: Pie = 'derecho', reparto = {}) {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: puestoId,
				numero: puesto(puestoId).numero,
				pie,
				edadInicial: 16,
				clubId: 'ar2-moron',
				reparto
			},
			representante: { nombre: 'Alan' }
		},
		rngPara('semilla', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

describe('los puestos', () => {
	it('los once tienen todo lo que hace falta', () => {
		for (const p of PUESTOS) {
			expect(p.nombre.length, p.id).toBeGreaterThan(3);
			expect(p.detalle.endsWith('.'), p.id).toBe(true);
			expect(p.numero, p.id).toBeGreaterThanOrEqual(1);
			expect(p.numero, p.id).toBeLessThanOrEqual(11);
			expect(Object.keys(p.sesgo).length, p.id).toBeGreaterThan(0);
			for (const clave of Object.keys(p.sesgo)) {
				expect(ATRIBUTOS, `${p.id} sesga ${clave}`).toContain(clave);
			}
		}
	});

	it('hay puestos de las cuatro líneas', () => {
		const posiciones = new Set(PUESTOS.map((p) => p.posicion));
		expect(posiciones).toEqual(new Set(['arquero', 'defensor', 'mediocampista', 'delantero']));
	});

	it('no hay ids repetidos', () => {
		expect(new Set(PUESTOS.map((p) => p.id)).size).toBe(PUESTOS.length);
	});

	it('un puesto que no existe cae en el de por defecto en vez de romper', () => {
		expect(esPuestoValido('wing-back-inverso')).toBe(false);
		expect(puesto('wing-back-inverso').id).toBe('centrodelantero');
	});
});

describe('el pie', () => {
	it('el zurdo rinde por la izquierda y el diestro por la derecha', () => {
		// Los puestos de banda ya no tienen un lado fijo —el lateral y el extremo
		// son uno solo—, así que el pie no penaliza: premia al zurdo, que escasea.
		const deBanda = puesto('lateral');
		expect(ventajaDePie(deBanda, 'izquierdo')).toBeGreaterThan(0);
		expect(ventajaDePie(deBanda, 'derecho')).toBe(0);
		expect(ventajaDePie(puesto('central'), 'izquierdo')).toBe(0);
	});

	it('en el medio de la cancha el pie no cambia nada', () => {
		expect(ventajaDePie(puesto('cinco'), 'izquierdo')).toBe(0);
		expect(ventajaDePie(puesto('cinco'), 'derecho')).toBe(0);
	});

	it('el ambidiestro suma en cualquier puesto', () => {
		for (const p of PUESTOS) {
			expect(ventajaDePie(p, 'ambos'), p.id).toBeGreaterThan(0);
		}
	});

	it('los tres pies se pueden elegir', () => {
		expect(PIES.map((p) => p.id)).toEqual(['derecho', 'izquierdo', 'ambos']);
	});
});

describe('el reparto de puntos', () => {
	it('no deja gastar más de los que hay', () => {
		const pedido = Object.fromEntries(ATRIBUTOS.map((a) => [a, TOPE_POR_ATRIBUTO]));
		const { gastados } = repartoValido(pedido);
		expect(gastados).toBe(PUNTOS_A_REPARTIR);
	});

	it('no deja pasarse del tope por atributo', () => {
		const { reparto } = repartoValido({ definicion: 99 });
		expect(reparto.definicion).toBe(TOPE_POR_ATRIBUTO);
	});

	it('los negativos y la basura valen cero', () => {
		const { reparto, gastados } = repartoValido({
			definicion: -8,
			pase: Number.NaN,
			regate: 2.7
		} as Record<string, number>);
		expect(reparto.definicion).toBe(0);
		expect(reparto.pase).toBe(0);
		expect(reparto.regate).toBe(2);
		expect(gastados).toBe(2);
	});

	it('lo que se reparte llega al pibe', () => {
		const semilla = rngPara('igual', { temporada: 0, fase: 1, clave: 'inicio' });
		const sin = atributosIniciales(semilla, 'enganche', 'derecho');

		const otra = rngPara('igual', { temporada: 0, fase: 1, clave: 'inicio' });
		const con = atributosIniciales(otra, 'enganche', 'derecho', { pase: 5 });

		expect(con.pase).toBe(sin.pase + 5);
		expect(con.regate).toBe(sin.regate);
	});
});

describe('el pibe que sale', () => {
	it('el puesto define la posición con la que trabaja el motor', () => {
		expect(unPibe('lateral').futbolista.posicion).toBe('defensor');
		expect(unPibe('enganche').futbolista.posicion).toBe('mediocampista');
		expect(unPibe('arquero').futbolista.posicion).toBe('arquero');
	});

	it('se guarda el puesto, el número y el pie', () => {
		const { futbolista } = unPibe('extremo', 'izquierdo');
		expect(futbolista.puesto).toBe('extremo');
		expect(futbolista.numero).toBe(7);
		expect(futbolista.pie).toBe('izquierdo');
	});

	it('cada puesto nace mejor en lo suyo', () => {
		expect(unPibe('centrodelantero').futbolista.atributos.definicion).toBeGreaterThan(
			unPibe('central').futbolista.atributos.definicion
		);
		expect(unPibe('central').futbolista.atributos.defensa).toBeGreaterThan(
			unPibe('centrodelantero').futbolista.atributos.defensa
		);
		expect(unPibe('enganche').futbolista.atributos.pase).toBeGreaterThan(
			unPibe('centrodelantero').futbolista.atributos.pase
		);
	});

	it('ningún puesto arranca roto de media', () => {
		for (const p of PUESTOS) {
			const { futbolista } = unPibe(p.id);
			const suMedia = media(futbolista.atributos, futbolista.posicion);
			expect(suMedia, p.nombre).toBeGreaterThan(30);
			expect(suMedia, p.nombre).toBeLessThan(62);
		}
	});

	it('ningún atributo se va de rango al crear', () => {
		for (const p of PUESTOS) {
			const reparto = Object.fromEntries(ATRIBUTOS.map((a) => [a, TOPE_POR_ATRIBUTO]));
			const { futbolista } = unPibe(p.id, 'ambos', reparto);
			for (const atributo of ATRIBUTOS) {
				expect(futbolista.atributos[atributo], `${p.id}.${atributo}`).toBeGreaterThanOrEqual(1);
				expect(futbolista.atributos[atributo], `${p.id}.${atributo}`).toBeLessThanOrEqual(70);
			}
		}
	});
});
