import { club, clubesDe, contexto } from '../../../content/mundo';
import { media } from './estado';
import { arqueroActualDe, dtActualDe, jugadoresActualesDe } from './mercado';
import { rngPara, type Rng } from './rng';
import type { Efecto, ResultadoDeOcasion } from './ocasiones';
import type { Estado, Futbolista, Posicion, ResumenTemporada } from './tipos';

/**
 * La temporada jugada.
 *
 * Acá se simula el año entero de una vez: cuánto jugó, cuánto metió, cómo
 * terminó el equipo y qué le pasó al cuerpo. No se simula partido por partido
 * —serían 34 tiradas que nadie mira— sino la temporada como un todo, y después
 * se narran cuatro o cinco jugadas concretas con nombres de verdad, que es lo
 * que se recuerda.
 *
 * El principio es el de la spec de Bebo: los números los decide el motor. La
 * capa narrativa cuenta lo que ya pasó, nunca lo cambia.
 */

export const PARTIDOS_POR_TEMPORADA = 34;

/** Una jugada concreta, ya narrada, para el resumen y el diario. */
export type Jugada = {
	tipo: 'gol' | 'asistencia' | 'lesion' | 'roja' | 'tecnico' | 'prensa' | 'titulo' | 'ocasion';
	texto: string;
};

// ---------------------------------------------------------------------------
// Cuánto juega
// ---------------------------------------------------------------------------

/**
 * Qué tan lejos está el futbolista de lo que ese club, en esa liga, exige.
 *
 * Positivo: es mejor de lo que el puesto pide, y va a jugar todo. Negativo:
 * está por debajo y va a mirar desde el banco. Es la cuenta que hace que subir
 * de club se pague con minutos, que es el costo real de un buen pase.
 */
export function brechaCon(futbolista: Futbolista, clubId: string): number {
	const { club: c, liga } = contexto(clubId);

	// La liga manda: para jugar en el Ascenso alcanza con una media de 38, para
	// la Liga Profesional hacen falta 60 y para la Premier, 82. El prestigio del
	// club mueve la vara unos puntos alrededor de eso, no la define.
	const exigencia = liga.fuerza * 0.82 + (c.prestigio - 50) * 0.22;
	const suyo =
		media(futbolista.atributos, futbolista.posicion) +
		(futbolista.forma - 55) * 0.25 +
		futbolista.dt * 0.06 -
		futbolista.desgaste * 0.12;
	return suyo - exigencia;
}

function porcentajeDeJuego(brecha: number): number {
	return Math.max(4, Math.min(100, Math.round(52 + brecha * 2)));
}

// ---------------------------------------------------------------------------
// Cuánto mete
// ---------------------------------------------------------------------------

/** Goles esperados cada 90 minutos, por puesto y por atributos. */
function golesPor90(f: Futbolista): number {
	const a = f.atributos;
	const factor: Record<Posicion, number> = {
		delantero: 0.85,
		mediocampista: 0.32,
		defensor: 0.1,
		arquero: 0
	};
	const punteria = (a.definicion * 0.6 + a.regate * 0.2 + a.velocidad * 0.2) / 100;
	return factor[f.posicion] * punteria;
}

function asistenciasPor90(f: Futbolista): number {
	const a = f.atributos;
	const factor: Record<Posicion, number> = {
		delantero: 0.3,
		mediocampista: 0.45,
		defensor: 0.14,
		arquero: 0.01
	};
	return (factor[f.posicion] * (a.pase * 0.65 + a.regate * 0.35)) / 100;
}

/**
 * Cuánto castiga la liga.
 *
 * En la Premier el mismo jugador mete la mitad que en el Ascenso. Es lo que
 * hace que un pase a Europa pueda ser un gran negocio y una mala temporada al
 * mismo tiempo, que es exactamente la tensión del juego.
 */
function ajustePorLiga(clubId: string): number {
	return 58 / (contexto(clubId).liga.fuerza + 20);
}

