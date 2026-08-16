import { club, contexto } from '../../../content/mundo';
import { media } from './estado';
import { dtActualDe, jugadoresActualesDe } from './mercado';
import { rngPara, type Rng } from './rng';
import { techoDeFama } from './temporada';
import type { Estado, VisiblePara } from './tipos';

/**
 * Lo que pasa fuera de la cancha.
 *
 * Una temporada eran tres botones: entrenar, elegir en tres jugadas, cerrar. El
 * año no tenía nada que no hubieras decidido vos, y una carrera de fútbol es
 * sobre todo lo que te pasa sin haberlo elegido: la rodilla, la convocatoria, el
 * técnico que se va, el que llega y no te quiere.
 *
 * Cada evento tiene condiciones —no le pasa a cualquiera en cualquier momento— y
 * consecuencias que el motor aplica. La narración cuenta lo que ya pasó y nunca
 * lo decide, que es la regla de la spec de Bebo.
 *
 * Los que dicen `visiblePara` distinto de `ambos` son la información asimétrica:
 * el representante se entera de cosas que el futbolista no, y al revés.
 */

export type Efectos = {
	desgaste?: number;
	moral?: number;
	fama?: number;
	hinchada?: number;
	dt?: number;
	prensa?: number;
	confianza?: number;
	/** Puntos repartidos en los atributos que el evento toca. */
	atributos?: Partial<Record<string, number>>;
	/** Plata para el futbolista, en USD. */
	dineroFutbolista?: number;
	/** Y para el representante. */
	dineroRepresentante?: number;
	prestigio?: number;
};

export type Evento = {
	id: string;
	/** Cuándo puede pasar. Si devuelve false, ni se considera. */
	puedePasar: (e: Estado) => boolean;
	/** Cuánto pesa en el sorteo. Los raros pesan poco. */
	peso: (e: Estado) => number;
	/** El texto, que puede usar los nombres reales del mundo. */
	contar: (e: Estado, rng: Rng) => { texto: string; visiblePara?: VisiblePara };
	efectos: (e: Estado) => Efectos;
};

// --- Ayudas para narrar -----------------------------------------------------

function suClub(e: Estado) {
	return club(e.futbolista.contrato.clubId).nombre;
}

function suTecnico(e: Estado): string | null {
	return dtActualDe(e.futbolista.contrato.clubId, e.cambiosMundo)?.nombre ?? null;
}

function unCompanero(e: Estado, rng: Rng): string | null {
	const companeros = jugadoresActualesDe(e.futbolista.contrato.clubId, e.cambiosMundo);
	return companeros.length > 0 ? rng.elegir(companeros).nombre : null;
}

function laMedia(e: Estado): number {
	return media(e.futbolista.atributos, e.futbolista.posicion);
}

// --- El catálogo ------------------------------------------------------------

