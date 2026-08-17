import { alertaDe, type Alerta } from './alertas';
import {
	INTENSIDADES,
	PLANES,
	type PerfilDeIntensidad,
	type PlanDeEntrenamiento
} from './entrenamiento';
import { accionesDe } from './gestion';
import { ocasionesDe, type Ocasion } from './ocasiones';
import {
	carismaDe,
	cuantoSalvaElCarisma,
	momentosDelRepresentante,
	type MomentoDelRepresentante
} from './momentos';
import { gastoAnual, loQuePuedeComprar, loQueTiene, type EnLaVidriera } from './inversiones';
import {
	loQueVaAPasar,
	objetivo as objetivoPorId,
	objetivosPara,
	type Objetivo
} from './objetivos';
import { rasgo, rasgosQueLeTocaron, tocaElegirRasgo, type Rasgo } from './rasgos';
import {
	comoVaElSueno,
	paraLaPantalla,
	suenosPara,
	tocaElegirSueno,
	type Progreso,
	type SuenoOfrecido
} from './suenos';
import { ofertasPara, valorDeMercado, type Oferta } from './pases';
import {
	TRATOS,
	loQueLeConviene,
	tocaRenegociar,
	tratosQuePuedePedir,
	type Trato
} from './representacion';
import { portadaDe, type Portada } from './portada';
import {
	comoLlegaAlMercado,
	ofertaDeRenovacion,
	tocaRenovar,
	type OfertaDeRenovacion
} from './renovacion';
import { resumirRetiro, type Retiro } from './retiro';
import { loQuePasaSiLoPide, puedePedirLaSalida } from './salida';
import { chanceDeConvocatoria, loQueFalta, proximoMundial } from './seleccion';
import { brechaCon } from './temporada';
import { elOtroRol } from './estado';
import type { Estado, HitoTemporada, Rol } from './tipos';

/**
 * Lo que hay para decidir en esta fase, para este rol.
 *
 * Vive en el motor y no en las rutas por dos motivos: es puro y determinista
 * —la pantalla y la resolución piden lo mismo y les sale lo mismo—, y así el
 * servidor puede armar la vista de cada rol sin que se le escape nada del otro.
 */

/**
 * Una tirada de la rueda que ya ocurrió.
 *
 * Vive acá y no en el servidor porque la pantalla la necesita: es lo que le
 * permite mostrar la ruleta frenada donde corresponde cuando el jugador
 * recarga. Quién la escribe y por qué es irrevocable es asunto del servidor;
 * la forma que tiene al llegar al navegador es asunto de este módulo.
 */
export type Tirada = {
	indice: number;
	ocasionId: string;
	opcionId: string;
	salio: boolean;
	texto: string;
};

export type GestionVisible = {
	id: string;
	nombre: string;
	detalle: string;
	probabilidad: number;
};

