import { randomBytes } from 'node:crypto';
import { club } from '../../../content/mundo';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from './db/cliente';
import { decisiones, jugadores, log, partidas, snapshots } from './db/schema';
import { estadoInicial, type ConfigPartida } from '$lib/engine/estado';
import { estadoSincronizacion, resolverFase } from '$lib/engine/fases';
import { opcionesDeFase, type OpcionesDeFase } from '$lib/engine/pantalla';
import { puesto } from '$lib/engine/puestos';
import { nuevaSemilla, rngPara } from '$lib/engine/rng';
import {
	ROLES,
	type Decision,
	type Estado,
	type EstadoSincronizacion,
	type Fase,
	type Rol
} from '$lib/engine/tipos';

/** Sin vocales ni caracteres que se confundan al dictar un código por teléfono. */
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LARGO_CODIGO = 6;

export class ErrorDePartida extends Error {}

function nuevoCodigo(): string {
	const bytes = randomBytes(LARGO_CODIGO);
	let codigo = '';
	for (let i = 0; i < LARGO_CODIGO; i++) {
		codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
	}
	return codigo;
}

function nuevoToken(): string {
	return randomBytes(24).toString('base64url');
}

export function elOtroRol(rol: Rol): Rol {
	return rol === 'futbolista' ? 'representante' : 'futbolista';
}

// ---------------------------------------------------------------------------
// Crear y entrar
// ---------------------------------------------------------------------------

export type PartidaCreada = { codigo: string; token: string };

/**
 * Crea la partida y al primer jugador, que elige con qué rol juega. El otro rol
 * queda libre hasta que alguien entra con el código.
 */
export function crearPartida(
	db: Db,
	config: ConfigPartida,
	rol: Rol,
	nombreJugador: string,
	anio = new Date().getUTCFullYear()
): PartidaCreada {
	const semilla = nuevaSemilla();
	const rng = rngPara(semilla, { temporada: 1, fase: 1, clave: 'creacion' });
	const estado = estadoInicial(config, rng, anio);

	return db.transaction((tx) => {
		// Colisión de código: improbable (32^6), pero barato de cubrir.
		let codigo = nuevoCodigo();
		for (let intento = 0; intento < 5; intento++) {
			const tomado = tx.select().from(partidas).where(eq(partidas.codigo, codigo)).get();
			if (!tomado) break;
			codigo = nuevoCodigo();
		}

		const partida = tx
			.insert(partidas)
			.values({
				codigo,
				semilla,
				estado: 'esperando',
				temporada: estado.temporada,
				fase: estado.fase,
				estadoJson: JSON.stringify(estado)
			})
			.returning()
			.get();

		const token = nuevoToken();
		tx.insert(jugadores).values({ partidaId: partida.id, rol, token, nombre: nombreJugador }).run();

		tx.insert(log)
			.values({
				partidaId: partida.id,
				temporada: 1,
				fase: 1,
				tipo: 'partida_creada',
				visiblePara: 'ambos',
				texto:
					`Arranca la carrera de ${estado.futbolista.nombre}, ` +
					`${puesto(estado.futbolista.puesto).nombre.toLowerCase()} con la ${estado.futbolista.numero}, ` +
					`en ${club(estado.futbolista.contrato.clubId).nombre}.`
			})
			.run();

		return { codigo, token };
	});
}

/** Entra el segundo jugador y toma el rol que quedó libre. */
export function unirseAPartida(db: Db, codigo: string, nombreJugador: string): string {
	return db.transaction(
		(tx) => {
			const partida = tx
				.select()
				.from(partidas)
				.where(eq(partidas.codigo, codigo.toUpperCase().trim()))
				.get();

			if (!partida) throw new ErrorDePartida('No existe ninguna partida con ese código.');

			const presentes = tx
				.select()
				.from(jugadores)
				.where(eq(jugadores.partidaId, partida.id))
				.all();

			if (presentes.length >= 2) {
				throw new ErrorDePartida('Esa partida ya tiene sus dos jugadores.');
			}

			const rolLibre = ROLES.find((r) => !presentes.some((j) => j.rol === r));
			if (!rolLibre) throw new ErrorDePartida('Esa partida ya tiene sus dos jugadores.');

			const token = nuevoToken();
			tx.insert(jugadores)
				.values({ partidaId: partida.id, rol: rolLibre, token, nombre: nombreJugador })
				.run();

			// El representante del juego es la persona que lo juega, así que al
			// entrar toma su nombre. El futbolista no: ese es un personaje con
			// nombre propio, elegido al crear la partida.
			const estado = JSON.parse(partida.estadoJson) as Estado;
			if (rolLibre === 'representante') {
				estado.representante.nombre = nombreJugador;
			}

			tx.update(partidas)
				.set({
					estado: 'en_curso',
					estadoJson: JSON.stringify(estado),
					actualizadaEn: Math.floor(Date.now() / 1000)
				})
				.where(eq(partidas.id, partida.id))
				.run();

			tx.insert(log)
				.values({
					partidaId: partida.id,
					temporada: partida.temporada,
					fase: partida.fase,
					tipo: 'jugador_entro',
					visiblePara: 'ambos',
					texto: `${nombreJugador} entra como ${rolLibre}. Empieza la partida.`
				})
				.run();

			return token;
		},
		{ behavior: 'immediate' }
	);
}

