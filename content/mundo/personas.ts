import type { Posicion } from '$lib/engine/tipos';

/**
 * Gente real del fútbol: directores técnicos y futbolistas reconocibles.
 *
 * Están para que los eventos peguen: no es lo mismo "te llamó el técnico" que
 * "te llamó Pep Guardiola", ni "le hiciste un gol al arquero" que "le hiciste
 * un gol al Dibu Martínez". La fama define en qué eventos puede aparecer cada
 * uno.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VERIFICADO HASTA: mediados de 2026.
 *
 * Esto es una foto, no una fuente en vivo. Va a haber gente que ya cambió de
 * club, de banco o se retiró. Corregir es editar una línea de este archivo:
 * no hay nada más que tocar.
 *
 * A partir de la temporada 2 de cada partida deja de importar, porque el
 * simulador de mercado los empieza a mover solo (ver `mercado.ts`): la foto es
 * el punto de partida, no la verdad permanente.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Persona = {
	id: string;
	nombre: string;
	/** Nacionalidad, solo para mostrar. No tiene que ser un país del mundo. */
	nacionalidad: string;
	/** Año de nacimiento: deja que envejezcan junto con la partida. */
	nacimiento: number;
	/** 0–100. Define en qué eventos puede aparecer: 90+ son nombres mundiales. */
	fama: number;
	/** El club donde está. `null` si dirige una selección. */
	clubId: string | null;
	/** Para los DT de selección: qué selección dirigen. */
	seleccion?: string;
};

export type DirectorTecnico = Persona;

export type Jugador = Persona & {
	posicion: Posicion;
};

// ===========================================================================
// Directores técnicos de club
// ===========================================================================

const dt = (
	id: string,
	nombre: string,
	nacionalidad: string,
	nacimiento: number,
	clubId: string | null,
	fama: number,
	seleccion?: string
): DirectorTecnico => ({ id, nombre, nacionalidad, nacimiento, clubId, fama, seleccion });

