import { describe, expect, it } from 'vitest';
import { EVENTOS, aplicarEvento, eventosDeLaTemporada } from './eventos';
import { estadoInicial } from './estado';
import { rngPara } from './rng';
import type { Estado } from './tipos';

function unEstado(): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto: 'centrodelantero',
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar2-moron'
			},
			representante: { nombre: 'Alan' }
		},
		rngPara('eventos', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

describe('los eventos', () => {
	it('todos tienen texto que termina en punto', () => {
		const estado = unEstado();
		const rng = rngPara('x', { temporada: 1, fase: 2, clave: 'y' });
		for (const ev of EVENTOS) {
			const { texto } = ev.contar(estado, rng);
			expect(texto.length, ev.id).toBeGreaterThan(20);
			expect(texto.endsWith('.'), ev.id).toBe(true);
		}
	});

	it('no hay ids repetidos', () => {
		expect(new Set(EVENTOS.map((e) => e.id)).size).toBe(EVENTOS.length);
	});

	it('la misma semilla da los mismos eventos', () => {
		const estado = unEstado();
		expect(eventosDeLaTemporada(estado, 's')).toEqual(eventosDeLaTemporada(estado, 's'));
	});

	it('no repite el mismo evento en una temporada', () => {
		for (const semilla of ['a', 'b', 'c', 'd', 'e']) {
			const salieron = eventosDeLaTemporada(unEstado(), semilla);
			expect(new Set(salieron.map((e) => e.id)).size).toBe(salieron.length);
		}
	});

	it('a un pibe sano de 16 no se le va la rodilla', () => {
		const estado = unEstado();
		expect(estado.futbolista.desgaste).toBeLessThan(35);
		for (const semilla of ['a', 'b', 'c', 'd', 'e', 'f']) {
			const ids = eventosDeLaTemporada(estado, semilla).map((e) => e.id);
			expect(ids, semilla).not.toContain('rodilla');
			expect(ids, semilla).not.toContain('el-cuerpo-avisa');
		}
	});

	it('no lo llaman a la selección si no se lo ganó', () => {
		const estado = unEstado();
		for (const semilla of ['a', 'b', 'c', 'd', 'e', 'f']) {
			expect(eventosDeLaTemporada(estado, semilla).map((e) => e.id)).not.toContain('seleccion');
		}
	});

	it('con media y fama sí puede aparecer la selección', () => {
		const estado = unEstado();
		estado.futbolista.fama = 80;
		for (const clave of Object.keys(estado.futbolista.atributos)) {
			estado.futbolista.atributos[clave as keyof typeof estado.futbolista.atributos] = 80;
		}
		const salio = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].some((s) =>
			eventosDeLaTemporada(estado, s).some((e) => e.id === 'seleccion')
		);
		expect(salio).toBe(true);
	});

	it('el representante ausente es cosa que solo ve el futbolista', () => {
		const evento = EVENTOS.find((e) => e.id === 'el-representante-desaparece')!;
		const estado = unEstado();
		estado.confianza = 20;
		const rng = rngPara('x', { temporada: 1, fase: 2, clave: 'y' });
		expect(evento.contar(estado, rng).visiblePara).toBe('futbolista');
	});

	it('aplicar un evento no saca nada de rango', () => {
		const estado = unEstado();
		aplicarEvento(estado, {
			desgaste: 500,
			moral: -500,
			fama: 500,
			dt: -500,
			confianza: 500,
			atributos: { velocidad: -500, pase: 500 }
		});
		expect(estado.futbolista.desgaste).toBe(100);
		expect(estado.futbolista.moral).toBe(0);
		expect(estado.futbolista.fama).toBe(100);
		expect(estado.futbolista.dt).toBe(-100);
		expect(estado.confianza).toBe(100);
		expect(estado.futbolista.atributos.velocidad).toBe(1);
		expect(estado.futbolista.atributos.pase).toBe(99);
	});

	it('un atributo que no existe no rompe nada', () => {
		const estado = unEstado();
		const antes = structuredClone(estado.futbolista.atributos);
		aplicarEvento(estado, { atributos: { carisma: 10 } });
		expect(estado.futbolista.atributos).toEqual(antes);
	});
});
