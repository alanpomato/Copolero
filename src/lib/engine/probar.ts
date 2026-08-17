import { resolverFase, quienesDeciden } from './fases';
import { ofertasPara } from './pases';
import type { Decision, Estado, Rol } from './tipos';

/**
 * Ayudas para los tests. No la usa el juego.
 *
 * Existe por una razón concreta: hasta el mercado en dos tiempos, una temporada
 * eran tres resoluciones y todos los tests lo daban por sentado con un
 * `for (let i = 0; i < 3; i++)`. Ahora la fase 3 se resuelve dos veces —primero
 * el representante, después el futbolista— y ese número quedó viejo en veinte
 * lugares distintos.
 *
 * Lo que estaba mal no era el número: era que cada test supiera cuántas
 * resoluciones tiene un año. Eso es asunto del motor. Acá se avanza hasta que
 * el motor diga que cambió la temporada, y el día que la fase 3 tenga tres
 * tiempos no hay que tocar ningún test.
 */

/** Nadie decide nada: el motor toma sus valores por defecto. */
export function sinDecidir(): Decision[] {
	return [
		{ rol: 'futbolista', nota: '' },
		{ rol: 'representante', nota: '' }
	];
}

/**
 * Avanza una resolución, mandando solo lo que este paso pide.
 *
 * En el mercado juega uno por vez, y mandar la decisión del que no juega no es
 * inocuo: el motor la ignoraría, pero el servidor la rechaza. Filtrar acá hace
 * que el test se parezca a lo que de verdad pasa.
 */
export function unPaso(estado: Estado, decisiones: readonly Decision[], semilla: string): Estado {
	const deben = quienesDeciden(estado);
	const suyas = decisiones.filter((d) => deben.includes(d.rol));
	return resolverFase(estado, suyas, semilla).estado;
}

/** Avanza hasta que arranque la temporada siguiente. */
export function unaTemporada(
	estado: Estado,
	decisiones: readonly Decision[] = sinDecidir(),
	semilla = 'test'
): Estado {
	const desde = estado.temporada;
	let e = estado;
	// El tope es un cinturón contra un bucle infinito si el motor deja de
	// avanzar, no una cuenta de fases: nadie tiene que mantenerlo al día.
	for (let vueltas = 0; vueltas < 12 && !e.carreraTerminada && e.temporada === desde; vueltas++) {
		e = unPaso(e, decisiones, semilla);
	}
	return e;
}

/** Y varias seguidas, que es como se prueba una carrera. */
export function temporadas(
	estado: Estado,
	cuantas: number,
	decisiones: readonly Decision[] = sinDecidir(),
	semilla = 'test'
): Estado {
	let e = estado;
	for (let i = 0; i < cuantas && !e.carreraTerminada; i++) {
		e = unaTemporada(e, decisiones, semilla);
	}
	return e;
}

/** Avanza hasta parar en una fase concreta de la temporada que viene o de ésta. */
export function hastaLaFase(
	estado: Estado,
	fase: 1 | 2 | 3,
	decisiones: readonly Decision[] = sinDecidir(),
	semilla = 'test'
): Estado {
	let e = estado;
	for (let vueltas = 0; vueltas < 12 && !e.carreraTerminada && e.fase !== fase; vueltas++) {
		e = unPaso(e, decisiones, semilla);
	}
	return e;
}

/** Quién tiene que mandar decisión en este paso. Para leerlo en un test. */
export function decide(estado: Estado, rol: Rol): boolean {
	return quienesDeciden(estado).includes(rol);
}

/**
 * Deja la partida en el segundo tiempo del mercado, con las ofertas ya pasadas.
 *
 * Muchos tests quieren probar el pase y nada más: qué cobra el futbolista al
 * firmar, si lo que muestra la pantalla es lo que firma el motor. Hacerlos
 * pasar por el filtro del representante primero es ruido —esa parte tiene sus
 * propios tests— y encima los ata al azar del filtro.
 *
 * Sin `llegaron` deja pasar todo lo que había sobre la mesa, que es el caso más
 * cómodo para probar el pase: el futbolista elige entre todo.
 */
export function enLaEleccion(estado: Estado, llegaron?: readonly string[]): Estado {
	const e = structuredClone(estado);
	e.fase = 3;
	e.mercado = {
		paso: 'eleccion',
		llegaron: [...(llegaron ?? ofertasPara(e, 'test').map((o) => o.clubId))],
		seCayeron: [],
		renovacion: { conseguida: null, quisieron: true, como: '' }
	};
	return e;
}
