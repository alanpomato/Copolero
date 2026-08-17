import { describe, expect, it } from 'vitest';
import { estadoInicial } from './estado';
import { TEMPORADAS_MAXIMAS, resolverFase } from './fases';
import { opcionesDeFase } from './pantalla';
import { resumirRetiro } from './retiro';
import { rngPara } from './rng';
import {
	SUENOS,
	comoVaElSueno,
	elQueSeCumplioEn,
	elegirSueno,
	puntosDelSueno,
	revisarSuenos,
	suenoDe,
	suenosPara,
	tocaElegirSueno
} from './suenos';
import { POSICIONES, ROLES, type Decision, type Estado } from './tipos';

function unPibe(puesto = 'centrodelantero', semilla = 'sueno'): Estado {
	return estadoInicial(
		{
			futbolista: {
				nombre: 'Damián Correa',
				nacionalidad: 'Argentina',
				puesto,
				numero: 9,
				pie: 'derecho',
				edadInicial: 16,
				clubId: 'ar2-moron'
			},
			representante: { nombre: 'Alan' }
		},
		rngPara(semilla, { temporada: 0, fase: 1, clave: 'inicio' }),
		2026
	);
}

const NADA: Decision[] = [
	{ rol: 'futbolista', nota: '' },
	{ rol: 'representante', nota: '' }
];

/** Corre `fases` fases seguidas sin que nadie elija nada. */
function jugar(estado: Estado, fases: number, semilla = 'sueno'): Estado {
	let e = estado;
	for (let i = 0; i < fases && !e.carreraTerminada; i++) {
		e = resolverFase(e, NADA, semilla).estado;
	}
	return e;
}

describe('el catálogo de sueños', () => {
	it('cada uno tiene meta, unidad y una línea para el día que se cumple', () => {
		for (const s of SUENOS) {
			expect(s.meta, s.id).toBeGreaterThan(0);
			expect(s.unidad.length, s.id).toBeGreaterThan(1);
			expect(s.detalle.length, s.id).toBeGreaterThan(20);
			expect(s.alCumplirlo.length, s.id).toBeGreaterThan(20);
			expect(s.puntos, s.id).toBeGreaterThan(0);
		}
	});

	it('los ids no se repiten', () => {
		expect(new Set(SUENOS.map((s) => s.id)).size).toBe(SUENOS.length);
	});

	it('cada puesto y cada rol tiene al menos dos para elegir', () => {
		// Ids reales de `puestos.ts`: `puestoPorId` cae al centrodelantero si el id
		// no existe, así que un id inventado acá haría pasar el test sin probar nada.
		for (const puesto of ['arquero', 'central', 'enganche', 'centrodelantero']) {
			const e = unPibe(puesto);
			for (const rol of ROLES) {
				expect(suenosPara(e, rol).length, `${puesto}/${rol}`).toBeGreaterThanOrEqual(2);
			}
		}
		// Y todas las posiciones del motor quedan cubiertas, no solo esos cuatro
		// puestos.
		for (const p of POSICIONES) {
			const propios = SUENOS.filter(
				(s) => s.rol === 'futbolista' && (!s.posiciones || s.posiciones.includes(p))
			);
			expect(propios.length, p).toBeGreaterThanOrEqual(2);
		}
	});

	it('arrancan todos en cero: nadie nace con medio sueño cumplido', () => {
		const e = unPibe();
		for (const s of SUENOS) {
			expect(s.cuanto(e), s.id).toBeLessThan(s.meta);
		}
	});
});

