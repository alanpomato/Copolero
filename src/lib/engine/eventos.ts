import { club, contexto } from '../../../content/mundo';
import { media } from './estado';
import { dtActualDe, jugadoresActualesDe } from './mercado';
import { rngPara, type Rng } from './rng';
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
const POR_TEMPORADA = 2;

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
	if (efectos.fama) f.fama = acotar(f.fama + efectos.fama);
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
