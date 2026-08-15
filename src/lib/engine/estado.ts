import { MUNDO_SIN_CAMBIOS, type Atributos, type Estado, type Posicion, type Rol } from './tipos';
import type { Rng } from './rng';

/** Lo que se elige en la pantalla de creación de partida. */
export type ConfigPartida = {
	futbolista: {
		nombre: string;
		nacionalidad: string;
		posicion: Posicion;
		edadInicial: number;
		club: string;
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

/** Un pibe de 16 en el Ascenso: todo bajo, y un techo que nadie conoce. */
function atributosIniciales(rng: Rng, posicion: Posicion): Atributos {
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

	// Un empujón chico en lo que pide el puesto, para que el pibe ya se parezca
	// a algo desde el primer día.
	for (const atributo of Object.keys(PESOS_MEDIA[posicion]) as (keyof Atributos)[]) {
		atributos[atributo] = Math.min(60, atributos[atributo] + rng.entero(3, 10));
	}
	return atributos;
}

export function estadoInicial(config: ConfigPartida, rng: Rng, anio: number): Estado {
	const { futbolista, representante } = config;
	const atributos = atributosIniciales(rng, futbolista.posicion);

	return {
		version: 1,
		temporada: 1,
		anio,
		fase: 1,
		carreraTerminada: false,

		futbolista: {
			nombre: futbolista.nombre,
			nacionalidad: futbolista.nacionalidad,
			posicion: futbolista.posicion,
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
				club: futbolista.club,
				salarioMensual: rng.entero(900, 1600),
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
		cambiosMundo: structuredClone(MUNDO_SIN_CAMBIOS)
	};
}

/** El nombre con el que se muestra cada rol en pantalla. */
export function nombreDe(estado: Estado, rol: Rol): string {
	return rol === 'futbolista' ? estado.futbolista.nombre : estado.representante.nombre;
}

export function elOtroRol(rol: Rol): Rol {
	return rol === 'futbolista' ? 'representante' : 'futbolista';
}
