import { club, contexto } from '../../../content/mundo';
import { media } from './estado';
import type { Estado, HitoTemporada } from './tipos';

/**
 * La portada del diario del día después.
 *
 * Es la pantalla que cierra el año, y la spec de Bebo la llama la más
 * importante del juego. La razón es simple: los números de una temporada no se
 * sienten. "34 partidos, 11 goles, nota 6.8" no es nada. "LO GRITÓ TODO EL
 * MONUMENTAL" sí.
 *
 * Todo lo que sale acá se deduce del historial, sin azar nuevo: la portada no
 * decide nada, solo cuenta lo que ya pasó. Por eso vive en el motor y no en la
 * ruta, y por eso los dos jugadores ven exactamente la misma tapa.
 *
 * Los diarios son inventados a propósito. No hay ninguna marca real acá.
 */

export type Nota = { titulo: string; texto: string };

/** Qué se dibuja arriba de la tapa. Cada una es un SVG en `Portada.svelte`. */
export type Foto = 'gol' | 'copa' | 'mundial' | 'banco' | 'lesion' | 'pase' | 'debut' | 'campo';

export type Portada = {
	diario: string;
	fecha: string;
	titular: string;
	bajada: string;
	notas: Nota[];
	tono: 'gloria' | 'buena' | 'gris' | 'mala';
	foto: Foto;
	/** El club con cuya camiseta jugó el año: de ahí salen los colores. */
	clubId: string;
	/** Para la fajita de "temporada 4 · 2029". */
	temporada: number;
	anio: number;
};

/**
 * El diario de cada país.
 *
 * Nombres inventados con la cadencia de los diarios deportivos de cada lugar,
 * para que la tapa se sienta de donde el jugador está jugando. Cambiar de liga
 * cambia el diario, y ése es medio punto de que el pase se note.
 */
const DIARIOS: Record<string, string> = {
	ar: 'EL CLÁSICO',
	uy: 'LA CELESTE',
	br: 'O LANCE',
	cl: 'EL TABLÓN',
	mx: 'LA CANCHA',
	es: 'EL BALÓN',
	it: 'IL CAMPO',
	fr: 'LE MATCH',
	de: 'DER ANSTOSS',
	pt: 'A JOGADA',
	nl: 'DE AFTRAP',
	tr: 'SAHA',
	en: 'THE WHISTLE'
};

const MESES_DE_CIERRE: Record<string, string> = {
	// El calendario del hemisferio sur cierra a fin de año; el europeo, en junio.
	conmebol: 'Diciembre',
	concacaf: 'Diciembre',
	uefa: 'Junio'
};

export function diarioDe(clubId: string): string {
	return DIARIOS[contexto(clubId).pais.id] ?? 'EL PARTIDO';
}

/**
 * Arma la tapa de la temporada que acaba de cerrar.
 *
 * Devuelve `null` mientras no haya ninguna temporada jugada: en la primera
 * pretemporada no hay nada que contar todavía.
 */
export function portadaDe(estado: Estado): Portada | null {
	const historial = estado.historial ?? [];
	const hito = historial[historial.length - 1];
	if (!hito) return null;

	const f = estado.futbolista;
	const c = contexto(hito.clubId);
	const apellido = f.nombre.trim().split(/\s+/).slice(-1)[0].toUpperCase();
	const anterior = historial[historial.length - 2];

	const cabeza = titularDe(estado, hito, anterior, apellido);

	return {
		diario: diarioDe(hito.clubId),
		fecha: `${MESES_DE_CIERRE[c.pais.confederacion] ?? 'Diciembre'} de ${hito.anio}`,
		titular: cabeza.titular,
		bajada: cabeza.bajada,
		notas: notasDe(estado, hito, anterior),
		tono: cabeza.tono,
		foto: cabeza.foto,
		clubId: hito.clubId,
		temporada: hito.temporada,
		anio: hito.anio
	};
}

type Cabeza = { titular: string; bajada: string; tono: Portada['tono']; foto: Foto };

/**
 * El titular.
 *
 * Se elige por prioridad, de lo más grande a lo más chico: primero lo que
 * cualquier diario pondría en tapa —salir campeón del mundo, ganar la liga—, y
 * recién al final lo que pasa en una temporada común. El orden importa más que
 * cualquier otra cosa de este módulo: un año donde salió campeón y además metió
 * 20 goles tiene un solo titular posible.
 */
