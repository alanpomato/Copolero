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
 * Los colores de cada club.
 *
 * Los colores de un club son un dato, no un diseño: Boca juega de azul y oro
 * desde 1913 y eso no es de nadie. Lo que sí es de alguien es el escudo, y por
 * eso el escudo lo dibujamos nosotros (ver `Escudo.svelte`): fondo, patrón e
 * iniciales, geometría propia.
 *
 * Con los colores puestos, el escudo propio se reconoce igual de lejos. Están
 * los 268 clubes. Los de las ligas grandes son los que todos sabemos; los del
 * Ascenso argentino y algunas ligas chicas están puestos de memoria y pueden
 * tener errores. Corregir uno es cambiar una línea.
 */

// La paleta: colores de camiseta, no colores de pantalla. Un poco apagados a
// propósito, para que el escudo se lea sobre el fondo oscuro del juego.
const BLANCO = '#f2f2f0';
const NEGRO = '#141418';
const ROJO = '#d3122b';
const AZUL = '#12326e';
const CELESTE = '#6fb0e0';
const VERDE = '#0f6b3f';
const AMARILLO = '#f2c318';
const ORO = '#e0aa1e';
const GRANATE = '#7a1f34';
const VIOLETA = '#6b3fa0';
const NARANJA = '#e5701f';
const MARRON = '#6b4a2f';

/**
 * Colores y patrón de cada club: `[principal, secundario, patrón]`.
 *
 * El patrón es cómo se combinan: `bandas` son verticales (River, Inter),
 * `franjas` horizontales (Boca, Flamengo), `sash` la banda cruzada (River,
 * Vasco, Nacional), `mitades` mitad y mitad (Mónaco, Feyenoord), `liso` un
 * color solo con vivos, y `aro` un anillo (Huracán).
 */
