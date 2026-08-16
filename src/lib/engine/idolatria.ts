import type { Estado } from './tipos';

/**
 * Cuánto lo quiere la gente.
 *
 * `hinchada` ya existía como número de 0 a 100 y no significaba nada mirándolo:
 * un 43 no le dice a nadie si eso es mucho o poco. Los escalones le ponen
 * nombre, y ver el siguiente —"te faltan 12 para que te canten"— convierte un
 * número muerto en algo por lo que se juega.
 *
 * Son los nombres que se usan de verdad en una cancha, en orden de cómo se
 * gana: primero te reconocen, después te aplauden, después te cantan, y al
 * final quedás.
 */

export type Escalon = {
	desde: number;
	nombre: string;
	/** Lo que pasa cuando llegás. */
	texto: string;
};

export const ESCALONES: Escalon[] = [
	{ desde: 0, nombre: 'Uno más', texto: 'Todavía no te distinguen del resto del plantel.' },
	{ desde: 20, nombre: 'Lo conocen', texto: 'Ya saben cómo te llamás y te piden fotos afuera.' },
	{ desde: 40, nombre: 'Lo aplauden', texto: 'Te aplauden cuando salís, ganes o pierdas.' },
	{ desde: 62, nombre: 'Lo cantan', texto: 'Tenés canción propia. Eso no se compra.' },
	{ desde: 82, nombre: 'Ídolo', texto: 'Tu nombre está en la tribuna y tu cara en las paredes.' }
];

export type Idolatria = {
	valor: number;
	escalon: Escalon;
	/** El siguiente, o `null` si ya llegó arriba. */
	siguiente: Escalon | null;
	/** Cuánto le falta para el siguiente. */
	faltan: number;
	/** Dónde caen los cortes, para dibujarlos en la barra. */
	cortes: number[];
};

export function idolatriaDe(estado: Estado): Idolatria {
	const valor = estado.futbolista.hinchada;
	const escalon = [...ESCALONES].reverse().find((e) => valor >= e.desde) ?? ESCALONES[0];
	const siguiente = ESCALONES.find((e) => e.desde > valor) ?? null;

	return {
		valor,
		escalon,
		siguiente,
		faltan: siguiente ? siguiente.desde - valor : 0,
		cortes: ESCALONES.slice(1).map((e) => e.desde)
	};
}