// ---------------------------------------------------------------------------
// Cómo le fue al equipo
// ---------------------------------------------------------------------------

function puestoEnLaLiga(clubId: string, aporte: number, rng: Rng): number {
	const { club: c, liga } = contexto(clubId);
	const rivales = clubesDe(liga.id);
	const mejores = rivales.filter((r) => r.prestigio > c.prestigio).length;

	// El club termina más o menos donde su prestigio dice, con un margen de
	// suerte y un empujón por lo que aportó el futbolista.
	const esperado = mejores + 1;
	const ruido = rng.entero(-4, 4) - Math.round(aporte);
	return Math.max(1, Math.min(rivales.length, esperado + ruido));
}

// ---------------------------------------------------------------------------
// La temporada
// ---------------------------------------------------------------------------

export type ResultadoTemporada = {
	resumen: ResumenTemporada;
	jugadas: Jugada[];
};

/**
 * Corre la temporada completa. Muta el futbolista que recibe (ya viene clonado
 * por `resolverFase`) y devuelve el resumen más las jugadas narradas.
 */
export function jugarTemporada(
	estado: Estado,
	ocasiones: readonly ResultadoDeOcasion[],
	semilla: string
): ResultadoTemporada {
	const f = estado.futbolista;
	const clubId = f.contrato.clubId;
	const rng = rngPara(semilla, { temporada: estado.temporada, fase: 2, clave: 'temporada' });
	const jugadas: Jugada[] = [];

	// --- Lo que sale de la rueda de ocasión ----------------------------------
	// Se aplica primero porque cambia la moral y la relación con el técnico, y
	// eso pesa en cuánto juega el resto del año.
	let golesDeOcasion = 0;
	let asistenciasDeOcasion = 0;
	for (const resultado of ocasiones) {
		aplicarEfecto(estado, resultado.efecto);
		golesDeOcasion += resultado.efecto.goles ?? 0;
		asistenciasDeOcasion += resultado.efecto.asistencias ?? 0;
		if (resultado.texto) jugadas.push({ tipo: 'ocasion', texto: resultado.texto });
	}

	// --- Minutos -------------------------------------------------------------
	const brecha = brechaCon(f, clubId);
	const porcentaje = porcentajeDeJuego(brecha);

	// La lesión se descuenta de los partidos, no del rendimiento: el que se
	// rompe en agosto no juega mal, no juega.
	const riesgoLesion = 0.07 + f.desgaste / 500 + Math.max(0, f.edad - 30) * 0.012;
	const lesionado = rng.ocurre(Math.min(0.5, riesgoLesion));
	const partidosPerdidos = lesionado ? rng.entero(4, 14) : 0;

	const partidos = Math.max(
		0,
		Math.round((PARTIDOS_POR_TEMPORADA * porcentaje) / 100) - partidosPerdidos
	);
	const minutos = Math.round(partidos * (40 + porcentaje * 0.5));

	if (lesionado) {
		jugadas.push({
			tipo: 'lesion',
			texto: `Se rompió y estuvo ${partidosPerdidos} fechas afuera. El cuerpo empieza a pasar factura.`
		});
		f.desgaste = Math.min(100, f.desgaste + rng.entero(2, 5));
	}

	// --- Goles y asistencias -------------------------------------------------
	const ajuste = ajustePorLiga(clubId);
	const noventas = minutos / 90;
	const suerte = () => rng.entero(70, 135) / 100;

	const goles =
		golesDeOcasion + Math.round(golesPor90(f) * noventas * ajuste * suerte() * (f.forma / 60));
	const asistencias =
		asistenciasDeOcasion + Math.round(asistenciasPor90(f) * noventas * ajuste * suerte());

	// --- El equipo -----------------------------------------------------------
	const aporte = (goles + asistencias) / 11 + Math.max(0, brecha) / 18;
	const puesto = puestoEnLaLiga(clubId, aporte, rng);
	const equipos = clubesDe(contexto(clubId).liga.id).length;
	const campeon = puesto === 1;

	if (campeon) {
		f.titulos += 1;
		jugadas.push({
			tipo: 'titulo',
			texto: `${club(clubId).nombre} salió campeón de ${contexto(clubId).liga.nombre}. Vuelta olímpica.`
		});
	}

	// --- Nota de la temporada ------------------------------------------------
	const nota = calificar(f, porcentaje, goles, asistencias, puesto, equipos, ajuste);

	// --- Las jugadas que se recuerdan ----------------------------------------
	jugadas.push(...narrar(estado, { goles, asistencias, partidos, nota, puesto }, rng, semilla));

	// --- Lo que deja en el cuerpo y en la cabeza -----------------------------
	f.partidos += partidos;
	f.goles += goles;
	f.asistencias += asistencias;
	f.minutos += minutos;

	f.desgaste = Math.min(100, f.desgaste + Math.round(minutos / 1600) + rng.entero(0, 1));
	f.moral = acotar(f.moral + Math.round((nota - 6) * 4), 0, 100);
	f.dt = acotar(f.dt + Math.round((nota - 6) * 3), -100, 100);
	f.hinchada = acotar(f.hinchada + Math.round((nota - 6) * 4 + goles), 0, 100);
	f.prensa = acotar(f.prensa + Math.round((nota - 6) * 2), -100, 100);
	// La fama la limita dónde jugás. Se puede ser el mejor del Ascenso y que no
	// te conozca nadie: para que te conozcan hay que subir, y ése es el motivo
	// por el que el pase existe.
	const techoDeFama = Math.min(
		100,
		Math.round(contexto(clubId).liga.fuerza * 0.5 + contexto(clubId).club.prestigio * 0.5) + 10
	);
	const subeFama = Math.round(goles * 0.7 + asistencias * 0.4 + (campeon ? 6 : 0) + (nota - 6) * 2);
	f.fama = acotar(Math.min(f.fama + subeFama, Math.max(f.fama, techoDeFama)), 0, 100);

	return {
		resumen: {
			temporada: estado.temporada,
			clubId,
			partidos,
			goles,
			asistencias,
			minutos,
			puesto,
			equipos,
			nota,
			lesionado,
			campeon
		},
		jugadas
	};
}

