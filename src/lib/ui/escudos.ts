import { club, contexto } from '../../../content/mundo';

/**
 * Escudos de club, dibujados por nosotros.
 *
 * No usamos ni imitamos los escudos reales: cada club se dibuja como un escudo
 * geométrico propio —un fondo, un patrón y las iniciales— y lo único que
 * tomamos de la realidad son los colores, que son un dato y no un diseño.
 *
 * De los 250 clubes hay unos cuantos que el jugador va a ver todo el tiempo, y
 * a ésos les pusimos los colores a mano. El resto los saca de su id: siempre el
 * mismo escudo para el mismo club, sin tener que escribir 250 líneas.
 */

export type Patron = 'liso' | 'bandas' | 'mitades' | 'sash' | 'franjas' | 'aro';

export type Escudo = {
	principal: string;
	secundario: string;
	patron: Patron;
	iniciales: string;
	/** Color del texto: blanco o negro, el que se lea mejor sobre el fondo. */
	tinta: string;
};

/**
 * Los que se ven seguido, con sus colores de verdad.
 *
 * Agregar uno es agregar una línea. Los que no están se dibujan igual: salen de
 * su id y quedan consistentes toda la partida.
 */
const COLORES: Record<string, [string, string, Patron?]> = {
	// Argentina
	'ar-river': ['#ffffff', '#d3122b', 'sash'],
	'ar-boca': ['#12326e', '#f4c430', 'franjas'],
	'ar-racing': ['#7bb0e0', '#ffffff', 'bandas'],
	'ar-independiente': ['#d3122b', '#ffffff', 'liso'],
	'ar-sanlorenzo': ['#12326e', '#b3122b', 'bandas'],
	'ar-velez': ['#ffffff', '#12326e', 'sash'],
	'ar-estudiantes': ['#ffffff', '#d3122b', 'bandas'],
	'ar-gimnasia': ['#12326e', '#ffffff', 'bandas'],
	'ar-newells': ['#d3122b', '#12326e', 'bandas'],
	'ar-central': ['#f4c430', '#12326e', 'bandas'],
	'ar-talleres': ['#ffffff', '#12326e', 'bandas'],
	'ar-lanus': ['#7a1f2b', '#ffffff', 'sash'],
	'ar-huracan': ['#ffffff', '#d3122b', 'aro'],
	'ar-argentinos': ['#d3122b', '#ffffff', 'bandas'],
	'ar-banfield': ['#0f5c3f', '#ffffff', 'bandas'],
	'ar2-ferro': ['#0f5c3f', '#ffffff', 'franjas'],
	'ar2-chacarita': ['#d3122b', '#000000', 'bandas'],
	'ar2-quilmes': ['#ffffff', '#12326e', 'bandas'],

	// Brasil
	'br-flamengo': ['#d3122b', '#000000', 'franjas'],
	'br-palmeiras': ['#0f5c3f', '#ffffff', 'liso'],
	'br-corinthians': ['#ffffff', '#000000', 'bandas'],
	'br-saopaulo': ['#ffffff', '#d3122b', 'franjas'],
	'br-santos': ['#ffffff', '#000000', 'franjas'],
	'br-fluminense': ['#7a1f4b', '#0f5c3f', 'bandas'],
	'br-botafogo': ['#000000', '#ffffff', 'bandas'],
	'br-vasco': ['#000000', '#ffffff', 'sash'],
	'br-gremio': ['#4a90d9', '#000000', 'bandas'],
	'br-internacional': ['#d3122b', '#ffffff', 'liso'],
	'br-cruzeiro': ['#12326e', '#ffffff', 'liso'],
	'br-atleticomg': ['#000000', '#ffffff', 'bandas'],

	// Uruguay y Chile
	'uy-penarol': ['#f4c430', '#000000', 'bandas'],
	'uy-nacional': ['#ffffff', '#12326e', 'sash'],
	'cl-colocolo': ['#ffffff', '#000000', 'sash'],
	'cl-udechile': ['#12326e', '#d3122b', 'liso'],
	'cl-ucatolica': ['#ffffff', '#12326e', 'sash'],

	// México
	'mx-america': ['#f4c430', '#12326e', 'liso'],
	'mx-chivas': ['#ffffff', '#d3122b', 'sash'],
	'mx-cruzazul': ['#12326e', '#ffffff', 'liso'],
	'mx-pumas': ['#12326e', '#f4c430', 'liso'],
	'mx-tigres': ['#f4c430', '#12326e', 'franjas'],
	'mx-monterrey': ['#12326e', '#ffffff', 'bandas'],

	// España
	'es-realmadrid': ['#ffffff', '#f4c430', 'liso'],
	'es-barcelona': ['#7a1f4b', '#12326e', 'bandas'],
	'es-atletico': ['#ffffff', '#d3122b', 'bandas'],
	'es-sevilla': ['#ffffff', '#d3122b', 'liso'],
	'es-betis': ['#0f8a4a', '#ffffff', 'bandas'],
	'es-valencia': ['#ffffff', '#f47a20', 'liso'],
	'es-athletic': ['#d3122b', '#ffffff', 'bandas'],
	'es-villarreal': ['#f4d03f', '#12326e', 'liso'],

	// Italia
	'it-inter': ['#12326e', '#000000', 'bandas'],
	'it-milan': ['#d3122b', '#000000', 'bandas'],
	'it-juventus': ['#ffffff', '#000000', 'bandas'],
	'it-napoli': ['#4a90d9', '#ffffff', 'liso'],
	'it-roma': ['#8a1f2b', '#f4c430', 'liso'],
	'it-lazio': ['#a8d8f0', '#ffffff', 'liso'],
	'it-atalanta': ['#12326e', '#000000', 'bandas'],
	'it-fiorentina': ['#7a4fb0', '#ffffff', 'liso'],

	// Inglaterra
	'en-mancity': ['#6ab6e0', '#ffffff', 'liso'],
	'en-arsenal': ['#d3122b', '#ffffff', 'liso'],
	'en-liverpool': ['#c8102e', '#ffffff', 'liso'],
	'en-manutd': ['#d3122b', '#000000', 'liso'],
	'en-chelsea': ['#1a4ba8', '#ffffff', 'liso'],
	'en-tottenham': ['#ffffff', '#12326e', 'liso'],
	'en-newcastle': ['#000000', '#ffffff', 'bandas'],
	'en-astonvilla': ['#7a1f4b', '#a8d8f0', 'bandas'],
	'en-everton': ['#12326e', '#ffffff', 'liso'],
	'en-westham': ['#7a1f2b', '#4a90d9', 'liso'],

	// Alemania, Francia, Portugal, Países Bajos, Turquía
	'de-bayern': ['#d3122b', '#ffffff', 'liso'],
	'de-dortmund': ['#f4d03f', '#000000', 'liso'],
	'de-leipzig': ['#ffffff', '#d3122b', 'liso'],
	'de-leverkusen': ['#d3122b', '#000000', 'liso'],
	'de-eintracht': ['#000000', '#d3122b', 'liso'],
	'fr-psg': ['#12326e', '#d3122b', 'sash'],
	'fr-marsella': ['#ffffff', '#6ab6e0', 'liso'],
	'fr-lyon': ['#ffffff', '#12326e', 'liso'],
	'fr-monaco': ['#d3122b', '#ffffff', 'mitades'],
	'fr-lille': ['#d3122b', '#12326e', 'liso'],
	'pt-benfica': ['#d3122b', '#ffffff', 'liso'],
	'pt-porto': ['#ffffff', '#12326e', 'bandas'],
	'pt-sporting': ['#0f8a4a', '#ffffff', 'franjas'],
	'nl-ajax': ['#ffffff', '#d3122b', 'sash'],
	'nl-psv': ['#d3122b', '#ffffff', 'bandas'],
	'nl-feyenoord': ['#ffffff', '#d3122b', 'mitades'],
	'tr-galatasaray': ['#a83a1f', '#f4c430', 'bandas'],
	'tr-fenerbahce': ['#f4d03f', '#12326e', 'bandas'],
	'tr-besiktas': ['#ffffff', '#000000', 'bandas'],
	'tr-trabzonspor': ['#7a1f2b', '#6ab6e0', 'bandas']
};

