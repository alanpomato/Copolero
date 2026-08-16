import { alertaDe, type Alerta } from './alertas';
import {
	INTENSIDADES,
	PLANES,
	type PerfilDeIntensidad,
	type PlanDeEntrenamiento
} from './entrenamiento';
import { accionesDe } from './gestion';
import { ocasionesDe, type Ocasion } from './ocasiones';
import { ofertasPara, valorDeMercado, type Oferta } from './pases';
import {
	TRATOS,
	loQueLeConviene,
	tocaRenegociar,
	tratosQuePuedePedir,
	type Trato
} from './representacion';
import { portadaDe, type Portada } from './portada';
import { resumirRetiro, type Retiro } from './retiro';
import { chanceDeConvocatoria, loQueFalta, proximoMundial } from './seleccion';
import { brechaCon } from './temporada';
import type { Estado, HitoTemporada, Rol } from './tipos';

/**
 * Lo que hay para decidir en esta fase, para este rol.
 *
 * Vive en el motor y no en las rutas por dos motivos: es puro y determinista
 * —la pantalla y la resolución piden lo mismo y les sale lo mismo—, y así el
 * servidor puede armar la vista de cada rol sin que se le escape nada del otro.
 */

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
	/** Futbolista, fase 2. */
	ocasiones?: Ocasion[];
	/** Representante, fases 1 y 2. */
	gestiones?: GestionVisible[];
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
	/** Lo que hay que decirle en la cara, si hay algo. Ver `alertas.ts`. */
	alerta?: Alerta;
	/** La tapa del diario del año que cerró. Solo en pretemporada. */
	portada?: Portada;
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

	if (rol === 'futbolista') {
		if (estado.fase === 1) {
			opciones.planes = PLANES;
			opciones.intensidades = INTENSIDADES;
		} else if (estado.fase === 2) {
			opciones.ocasiones = ocasionesDe(estado, semilla);
		}
	} else if (estado.fase === 1 || estado.fase === 2) {
		opciones.gestiones = accionesDe(estado.fase).map((a) => ({
			id: a.id,
			nombre: a.nombre,
			detalle: a.detalle,
			probabilidad: a.probabilidad(estado)
		}));
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
		opciones.ofertas = ofertasPara(estado, semilla);
		opciones.valorDeMercadoUsd = valorDeMercado(estado);
		opciones.brechaActual = Math.round(
			brechaCon(estado.futbolista, estado.futbolista.contrato.clubId)
		);
	}

	return opciones;
}