const COLORES: Record<string, [string, string, Patron]> = {
	// Argentina · Liga Profesional
	'ar-river': [BLANCO, ROJO, 'sash'],
	'ar-boca': [AZUL, ORO, 'franjas'],
	'ar-racing': [CELESTE, BLANCO, 'bandas'],
	'ar-independiente': [ROJO, BLANCO, 'liso'],
	'ar-sanlorenzo': [AZUL, ROJO, 'bandas'],
	'ar-velez': [BLANCO, AZUL, 'sash'],
	'ar-estudiantes': [BLANCO, ROJO, 'bandas'],
	'ar-gimnasia': [AZUL, BLANCO, 'bandas'],
	'ar-newells': [ROJO, NEGRO, 'bandas'],
	'ar-central': [ORO, AZUL, 'bandas'],
	'ar-talleres': [BLANCO, AZUL, 'bandas'],
	'ar-belgrano': [CELESTE, BLANCO, 'bandas'],
	'ar-instituto': [ROJO, BLANCO, 'bandas'],
	'ar-lanus': [GRANATE, BLANCO, 'sash'],
	'ar-banfield': [VERDE, BLANCO, 'bandas'],
	'ar-huracan': [BLANCO, ROJO, 'aro'],
	'ar-argentinos': [ROJO, BLANCO, 'bandas'],
	'ar-defensa': [VERDE, AMARILLO, 'franjas'],
	'ar-tigre': [AZUL, ROJO, 'bandas'],
	'ar-godoycruz': [AZUL, BLANCO, 'bandas'],
	'ar-union': [ROJO, BLANCO, 'bandas'],
	'ar-colon': [ROJO, NEGRO, 'bandas'],
	'ar-atltucuman': [CELESTE, BLANCO, 'bandas'],
	'ar-platense': [MARRON, BLANCO, 'bandas'],

	// Argentina · Primera Nacional
	'ar2-moron': [ROJO, BLANCO, 'liso'],
	'ar2-almagro': [AZUL, BLANCO, 'liso'],
	'ar2-chacarita': [ROJO, NEGRO, 'bandas'],
	'ar2-allboys': [BLANCO, NEGRO, 'bandas'],
	'ar2-chicago': [VERDE, NEGRO, 'bandas'],
	'ar2-ferro': [VERDE, BLANCO, 'franjas'],
	'ar2-atlanta': [AZUL, AMARILLO, 'bandas'],
	'ar2-temperley': [CELESTE, BLANCO, 'franjas'],
	'ar2-estudiantesrc': [VERDE, BLANCO, 'bandas'],
	'ar2-sanmartint': [ROJO, BLANCO, 'bandas'],
	'ar2-gimnasiajujuy': [BLANCO, AZUL, 'bandas'],
	'ar2-quilmes': [BLANCO, AZUL, 'bandas'],
	'ar2-maipu': [AZUL, BLANCO, 'bandas'],
	'ar2-alvarado': [VERDE, BLANCO, 'bandas'],
	'ar2-agropecuario': [VERDE, BLANCO, 'liso'],
	'ar2-defensoresbelgrano': [ROJO, NEGRO, 'bandas'],
	'ar2-colegiales': [BLANCO, ROJO, 'sash'],
	'ar2-tristansuarez': [VERDE, BLANCO, 'bandas'],
	'ar2-sanmiguel': [VERDE, ROJO, 'liso'],
	'ar2-losandes': [ROJO, BLANCO, 'bandas'],

	// Brasil
	'br-flamengo': [ROJO, NEGRO, 'franjas'],
	'br-palmeiras': [VERDE, BLANCO, 'liso'],
	'br-saopaulo': [BLANCO, ROJO, 'franjas'],
	'br-corinthians': [BLANCO, NEGRO, 'bandas'],
	'br-santos': [BLANCO, NEGRO, 'franjas'],
	'br-fluminense': [GRANATE, VERDE, 'bandas'],
	'br-botafogo': [NEGRO, BLANCO, 'bandas'],
	'br-vasco': [NEGRO, BLANCO, 'sash'],
	'br-gremio': [CELESTE, NEGRO, 'bandas'],
	'br-internacional': [ROJO, BLANCO, 'liso'],
	'br-atleticomg': [NEGRO, BLANCO, 'bandas'],
	'br-cruzeiro': [AZUL, BLANCO, 'liso'],
	'br-athletico': [ROJO, NEGRO, 'bandas'],
	'br-coritiba': [VERDE, BLANCO, 'franjas'],
	'br-bahia': [AZUL, ROJO, 'bandas'],
	'br-vitoria': [ROJO, NEGRO, 'bandas'],
	'br-sport': [ROJO, NEGRO, 'bandas'],
	'br-fortaleza': [AZUL, ROJO, 'franjas'],
	'br-ceara': [NEGRO, BLANCO, 'bandas'],
	'br-goias': [VERDE, BLANCO, 'bandas'],
	'br-cuiaba': [VERDE, ORO, 'bandas'],
	'br-bragantino': [BLANCO, ROJO, 'franjas'],

	// Uruguay
	'uy-penarol': [ORO, NEGRO, 'bandas'],
	'uy-nacional': [BLANCO, AZUL, 'sash'],
	'uy-defensor': [VIOLETA, BLANCO, 'liso'],
	'uy-danubio': [BLANCO, NEGRO, 'sash'],
	'uy-liverpool': [NEGRO, AZUL, 'bandas'],
	'uy-wanderers': [BLANCO, NEGRO, 'bandas'],
	'uy-racing': [CELESTE, BLANCO, 'liso'],
	'uy-river': [ROJO, BLANCO, 'sash'],
	'uy-cerro': [AZUL, BLANCO, 'bandas'],
	'uy-rampla': [VERDE, ROJO, 'bandas'],
	'uy-progreso': [ROJO, BLANCO, 'bandas'],
	'uy-bostonriver': [AZUL, BLANCO, 'liso'],
	'uy-plazacolonia': [BLANCO, VERDE, 'bandas'],
	'uy-cerrolargo': [VERDE, BLANCO, 'liso'],
	'uy-maldonado': [BLANCO, AZUL, 'liso'],
	'uy-miramar': [NEGRO, AMARILLO, 'bandas'],

	// Chile
	'cl-colocolo': [BLANCO, NEGRO, 'sash'],
	'cl-udechile': [AZUL, ROJO, 'liso'],
	'cl-ucatolica': [BLANCO, AZUL, 'sash'],
	'cl-unionespanola': [ROJO, BLANCO, 'liso'],
	'cl-palestino': [BLANCO, VERDE, 'franjas'],
	'cl-audax': [VERDE, BLANCO, 'liso'],
	'cl-magallanes': [CELESTE, BLANCO, 'liso'],
	'cl-wanderers': [VERDE, BLANCO, 'liso'],
	'cl-everton': [AZUL, AMARILLO, 'bandas'],
	'cl-ohiggins': [CELESTE, BLANCO, 'liso'],
	'cl-cobreloa': [NARANJA, BLANCO, 'liso'],
	'cl-cobresal': [BLANCO, NEGRO, 'liso'],
	'cl-huachipato': [NEGRO, AZUL, 'bandas'],
	'cl-nublense': [ROJO, BLANCO, 'liso'],
	'cl-iquique': [CELESTE, BLANCO, 'liso'],
	'cl-coquimbo': [AMARILLO, NEGRO, 'bandas'],
	'cl-lacalera': [ROJO, BLANCO, 'liso'],
	'cl-laserena': [ROJO, AMARILLO, 'bandas'],

	// México
	'mx-america': [ORO, AZUL, 'liso'],
	'mx-chivas': [BLANCO, ROJO, 'sash'],
	'mx-cruzazul': [AZUL, BLANCO, 'liso'],
	'mx-pumas': [AZUL, ORO, 'liso'],
	'mx-tigres': [ORO, AZUL, 'franjas'],
	'mx-monterrey': [AZUL, BLANCO, 'bandas'],
	'mx-santos': [VERDE, BLANCO, 'bandas'],
	'mx-toluca': [ROJO, BLANCO, 'bandas'],
	'mx-leon': [VERDE, BLANCO, 'bandas'],
	'mx-pachuca': [AZUL, BLANCO, 'bandas'],
	'mx-necaxa': [ROJO, BLANCO, 'bandas'],
	'mx-atlas': [ROJO, NEGRO, 'bandas'],
	'mx-puebla': [AZUL, BLANCO, 'bandas'],
	'mx-queretaro': [AZUL, NEGRO, 'bandas'],
	'mx-tijuana': [ROJO, NEGRO, 'bandas'],
	'mx-mazatlan': [VIOLETA, BLANCO, 'liso'],
	'mx-juarez': [VERDE, BLANCO, 'liso'],
	'mx-sanluis': [ROJO, BLANCO, 'bandas'],

	// España
	'es-realmadrid': [BLANCO, ORO, 'liso'],
	'es-barcelona': [GRANATE, AZUL, 'bandas'],
	'es-atletico': [BLANCO, ROJO, 'bandas'],
	'es-sevilla': [BLANCO, ROJO, 'liso'],
	'es-betis': [VERDE, BLANCO, 'bandas'],
	'es-valencia': [BLANCO, NARANJA, 'liso'],
	'es-villarreal': [AMARILLO, AZUL, 'liso'],
	'es-athletic': [ROJO, BLANCO, 'bandas'],
	'es-realsociedad': [AZUL, BLANCO, 'bandas'],
	'es-celta': [CELESTE, BLANCO, 'liso'],
	'es-getafe': [AZUL, BLANCO, 'liso'],
	'es-rayo': [BLANCO, ROJO, 'sash'],
	'es-osasuna': [ROJO, AZUL, 'liso'],
	'es-mallorca': [ROJO, NEGRO, 'bandas'],
	'es-girona': [ROJO, BLANCO, 'bandas'],
	'es-alaves': [AZUL, BLANCO, 'bandas'],
	'es-espanyol': [BLANCO, AZUL, 'bandas'],
	'es-laspalmas': [AMARILLO, AZUL, 'liso'],
	'es-valladolid': [BLANCO, VIOLETA, 'bandas'],
	'es-leganes': [AZUL, BLANCO, 'bandas'],

	// Italia
	'it-inter': [AZUL, NEGRO, 'bandas'],
	'it-milan': [ROJO, NEGRO, 'bandas'],
	'it-juventus': [BLANCO, NEGRO, 'bandas'],
	'it-napoli': [CELESTE, BLANCO, 'liso'],
	'it-roma': [GRANATE, ORO, 'liso'],
	'it-lazio': [CELESTE, BLANCO, 'liso'],
	'it-atalanta': [AZUL, NEGRO, 'bandas'],
	'it-fiorentina': [VIOLETA, BLANCO, 'liso'],
	'it-bologna': [ROJO, AZUL, 'bandas'],
	'it-torino': [GRANATE, BLANCO, 'liso'],
	'it-udinese': [BLANCO, NEGRO, 'bandas'],
	'it-genoa': [ROJO, AZUL, 'mitades'],
	'it-sassuolo': [VERDE, NEGRO, 'bandas'],
	'it-empoli': [AZUL, BLANCO, 'liso'],
	'it-cagliari': [ROJO, AZUL, 'mitades'],
	'it-verona': [AMARILLO, AZUL, 'bandas'],
	'it-lecce': [AMARILLO, ROJO, 'bandas'],
	'it-monza': [ROJO, BLANCO, 'liso'],
	'it-parma': [AMARILLO, AZUL, 'bandas'],
	'it-como': [AZUL, BLANCO, 'liso'],

	// Alemania
	'de-bayern': [ROJO, BLANCO, 'liso'],
	'de-dortmund': [AMARILLO, NEGRO, 'liso'],
	'de-leipzig': [BLANCO, ROJO, 'liso'],
	'de-leverkusen': [ROJO, NEGRO, 'liso'],
	'de-eintracht': [NEGRO, ROJO, 'liso'],
	'de-wolfsburgo': [VERDE, BLANCO, 'liso'],
	'de-gladbach': [BLANCO, VERDE, 'liso'],
	'de-stuttgart': [BLANCO, ROJO, 'liso'],
	'de-werder': [VERDE, BLANCO, 'liso'],
	'de-hoffenheim': [AZUL, BLANCO, 'liso'],
	'de-friburgo': [ROJO, NEGRO, 'liso'],
	'de-union': [ROJO, BLANCO, 'liso'],
	'de-mainz': [ROJO, BLANCO, 'liso'],
	'de-augsburgo': [ROJO, VERDE, 'bandas'],
	'de-bochum': [AZUL, BLANCO, 'liso'],
	'de-heidenheim': [ROJO, AZUL, 'liso'],
	'de-stpauli': [MARRON, BLANCO, 'liso'],
	'de-kiel': [AZUL, BLANCO, 'bandas'],

	// Francia
	'fr-psg': [AZUL, ROJO, 'sash'],
	'fr-marsella': [BLANCO, CELESTE, 'liso'],
	'fr-lyon': [BLANCO, AZUL, 'liso'],
	'fr-monaco': [ROJO, BLANCO, 'mitades'],
	'fr-lille': [ROJO, AZUL, 'liso'],
	'fr-rennes': [ROJO, NEGRO, 'bandas'],
	'fr-niza': [ROJO, NEGRO, 'bandas'],
	'fr-lens': [AMARILLO, ROJO, 'bandas'],
	'fr-nantes': [AMARILLO, VERDE, 'liso'],
	'fr-estrasburgo': [AZUL, BLANCO, 'liso'],
	'fr-montpellier': [NARANJA, AZUL, 'bandas'],
	'fr-toulouse': [VIOLETA, BLANCO, 'liso'],
	'fr-brest': [ROJO, BLANCO, 'bandas'],
	'fr-reims': [ROJO, BLANCO, 'bandas'],
	'fr-angers': [BLANCO, NEGRO, 'bandas'],
	'fr-auxerre': [BLANCO, AZUL, 'liso'],
	'fr-saintetienne': [VERDE, BLANCO, 'liso'],
	'fr-lehavre': [CELESTE, AZUL, 'bandas'],

	// Portugal
	'pt-benfica': [ROJO, BLANCO, 'liso'],
	'pt-porto': [BLANCO, AZUL, 'bandas'],
	'pt-sporting': [VERDE, BLANCO, 'franjas'],
	'pt-braga': [ROJO, BLANCO, 'liso'],
	'pt-guimaraes': [BLANCO, NEGRO, 'liso'],
	'pt-boavista': [NEGRO, BLANCO, 'bandas'],
	'pt-rioave': [VERDE, BLANCO, 'bandas'],
	'pt-famalicao': [BLANCO, AZUL, 'bandas'],
	'pt-gilvicente': [ROJO, BLANCO, 'bandas'],
	'pt-moreirense': [VERDE, BLANCO, 'bandas'],
	'pt-arouca': [AMARILLO, NEGRO, 'liso'],
	'pt-estoril': [AMARILLO, AZUL, 'liso'],
	'pt-casapia': [NEGRO, BLANCO, 'bandas'],
	'pt-santaclara': [ROJO, BLANCO, 'bandas'],
	'pt-nacional': [BLANCO, NEGRO, 'bandas'],
	'pt-farense': [BLANCO, NEGRO, 'bandas'],
	'pt-estrela': [VERDE, ROJO, 'bandas'],
	'pt-avs': [AMARILLO, NEGRO, 'bandas'],

	// Países Bajos
	'nl-ajax': [BLANCO, ROJO, 'sash'],
	'nl-psv': [ROJO, BLANCO, 'bandas'],
	'nl-feyenoord': [BLANCO, ROJO, 'mitades'],
	'nl-az': [ROJO, BLANCO, 'liso'],
	'nl-twente': [ROJO, BLANCO, 'liso'],
	'nl-utrecht': [ROJO, BLANCO, 'liso'],
	'nl-vitesse': [AMARILLO, NEGRO, 'bandas'],
	'nl-heerenveen': [AZUL, BLANCO, 'mitades'],
	'nl-groningen': [VERDE, BLANCO, 'bandas'],
	'nl-nec': [VERDE, NEGRO, 'bandas'],
	'nl-sparta': [ROJO, BLANCO, 'mitades'],
	'nl-goahead': [ROJO, AMARILLO, 'bandas'],
	'nl-fortuna': [AMARILLO, VERDE, 'bandas'],
	'nl-heracles': [NEGRO, BLANCO, 'bandas'],
	'nl-zwolle': [AZUL, BLANCO, 'bandas'],
	'nl-willem2': [ROJO, AZUL, 'bandas'],
	'nl-rkc': [AMARILLO, AZUL, 'bandas'],
	'nl-almere': [ROJO, NEGRO, 'bandas'],

	// Inglaterra
	'en-mancity': [CELESTE, BLANCO, 'liso'],
	'en-arsenal': [ROJO, BLANCO, 'liso'],
	'en-liverpool': [ROJO, BLANCO, 'liso'],
	'en-manutd': [ROJO, NEGRO, 'liso'],
	'en-chelsea': [AZUL, BLANCO, 'liso'],
	'en-tottenham': [BLANCO, AZUL, 'liso'],
	'en-newcastle': [NEGRO, BLANCO, 'bandas'],
	'en-astonvilla': [GRANATE, CELESTE, 'bandas'],
	'en-brighton': [AZUL, BLANCO, 'bandas'],
	'en-westham': [GRANATE, CELESTE, 'liso'],
	'en-everton': [AZUL, BLANCO, 'liso'],
	'en-crystalpalace': [ROJO, AZUL, 'bandas'],
	'en-fulham': [BLANCO, NEGRO, 'liso'],
	'en-brentford': [ROJO, BLANCO, 'bandas'],
	'en-forest': [ROJO, BLANCO, 'liso'],
	'en-bournemouth': [ROJO, NEGRO, 'bandas'],
	'en-wolves': [NARANJA, NEGRO, 'liso'],
	'en-leicester': [AZUL, BLANCO, 'liso'],
	'en-southampton': [ROJO, BLANCO, 'bandas'],
	'en-ipswich': [AZUL, BLANCO, 'liso'],

	// Turquía
	'tr-galatasaray': [GRANATE, ORO, 'bandas'],
	'tr-fenerbahce': [AMARILLO, AZUL, 'bandas'],
	'tr-besiktas': [BLANCO, NEGRO, 'bandas'],
	'tr-trabzonspor': [GRANATE, CELESTE, 'bandas'],
	'tr-basaksehir': [NARANJA, AZUL, 'bandas'],
	'tr-adanademir': [AZUL, BLANCO, 'bandas'],
	'tr-konyaspor': [VERDE, BLANCO, 'bandas'],
	'tr-alanyaspor': [NARANJA, VERDE, 'bandas'],
	'tr-antalyaspor': [ROJO, BLANCO, 'bandas'],
	'tr-kayserispor': [ROJO, AMARILLO, 'bandas'],
	'tr-sivasspor': [ROJO, BLANCO, 'bandas'],
	'tr-gaziantep': [ROJO, NEGRO, 'bandas'],
	'tr-rizespor': [VERDE, AZUL, 'bandas'],
	'tr-kasimpasa': [AZUL, BLANCO, 'bandas'],
	'tr-samsunspor': [ROJO, BLANCO, 'bandas'],
	'tr-hatayspor': [GRANATE, BLANCO, 'bandas'],
	'tr-goztepe': [ROJO, AMARILLO, 'bandas'],
	'tr-eyupspor': [AMARILLO, NEGRO, 'bandas']
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

/** ¿Están sus colores en la tabla, o se los inventa el hash? */
export function tieneColoresPropios(clubId: string): boolean {
	return clubId in COLORES;
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
