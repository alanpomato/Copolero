import { club, clubesDe, contexto } from '../../../content/mundo';
import { aprovechaDe, nombreAtributo, rindeDeLaEdad } from './entrenamiento';
import { media } from './estado';
import {
	aprovechaExtra,
	empujeDeLosBotines,
	pisoDeMoral,
	riesgoDeLesionExtra
} from './inversiones';
import { objetivo as objetivoPorId } from './objetivos';
import { atributosQueUsa } from './puestos';
import { loQueAporta } from './rasgos';
import { arqueroActualDe, dtActualDe, jugadoresActualesDe } from './mercado';
import { rngPara, type Rng } from './rng';
import type { Efecto, ResultadoDeOcasion } from './ocasiones';
import type { Atributos, Estado, Futbolista, Posicion, ResumenTemporada } from './tipos';

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

/**
 * Partidos mínimos para que el título del club sea también suyo.
 *
 * El equipo puede salir campeón sin él. Que el club dé la vuelta es una cosa
 * —va al diario— y que el título entre en su vitrina es otra. La diferencia
 * importa: sin esta regla, un suplente eterno en un grande termina la carrera
 * con más títulos que un ídolo de un club chico.
 */
export const PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO = 10;

/**
 * Qué parte de lo que le falta al techo se recorta en una temporada perfecta.
 *
 * Cerca del techo cada punto cuesta: el que ya está a cinco de su potencial
 * sube de a poco por más que juegue todo.
 */
const VELOCIDAD_DE_CRECIMIENTO = 0.3;

/**
 * Y cuánta media se puede ganar en una sola temporada, como mucho.
 *
 * Sin este tope, un pibe con mucho futuro pasaba de 41 a 62 en un año, porque
 * la fracción de una distancia enorme también es enorme. Nadie mejora veinte
 * puntos en un verano; lo que pasa de verdad es que mejora cuatro o cinco cada
 * año durante cinco años, y ésa es justamente la parte de la carrera que vale
 * la pena jugar temporada por temporada.
 */
const TOPE_DE_CRECIMIENTO_POR_TEMPORADA = 4.5;

