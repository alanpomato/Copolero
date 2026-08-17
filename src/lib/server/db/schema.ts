import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

/**
 * Modelo de datos de Copolero. Ver `docs/diseno-tecnico.md` § 9.
 *
 * El estado del juego se guarda como un blob JSON (`estadoJson`), porque el
 * motor trabaja sobre un objeto y no sobre filas. Lo que sí es relacional es
 * todo lo que necesita consultarse por separado: quién cerró qué fase, y qué
 * puede ver cada rol.
 */

const ahora = sql`(unixepoch())`;

export const partidas = sqliteTable('partidas', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),

	/** Código corto para compartir la invitación. */
	codigo: text('codigo').notNull().unique(),

	/** `esperando` hasta que entra el segundo jugador. */
	estado: text('estado', { enum: ['esperando', 'en_curso', 'terminada'] })
		.notNull()
		.default('esperando'),

	/** Semilla del azar. Se escribe una vez y no se toca nunca más. */
	semilla: text('semilla').notNull(),

	/** Denormalizados desde estadoJson para poder listar sin parsear. */
	temporada: integer('temporada').notNull().default(1),
	fase: integer('fase').notNull().default(1),

	/** El estado completo del juego, serializado. */
	estadoJson: text('estado_json').notNull(),

	/** Congela los plazos (ver diseño técnico § 11). */
	pausada: integer('pausada', { mode: 'boolean' }).notNull().default(false),

	creadaEn: integer('creada_en').notNull().default(ahora),
	actualizadaEn: integer('actualizada_en').notNull().default(ahora)
});

export const jugadores = sqliteTable(
	'jugadores',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		partidaId: text('partida_id')
			.notNull()
			.references(() => partidas.id, { onDelete: 'cascade' }),

		rol: text('rol', { enum: ['futbolista', 'representante'] }).notNull(),

		/**
		 * Identidad del jugador. Va en la URL y se guarda en una cookie.
		 * Sin cuentas ni contraseñas: quien tiene el link, es ese jugador.
		 * Alcanza para dos amigos y evita todo el trabajo de auth.
		 */
		token: text('token').notNull().unique(),

		nombre: text('nombre').notNull(),
		ultimaVezEn: integer('ultima_vez_en').notNull().default(ahora),
		creadoEn: integer('creado_en').notNull().default(ahora)
	},
	(t) => [unique('jugadores_partida_rol').on(t.partidaId, t.rol)]
);

/**
 * Lo que mandó cada rol para cerrar su parte de una fase.
 *
 * El índice único es la barrera: garantiza una sola decisión por rol y por
 * fase, así que reenviar el formulario no puede duplicar nada.
 */
export const decisiones = sqliteTable(
	'decisiones',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		partidaId: text('partida_id')
			.notNull()
			.references(() => partidas.id, { onDelete: 'cascade' }),

		temporada: integer('temporada').notNull(),
		fase: integer('fase').notNull(),
		rol: text('rol', { enum: ['futbolista', 'representante'] }).notNull(),

		/** El payload de la decisión, serializado. */
		payloadJson: text('payload_json').notNull(),

		enviadaEn: integer('enviada_en').notNull().default(ahora)
	},
	(t) => [
		unique('decisiones_una_por_rol_y_fase').on(t.partidaId, t.temporada, t.fase, t.rol),
		index('decisiones_por_fase').on(t.partidaId, t.temporada, t.fase)
	]
);

/**
 * El diario de la partida.
 *
 * `visiblePara` es lo que sostiene la información por rol: el servidor filtra
 * por este campo y nunca manda al cliente lo que no le corresponde. Existe
 * desde la primera migración justamente para que las acciones ocultas de la v2
 * no obliguen a rehacer nada.
 */
export const log = sqliteTable(
	'log',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		partidaId: text('partida_id')
			.notNull()
			.references(() => partidas.id, { onDelete: 'cascade' }),

		temporada: integer('temporada').notNull(),
		fase: integer('fase').notNull(),

		tipo: text('tipo').notNull(),
		visiblePara: text('visible_para', {
			enum: ['ambos', 'futbolista', 'representante']
		}).notNull(),

		texto: text('texto').notNull(),
		datosJson: text('datos_json'),

		creadaEn: integer('creada_en').notNull().default(ahora)
	},
	(t) => [index('log_por_partida').on(t.partidaId, t.temporada, t.fase)]
);

/**
 * Estado congelado al cerrar cada fase. Sirve para depurar, para reproducir una
 * partida y para volver atrás si algo sale mal.
 */
export const snapshots = sqliteTable(
	'snapshots',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		partidaId: text('partida_id')
			.notNull()
			.references(() => partidas.id, { onDelete: 'cascade' }),

		temporada: integer('temporada').notNull(),
		fase: integer('fase').notNull(),

		estadoJson: text('estado_json').notNull(),
		creadaEn: integer('creada_en').notNull().default(ahora)
	},
	(t) => [unique('snapshots_uno_por_fase').on(t.partidaId, t.temporada, t.fase)]
);

/**
 * Las tiradas de la rueda de ocasión.
 *
 * Cuando el futbolista elige qué hacer en un momento del año, la rueda gira y
 * el resultado aparece en el acto. Para que eso no sea una mentira tiene que
 * ser irrevocable: la elección se escribe acá antes de mostrar nada, con un
 * índice único por momento, y si el jugador recarga la página o vuelve a
 * mandar el formulario con otra opción, lo que vale es lo que está escrito.
 *
 * El resultado se guarda junto con la elección por una sola razón: que
 * recargar muestre lo mismo que se vio. Igual no es la fuente de verdad —al
 * cerrar la fase el motor lo vuelve a calcular con la misma semilla, y da lo
 * mismo, porque el azar es determinista—. Acá se guarda para poder dibujarlo,
 * no para decidirlo.
 */
export const tiradas = sqliteTable(
	'tiradas',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		partidaId: text('partida_id')
			.notNull()
			.references(() => partidas.id, { onDelete: 'cascade' }),

		temporada: integer('temporada').notNull(),

		/** Cuál de los momentos del año: 0, 1, 2. */
		indice: integer('indice').notNull(),

		/** La ocasión que tocó, para no tirar la de otra si algo cambió. */
		ocasionId: text('ocasion_id').notNull(),

		/** Lo que eligió. Esto es lo que manda al cerrar la fase. */
		opcionId: text('opcion_id').notNull(),

		salio: integer('salio', { mode: 'boolean' }).notNull(),
		texto: text('texto').notNull(),

		tiradaEn: integer('tirada_en').notNull().default(ahora)
	},
	(t) => [
		unique('tiradas_una_por_momento').on(t.partidaId, t.temporada, t.indice),
		index('tiradas_por_temporada').on(t.partidaId, t.temporada)
	]
);

export type Partida = typeof partidas.$inferSelect;
export type Jugador = typeof jugadores.$inferSelect;
export type FilaDecision = typeof decisiones.$inferSelect;
export type FilaLog = typeof log.$inferSelect;