function titularDe(
	estado: Estado,
	hito: HitoTemporada,
	anterior: HitoTemporada | undefined,
	apellido: string
): Cabeza {
	const f = estado.futbolista;
	const nombreClub = club(hito.clubId).nombre;
	const gentilicio = contexto(hito.clubId).pais.gentilicio;

	// --- El Mundial ----------------------------------------------------------
	if (hito.mundial === 'campeon') {
		return {
			titular: 'CAMPEONES DEL MUNDO',
			bajada: `${f.nombre} volvió con la copa. Nada de lo que haga el resto de su carrera va a pesar más que esto.`,
			tono: 'gloria',
			foto: 'mundial'
		};
	}
	if (hito.mundial === 'final') {
		return {
			titular: 'TAN CERCA',
			bajada: `Subcampeones del mundo. ${apellido} jugó la final y va a tardar años en poder mirarla de nuevo.`,
			tono: 'buena',
			foto: 'mundial'
		};
	}
	if (hito.mundial && hito.mundial !== 'no-fue') {
		return {
			titular: `${apellido} JUGÓ EL MUNDIAL`,
			bajada:
				hito.mundial === 'fase-de-grupos'
					? `Se volvieron en primera ronda, pero estuvo. No todos llegan.`
					: `Llegó hasta ${hito.mundial === 'semifinal' ? 'semifinales' : 'cuartos'} con la selección. El nombre ya no es el mismo.`,
			tono: 'buena',
			foto: 'mundial'
		};
	}

	// --- El título -----------------------------------------------------------
	// Solo si es suyo. Que el club salga campeón mientras él mira desde el banco
	// no es su tapa: su tapa es la del banco, que está más abajo.
	if (hito.titulo) {
		return {
			titular: `${nombreClub.toUpperCase()}, CAMPEÓN`,
			bajada:
				hito.goles >= 10
					? `Con ${hito.goles} goles de ${apellido}, que fue de los que más pesó en la vuelta olímpica.`
					: `${f.nombre} dio la vuelta con ${hito.partidos} partidos jugados en la temporada.`,
			tono: 'gloria',
			foto: 'copa'
		};
	}

	// --- Lo que arruinó el año -----------------------------------------------
	if (hito.lesionado && hito.partidos < 12) {
		return {
			titular: 'UN AÑO PERDIDO',
			bajada: `${f.nombre} apenas pudo jugar ${hito.partidos} ${hito.partidos === 1 ? 'partido' : 'partidos'}. La lesión se llevó la temporada entera.`,
			tono: 'mala',
			foto: 'lesion'
		};
	}
	if (hito.partidos < 8) {
		return {
			titular: `${apellido}, EL GRAN AUSENTE`,
			bajada: `${hito.partidos} ${hito.partidos === 1 ? 'partido' : 'partidos'} en todo el año. En ${nombreClub} no lo tienen en cuenta y así no hay carrera que aguante.`,
			tono: 'mala',
			foto: 'banco'
		};
	}

	// --- El debut ------------------------------------------------------------
	if (!anterior && hito.partidos > 0) {
		return {
			titular: `DEBUTÓ ${apellido}`,
			bajada: `${hito.edad} años, ${hito.partidos} partidos en Primera y una carrera entera por delante.`,
			tono: 'buena',
			foto: 'debut'
		};
	}

	// --- El año grande -------------------------------------------------------
	if (hito.goles >= 20) {
		return {
			titular: `${hito.goles} GOLES`,
			bajada: `${f.nombre} hizo la temporada de su vida en ${nombreClub}. En el fútbol ${gentilicio} no se habla de otra cosa.`,
			tono: 'gloria',
			foto: 'gol'
		};
	}
	if (hito.nota >= 8) {
		return {
			titular: `EL AÑO DE ${apellido}`,
			bajada: `${hito.partidos} partidos, ${hito.goles} ${hito.goles === 1 ? 'gol' : 'goles'} y ${hito.asistencias} ${hito.asistencias === 1 ? 'asistencia' : 'asistencias'}. Terminó siendo la figura de ${nombreClub}.`,
			tono: 'gloria',
			foto: 'gol'
		};
	}

	// --- El pase -------------------------------------------------------------
	if (hito.seFue) {
		const destino = club(estado.futbolista.contrato.clubId).nombre;
		return {
			titular: `SE VA A ${destino.toUpperCase()}`,
			bajada: `${f.nombre} deja ${nombreClub} después de ${estado.temporadasPorClub?.[hito.clubId] ?? 1} ${(estado.temporadasPorClub?.[hito.clubId] ?? 1) === 1 ? 'temporada' : 'temporadas'}. Arranca otra cosa.`,
			tono: 'buena',
			foto: 'pase'
		};
	}

	// --- El año común --------------------------------------------------------
	if (hito.nota >= 6.5) {
		return {
			titular: `${apellido} CUMPLIÓ`,
			bajada: `Temporada sólida: ${hito.partidos} partidos y nota ${hito.nota.toFixed(1)}. De esos años que no se recuerdan pero que construyen una carrera.`,
			tono: 'buena',
			foto: 'campo'
		};
	}
	if (hito.nota >= 5) {
		return {
			titular: 'TEMPORADA GRIS',
			bajada: `${f.nombre} jugó ${hito.partidos} partidos sin terminar de aparecer. Nota ${hito.nota.toFixed(1)}: ni bien ni mal.`,
			tono: 'gris',
			foto: 'campo'
		};
	}
	return {
		titular: 'NO FUE EL AÑO',
		bajada: `Nota ${hito.nota.toFixed(1)} en ${hito.partidos} partidos. En ${nombreClub} empezaron a mirar para otro lado.`,
		tono: 'mala',
		foto: 'banco'
	};
}

