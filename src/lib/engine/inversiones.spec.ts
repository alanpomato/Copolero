import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { resolverFase } from './fases';
import {
	INVERSIONES,
	NADA,
	cobrarMantenimiento,
	comprar,
	gastoAnual,
	ingresoAnual,
	loQuePuedeComprar,
	loQueTiene,
	precioDe
} from './inversiones';
import { opcionesDeFase } from './pantalla';
import { rngPara } from './rng';
import type { Decision, Estado } from './tipos';

function unaPartida(): Estado {
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
		rngPara('inv', { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

/** Con plata en el bolsillo de los dos, para poder comprar. */
function conPlata(): Estado {
	const e = unaPartida();
	e.futbolista.dineroUsd = 2_000_000;
	e.representante.dineroUsd = 500_000;
	return e;
}

describe('el catálogo', () => {
	it('cada inversión es de un rol y dice qué hace', () => {
		for (const i of INVERSIONES) {
			expect(['futbolista', 'representante']).toContain(i.de);
			expect(i.peso).toBeGreaterThanOrEqual(1);
			expect(i.peso).toBeLessThanOrEqual(5);
			expect(i.efecto.length).toBeGreaterThan(10);
			expect(i.detalle.length).toBeGreaterThan(10);
		}
	});

	it('cada uno ve solo lo suyo', () => {
		const e = conPlata();
		for (const i of loQuePuedeComprar(e, 'futbolista')) expect(i.de).toBe('futbolista');
		for (const i of loQuePuedeComprar(e, 'representante')) expect(i.de).toBe('representante');
	});

	it('el precio sale de lo que gana, no es un número fijo', () => {
		// Es lo que hace que la decisión pese igual a los 16 que a los 28. Con un
		// precio fijo, o es imposible de joven o es calderilla de grande.
		const pobre = unaPartida();
		const rico = unaPartida();
		rico.futbolista.contrato.salarioMensual = pobre.futbolista.contrato.salarioMensual * 50;

		const item = INVERSIONES.find((i) => i.de === 'futbolista')!;
		expect(precioDe(rico, item)).toBeGreaterThan(precioDe(pobre, item) * 10);
		expect(ingresoAnual(rico, 'futbolista')).toBeGreaterThan(ingresoAnual(pobre, 'futbolista'));
	});
});

describe('comprar', () => {
	it('cobra el precio y aplica lo suyo', () => {
		const e = conPlata();
		const item = loQuePuedeComprar(e, 'representante').find((i) => i.id === 'abogado')!;
		const antesPlata = e.representante.dineroUsd;
		const antesNegociacion = e.representante.atributos.negociacion;

		const linea = comprar(e, 'representante', 'abogado');

		expect(linea).not.toBeNull();
		expect(e.representante.dineroUsd).toBe(antesPlata - item.precioUsd);
		expect(e.representante.atributos.negociacion).toBeGreaterThan(antesNegociacion);
		expect(loQueTiene(e, 'representante').map((i) => i.id)).toContain('abogado');
	});

	it('no se puede comprar dos veces', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'psicologo');
		const plata = e.futbolista.dineroUsd;

		expect(comprar(e, 'futbolista', 'psicologo')).toBeNull();
		expect(e.futbolista.dineroUsd).toBe(plata);
		expect(loQuePuedeComprar(e, 'futbolista').map((i) => i.id)).not.toContain('psicologo');
	});

	it('no se puede comprar lo del otro rol', () => {
		const e = conPlata();
		expect(comprar(e, 'futbolista', 'abogado')).toBeNull();
		expect(comprar(e, 'representante', 'psicologo')).toBeNull();
	});

	it('sin plata no se compra, y no queda debiendo', () => {
		const e = unaPartida();
		e.futbolista.dineroUsd = 100;
		expect(comprar(e, 'futbolista', 'casa')).toBeNull();
		expect(e.futbolista.dineroUsd).toBe(100);
	});

	it('no comprar nada es una opción y no rompe nada', () => {
		const e = conPlata();
		const plata = e.futbolista.dineroUsd;
		expect(comprar(e, 'futbolista', NADA)).toBeNull();
		expect(comprar(e, 'futbolista', undefined)).toBeNull();
		expect(e.futbolista.dineroUsd).toBe(plata);
	});
});

describe('sostenerlo todos los años', () => {
	it('el gasto anual se cobra y se siente', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'preparador');
		const gasto = gastoAnual(e, 'futbolista');
		expect(gasto).toBeGreaterThan(0);

		const antes = e.futbolista.dineroUsd;
		cobrarMantenimiento(e);
		expect(e.futbolista.dineroUsd).toBe(antes - gasto);
	});

	it('el que no puede pagar lo pierde', () => {
		// Es la mitad de la gracia de tener plata: que se pueda dejar de tener.
		const e = conPlata();
		comprar(e, 'futbolista', 'analista');
		expect(loQueTiene(e, 'futbolista')).toHaveLength(1);

		e.futbolista.dineroUsd = 0;
		const lineas = cobrarMantenimiento(e);

		expect(loQueTiene(e, 'futbolista')).toHaveLength(0);
		expect(lineas.some((l) => l.visiblePara === 'futbolista')).toBe(true);
		expect(e.futbolista.dineroUsd).toBe(0);
	});

	it('el gasto queda fijado al sueldo del día que compró', () => {
		// El que se llena de gastos en su mejor año no los sostiene cuando el
		// sueldo baja. Si el gasto siguiera al sueldo, eso nunca pasaría.
		const e = conPlata();
		e.futbolista.contrato.salarioMensual = 400_000;
		comprar(e, 'futbolista', 'casa');
		const caro = gastoAnual(e, 'futbolista');

		e.futbolista.contrato.salarioMensual = 3_000;
		expect(gastoAnual(e, 'futbolista')).toBe(caro);
	});
});

