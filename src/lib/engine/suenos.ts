import { contexto } from '../../../content/mundo';
import type { Estado, Posicion, Rol } from './tipos';

/**
 * El sueño: para qué está jugando cada uno.
 *
 * Es lo único del juego que se elige en la primera pretemporada y recién se
 * paga diez o quince temporadas después. Todo lo demás se resuelve rápido —el
 * objetivo del año dura un año, la ocasión dura una fase, el pase se cierra y
 * listo—, y un juego hecho solo de cosas que se resuelven rápido se abandona
 * apenas la vida se pone en el medio. Lo que hace volver es una cuenta a medio
 * terminar: ciento setenta y siete de doscientos goles no se deja ahí.
 *
 * Hay uno por rol y son distintos a propósito. El futbolista sueña con lo que
 * queda escrito y el representante con lo que se cobra, y esas dos cosas no
 * siempre apuntan al mismo lado: cuando llega la oferta del club grande, el que
 * va por las doce temporadas en la misma camiseta y el que va por la comisión
 * del pase quieren cosas opuestas. Esa discusión es el juego.
 *
 * Todos se miden con lo que el estado ya guarda: no hay contadores nuevos ni
 * nada que el motor tenga que ir anotando aparte, así que una partida vieja
 * puede elegir sueño y el progreso le sale bien desde el primer día.
 *
 * Y todos son monótonos: lo que se avanzó no se pierde. Una barra que baja no
 * es una meta, es un castigo, y lo último que queremos es que alguien abra el
 * juego y vea que retrocedió.
 */

export type Sueno = {
	id: string;
	rol: Rol;
	nombre: string;
	/** Qué es, en una línea. */
	detalle: string;
	/** Con qué puestos tiene sentido. Vacío o ausente: con todos. */
	posiciones?: Posicion[];

	/** A cuánto hay que llegar, y cómo se llama esa unidad. */
	meta: number;
	unidad: string;
	/** Cuánto lleva. Siempre creciente. */
	cuanto: (estado: Estado) => number;

	/** Cómo se escribe el número (los millones no se escriben enteros). */
	comoSeEscribe?: (n: number) => string;

	/** La línea del diario el día que se cumple. */
	alCumplirlo: string;
	/** Y lo que suma en el puntaje final. */
	puntos: number;
};

