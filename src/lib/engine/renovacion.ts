import { club, clubes, salarioTipico } from '../../../content/mundo';
import { media } from './estado';
import { rngPara } from './rng';
import { brechaCon } from './temporada';
import type { EntradaLog, Estado } from './tipos';

/**
 * La renovación con el club.
 *
 * Hasta acá el contrato con el club se vencía y no pasaba nada: el futbolista
 * seguía jugando en el mismo lugar, por el mismo sueldo, para siempre. Se
 * perdía la decisión más común del fútbol de verdad y, peor, la que enfrenta
 * mejor a los dos jugadores.
 *
 * Renovar es la opción segura: más sueldo ahora, y las temporadas en el club
 * siguen sumando para el multiplicador de permanencia del final. Dejarlo vencer
 * es apostar: al quedar libre el pase no cuesta nada, así que muchos más clubes
 * pueden ir a buscarlo y lo que ofrecen es mejor —sueldo más alto y una prima
 * por firmar—, pero el club se entera y lo hace jugar menos. Y jugar menos
 * ahora cuesta de verdad, porque los minutos son lo que lo hace mejor.
 *
 * Al representante le conviene lo contrario que al futbolista casi siempre: la
 * renovación le sube el porcentaje del sueldo de a poco, y la prima por firmar
 * libre le paga de una sola vez. Por eso vale la misma regla que el pase: **los
 * dos eligen y solo pasa si eligen lo mismo**.
 */

export const FIRMAR = 'firmar';

/** Cuánto margen hace falta para que un club de refugio sea estable. */
const HOLGURA_DE_REFUGIO = 5;

/** Y a qué distancia de su nivel queda el club que termina firmándolo. */
const HOLGURA_IDEAL = 9;

export const ESPERAR = 'esperar';

export type OfertaDeRenovacion = {
	salarioMensual: number;
	temporadas: number;
	/** Lo que se lleva el representante si firma. */
	comisionUsd: number;
	/** Cuánto sube respecto de lo que cobra hoy, en porcentaje. */
	mejora: number;
};

/**
 * Cuándo se sienta a hablar con el club.
 *
 * Cuando le queda una temporada o ya no le queda ninguna. Con dos años por
 * delante nadie renueva, y esperar hasta que esté vencido le sacaría al
 * futbolista la posibilidad de elegir.
 */
export function tocaRenovar(estado: Estado): boolean {
	return !estado.carreraTerminada && estado.futbolista.contrato.temporadasRestantes <= 1;
}

/** Si ya está libre: sin contrato, se va sin que el club cobre nada. */
export function estaLibre(estado: Estado): boolean {
	return estado.futbolista.contrato.temporadasRestantes === 0;
}

/**
 * El estado como llega al mercado de fin de temporada.
 *
 * La temporada que se acaba de jugar consume un año de contrato, y eso pasa
 * antes del mercado: al que le quedaba uno llega libre, y al que le quedaban
 * tres le quedan dos. Existe como función y no como dos líneas sueltas porque
 * la pantalla tiene que mostrar exactamente las mismas ofertas que después se
 * resuelven. Cuando cada lado descontaba por su cuenta, el mercado mostraba un
 * pase de dos millones y firmaba uno libre.
 */
export function comoLlegaAlMercado(estado: Estado): Estado {
	const copia = structuredClone(estado);
	copia.futbolista.contrato.temporadasRestantes = Math.max(
		0,
		copia.futbolista.contrato.temporadasRestantes - 1
	);
	copia.contratoRepresentacion.duracionTemporadas = Math.max(
		0,
		copia.contratoRepresentacion.duracionTemporadas - 1
	);
	return copia;
}

/**
 * Lo que el club pone sobre la mesa, o `null` si no lo quiere renovar.
 *
 * Un club no renueva a alguien que no juega, y ésa es la parte incómoda: al que
 * está en el banco no le llega ninguna oferta, y enterarse de eso es lo que lo
 * empuja al mercado antes de que sea tarde.
 */