describe('elegirlo', () => {
	it('se elige en la primera pretemporada y nunca más', () => {
		const e = unPibe();
		expect(tocaElegirSueno(e, 'futbolista')).toBe(true);
		expect(tocaElegirSueno(e, 'representante')).toBe(true);

		elegirSueno(e, 'futbolista', 'la-vitrina');
		expect(tocaElegirSueno(e, 'futbolista')).toBe(false);
		// Y el del otro sigue abierto: son dos decisiones independientes.
		expect(tocaElegirSueno(e, 'representante')).toBe(true);
	});

	it('no se puede cambiar después', () => {
		const e = unPibe();
		elegirSueno(e, 'futbolista', 'la-vitrina');
		elegirSueno(e, 'futbolista', 'el-goleador');
		expect(suenoDe(e, 'futbolista')?.id).toBe('la-vitrina');
	});

	it('nadie puede elegir el del otro rol', () => {
		const e = unPibe();
		elegirSueno(e, 'futbolista', 'la-primera-fortuna');
		expect(suenoDe(e, 'futbolista')?.rol).toBe('futbolista');
	});

	it('un arquero no puede quedarse con el del goleador', () => {
		const e = unPibe('arquero');
		elegirSueno(e, 'futbolista', 'el-goleador');
		expect(suenoDe(e, 'futbolista')?.id).not.toBe('el-goleador');
	});

	it('el que no elige igual tiene uno: la partida no se traba', () => {
		const e = jugar(unPibe(), 1);
		expect(e.suenos.futbolista).not.toBeNull();
		expect(e.suenos.representante).not.toBeNull();
	});

	it('la pantalla lo ofrece la primera pretemporada y después muestra cómo va', () => {
		const e = unPibe();
		const antes = opcionesDeFase(e, 'futbolista', 'sueno');
		expect(antes.suenos?.length).toBeGreaterThan(0);
		expect(antes.miSueno).toBeUndefined();

		const despues = opcionesDeFase(jugar(e, 1), 'futbolista', 'sueno');
		expect(despues.suenos).toBeUndefined();
		expect(despues.miSueno).toBeDefined();
		// Y el del otro, que es lo que explica por qué empuja para ese lado.
		expect(despues.elSuenoDelOtro?.deQuien).toBe('Alan');
	});
});

describe('cómo va', () => {
	it('nunca retrocede a lo largo de una carrera entera', () => {
		for (const semilla of ['a', 'b', 'c']) {
			let e = unPibe('centrodelantero', semilla);
			e = resolverFase(
				e,
				[
					{ rol: 'futbolista', nota: '', sueno: 'el-goleador' },
					{ rol: 'representante', nota: '', sueno: 'la-primera-fortuna' }
				],
				semilla
			).estado;

			let maximoF = 0;
			let maximoR = 0;
			for (let i = 0; i < TEMPORADAS_MAXIMAS * 3 && !e.carreraTerminada; i++) {
				e = jugar(e, 1, semilla);
				const f = comoVaElSueno(e, 'futbolista')!;
				const r = comoVaElSueno(e, 'representante')!;
				expect(f.pct, `${semilla}: el del futbolista bajó`).toBeGreaterThanOrEqual(maximoF);
				expect(r.pct, `${semilla}: el del representante bajó`).toBeGreaterThanOrEqual(maximoR);
				maximoF = f.pct;
				maximoR = r.pct;
			}
		}
	});

	it('gastar la plata no le borra medio sueño al representante', () => {
		const e = unPibe();
		elegirSueno(e, 'representante', 'la-primera-fortuna');
		e.representante.dineroUsd = 1_800_000;
		revisarSuenos(e);
		expect(comoVaElSueno(e, 'representante')!.pct).toBe(60);

		// Se compra la oficina y la caja baja a la mitad: la barra se queda donde
		// estaba, porque llegó a tener esa plata.
		e.representante.dineroUsd = 900_000;
		expect(comoVaElSueno(e, 'representante')!.pct).toBe(60);
	});

	it('el porcentaje se queda entre 0 y 100 y el que falta nunca es negativo', () => {
		const e = unPibe();
		elegirSueno(e, 'futbolista', 'la-vitrina');
		e.futbolista.titulos = 40;
		const p = comoVaElSueno(e, 'futbolista')!;
		expect(p.pct).toBe(100);
		expect(p.cumplido).toBe(true);
		expect(p.falta).toBe('Cumplido');
	});
});

