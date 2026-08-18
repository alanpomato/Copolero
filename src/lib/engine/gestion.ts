import { club, contexto, salarioTipico } from '../../../content/mundo';
import { media } from './estado';
import { rngPara } from './rng';
import type { Estado, Fase, Rol, VisiblePara } from './tipos';

/**
 * Lo que hace el representante mientras el otro juega.
 *
 * El representante no entra a la cancha, así que su fase tiene que ser una
 * decisión de verdad y no un botón de "listo". Cada gestión tiene una
 * probabilidad a la vista —igual que la rueda de ocasión del futbolista— y sale
 * de sus atributos: negociación, scouting y contactos.
 *
 * Y todas mueven la confianza, para bien o para mal. Es la variable que une a
 * los dos, y la única forma de que las decisiones de uno se sientan del otro
 * lado.
 */

/**
 * Lo que una gestión mueve, declarado.
 *
 * Existe porque Alan preguntó lo obvio: "¿cómo sabemos cómo afecta cada
 * tarjetita a las stats del representante? Podemos ponerle que diga cuánto sube
 * y cuánto baja". No se podía: los efectos estaban escritos a mano adentro de
 * `aplicar`, en medio del texto que se narra, y no había forma de leerlos sin
 * ejecutar la función.
 *
 * Ahora se declaran acá y `aplicar` los cobra desde acá mismo —ver
 * `cobrarLoQueMueve`—, así que la tarjeta no puede decir una cosa y el motor
 * hacer otra. Lo que no entra en un número —que suba el sueldo, que aparezca un
 * representado— sigue en `aplicar` y se cuenta con `ademas`.
 */
export type LoQueMueve = {
	prestigio?: number;
	negociacion?: number;
	scouting?: number;
	contactos?: number;
	confianza?: number;
	/** Del otro lado: son compartidas. */
	moral?: number;
	fama?: number;
	prensa?: number;
};

export type AccionDeGestion = {
	id: string;
	nombre: string;
	detalle: string;
	/** En qué fases se puede hacer. */
	fases: Fase[];
	/** 0–100, a la vista. Sale de los atributos del representante. */
	probabilidad: (estado: Estado) => number;
	/** Qué mueve si sale y qué mueve si no. A la vista antes de elegir. */
	siSale: LoQueMueve;
	siFalla: LoQueMueve;
	/** Lo que no es un número: "una temporada más de contrato", "un representado". */
	ademas?: { siSale?: string; siFalla?: string };
	/** Lo que pasa. Muta el estado; devuelve una línea por cada rol que la ve. */
	aplicar: (estado: Estado, salio: boolean, semilla: string) => LineaDeGestion[];
};

/**
 * Cobra lo declarado. Lo llama `resolverGestion`, una sola vez, antes de narrar.
 *
 * Que lo cobre el motor y no cada `aplicar` es la mitad del punto: así lo que
 * la tarjeta promete y lo que el estado recibe son literalmente el mismo
 * objeto.
 */
export function cobrarLoQueMueve(estado: Estado, mueve: LoQueMueve): void {
	const r = estado.representante;
	const a = r.atributos;
	if (mueve.prestigio) r.prestigio = acotar(r.prestigio + mueve.prestigio, 0, 100);
	if (mueve.negociacion) a.negociacion = acotar(a.negociacion + mueve.negociacion, 0, 100);
	if (mueve.scouting) a.scouting = acotar(a.scouting + mueve.scouting, 0, 100);
	if (mueve.contactos) a.contactos = acotar(a.contactos + mueve.contactos, 0, 100);
	if (mueve.confianza) estado.confianza = acotar(estado.confianza + mueve.confianza, 0, 100);
	if (mueve.moral) estado.futbolista.moral = acotar(estado.futbolista.moral + mueve.moral, 0, 100);
	if (mueve.fama) estado.futbolista.fama = acotar(estado.futbolista.fama + mueve.fama, 0, 100);
	if (mueve.prensa) {
		estado.futbolista.prensa = acotar(estado.futbolista.prensa + mueve.prensa, -100, 100);
	}
}

export type LineaDeGestion = { visiblePara: VisiblePara; texto: string };