// ---------------------------------------------------------------------------
// Leer
// ---------------------------------------------------------------------------

export type Vista = {
	codigo: string;
	rol: Rol;
	yo: string;
	elOtro: { rol: Rol; nombre: string } | null;
	estado: Estado;
	sincronizacion: EstadoSincronizacion;
	/** Si ya cerré mi parte de la fase actual. */
	yaCerre: boolean;
	/** Solo las entradas que este rol tiene permitido ver. */
	diario: { tipo: string; texto: string; temporada: number; fase: number }[];
	/** Lo que este rol tiene para decidir en esta fase. */
	opciones: OpcionesDeFase;
};

/**
 * Arma todo lo que ve un jugador.
 *
 * Acá se sostiene la información por rol: el diario se filtra por `visiblePara`
 * del lado del servidor, así que lo del otro no viaja al navegador. No es que
 * el front lo esconda: no llega.
 */
export function vistaPara(db: Db, token: string): Vista | null {
	const jugador = db.select().from(jugadores).where(eq(jugadores.token, token)).get();
	if (!jugador) return null;

	const partida = db.select().from(partidas).where(eq(partidas.id, jugador.partidaId)).get();
	if (!partida) return null;

	const estado = JSON.parse(partida.estadoJson) as Estado;

	const otroJugador = db
		.select()
		.from(jugadores)
		.where(and(eq(jugadores.partidaId, partida.id), eq(jugadores.rol, elOtroRol(jugador.rol))))
		.get();

	const cerraron = db
		.select({ rol: decisiones.rol })
		.from(decisiones)
		.where(
			and(
				eq(decisiones.partidaId, partida.id),
				eq(decisiones.temporada, partida.temporada),
				eq(decisiones.fase, partida.fase)
			)
		)
		.all()
		.map((d) => d.rol);

	const diario = db
		.select()
		.from(log)
		.where(and(eq(log.partidaId, partida.id), inArray(log.visiblePara, ['ambos', jugador.rol])))
		.orderBy(asc(log.creadaEn), asc(log.id))
		.all()
		.map((e) => ({ tipo: e.tipo, texto: e.texto, temporada: e.temporada, fase: e.fase }));

	return {
		codigo: partida.codigo,
		rol: jugador.rol,
		yo: jugador.nombre,
		elOtro: otroJugador ? { rol: otroJugador.rol, nombre: otroJugador.nombre } : null,
		estado,
		sincronizacion: otroJugador ? estadoSincronizacion(estado, cerraron) : 'WAITING_FOR_BOTH',
		yaCerre: cerraron.includes(jugador.rol),
		diario,
		opciones: opcionesDeFase(estado, jugador.rol, partida.semilla)
	};
}

/** Marca que el jugador pasó por acá, para saber si sigue vivo. */
export function tocarJugador(db: Db, token: string): void {
	db.update(jugadores)
		.set({ ultimaVezEn: Math.floor(Date.now() / 1000) })
		.where(eq(jugadores.token, token))
		.run();
}

// ---------------------------------------------------------------------------
// La barrera
// ---------------------------------------------------------------------------

export type ResultadoEnvio = { faseCerrada: boolean; sincronizacion: EstadoSincronizacion };

/**
 * Guarda la decisión de un rol y, si con eso quedan las dos, cierra la fase.
 *
 * Todo pasa dentro de una única transacción `IMMEDIATE`, que toma el lock de
 * escritura de entrada. Eso hace que dos envíos simultáneos se serialicen y que
 * la fase se resuelva una sola vez, sin importar quién apretó primero.
 *
 * Es idempotente por `(partida, temporada, fase, rol)`: reenviar el formulario
 * o apretar dos veces no duplica la decisión ni vuelve a resolver la fase.
 */
