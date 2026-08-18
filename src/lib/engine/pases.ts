import { entraEnElMercado } from './sondeo';
import { club, clubes, contexto, salarioTipico } from '../../../content/mundo';
import { media } from './estado';
import { primaDeFirmaLibre } from './renovacion';
import { dtActualDe } from './mercado';
import { rngPara } from './rng';
import { brechaCon } from './temporada';
import { DESCUENTO_EN_EL_PASE, OFERTAS_EXTRA } from './salida';
import type { EntradaLog, Estado } from './tipos';

/**
 * El pase.
 *
 * Es el momento del juego. Todo lo demás —la pretemporada, la rueda de
 * ocasión, la temporada— existe para llegar acá con algo para vender.
 *
 * El mercado tiene dos tiempos y cada uno es de uno. Primero el representante:
 * de las seis ofertas que le llegan deja pasar tres, y cada una se juega su
 * probabilidad. Después el futbolista, que elige entre lo que quedó y elige
 * solo.
 *
 * Antes elegían los dos y el pase se hacía únicamente si coincidían. La idea
 * era obligarlos a hablar, pero lo que producía era otra cosa: la decisión más
 * importante del juego se resolvía por fuera del juego, y el representante no
 * tenía ningún trabajo propio acá —Bebo lo dijo jugando: "ahí el representante
 * no tiene ningún rol de negociación"—. Ahora sí lo tiene, y es anterior:
 * decide cuáles de estas ofertas van a existir. Ver `cartas.ts`.
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
	/** Prima por firmar, cuando llega libre. El club se ahorró el pase. */
	primaUsd: number;
};

export const QUEDARSE = 'quedarse';
/**
 * Cuántas ofertas hay sobre la mesa.
 *
 * Seis y no tres porque las primeras seis son las del representante, que tiene
 * que poder descartar: filtrar tres de tres no es filtrar. De esas seis pasan
 * como mucho tres, y son las que ve el futbolista. Ver `cartas.ts`.
 */