function chance(base: number, atributo: number, peso = 0.6): number {
	return Math.round(Math.max(10, Math.min(94, base + (atributo - 40) * peso)));
}

function acotar(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v));
}

export const ACCIONES: AccionDeGestion[] = [
	{
		id: 'sondear',
		nombre: 'Sondear el mercado',
		detalle: 'Llamar a clubes, escuchar. Si aparece algo, en el cierre hay oferta.',
		fases: [1],
		probabilidad: (e) => chance(38, e.representante.atributos.contactos),
		siSale: { contactos: 2 },
		siFalla: { prestigio: -1 },
		ademas: { siSale: 'Sube un 8% lo que vale' },
		aplicar: (e, salio) => {
			if (!salio) {
				return [
					{
						visiblePara: 'representante',
						texto: 'Llamaste a medio mundo y no te atendió nadie. Se te fue la semana.'
					}
				];
			}
			e.futbolista.valorMercadoUsd = Math.round(e.futbolista.valorMercadoUsd * 1.08);
			return [
				{
					visiblePara: 'representante',
					texto: 'Sondeaste el mercado y hay dos clubes preguntando. Guardate el dato.'
				},
				{
					visiblePara: 'futbolista',
					texto: 'Tu representante estuvo moviéndose. No te contó con quién.'
				}
			];
		}
	},
	{
		id: 'renovar',
		nombre: 'Apretar por una mejora',
		detalle: 'Sentarse con el club y pedir por el contrato que ya tenés.',
		fases: [1],
		siSale: { confianza: 8, prestigio: 2 },
		siFalla: { confianza: -3 },
		ademas: { siSale: 'Mejor sueldo y una temporada más' },
		probabilidad: (e) => {
			// Con el contrato por vencer esto no corre: ahí la conversación es la
			// renovación de verdad, que deciden los dos (ver `renovacion.ts`). Si
			// corriera igual, una gestión del representante pisaría lo que acaban
			// de firmar juntos.
			if (e.futbolista.contrato.temporadasRestantes <= 1) return 0;

			const f = e.futbolista;
			const merecimiento =
				media(f.atributos, f.posicion) - contexto(f.contrato.clubId).club.prestigio;
			return chance(30 + merecimiento * 0.8, e.representante.atributos.negociacion);
		},
		aplicar: (e, salio) => {
			const f = e.futbolista;
			const nombreClub = club(f.contrato.clubId).nombre;
			if (!salio) {
				return [
					{
						visiblePara: 'ambos',
						texto: `${nombreClub} no quiso saber nada con mejorar el contrato. Quedó ruido.`
					}
				];
			}
			// El club paga hasta lo que vale el puesto en ese club, y ni un peso
			// más. Un representante muy bueno no hace aparecer plata que no hay.
			const antes = f.contrato.salarioMensual;
			const techo = salarioTipico(f.contrato.clubId, media(f.atributos, f.posicion)) * 1.15;
			f.contrato.salarioMensual = Math.round(Math.min(Math.max(techo, antes * 1.05), antes * 1.6));
			f.contrato.temporadasRestantes += 1;
			return [
				{
					visiblePara: 'ambos',
					texto:
						`Mejora firmada con ${nombreClub}: de USD ${antes.toLocaleString('es-AR')} ` +
						`a USD ${f.contrato.salarioMensual.toLocaleString('es-AR')} por mes, y una temporada más.`
				}
			];
		}
	},
	{
		id: 'prensa',
		nombre: 'Instalarlo en los medios',
		detalle: 'Notas, entrevistas, la foto en el lugar justo. Sube la fama, no siempre gusta.',
		fases: [1],
		probabilidad: (e) => chance(45, e.representante.atributos.contactos, 0.45),
		siSale: { fama: 5, prensa: 5, prestigio: 1, confianza: -1 },
		siFalla: { prensa: -6, confianza: -4 },
		ademas: { siSale: 'La fama sube entre 3 y 7' },
		aplicar: (e, salio, semilla) => {
			const rng = rngPara(semilla, {
				temporada: e.temporada,
				fase: e.fase,
				clave: 'gestion-prensa'
			});
			if (!salio) {
				return [
					{
						visiblePara: 'ambos',
						texto:
							'La nota salió torcida y quedó como un pibe agrandado. En el vestuario lo leyeron.'
					}
				];
			}
			/*
			 * Lo declarado ya se cobró con +5 de fama y +5 de prensa; acá va solo la
			 * diferencia contra la tirada de verdad, que va de 3 a 7. Así el chip no
			 * miente —promete cinco y la media es cinco— y el año igual sorprende.
			 */
			const suma = rng.entero(3, 7);
			e.futbolista.fama = acotar(e.futbolista.fama + (suma - 5), 0, 100);
			e.futbolista.prensa = acotar(e.futbolista.prensa + (suma - 5), -100, 100);
			return [
				{
					visiblePara: 'ambos',
					texto: `Salió la nota y pegó: fama +${suma}. Hay más gente mirando.`
				}
			];
		}
	},
	{
		id: 'ojear',
		nombre: 'Buscar el próximo',
		detalle: 'Canchas de inferiores, viajes, informes. Si aparece alguien, tu agencia crece.',
		fases: [1],
		probabilidad: (e) => chance(30, e.representante.atributos.scouting, 0.7),
		siSale: { prestigio: 2, confianza: -3 },
		siFalla: { confianza: -2 },
		ademas: { siSale: 'Un representado más en la agencia' },
		aplicar: (e, salio) => {
			if (!salio) {
				return [
					{
						visiblePara: 'representante',
						texto: 'Te comiste tres canchas de inferiores y no viste a nadie. Pasa seguido.'
					}
				];
			}
			e.representante.representadosExtra += 1;
			return [
				{
					visiblePara: 'representante',
					texto:
						`Encontraste uno. Ya son ${e.representante.representadosExtra + 1} representados: ` +
						`tu agencia deja de ser vos y un jugador.`
				},
				{
					visiblePara: 'futbolista',
					texto: 'Tu representante firmó a otro pibe. Vas a tener que compartirlo.'
				}
			];
		}
	},
	{
		id: 'acompanar',
		nombre: 'Estar',
		detalle: 'Ir a verlo, bancarlo, atender el teléfono. No mueve plata; mueve todo lo demás.',
		fases: [1],
		probabilidad: () => 100,
		siSale: { confianza: 5, moral: 5 },
		siFalla: {},
		aplicar: () => {
			return [
				{
					visiblePara: 'futbolista',
					texto: 'Tu representante estuvo. Fue a verte, te atendió el teléfono, te bancó.'
				},
				{
					visiblePara: 'representante',
					texto: 'Estuviste. No cobraste nada por eso, y es lo que más va a pesar al final.'
				}
			];
		}
	},
	...(
		[
			{
				id: 'negociacion',
				nombre: 'Estudiar a los que negocian',
				detalle: 'Sentarte en mesas ajenas y mirar cómo cierran. Sube negociación.',
				que: 'negociación'
			},
			{
				id: 'scouting',
				nombre: 'Ver fútbol todo el día',
				detalle: 'Canchas, videos, informes. Sube scouting.',
				que: 'scouting'
			},
			{
				id: 'contactos',
				nombre: 'Golpear puertas',
				detalle: 'Dirigentes, técnicos, gente de club. Sube contactos.',
				que: 'contactos'
			}
		] as const
	).map((cual): AccionDeGestion => ({
		id: `formarse-${cual.id}`,
		nombre: cual.nombre,
		detalle: `${cual.detalle} Es tuyo y no de él: esta temporada vas a estar menos encima.`,
		fases: [1],
		probabilidad: () => 100,
		// Lo declarado es el promedio de lo que se tira abajo; la diferencia se
		// cobra en `aplicar`. El chip promete cuatro y la media es cuatro.
		siSale: { [cual.id]: 4, confianza: -2 } as LoQueMueve,
		siFalla: {},
		aplicar: (e, _salio, semilla) => {
			const rng = rngPara(semilla, {
				temporada: e.temporada,
				fase: 1,
				clave: `gestion-formarse-${cual.id}`
			});
			const a = e.representante.atributos;
			// Lo que ya sabés hacer cuesta más mejorarlo. Es la misma curva que
			// el potencial del futbolista, para que crecer se sienta igual de los
			// dos lados de la mesa.
			const suma = Math.max(1, Math.round(rng.entero(4, 7) * (1 - a[cual.id] / 130)));
			a[cual.id] = acotar(a[cual.id] + (suma - 4), 0, 100);
			return [
				{
					visiblePara: 'representante',
					texto: `Le metiste a lo tuyo: ${cual.que} +${suma}. Esta temporada estuviste menos encima.`
				}
			];
		}
	}))
];