export type OpcionesDeFase = {
	/** Futbolista, fase 1. */
	planes?: PlanDeEntrenamiento[];
	intensidades?: PerfilDeIntensidad[];
	/**
	 * Los tres rasgos que le tocaron, la primera pretemporada y nunca más.
	 *
	 * `elegido` es el que ya tiene: se muestra siempre, porque es lo que lo
	 * define y hay que poder mirarlo veinte temporadas después.
	 */
	rasgos?: Rasgo[];
	rasgoElegido?: Rasgo;
	/**
	 * Para qué está jugando. Ver `suenos.ts`.
	 *
	 * `suenos` son los que puede elegir, solo la primera pretemporada.
	 * `miSueno` es cómo va el suyo y va siempre: es el número que hace volver.
	 * `elSuenoDelOtro` va siempre también, y a propósito: saber para dónde tira
	 * el otro es lo que hace que la charla del mercado tenga de qué agarrarse.
	 */
	suenos?: SuenoOfrecido[];
	miSueno?: Progreso;
	elSuenoDelOtro?: Progreso & { deQuien: string };
	/** Futbolista, fase 1: cómo va a jugar el año, y qué dice de lo elegido. */
	objetivos?: Objetivo[];
	consejoDelObjetivo?: string;
	/** Y en la fase 2, el que ya eligió: se ve, no se cambia. */
	objetivoCerrado?: Objetivo;
	/** Futbolista, fase 2: si puede pedir salir, y qué le va a costar. */
	salida?: { seVa: boolean; aviso: string };
	/** Futbolista, fase 2. */
	ocasiones?: Ocasion[];
	/** Representante, fases 1 y 2. */
	gestiones?: GestionVisible[];
	/** Representante, fase 2: sus propios momentos del año. Ver `momentos.ts`. */
	momentos?: MomentoDelRepresentante[];
	/** Cuánto le salva el carisma cuando algo sale mal, para poder mostrarlo. */
	carisma?: { cuanto: number; salva: number };
	/** Los dos, fase 3. */
	ofertas?: Oferta[];
	valorDeMercadoUsd?: number;
	/** Cuánto va a jugar donde está hoy. Se muestra para poder comparar. */
	brechaActual?: number;
	/** Cuando la carrera terminó, los dos puntajes y el cierre. */
	retiro?: Retiro;
	/** Cómo lo ve el club donde está. Se muestra siempre. */
	situacion?: { brecha: number; texto: string; tono: string };
	/** Cuando vence el contrato entre los dos: los tratos sobre la mesa. */
	tratos?: Trato[];
	consejo?: string;
	/**
	 * La mesa con el club, cuando el contrato está por vencer.
	 *
	 * `oferta` en `null` significa que el club no lo quiere renovar, que también
	 * hay que mostrarlo: es la señal más clara de que hay que moverse.
	 */
	renovacion?: { oferta: OfertaDeRenovacion | null; libre: boolean };
	/** En qué puede gastar la plata, qué ya tiene y cuánto se le va por año. */
	inversiones?: {
		puedeComprar: EnLaVidriera[];
		tiene: EnLaVidriera[];
		plataUsd: number;
		gastoAnualUsd: number;
	};
	/** El otro pibe de la camada y cómo va el duelo. Ver `rival.ts`. */
	rival?: {
		nombre: string;
		clubId: string;
		goles: number;
		asistencias: number;
		ganadasPorVos: number;
		ganadasPorEl: number;
	};
	/** Lo que hay que decirle en la cara, si hay algo. Ver `alertas.ts`. */
	alerta?: Alerta;
	/** La tapa del diario del año que cerró. Solo en pretemporada. */
	portada?: Portada;
	/** Y lo que se movió en el mundo mientras tanto. Ver `Novedades.svelte`. */
	novedades?: {
		tipo: string;
		nombre: string;
		desde: string | null;
		hacia: string | null;
		texto: string;
	}[];
	/** La carrera entera, para dibujarla. */
	historial?: HitoTemporada[];
	/** El Mundial que viene y qué tan cerca está de jugarlo. */
	mundial?: {
		anio: number;
		faltan: number;
		chance: number;
		queFalta: string;
		yaJugados: number;
		campeon: boolean;
	};
};

/**
 * Cómo lo ve el club donde está: titular, suplente o figura.
 *
 * Es el número que explica todo lo demás —cuántos partidos juega, cuántos goles
 * mete, si le llegan ofertas— y hasta ahora solo se veía en el mercado. Verlo
 * siempre es lo que convierte "me fue mal" en "estoy grande para este club".
 */
export function comoLoVeSuClub(estado: Estado): { brecha: number; texto: string; tono: string } {
	const brecha = Math.round(brechaCon(estado.futbolista, estado.futbolista.contrato.clubId));
	if (brecha >= 12) return { brecha, texto: 'Sos la figura del equipo', tono: 'bien' };
	if (brecha >= 4) return { brecha, texto: 'Titular indiscutido', tono: 'bien' };
	if (brecha >= -3) return { brecha, texto: 'Peleás el puesto', tono: 'medio' };
	if (brecha >= -12) return { brecha, texto: 'Entrás desde el banco', tono: 'mal' };
	return { brecha, texto: 'Te quedó grande el club', tono: 'mal' };
}

