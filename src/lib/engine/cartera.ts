import type { Estado } from './tipos';

/**
 * La cartera del representante.
 *
 * Alan lo pidió entero en una línea: "que tenga una cantidad de jugadores a su
 * cargo, que al tener más gana prestigio, gana más plata pero tiene menos
 * tiempo (o alguna stat donde se refleje el tiempo, disponibilidad, etc.)".
 *
 * Hasta acá los representados extra eran un número que sólo servía para un
 * sueño: se sumaban y no hacían nada. Ahora son la decisión de fondo del rol.
 * Cada uno deja plata todos los años y suma prestigio, y cada uno se lleva un
 * pedazo del día. Y el día es lo que el representante usa para trabajar: con
 * la agenda llena, todo lo que intenta le sale peor —las gestiones, las
 * mesas, los momentos—.
 *
 * Es a propósito que no haya un número "óptimo". Una agencia de doce le da
 * plata y prestigio a alguien que ya no puede atender bien a ninguno; un solo
 * representado le da el cien por ciento del tiempo a un tipo que se muere de
 * hambre. Dónde parar es del jugador.
 */

/** El día entero, sin nadie más que el futbolista de la partida. */
export const DISPONIBILIDAD_MAXIMA = 100;

/** Lo que se lleva cada representado extra. */
export const LO_QUE_CUESTA_CADA_UNO = 7;

/**
 * Y el piso.
 *
 * Un piso y no cero: por más llena que esté la agenda, el tipo sigue yendo a
 * trabajar. Sin piso, con quince representados todo daba la probabilidad
 * mínima y la agencia grande dejaba de ser una decisión para ser un suicidio.
 */
export const DISPONIBILIDAD_MINIMA = 25;

/** Cuántos representa en total: el de la partida más los que fue sumando. */
export function cuantosRepresenta(estado: Estado): number {
	return 1 + estado.representante.representadosExtra;
}

/** Cuánto del día le queda para el futbolista de la partida. 25 a 100. */
export function disponibilidadDe(estado: Estado): number {
	const gastado = estado.representante.representadosExtra * LO_QUE_CUESTA_CADA_UNO;
	return Math.max(DISPONIBILIDAD_MINIMA, DISPONIBILIDAD_MAXIMA - gastado);
}

/**
 * Cuánto se le cae todo cuando no tiene tiempo.
 *
 * Con el día entero, uno: nada cambia. Con la agenda al tope, 0,66: una
 * gestión que salía 60% pasa a salir 40%. Es un castigo que se siente sin
 * volver imposible nada, que es justo lo que hace que fichar al décimo sea
 * una decisión y no un error.
 */
export function factorDeTiempo(estado: Estado): number {
	return 0.55 + (0.45 * disponibilidadDe(estado)) / DISPONIBILIDAD_MAXIMA;
}

/**
 * Lo que deja la cartera en un año.
 *
 * Ligado al prestigio y no fijo: los representados de un representante
 * conocido firman contratos mejores, y ésa es la razón por la que subir el
 * prestigio vale la pena más allá del cartel.
 */
export function loQueDejaLaCarteraAlAnio(estado: Estado): number {
	return estado.representante.representadosExtra * (1_500 + 25 * estado.representante.prestigio);
}

/**
 * Y cuánto prestigio le suma tener una oficina con gente adentro.
 *
 * De a poco y con escalones: no es que cada firma te haga más conocido, es que
 * a los años de tener una agencia con diez jugadores te atienden el teléfono
 * de otra manera.
 */
export function loQueSumaLaCarteraAlAnio(estado: Estado): number {
	const cuantos = estado.representante.representadosExtra;
	if (cuantos >= 8) return 2;
	if (cuantos >= 3) return 1;
	return 0;
}

/** Cómo se cuenta, para la pantalla. */
export function comoEstaLaAgenda(estado: Estado): string {
	const d = disponibilidadDe(estado);
	if (d >= 90) return 'Tenés el día entero para él.';
	if (d >= 70) return 'Te queda tiempo de sobra, pero ya no todo.';
	if (d >= 50) return 'La agenda está cargada. Se nota en lo que intentás.';
	if (d >= 35) return 'Estás corriendo todo el día. Todo te sale más difícil.';
	return 'No das abasto. Cada cosa que intentás sale peor de lo que debería.';
}