export const directoresTecnicos: DirectorTecnico[] = [
	// --- Inglaterra ---------------------------------------------------------
	dt('dt-guardiola', 'Pep Guardiola', 'España', 1971, 'en-mancity', 100),
	dt('dt-arteta', 'Mikel Arteta', 'España', 1982, 'en-arsenal', 88),
	dt('dt-slot', 'Arne Slot', 'Países Bajos', 1978, 'en-liverpool', 84),
	dt('dt-amorim', 'Rúben Amorim', 'Portugal', 1985, 'en-manutd', 84),
	dt('dt-maresca', 'Enzo Maresca', 'Italia', 1980, 'en-chelsea', 76),
	dt('dt-howe', 'Eddie Howe', 'Inglaterra', 1977, 'en-newcastle', 74),
	dt('dt-emery', 'Unai Emery', 'España', 1971, 'en-astonvilla', 80),
	dt('dt-glasner', 'Oliver Glasner', 'Austria', 1974, 'en-crystalpalace', 68),
	dt('dt-marcosilva', 'Marco Silva', 'Portugal', 1977, 'en-fulham', 66),
	dt('dt-moyes', 'David Moyes', 'Escocia', 1963, 'en-everton', 70),

	// --- España -------------------------------------------------------------
	dt('dt-xabialonso', 'Xabi Alonso', 'España', 1981, 'es-realmadrid', 92),
	dt('dt-flick', 'Hansi Flick', 'Alemania', 1965, 'es-barcelona', 88),
	dt('dt-simeone', 'Diego Simeone', 'Argentina', 1970, 'es-atletico', 94),
	dt('dt-valverde', 'Ernesto Valverde', 'España', 1964, 'es-athletic', 74),
	dt('dt-pellegrini', 'Manuel Pellegrini', 'Chile', 1953, 'es-betis', 80),
	dt('dt-marcelino', 'Marcelino García Toral', 'España', 1965, 'es-villarreal', 66),
	dt('dt-michel', 'Míchel Sánchez', 'España', 1975, 'es-girona', 66),

	// --- Italia -------------------------------------------------------------
	dt('dt-conte', 'Antonio Conte', 'Italia', 1969, 'it-napoli', 90),
	dt('dt-allegri', 'Massimiliano Allegri', 'Italia', 1967, 'it-milan', 84),
	dt('dt-chivu', 'Cristian Chivu', 'Rumania', 1980, 'it-inter', 70),
	dt('dt-tudor', 'Igor Tudor', 'Croacia', 1978, 'it-juventus', 68),
	dt('dt-gasperini', 'Gian Piero Gasperini', 'Italia', 1958, 'it-roma', 82),
	dt('dt-sarri', 'Maurizio Sarri', 'Italia', 1959, 'it-lazio', 80),
	dt('dt-pioli', 'Stefano Pioli', 'Italia', 1965, 'it-fiorentina', 74),
	dt('dt-italiano', 'Vincenzo Italiano', 'Italia', 1977, 'it-bologna', 68),
	dt('dt-fabregas', 'Cesc Fàbregas', 'España', 1987, 'it-como', 82),

	// --- Alemania -----------------------------------------------------------
	dt('dt-kompany', 'Vincent Kompany', 'Bélgica', 1986, 'de-bayern', 84),
	dt('dt-kovac', 'Niko Kovač', 'Croacia', 1971, 'de-dortmund', 70),
	dt('dt-hoeness', 'Sebastian Hoeneß', 'Alemania', 1982, 'de-stuttgart', 66),
	dt('dt-toppmoller', 'Dino Toppmöller', 'Alemania', 1980, 'de-eintracht', 62),

	// --- Francia ------------------------------------------------------------
	dt('dt-luisenrique', 'Luis Enrique', 'España', 1970, 'fr-psg', 90),
	dt('dt-dezerbi', 'Roberto De Zerbi', 'Italia', 1979, 'fr-marsella', 78),
	dt('dt-fonseca', 'Paulo Fonseca', 'Portugal', 1973, 'fr-lyon', 68),
	dt('dt-hutter', 'Adi Hütter', 'Austria', 1970, 'fr-monaco', 64),
	dt('dt-genesio', 'Bruno Génésio', 'Francia', 1966, 'fr-lille', 62),

	// --- Portugal y Países Bajos --------------------------------------------
	dt('dt-mourinho', 'José Mourinho', 'Portugal', 1963, 'pt-benfica', 98),
	dt('dt-farioli', 'Francesco Farioli', 'Italia', 1989, 'pt-porto', 70),
	dt('dt-ruiborges', 'Rui Borges', 'Portugal', 1981, 'pt-sporting', 62),
	dt('dt-heitinga', 'John Heitinga', 'Países Bajos', 1983, 'nl-ajax', 66),
	dt('dt-bosz', 'Peter Bosz', 'Países Bajos', 1963, 'nl-psv', 68),
	dt('dt-vanpersie', 'Robin van Persie', 'Países Bajos', 1983, 'nl-feyenoord', 86),

	// --- Turquía ------------------------------------------------------------
	dt('dt-buruk', 'Okan Buruk', 'Turquía', 1973, 'tr-galatasaray', 66),
	dt('dt-tedesco', 'Domenico Tedesco', 'Italia', 1985, 'tr-fenerbahce', 70),

	// --- Sudamérica y México ------------------------------------------------
	dt('dt-gallardo', 'Marcelo Gallardo', 'Argentina', 1976, 'ar-river', 90),
	dt('dt-costas', 'Gustavo Costas', 'Argentina', 1963, 'ar-racing', 64),
	dt('dt-filipeluis', 'Filipe Luís', 'Brasil', 1985, 'br-flamengo', 80),
	dt('dt-abelferreira', 'Abel Ferreira', 'Portugal', 1978, 'br-palmeiras', 76),
	dt('dt-jardine', 'André Jardine', 'Brasil', 1979, 'mx-america', 64),
	dt('dt-demichelis', 'Martín Demichelis', 'Argentina', 1980, 'mx-monterrey', 70),

	// --- Selecciones --------------------------------------------------------
	dt('dt-scaloni', 'Lionel Scaloni', 'Argentina', 1978, null, 96, 'Argentina'),
	dt('dt-ancelotti', 'Carlo Ancelotti', 'Italia', 1959, null, 98, 'Brasil'),
	dt('dt-bielsa', 'Marcelo Bielsa', 'Argentina', 1955, null, 92, 'Uruguay'),
	dt('dt-nagelsmann', 'Julian Nagelsmann', 'Alemania', 1987, null, 84, 'Alemania'),
	dt('dt-delafuente', 'Luis de la Fuente', 'España', 1961, null, 78, 'España'),
	dt('dt-deschamps', 'Didier Deschamps', 'Francia', 1968, null, 88, 'Francia'),
	dt('dt-gattuso', 'Gennaro Gattuso', 'Italia', 1978, null, 82, 'Italia'),
	dt('dt-robertomartinez', 'Roberto Martínez', 'España', 1973, null, 76, 'Portugal'),
	dt('dt-koeman', 'Ronald Koeman', 'Países Bajos', 1963, null, 82, 'Países Bajos'),
	dt('dt-tuchel', 'Thomas Tuchel', 'Alemania', 1973, null, 88, 'Inglaterra'),
	dt('dt-montella', 'Vincenzo Montella', 'Italia', 1974, null, 70, 'Turquía'),
	dt('dt-aguirre', 'Javier Aguirre', 'México', 1958, null, 74, 'México')
];

