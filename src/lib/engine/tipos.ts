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
	/** Id del club en `content/mundo`, no el nombre. */
	clubId: string;
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
	/** La posición con la que razona el motor: arquero, defensor, medio o 9. */
	posicion: Posicion;
	/** El puesto de verdad (ver `puestos.ts`): lateral izquierdo, enganche… */
	puesto: string;
	/** Número de camiseta, 1–99. */
	numero: number;
	pie: 'derecho' | 'izquierdo' | 'ambos';
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

/**
 * Lo que cambió en el mundo respecto del contenido base de `content/mundo`.
 *
 * Se guardan solo las diferencias, no el mundo entero: una partida de veinte
 * temporadas ocupa unas pocas líneas en vez de arrastrar las 135 personas en
 * cada snapshot. `null` significa retirado.
 *
 * Vive acá y no en `mercado.ts` para que `Estado` no dependa del contenido.
 */
export type CambiosMundo = {
	movidos: Record<string, string | null>;
};

export const MUNDO_SIN_CAMBIOS: CambiosMundo = { movidos: {} };

/** Cómo le fue en la temporada que acaba de terminar. */
export type ResumenTemporada = {
	temporada: number;
	clubId: string;
	partidos: number;
	goles: number;
	asistencias: number;
	minutos: number;
	/** Puesto del equipo en la liga, y cuántos equipos había. */
	puesto: number;
	equipos: number;
	/** Nota del año, 1–10. Es el número que mueve todo lo demás. */
	nota: number;
	lesionado: boolean;
	campeon: boolean;
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

	/** Cómo se fue moviendo el mundo real desde que arrancó la partida. */
	cambiosMundo: CambiosMundo;

	/** La última temporada jugada. `null` hasta que se juegue la primera. */
	ultimaTemporada: ResumenTemporada | null;
};

/**
 * Lo que manda un rol para cerrar su parte de la fase.
 *
 * Todos los campos de juego son opcionales: si alguien cierra la fase sin
 * elegir nada, el motor toma la opción más conservadora. Una partida no se
 * puede trabar porque uno de los dos no tocó un botón.
 */
export type Decision = {
	rol: Rol;
	nota: string;

	/** Futbolista, fase 1: qué plan de pretemporada y con cuánta intensidad. */
	entrenamiento?: string;
	intensidad?: string;

	/** Futbolista, fase 2: qué eligió en cada ocasión marcada, en orden. */
	ocasiones?: string[];

	/** Representante, fases 1 y 2: qué gestión hace este tramo. */
	gestion?: string;

	/**
	 * Los dos, fase 3: a qué club quiere ir, o `quedarse`.
	 *
	 * El pase se hace solo si los dos eligen lo mismo. Es la regla que obliga a
	 * hablar antes de cerrar la fase.
	 */
	destino?: string;
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
