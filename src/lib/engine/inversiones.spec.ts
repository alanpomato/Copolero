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
			// Un consumible suelto se paga una vez y se gasta; el staff y el
			// consumible atado se mantienen todos los años.
			if (i.dura && i.modo !== 'fijar') expect(i.porTemporadaUsd).toBe(0);
			else expect(i.porTemporadaUsd).toBeGreaterThan(0);
		}

		// En la temporada no se compra: es una decisión de armar el año.
		e.fase = 2;
		expect(opcionesDeFase(e, 'futbolista', 'inv').inversiones).toBeUndefined();
	});

	it('una carrera entera con todo comprado no rompe nada ni deja plata negativa', () => {
		/*
		 * Se avanza fase por fase y no de a tres.
		 *
		 * Antes el bucle de adentro contaba `for (f = 0; f < 3; f++)` dando por
		 * hecho que una temporada eran tres resoluciones. Dejó de serlo cuando el
		 * mercado pasó a jugarse en dos tiempos —el representante filtra, el
		 * futbolista elige— y el test empezó a pedirle una fase de más a una
		 * carrera ya terminada. Preguntar en qué fase está no se rompe cuando
		 * cambia el calendario.
		 */
		let e = unaPartida();
		let pasos = 0;
		while (!e.carreraTerminada && pasos < 120) {
			const enPretemporada = e.fase === 1;
			e = resolverFase(
				e,
				[
					{
						rol: 'futbolista',
						nota: '',
						inversion: enPretemporada ? loQuePuedeComprar(e, 'futbolista')[0]?.id : undefined
					},
					{
						rol: 'representante',
						nota: '',
						inversion: enPretemporada ? loQuePuedeComprar(e, 'representante')[0]?.id : undefined
					}
				],
				'inv'
			).estado;
			expect(e.futbolista.dineroUsd).toBeGreaterThanOrEqual(0);
			expect(e.representante.dineroUsd).toBeGreaterThanOrEqual(0);
			pasos++;
		}
		expect(e.carreraTerminada).toBe(true);
	});
});

describe('comprar varias en el mismo año', () => {
	/**
	 * Antes era una sola por temporada, así que armar el equipo propio llevaba
	 * una carrera entera. Hernán lo dijo jugando: "solo puedo comprar un
	 * consumible por temporada". La plata sigue siendo el límite; el almanaque
	 * no tiene por qué serlo.
	 */
	function conPlata(cuanta: number): Estado {
		const e = unaPartida();
		e.futbolista.dineroUsd = cuanta;
		e.futbolista.contrato.salarioMensual = 5_000;
		return e;
	}

	it('entran las dos si alcanza para las dos', () => {
		const e = conPlata(500_000);
		// Dos artículos distintos: la vidriera trae varios renglones del mismo —
		// comprarlo suelto y atarlo para siempre— y comprar el segundo del mismo
		// no es comprar dos cosas.
		const nuevas = loQuePuedeComprar(e, 'futbolista').filter((i) => i.modo === 'comprar');
		const a = nuevas[0];
		const b = nuevas.find((i) => i.id !== a.id)!;

		expect(comprar(e, 'futbolista', a.pedido)).not.toBeNull();
		expect(comprar(e, 'futbolista', b.pedido)).not.toBeNull();

		const tiene = loQueTiene(e, 'futbolista').map((i) => i.id);
		expect(tiene).toContain(a.id);
		expect(tiene).toContain(b.id);
	});

	it('y si alcanza para una sola, entra la primera y la segunda no', () => {
		const e = conPlata(500_000);
		const nuevas = loQuePuedeComprar(e, 'futbolista').filter((i) => i.modo === 'comprar');
		const cara = [...nuevas].sort((x, y) => y.precioUsd - x.precioUsd)[0];
		const otra = [...nuevas]
			.sort((x, y) => y.precioUsd - x.precioUsd)
			.find((i) => i.id !== cara.id)!;

		e.futbolista.dineroUsd = cara.precioUsd;

		expect(comprar(e, 'futbolista', cara.pedido)).not.toBeNull();
		expect(comprar(e, 'futbolista', otra.pedido)).toBeNull();
		expect(e.futbolista.dineroUsd).toBe(0);
	});

	it('sostener todo cuesta caro pero no imposible', () => {
		// El problema real que reportó Hernán: tener todo se llevaba el 88% de lo
		// que ganaba en el año.
		const e = conPlata(50_000_000);
		e.futbolista.contrato.salarioMensual = 190_000;

		for (const i of loQuePuedeComprar(e, 'futbolista').filter((x) => x.modo === 'comprar')) {
			comprar(e, 'futbolista', i.pedido);
		}

		const porAnio = gastoAnual(e, 'futbolista');
		const gana = e.futbolista.contrato.salarioMensual * 12;
		expect(porAnio / gana).toBeLessThan(0.4);
		// Y que siga siendo una decisión: gratis tampoco.
		expect(porAnio / gana).toBeGreaterThan(0.15);
	});
});