export function opcionesDeFase(estado: Estado, rol: Rol, semilla: string): OpcionesDeFase {
	// Terminada la carrera no hay nada que decidir: lo único que queda es el
	// final, que es la pantalla más importante del juego.
	if (estado.carreraTerminada) return { retiro: resumirRetiro(estado) };

	const opciones: OpcionesDeFase = {};

	// Cuando vence el contrato entre los dos, la pretemporada es la mesa. El
	// futbolista ve todos los tratos —elige su techo— y el representante solo
	// los que su prestigio le permite pedir.
	if (estado.fase === 1 && tocaRenegociar(estado)) {
		opciones.tratos = rol === 'futbolista' ? TRATOS : tratosQuePuedePedir(estado);
		opciones.consejo = rol === 'futbolista' ? loQueLeConviene(estado) : undefined;
	}

	// La mesa con el club. La ven los dos con los mismos números, porque tienen
	// que elegir lo mismo para que pase algo.
	if (estado.fase === 1 && tocaRenovar(estado)) {
		opciones.renovacion = {
			oferta: ofertaDeRenovacion(estado, semilla),
			libre: estado.futbolista.contrato.temporadasRestantes === 0
		};
	}

	// Lo que es, que se muestra siempre una vez elegido.
	const suRasgo = rasgo(estado.rasgo);
	if (suRasgo) opciones.rasgoElegido = suRasgo;

	// Para qué está jugando. Se elige una vez y después se mira todas las fases
	// hasta el final de la partida.
	if (estado.fase === 1 && tocaElegirSueno(estado, rol)) {
		opciones.suenos = suenosPara(estado, rol).map(paraLaPantalla);
	}
	const miSueno = comoVaElSueno(estado, rol);
	if (miSueno) opciones.miSueno = miSueno;

	const otro = elOtroRol(rol);
	const delOtro = comoVaElSueno(estado, otro);
	if (delOtro) {
		opciones.elSuenoDelOtro = {
			...delOtro,
			deQuien: otro === 'futbolista' ? estado.futbolista.nombre : estado.representante.nombre
		};
	}

	if (rol === 'futbolista') {
		if (estado.fase === 1 && tocaElegirRasgo(estado)) {
			opciones.rasgos = rasgosQueLeTocaron(estado, semilla);
		}
		if (estado.fase === 1) {
			opciones.planes = PLANES;
			opciones.intensidades = INTENSIDADES;
			// El plan de juego se decide antes de que arranque el campeonato, no con
			// el campeonato empezado.
			opciones.objetivos = objetivosPara(estado.futbolista.posicion);
			opciones.consejoDelObjetivo = loQueVaAPasar(estado, undefined);
		} else if (estado.fase === 2) {
			opciones.ocasiones = ocasionesDe(estado, semilla);
			// Pedir salir del club: se pide durante la temporada y se cobra en el
			// mercado que viene.
			if (puedePedirLaSalida(estado)) {
				opciones.salida = { seVa: estado.pidioLaSalida, aviso: loQuePasaSiLoPide(estado) };
			}
			// Ya está elegido y cerrado: se muestra para saber con qué se juega, pero
			// no se toca.
			opciones.objetivoCerrado = objetivoPorId(estado.objetivoDelAnio);
		}
	} else if (estado.fase === 1 || estado.fase === 2) {
		if (estado.fase === 2) {
			// Lo que le pasa a él y el otro no ve. Ver `momentos.ts`.
			opciones.momentos = momentosDelRepresentante(estado, semilla);
			opciones.carisma = { cuanto: carismaDe(estado), salva: cuantoSalvaElCarisma(estado) };
		}
		opciones.gestiones = accionesDe(estado.fase).map((a) => ({
			id: a.id,
			nombre: a.nombre,
			detalle: a.detalle,
			probabilidad: a.probabilidad(estado)
		}));
	}

	// En qué gastar la plata, en pretemporada. Cada uno ve solo lo suyo: es la
	// única decisión del juego que no necesita al otro.
	if (estado.fase === 1) {
		opciones.inversiones = {
			puedeComprar: loQuePuedeComprar(estado, rol),
			tiene: loQueTiene(estado, rol),
			plataUsd: rol === 'futbolista' ? estado.futbolista.dineroUsd : estado.representante.dineroUsd,
			gastoAnualUsd: gastoAnual(estado, rol)
		};
	}

	// El otro de la camada, siempre. Un rival del que no te acordás no es un
	// rival: tiene que estar a la vista aunque no haya pasado nada este año.
	if (estado.rival) {
		opciones.rival = {
			nombre: estado.rival.nombre,
			clubId: estado.rival.clubId,
			goles: estado.rival.goles,
			asistencias: estado.rival.asistencias,
			ganadasPorVos: estado.rival.ganadasPorVos,
			ganadasPorEl: estado.rival.ganadasPorEl
		};
	}

	// Cómo lo ve su club se muestra siempre, en las tres fases: es el número que
	// explica por qué juega poco o por qué no le llegan ofertas.
	opciones.situacion = comoLoVeSuClub(estado);

	// Y si algo está yendo mal, se dice. Una sola cosa por vez.
	const alerta = alertaDe(estado, rol);
	if (alerta) opciones.alerta = alerta;

	// La carrera dibujada va siempre: es donde se ve si está subiendo o bajando,
	// y una curva de doce temporadas es lo que hace que uno quiera la trece.
	opciones.historial = estado.historial ?? [];

	// La tapa del año que cerró, solo en pretemporada. Es lo primero que se ve
	// al abrir la temporada nueva y lo único que convierte "nota 8.1" en algo
	// que se siente.
	if (estado.fase === 1) {
		const portada = portadaDe(estado);
		if (portada) opciones.portada = portada;
		// Y lo que pasó en el mundo mientras tanto, que llega con la tapa: son las
		// noticias del mismo día.
		opciones.novedades = estado.novedades ?? [];
	}

	// Y el Mundial, siempre también. Es lo único que se espera, y ver cuánto
	// falta desde la primera temporada es la mitad de la gracia.
	const anioDelMundial = proximoMundial(estado.anio);
	opciones.mundial = {
		anio: anioDelMundial,
		faltan: anioDelMundial - estado.anio,
		chance: chanceDeConvocatoria(estado),
		queFalta: loQueFalta(estado),
		yaJugados: estado.seleccion?.mundiales.length ?? 0,
		campeon: (estado.seleccion?.mundiales ?? []).some((m) => m.resultado === 'campeon')
	};

	// El mercado lo ven los dos, con exactamente los mismos números. Es a
	// propósito: la regla es que tienen que elegir lo mismo, así que tienen que
	// estar mirando lo mismo.
	if (estado.fase === 3) {
		// Con el año ya descontado del contrato, que es como va a estar cuando el
		// mercado se resuelva. Si acá se mirara el contrato sin descontar, la
		// pantalla mostraría un pase millonario y después se firmaría uno libre.
		const enElMercado = comoLlegaAlMercado(estado);
		opciones.ofertas = ofertasPara(enElMercado, semilla);
		opciones.valorDeMercadoUsd = valorDeMercado(enElMercado);
		opciones.brechaActual = Math.round(
			brechaCon(estado.futbolista, estado.futbolista.contrato.clubId)
		);

		// Y lo que le pasa a cada uno mientras se define el pase. Uno solo, y
		// distinto para cada rol: al futbolista lo para un hincha en la calle, al
		// representante lo llaman por abajo de la mesa. Va antes de elegir club
		// porque es parte de con qué se llega a esa charla.
		if (rol === 'futbolista') {
			opciones.ocasiones = ocasionesDe(estado, semilla);
		} else {
			opciones.momentos = momentosDelRepresentante(estado, semilla);
			opciones.carisma = { cuanto: carismaDe(estado), salva: cuantoSalvaElCarisma(estado) };
		}
	}

	return opciones;
}
