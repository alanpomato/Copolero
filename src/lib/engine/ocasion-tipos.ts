import { club } from '../../../content/mundo';
import type { Atributos } from './tipos';

/**
 * Los ladrillos de un momento del futbolista.
 *
 * Están acá y no en `ocasiones.ts` por una razón práctica: la batería de
 * momentos creció de veintiséis a más de cincuenta y ya no entra cómoda en un
 * archivo. Separando los tipos y las dos o tres funciones que usa todo el
 * contenido, las plantillas se pueden repartir en varios archivos sin que
 * ninguno tenga que importar a otro de vuelta.
 */

/** Lo que mueve una ocasión cuando sale, o cuando no. */
export type Efecto = {
	goles?: number;
	asistencias?: number;
	fama?: number;
	moral?: number;
	dt?: number;
	hinchada?: number;
	prensa?: number;
	confianza?: number;
	desgaste?: number;
};

export type Opcion = {
	id: string;
	etiqueta: string;
	/** Qué significa elegir esto. Se muestra abajo del botón. */
	detalle: string;
	/** 0–100. Se muestra siempre: es el corazón del minijuego. */
	probabilidad: number;
	siSale: string;
	siFalla: string;
	premio: Efecto;
	castigo: Efecto;
};

/**
 * Con qué se juega este momento.
 *
 * Los tres momentos del año eran siempre la misma rueda, y tres temporadas más
 * tarde ya no se miraba: se elegía la opción de arriba y se apretaba. Un
 * minijuego que se repite quince años seguidos deja de ser un minijuego.
 *
 * Así que cada momento se juega con lo que le corresponde. No es variedad por
 * variedad: un penal no es una ruleta, es un arco con alguien adentro; y una
 * charla con el técnico no es un arco, es una tirada contra tu número. Lo que
 * cambia es la forma de mirar la misma probabilidad, que sigue siendo la de
 * verdad en los tres casos.
 *
 *  - `ruleta`: la rueda que gira. Para lo que pasa con la pelota en movimiento.
 *  - `arco`:   el arco y el que ataja. Para definir, patear y atajar.
 *  - `dado`:   un número contra el tuyo. Para lo que se juega fuera de la cancha.
 *  - `quiz`:   una charla en la que hay que contestar. Para los momentos del
 *              representante, donde lo que se juega es lo que se dice.
 */
export type Minijuego = 'ruleta' | 'arco' | 'dado' | 'quiz';

/**
 * De qué es este momento.
 *
 * Alan lo pidió con la lista adentro: "no pueden ser siempre lo mismo, tenemos
 * que tener una batería de momentos (sociales, prensa, lesiones, comidas,
 * incluso cosas turbias, momento del partido, árbitros, tarjetas, etc.)".
 *
 * La familia no es una etiqueta decorativa: es lo que usa el sorteo para que
 * en la misma temporada no caigan dos momentos del mismo palo. Tener veinte
 * momentos no sirve de nada si el año te toca tres veces la prensa.
 */
export type Familia =
	| 'partido'
	| 'arbitro'
	| 'lesion'
	| 'prensa'
	| 'social'
	| 'mesa'
	| 'turbio'
	| 'vestuario'
	| 'plata';

export type Ocasion = {
	id: string;
	titulo: string;
	/** El planteo, ya narrado y con los nombres reales del mundo. */
	contexto: string;
	/** Con qué se juega. Lo decide el momento, no la pantalla. */
	juego: Minijuego;
	/** De qué palo es. Los de puesto no la declaran: siempre son `partido`. */
	familia?: Familia;
	opciones: Opcion[];
};

export type ResultadoDeOcasion = {
	ocasionId: string;
	opcionId: string;
	salio: boolean;
	texto: string;
	efecto: Efecto;
};

/** Contra quién y con quién se juega este momento. */
export type Escenario = {
	/** Un rival de la misma liga, distinto del club propio. */
	rival: string;
	/** El arquero del rival, si es alguien conocido. */
	arqueroRival: string | null;
	/** Un jugador de campo conocido del rival. */
	figuraRival: string | null;
	/** El técnico propio, si es alguien conocido. */
	tecnico: string | null;
	/** El club donde juega hoy. Para los momentos que pasan puertas adentro. */
	propio: string;
	/** Un compañero de plantel con nombre, si el club tiene alguno conocido. */
	companiero: string | null;
	/** El árbitro del partido. Inventado, como los pibes del scouting. */
	arbitro: string;
	/** Un periodista con nombre, para la prensa y los programas. */
	periodista: string;
};

export type Plantilla = (a: Atributos, e: Escenario) => Ocasion;

/**
 * Convierte una puntería cruda en una probabilidad que se pueda mostrar.
 *
 * `base` es lo que sale con atributo 50 y ninguna ventaja. Cada punto de
 * atributo por encima o por debajo mueve la aguja, pero nunca a los extremos:
 * nada baja de 8% ni sube de 92%, porque una ocasión que sale siempre no es
 * una ocasión.
 */
export function chance(base: number, atributo: number, peso = 0.55): number {
	return Math.round(Math.max(8, Math.min(92, base + (atributo - 50) * peso)));
}

export const arqueroDelRival = (e: Escenario) =>
	e.arqueroRival ?? `el arquero de ${club(e.rival).nombre}`;

/** Para las frases que arrancan con un nombre que puede venir en minúscula. */
export const Mayus = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * "a" delante de un nombre que a veces es una persona y a veces un puesto.
 *
 * El rival puede ser "Franco Armani" o "el arquero de Temperley", según si el
 * club tiene a alguien conocido en el arco. Concatenar "a" con las dos daba
 * "Se la cruzaste a el arquero", que en castellano no existe.
 */
export const aQuien = (quien: string) =>
	quien.startsWith('el ') ? `al ${quien.slice(3)}` : `a ${quien}`;

/** El compañero de plantel, o el plantel entero cuando no hay ninguno conocido. */
export const unCompaniero = (e: Escenario) => e.companiero ?? 'uno de los grandes del plantel';
