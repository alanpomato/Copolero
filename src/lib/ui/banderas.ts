/**
 * Banderas de país, dibujadas por nosotros.
 *
 * Son versiones simplificadas: las franjas y los colores son los de verdad, y
 * los escudos y emblemas complicados se resuelven con una figura geométrica.
 * A 18 píxeles, que es el tamaño al que se van a ver, un escudo detallado no se
 * distingue de una mancha, así que dibujarlo sería trabajo perdido.
 */

export type Emblema =
	| { tipo: 'sol'; color: string; donde?: 'centro' | 'canton' }
	| { tipo: 'estrella'; color: string; donde?: 'centro' | 'canton' }
	| { tipo: 'luna'; color: string }
	| { tipo: 'cruz'; color: string }
	| { tipo: 'rombo'; color: string; interior?: string }
	| { tipo: 'disco'; color: string; donde?: 'centro' | 'union' };

export type Bandera = {
	orientacion: 'horizontal' | 'vertical';
	/** Colores de las franjas, de arriba abajo o de izquierda a derecha. */
	franjas: string[];
	/** Peso de cada franja. Si falta, todas iguales. */
	pesos?: number[];
	/** Recuadro en la esquina superior izquierda. */
	canton?: string;
	emblema?: Emblema;
};

const AZUL_AR = '#74acdf';
const ROJO = '#d52b1e';
const BLANCO = '#ffffff';

export const BANDERAS: Record<string, Bandera> = {
	ar: {
		orientacion: 'horizontal',
		franjas: [AZUL_AR, BLANCO, AZUL_AR],
		emblema: { tipo: 'sol', color: '#f6b40e' }
	},
	br: {
		orientacion: 'horizontal',
		franjas: ['#009c3b'],
		emblema: { tipo: 'rombo', color: '#ffdf00', interior: '#002776' }
	},
	uy: {
		orientacion: 'horizontal',
		franjas: [BLANCO, '#0038a8', BLANCO, '#0038a8', BLANCO],
		emblema: { tipo: 'sol', color: '#f6b40e', donde: 'canton' }
	},
	cl: {
		orientacion: 'horizontal',
		franjas: [BLANCO, ROJO],
		canton: '#0039a6',
		emblema: { tipo: 'estrella', color: BLANCO, donde: 'canton' }
	},
	mx: {
		orientacion: 'vertical',
		franjas: ['#006847', BLANCO, '#ce1126'],
		emblema: { tipo: 'disco', color: '#8a6d3b' }
	},
	es: {
		orientacion: 'horizontal',
		franjas: ['#aa151b', '#f1bf00', '#aa151b'],
		pesos: [1, 2, 1]
	},
	it: { orientacion: 'vertical', franjas: ['#009246', BLANCO, '#ce2b37'] },
	fr: { orientacion: 'vertical', franjas: ['#002395', BLANCO, '#ed2939'] },
	de: { orientacion: 'horizontal', franjas: ['#000000', '#dd0000', '#ffce00'] },
	pt: {
		orientacion: 'vertical',
		franjas: ['#046a38', '#da291c'],
		pesos: [2, 3],
		emblema: { tipo: 'disco', color: '#ffe600', donde: 'union' }
	},
	nl: { orientacion: 'horizontal', franjas: ['#ae1c28', BLANCO, '#21468b'] },
	tr: {
		orientacion: 'horizontal',
		franjas: ['#e30a17'],
		emblema: { tipo: 'luna', color: BLANCO }
	},
	en: {
		orientacion: 'horizontal',
		franjas: [BLANCO],
		emblema: { tipo: 'cruz', color: '#ce1124' }
	}
};

/**
 * Nacionalidades como vienen escritas en el contenido, mapeadas al país cuya
 * bandera hay que dibujar. Lo que no está acá no lleva bandera, y no pasa nada.
 */
const POR_NACIONALIDAD: Record<string, string> = {
	argentina: 'ar',
	brasil: 'br',
	uruguay: 'uy',
	chile: 'cl',
	méxico: 'mx',
	mexico: 'mx',
	españa: 'es',
	espana: 'es',
	italia: 'it',
	francia: 'fr',
	alemania: 'de',
	portugal: 'pt',
	'países bajos': 'nl',
	'paises bajos': 'nl',
	holanda: 'nl',
	turquía: 'tr',
	turquia: 'tr',
	inglaterra: 'en'
};

export function paisDeNacionalidad(nacionalidad: string): string | null {
	return POR_NACIONALIDAD[nacionalidad.trim().toLowerCase()] ?? null;
}