// ===========================================================================
// Futbolistas
// ===========================================================================

const j = (
	id: string,
	nombre: string,
	nacionalidad: string,
	nacimiento: number,
	clubId: string,
	posicion: Posicion,
	fama: number
): Jugador => ({ id, nombre, nacionalidad, nacimiento, clubId, posicion, fama });

export const jugadores: Jugador[] = [
	// --- Arqueros: los que te van a atajar un gol ---------------------------
	j('jg-dibu', 'Emiliano Martínez', 'Argentina', 1992, 'en-astonvilla', 'arquero', 92),
	j('jg-courtois', 'Thibaut Courtois', 'Bélgica', 1992, 'es-realmadrid', 'arquero', 92),
	j('jg-alisson', 'Alisson Becker', 'Brasil', 1992, 'en-liverpool', 'arquero', 90),
	j('jg-donnarumma', 'Gianluigi Donnarumma', 'Italia', 1999, 'en-mancity', 'arquero', 88),
	j('jg-oblak', 'Jan Oblak', 'Eslovenia', 1993, 'es-atletico', 'arquero', 86),
	j('jg-tersteg', 'Marc-André ter Stegen', 'Alemania', 1992, 'es-barcelona', 'arquero', 84),
	j('jg-maignan', 'Mike Maignan', 'Francia', 1995, 'it-milan', 'arquero', 84),
	j('jg-raya', 'David Raya', 'España', 1995, 'en-arsenal', 'arquero', 78),
	j('jg-neuer', 'Manuel Neuer', 'Alemania', 1986, 'de-bayern', 'arquero', 92),
	j('jg-unaisimon', 'Unai Simón', 'España', 1997, 'es-athletic', 'arquero', 76),
	j('jg-diogocosta', 'Diogo Costa', 'Portugal', 1999, 'pt-porto', 'arquero', 76),
	j('jg-kobel', 'Gregor Kobel', 'Suiza', 1997, 'de-dortmund', 'arquero', 76),
	j('jg-ederson', 'Ederson', 'Brasil', 1993, 'tr-fenerbahce', 'arquero', 82),
	j('jg-armani', 'Franco Armani', 'Argentina', 1986, 'ar-river', 'arquero', 72),
	j('jg-rossi', 'Agustín Rossi', 'Argentina', 1995, 'br-flamengo', 'arquero', 66),

	// --- Delanteros y estrellas ---------------------------------------------
	j('jg-mbappe', 'Kylian Mbappé', 'Francia', 1998, 'es-realmadrid', 'delantero', 100),
	j('jg-haaland', 'Erling Haaland', 'Noruega', 2000, 'en-mancity', 'delantero', 98),
	j('jg-vinicius', 'Vinícius Júnior', 'Brasil', 2000, 'es-realmadrid', 'delantero', 96),
	j('jg-yamal', 'Lamine Yamal', 'España', 2007, 'es-barcelona', 'delantero', 96),
	j('jg-salah', 'Mohamed Salah', 'Egipto', 1992, 'en-liverpool', 'delantero', 96),
	j('jg-kane', 'Harry Kane', 'Inglaterra', 1993, 'de-bayern', 'delantero', 94),
	j('jg-lewandowski', 'Robert Lewandowski', 'Polonia', 1988, 'es-barcelona', 'delantero', 94),
	j('jg-lautaro', 'Lautaro Martínez', 'Argentina', 1997, 'it-inter', 'delantero', 90),
	j('jg-julian', 'Julián Álvarez', 'Argentina', 2000, 'es-atletico', 'delantero', 88),
	j('jg-osimhen', 'Victor Osimhen', 'Nigeria', 1998, 'tr-galatasaray', 'delantero', 86),
	j('jg-leao', 'Rafael Leão', 'Portugal', 1999, 'it-milan', 'delantero', 84),
	j('jg-saka', 'Bukayo Saka', 'Inglaterra', 2001, 'en-arsenal', 'delantero', 88),
	j('jg-dembele', 'Ousmane Dembélé', 'Francia', 1997, 'fr-psg', 'delantero', 88),
	j('jg-kvara', 'Khvicha Kvaratskhelia', 'Georgia', 2001, 'fr-psg', 'delantero', 84),
	j('jg-raphinha', 'Raphinha', 'Brasil', 1996, 'es-barcelona', 'delantero', 86),
	j('jg-rodrygo', 'Rodrygo', 'Brasil', 2001, 'es-realmadrid', 'delantero', 84),
	j('jg-nicowilliams', 'Nico Williams', 'España', 2002, 'es-athletic', 'delantero', 84),
	j('jg-olise', 'Michael Olise', 'Francia', 2001, 'de-bayern', 'delantero', 82),
	j('jg-griezmann', 'Antoine Griezmann', 'Francia', 1991, 'es-atletico', 'delantero', 88),
	j('jg-dybala', 'Paulo Dybala', 'Argentina', 1993, 'it-roma', 'delantero', 84),
	j('jg-neymar', 'Neymar', 'Brasil', 1992, 'br-santos', 'delantero', 96),
	j('jg-depay', 'Memphis Depay', 'Países Bajos', 1994, 'br-corinthians', 'delantero', 78),
	j('jg-cavani', 'Edinson Cavani', 'Uruguay', 1987, 'ar-boca', 'delantero', 86),
	j('jg-dimaria', 'Ángel Di María', 'Argentina', 1988, 'ar-central', 'delantero', 90),
	j('jg-borja', 'Miguel Borja', 'Colombia', 1993, 'ar-river', 'delantero', 62),
	j('jg-arrascaeta', 'Giorgian de Arrascaeta', 'Uruguay', 1994, 'br-flamengo', 'delantero', 72),

	// --- Mediocampistas ------------------------------------------------------
	j('jg-bellingham', 'Jude Bellingham', 'Inglaterra', 2003, 'es-realmadrid', 'mediocampista', 94),
	j('jg-pedri', 'Pedri', 'España', 2002, 'es-barcelona', 'mediocampista', 88),
	j('jg-wirtz', 'Florian Wirtz', 'Alemania', 2003, 'en-liverpool', 'mediocampista', 88),
	j('jg-musiala', 'Jamal Musiala', 'Alemania', 2003, 'de-bayern', 'mediocampista', 88),
	j('jg-valverde', 'Federico Valverde', 'Uruguay', 1998, 'es-realmadrid', 'mediocampista', 86),
	j(
		'jg-macallister',
		'Alexis Mac Allister',
		'Argentina',
		1998,
		'en-liverpool',
		'mediocampista',
		84
	),
	j('jg-enzo', 'Enzo Fernández', 'Argentina', 2001, 'en-chelsea', 'mediocampista', 84),
	j('jg-palmer', 'Cole Palmer', 'Inglaterra', 2002, 'en-chelsea', 'mediocampista', 86),
	j('jg-vitinha', 'Vitinha', 'Portugal', 2000, 'fr-psg', 'mediocampista', 82),
	j('jg-tchouameni', 'Aurélien Tchouaméni', 'Francia', 2000, 'es-realmadrid', 'mediocampista', 82),
	j('jg-rice', 'Declan Rice', 'Inglaterra', 1999, 'en-arsenal', 'mediocampista', 84),
	j('jg-debruyne', 'Kevin De Bruyne', 'Bélgica', 1991, 'it-napoli', 'mediocampista', 92),
	j('jg-modric', 'Luka Modrić', 'Croacia', 1985, 'it-milan', 'mediocampista', 94),
	j('jg-barella', 'Nicolò Barella', 'Italia', 1997, 'it-inter', 'mediocampista', 80),
	j(
		'jg-mastantuono',
		'Franco Mastantuono',
		'Argentina',
		2007,
		'es-realmadrid',
		'mediocampista',
		78
	),
	j('jg-paredes', 'Leandro Paredes', 'Argentina', 1994, 'ar-boca', 'mediocampista', 74),
	j('jg-veiga', 'Raphael Veiga', 'Brasil', 1995, 'br-palmeiras', 'mediocampista', 64),
	j('jg-aliendro', 'Enzo Pérez', 'Argentina', 1986, 'ar-estudiantes', 'mediocampista', 66),

	// --- Defensores ----------------------------------------------------------
	j('jg-vandijk', 'Virgil van Dijk', 'Países Bajos', 1991, 'en-liverpool', 'defensor', 92),
	j('jg-rudiger', 'Antonio Rüdiger', 'Alemania', 1993, 'es-realmadrid', 'defensor', 82),
	j('jg-bastoni', 'Alessandro Bastoni', 'Italia', 1999, 'it-inter', 'defensor', 80),
	j('jg-saliba', 'William Saliba', 'Francia', 2001, 'en-arsenal', 'defensor', 84),
	j('jg-cubarsi', 'Pau Cubarsí', 'España', 2007, 'es-barcelona', 'defensor', 78),
	j('jg-hernandez', 'Theo Hernández', 'Francia', 1997, 'it-milan', 'defensor', 78),
	j('jg-nunomendes', 'Nuno Mendes', 'Portugal', 2002, 'fr-psg', 'defensor', 80),
	j('jg-hakimi', 'Achraf Hakimi', 'Marruecos', 1998, 'fr-psg', 'defensor', 86),
	j('jg-romero', 'Cristian Romero', 'Argentina', 1998, 'en-tottenham', 'defensor', 80),
	j('jg-otamendi', 'Nicolás Otamendi', 'Argentina', 1988, 'pt-benfica', 'defensor', 76),
	j('jg-molina', 'Nahuel Molina', 'Argentina', 1998, 'es-atletico', 'defensor', 72),
	j('jg-sergioramos', 'Sergio Ramos', 'España', 1986, 'mx-monterrey', 'defensor', 92),
	j('jg-marquinhos', 'Marquinhos', 'Brasil', 1994, 'fr-psg', 'defensor', 82),
	j('jg-araujo', 'Ronald Araújo', 'Uruguay', 1999, 'es-barcelona', 'defensor', 80)
];

/** Todo junto, para los eventos que no distinguen entre DT y jugador. */
export const personas: Persona[] = [...directoresTecnicos, ...jugadores];