export function ofertaDeRenovacion(estado: Estado, semilla: string): OfertaDeRenovacion | null {
	if (!tocaRenovar(estado)) return null;

	const f = estado.futbolista;
	const brecha = brechaCon(f, f.contrato.clubId);

	// Un club renueva a los de su plantel, no solo a los titulares: al que entra
	// desde el banco le renueva por poco, y al que le queda grande el club no le
	// renueva nada. El corte va en "te quedó grande", el mismo que usa la
	// pantalla, y no en "sos titular": con el corte alto casi nadie renovaba
	// nunca y todas las carreras terminaban a los cinco años sin club.
	if (brecha < -12) return null;

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 1,
		clave: 'renovacion'
	});

	// El club paga lo que vale el puesto ahí, corregido por para qué lo quiere:
	// a la figura le mejora fuerte y al que pelea el puesto apenas le sostiene
	// lo que ya tiene.
	const porRol = Math.max(0.7, Math.min(1.35, 1 + brecha / 24));
	const techo = salarioTipico(f.contrato.clubId, media(f.atributos, f.posicion)) * porRol;
	const salarioMensual =
		Math.round(
			Math.max(f.contrato.salarioMensual * 1.04, techo * (0.9 + rng.entero(0, 30) / 100)) / 100
		) * 100;

	// A los treinta y pico nadie firma cuatro años.
	const temporadas = f.edad >= 33 ? 1 : f.edad >= 30 ? rng.entero(1, 2) : rng.entero(2, 4);

	return {
		salarioMensual,
		temporadas,
		comisionUsd: Math.round(
			((salarioMensual * 12 * temporadas) / 100) * estado.contratoRepresentacion.pctSalario
		),
		mejora: Math.round((salarioMensual / f.contrato.salarioMensual - 1) * 100)
	};
}

/**
 * Resuelve la mesa con el club.
 *
 * Muta el estado. Igual que el pase: si los dos no eligen lo mismo, no pasa
 * nada y la confianza lo paga.
 */
export function resolverRenovacion(
	estado: Estado,
	semilla: string,
	delFutbolista: string | undefined,
	delRepresentante: string | undefined,
	log: EntradaLog[]
): void {
	const oferta = ofertaDeRenovacion(estado, semilla);
	const f = estado.futbolista;
	const nombreClub = club(f.contrato.clubId).nombre;

	if (!oferta) {
		// No hay nada que decidir, pero hay algo que avisar: que no lo quieran
		// renovar es la señal más clara del juego de que hay que moverse.
		if (tocaRenovar(estado)) {
			log.push({
				tipo: 'contrato',
				visiblePara: 'ambos',
				texto:
					`${nombreClub} no ofreció renovación. Con los minutos que le dan, en el club ya no ` +
					`cuentan con él para adelante.`
			});
		}
		return;
	}

	// Sin elegir, se firma. Es la opción conservadora, y la que no rompe nada.
	const futbolista = delFutbolista ?? FIRMAR;
	const representante = delRepresentante ?? FIRMAR;

	if (futbolista !== representante) {
		estado.confianza = Math.max(0, estado.confianza - 7);
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto:
				`No se pusieron de acuerdo con la renovación de ${nombreClub} y la mesa se levantó ` +
				`sin firmar. El contrato sigue como estaba y la relación quedó golpeada.`
		});
		return;
	}

	if (futbolista === FIRMAR) {
		const antes = f.contrato.salarioMensual;
		f.contrato.salarioMensual = oferta.salarioMensual;
		f.contrato.temporadasRestantes = oferta.temporadas;
		estado.confianza = Math.min(100, estado.confianza + 4);
		estado.representante.dineroUsd += oferta.comisionUsd;
		estado.representante.prestigio = Math.min(100, estado.representante.prestigio + 1);

		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto:
				`Renovó con ${nombreClub} por ${oferta.temporadas} ` +
				`${oferta.temporadas === 1 ? 'temporada' : 'temporadas'}: de USD ` +
				`${antes.toLocaleString('es-AR')} a USD ${oferta.salarioMensual.toLocaleString('es-AR')} por mes.`
		});
		log.push({
			tipo: 'ingresos',
			visiblePara: 'representante',
			texto: `Te quedaron USD ${oferta.comisionUsd.toLocaleString('es-AR')} por la firma.`
		});
		return;
	}

	// --- Deciden esperar -----------------------------------------------------
	// Es una apuesta con costo inmediato: el club se entera y lo hace jugar
	// menos, y con los minutos se le va la temporada de crecimiento.
	f.dt = Math.max(-100, f.dt - 14);
	f.hinchada = Math.max(0, f.hinchada - 6);
	log.push({
		tipo: 'contrato',
		visiblePara: 'ambos',
		texto:
			`Rechazaron la renovación de ${nombreClub}. En el club no cayó bien: el técnico lo va a ` +
			`hacer jugar menos y, si termina el contrato, se va libre y sin que nadie cobre un peso ` +
			`por el pase.`
	});
}