/**
 * Qué atributo entrena cada gestión con solo hacerla.
 *
 * Bebo lo dijo mirando sus números: "las stats del representante suben muy
 * lento y es muy monótona la forma de progresión". Medido, tenía razón de
 * sobra: la negociación iba de 30 a 34 en veinte temporadas, porque lo único
 * que subía atributos era una gestión que además los elegía al azar.
 *
 * Ahora haciendo se aprende. Cada gestión entrena un poco lo que usa, salga o
 * no salga —de las que salen mal se aprende más, que es como funciona—, y
 * `formarse` pasó a ser tres opciones distintas para que elegir en qué
 * convertirse sea una decisión y no una lotería.
 */
/**
 * Qué atributo entrena cada gestión.
 *
 * El carisma no está y no es un olvido: no se entrena golpeando puertas, se
 * entrena en los momentos donde hay que hablar. Ver `momentos.ts`.
 */
const LO_QUE_ENTRENA: Record<string, 'negociacion' | 'scouting' | 'contactos'> = {
	sondear: 'contactos',
	renovar: 'negociacion',
	prensa: 'contactos',
	ojear: 'scouting'
};

/**
 * Lo que se aprende haciendo, una vez por gestión.
 *
 * Poco y constante: no reemplaza a formarse, lo acompaña. Veinte temporadas
 * gestionando dejan unos veinte puntos, que es la diferencia entre un
 * representante de barrio y uno al que le atienden el teléfono.
 */
