import { alertaDe, type Alerta } from './alertas';
import {
	INTENSIDADES,
	planesPara,
	type PerfilDeIntensidad,
	type PlanDeEntrenamiento
} from './entrenamiento';
import { accionesDe, probabilidadDe, type LoQueMueve } from './gestion';
import { ocasionesDe, type Ocasion } from './ocasiones';
import {
	carismaDe,
	cuantoSalvaElCarisma,
	momentosDelRepresentante,
	type MomentoDelRepresentante
} from './momentos';
import { gastoAnual, loQuePuedeComprar, loQueTiene, type EnLaVidriera } from './inversiones';
import { objetivo as objetivoPorId, type Objetivo } from './objetivos';
import { rasgo, rasgosQueLeTocaron, tocaElegirRasgo, type Rasgo } from './rasgos';
import { cuantoLlega, dondePuedeSondear, laDeCasa, type Destino } from './sondeo';
import {
	comoVaElSueno,
	paraLaPantalla,
	suenosPara,
	tocaElegirSueno,
	type Progreso,
	type SuenoOfrecido
} from './suenos';
import { ofertasPara, valorDeMercado, type Oferta } from './pases';
import { CARTAS_QUE_DEJA_PASAR, cartasDelMercado, loQueValenJuntos, type Carta } from './cartas';
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
import { pasoDelMercado, quienesDeciden } from './fases';
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
	/** Qué mueve si sale y qué mueve si no. Ver `gestion.ts`. */
	siSale: LoQueMueve;
	siFalla: LoQueMueve;
	/** Lo que no entra en un número: "una temporada más", "un representado". */
	ademas?: { siSale?: string; siFalla?: string };
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
	/** Y en la fase 2, el que salió sorteado en la pretemporada: se ve, no se cambia. */
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
	/**
	 * Futbolista, segundo tiempo del mercado: entre las que le llegaron.
	 *
	 * Las que le llegaron y nada más: de las seis que hubo sobre la mesa no se
	 * entera nunca. Ver `cartas.ts`.
	 */
	ofertas?: Oferta[];

	/**
	 * Representante, primer tiempo del mercado: las seis, con su probabilidad.
	 *
	 * Es su trabajo del año y es lo único que decide en el mercado: cuáles deja
	 * pasar. El futbolista no las ve.
	 */
	cartas?: Carta[];
	/** Cuántas puede dejar pasar de esas seis. */
	cuantasDejaPasar?: number;
	/** La calificación con la que se mide contra la fama de cada club. */
	loQueValenJuntos?: number;
	/**
	 * Representante, segundo tiempo del mercado: qué pasó con las que filtró.
	 *
	 * Ya elegido y jugado —"cada una se juega su probabilidad por separado"— así
	 * que esto no es una tirada nueva, es el resultado de la que ya hizo. Sin
	 * esto, después de filtrar no veía nada propio hasta que el futbolista
	 * eligiera: el filtro pasaba y la pantalla no decía con qué cara.
	 */
	filtroResuelto?: { llegaron: string[]; seCayeron: string[] };

	/**
	 * En qué tiempo del mercado está y a quién le toca.
	 *
	 * La fase 3 dejó de ser simétrica, así que la pantalla necesita saber si
	 * está esperando o si le toca. Ver `quienesDeciden`.
	 */
	mercado?: {
		paso: 'filtro' | 'eleccion';
		meToca: boolean;
		/** Cuántas dejó pasar el representante y cuántas prosperaron de verdad. */
		llegaron: number;
		seCayeron: number;
	};
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
	/**
	 * Lo que ya compró, en todas las fases.
	 *
	 * Aparte de `inversiones.tiene`, que sólo existe en la pretemporada porque
	 * vive adentro de la vidriera. Esto es lo que se ve siempre.
	 */
	loQueTengo?: EnLaVidriera[];
	/**
	 * Representante, fase 1: en qué continente sale a buscar este año.
	 *
	 * Dos como mucho —el de casa y el que elija— y a Europa hay que llegar. Ver
	 * `sondeo.ts`.
	 */
	sondeo?: { elegido: string; destinos: Destino[]; alcance: number };
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
			// Tres y no seis: ver `planesPara`.
			opciones.planes = planesPara(estado.futbolista.posicion, estado.temporada);
			opciones.intensidades = INTENSIDADES;
			// "Cómo vas a jugar el año" ya no se elige acá: sale sorteado al cerrar
			// la fase, pesado por la intensidad. Ver `objetivoPorAzar` en `fases.ts`.
		} else if (estado.fase === 2) {
			opciones.ocasiones = ocasionesDe(estado, semilla);
			// Pedir salir del club: se pide durante la temporada y se cobra en el
			// mercado que viene.
			if (puedePedirLaSalida(estado)) {
				opciones.salida = { seVa: estado.pidioLaSalida, aviso: loQuePasaSiLoPide(estado) };
			}
			// Ya salió sorteado en la pretemporada: se muestra para saber con qué se
			// juega, pero no se toca.
			opciones.objetivoCerrado = objetivoPorId(estado.objetivoDelAnio);
		}
	} else if (estado.fase === 1 || estado.fase === 2) {
		if (estado.fase === 2) {
			// Lo que le pasa a él y el otro no ve. Ver `momentos.ts`.
			opciones.momentos = momentosDelRepresentante(estado, semilla);
			opciones.carisma = { cuanto: carismaDe(estado), salva: cuantoSalvaElCarisma(estado) };
		}
		/*
		 * Y solo si hay alguna. Con la gestión limitada a la pretemporada,
		 * `accionesDe(2)` devuelve una lista vacía, y una lista vacía es
		 * `truthy`: la pantalla dibujaba el bloque "Qué hacés esta fase" sin nada
		 * adentro. Lo que no hay no se manda.
		 */
		/*
		 * Y dónde sale a buscar este año.
		 *
		 * Sólo en la pretemporada: se elige antes de que arranque el año y se
		 * cobra recién en el mercado, que es lo que hace que sea una apuesta.
		 * Ver `sondeo.ts`.
		 */
		if (estado.fase === 1) {
			opciones.sondeo = {
				elegido: estado.sondeo ?? laDeCasa(estado),
				destinos: dondePuedeSondear(estado),
				alcance: cuantoLlega(estado)
			};
		}

		const suyas = accionesDe(estado.fase);
		if (suyas.length > 0) {
			opciones.gestiones = suyas.map((a) => ({
				id: a.id,
				nombre: a.nombre,
				detalle: a.detalle,
				probabilidad: probabilidadDe(a, estado),
				siSale: a.siSale,
				siFalla: a.siFalla,
				ademas: a.ademas
			}));
		}
	}

	/*
	 * Lo que ya tiene comprado, en todas las fases.
	 *
	 * Alan lo encontró jugando: "los consumibles está bien que aparezcan solo en
	 * pretemporada, pero después se borran y no sabés qué tenés. Además comprás
	 * un centro de entrenamiento y debería aparecer en algún lado". Tenía razón
	 * y era literal: la lista de lo comprado vivía adentro de la vidriera, y la
	 * vidriera sólo existe en la pretemporada. Comprar y que la compra
	 * desaparezca de la pantalla es comprar al vacío.
	 */
	const tiene = loQueTiene(estado, rol);
	if (tiene.length > 0) opciones.loQueTengo = tiene;

	// En qué gastar la plata, en pretemporada. Cada uno ve solo lo suyo: es la
	// única decisión del juego que no necesita al otro.
	if (estado.fase === 1) {
		opciones.inversiones = {
			puedeComprar: loQuePuedeComprar(estado, rol, semilla),
			tiene,
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

	/*
	 * El mercado, en dos tiempos y cada uno de uno.
	 *
	 * Antes lo veían los dos con los mismos números, porque la regla era que
	 * tenían que elegir lo mismo. Ya no: primero el representante deja pasar
	 * hasta tres de las seis que le llegaron, y recién después el futbolista
	 * elige entre las que prosperaron. Cada uno ve lo suyo y nada más, y eso es
	 * la mitad de por qué el filtro pesa: el futbolista no sabe qué descartó el
	 * otro. Ver `cartas.ts`.
	 */
	if (estado.fase === 3) {
		// Con el año ya descontado del contrato, que es como va a estar cuando el
		// mercado se resuelva. Si acá se mirara el contrato sin descontar, la
		// pantalla mostraría un pase millonario y después se firmaría uno libre.
		const enElMercado = comoLlegaAlMercado(estado);
		const paso = pasoDelMercado(estado);
		const meToca = quienesDeciden(estado).includes(rol);

		opciones.valorDeMercadoUsd = valorDeMercado(enElMercado);
		opciones.brechaActual = Math.round(
			brechaCon(estado.futbolista, estado.futbolista.contrato.clubId)
		);
		opciones.mercado = {
			paso,
			meToca,
			llegaron: estado.mercado?.llegaron.length ?? 0,
			seCayeron: estado.mercado?.seCayeron.length ?? 0
		};

		if (rol === 'representante') {
			if (paso === 'filtro') {
				opciones.cartas = cartasDelMercado(enElMercado, semilla);
				opciones.cuantasDejaPasar = CARTAS_QUE_DEJA_PASAR;
				opciones.loQueValenJuntos = loQueValenJuntos(enElMercado);
			} else if (paso === 'eleccion') {
				// Ya filtró y ya se jugó cada probabilidad: esto es leer el resultado,
				// no volver a tirar. Mientras el futbolista elige, él mira con qué cara
				// quedaron las que movió.
				opciones.filtroResuelto = {
					llegaron: estado.mercado?.llegaron ?? [],
					seCayeron: estado.mercado?.seCayeron ?? []
				};
			}
			// Sus momentos del mercado van en el primer tiempo, que es cuando
			// trabaja: lo llaman por abajo de la mesa mientras decide a quién
			// contesta el teléfono.
			opciones.momentos = momentosDelRepresentante(estado, semilla);
			opciones.carisma = { cuanto: carismaDe(estado), salva: cuantoSalvaElCarisma(estado) };
		} else if (paso === 'eleccion') {
			// Las que llegaron, sin probabilidades: de su lado ya no se apuesta
			// nada, se elige. Con escudo, sueldo, pase y años.
			const llegaron = estado.mercado?.llegaron ?? [];
			opciones.ofertas = ofertasPara(enElMercado, semilla).filter((o) =>
				llegaron.includes(o.clubId)
			);
			// Y su momento del mercado, que es lo suyo mientras decide.
			opciones.ocasiones = ocasionesDe(estado, semilla);
		}
	}

	return opciones;
}