export const OFERTAS_POR_MERCADO = 6;

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

	/**
	 * Si en su club no juega, el mercado cambia de forma.
	 *
	 * El que está en el banco no necesita que le paguen más: necesita jugar. En
	 * la vida real ése es el que sale prestado o lo venden a un club más chico, y
	 * sin eso una carrera mal empezada no tiene arreglo: te quedás quince años
	 * mirando desde afuera sin que nadie te ofrezca nada. Con esto siempre hay
	 * una salida hacia abajo, y elegirla es una decisión de verdad —el
	 * representante cobra menos, el futbolista vuelve a jugar.
	 */
	const estaEnElBanco = brechaCon(f, f.contrato.clubId) < -6;

	/*
	 * Y si pidió salir, el mercado también cambia de forma. Ver `salida.ts`.
	 *
	 * Un jugador que dijo que se quiere ir es un jugador que se sabe que está en
	 * venta: lo llaman clubes que no lo habrían llamado —incluso por menos plata
	 * de la que gana hoy— y el suyo ya no está en condiciones de pedir lo que
	 * pediría por alguien que se quiere quedar.
	 */
	const seQuiereIr = estado.pidioLaSalida === true;

	/**
	 * Hasta dónde puede caer el que está en el banco.
	 *
	 * Sin esto, la salida hacia abajo no tenía fondo: un suplente del PSG que
	 * gana 24.000 por mes recibía ofertas de Alvarado y San Miguel por 4.100,
	 * porque el único filtro era "que allá seas titular" y donde más titular sos
	 * es en el club más chico del mundo. Nadie que juega en Francia se va a la
	 * Primera Nacional argentina para tener minutos: se va al Lyon, al Betis, al
	 * Sevilla.
	 *
	 * Los dos pisos dicen lo mismo desde dos lados. Se puede bajar el sueldo a la
	 * mitad para volver a jugar; no se puede bajar a un décimo. Y se puede bajar
	 * de liga; no se puede bajar dos mundos.
	 */
	const PLATA_QUE_SE_BANCA_PERDER = 0.4;
	const LIGAS_QUE_SE_PUEDE_BAJAR = 20;
	const ligaDeAca = contexto(f.contrato.clubId).liga.fuerza;

	/**
	 * Los que lo llamarían, con el piso puesto en `cuantoAfloja`.
	 *
	 * `cuantoAfloja` existe porque el piso no puede dejarlo sin salida: un
	 * media 60 en el PSG no tiene ningún club de Europa que lo haga titular, y si
	 * el piso lo deja sin ofertas se queda quince años mirando desde afuera, que
	 * es justamente lo que la rama del banco vino a evitar. Así que si con el
	 * piso estricto no aparece nadie, se afloja, y recién al final se saca.
	 */
	function losQueLoLlaman(cuantoAfloja: number, todoElMundo = false) {
		return clubes.filter((c) => {
			if (c.id === f.contrato.clubId) return false;
			if (c.prestigio > f.fama + 20) return false;
			// Dos continentes como mucho, y cuál es el segundo lo eligió el
			// representante en la pretemporada. Ver `sondeo.ts`.
			if (!todoElMundo && !entraEnElMercado(estado, c.id)) return false;

			const brechaAlla = brechaCon(f, c.id);
			const sueldo = salarioTipico(c.id, suMedia);

			if (estaEnElBanco) {
				// Lo que importa es que allá juegue, pero no a cualquier precio.
				if (brechaAlla <= 3) return false;
				// `cuantoAfloja` baja los dos pisos: cuanto más grande, más lejos se
				// puede caer.
				if (sueldo < (f.contrato.salarioMensual * PLATA_QUE_SE_BANCA_PERDER) / cuantoAfloja) {
					return false;
				}
				const ligaDeAlla = contexto(c.id).liga.fuerza;
				return ligaDeAlla >= ligaDeAca - LIGAS_QUE_SE_PUEDE_BAJAR * cuantoAfloja;
			}

			// Al que pidió salir lo llaman igual aunque le paguen lo mismo: lo que
			// busca no es plata, es irse.
			if (!seQuiereIr && sueldo < f.contrato.salarioMensual * 1.1) return false;

			// Y sobre todo: nadie compra a alguien que no puede jugar en su liga. Es
			// lo que hace que el salto a Europa haya que ganárselo y no elegirlo.
			return brechaAlla > (seQuiereIr ? -11 : -7);
		});
	}

	// Con el piso puesto; si no aparece nadie, aflojándolo; y si aun así nadie,
	// sin piso, que es como estaba antes: preferimos una oferta mala a ninguna.
	/*
	 * Con el piso puesto; si no aparece nadie, aflojándolo; y si aun así nadie,
	 * abriendo el mapa entero.
	 *
	 * El último escalón saltea los dos continentes a propósito. Acotar dónde
	 * busca el representante es una regla del juego, pero dejar a un jugador sin
	 * una sola oferta no es una regla, es un pozo: el que no juega y encima no
	 * recibe nada se queda quince años mirando desde afuera, que es justo lo que
	 * toda esta escalera vino a evitar. Cuando no hay nada cerca, aparece algo
	 * lejos, y el representante se entera de que su agenda no alcanzó.
	 */
	let interesados = losQueLoLlaman(1);
	if (interesados.length === 0) interesados = losQueLoLlaman(1, true);
	if (estaEnElBanco && interesados.length === 0) interesados = losQueLoLlaman(2.5, true);
	if (estaEnElBanco && interesados.length === 0) interesados = losQueLoLlaman(1000, true);

	if (interesados.length === 0) return [];

	// De los interesados se eligen tres, con preferencia por los que pagan más:
	// el mercado no es justo, pero tampoco es azar puro.
	// Si está en el banco, primero los clubes donde más va a jugar; si no, los
	// que más pagan.
	/*
	 * Estando en el banco se ordenaba por brecha, o sea: primero los clubes donde
	 * más titular vas a ser, que son siempre los más chicos que existen. Con el
	 * piso puesto arriba eso ya no llega a Alvarado, pero el orden seguía tirando
	 * para abajo dentro de lo permitido.
	 *
	 * Lo que busca el que no juega no es ser la figura del club más chico: es
	 * seguir jugando lo más arriba que pueda. Así que entre los que lo van a
	 * poner, primero los más grandes.
	 */
	const ordenados = [...interesados].sort((a, b) =>
		estaEnElBanco
			? b.prestigio - a.prestigio
			: salarioTipico(b.id, suMedia) - salarioTipico(a.id, suMedia)
	);
	/*
	 * De cuántos se sortea: la parte de arriba de la lista, no un número fijo.
	 *
	 * Eran veintiocho a secas, y funcionaba mientras la bolsa era el mundo
	 * entero: veintiocho de ochenta es el tercio de arriba. Al acotar el mercado
	 * a dos continentes (ver `sondeo.ts`) la bolsa se achicó a la mitad y esos
	 * mismos veintiocho pasaron a ser casi toda la lista, así que a un suplente
	 * del PSG le empezaron a llegar ofertas de clubes de mitad de tabla para
	 * abajo. Proporcional dice lo que se quería decir desde el principio: entre
	 * los mejores que lo llamarían.
	 */
	const cuantosEntran = Math.max(8, Math.min(28, Math.round(ordenados.length * 0.35)));
	const candidatos = ordenados.slice(0, Math.min(cuantosEntran, ordenados.length));

	const cuantas = OFERTAS_POR_MERCADO + (seQuiereIr ? OFERTAS_EXTRA : 0);
	const elegidos: string[] = [];
	while (elegidos.length < Math.min(cuantas, candidatos.length)) {
		const c = rng.elegir(candidatos);
		if (!elegidos.includes(c.id)) elegidos.push(c.id);
	}

	return elegidos
		.map((clubId): Oferta => {
			// Cuanto más contrato le queda, más caro sale sacarlo. Y si está libre
			// no cuesta nada: ésa es toda la apuesta de no renovar.
			const libre = f.contrato.temporadasRestantes === 0;
			const porContrato = libre ? 0 : 0.55 + f.contrato.temporadasRestantes * 0.28;
			const ganas = 0.8 + rng.entero(0, 60) / 100;
			// El que pidió salir vale menos para el que lo vende: el club ya perdió
			// la parte de la negociación en la que podía decir que no.
			const porElPedido = seQuiereIr ? DESCUENTO_EN_EL_PASE : 1;
			const monto = libre
				? 0
				: Math.max(
						20_000,
						Math.round((valor * porContrato * ganas * porElPedido) / 10_000) * 10_000
					);

			// Lo que ofrecen depende de para qué lo compran: si viene a ser titular
			// paga el precio del puesto, y si viene a competir por el puesto, menos.
			const brecha = brechaCon(f, clubId);
			const porRol = Math.max(0.4, Math.min(1.25, 1 + brecha / 22));
			const sueldo =
				Math.round(
					(salarioTipico(clubId, suMedia) * porRol * (0.85 + rng.entero(0, 40) / 100)) / 100
				) * 100;

			// Lo que el club se ahorra en el pase lo pone en la firma y en el
			// sueldo: por eso salir libre paga más aunque el club no gaste más.
			const prima = libre ? primaDeFirmaLibre(valor) : 0;

			return {
				clubId,
				montoUsd: monto,
				primaUsd: prima,
				// El que sale del banco suele resignar plata para volver a jugar.
				salarioMensual: Math.round(
					(estaEnElBanco ? sueldo : Math.max(f.contrato.salarioMensual + 100, sueldo)) *
						(libre ? 1.18 : 1)
				),
				temporadas: rng.entero(2, 4),
				// El representante cobra sobre la operación, y en un pase libre la
				// operación es la prima. Por eso no le da lo mismo que no renueve.
				comisionUsd: Math.round(
					((monto + prima) * estado.contratoRepresentacion.pctTransferencia) / 100
				),
				brecha: Math.round(brecha),
				tecnico: dtActualDe(clubId, estado.cambiosMundo)?.nombre ?? null
			};
		})
		.sort((a, b) => b.montoUsd + b.primaUsd - (a.montoUsd + a.primaUsd));
}

