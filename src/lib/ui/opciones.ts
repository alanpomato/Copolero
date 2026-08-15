import { clubes, ligas, paises, contexto } from '../../../content/mundo';

/**
 * Las listas que llenan los `select` de la pantalla de creación.
 *
 * Vienen del mundo, así que si mañana se agrega una liga aparece sola en el
 * formulario sin tocar nada acá.
 */

export type GrupoDeClubes = {
	etiqueta: string;
	paisId: string;
	clubes: { id: string; nombre: string }[];
};

/**
 * Todos los clubes agrupados por liga, ordenados como la escalera de la
 * carrera: primero lo más chico, que es de donde se arranca. Dentro de cada
 * liga, alfabético.
 */
export function clubesPorLiga(): GrupoDeClubes[] {
	return [...ligas]
		.sort((a, b) => a.fuerza - b.fuerza)
		.map((liga) => {
			const pais = paises.find((p) => p.id === liga.paisId)!;
			return {
				etiqueta: `${pais.nombre} · ${liga.nombre}`,
				paisId: pais.id,
				clubes: clubes
					.filter((c) => c.ligaId === liga.id)
					.map((c) => ({ id: c.id, nombre: c.nombre }))
					.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
			};
		});
}

/** Nacionalidades para elegir, como se escriben en el contenido. */
export function nacionalidades(): string[] {
	return paises.map((p) => p.nombre).sort((a, b) => a.localeCompare(b, 'es'));
}

/** ¿Existe ese club? Lo usa el servidor antes de crear la partida. */
export function esClubValido(id: string): boolean {
	try {
		contexto(id);
		return true;
	} catch {
		return false;
	}
}

/**
 * Dónde arranca una carrera por defecto: un club del Ascenso argentino.
 * Es el escalón más bajo del mundo y el que hace que subir se sienta.
 */
export const CLUB_POR_DEFECTO = 'ar2-moron';
