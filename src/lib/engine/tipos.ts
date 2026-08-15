/**
 * Tipos del estado de partida.
 *
 * Este módulo y todo `src/lib/engine` son puros: no leen ni escriben nada.
 * El motor recibe un estado y unas decisiones, y devuelve un estado nuevo.
 */

export type Rol = 'futbolista' | 'representante';
export const ROLES: readonly Rol[] = ['futbolista', 'representante'];

export type Fase = 1 | 2 | 3;
export const FASES: readonly Fase[] = [1, 2, 3];

export const NOMBRE_FASE: Record<Fase, string> = {
	1: 'Pretemporada',
	2: 'Temporada',
	3: 'Mercado y cierre'
};

/** Estados de sincronización, con los nombres que definió Bebo en la spec. */
export type EstadoSincronizacion =
	| 'WAITING_FOR_BOTH'
	| 'WAITING_FOR_PLAYER'
	| 'WAITING_FOR_AGENT'
	| 'BOTH_READY'
	| 'SEASON_COMPLETE'
	| 'CAREER_OVER';

export type Posicion = 'arquero' | 'defensor' | 'mediocampista' | 'delantero';

export const POSICIONES: readonly Posicion[] = [
	'arquero',
	'defensor',
	'mediocampista',
	'delantero'
];

export type Atributos = {
	definicion: number;
	velocidad: number;
	potencia: number;
	resistencia: number;
	pase: number;
	regate: number;
	defensa: number;
	liderazgo: number;
};

export type Contrato = {
	club: string;
	/** Salario mensual en USD. */
	salarioMensual: number;
	temporadasRestantes: number;
	/** Cláusula de rescisión en USD. 0 = sin cláusula. */
	clausula: number;
};

/** Lo que el representante negoció para sí mismo. */
export type ContratoRepresentacion = {
	pctSalario: number;
	pctTransferencia: number;
	duracionTemporadas: number;
	clausulaSalida: number;
};

export type Futbolista = {
	nombre: string;
	nacionalidad: string;
	posicion: Posicion;
	edad: number;

	atributos: Atributos;
	/** Techo de crecimiento. Oculto para los dos jugadores: solo se estima. */
	potencial: number;

	/** Volátiles: se mueven todas las temporadas. */
	forma: number;
	moral: number;
	/** Acumulativo e irreversible. Es lo que termina definiendo el retiro. */
	desgaste: number;

	/** Sociales. */
	fama: number;
	hinchada: number;
	dt: number;
	prensa: number;

	contrato: Contrato;
	dineroUsd: number;

	/** Acumulados de carrera. */
	partidos: number;
	goles: number;
	asistencias: number;
	titulos: number;
	minutos: number;
	valorMercadoUsd: number;
};

export type Representante = {
	nombre: string;
	edad: number;
	prestigio: number;
	dineroUsd: number;
	atributos: {
		negociacion: number;
		scouting: number;
		contactos: number;
	};
	/** Cantidad de representados además del futbolista principal. */
	representadosExtra: number;
};

export type Estado = {
	/** Versión del schema del estado, para migrar partidas viejas. */
	version: 1;
	temporada: number;
	anio: number;
	fase: Fase;
	/** Se pone en true cuando el futbolista se retira. */
	carreraTerminada: boolean;

	futbolista: Futbolista;
	representante: Representante;

	/** La variable que une a los dos. Arranca en 60. */
	confianza: number;
	contratoRepresentacion: ContratoRepresentacion;
};

/**
 * Lo que manda un rol para cerrar su parte de la fase.
 *
 * En M0 no hay contenido de juego todavía: la única decisión es cerrar la fase,
 * con una nota opcional que queda privada hasta que la fase cierra. Sirve para
 * probar la barrera y la proyección por rol de punta a punta.
 */
export type Decision = {
	rol: Rol;
	nota: string;
};

export type VisiblePara = 'ambos' | Rol;

export type EntradaLog = {
	tipo: string;
	visiblePara: VisiblePara;
	texto: string;
};

export type ResultadoFase = {
	estado: Estado;
	log: EntradaLog[];
};
