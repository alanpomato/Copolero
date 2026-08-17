import { randomBytes } from 'node:crypto';
import { club } from '../../../content/mundo';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from './db/cliente';
import { decisiones, jugadores, log, partidas, snapshots, tiradas } from './db/schema';
import { estadoInicial, type ConfigPartida } from '$lib/engine/estado';
import { estadoSincronizacion, resolverFase } from '$lib/engine/fases';
import { ocasionesDe, resolverOcasion } from '$lib/engine/ocasiones';
import { momentosDelRepresentante, resolverMomento } from '$lib/engine/momentos';
import { opcionesDeFase, type OpcionesDeFase, type Tirada } from '$lib/engine/pantalla';
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
	/** Los momentos del año que ya se tiraron, en orden. */
	tiradas: Tirada[];
};

export type { Tirada };

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
		opciones: opcionesDeFase(estado, jugador.rol, partida.semilla),
		tiradas: tiradasDe(db, partida.id, partida.temporada, jugador.rol)
	};
}

/** Lo que ya tiró este rol este año, en el orden en que pasó. */
function tiradasDe(db: Db, partidaId: string, temporada: number, rol: Rol): Tirada[] {
	return db
		.select()
		.from(tiradas)
		.where(
			and(eq(tiradas.partidaId, partidaId), eq(tiradas.temporada, temporada), eq(tiradas.rol, rol))
		)
		.orderBy(asc(tiradas.indice))
		.all()
		.map((t) => ({
			indice: t.indice,
			ocasionId: t.ocasionId,
			opcionId: t.opcionId,
			salio: t.salio,
			texto: t.texto
		}));
}

// ---------------------------------------------------------------------------
// La rueda
// ---------------------------------------------------------------------------

/**
 * Tira la rueda de un momento del año y devuelve qué pasó.
 *
 * Esto es lo que hace que la rueda pueda girar de verdad. Antes el resultado
 * de las tres ocasiones aparecía recién al cerrar la fase, junto con todo lo
 * demás, y eso obligaba a que la rueda fuera un dibujo quieto: al elegir, el
 * resultado todavía no existía y animar algo hubiera sido inventarlo.
 *
 * Existe porque `resolverOcasion` no mira nada del representante ni nada de lo
 * que pasa después: mira los atributos, la forma y la semilla, y las tres ya
 * están escritas cuando el futbolista elige. Así que el resultado ya existe en
 * el momento de elegir; lo único que faltaba era animarse a mirarlo.
 *
 * Lo que lo hace honesto es que sea irrevocable, y de eso se encarga la base:
 * la elección se escribe con un índice único por momento, dentro de la misma
 * transacción que la resuelve. El que recarga la página buscando otro número
 * se encuentra con el mismo. Y al cerrar la fase, `enviarDecision` pisa lo que
 * mande el formulario con lo que está escrito acá.
 *
 * Se tiran en orden: no se puede saltar al tercero sin jugar el primero.
 */
export function tirarOcasion(db: Db, token: string, indice: number, opcionId: string): Tirada {
	return db.transaction(
		(tx) => {
			const jugador = tx.select().from(jugadores).where(eq(jugadores.token, token)).get();
			if (!jugador) throw new ErrorDePartida('Ese link no corresponde a ninguna partida.');

			const partida = tx.select().from(partidas).where(eq(partidas.id, jugador.partidaId)).get();
			if (!partida) throw new ErrorDePartida('La partida ya no existe.');
			// Se tira en la temporada y en el mercado: son las dos fases donde a cada
			// rol le pasan cosas propias. En la pretemporada no hay nada que tirar.
			if (partida.fase !== 2 && partida.fase !== 3) {
				throw new ErrorDePartida('Todavía no empezó el campeonato.');
			}

			const estado = JSON.parse(partida.estadoJson) as Estado;
			if (estado.carreraTerminada) throw new ErrorDePartida('La carrera ya terminó.');

			// Si ya cerró su parte, la fase está esperando al otro y no hay nada
			// más que tirar.
			const yaCerro = tx
				.select({ rol: decisiones.rol })
				.from(decisiones)
				.where(
					and(
						eq(decisiones.partidaId, partida.id),
						eq(decisiones.temporada, partida.temporada),
						eq(decisiones.fase, partida.fase),
						eq(decisiones.rol, jugador.rol)
					)
				)
				.get();
			if (yaCerro) throw new ErrorDePartida('Ya cerraste tu parte de esta fase.');

			// Cada rol tira los suyos: el futbolista los de la cancha, el
			// representante los que le pasan afuera. Ni los ve ni los puede tirar el
			// otro, y eso lo decide el rol del token y no lo que mande el navegador.
			const delAnio =
				jugador.rol === 'futbolista'
					? ocasionesDe(estado, partida.semilla)
					: momentosDelRepresentante(estado, partida.semilla);
			const ocasion = delAnio[indice];
			if (!ocasion) throw new ErrorDePartida('Ese momento no existe.');
			if (!ocasion.opciones.some((o) => o.id === opcionId)) {
				throw new ErrorDePartida('Esa no es una de las opciones.');
			}

			const hechas = tiradasDe(tx as unknown as Db, partida.id, partida.temporada, jugador.rol);
			const yaEstaba = hechas.find((t) => t.indice === indice);
			if (yaEstaba) return yaEstaba;
			// En orden: para tirar el tercero tienen que estar los dos primeros.
			if (hechas.length < indice) {
				throw new ErrorDePartida('Primero se juega el momento anterior.');
			}

			const resultado =
				jugador.rol === 'futbolista'
					? resolverOcasion(
							ocasion as ReturnType<typeof ocasionesDe>[number],
							opcionId,
							estado,
							partida.semilla,
							indice
						)
					: resolverMomento(
							ocasion as ReturnType<typeof momentosDelRepresentante>[number],
							opcionId,
							estado,
							partida.semilla,
							indice
						);

			tx.insert(tiradas)
				.values({
					partidaId: partida.id,
					temporada: partida.temporada,
					rol: jugador.rol,
					indice,
					ocasionId: ocasion.id,
					opcionId: resultado.opcionId,
					salio: resultado.salio,
					texto: resultado.texto
				})
				.onConflictDoNothing()
				.run();

			// Releída: si dos clicks entraron a la vez, gana el que escribió, y los
			// dos ven lo mismo.
			const escrita = tiradasDe(
				tx as unknown as Db,
				partida.id,
				partida.temporada,
				jugador.rol
			).find((t) => t.indice === indice);
			if (!escrita) throw new ErrorDePartida('No se pudo tirar la rueda.');
			return escrita;
		},
		{ behavior: 'immediate' }
	);
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

			// Lo que ya se tiró, se tiró. El formulario manda las tres opciones
			// juntas, así que sin esto alcanzaría con editar un radio para cambiar
			// una elección de la que ya se vio el resultado. Lo escrito manda.
			if (fase === 2 || fase === 3) {
				const hechas = tiradasDe(tx as unknown as Db, partida.id, temporada, jugador.rol);
				if (hechas.length > 0) {
					const campo = jugador.rol === 'futbolista' ? 'ocasiones' : 'momentos';
					const elegidas = [...(payload[campo] ?? [])];
					for (const t of hechas) elegidas[t.indice] = t.opcionId;
					payload = { ...payload, [campo]: elegidas };
				}
			}

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
