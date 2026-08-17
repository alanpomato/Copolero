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

/**
 * Una inversión ya comprada. Ver `inversiones.ts`.
 *
 * `quedan` solo existe en los consumibles sueltos: es cuántas temporadas les
 * faltan. `fijo` marca los que se ataron para siempre —no se gastan y se pagan
 * todos los años—, y es opcional porque las partidas que empezaron antes de que
 * existiera no lo tienen guardado.
 */
export type InversionComprada = {
	id: string;
	porTemporadaUsd: number;
	quedan?: number;
	fijo?: boolean;
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
		/**
		 * Cuánto cae bien.
		 *
		 * No cambia ninguna probabilidad: aparece cuando algo ya salió mal y a
		 * veces lo salva igual. Lo pidió Hernán con esas palabras —"que haya una
		 * stat de carisma que aunque contestes mal igual el pibe se sume"— y es
		 * exactamente lo que hace. Ver `momentos.ts`.
		 *
		 * Opcional porque las partidas que empezaron antes no lo tienen guardado.
		 */
		carisma?: number;
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

/**
 * Una temporada, comprimida a lo que hace falta para dibujarla.
 *
 * `ResumenTemporada` es la foto de un año; esto es la línea de tiempo entera.
 * Guarda solo números —nada de textos— porque después de veinte temporadas
 * tiene que seguir cabiendo cómodo en una fila de SQLite.
 *
 * De acá sale el gráfico de la carrera, que es la única pantalla donde se ve
 * de un vistazo si el jugador está subiendo o ya empezó a bajar.
 */
export type HitoTemporada = {
	temporada: number;
	anio: number;
	edad: number;
	clubId: string;
	/** Media general con la que jugó ese año. */
	media: number;
	/** Nota del año, 1–10. */
	nota: number;
	partidos: number;
	goles: number;
	asistencias: number;
	fama: number;
	valorUsd: number;
	/** El club salió campeón ese año, haya jugado él o no. */
	campeon: boolean;
	/** Y el título es suyo: jugó lo suficiente como para contarlo. */
	titulo: boolean;
	lesionado: boolean;
	/** Cómo le fue en el Mundial de ese año, si lo hubo y si fue. */
	mundial: string | null;
	/** Si al terminar la temporada lo transfirieron. */
	seFue: boolean;
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

	/** Todas las temporadas cerradas, en orden. Es la carrera dibujable. */
	historial: HitoTemporada[];

	/**
	 * Cuántas temporadas jugó en cada club.
	 *
	 * De acá salen dos cosas del puntaje final: el multiplicador de permanencia
	 * —quedarse paga— y en qué clubes quedó como ídolo. Es el número que choca de
	 * frente con la comisión por transferencia del representante.
	 */
	temporadasPorClub: Record<string, number>;

	/** Temporadas que se perdió entera: lesión larga o banco. Restan al final. */
	temporadasPerdidas: number;

	/**
	 * Con cuánta intensidad hizo la pretemporada de esta temporada.
	 *
	 * Vive en el estado porque se elige en la fase 1 y se cobra en la fase 2, que
	 * son dos resoluciones distintas. Sin esto, entrenar a matar terminaba
	 * haciéndote peor: el desgaste te sacaba minutos, y los minutos son lo que te
	 * hace crecer. El esfuerzo tiene que comprar algo.
	 */
	intensidadDeLaPretemporada: string;

	/**
	 * Cómo decidió jugar el año. Ver `objetivos.ts`.
	 *
	 * Se elige en la pretemporada y se cobra al jugar la temporada, que son dos
	 * resoluciones distintas, así que tiene que vivir acá.
	 *
	 * Antes se elegía en la fase 2, que se llama "Temporada", y eso confundía con
	 * razón: leído desde la pantalla parecía que se podía cambiar el plan con el
	 * campeonato ya empezado. Un plan de juego se decide antes de que arranque, y
	 * después se banca.
	 */
	objetivoDelAnio: string;

	/**
	 * Si pidió que lo dejen ir. Ver `salida.ts`.
	 *
	 * Se pide durante la temporada y se cobra en el mercado que viene: los clubes
	 * se enteran de que está en venta y aparecen más ofertas, y más baratas,
	 * porque el suyo ya no lo retiene. Se apaga sola al cerrar el año: es un
	 * pedido para ese mercado, no una etiqueta que se queda pegada.
	 */
	pidioLaSalida: boolean;

	/**
	 * El mercado en dos tiempos. Ver `cartas.ts`.
	 *
	 * La fase 3 dejó de ser simétrica: primero juega el representante solo —le
	 * llegan seis clubes y deja pasar tres— y recién cuando termina decide el
	 * futbolista, que hasta ese momento espera. Eso obliga a que la fase tenga
	 * un adentro, porque son dos resoluciones distintas de la misma fase y lo
	 * que pasó en la primera tiene que sobrevivir hasta la segunda.
	 *
	 * Opcional porque las partidas que empezaron antes no lo tienen guardado: si
	 * falta, la fase 3 arranca por el primer tiempo, que es lo correcto.
	 */
	mercado?: {
		paso: 'filtro' | 'eleccion';
		/** Los clubes que el representante dejó pasar y de verdad llegaron. */
		llegaron: string[];
		/** Los que eligió y se le cayeron. Se cuentan: la falla tiene que verse. */
		seCayeron: string[];
		/**
		 * Lo que salió de la mesa de renovación, resuelta en el primer tiempo.
		 *
		 * `conseguida: null` significa que no se sentaron —no vencía el contrato—
		 * y que el cierre decide como decidía siempre.
		 */
		renovacion: { conseguida: boolean | null; quisieron: boolean; como: string };
	};

	/**
	 * Qué atributos subieron desde la última vez que se miró la tarjeta.
	 *
	 * Sirve para la flechita del ▲ al lado del número. Sin esto, subir dos puntos
	 * de definición es un cambio que nadie ve: el número está ahí y era otro hace
	 * un rato, y nada lo señala.
	 */
	atributosQueSubieron: string[];

	/**
	 * Qué clase de jugador es. Ver `rasgos.ts`.
	 *
	 * Se elige en la primera pretemporada, entre tres que trae el azar, y no se
	 * cambia nunca más. `null` hasta que se elija.
	 */
	rasgo: string | null;

	/**
	 * Para qué está jugando cada uno. Ver `suenos.ts`.
	 *
	 * Se elige uno por rol en la primera pretemporada y se cumple —o no— quince
	 * temporadas después. `cumplidos` guarda los que ya se lograron para que no
	 * se puedan descumplir: la caja del representante puede bajar después de
	 * haber tocado los diez millones, pero los tocó.
	 *
	 * Se guarda también en qué temporada pasó, porque el día que se cumple es
	 * tapa de diario y la tapa se arma con la temporada que cerró.
	 */
	suenos: {
		futbolista: string | null;
		representante: string | null;
		cumplidos: { id: string; temporada: number }[];
		/**
		 * Lo más alto que llegó cada uno.
		 *
		 * Hay sueños que se miden con un número que puede bajar: la caja del
		 * representante baja cuando compra algo, y el prestigio baja si se manda una
		 * macana. La barra no puede bajar nunca —una meta que retrocede no es una
		 * meta, es un castigo, y es exactamente lo que hace cerrar el juego—, así que
		 * lo que se muestra es la marca más alta que tocó.
		 */
		tope: { futbolista: number; representante: number };
	};

	/**
	 * Lo que pasó en el mundo mientras se jugaba la temporada. Ver `mercado.ts`.
	 *
	 * Los pases y retiros de la gente de verdad ya se calculaban y se escribían
	 * en el diario, pero solo como texto: cuatro líneas grises al pie de la
	 * pantalla más larga del juego, que nadie lee. Guardando el movimiento
	 * entero —de qué club a qué club— se puede dibujar con los escudos, que es
	 * lo que hace que el mundo se sienta vivo en vez de leerse como un registro.
	 *
	 * Solo las de la última temporada: es una novedad, no un archivo. El diario
	 * sigue teniendo todas.
	 */
	novedades: {
		tipo: string;
		nombre: string;
		desde: string | null;
		hacia: string | null;
		texto: string;
	}[];

	/**
	 * El otro pibe de la camada. Ver `rival.ts`.
	 *
	 * El tipo vive allá porque el estado no depende del contenido; acá se
	 * referencia por estructura, igual que la selección.
	 */
	rival: {
		nombre: string;
		clubId: string;
		nivel: number;
		potencial: number;
		edad: number;
		goles: number;
		asistencias: number;
		partidos: number;
		titulos: number;
		ganadasPorEl: number;
		ganadasPorVos: number;
		ultimaTemporada: { goles: number; asistencias: number; partidos: number } | null;
	} | null;

	/**
	 * En qué gastó cada uno su plata. Ver `inversiones.ts`.
	 *
	 * Se guardan los ids y nada más: lo que hace cada una vive en el catálogo,
	 * así que cambiar un precio o un efecto no obliga a migrar las partidas.
	 */
	inversiones: {
		futbolista: InversionComprada[];
		representante: InversionComprada[];
	};

	/**
	 * La selección y los mundiales.
	 *
	 * Es lo único del juego que se espera: llega solo, cada cuatro años, y no se
	 * puede apurar. Ver el `import type` de `seleccion.ts` sería circular, así
	 * que el tipo vive allá y acá se referencia por estructura.
	 */
	seleccion: {
		debuto: boolean;
		partidos: number;
		goles: number;
		mundiales: {
			anio: number;
			resultado: 'campeon' | 'final' | 'semifinal' | 'cuartos' | 'fase-de-grupos' | 'no-fue';
			partidos: number;
			goles: number;
		}[];
	};
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

	/** Futbolista, primera pretemporada: qué clase de jugador es. */
	rasgo?: string;

	/** Los dos, primera pretemporada: para qué está jugando. Ver `suenos.ts`. */
	sueno?: string;

	/** Futbolista, fase 2: cómo va a jugar el año. Ver `objetivos.ts`. */
	objetivo?: string;

	/** Futbolista, fase 2: qué eligió en cada ocasión marcada, en orden. */
	ocasiones?: string[];

	/** Representante, fases 1 y 2: qué gestión hace este tramo. */
	gestion?: string;

	/**
	 * Los dos, fase 1, cuando vence el contrato de representación.
	 *
	 * El futbolista elige hasta dónde está dispuesto a llegar y el representante
	 * cuánto pide. Hay trato si el pedido entra en el techo.
	 */
	trato?: string;

	/**
	 * Los dos, fase 1, cuando el contrato con el club está por vencer.
	 *
	 * `firmar` o `esperar`. Solo se renueva si los dos eligen lo mismo, igual
	 * que el pase. Esperar es apostar a salir libre.
	 */
	renovacion?: string;

	/**
	 * Los dos, fase 1: qué compran esta temporada. Ver `inversiones.ts`.
	 *
	 * Son varias y no una. Antes era una sola por año y armar el equipo propio
	 * llevaba una carrera entera: Hernán lo dijo jugando —"solo puedo comprar un
	 * consumible por temporada, no puedo poner más de uno en simultáneo"—. La
	 * plata sigue siendo el límite; el calendario no tiene por qué serlo.
	 *
	 * `inversion` en singular queda por las decisiones que ya estaban guardadas
	 * cuando esto cambió: una partida abierta no se rompe por un cambio de forma.
	 */
	inversiones?: string[];
	inversion?: string;

	/**
	 * Representante, fase 2: qué contestó en cada uno de sus momentos.
	 *
	 * En el mismo orden en que se los mostraron, igual que `ocasiones` del otro
	 * lado. Ver `momentos.ts`.
	 */
	momentos?: string[];

	/** Futbolista, fase 2: si pide que lo dejen ir. Ver `salida.ts`. */
	pedirSalida?: string;

	/**
	 * Futbolista, segundo tiempo del mercado: a qué club va, o `quedarse`.
	 *
	 * Elige solo, y entre lo que le quedó. Antes elegían los dos y el pase se
	 * hacía únicamente si coincidían, lo que convertía la decisión más
	 * importante del juego en un ejercicio de ponerse de acuerdo por fuera del
	 * juego. Ahora el representante ya tuvo su parte, y fue antes: ver `cartas.ts`.
	 */
	destino?: string;

	/**
	 * Representante, primer tiempo del mercado: cuáles deja pasar.
	 *
	 * Hasta tres de las seis que le llegaron. Cada una se juega su probabilidad
	 * por separado, así que al futbolista pueden llegarle tres, dos, una o
	 * ninguna. Ver `cartas.ts`.
	 */
	filtradas?: string[];
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
