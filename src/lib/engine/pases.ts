import { club, clubes, contexto, salarioTipico } from '../../../content/mundo';
import { media } from './estado';
import { dtActualDe } from './mercado';
import { rngPara } from './rng';
import { brechaCon } from './temporada';
import type { EntradaLog, Estado } from './tipos';

/**
 * El pase.
 *
 * Es el momento del juego. Todo lo demás —la pretemporada, la rueda de
 * ocasión, la temporada— existe para llegar acá con algo para vender.
 *
 * La regla es una sola y es la que obliga a los dos a hablar: **el pase se hace
 * solamente si los dos eligen el mismo club**. El representante consigue las
 * ofertas y sabe cuál le conviene a él; el futbolista sabe dónde quiere jugar.
 * Si no coinciden, no hay pase y la confianza se paga. No hay forma de que uno
 * arrastre al otro, y ésa es exactamente la tensión que el juego quiere.
 */

export type Oferta = {
	clubId: string;
	/** Lo que el club comprador le paga al club vendedor. */
	montoUsd: number;
	/** Lo que le ofrecen al futbolista, por mes. */
	salarioMensual: number;
	temporadas: number;
	/** Comisión del representante por este pase, ya calculada. */
	comisionUsd: number;
	/** Cuánto va a jugar ahí: positivo, es titular; negativo, va al banco. */
	brecha: number;
	/** El técnico que lo va a dirigir, si es alguien conocido. */
	tecnico: string | null;
};

export const QUEDARSE = 'quedarse';
export const OFERTAS_POR_MERCADO = 3;

/**
 * Cuánto vale hoy.
 *
 * Sale de lo que cobraría en su club actual, multiplicado por los años que le
 * quedan de carrera y por lo conocido que es. Un pibe de 19 vale mucho más que
 * lo que produce; un veterano de 33 vale lo que produce y nada más.
 */
export function valorDeMercado(estado: Estado): number {
	const f = estado.futbolista;
	const anual = salarioTipico(f.contrato.clubId, media(f.atributos, f.posicion)) * 12;

	const porEdad =
		f.edad <= 21 ? 8 : f.edad <= 25 ? 6.5 : f.edad <= 28 ? 4.5 : f.edad <= 31 ? 2.2 : 0.8;
	const porNombre = 0.6 + f.fama / 60;
	const porCuerpo = 1 - f.desgaste / 220;

	return Math.round((anual * porEdad * porNombre * porCuerpo) / 1000) * 1000;
}

/**
 * Las ofertas que hay sobre la mesa este mercado.
 *
 * Determinista: el servidor la llama para pintar la pantalla y la vuelve a
 * llamar para resolver, y salen las mismas.
 */
export function ofertasPara(estado: Estado, semilla: string): Oferta[] {
	const f = estado.futbolista;
	const suMedia = media(f.atributos, f.posicion);
	const valor = valorDeMercado(estado);

	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 3,
		clave: 'ofertas'
	});

	// Un club se interesa si el jugador le sirve y le entra en el bolsillo.
	const interesados = clubes.filter((c) => {
		if (c.id === f.contrato.clubId) return false;
		if (c.prestigio > f.fama + 20) return false;

		const sueldo = salarioTipico(c.id, suMedia);
		if (sueldo < f.contrato.salarioMensual * 1.1) return false;

		// Y sobre todo: nadie compra a alguien que no puede jugar en su liga. Es
		// lo que hace que el salto a Europa haya que ganárselo y no elegirlo.
		return brechaCon(f, c.id) > -7;
	});

	if (interesados.length === 0) return [];

	// De los interesados se eligen tres, con preferencia por los que pagan más:
	// el mercado no es justo, pero tampoco es azar puro.
	const ordenados = [...interesados].sort(
		(a, b) => salarioTipico(b.id, suMedia) - salarioTipico(a.id, suMedia)
	);
	const candidatos = ordenados.slice(0, Math.min(28, ordenados.length));

	const elegidos: string[] = [];
	while (elegidos.length < Math.min(OFERTAS_POR_MERCADO, candidatos.length)) {
		const c = rng.elegir(candidatos);
		if (!elegidos.includes(c.id)) elegidos.push(c.id);
	}

	return elegidos
		.map((clubId): Oferta => {
			// Cuanto más contrato le queda, más caro sale sacarlo.
			const porContrato = 0.55 + f.contrato.temporadasRestantes * 0.28;
			const ganas = 0.8 + rng.entero(0, 60) / 100;
			const monto = Math.max(20_000, Math.round((valor * porContrato * ganas) / 10_000) * 10_000);

			// Lo que ofrecen depende de para qué lo compran: si viene a ser titular
			// paga el precio del puesto, y si viene a competir por el puesto, menos.
			const brecha = brechaCon(f, clubId);
			const porRol = Math.max(0.4, Math.min(1.25, 1 + brecha / 22));
			const sueldo =
				Math.round(
					(salarioTipico(clubId, suMedia) * porRol * (0.85 + rng.entero(0, 40) / 100)) / 100
				) * 100;

			return {
				clubId,
				montoUsd: monto,
				salarioMensual: Math.max(f.contrato.salarioMensual + 100, sueldo),
				temporadas: rng.entero(2, 4),
				comisionUsd: Math.round((monto * estado.contratoRepresentacion.pctTransferencia) / 100),
				brecha: Math.round(brecha),
				tecnico: dtActualDe(clubId, estado.cambiosMundo)?.nombre ?? null
			};
		})
		.sort((a, b) => b.montoUsd - a.montoUsd);
}