/** Una jugada concreta, ya narrada, para el resumen y el diario. */
export type Jugada = {
	tipo:
		| 'gol'
		| 'asistencia'
		| 'lesion'
		| 'roja'
		| 'tecnico'
		| 'prensa'
		| 'titulo'
		| 'ocasion'
		| 'progreso';
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

/**
 * Hasta dónde te puede conocer la gente jugando donde jugás.
 *
 * Se puede ser el mejor del Ascenso y que no te conozca nadie: para que te
 * conozcan hay que subir, y ése es el motivo por el que el pase existe. Es una
 * de las reglas que sostienen el juego entero, así que vive acá y la respeta
 * todo el que toque la fama —incluidos los eventos, que durante un rato la
 * pasaban por arriba y dejaban a un jugador del Ascenso con fama de crack.
 */
export function techoDeFama(clubId: string): number {
	const { club: c, liga } = contexto(clubId);
	return Math.min(100, Math.round(liga.fuerza * 0.5 + c.prestigio * 0.5) + 10);
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
	semilla: string,
	objetivoId?: string
): ResultadoTemporada {
	const f = estado.futbolista;
	const clubId = f.contrato.clubId;

	// Cómo decidió jugar el año. Es la palanca que el futbolista tiene sobre la
	// temporada: no cambia lo que es, cambia de dónde sale lo que hace.
	const plan = objetivoPorId(objetivoId);
	// Y lo que es desde la primera pretemporada, que no cambia nunca.
	const suyo = loQueAporta(estado);
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
	const porcentaje = Math.max(
		4,
		Math.min(100, porcentajeDeJuego(brecha) + plan.minutos + suyo.minutos)
	);

	// La lesión se descuenta de los partidos, no del rendimiento: el que se
	// rompe en agosto no juega mal, no juega.
	const riesgoLesion = (0.07 + f.desgaste / 500 + Math.max(0, f.edad - 30) * 0.012) * plan.lesion;
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
		golesDeOcasion +
		Math.round(
			golesPor90(f) *
				noventas *
				ajuste *
				suerte() *
				(f.forma / 60) *
				plan.goles *
				suyo.goles *
				empujeDeLosBotines(estado)
		);
	const asistencias =
		asistenciasDeOcasion +
		Math.round(
			asistenciasPor90(f) *
				noventas *
				ajuste *
				suerte() *
				plan.asistencias *
				suyo.asistencias *
				empujeDeLosBotines(estado)
		);

	// --- El equipo -----------------------------------------------------------
	const aporte = (goles + asistencias) / 11 + Math.max(0, brecha) / 18 + plan.equipo + suyo.equipo;
	const puesto = puestoEnLaLiga(clubId, aporte, rng);
	const equipos = clubesDe(contexto(clubId).liga.id).length;
	const campeon = puesto === 1;

	// El título es del que jugó. Un pibe que miró la temporada entera desde el
	// banco no sale campeón: sale en la foto.
	if (campeon && partidos >= PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO) {
		f.titulos += 1;
		jugadas.push({
			tipo: 'titulo',
			texto: `${club(clubId).nombre} salió campeón de ${contexto(clubId).liga.nombre}. Vuelta olímpica.`
		});
	}

	// --- Nota de la temporada ------------------------------------------------
	const nota = calificar(
		f,
		porcentaje,
		goles,
		asistencias,
		puesto,
		equipos,
		ajuste,
		brecha,
		minutos
	);

	// --- Las jugadas que se recuerdan ----------------------------------------
	jugadas.push(...narrar(estado, { goles, asistencias, partidos, nota, puesto }, rng, semilla));

	// --- Lo que deja en el cuerpo y en la cabeza -----------------------------
	// Dónde jugó este año, para el multiplicador de permanencia del final.
	estado.temporadasPorClub = {
		...estado.temporadasPorClub,
		[clubId]: (estado.temporadasPorClub?.[clubId] ?? 0) + 1
	};
	// Un año de banco o roto no cuenta como carrera. El corte es bajo a
	// propósito: cinco partidos ya es haber estado, y el que rota no merece el
	// castigo del que no jugó nunca.
	if (partidos < 5) estado.temporadasPerdidas = (estado.temporadasPerdidas ?? 0) + 1;

	f.partidos += partidos;
	f.goles += goles;
	f.asistencias += asistencias;
	f.minutos += minutos;

	// Jugar te hace mejor. Ver `crecerPorJugar`.
	const crecio = crecerPorJugar(estado, { minutos, nota }, rng);
	if (crecio.length > 0) {
		jugadas.push({
			tipo: 'progreso',
			texto:
				`Un año entero de competencia te dejó algo: ` +
				crecio.map((c) => `${nombreAtributo(c.atributo)} +${c.puntos}`).join(', ') +
				'.'
		});
	}

	f.desgaste = Math.max(
		0,
		Math.min(100, f.desgaste + Math.round(minutos / 1600) + rng.entero(0, 1) + plan.desgaste)
	);
	// El psicólogo no te hace jugar mejor: te sostiene el año malo, que es
	// justamente cuando hace falta.
	f.moral = acotar(f.moral + Math.round((nota - 6) * 4), pisoDeMoral(estado), 100);
	f.dt = acotar(f.dt + Math.round((nota - 6) * 3) + plan.dt + suyo.dt, -100, 100);
	f.hinchada = acotar(f.hinchada + Math.round((nota - 6) * 4 + goles), 0, 100);
	f.prensa = acotar(f.prensa + Math.round((nota - 6) * 2), -100, 100);
	// La fama la limita dónde jugás. Ver `techoDeFama`.
	const techo = techoDeFama(clubId);
	const subeFama = Math.round(goles * 0.7 + asistencias * 0.4 + (campeon ? 6 : 0) + (nota - 6) * 2);
	f.fama = acotar(Math.min(f.fama + subeFama, Math.max(f.fama, techo)), 0, 100);

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
 * Lo que se aprende jugando.
 *
 * Hasta acá lo único que subía atributos era la pretemporada: un plan al año,
 * uno o dos atributos, dos o tres puntos. Con eso una carrera entera movía la
 * media cuatro puntos y la curva de la trayectoria salía plana. Un juego donde
 * el jugador no cambia en veinte temporadas no tiene por qué seguir jugándose.
 *
 * Jugar bien te hace mejor, que además es como funciona de verdad. Y cierra el
 * lazo del juego: jugar te sube, subir te hace jugar más, y quedarte en un club
 * donde no entrás te cuesta las dos cosas a la vez. Ese castigo es lo que le da
 * peso a la decisión del mercado.
 *
 * Cuatro cosas lo limitan, y casi todas son decisiones de alguien:
 *  - los minutos, que dependen de dónde eligió jugar,
 *  - contra quiénes, que es la liga donde eligió jugarlos,
 *  - la nota, que depende de cómo le fue,
 *  - y la edad, con la misma curva que la pretemporada.
 * El techo sigue siendo el potencial, que nadie ve.
 *
 * El segundo llegó tarde y arreglando algo grave. Medí treinta carreras de dos
 * formas: el que nunca se mueve del Ascenso y el que agarra siempre la mejor
 * liga que le ofrecen. Con el mismo potencial —77,8— el que se quedaba terminaba
 * en media 73 y el que subía en 60,8. Subir de liga te hacía peor jugador.
 *
 * Se entiende por qué: arriba jugaba el 47% de los minutos contra el 117% de
 * abajo, y encima con peor nota. Dos castigos, ninguna compensación. Pero
 * entrenar todos los días contra los mejores del mundo forma, aunque se entre
 * desde el banco, y sin ese término el juego decía que la Premier era una mala
 * idea. Ahora media temporada en una liga grande rinde parecido a una entera en
 * el Ascenso, y una entera en una liga grande rinde más que las dos, que es lo
 * que uno quiere que sea la carrera.
 */
/**
 * Cuánto forma estar ahí, sin contar los minutos.
 *
 * Es el piso: lo que se aprende entrenando con el plantel aunque no se entre.
 * Sin esto, el pibe que se va a un club grande y espera su lugar dos años sale
 * peor que si nunca se hubiera movido, y eso no es lo que pasa.
 */
const PISO_POR_ESTAR = 0.35;

/**
 * Contra quiénes juega y entrena.
 *
 * De la Primera Nacional (fuerza 45) a la Premier (95). Una liga grande forma
 * casi el doble que el Ascenso, y ésa es la única razón por la que vale la pena
 * irse a un lugar donde al principio se juega menos.
 */
function contraQuienes(clubId: string): number {
	const fuerza = contexto(clubId).liga.fuerza;
	return Math.max(0.8, Math.min(1.45, 0.8 + (fuerza - 45) * 0.013));
}

export function crecerPorJugar(
	estado: Estado,
	anio: { minutos: number; nota: number },
	rng: Rng
): { atributo: keyof Atributos; puntos: number }[] {
	const f = estado.futbolista;
	const margen = f.potencial - media(f.atributos, f.posicion);
	if (margen <= 0) return [];

	// Una temporada completa son unos 2.400 minutos de titular. El que no entró
	// nunca no aprende nada: sin un minuto, no hay año.
	if (anio.minutos <= 0) return [];
	const cuantoJugo = Math.min(1, anio.minutos / 2400);

	// Y lo que se aprende sin jugar, que también es algo. El que está en el
	// plantel entrena todos los días con los titulares, y eso forma: por eso la
	// parte que dan los minutos arranca de un piso en vez de ir de cero a uno.
	const competir = PISO_POR_ESTAR + (1 - PISO_POR_ESTAR) * cuantoJugo;

	// La nota modula, no habilita: un año malo jugando todos los domingos
	// también forma. Lo que no forma es no jugar.
	//
	// El rango es angosto a propósito. Antes iba de 0,15 a 1,4 y terminaba
	// decidiendo la carrera sola: un 7,4 goleando en el Ascenso formaba un 30%
	// más que un 6,4 peleándola en Europa, que es al revés de como pasa.
	const comoLeFue = Math.max(0.5, Math.min(1.15, 0.5 + (anio.nota - 3) / 10));

	// La velocidad con la que se acorta la distancia al techo. El crecimiento se
	// mide contra el potencial y no en puntos fijos: así un pibe con futuro
	// pega el salto en tres temporadas y uno del montón se estanca donde está,
	// que es lo que hace que el potencial oculto valga la pena de adivinar.
	const acercarse =
		Math.min(TOPE_DE_CRECIMIENTO_POR_TEMPORADA, margen * VELOCIDAD_DE_CRECIMIENTO) *
		(rindeDeLaEdad(f.edad) / 1.6) *
		competir *
		contraQuienes(f.contrato.clubId) *
		comoLeFue *
		// Lo que se hizo en el verano decide cuánto se aprovecha el año. Es lo que
		// hace que entrenar a matar valga la pena a pesar del desgaste.
		aprovechaDe(estado.intensidadDeLaPretemporada) *
		aprovechaExtra(estado) *
		loQueAporta(estado).crecimiento *
		(rng.entero(80, 125) / 100);

	// Los puntos se reparten entre los atributos del puesto, así que hacen falta
	// tantos como atributos para mover la media un punto.
	const orden = [...atributosQueUsa(f.posicion)];
	const puntos = Math.round(acercarse * orden.length);
	if (puntos <= 0) return [];

	// Se reparten entre lo que el puesto usa, empezando por lo que más pesa: un
	// 9 que juega un año entero mejora la definición antes que la marca.
	const subieron = new Map<keyof Atributos, number>();
	for (let i = 0; i < puntos; i++) {
		const atributo = orden[i % orden.length];
		if (f.atributos[atributo] >= 99) continue;
		f.atributos[atributo] = Math.min(99, f.atributos[atributo] + 1);
		subieron.set(atributo, (subieron.get(atributo) ?? 0) + 1);
	}

	const lista = [...subieron.entries()].map(([atributo, puntos]) => ({ atributo, puntos }));
	estado.atributosQueSubieron = [
		...new Set([...(estado.atributosQueSubieron ?? []), ...lista.map((l) => l.atributo)])
	];
	return lista;
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
	ajuste: number,
	brecha: number,
	minutos: number
): number {
	const porMinutos = (porcentaje / 100) * 3;

	// Lo que se le pide a un puesto, corregido por tres cosas.
	const base = f.posicion === 'delantero' ? 17 : f.posicion === 'mediocampista' ? 10 : 4;

	// Una: lo fácil que es convertir en esa liga. Veinte goles en el Ascenso no
	// son veinte goles en la Premier.
	// Dos: cuánto se jugó. Al que estuvo media temporada afuera no se le puede
	// pedir la producción de un año entero, y castigarlo por eso era contar dos
	// veces lo mismo, porque los minutos ya puntúan aparte.
	// Tres, y es la que faltaba: cuánto mejor es que la liga donde juega. A una
	// figura se le exige más que a uno del montón, y sin esto un jugador que se
	// quedaba en un club chico sacaba diez todos los años sin hacer nada. Una
	// nota que siempre da diez no dice nada, y de paso hacía que irse a una liga
	// más fuerte fuera puro castigo.
	const temporadaCompleta = Math.max(0.3, Math.min(1, minutos / 2400));
	const porSerFigura = 1 + Math.max(0, brecha) / 16;
	const esperados = Math.max(1, base * ajuste * temporadaCompleta * porSerFigura);
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