export function aprenderHaciendo(estado: Estado, gestionId: string, salio: boolean): void {
	const cual = LO_QUE_ENTRENA[gestionId];
	if (!cual) return;
	const a = estado.representante.atributos;
	// Cerca del techo cuesta, igual que el potencial del futbolista.
	const margen = 1 - a[cual] / 130;
	a[cual] = acotar(
		a[cual] + Math.max(salio ? 1 : 0, Math.round((salio ? 1.6 : 2.2) * margen)),
		0,
		100
	);
}

export const GESTION_POR_DEFECTO = 'acompanar';

/** Las acciones que se pueden elegir en esta fase. */
export function accionesDe(fase: Fase): AccionDeGestion[] {
	return ACCIONES.filter((a) => a.fases.includes(fase));
}

/**
 * Resuelve la gestión elegida. Determinista: la tirada sale de la semilla.
 */
export function resolverGestion(
	estado: Estado,
	accionId: string | undefined,
	semilla: string
): LineaDeGestion[] {
	const disponibles = accionesDe(estado.fase);
	const accion =
		disponibles.find((a) => a.id === accionId) ??
		disponibles.find((a) => a.id === GESTION_POR_DEFECTO) ??
		disponibles[0];
	if (!accion) return [];

	const rng = rngPara(estado.temporada + semilla, {
		temporada: estado.temporada,
		fase: estado.fase,
		clave: `gestion-${accion.id}`
	});

	const probabilidad = accion.probabilidad(estado);
	const salio = probabilidad >= 100 || rng.ocurre(probabilidad / 100);

	// Primero lo declarado —lo mismo que la tarjeta prometía— y después lo que
	// no entra en un número. Ver `cobrarLoQueMueve`.
	cobrarLoQueMueve(estado, salio ? accion.siSale : accion.siFalla);
	const lineas = accion.aplicar(estado, salio, semilla);
	// Haciendo se aprende, salga o no salga. Va después de aplicar para que lo
	// que se aprendió este año no cambie la tirada de este mismo año.
	aprenderHaciendo(estado, accion.id, salio);
	return lineas;
}

/** Etiqueta para el diario. */
export function etiquetaDeRol(rol: Rol): string {
	return rol === 'futbolista' ? 'El futbolista' : 'El representante';
}