/**
 * Resuelve el mercado con lo que eligieron los dos.
 *
 * Los dos tienen que elegir el mismo club. Si uno dice quedarse y el otro dice
 * irse, no hay pase: el futbolista se queda y la confianza se rompe un poco. Es
 * el precio de no haberlo hablado.
 */
export function resolverPase(
	estado: Estado,
	ofertas: readonly Oferta[],
	eligeFutbolista: string | undefined,
	eligeRepresentante: string | undefined,
	log: EntradaLog[]
): void {
	if (ofertas.length === 0) return;

	const delFutbolista = eligeFutbolista ?? QUEDARSE;
	const delRepresentante = eligeRepresentante ?? QUEDARSE;

	// Los dos quieren quedarse: no pasa nada, y está bien que no pase nada.
	if (delFutbolista === QUEDARSE && delRepresentante === QUEDARSE) {
		log.push({
			tipo: 'mercado',
			visiblePara: 'ambos',
			texto: `Hubo ${ofertas.length} ${ofertas.length === 1 ? 'oferta' : 'ofertas'} y se quedó en ${club(estado.futbolista.contrato.clubId).nombre}. Los dos estuvieron de acuerdo.`
		});
		return;
	}

	if (delFutbolista !== delRepresentante) {
		estado.confianza = Math.max(0, estado.confianza - 8);
		log.push({
			tipo: 'mercado',
			visiblePara: 'ambos',
			texto:
				'No se pusieron de acuerdo en el mercado y el pase se cayó. ' +
				`${estado.futbolista.nombre} se queda en ${club(estado.futbolista.contrato.clubId).nombre}, con la relación golpeada.`
		});
		return;
	}

	const oferta = ofertas.find((o) => o.clubId === delFutbolista);
	if (!oferta) return;

	aplicarPase(estado, oferta, log);
}

/** Ejecuta el pase: cambia de club, cobra el representante, se mueve todo. */
export function aplicarPase(estado: Estado, oferta: Oferta, log: EntradaLog[]): void {
	const f = estado.futbolista;
	const desde = club(f.contrato.clubId).nombre;
	const hacia = contexto(oferta.clubId);

	f.contrato = {
		clubId: oferta.clubId,
		salarioMensual: oferta.salarioMensual,
		temporadasRestantes: oferta.temporadas,
		clausula: Math.round(oferta.montoUsd * 2.5)
	};
	f.valorMercadoUsd = oferta.montoUsd;

	// Cambiar de club es empezar de cero con el técnico y con la gente.
	f.dt = Math.round(f.dt * 0.4);
	f.hinchada = Math.round(f.hinchada * 0.35);
	f.fama = Math.min(100, f.fama + Math.round(hacia.club.prestigio / 12));
	f.moral = Math.min(100, f.moral + 6);

	// Y es el día de cobrar del representante.
	estado.representante.dineroUsd += oferta.comisionUsd;
	estado.representante.prestigio = Math.min(
		100,
		estado.representante.prestigio + Math.max(1, Math.round(hacia.club.prestigio / 14))
	);
	estado.confianza = Math.min(100, estado.confianza + 5);

	log.push({
		tipo: 'pase',
		visiblePara: 'ambos',
		texto:
			`${f.nombre} pasa de ${desde} a ${hacia.club.nombre} (${hacia.liga.nombre}) ` +
			`por USD ${oferta.montoUsd.toLocaleString('es-AR')}. ` +
			`Firma por ${oferta.temporadas} temporadas a USD ${oferta.salarioMensual.toLocaleString('es-AR')} por mes.`
	});
	log.push({
		tipo: 'ingresos',
		visiblePara: 'representante',
		texto:
			`Comisión del pase: USD ${oferta.comisionUsd.toLocaleString('es-AR')} ` +
			`(${estado.contratoRepresentacion.pctTransferencia}% de la operación).`
	});
}