function plata(n: number): string {
	if (n >= 1_000_000) return `USD ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
	return `USD ${Math.round(n).toLocaleString('es-AR')}`;
}

/** La liga desde la cual se considera que estás jugando en la mejor del mundo. */
const FUERZA_DE_LIGA_GRANDE = 82;

/** Cuánto suma cumplirlo en el puntaje final de cada rol. */
const PUNTOS_FUTBOLISTA = 1200;
const PUNTOS_REPRESENTANTE = 600;

/*
 * De dónde salen estos números.
 *
 * Se midieron treinta carreras enteras por puesto con dos formas de jugar: la
 * del que no toca nada —se queda toda la vida en el mismo club del Ascenso— y
 * la del ambicioso —agarra siempre la oferta de la liga más fuerte que le
 * llegue—. Los dos caminos dan carreras muy distintas, y ahí está la gracia:
 *
 *   el que se queda      →  muchos partidos, muchos goles, muchos títulos
 *   el que se va         →  las mejores ligas, el valor de mercado, la plata
 *
 * Cada meta está puesta donde la alcanza más o menos la mitad de las carreras
 * que van por ella, y prácticamente ninguna de las que van por otra cosa. Ésa
 * es toda la idea: elegir un sueño tiene que ser elegir en contra de los otros.
 * Un número que se alcanza siempre no es una meta, y uno que no se alcanza
 * nunca es una burla.
 */

export const SUENOS: Sueno[] = [
	// --- Del futbolista ------------------------------------------------------
	{
		id: 'el-goleador',
		rol: 'futbolista',
		nombre: 'El goleador histórico',
		detalle:
			'Doscientos goles. Los hacen los que se quedan una vida entera en el mismo campeonato.',
		posiciones: ['delantero'],
		meta: 200,
		unidad: 'goles',
		cuanto: (e) => e.futbolista.goles,
		alCumplirlo: 'Doscientos goles. Ya no hace falta explicar quién es.',
		puntos: PUNTOS_FUTBOLISTA
	},
	{
		id: 'el-que-la-daba',
		rol: 'futbolista',
		nombre: 'El que la daba',
		detalle: 'Doscientas veinte asistencias. Que los goles de los otros también sean tuyos.',
		posiciones: ['mediocampista'],
		meta: 220,
		unidad: 'asistencias',
		cuanto: (e) => e.futbolista.asistencias,
		alCumplirlo:
			'Doscientas veinte asistencias. La mitad de los goles del equipo empezaron en su pie.',
		puntos: PUNTOS_FUTBOLISTA
	},
	{
		id: 'el-de-la-casa',
		rol: 'futbolista',
		nombre: 'El de la casa',
		detalle: 'Doce temporadas en un mismo club. De los que se quedan cuando llaman de afuera.',
		meta: 12,
		unidad: 'temporadas en el mismo club',
		cuanto: (e) => Math.max(0, ...Object.values(e.temporadasPorClub ?? {}), 0),
		alCumplirlo: 'Doce temporadas con la misma camiseta. La tribuna ya canta su apellido.',
		puntos: PUNTOS_FUTBOLISTA
	},
	{
		id: 'la-vitrina',
		rol: 'futbolista',
		nombre: 'La vitrina llena',
		detalle: 'Diez títulos. Ganar es lo único que no se discute, y se gana quedándose.',
		meta: 10,
		unidad: 'títulos',
		cuanto: (e) => e.futbolista.titulos,
		alCumplirlo: 'Diez títulos. Una carrera que se cuenta con la vitrina y no con los números.',
		puntos: PUNTOS_FUTBOLISTA
	},
	{
		id: 'la-mejor-liga',
		rol: 'futbolista',
		nombre: 'La mejor liga del mundo',
		detalle: 'Ocho temporadas arriba de todo. Para eso hay que irse, y hay que sostenerse.',
		meta: 8,
		unidad: 'temporadas en una liga grande',
		cuanto: (e) =>
			(e.historial ?? []).filter((h) => contexto(h.clubId).liga.fuerza >= FUERZA_DE_LIGA_GRANDE)
				.length,
		alCumplirlo: 'Ocho temporadas en la mejor liga del mundo. Llegó adonde quería llegar.',
		puntos: PUNTOS_FUTBOLISTA
	},
	{
		id: 'los-quinientos',
		rol: 'futbolista',
		nombre: 'Los quinientos partidos',
		detalle: 'Estar siempre. No la carrera más brillante: la más difícil de sostener.',
		meta: 500,
		unidad: 'partidos',
		cuanto: (e) => e.futbolista.partidos,
		alCumplirlo: 'Quinientos partidos. Veinte años poniendo el cuerpo todos los domingos.',
		puntos: PUNTOS_FUTBOLISTA
	},

	// --- Del representante ---------------------------------------------------
	//
	// Los suyos dependen en buena parte de la carrera del otro, y está bien que
	// sea así: es un representante, no juega él. Lo que sí decide es empujar para
	// que su jugador se mueva —cada pase le paga— o dejarlo quedarse donde está.
	{
		id: 'la-primera-fortuna',
		rol: 'representante',
		nombre: 'La primera fortuna',
		detalle: 'Tres millones de dólares en la caja. Sin socios, sin herencia y con un solo jugador.',
		meta: 3_000_000,
		unidad: 'en caja',
		cuanto: (e) => e.representante.dineroUsd,
		comoSeEscribe: plata,
		alCumplirlo: 'Tres millones en la caja. Empezó con una carpeta y un teléfono.',
		puntos: PUNTOS_REPRESENTANTE
	},
	{
		id: 'la-agencia',
		rol: 'representante',
		nombre: 'Una agencia de verdad',
		detalle: 'Prestigio 70. Que te atiendan el teléfono sin preguntar quién habla.',
		meta: 70,
		unidad: 'de prestigio',
		cuanto: (e) => e.representante.prestigio,
		alCumplirlo: 'Su nombre ya abre puertas solo. Eso no se compra.',
		puntos: PUNTOS_REPRESENTANTE
	},
	{
		id: 'el-pase-historico',
		rol: 'representante',
		nombre: 'El pase de tu vida',
		detalle: 'Que tu jugador llegue a valer veinte millones. Uno solo, pero de ésos.',
		meta: 20_000_000,
		unidad: 'de valor',
		cuanto: (e) => Math.max(0, ...(e.historial ?? []).map((h) => h.valorUsd), 0),
		comoSeEscribe: plata,
		alCumplirlo: 'Su jugador vale veinte millones. El que lo firmó a los dieciséis fue él.',
		puntos: PUNTOS_REPRESENTANTE
	},
	{
		id: 'la-escuderia',
		rol: 'representante',
		nombre: 'La escudería',
		detalle: 'Diez representados más. Dejar de ser el tipo de un jugador y ser una oficina.',
		meta: 10,
		unidad: 'representados más',
		cuanto: (e) => e.representante.representadosExtra,
		alCumplirlo: 'Diez jugadores más en la carpeta. Ya no es un representante, es una agencia.',
		puntos: PUNTOS_REPRESENTANTE
	}
];

export function sueno(id: string | null | undefined): Sueno | null {
	return SUENOS.find((s) => s.id === id) ?? null;
}

/** El sueño que eligió ese rol, si eligió alguno. */
export function suenoDe(estado: Estado, rol: Rol): Sueno | null {
	return sueno(estado.suenos?.[rol] ?? null);
}

/** Cuándo se elige: la primera pretemporada y ninguna más. */
export function tocaElegirSueno(estado: Estado, rol: Rol): boolean {
	return !estado.carreraTerminada && estado.temporada === 1 && !estado.suenos?.[rol];
}

/**
 * Los que ese rol puede elegir.
 *
 * A diferencia del rasgo, acá se muestran todos los que le sirven y no tres al
 * azar: el rasgo es la carta que te tocó, el sueño es qué historia querés
 * contar. Sortear eso sería sortear de qué se trata la partida.
 */
export function suenosPara(estado: Estado, rol: Rol): Sueno[] {
	return SUENOS.filter(
		(s) => s.rol === rol && (!s.posiciones || s.posiciones.includes(estado.futbolista.posicion))
	);
}

/**
 * Un sueño listo para mandar a la pantalla.
 *
 * `Sueno` lleva funciones adentro —cómo se cuenta y cómo se escribe— y eso no
 * viaja: SvelteKit serializa lo que devuelve el `load`, y una función revienta
 * la página entera. Así que a la pantalla va esto, que es todo texto y números
 * y con la meta ya escrita del lado del servidor.
 */
export type SuenoOfrecido = {
	id: string;
	nombre: string;
	detalle: string;
	/** La meta ya escrita: "200 goles", "USD 3.0M en caja". */
	meta: string;
};

export function paraLaPantalla(s: Sueno): SuenoOfrecido {
	const escribir = s.comoSeEscribe ?? ((n: number) => n.toLocaleString('es-AR'));
	return {
		id: s.id,
		nombre: s.nombre,
		detalle: s.detalle,
		meta: `${escribir(s.meta)} ${s.unidad}`
	};
}

/** Lo deja elegido. Si no eligió, se le da el primero: la partida no se traba. */
export function elegirSueno(estado: Estado, rol: Rol, id: string | undefined): string | null {
	if (!tocaElegirSueno(estado, rol)) return null;

	const posibles = suenosPara(estado, rol);
	if (posibles.length === 0) return null;

	const elegido = posibles.find((s) => s.id === id) ?? posibles[0];
	estado.suenos = { ...normalizar(estado), [rol]: elegido.id };

	return `${elegido.nombre}: ${elegido.detalle}`;
}

export type Progreso = {
	id: string;
	nombre: string;
	detalle: string;
	/** Cuánto lleva y cuánto hace falta, ya escritos. */
	cuanto: number;
	meta: number;
	lleva: string;
	falta: string;
	/** 0–100, para la barra. */
	pct: number;
	cumplido: boolean;
	/** Una línea que dice si está cerca o lejos. */
	comoVa: string;
};

/**
 * Cómo va ese sueño.
 *
 * Devuelve `null` si todavía no eligió. El texto de `falta` es lo que de verdad
 * hace volver: "te faltan 23 goles" es una frase que se puede terminar, y
 * "77 goles" no.
 */
export function comoVaElSueno(estado: Estado, rol: Rol): Progreso | null {
	const s = suenoDe(estado, rol);
	if (!s) return null;

	const escribir = s.comoSeEscribe ?? ((n: number) => n.toLocaleString('es-AR'));
	const cuanto = cuantoLleva(estado, rol, s);
	const cumplido = yaLoCumplio(estado, s) || cuanto >= s.meta;
	const restan = Math.max(0, s.meta - cuanto);
	const pct = Math.max(0, Math.min(100, Math.round((cuanto / s.meta) * 100)));

	return {
		id: s.id,
		nombre: s.nombre,
		detalle: s.detalle,
		cuanto,
		meta: s.meta,
		lleva: `${escribir(cuanto)} de ${escribir(s.meta)} ${s.unidad}`,
		falta: cumplido ? 'Cumplido' : `Faltan ${escribir(restan)} ${s.unidad}`,
		pct: cumplido ? 100 : pct,
		cumplido,
		comoVa: cumplido ? s.alCumplirlo : comoVaDicho(pct, s)
	};
}

function comoVaDicho(pct: number, s: Sueno): string {
	if (pct >= 90) return 'Está a un paso. Esta temporada puede ser.';
	if (pct >= 60) return 'Ya está más cerca de llegar que de empezar.';
	if (pct >= 30) return 'Va por buen camino, pero falta la mitad más difícil.';
	if (pct >= 10) return 'Arrancó. De acá a ahí hay unas cuantas temporadas.';
	return `Todavía es una idea. ${s.detalle}`;
}

/**
 * Cuánto lleva, sin que pueda bajar.
 *
 * La cuenta de verdad contra la marca más alta que se haya registrado. Es lo
 * que hace que gastar la plata en la pretemporada no se sienta como perder
 * medio sueño: el representante llegó a tener ese número, y haberlo tenido no
 * se lo saca nadie.
 */
function cuantoLleva(estado: Estado, rol: Rol, s: Sueno): number {
	const ahora = Math.max(0, Math.round(s.cuanto(estado)));
	return Math.max(ahora, estado.suenos?.tope?.[rol] ?? 0);
}

function yaLoCumplio(estado: Estado, s: Sueno): boolean {
	return (estado.suenos?.cumplidos ?? []).some((c) => c.id === s.id);
}

/**
 * El sueño que se cumplió en esa temporada, si se cumplió alguno.
 *
 * Lo usa la tapa del diario: cumplir el sueño de una carrera es el titular más
 * grande que puede tener una temporada, más que un título y más que un Mundial,
 * porque es lo único que estaba anunciado desde el primer día.
 */
export function elQueSeCumplioEn(estado: Estado, temporada: number): Sueno | null {
	const marca = (estado.suenos?.cumplidos ?? []).find((c) => c.temporada === temporada);
	return marca ? sueno(marca.id) : null;
}

/**
 * Revisa si alguno se cumplió recién, y lo anota.
 *
 * Muta el estado: una vez cumplido queda cumplido para siempre, aunque después
 * la caja baje o el jugador cambie de club. Se corre al cerrar la temporada y
 * devuelve las líneas para el diario, una por sueño y una sola vez en toda la
 * partida.
 */
export function revisarSuenos(estado: Estado): { rol: Rol; texto: string }[] {
	const nuevas: { rol: Rol; texto: string }[] = [];

	estado.suenos = normalizar(estado);

	for (const rol of ['futbolista', 'representante'] as const) {
		const s = suenoDe(estado, rol);
		if (!s) continue;

		// La marca más alta se actualiza siempre, aunque el sueño ya esté cumplido:
		// es de donde sale que la barra no baje nunca.
		const lleva = cuantoLleva(estado, rol, s);
		estado.suenos.tope[rol] = lleva;

		if (yaLoCumplio(estado, s) || lleva < s.meta) continue;

		estado.suenos.cumplidos.push({ id: s.id, temporada: estado.temporada });
		nuevas.push({ rol, texto: `${s.nombre}. ${s.alCumplirlo}` });
	}

	return nuevas;
}

/** El bloque de sueños completo, tolerando partidas guardadas antes de que existiera. */
function normalizar(estado: Estado): Estado['suenos'] {
	return {
		futbolista: estado.suenos?.futbolista ?? null,
		representante: estado.suenos?.representante ?? null,
		cumplidos: estado.suenos?.cumplidos ?? [],
		tope: {
			futbolista: estado.suenos?.tope?.futbolista ?? 0,
			representante: estado.suenos?.tope?.representante ?? 0
		}
	};
}

/** Lo que suma en el puntaje final, para el rol que lo eligió. */
export function puntosDelSueno(
	estado: Estado,
	rol: Rol
): { concepto: string; puntos: number } | null {
	const s = suenoDe(estado, rol);
	if (!s) return null;
	const progreso = comoVaElSueno(estado, rol);
	if (!progreso) return null;

	if (progreso.cumplido) {
		return { concepto: `Cumplió su sueño: ${s.nombre.toLowerCase()}`, puntos: s.puntos };
	}
	// Y si no llegó, algo queda: haber ido para ese lado igual costó temporadas.
	// No es lo mismo quedarse en el 12% que en el 91%, y el final tiene que
	// decirlo, porque de eso se acuerda el que jugó.
	return {
		concepto: `${s.nombre}: se quedó en ${progreso.pct}%`,
		puntos: Math.round((s.puntos * progreso.pct) / 100 / 3)
	};
}