/**
 * Las notas del costado.
 *
 * Son las que dan la sensación de que el mundo siguió pasando: lo que subió,
 * lo que se le vino encima, y lo que le espera. Se arman por prioridad y se
 * cortan en tres para que la tapa no se vuelva una lista.
 */
function notasDe(estado: Estado, hito: HitoTemporada, anterior: HitoTemporada | undefined): Nota[] {
	const f = estado.futbolista;
	const notas: Nota[] = [];

	if (anterior) {
		const subio = hito.media - anterior.media;
		if (subio >= 3) {
			notas.push({
				titulo: 'Creció',
				texto: `Su media pasó de ${anterior.media} a ${hito.media}. A los ${hito.edad} todavía está lejos del techo.`
			});
		} else if (subio <= -2) {
			notas.push({
				titulo: 'Se le empieza a ir',
				texto: `De ${anterior.media} a ${hito.media}. A los ${hito.edad} el cuerpo devuelve menos de lo que se le pide.`
			});
		}

		const valor = hito.valorUsd - anterior.valorUsd;
		if (Math.abs(valor) > anterior.valorUsd * 0.35 && Math.abs(valor) > 100_000) {
			notas.push({
				titulo: valor > 0 ? 'Vale más' : 'Vale menos',
				texto: `El mercado lo tasa en USD ${hito.valorUsd.toLocaleString('es-AR')}, ${valor > 0 ? 'arriba de' : 'abajo de'} los USD ${anterior.valorUsd.toLocaleString('es-AR')} del año pasado.`
			});
		}
	}

	if (hito.titulo && hito.mundial) {
		notas.push({
			titulo: 'Doblete',
			texto: `Salió campeón con ${club(hito.clubId).nombre} en el mismo año en que jugó el Mundial. De esos hay uno cada mucho tiempo.`
		});
	} else if (hito.campeon && !hito.titulo) {
		notas.push({
			titulo: 'La vuelta ajena',
			texto: `${club(hito.clubId).nombre} salió campeón, pero él estuvo abajo. Es la clase de título que después nadie te reconoce.`
		});
	}

	if (f.contrato.temporadasRestantes === 0) {
		notas.push({
			titulo: 'Se le vence',
			texto: `Queda libre en ${club(f.contrato.clubId).nombre}. Los teléfonos ya empezaron a sonar.`
		});
	} else if (f.contrato.temporadasRestantes === 1) {
		notas.push({
			titulo: 'Último año',
			texto: `Le queda una sola temporada de contrato. Si no renueva, el que viene es el año de la decisión.`
		});
	}

	if (estado.confianza < 30) {
		notas.push({
			titulo: 'La relación',
			texto: `En el entorno dicen que ${f.nombre} y ${estado.representante.nombre} casi no se hablan. Nunca termina bien.`
		});
	}

	if (f.desgaste >= 70) {
		notas.push({
			titulo: 'El cuerpo',
			texto: `Los médicos no lo dicen en voz alta, pero el desgaste ya está en ${f.desgaste}. Cada temporada de acá en adelante es una decisión.`
		});
	}

	if (notas.length === 0) {
		notas.push({
			titulo: 'El año que viene',
			texto: `${f.nombre} arranca la pretemporada con ${media(f.atributos, f.posicion)} de media y ${f.edad} años.`
		});
	}

	return notas.slice(0, 3);
}