/**
 * La nota del año, de 1 a 10.
 *
 * Mezcla cuánto jugó, cuánto produjo y cómo terminó el equipo. Es el número que
 * después mueve moral, técnico, hinchada y prensa, así que conviene que sea uno
 * solo y bien entendible.
 */
function calificar(
	f: Futbolista,
	porcentaje: number,
	goles: number,
	asistencias: number,
	puesto: number,
	equipos: number,
	ajuste: number
): number {
	const porMinutos = (porcentaje / 100) * 3;

	// Lo que se le pide a un puesto, corregido por lo fácil que es convertir en
	// esa liga: veinte goles en el Ascenso no son veinte goles en la Premier.
	const base = f.posicion === 'delantero' ? 17 : f.posicion === 'mediocampista' ? 10 : 4;
	const esperados = Math.max(2, base * ajuste);
	const porProduccion = Math.min(4, ((goles + asistencias * 0.7) / esperados) * 4);

	const porEquipo = (1 - (puesto - 1) / Math.max(1, equipos - 1)) * 2;

	const nota = 1 + porMinutos + porProduccion + porEquipo;
	return Math.round(Math.max(1, Math.min(10, nota)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Narrar
// ---------------------------------------------------------------------------

type Cifras = {
	goles: number;
	asistencias: number;
	partidos: number;
	nota: number;
	puesto: number;
};

/**
 * Las cuatro o cinco frases que quedan de la temporada.
 *
 * Todas se arman con gente real del mundo: el arquero al que le metiste el gol,
 * el técnico que te bancó, la figura del rival que te marcó. Es lo que hace la
 * diferencia entre "metiste 12 goles" y "le metiste un gol al Dibu Martínez".
 */
function narrar(estado: Estado, cifras: Cifras, rng: Rng, semilla: string): Jugada[] {
	const f = estado.futbolista;
	const clubId = f.contrato.clubId;
	const cambios = estado.cambiosMundo;
	const jugadas: Jugada[] = [];

	const rivales = clubesDe(contexto(clubId).liga.id).filter((c) => c.id !== clubId);

	// --- Un gol con nombre y apellido ---------------------------------------
	if (cifras.goles > 0 && rivales.length > 0) {
		const rival = rng.elegir(rivales);
		const arquero = arqueroActualDe(rival.id, cambios);
		const minuto = rng.entero(3, 92);
		jugadas.push({
			tipo: 'gol',
			texto: arquero
				? `Le metiste un gol a ${arquero.nombre} en la cancha de ${rival.nombre}, a los ${minuto} minutos.`
				: `Le metiste un gol a ${rival.nombre} a los ${minuto} minutos.`
		});
	}

	// --- Una asistencia a alguien conocido -----------------------------------
	if (cifras.asistencias > 0) {
		const companeros = jugadoresActualesDe(clubId, cambios).filter((p) => p.id !== 'yo');
		if (companeros.length > 0) {
			const companero = rng.elegir(companeros);
			jugadas.push({
				tipo: 'asistencia',
				texto: `Le diste el pase del gol a ${companero.nombre}. Te fue a buscar al banco a festejar.`
			});
		}
	}

	// --- Lo que dijo el técnico ----------------------------------------------
	const dt = dtActualDe(clubId, cambios);
	if (dt) {
		jugadas.push({
			tipo: 'tecnico',
			texto:
				cifras.nota >= 7
					? `${dt.nombre} te nombró en la conferencia: dijo que sos de los que no se negocian.`
					: cifras.nota >= 5
						? `${dt.nombre} te bancó puertas adentro, pero te pidió más.`
						: `${dt.nombre} dejó de contar con vos y lo dijo sin vueltas.`
		});
	}

	// --- Lo que dijo alguien de afuera ---------------------------------------
	// Solo cuando el año fue bueno de verdad: si no, nadie te nombra.
	if (cifras.nota >= 7.5 && rivales.length > 0) {
		const rival = rng.elegir(rivales);
		const dtRival = dtActualDe(rival.id, cambios);
		if (dtRival) {
			jugadas.push({
				tipo: 'prensa',
				texto: `${dtRival.nombre}, técnico de ${rival.nombre}, te bancó en rueda de prensa: "es el que más me preocupa de ese equipo".`
			});
		}
	}

	// --- Y una postal del año ------------------------------------------------
	const clima =
		cifras.nota >= 8
			? 'Terminaste el año siendo el que la gente va a ver.'
			: cifras.nota >= 6
				? 'Un año correcto: jugaste, cumpliste, no rompiste nada.'
				: cifras.partidos < 8
					? 'Un año de banco. Los que miran desde afuera no suman.'
					: 'Un año para olvidar. Se notó, y te lo hicieron notar.';
	jugadas.push({ tipo: 'prensa', texto: clima });

	// Semilla usada arriba: la dejamos referenciada para que quede claro que
	// todo lo de acá también es reproducible.
	void semilla;

	return jugadas;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

export function aplicarEfecto(estado: Estado, efecto: Efecto): void {
	const f = estado.futbolista;
	if (efecto.fama) f.fama = acotar(f.fama + efecto.fama, 0, 100);
	if (efecto.moral) f.moral = acotar(f.moral + efecto.moral, 0, 100);
	if (efecto.dt) f.dt = acotar(f.dt + efecto.dt, -100, 100);
	if (efecto.hinchada) f.hinchada = acotar(f.hinchada + efecto.hinchada, 0, 100);
	if (efecto.prensa) f.prensa = acotar(f.prensa + efecto.prensa, -100, 100);
	if (efecto.desgaste) f.desgaste = acotar(f.desgaste + efecto.desgaste, 0, 100);
	if (efecto.confianza) estado.confianza = acotar(estado.confianza + efecto.confianza, 0, 100);
}

function acotar(valor: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, valor));
}