describe('renovar y atar los consumibles', () => {
	/**
	 * "Faltan consumibles renovables", dijo Bebo. Tenía razón: un consumible
	 * comprado desaparecía de la vidriera y volvía recién cuando se gastaba, así
	 * que no había forma de estirarlo antes de quedarse sin, ni de dejar de
	 * comprarlo todos los años.
	 */
	function conPlata(cuanta = 5_000_000): Estado {
		const e = unaPartida();
		e.futbolista.dineroUsd = cuanta;
		e.futbolista.contrato.salarioMensual = 20_000;
		return e;
	}

	const unConsumible = (e: Estado) =>
		loQuePuedeComprar(e, 'futbolista').find((i) => i.modo === 'comprar' && i.dura)!;

	it('el que ya tenés se puede renovar, y suma a lo que quedaba', () => {
		const e = conPlata();
		const cual = unConsumible(e);
		comprar(e, 'futbolista', cual.pedido);

		const paraRenovar = loQuePuedeComprar(e, 'futbolista').find(
			(i) => i.id === cual.id && i.modo === 'renovar'
		);
		expect(paraRenovar, 'tiene que aparecer para renovar').toBeDefined();

		const linea = comprar(e, 'futbolista', paraRenovar!.pedido);
		expect(linea).toContain('renovado');

		// Renovar antes de que se termine no desperdicia lo que sobraba.
		const tiene = (e.inversiones?.futbolista ?? []).find((c) => c.id === cual.id)!;
		expect(tiene.quedan).toBe((cual.dura ?? 1) * 2);
	});

	it('y se puede atar para siempre: deja de gastarse y se paga por año', () => {
		const e = conPlata();
		const cual = unConsumible(e);
		comprar(e, 'futbolista', cual.pedido);

		const paraFijar = loQuePuedeComprar(e, 'futbolista').find(
			(i) => i.id === cual.id && i.modo === 'fijar'
		)!;
		expect(paraFijar).toBeDefined();
		// Atarse cuesta más que la temporada suelta: si costara lo mismo, nadie
		// compraría nunca la versión suelta.
		expect(paraFijar.precioUsd).toBeGreaterThan(cual.precioUsd);
		expect(paraFijar.porTemporadaUsd).toBeGreaterThan(0);

		comprar(e, 'futbolista', paraFijar.pedido);

		const tiene = (e.inversiones?.futbolista ?? []).find((c) => c.id === cual.id)!;
		expect(tiene.fijo).toBe(true);
		expect(tiene.quedan).toBeUndefined();
		expect(tiene.porTemporadaUsd).toBeGreaterThan(0);
	});

	it('lo atado no se gasta nunca, aunque pasen los años', () => {
		const e = conPlata();
		const cual = unConsumible(e);
		const fijar = loQuePuedeComprar(e, 'futbolista').find(
			(i) => i.id === cual.id && i.modo === 'fijar'
		)!;
		comprar(e, 'futbolista', fijar.pedido);

		for (let t = 0; t < 10; t++) cobrarMantenimiento(e);

		const sigue = (e.inversiones?.futbolista ?? []).find((c) => c.id === cual.id);
		expect(sigue, 'diez temporadas después tiene que seguir ahí').toBeDefined();
		expect(sigue!.fijo).toBe(true);
	});

	it('el suelto sí se gasta, y después se puede volver a comprar', () => {
		const e = conPlata();
		const cual = unConsumible(e);
		comprar(e, 'futbolista', cual.pedido);

		for (let t = 0; t < (cual.dura ?? 1); t++) cobrarMantenimiento(e);

		expect((e.inversiones?.futbolista ?? []).some((c) => c.id === cual.id)).toBe(false);
		expect(
			loQuePuedeComprar(e, 'futbolista').some((i) => i.id === cual.id && i.modo === 'comprar')
		).toBe(true);
	});

	it('lo atado se pierde el año que no se puede pagar, como el staff', () => {
		const e = conPlata();
		const cual = unConsumible(e);
		const fijar = loQuePuedeComprar(e, 'futbolista').find(
			(i) => i.id === cual.id && i.modo === 'fijar'
		)!;
		comprar(e, 'futbolista', fijar.pedido);

		e.futbolista.dineroUsd = 0;
		const lineas = cobrarMantenimiento(e);

		expect((e.inversiones?.futbolista ?? []).some((c) => c.id === cual.id)).toBe(false);
		expect(lineas.some((l) => l.texto.includes('No pudiste sostener'))).toBe(true);
	});

	it('no se puede renovar lo que no tenés, ni atar lo que ya está atado', () => {
		const e = conPlata();
		const cual = unConsumible(e);

		// Sin tenerlo: renovar no hace nada.
		expect(comprar(e, 'futbolista', `${cual.id}:renovar`)).toBeNull();

		comprar(e, 'futbolista', `${cual.id}:fijar`);
		const plataAntes = e.futbolista.dineroUsd;
		expect(comprar(e, 'futbolista', `${cual.id}:fijar`)).toBeNull();
		expect(comprar(e, 'futbolista', `${cual.id}:renovar`)).toBeNull();
		expect(e.futbolista.dineroUsd, 'no le puede cobrar de nuevo').toBe(plataAntes);
	});

	it('el staff no se renueva ni se ata: ya es para siempre', () => {
		const e = conPlata();
		const staff = loQuePuedeComprar(e, 'futbolista').find((i) => !i.dura)!;
		comprar(e, 'futbolista', staff.pedido);

		const otraVez = loQuePuedeComprar(e, 'futbolista').filter((i) => i.id === staff.id);
		expect(otraVez).toEqual([]);
	});
});
