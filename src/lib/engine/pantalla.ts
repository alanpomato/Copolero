import {
	INTENSIDADES,
	PLANES,
	type PerfilDeIntensidad,
	type PlanDeEntrenamiento
} from './entrenamiento';
import { accionesDe } from './gestion';
import { ocasionesDe, type Ocasion } from './ocasiones';
import { ofertasPara, valorDeMercado, type Oferta } from './pases';
import { brechaCon } from './temporada';
import type { Estado, Rol } from './tipos';

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
};

export function opcionesDeFase(estado: Estado, rol: Rol, semilla: string): OpcionesDeFase {
	if (estado.carreraTerminada) return {};

	const opciones: OpcionesDeFase = {};

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

	// El mercado lo ven los dos, con exactamente los mismos números. Es a
	// propósito: la regla es que tienen que elegir lo mismo, así que tienen que
	// estar mirando lo mismo.
	if (estado.fase === 3) {
		opciones.ofertas = ofertasPara(estado, semilla);
		opciones.valorDeMercadoUsd = valorDeMercado(estado);
		opciones.brechaActual = Math.round(brechaCon(estado.futbolista, estado.futbolista.contrato.clubId));
	}

	return opciones;
}