export const EVENTOS: Evento[] = [
	{
		id: 'rodilla',
		// La lesión que te cambia el cuerpo. Solo con desgaste encima: a los 18
		// sanos no les pasa, y esa es la parte justa.
		puedePasar: (e) => e.futbolista.desgaste >= 35 && e.futbolista.edad >= 21,
		peso: (e) => 2 + e.futbolista.desgaste / 20,
		contar: (e) => ({
			texto: `Se le fue la rodilla en un entrenamiento. Volvió, pero ya no arranca igual.`
		}),
		efectos: () => ({
			desgaste: 5,
			moral: -12,
			atributos: { velocidad: -4, potencia: -2 }
		})
	},
	{
		id: 'seleccion',
		// La llamada. Hay que haberla ganado: media alta y fama.
		puedePasar: (e) => laMedia(e) >= 68 && e.futbolista.fama >= 55 && e.futbolista.edad <= 33,
		peso: (e) => (laMedia(e) - 60) / 3,
		contar: (e) => ({
			texto: `Lo citaron a la selección de ${e.futbolista.nacionalidad}. Primera vez.`
		}),
		efectos: () => ({ fama: 12, moral: 15, prensa: 8, confianza: 3, prestigio: 4 })
	},
	{
		id: 'tecnico-lo-banca',
		puedePasar: (e) => e.futbolista.dt >= 25,
		peso: () => 3,
		contar: (e) => {
			const dt = suTecnico(e);
			return {
				texto: dt
					? `${dt} lo puso de ejemplo en la charla técnica delante de todo el plantel.`
					: 'El técnico lo puso de ejemplo delante de todo el plantel.'
			};
		},
		efectos: () => ({ moral: 8, dt: 5, hinchada: 3 })
	},
	{
		id: 'tecnico-nuevo-no-lo-quiere',
		puedePasar: (e) => e.futbolista.dt <= 0 && e.temporada >= 2,
		peso: () => 4,
		contar: (e) => {
			const dt = suTecnico(e);
			return {
				texto: dt
					? `Llegó ${dt} y en la primera semana lo mandó al banco sin explicarle nada.`
					: 'Llegó un técnico nuevo y lo mandó al banco sin explicarle nada.'
			};
		},
		efectos: () => ({ dt: -12, moral: -10 })
	},
	{
		id: 'la-noche',
		// Al pibe con plata nueva y sin nadie que lo frene.
		puedePasar: (e) => e.futbolista.edad <= 24 && e.futbolista.dineroUsd >= 80_000,
		peso: (e) => (e.confianza < 50 ? 6 : 2),
		contar: () => ({
			texto: 'Salió una foto de él a las cinco de la mañana, tres días antes de un partido.'
		}),
		efectos: () => ({ prensa: -12, dt: -8, moral: -4, desgaste: 2, confianza: -5 })
	},
	{
		id: 'oferta-por-izquierda',
		// El representante se entera y el futbolista no. Información asimétrica
		// pura: es de las pocas cosas que uno sabe y el otro no.
		puedePasar: (e) => e.futbolista.fama >= 40,
		peso: (e) => 2 + e.representante.atributos.contactos / 25,
		contar: (e, rng) => {
			const { liga } = contexto(e.futbolista.contrato.clubId);
			return {
				visiblePara: 'representante',
				texto:
					`Te llamó un intermediario: hay un club de ${liga.nombre} preguntando por él, ` +
					'por afuera del club. Todavía no es una oferta.'
			};
		},
		efectos: () => ({ prestigio: 2 })
	},
	{
		id: 'la-hinchada-lo-adopta',
		puedePasar: (e) => e.futbolista.hinchada >= 45,
		peso: () => 3,
		contar: (e) => ({
			texto: `La popular de ${suClub(e)} le sacó un cantito. Con el nombre y todo.`
		}),
		efectos: () => ({ hinchada: 10, moral: 10, fama: 4 })
	},
	{
		id: 'la-hinchada-lo-putea',
		puedePasar: (e) => e.futbolista.hinchada <= 15 && e.temporada >= 2,
		peso: () => 3,
		contar: (e) => ({
			texto: `Lo silbaron al salir del campo en ${suClub(e)}. Se fue mirando el piso.`
		}),
		efectos: () => ({ hinchada: -8, moral: -12, prensa: -4 })
	},
	{
		id: 'el-companero',
		puedePasar: (e) => jugadoresActualesDe(e.futbolista.contrato.clubId, e.cambiosMundo).length > 0,
		peso: () => 3,
		contar: (e, rng) => {
			const companero = unCompanero(e, rng);
			return {
				texto: companero
					? `${companero} se lo llevó aparte a explicarle cómo se juega en este club. De esas charlas que sirven.`
					: 'Un referente del plantel se lo llevó aparte. De esas charlas que sirven.'
			};
		},
		efectos: () => ({ moral: 6, atributos: { liderazgo: 2, pase: 1 } })
	},
	{
		id: 'publicidad',
		puedePasar: (e) => e.futbolista.fama >= 50,
		peso: (e) => e.futbolista.fama / 20,
		contar: (e) => ({
			texto: `Le salió una publicidad. Un día de filmación y más plata que un mes de sueldo.`
		}),
		efectos: (e) => ({
			dineroFutbolista: e.futbolista.contrato.salarioMensual * 2,
			dineroRepresentante: Math.round(e.futbolista.contrato.salarioMensual * 0.3),
			fama: 4,
			prensa: 3
		})
	},
	{
		id: 'el-hijo',
		puedePasar: (e) => e.futbolista.edad >= 24 && e.futbolista.edad <= 34,
		peso: () => 2,
		contar: (e) => ({ texto: `Fue papá. Dice que ahora juega por otra cosa.` }),
		efectos: () => ({ moral: 12, atributos: { liderazgo: 3 }, desgaste: 1 })
	},
	{
		id: 'lo-quiere-el-capitan',
		puedePasar: (e) => e.futbolista.edad >= 28 && e.futbolista.dt >= 15,
		peso: () => 3,
		contar: (e) => ({ texto: `Le dieron la cinta de capitán en ${suClub(e)}.` }),
		efectos: () => ({ atributos: { liderazgo: 5 }, moral: 10, hinchada: 6, dt: 4 })
	},
	{
		id: 'el-cuerpo-avisa',
		puedePasar: (e) => e.futbolista.edad >= 31,
		peso: (e) => (e.futbolista.edad - 29) * 1.5,
		contar: () => ({
			texto: 'Se levanta con dolor donde antes no le dolía nada. El cuerpo empezó a avisar.'
		}),
		efectos: () => ({ desgaste: 3, atributos: { velocidad: -3, resistencia: -2 } })
	},
	{
		id: 'el-representante-lo-banca',
		// Se lo gana el representante que estuvo. No es azar: sale de la confianza.
		puedePasar: (e) => e.confianza >= 70,
		peso: () => 3,
		contar: (e) => ({
			texto: `${e.representante.nombre} se le plantó al club por él, y el club aflojó.`
		}),
		efectos: () => ({ moral: 8, confianza: 4, prestigio: 3 })
	},
	{
		id: 'el-representante-desaparece',
		puedePasar: (e) => e.confianza <= 35,
		peso: () => 4,
		contar: (e) => ({
			visiblePara: 'futbolista',
			texto: `Lo llamaste tres veces a ${e.representante.nombre} y no te atendió ninguna.`
		}),
		efectos: () => ({ moral: -10, confianza: -6 })
	},
	{
		id: 'el-clasico',
		// El partido que se recuerda. Solo si juega: al que mira desde el banco no
		// le pasa nada en el clásico, y ésa es media desgracia de estar afuera.
		puedePasar: (e) => e.futbolista.edad >= 18 && e.futbolista.hinchada >= 10,
		peso: () => 5,
		contar: (e, rng) => ({
			texto: rng.ocurre(0.6)
				? `La metió en el clásico. En ${suClub(e)} eso no se olvida más.`
				: `Erró un gol hecho en el clásico. Va a escuchar ese grito toda la temporada.`
		}),
		efectos: (e) => ({ hinchada: 10, moral: 6, fama: 4, prensa: 3 })
	},
	{
		id: 'la-lesion-del-titular',
		// La puerta que se abre por desgracia ajena, que es como se abren casi
		// todas. Solo para el que está esperando el lugar.
		puedePasar: (e) => e.futbolista.edad <= 26,
		peso: () => 4,
		contar: (e, rng) => {
			const quien = unCompanero(e, rng);
			return {
				texto: quien
					? `Se rompió ${quien} y le tocó entrar. Es la forma en que se entra casi siempre.`
					: `Se rompió el titular del puesto y le tocó entrar. Así se entra casi siempre.`
			};
		},
		efectos: () => ({ dt: 8, moral: 8, atributos: { liderazgo: 1 } })
	},
	{
		id: 'el-video-viral',
		puedePasar: (e) => e.futbolista.fama >= 20,
		peso: () => 3,
		contar: (e, rng) => ({
			texto: rng.ocurre(0.55)
				? `Un caño suyo dio la vuelta al mundo en un video de diez segundos.`
				: `Se filtró un video suyo en un boliche a las cuatro de la mañana.`
		}),
		efectos: (e) => ({ fama: 8, prensa: e.futbolista.prensa >= 0 ? 4 : -6 })
	},
	{
		id: 'el-preparador',
		puedePasar: (e) => e.futbolista.edad >= 20 && e.futbolista.desgaste >= 20,
		peso: () => 3,
		contar: () => ({
			visiblePara: 'futbolista',
			texto: 'Se puso un preparador físico propio. Se le nota en cómo termina los partidos.'
		}),
		efectos: () => ({ desgaste: -4, atributos: { resistencia: 3, potencia: 2 } })
	},
	{
		id: 'el-arreglo-del-vestuario',
		puedePasar: (e) => e.futbolista.moral <= 40,
		peso: () => 3,
		contar: (e, rng) => {
			const quien = unCompanero(e, rng);
			return {
				texto: quien
					? `Se agarró con ${quien} en el vestuario. Lo arreglaron, pero quedó.`
					: 'Hubo bardo en el vestuario y estuvo en el medio.'
			};
		},
		efectos: () => ({ moral: -8, dt: -6, prensa: -4 })
	},
	{
		id: 'la-nota-del-tecnico',
		puedePasar: (e) => suTecnico(e) !== null,
		peso: () => 3,
		contar: (e, rng) => {
			const dt = suTecnico(e)!;
			return {
				texto: rng.ocurre(0.6)
					? `${dt} lo nombró en conferencia: "es de los que quiero tener".`
					: `${dt} dijo en conferencia que "hay que trabajar mucho más". Todos entendieron por quién.`
			};
		},
		efectos: (e) => ({ dt: e.futbolista.dt >= 0 ? 6 : -8, prensa: 2, moral: 3 })
	},
	{
		id: 'el-sueldo-atrasado',
		// El club que no paga. Pasa más en los clubes chicos, que es donde pasa.
		puedePasar: (e) => contexto(e.futbolista.contrato.clubId).club.prestigio <= 45,
		peso: () => 3,
		contar: (e) => ({
			texto: `En ${suClub(e)} deben tres meses. El plantel amagó con no entrenar.`
		}),
		efectos: () => ({ moral: -10, confianza: 3 })
	},
	{
		id: 'la-gira',
		puedePasar: (e) => contexto(e.futbolista.contrato.clubId).club.prestigio >= 60,
		peso: () => 2,
		contar: (e) => ({
			texto: `${suClub(e)} se fue de gira a Asia. Volvió con jet lag y un contrato de botines.`
		}),
		efectos: () => ({ fama: 5, desgaste: 2, dineroFutbolista: 40_000 })
	},
	{
		id: 'el-pibe-que-viene',
		// El que le respira en la nuca. Le pasa al que ya tiene edad para que le
		// pase, y es el aviso de que el puesto no es de nadie.
		puedePasar: (e) => e.futbolista.edad >= 29,
		peso: (e) => (e.futbolista.edad - 27) * 1.2,
		contar: (e, rng) => {
			const quien = unCompanero(e, rng);
			return {
				texto: quien
					? `Subió un pibe de la reserva a pelearle el puesto. En el club dicen que es ${quien} de nuevo.`
					: 'Subió un pibe de la reserva a pelearle el puesto. Todos hablan de él.'
			};
		},
		efectos: () => ({ dt: -6, moral: -5 })
	},
	{
		id: 'la-escuelita',
		puedePasar: (e) => e.futbolista.dineroUsd >= 300_000 && e.futbolista.edad >= 26,
		peso: () => 2,
		contar: (e) => ({
			texto: `Abrió una escuelita de fútbol en el barrio. Le puso su nombre y le da vergüenza.`
		}),
		efectos: () => ({ hinchada: 8, prensa: 5, dineroFutbolista: -60_000, moral: 6 })
	},
	{
		id: 'el-dirigente',
		puedePasar: (e) => e.representante.atributos.contactos >= 45,
		peso: (e) => 2 + e.representante.atributos.contactos / 30,
		contar: (e) => ({
			visiblePara: 'representante',
			texto: `Un dirigente de ${suClub(e)} te debe un favor. Guardátelo para cuando haga falta.`
		}),
		efectos: () => ({ prestigio: 3, dineroRepresentante: 15_000 })
	},
	{
		id: 'la-clausula',
		puedePasar: (e) => e.futbolista.contrato.clausula > 0 && e.futbolista.fama >= 45,
		peso: () => 2,
		contar: (e) => ({
			visiblePara: 'representante',
			texto:
				`Preguntaron por la cláusula de USD ${e.futbolista.contrato.clausula.toLocaleString('es-AR')}. ` +
				`No dijiste nada todavía.`
		}),
		efectos: () => ({ prestigio: 2 })
	}
];

