import { salarioTipico } from '../../../content/mundo';
import { puesto as puestoPorId, repartoValido, ventajaDePie, type Pie } from './puestos';
import { MUNDO_SIN_CAMBIOS, type Atributos, type Estado, type Posicion, type Rol } from './tipos';
import { OBJETIVO_POR_DEFECTO } from './objetivos';
import { inventarRival } from './rival';
import type { Rng } from './rng';

/** Lo que se elige en la pantalla de creación de partida. */
export type ConfigPartida = {
	futbolista: {
		nombre: string;
		nacionalidad: string;
		/** Id de `PUESTOS`. De ahí sale la posición con la que trabaja el motor. */
		puesto: string;
		numero: number;
		pie: Pie;
		edadInicial: number;
		clubId: string;
		/** Los puntos que el jugador repartió a mano. */
		reparto?: Partial<Record<keyof Atributos, number>>;
	};
	representante: {
		nombre: string;
	};
};

export const EDAD_INICIAL_POR_DEFECTO = 16;
export const CONFIANZA_INICIAL = 60;

/**
 * Peso de cada atributo en la media, según el puesto. Un 9 vive de la
 * definición; un 5, del pase y la marca. Cada fila suma 1.
 */
const PESOS_MEDIA: Record<Posicion, Partial<Record<keyof Atributos, number>>> = {
	arquero: { potencia: 0.3, resistencia: 0.2, liderazgo: 0.2, defensa: 0.2, pase: 0.1 },
	defensor: {
		defensa: 0.35,
		potencia: 0.2,
		resistencia: 0.15,
		liderazgo: 0.1,
		pase: 0.1,
		velocidad: 0.1
	},
	mediocampista: {
		pase: 0.3,
		regate: 0.2,
		resistencia: 0.2,
		definicion: 0.1,
		defensa: 0.1,
		liderazgo: 0.1
	},
	delantero: { definicion: 0.35, velocidad: 0.2, regate: 0.2, potencia: 0.15, pase: 0.1 }
};

/** Media general 0–100, ponderada por puesto. */
export function media(atributos: Atributos, posicion: Posicion): number {
	const pesos = PESOS_MEDIA[posicion];
	let total = 0;
	for (const [atributo, peso] of Object.entries(pesos)) {
		total += atributos[atributo as keyof Atributos] * (peso as number);
	}
	return Math.round(total);
}

/**
 * El primer sueldo.
 *
 * Sale de lo que paga el club de verdad, con un descuento fuerte por ser el
 * primer contrato de un pibe: nadie firma su debut por lo que vale el puesto.
 * Es lo que hace que arrancar en el Ascenso duela y arrancar en un grande no
 * sea lo mismo.
 */
function sueldoDeArranque(
	clubId: string,
	atributos: Atributos,
	posicion: Posicion,
	rng: Rng
): number {
	const tipico = salarioTipico(clubId, media(atributos, posicion));
	const primerContrato = tipico * (rng.entero(18, 30) / 100);
	return Math.max(600, Math.round(primerContrato / 50) * 50);
}

/**
 * Un pibe de 16 en el Ascenso: todo bajo, y un techo que nadie conoce.
 *
 * Sale de tres cosas que se suman: lo que le tocó por azar, lo que pide el
 * puesto que eligió, y los puntos que repartió a mano en la creación. Las tres
 * cuentan, y ninguna alcanza sola.
 */
export function atributosIniciales(
	rng: Rng,
	puestoId: string,
	pie: Pie,
	reparto: Partial<Record<keyof Atributos, number>> = {}
): Atributos {
	const base = () => rng.entero(28, 45);
	const atributos: Atributos = {
		definicion: base(),
		velocidad: base(),
		potencia: base(),
		resistencia: base(),
		pase: base(),
		regate: base(),
		defensa: base(),
		liderazgo: rng.entero(20, 40)
	};

	const p = puestoPorId(puestoId);

	// Lo que pide el puesto: un lateral nace más rápido, un central más fuerte.
	for (const [atributo, cuanto] of Object.entries(p.sesgo)) {
		const clave = atributo as keyof Atributos;
		atributos[clave] = Math.min(66, atributos[clave] + Math.round(cuanto * 0.7) + rng.entero(0, 3));
	}

	// El pie, que en las bandas pesa de verdad.
	const ventaja = ventajaDePie(p, pie);
	if (ventaja !== 0) {
		atributos.regate = acotarAtributo(atributos.regate + ventaja);
		atributos.pase = acotarAtributo(atributos.pase + ventaja);
	}

	// Y lo que el jugador eligió a mano.
	const { reparto: puntos } = repartoValido(reparto);
	for (const [atributo, cuanto] of Object.entries(puntos)) {
		const clave = atributo as keyof Atributos;
		atributos[clave] = acotarAtributo(atributos[clave] + cuanto);
	}

	return atributos;
}