export function enviarDecision(
	db: Db,
	token: string,
	payload: Decision,
	opciones: { tambienPorElOtro?: boolean } = {}
): ResultadoEnvio {
	return db.transaction(
		(tx) => {
			const jugador = tx.select().from(jugadores).where(eq(jugadores.token, token)).get();
			if (!jugador) throw new ErrorDePartida('Ese link no corresponde a ninguna partida.');

			if (payload.rol !== jugador.rol) {
				throw new ErrorDePartida('No podés decidir por el otro rol.');
			}

			// Releído dentro de la transacción: es la foto contra la que decidimos.
			const partida = tx.select().from(partidas).where(eq(partidas.id, jugador.partidaId)).get();
			if (!partida) throw new ErrorDePartida('La partida ya no existe.');

			const presentes = tx
				.select()
				.from(jugadores)
				.where(eq(jugadores.partidaId, partida.id))
				.all();
			if (presentes.length < 2) {
				throw new ErrorDePartida('Todavía falta que entre el otro jugador.');
			}

			const estado = JSON.parse(partida.estadoJson) as Estado;
			if (estado.carreraTerminada) {
				throw new ErrorDePartida('La carrera ya terminó.');
			}

			const temporada = partida.temporada;
			const fase = partida.fase as Fase;

			// El índice único es la barrera de verdad: si ya había decisión de este
			// rol para esta fase, no se pisa.
			tx.insert(decisiones)
				.values({
					partidaId: partida.id,
					temporada,
					fase,
					rol: jugador.rol,
					payloadJson: JSON.stringify(payload)
				})
				.onConflictDoNothing()
				.run();

			// Avanzar sin el otro: se cierra también por él, con lo que el motor
			// toma por defecto. Queda anotado en el diario, porque una fase que
			// avanzó sin que el otro la jugara tiene que poder verse.
			if (opciones.tambienPorElOtro) {
				const otro = elOtroRol(jugador.rol);
				tx.insert(decisiones)
					.values({
						partidaId: partida.id,
						temporada,
						fase,
						rol: otro,
						payloadJson: JSON.stringify({ rol: otro, nota: '' } satisfies Decision)
					})
					.onConflictDoNothing()
					.run();

				tx.insert(log)
					.values({
						partidaId: partida.id,
						temporada,
						fase,
						tipo: 'avance_forzado',
						visiblePara: 'ambos',
						texto: `${jugador.nombre} avanzó la fase sin esperar. Las decisiones de ${otro} quedaron en lo que el juego toma por defecto.`
					})
					.run();
			}

			const filas = tx
				.select()
				.from(decisiones)
				.where(
					and(
						eq(decisiones.partidaId, partida.id),
						eq(decisiones.temporada, temporada),
						eq(decisiones.fase, fase)
					)
				)
				.all();

			if (filas.length < ROLES.length) {
				return {
					faseCerrada: false,
					sincronizacion: estadoSincronizacion(
						estado,
						filas.map((f) => f.rol)
					)
				};
			}

			// --- Están las dos: se cierra la fase ---------------------------------
			const tomadas = filas.map((f) => JSON.parse(f.payloadJson) as Decision);
			const { estado: nuevoEstado, log: entradas } = resolverFase(estado, tomadas, partida.semilla);

			tx.insert(snapshots)
				.values({
					partidaId: partida.id,
					temporada,
					fase,
					estadoJson: partida.estadoJson
				})
				.onConflictDoNothing()
				.run();

			for (const entrada of entradas) {
				tx.insert(log)
					.values({
						partidaId: partida.id,
						temporada,
						fase,
						tipo: entrada.tipo,
						visiblePara: entrada.visiblePara,
						texto: entrada.texto
					})
					.run();
			}

			tx.update(partidas)
				.set({
					estadoJson: JSON.stringify(nuevoEstado),
					temporada: nuevoEstado.temporada,
					fase: nuevoEstado.fase,
					estado: nuevoEstado.carreraTerminada ? 'terminada' : 'en_curso',
					actualizadaEn: Math.floor(Date.now() / 1000)
				})
				.where(eq(partidas.id, partida.id))
				.run();

			return {
				faseCerrada: true,
				sincronizacion: nuevoEstado.carreraTerminada ? 'CAREER_OVER' : 'WAITING_FOR_BOTH'
			};
		},
		{ behavior: 'immediate' }
	);
}