// --- Sortear ----------------------------------------------------------------

export type EventoOcurrido = {
	id: string;
	texto: string;
	visiblePara: VisiblePara;
	efectos: Efectos;
};

/**
 * Cuántos eventos por temporada. Pocos: si pasa todo, no pasa nada.
 *
 * Y el desgaste que suman está medido contra el resto del juego: la primera
 * versión gastaba tanto que las carreras terminaban a los 26 en vez de a los
 * 35. Un evento tiene que doler, no acortarte la carrera diez años.
 */
/**
 * Cuántos eventos por temporada.
 *
 * Con dos, y con quince en el catálogo, una carrera de veinte temporadas veía
 * casi siempre los mismos. Tres sobre veintisiete hace que dos partidas no se
 * parezcan, que es lo que Bebo pedía cuando dijo que le faltaban eventos.
 */
const POR_TEMPORADA = 3;

/**
 * Sortea los eventos del año.
 *
 * Determinista por semilla y temporada. Nunca repite el mismo evento en la
 * misma temporada, porque enterarte dos veces de que fuiste papá es cómico por
 * las razones equivocadas.
 */
export function eventosDeLaTemporada(estado: Estado, semilla: string): EventoOcurrido[] {
	const rng = rngPara(semilla, { temporada: estado.temporada, fase: 2, clave: 'eventos' });

	const posibles = EVENTOS.filter((ev) => ev.puedePasar(estado)).map((ev) => ({
		evento: ev,
		peso: Math.max(0.1, ev.peso(estado))
	}));

	const salieron: EventoOcurrido[] = [];
	const usados = new Set<string>();

	for (let i = 0; i < POR_TEMPORADA; i++) {
		const disponibles = posibles.filter((p) => !usados.has(p.evento.id));
		if (disponibles.length === 0) break;

		const total = disponibles.reduce((suma, p) => suma + p.peso, 0);
		let tirada = rng.siguiente() * total;

		const elegido =
			disponibles.find((p) => {
				tirada -= p.peso;
				return tirada <= 0;
			}) ?? disponibles[disponibles.length - 1];

		usados.add(elegido.evento.id);
		const contado = elegido.evento.contar(estado, rng);
		salieron.push({
			id: elegido.evento.id,
			texto: contado.texto,
			visiblePara: contado.visiblePara ?? 'ambos',
			efectos: elegido.evento.efectos(estado)
		});
	}

	return salieron;
}