/**
 * El club que se lo lleva cuando nadie más lo llamó.
 *
 * Siempre hay un club más abajo dispuesto a firmar a alguien que quedó libre, y
 * eso es cierto en el fútbol de verdad: a los veinte años sin contrato se juega
 * en el Ascenso, no se deja de jugar. Se busca en todo el mundo el mejor lugar
 * donde siga siendo titular, que es lo único que le importa a un jugador libre.
 *
 * Devuelve `null` solamente cuando de verdad no hay nada, que a esta altura de
 * la carrera significa que se terminó.
 */
export function clubDeUltimoRecurso(estado: Estado): string | null {
	const f = estado.futbolista;

	const todos = clubes
		.filter((c) => c.id !== f.contrato.clubId)
		.map((c) => ({ id: c.id, brecha: brechaCon(f, c.id), prestigio: c.prestigio }));

	// Titular con margen, no titular al límite. Es la diferencia entre caer en un
	// club donde va a jugar tranquilo unos años y caer en uno donde vuelve a
	// quedar libre el año que viene: sin este margen, el que se queda sin club
	// rebota de un lado a otro toda la carrera y no llega a ser de ningún lado.
	const comodo = todos.filter((c) => c.brecha >= HOLGURA_DE_REFUGIO);
	const posibles = comodo.length > 0 ? comodo : todos.filter((c) => c.brecha > -2);
	if (posibles.length === 0) return null;

	/*
	 * Y de ésos, el que está a su medida: ni el mejor que lo aceptaría ni el
	 * peor del mundo, sino uno de su nivel.
	 *
	 * Que sea el de más prestigio sería un premio, y esto no es un premio: es lo
	 * que pasa cuando nadie te llamó. Si el motor te consigue el mejor club
	 * posible, elegir bajar por tu cuenta —que es la salida que el juego le da al
	 * que arrancó demasiado arriba— deja de valer la pena, y quedarse quieto pasa
	 * a rendir más que decidir. Ésa es exactamente la forma de arruinar un juego
	 * de decisiones.
	 */
	posibles.sort(
		(a, b) =>
			Math.abs(a.brecha - HOLGURA_IDEAL) - Math.abs(b.brecha - HOLGURA_IDEAL) ||
			a.prestigio - b.prestigio
	);
	return posibles[0].id;
}

/**
 * Lo que paga el club de último recurso.
 *
 * Menos de lo que valía: llegar libre y sin ofertas es la peor posición para
 * negociar que hay.
 */
export function contratoDeUltimoRecurso(
	estado: Estado,
	clubId: string
): { salarioMensual: number; temporadas: number } {
	const f = estado.futbolista;
	const tipico = salarioTipico(clubId, media(f.atributos, f.posicion));
	return {
		salarioMensual: Math.max(600, Math.round((tipico * 0.8) / 100) * 100),
		temporadas: f.edad >= 33 ? 1 : 2
	};
}

/**
 * La prima por firmar libre.
 *
 * Cuando el pase no cuesta nada, el club que lo compra se ahorra la
 * transferencia entera y una parte de eso va a la firma. Es lo que hace que
 * dejar vencer el contrato sea una apuesta y no un error: si el mercado
 * responde, se cobra de una vez lo que una renovación paga en cuatro años.
 */
export function primaDeFirmaLibre(valorDeMercadoUsd: number): number {
	return Math.round((valorDeMercadoUsd * 0.22) / 10_000) * 10_000;
}