describe('cumplirlo', () => {
	it('se anota una sola vez y no se descumple', () => {
		const e = unPibe();
		elegirSueno(e, 'representante', 'la-primera-fortuna');
		e.representante.dineroUsd = 10_500_000;

		expect(revisarSuenos(e)).toHaveLength(1);
		// Segunda pasada: ya está anotado, no se vuelve a cantar.
		expect(revisarSuenos(e)).toHaveLength(0);

		// Y si después se funde, el sueño sigue cumplido: lo tocó.
		e.representante.dineroUsd = 0;
		expect(comoVaElSueno(e, 'representante')?.cumplido).toBe(true);
	});

	it('queda registrada la temporada, que es la que va a la tapa', () => {
		const e = unPibe();
		e.temporada = 7;
		elegirSueno(e, 'futbolista', 'la-vitrina');
		e.suenos.futbolista = 'la-vitrina';
		e.futbolista.titulos = 11;
		revisarSuenos(e);

		expect(elQueSeCumplioEn(e, 7)?.id).toBe('la-vitrina');
		expect(elQueSeCumplioEn(e, 6)).toBeNull();
	});

	it('el que lo cumple suma bastante más que el que se queda a mitad', () => {
		const cerca = unPibe();
		elegirSueno(cerca, 'futbolista', 'la-vitrina');
		cerca.futbolista.titulos = 10;

		const lejos = unPibe();
		elegirSueno(lejos, 'futbolista', 'la-vitrina');
		lejos.futbolista.titulos = 5;

		const a = puntosDelSueno(cerca, 'futbolista')!;
		const b = puntosDelSueno(lejos, 'futbolista')!;
		expect(a.puntos).toBeGreaterThan(b.puntos * 3);
	});

	it('quedarse en el 90% suma más que quedarse en el 10%', () => {
		const alto = unPibe();
		elegirSueno(alto, 'futbolista', 'el-goleador');
		alto.futbolista.goles = 90;

		const bajo = unPibe();
		elegirSueno(bajo, 'futbolista', 'el-goleador');
		bajo.futbolista.goles = 10;

		expect(puntosDelSueno(alto, 'futbolista')!.puntos).toBeGreaterThan(
			puntosDelSueno(bajo, 'futbolista')!.puntos
		);
	});
});

describe('el final', () => {
	it('el retiro trae el veredicto de los dos', () => {
		let e = unPibe();
		e = resolverFase(
			e,
			[
				{ rol: 'futbolista', nota: '', sueno: 'los-quinientos' },
				{ rol: 'representante', nota: '', sueno: 'la-agencia' }
			],
			'final'
		).estado;
		e.carreraTerminada = true;

		const retiro = resumirRetiro(e);
		expect(retiro.suenos).toHaveLength(2);
		expect(retiro.suenos.map((s) => s.rol).sort()).toEqual(['futbolista', 'representante']);
		for (const s of retiro.suenos) {
			expect(s.cierre.length, s.nombre).toBeGreaterThan(20);
			expect(s.lleva.length, s.nombre).toBeGreaterThan(3);
		}
	});

	it('una partida vieja sin sueños no rompe nada', () => {
		const e = unPibe();
		// Como venía guardada antes de que existiera este módulo.
		delete (e as Partial<Estado>).suenos;

		expect(comoVaElSueno(e, 'futbolista')).toBeNull();
		expect(puntosDelSueno(e, 'representante')).toBeNull();
		expect(resumirRetiro(e).suenos).toEqual([]);
		expect(() => opcionesDeFase(e, 'futbolista', 'sueno')).not.toThrow();
		// Y puede elegir uno ahora mismo, porque sigue en la temporada 1.
		expect(tocaElegirSueno(e, 'futbolista')).toBe(true);
	});
});