/** Aplica lo que dejó un evento. Muta el estado, que ya viene clonado. */
export function aplicarEvento(estado: Estado, efectos: Efectos): void {
	const f = estado.futbolista;
	const acotar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

	if (efectos.desgaste) f.desgaste = acotar(f.desgaste + efectos.desgaste);
	if (efectos.moral) f.moral = acotar(f.moral + efectos.moral);
	if (efectos.fama) {
		// Con el mismo techo que la temporada: un caño viral en la Primera Nacional
		// no te hace conocido en el mundo. Sin esto, los eventos pasaban por arriba
		// de la regla que hace que el pase exista.
		const techo = Math.max(f.fama, techoDeFama(f.contrato.clubId));
		f.fama = acotar(Math.min(f.fama + efectos.fama, techo));
	}
	if (efectos.hinchada) f.hinchada = acotar(f.hinchada + efectos.hinchada);
	if (efectos.dt) f.dt = acotar(f.dt + efectos.dt, -100, 100);
	if (efectos.prensa) f.prensa = acotar(f.prensa + efectos.prensa, -100, 100);
	if (efectos.confianza) estado.confianza = acotar(estado.confianza + efectos.confianza);
	if (efectos.dineroFutbolista) f.dineroUsd += efectos.dineroFutbolista;
	if (efectos.dineroRepresentante) estado.representante.dineroUsd += efectos.dineroRepresentante;
	if (efectos.prestigio) {
		estado.representante.prestigio = acotar(estado.representante.prestigio + efectos.prestigio);
	}

	for (const [atributo, cuanto] of Object.entries(efectos.atributos ?? {})) {
		const clave = atributo as keyof typeof f.atributos;
		if (f.atributos[clave] === undefined) continue;
		f.atributos[clave] = acotar(f.atributos[clave] + (cuanto ?? 0), 1, 99);
	}
}