/** Paleta de la que salen los clubes que no tienen colores a mano. */
const PALETA = [
	'#12326e',
	'#d3122b',
	'#0f5c3f',
	'#f4c430',
	'#7a1f4b',
	'#1f6f8a',
	'#a83a1f',
	'#3f3f8a',
	'#0f8a4a',
	'#8a6f1f',
	'#5a2a7a',
	'#1a4ba8'
];

const PATRONES: Patron[] = ['liso', 'bandas', 'mitades', 'sash', 'franjas', 'aro'];

/** Hash estable de un id a entero. Mismo club, mismo escudo, siempre. */
function hash(texto: string): number {
	let h = 2166136261;
	for (let i = 0; i < texto.length; i++) {
		h ^= texto.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** Qué tan claro es un color, 0–1. Sirve para elegir tinta que se lea. */
function luminancia(hex: string): number {
	const n = parseInt(hex.slice(1), 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Las iniciales que van en el escudo.
 *
 *   "River Plate"        → RP
 *   "Newell's Old Boys"  → NOB
 *   "Palmeiras"          → PAL
 */
export function iniciales(nombre: string): string {
	const menores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el', 'do', 'da', 'of', 'and']);
	// "Deportivo" no distingue a nadie: hay diez. Se tira y queda el nombre.
	const genericos = new Set(['deportivo', 'club', 'atletico', 'ca', 'cd', 'sc', 'fc', 'ac']);

	let palabras = nombre
		.split(/[\s.]+/)
		.map((p) => p.replace(/[^\p{L}]/gu, ''))
		.filter((p) => p.length > 0 && !menores.has(p.toLowerCase()));

	const sinGenericos = palabras.filter((p) => !genericos.has(p.toLowerCase()));
	if (sinGenericos.length > 0) palabras = sinGenericos;

	if (palabras.length === 0) return '??';
	if (palabras.length === 1) return palabras[0].slice(0, 3).toUpperCase();
	return palabras
		.slice(0, 3)
		.map((p) => p[0])
		.join('')
		.toUpperCase();
}

/** El escudo de un club: lo de la tabla si está, y si no lo que da su id. */
export function escudoDe(clubId: string): Escudo {
	const c = club(clubId);
	const aMano = COLORES[clubId];

	let principal: string;
	let secundario: string;
	let patron: Patron;

	if (aMano) {
		[principal, secundario] = aMano;
		patron = aMano[2] ?? 'liso';
	} else {
		const h = hash(clubId);
		principal = PALETA[h % PALETA.length];
		secundario = PALETA[(Math.floor(h / PALETA.length) + 5) % PALETA.length];
		if (secundario === principal) secundario = '#ffffff';
		patron = PATRONES[Math.floor(h / 97) % PATRONES.length];
	}

	return {
		principal,
		secundario,
		patron,
		iniciales: iniciales(c.nombre),
		tinta: luminancia(principal) > 0.55 ? '#101014' : '#ffffff'
	};
}

/** El país al que pertenece un club, para poner la banderita al lado. */
export function paisDe(clubId: string): string {
	return contexto(clubId).pais.id;
}