function acotarAtributo(valor: number): number {
	return Math.max(1, Math.min(70, valor));
}

export function estadoInicial(config: ConfigPartida, rng: Rng, anio: number): Estado {
	const { futbolista, representante } = config;
	const elPuesto = puestoPorId(futbolista.puesto);
	const posicion = elPuesto.posicion;
	const atributos = atributosIniciales(rng, elPuesto.id, futbolista.pie, futbolista.reparto);

	const estado: Estado = {
		version: 1,
		temporada: 1,
		anio,
		fase: 1,
		carreraTerminada: false,

		futbolista: {
			nombre: futbolista.nombre,
			nacionalidad: futbolista.nacionalidad,
			posicion,
			puesto: elPuesto.id,
			numero: futbolista.numero,
			pie: futbolista.pie,
			edad: futbolista.edadInicial,

			atributos,
			potencial: rng.entero(58, 94),

			forma: rng.entero(45, 60),
			moral: 60,
			desgaste: 0,

			fama: 1,
			hinchada: 0,
			dt: 0,
			prensa: 0,

			contrato: {
				clubId: futbolista.clubId,
				salarioMensual: sueldoDeArranque(futbolista.clubId, atributos, posicion, rng),
				temporadasRestantes: 2,
				clausula: 0
			},
			dineroUsd: 0,

			partidos: 0,
			goles: 0,
			asistencias: 0,
			titulos: 0,
			minutos: 0,
			valorMercadoUsd: rng.entero(20_000, 60_000)
		},

		representante: {
			nombre: representante.nombre,
			edad: rng.entero(24, 32),
			prestigio: rng.entero(3, 10),
			dineroUsd: rng.entero(2_000, 6_000),
			atributos: {
				negociacion: rng.entero(25, 40),
				scouting: rng.entero(25, 40),
				contactos: rng.entero(15, 30)
			},
			representadosExtra: 0
		},

		confianza: CONFIANZA_INICIAL,
		contratoRepresentacion: {
			pctSalario: 5,
			pctTransferencia: 5,
			duracionTemporadas: 2,
			clausulaSalida: 0
		},

		// Arranca igual al contenido: el mundo todavía es el de la foto.
		cambiosMundo: structuredClone(MUNDO_SIN_CAMBIOS),
		ultimaTemporada: null,
		historial: [],
		temporadasPorClub: {},
		temporadasPerdidas: 0,
		intensidadDeLaPretemporada: 'firme',
		objetivoDelAnio: OBJETIVO_POR_DEFECTO,
		atributosQueSubieron: [],
		rasgo: null,
		novedades: [],
		suenos: {
			futbolista: null,
			representante: null,
			cumplidos: [],
			tope: { futbolista: 0, representante: 0 }
		},
		rival: null,
		inversiones: { futbolista: [], representante: [] },
		seleccion: { debuto: false, partidos: 0, goles: 0, mundiales: [] }
	};

	// El otro pibe de la camada. Se inventa al final porque necesita el club y
	// la media del futbolista ya puestos.
	estado.rival = inventarRival(estado, rng);
	return estado;
}

/** El nombre con el que se muestra cada rol en pantalla. */
export function nombreDe(estado: Estado, rol: Rol): string {
	return rol === 'futbolista' ? estado.futbolista.nombre : estado.representante.nombre;
}

export function elOtroRol(rol: Rol): Rol {
	return rol === 'futbolista' ? 'representante' : 'futbolista';
}