/**
 * Resuelve el mercado con lo que eligió el futbolista.
 *
 * Elige solo, y entre las ofertas que le llegaron. Antes elegían los dos y el
 * pase se hacía únicamente si coincidían: la decisión más importante del juego
 * se resolvía poniéndose de acuerdo por fuera del juego, y el representante no
 * tenía ningún trabajo propio en el mercado. Ahora lo tiene, y es anterior:
 * decide cuáles de estas ofertas van a existir. Ver `cartas.ts`.
 */
export function resolverPase(
	estado: Estado,
	ofertas: readonly Oferta[],
	eligeFutbolista: string | undefined,
	log: EntradaLog[]
): void {
	if (ofertas.length === 0) return;

	const elegido = eligeFutbolista ?? QUEDARSE;

	// Se queda: no pasa nada, y está bien que no pase nada.
	//
	// Salvo que no haya con qué quedarse. Con el contrato terminado, "quedarse"
	// es un deseo y no un hecho: lo decide la mesa de renovación, y contarlo acá
	// como cerrado era una mentira que el propio diario desmentía tres líneas
	// más abajo —"se quedó, los dos estuvieron de acuerdo" y enseguida "hubo que
	// firmar a las apuradas", en la misma temporada y para otro club—. Es el bug
	// que encontró Bebo. Ver `buscarEquipo` en `fases.ts`.
	if (elegido === QUEDARSE) {
		const cuantas = `${ofertas.length} ${ofertas.length === 1 ? 'oferta' : 'ofertas'}`;
		log.push({
			tipo: 'mercado',
			visiblePara: 'ambos',
			texto:
				estado.futbolista.contrato.temporadasRestantes > 0
					? `Le llegaron ${cuantas} y se quedó en ${club(estado.futbolista.contrato.clubId).nombre}.`
					: `Le llegaron ${cuantas} y las dejó pasar: quería seguir en ` +
						`${club(estado.futbolista.contrato.clubId).nombre}. Falta que el club diga que sí.`
		});
		return;
	}

	const oferta = ofertas.find((o) => o.clubId === elegido);
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
	// Nunca menos de lo que vale de verdad. Un pase libre o firmado apurado no
	// cuesta nada, y sin este piso el jugador quedaba tasado en cero justo
	// después de cambiar de club, que es cuando más se mira el número.
	f.valorMercadoUsd = Math.max(valorDeMercado(estado), oferta.montoUsd, oferta.primaUsd * 4);

	// La prima por llegar libre es del futbolista: se la paga el club que lo
	// firma, y es la única plata del juego que entra sin que nadie venda nada.
	if (oferta.primaUsd > 0) {
		f.dineroUsd += oferta.primaUsd;
	}

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
			(oferta.montoUsd > 0
				? `por USD ${oferta.montoUsd.toLocaleString('es-AR')}. `
				: `libre, sin que ${desde} cobre un peso. `) +
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