describe('los consumibles', () => {
	it('se pagan una vez y no dejan gasto anual', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'botines');
		expect(gastoAnual(e, 'futbolista')).toBe(0);
		expect(loQueTiene(e, 'futbolista')).toHaveLength(1);
	});

	it('duran lo que dicen y después se van solos', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'fisio'); // dura 2

		cobrarMantenimiento(e);
		expect(loQueTiene(e, 'futbolista'), 'después de una temporada sigue').toHaveLength(1);

		const lineas = cobrarMantenimiento(e);
		expect(loQueTiene(e, 'futbolista'), 'después de dos se terminó').toHaveLength(0);
		expect(lineas.some((l) => l.texto.includes('terminaron'))).toBe(true);
	});

	it('el que dura una temporada se va en el primer cierre', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'botines');
		cobrarMantenimiento(e);
		expect(loQueTiene(e, 'futbolista')).toHaveLength(0);
	});

	it('un consumible gastado se puede volver a comprar', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'botines');
		cobrarMantenimiento(e);
		expect(loQuePuedeComprar(e, 'futbolista').map((i) => i.id)).toContain('botines');
	});

	it('y sin plata no se pierde, porque no se paga', () => {
		const e = conPlata();
		comprar(e, 'futbolista', 'fisio');
		e.futbolista.dineroUsd = 0;
		cobrarMantenimiento(e);
		// Sigue teniéndolo: ya lo pagó.
		expect(loQueTiene(e, 'futbolista')).toHaveLength(1);
	});
});

describe('en una partida de verdad', () => {
	it('se compra en la pretemporada y queda en el diario del que compró', () => {
		const e = conPlata();
		const decisiones: Decision[] = [
			{ rol: 'futbolista', nota: '', inversion: 'nutricionista' },
			{ rol: 'representante', nota: '', inversion: 'oficina' }
		];
		const { estado, log } = resolverFase(e, decisiones, 'inv');

		expect(estado.inversiones.futbolista.map((c) => c.id)).toContain('nutricionista');
		expect(estado.inversiones.representante.map((c) => c.id)).toContain('oficina');

		// Cada uno se entera de lo suyo: no es una decisión compartida.
		const delFutbolista = log.filter(
			(l) => l.tipo === 'inversion' && l.visiblePara === 'futbolista'
		);
		const delRepre = log.filter((l) => l.tipo === 'inversion' && l.visiblePara === 'representante');
		expect(delFutbolista).toHaveLength(1);
		expect(delRepre).toHaveLength(1);
	});

	it('llega a la pantalla en pretemporada y con los números de hoy', () => {
		const e = conPlata();
		const suyas = opcionesDeFase(e, 'futbolista', 'inv').inversiones!;
		expect(suyas.puedeComprar.length).toBeGreaterThan(2);
		expect(suyas.plataUsd).toBe(e.futbolista.dineroUsd);
		for (const i of suyas.puedeComprar) {
			expect(i.precioUsd).toBeGreaterThan(0);
			// Los consumibles se pagan una vez y se gastan; el staff se mantiene.
			if (i.dura) expect(i.porTemporadaUsd).toBe(0);
			else expect(i.porTemporadaUsd).toBeGreaterThan(0);
		}

		// En la temporada no se compra: es una decisión de armar el año.
		e.fase = 2;
		expect(opcionesDeFase(e, 'futbolista', 'inv').inversiones).toBeUndefined();
	});

	it('una carrera entera con todo comprado no rompe nada ni deja plata negativa', () => {
		let e = unaPartida();
		let vueltas = 0;
		while (!e.carreraTerminada && vueltas < 30) {
			for (let f = 0; f < 3; f++) {
				const puede = f === 0 ? loQuePuedeComprar(e, 'futbolista')[0]?.id : undefined;
				e = resolverFase(
					e,
					[
						{ rol: 'futbolista', nota: '', inversion: puede },
						{
							rol: 'representante',
							nota: '',
							inversion: loQuePuedeComprar(e, 'representante')[0]?.id
						}
					],
					'inv'
				).estado;
			}
			expect(e.futbolista.dineroUsd).toBeGreaterThanOrEqual(0);
			expect(e.representante.dineroUsd).toBeGreaterThanOrEqual(0);
			vueltas++;
		}
		expect(e.carreraTerminada).toBe(true);
	});
});
