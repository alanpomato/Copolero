import { rngPara } from './rng';
import { media } from './estado';
import { club } from '../../../content/mundo';
import {
	INTENSIDAD_POR_DEFECTO,
	PLAN_POR_DEFECTO,
	entrenar,
	type Intensidad
} from './entrenamiento';
import { aplicarEvento, eventosDeLaTemporada } from './eventos';
import { resolverGestion } from './gestion';
import { cobrarMantenimiento, comprar } from './inversiones';
import { simularMercado, titulares } from './mercado';
import { ocasionesDe, resolverOcasion } from './ocasiones';
import { RENOVACION, aplicarMomento, momentosDelRepresentante, resolverMomento } from './momentos';
import { aplicarPase, ofertasPara, resolverPase, valorDeMercado, type Oferta } from './pases';
import { filtrar, type Filtrado } from './cartas';
import { empujarElTecho, loQueEmpujaElTecho, loQueSeCuenta } from './techo';
import { objetivo as objetivoPorId } from './objetivos';
import { elegirRasgo, tocaElegirRasgo } from './rasgos';
import { pedirLaSalida } from './salida';
import { loQueDejaLaCarteraAlAnio, loQueSumaLaCarteraAlAnio } from './cartera';
import { anotarElTope, elegirSueno, revisarSuenos } from './suenos';
import { correrleElAnio } from './rival';
import { resolverNegociacion, tocaRenegociar } from './representacion';
import {
	clubDeUltimoRecurso,
	comoLlegaAlMercado,
	contratoDeUltimoRecurso,
	ofertaDeRenovacion,
	resolverRenovacion,
	tocaRenovar,
	type OfertaDeRenovacion
} from './renovacion';
import { aplicarSeleccion, jugarConLaSeleccion, type Mundial } from './seleccion';
import {
	PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO,
	aplicarEfecto,
	brechaCon,
	jugarTemporada
} from './temporada';
import {
	MUNDO_SIN_CAMBIOS,
	NOMBRE_FASE,
	ROLES,
	type Decision,
	type EntradaLog,
	type Estado,
	type EstadoSincronizacion,
	type Fase,
	type ResultadoFase,
	type ResumenTemporada,
	type Rol,
	type VisiblePara
} from './tipos';

/** El objetivo pedido, o el que el motor toma si mandaron cualquier cosa. */
function objetivoValido(id: string | undefined): string {
	return objetivoPorId(id).id;
}

/** Lo que se resigna del sueldo por llegar al mercado sin nada arreglado. */
const DESCUENTO_POR_APURO = 0.75;

/** Tope duro de temporadas: de los 16 a los 39. */
export const TEMPORADAS_MAXIMAS = 24;

/**
 * En qué estado está la fase actual según quién cerró.
 *
 * Los nombres son los que definió Bebo en la spec. `BOTH_READY` significa que
 * los dos cerraron y todavía no se resolvió: es el momento en el que la barrera
 * dispara.
 */
export function estadoSincronizacion(
	estado: Estado,
	cerraron: readonly Rol[]
): EstadoSincronizacion {
	if (estado.carreraTerminada) return 'CAREER_OVER';

	/*
	 * En el mercado no deciden los dos, y por eso la espera no se calcula igual.
	 *
	 * Si el que tiene que jugar es uno solo, esperar al otro no significa nada:
	 * lo que hay que decir es a quién se está esperando, y es al único que
	 * puede mover. Ver `quienesDeciden`.
	 */
	const deben = quienesDeciden(estado);
	if (deben.length === 1) {
		if (cerraron.includes(deben[0])) return 'BOTH_READY';
		return deben[0] === 'futbolista' ? 'WAITING_FOR_PLAYER' : 'WAITING_FOR_AGENT';
	}

	const futbolista = cerraron.includes('futbolista');
	const representante = cerraron.includes('representante');

	if (futbolista && representante) return 'BOTH_READY';
	if (futbolista) return 'WAITING_FOR_AGENT';
	if (representante) return 'WAITING_FOR_PLAYER';
	return 'WAITING_FOR_BOTH';
}

/** En qué tiempo del mercado está. Fuera de la fase 3 no significa nada. */
export function pasoDelMercado(estado: Estado): 'filtro' | 'eleccion' {
	return estado.mercado?.paso ?? 'filtro';
}

/**
 * Quién tiene que decidir para que esto avance.
 *
 * Casi siempre son los dos, y por eso la barrera existe. El mercado es la
 * excepción y es a propósito: primero trabaja el representante —le llegan seis
 * clubes y deja pasar tres— y el futbolista espera de verdad, sin nada que
 * tocar. Después decide el futbolista entre lo que le quedó, y el que espera
 * es el otro.
 *
 * Que uno espere sin poder hacer nada es la parte incómoda y es la que hace que
 * el rol del representante exista: si el futbolista pudiera adelantar algo, el
 * filtro sería una formalidad y no una decisión que le cambia el mundo.
 */
export function quienesDeciden(estado: Estado): readonly Rol[] {
	if (estado.fase !== 3) return ROLES;
	return pasoDelMercado(estado) === 'filtro' ? ['representante'] : ['futbolista'];
}

export function faseSiguiente(fase: Fase): Fase {
	return fase === 3 ? 1 : ((fase + 1) as Fase);
}

/**
 * Resuelve una fase completa y devuelve el estado nuevo más lo que pasó.
 *
 * Función pura: mismo estado y mismas decisiones dan siempre el mismo
 * resultado, sin importar en qué orden llegaron. El azar sale de la semilla.
 *
 * Exige las decisiones de los roles que tienen que decidir en esta fase —los
 * dos, salvo en el mercado, donde juega uno por vez—. La barrera es
 * responsabilidad de quien llama (ver `src/lib/server/partidas.ts`), pero acá
 * se vuelve a verificar para que el motor no pueda quedar en un estado a
 * medias. Ver `quienesDeciden`.
 */
export function resolverFase(
	estado: Estado,
	decisiones: readonly Decision[],
	semilla: string
): ResultadoFase {
	if (estado.carreraTerminada) {
		throw new Error('La carrera ya terminó: no hay más fases para resolver');
	}
	// Los que tienen que estar, no siempre los dos: en el mercado juega uno por
	// vez. Ver `quienesDeciden`.
	for (const rol of quienesDeciden(estado)) {
		if (!decisiones.some((d) => d.rol === rol)) {
			throw new Error(`Falta la decisión de: ${rol}`);
		}
	}

	const log: EntradaLog[] = [];
	let siguiente: Estado = estructurar(estado);

	/*
	 * Lo que salió de la mesa de renovación, si la hubo.
	 *
	 * `null` significa que no se sentaron —no vencía el contrato— y que el cierre
	 * decide como decidía siempre. Con un valor, el cierre respeta lo que pasó en
	 * la mesa en vez de resolverlo solo: eso es lo que hacía que elegir quedarse
	 * no significara nada. Ver `momentos.ts`.
	 */
	let renovacionConseguida: boolean | null = null;
	let quisieronRenovar = true;
	/** Con qué la consiguió: pedir una mejora no es lo mismo que aceptar lo que haya. */
	let comoRenovo = '';

	/*
	 * En el mercado juega uno por vez, así que del otro puede no venir nada.
	 *
	 * Un vacío en vez de un `!`: pedirle a `find` que encuentre algo que la
	 * barrera no exigió es un `undefined` esperando a explotar dos pantallas
	 * más abajo. Lo que no vino se lee como "no eligió nada", que es
	 * exactamente lo que pasó.
	 */
	const vacia = (rol: Rol): Decision => ({ rol, nota: '' });
	const delFutbolista = decisiones.find((d) => d.rol === 'futbolista') ?? vacia('futbolista');
	const delRepresentante =
		decisiones.find((d) => d.rol === 'representante') ?? vacia('representante');

	// Las notas son privadas mientras la fase está abierta y se revelan a los dos
	// al cerrarla.
	for (const rol of ROLES) {
		const nota = (decisiones.find((d) => d.rol === rol)?.nota ?? '').trim();
		if (nota.length > 0) {
			log.push({ tipo: 'nota', visiblePara: 'ambos', texto: `${etiqueta(rol)}: ${nota}` });
		}
	}

	// --- La mesa -------------------------------------------------------------
	// Si el contrato entre los dos venció, la pretemporada arranca sentándose a
	// hablar. Se resuelve antes que nada porque cambia lo que el representante
	// cobra el resto del año.
	if (estado.fase === 1 && tocaRenegociar(estado)) {
		const negociacion = resolverNegociacion(siguiente, delFutbolista.trato, delRepresentante.trato);
		siguiente.contratoRepresentacion = negociacion.contrato;
		if (!negociacion.hubo) {
			siguiente.confianza = acotar(siguiente.confianza - 6, 0, 100);
		}
		for (const linea of negociacion.lineas) {
			log.push({ tipo: 'representacion', visiblePara: linea.visiblePara, texto: linea.texto });
		}
	}

	// --- La mesa con el club -------------------------------------------------
	// Cuando el contrato con el club está por vencer, la pretemporada arranca
	// también con esa conversación. Va después de la mesa entre ellos dos, a
	// propósito: el porcentaje que el representante acaba de firmar es lo que
	// cobra por esta renovación.
	if (estado.fase === 1 && tocaRenovar(siguiente)) {
		resolverRenovacion(
			siguiente,
			semilla,
			delFutbolista.renovacion,
			delRepresentante.renovacion,
			log
		);
	}

	// --- Qué clase de jugador es ---------------------------------------------
	// Va primero de todo en la primera pretemporada: lo que se elige acá le sube
	// un atributo, y todo lo que viene después de esta fase tiene que verlo ya
	// aplicado.
	if (estado.fase === 1 && tocaElegirRasgo(siguiente)) {
		const elegido = elegirRasgo(siguiente, semilla, delFutbolista.rasgo);
		if (elegido) log.push({ tipo: 'rasgo', visiblePara: 'ambos', texto: elegido });
	}

	// --- Para qué está jugando cada uno --------------------------------------
	// También en la primera pretemporada, y también una sola vez. No cambia nada
	// del año que empieza: cambia qué se está mirando durante los quince que
	// vienen. Se anuncia a los dos, porque saber para dónde tira el otro es la
	// mitad de lo que hace que las charlas del mercado tengan filo.
	if (estado.fase === 1) {
		for (const [rol, decision] of [
			['futbolista', delFutbolista],
			['representante', delRepresentante]
		] as const) {
			const eligio = elegirSueno(siguiente, rol, decision.sueno);
			if (eligio) {
				log.push({
					tipo: 'sueno',
					visiblePara: 'ambos',
					texto: `${etiqueta(rol)} juega por una sola cosa. ${eligio}`
				});
			}
		}
	}

	// --- En qué gastan la plata ----------------------------------------------
	// Cada uno la suya, sin pedirle permiso al otro: es lo único del juego que se
	// decide solo. Va en la pretemporada porque es cuando se arma el año.
	if (estado.fase === 1) {
		for (const [rol, decision] of [
			['futbolista', delFutbolista],
			['representante', delRepresentante]
		] as const) {
			// Varias en el mismo año, en el orden en que las eligió. Cada una se
			// cobra al comprarse, así que si la plata alcanza para dos y no para
			// tres, entran las dos primeras: el que elige el orden es él.
			const quiere = decision.inversiones ?? (decision.inversion ? [decision.inversion] : []);
			for (const id of quiere) {
				const compro = comprar(siguiente, rol, id);
				if (compro) log.push({ tipo: 'inversion', visiblePara: rol, texto: compro });
			}
		}
	}

	if (estado.fase === 1) {
		// --- Cómo va a jugar el año --------------------------------------------
		// Se elige acá y se cobra en la fase 2. Un plan de juego se decide antes de
		// que arranque el campeonato, no con el campeonato empezado.
		siguiente.objetivoDelAnio = objetivoValido(delFutbolista.objetivo);

		// --- Pretemporada ------------------------------------------------------
		const resultado = entrenar(
			siguiente,
			delFutbolista.entrenamiento ?? PLAN_POR_DEFECTO,
			(delFutbolista.intensidad as Intensidad) ?? INTENSIDAD_POR_DEFECTO,
			semilla
		);
		log.push({ tipo: 'entrenamiento', visiblePara: 'ambos', texto: resultado.texto });
	} else if (estado.fase === 2) {
		// --- ¿Se quiere ir? ----------------------------------------------------
		// Va antes de jugar el año, a propósito: el golpe con el técnico se cobra
		// en los minutos de esta misma temporada, no en la que viene. Pedir salir
		// tiene que costar algo que se sienta ya.
		const pidio = pedirLaSalida(siguiente, delFutbolista.pedirSalida);
		if (pidio) log.push({ tipo: 'salida', visiblePara: 'ambos', texto: pidio });

		// --- La temporada ------------------------------------------------------
		// Primero se resuelve la rueda de ocasión, después se juega el año con lo
		// que esa rueda dejó en la moral y en la relación con el técnico.
		const ocasiones = ocasionesDe(siguiente, semilla);
		const elegidas = delFutbolista.ocasiones ?? [];
		const resultados = ocasiones.map((ocasion, i) =>
			resolverOcasion(ocasion, elegidas[i], siguiente, semilla, i)
		);

		// --- Los momentos del representante ------------------------------------
		// Van antes de jugar el año, igual que los del futbolista: lo que se decide
		// acá —la confianza, la prensa, la moral— entra en cómo se juega la
		// temporada, no después de que ya se jugó.
		const momentos = momentosDelRepresentante(siguiente, semilla);
		const suyas = delRepresentante.momentos ?? [];
		momentos.forEach((momento, i) => {
			const cual = resolverMomento(momento, suyas[i], siguiente, semilla, i);
			aplicarMomento(siguiente, cual.efecto);
			if (cual.texto) {
				// Lo ve él y nada más. Que al futbolista lo estén tanteando por atrás,
				// o que su representante haya pagado para que una foto no salga, es
				// exactamente la clase de cosa que uno de los dos sabe y el otro no.
				log.push({ tipo: 'momento', visiblePara: 'representante', texto: cual.texto });
			}
		});

		const temporada = jugarTemporada(siguiente, resultados, semilla, siguiente.objetivoDelAnio);
		siguiente.ultimaTemporada = temporada.resumen;

		for (const jugada of temporada.jugadas) {
			log.push({ tipo: jugada.tipo, visiblePara: 'ambos', texto: jugada.texto });
		}

		// --- Lo que pasó fuera de la cancha ------------------------------------
		// Se sortea después de jugar, con el año ya cerrado: los eventos miran el
		// estado real —el desgaste que quedó, la relación con el técnico— y no una
		// foto de antes de empezar.
		for (const evento of eventosDeLaTemporada(siguiente, semilla)) {
			aplicarEvento(siguiente, evento.efectos);
			log.push({ tipo: 'evento', visiblePara: evento.visiblePara, texto: evento.texto });
		}
		log.push({
			tipo: 'temporada_jugada',
			visiblePara: 'ambos',
			texto: resumirTemporada(temporada.resumen, siguiente)
		});
	}

	/*
	 * --- El mercado, primer tiempo: el representante --------------------------
	 *
	 * Acá trabaja él solo. Juega sus momentos —incluida la mesa de renovación,
	 * que define si hay contrato— y después deja pasar hasta tres de los seis
	 * clubes que le llegaron. Cada uno se juega su probabilidad por separado.
	 *
	 * Todo esto pasa antes de que el futbolista vea nada, y termina sin cerrar
	 * la temporada: lo que queda escrito en `siguiente.mercado` es lo que el
	 * futbolista va a encontrar cuando le toque.
	 */
	if (estado.fase === 3 && pasoDelMercado(estado) === 'filtro') {
		const delOtro = momentosDelRepresentante(siguiente, semilla);
		const suyos = delRepresentante.momentos ?? [];
		for (const [i, momento] of delOtro.entries()) {
			const cual = resolverMomento(momento, suyos[i], siguiente, semilla, i);
			aplicarMomento(siguiente, cual.efecto);
			if (cual.texto) {
				log.push({ tipo: 'mercado_momento', visiblePara: 'representante', texto: cual.texto });
			}
			// La mesa de renovación no es un momento más: define si hay contrato.
			// Se guarda para que el cierre no vuelva a decidirlo por su cuenta.
			if (momento.id === RENOVACION) {
				renovacionConseguida = cual.salio && cual.opcionId !== 'no-renovar';
				quisieronRenovar = cual.opcionId !== 'no-renovar';
				comoRenovo = cual.opcionId;
			}
		}

		const filtrado = filtrar(siguiente, delRepresentante.filtradas ?? [], semilla);
		siguiente.mercado = {
			paso: 'eleccion',
			llegaron: filtrado.llegaron,
			seCayeron: filtrado.seCayeron,
			renovacion: {
				conseguida: renovacionConseguida,
				quisieron: quisieronRenovar,
				como: comoRenovo
			}
		};

		for (const linea of contarElFiltro(filtrado)) {
			log.push({ tipo: 'mercado', visiblePara: linea.visiblePara, texto: linea.texto });
		}

		// Y hasta acá llega el primer tiempo. La fase sigue siendo la 3: lo que
		// cambió es de quién es el turno.
		anotarElTope(siguiente);
		return { estado: siguiente, log };
	}

	/*
	 * --- El mercado, segundo tiempo: el futbolista ----------------------------
	 *
	 * Sus momentos del mercado van acá y no en el primer tiempo, para que tenga
	 * algo suyo que jugar cuando por fin le toca. Y van antes de que se resuelva
	 * el pase, a propósito: lo que pasa acá cae sobre la relación con el
	 * técnico, con la gente y con el otro, que es exactamente lo que después
	 * pesa en cómo se cierra el año.
	 */
	if (estado.fase === 3) {
		const suyas = ocasionesDe(siguiente, semilla);
		const elegidas = delFutbolista.ocasiones ?? [];
		for (const [i, ocasion] of suyas.entries()) {
			const cual = resolverOcasion(ocasion, elegidas[i], siguiente, semilla, i);
			aplicarEfecto(siguiente, cual.efecto);
			if (cual.texto) {
				log.push({ tipo: 'mercado_momento', visiblePara: 'futbolista', texto: cual.texto });
			}
		}

		// Lo que salió de la mesa en el primer tiempo manda sobre lo que el
		// cierre decidiría por su cuenta.
		const mesa = estado.mercado?.renovacion;
		if (mesa) {
			renovacionConseguida = mesa.conseguida;
			quisieronRenovar = mesa.quisieron;
			comoRenovo = mesa.como;
		}
	}

	/*
	 * La gestión del representante, una por año.
	 *
	 * Se elige en la pretemporada y vale para toda la temporada. Antes se elegía
	 * dos veces —en la fase 1 y otra vez en la fase 2— y Alan lo marcó con todas
	 * las letras: "dejarlo solo en la pretemporada y que aplique a toda la
	 * temporada". Tenía razón por lo que produce: elegir dos veces por año lo
	 * mismo lo convertía en un trámite, y encima competía con los momentos, que
	 * es lo que de verdad tiene para hacer durante la temporada.
	 */
	if (estado.fase === 1) {
		for (const linea of resolverGestion(siguiente, delRepresentante.gestion, semilla)) {
			log.push({ tipo: 'gestion', visiblePara: linea.visiblePara, texto: linea.texto });
		}
	}

	log.push({
		tipo: 'fase_cerrada',
		visiblePara: 'ambos',
		texto: `Cerró ${NOMBRE_FASE[estado.fase]} de la temporada ${estado.temporada}.`
	});

	if (estado.fase === 3) {
		siguiente = cerrarTemporada(siguiente, semilla, log, {
			futbolista: delFutbolista.destino,
			// Solo puede ir a donde el representante lo dejó llegar. Ver `cartas.ts`.
			llegaron: estado.mercado?.llegaron ?? [],
			renovacionConseguida,
			quisieronRenovar,
			comoRenovo
		});
		// El mercado del año que viene arranca de cero, por el primer tiempo.
		delete siguiente.mercado;
	} else {
		siguiente.fase = faseSiguiente(estado.fase);
	}

	// La marca más alta de cada sueño se anota al cerrar cualquier fase, no sólo
	// al cerrar el año: ver `anotarElTope`.
	anotarElTope(siguiente);

	return { estado: siguiente, log };
}

/**
 * Lo que se cuenta del filtro, y a quién.
 *
 * Al representante se le dice todo: cuáles pasaron y cuáles se le cayeron, con
 * nombre y apellido. Es su trabajo y tiene que poder mirarlo.
 *
 * Al futbolista se le dice cuántas llegaron y nada más. No se entera de cuáles
 * se cayeron ni de que hubo seis: sabe que su representante estuvo trabajando y
 * ve el resultado, igual que en la vida. Si viera la lista completa, el filtro
 * dejaría de ser una decisión del otro y pasaría a ser una excusa.
 */
function contarElFiltro(filtrado: Filtrado): { visiblePara: VisiblePara; texto: string }[] {
	const lineas: { visiblePara: VisiblePara; texto: string }[] = [];
	const pasaron = filtrado.llegaron.length;
	const cayeron = filtrado.seCayeron.length;

	if (pasaron + cayeron === 0) {
		lineas.push({
			visiblePara: 'representante',
			texto: 'No moviste ninguna. El mercado pasó y no lo llamaste a nadie.'
		});
		lineas.push({
			visiblePara: 'futbolista',
			texto: 'Tu representante no te trajo nada. Vas a tener que arreglarte con lo que hay.'
		});
		return lineas;
	}

	const nombres = (ids: string[]) => ids.map((id) => club(id).nombre).join(', ');

	if (pasaron > 0) {
		lineas.push({
			visiblePara: 'representante',
			texto: `Te prosperaron ${pasaron} de ${pasaron + cayeron}: ${nombres(filtrado.llegaron)}.`
		});
	}
	if (cayeron > 0) {
		lineas.push({
			visiblePara: 'representante',
			texto: `Se te cayeron ${cayeron}: ${nombres(filtrado.seCayeron)}. No dieron el sí.`
		});
	}

	lineas.push({
		visiblePara: 'futbolista',
		texto:
			pasaron === 0
				? 'Tu representante se movió y no cerró ninguna. No hay ofertas sobre la mesa.'
				: `Tu representante te consiguió ${pasaron} ${pasaron === 1 ? 'oferta' : 'ofertas'}.`
	});

	return lineas;
}

/**
 * La renovación mínima que el club acepta cuando el representante la consiguió.
 *
 * Un año y el sueldo que ya tenía, o algo más si la mesa se ganó pidiendo una
 * mejora. No es un premio: es el piso de que la negociación haya servido de
 * algo. Al que el club no quería por su cuenta, el representante le consiguió
 * seguir, y eso es exactamente lo que su trabajo debería poder hacer.
 */
function loJusto(estado: Estado, comoRenovo: string): OfertaDeRenovacion {
	const f = estado.futbolista;
	const cuanto = comoRenovo === 'pedir-mas' ? 1.12 : 1;
	const salarioMensual = Math.round((f.contrato.salarioMensual * cuanto) / 100) * 100;
	return {
		salarioMensual,
		temporadas: f.edad >= 33 ? 1 : 2,
		comisionUsd: Math.round(
			(salarioMensual * 12 * estado.contratoRepresentacion.pctSalario) / 100 / 4
		),
		mejora: Math.round((cuanto - 1) * 100)
	};
}

/** La línea que resume el año en el diario. */
function resumirTemporada(resumen: ResumenTemporada, estado: Estado): string {
	const partes = [
		`${resumen.partidos} partidos`,
		`${resumen.goles} ${resumen.goles === 1 ? 'gol' : 'goles'}`,
		`${resumen.asistencias} ${resumen.asistencias === 1 ? 'asistencia' : 'asistencias'}`
	];
	return (
		`${estado.futbolista.nombre} cerró la temporada ${resumen.temporada} con ` +
		`${partes.join(', ')}. ${club(resumen.clubId).nombre} terminó ${resumen.puesto}º ` +
		`de ${resumen.equipos}. Nota del año: ${resumen.nota.toFixed(1)}.`
	);
}

/**
 * Cierre de temporada: pasa un año para todos.
 *
 * En M0 esto es lo mínimo que hace falta para que la partida avance de verdad:
 * envejecer, desgastar, cobrar y recalcular la forma. La progresión de
 * atributos, los eventos y la economía completa llegan en M1 y M3.
 */
function cerrarTemporada(
	estado: Estado,
	semilla: string,
	log: EntradaLog[],
	destinos: {
		futbolista?: string;
		/** A qué clubes lo dejó llegar el representante. Ver `cartas.ts`. */
		llegaron?: readonly string[];
		/** Qué salió de la mesa de renovación. `null` si no la hubo. */
		renovacionConseguida?: boolean | null;
		/** Si en la mesa eligieron intentar renovar o salir al mercado. */
		quisieronRenovar?: boolean;
		/** Con qué opción la consiguió: pedir mejora o aceptar lo que haya. */
		comoRenovo?: string;
	} = {}
): Estado {
	const rng = rngPara(semilla, {
		temporada: estado.temporada,
		fase: 3,
		clave: 'cierre-temporada'
	});

	const { futbolista, representante } = estado;

	// --- Plata ---------------------------------------------------------------
	const salarioAnual = futbolista.contrato.salarioMensual * 12;
	futbolista.dineroUsd += salarioAnual;

	// El representante cobra su fijo (atado al prestigio) más el porcentaje del
	// salario que tenga negociado. Fórmulas de diseno-tecnico.md § 2.2.
	const fijoAnual = 4_000 + 600 * representante.prestigio;
	const comisionSalario = Math.round(
		(salarioAnual * estado.contratoRepresentacion.pctSalario) / 100
	);
	// Y lo que deja la cartera: cada representado extra factura todos los años.
	// Ver `cartera.ts`, que es donde vive la otra mitad —lo que cuesta en tiempo—.
	const deLaCartera = loQueDejaLaCarteraAlAnio(estado);
	representante.dineroUsd += fijoAnual + comisionSalario + deLaCartera;

	const subeElPrestigio = loQueSumaLaCarteraAlAnio(estado);
	if (subeElPrestigio > 0) {
		representante.prestigio = Math.max(0, Math.min(100, representante.prestigio + subeElPrestigio));
	}

	log.push({
		tipo: 'ingresos',
		visiblePara: 'futbolista',
		texto: `Cobraste USD ${salarioAnual.toLocaleString('es-AR')} de salario en la temporada.`
	});
	log.push({
		tipo: 'ingresos',
		visiblePara: 'representante',
		texto:
			`Ingresos de la temporada: USD ${fijoAnual.toLocaleString('es-AR')} de fijo ` +
			`y USD ${comisionSalario.toLocaleString('es-AR')} de comisión sobre el salario.` +
			(deLaCartera > 0
				? ` Y USD ${deLaCartera.toLocaleString('es-AR')} de los otros ${representante.representadosExtra} que representás.`
				: '')
	});

	// --- La selección --------------------------------------------------------
	// Antes del mercado a propósito: un Mundial cambia lo que valés, y los clubes
	// compran justo después de verte jugarlo.
	const novedad = jugarConLaSeleccion(estado, semilla);
	if (novedad) {
		aplicarSeleccion(estado, novedad);
		log.push({ tipo: 'seleccion', visiblePara: 'ambos', texto: novedad.texto });
	}

	// --- El mercado ----------------------------------------------------------
	// El club donde jugó el año, antes de que el mercado lo pueda mover: es el
	// que va al historial, porque los goles los hizo con esa camiseta.
	const clubDondeJugo = futbolista.contrato.clubId;

	// Los contratos corren un año antes del mercado, no después: la temporada que
	// se acaba de jugar ya se consumió. Con esto, el que decide no renovar juega
	// su último año y llega libre a este mismo mercado. Es la misma cuenta que
	// hace la pantalla, así que las ofertas que se ven son las que se firman.
	const enElMercado = comoLlegaAlMercado(estado);
	futbolista.contrato.temporadasRestantes = enElMercado.futbolista.contrato.temporadasRestantes;
	estado.contratoRepresentacion.duracionTemporadas =
		enElMercado.contratoRepresentacion.duracionTemporadas;

	// Se resuelve después de cobrar el año, porque el sueldo que se cobró es el
	// del club donde se jugó. Y se resuelve solo con lo que eligió el
	// futbolista: el representante ya tuvo su parte, y la tuvo antes, decidiendo
	// cuáles de estas ofertas iban a existir. Ver `cartas.ts`.
	const ofertas = ofertasPara(estado, semilla);
	const alcance = destinos.llegaron ?? ofertas.map((o) => o.clubId);
	resolverPase(
		estado,
		ofertas.filter((o) => alcance.includes(o.clubId)),
		destinos.futbolista,
		log
	);

	// --- El que quedó sin contrato -------------------------------------------
	// Si se le terminó el contrato y no hubo pase, el club no lo renueva solo:
	// hay que conseguir equipo. Sin esto, quedar libre no tenía consecuencia
	// —seguía jugando en el mismo lugar por el mismo sueldo para siempre— y la
	// apuesta de no renovar era gratis.
	if (
		futbolista.contrato.clubId === clubDondeJugo &&
		futbolista.contrato.temporadasRestantes === 0
	) {
		buscarEquipo(estado, semilla, ofertas, log, {
			renovacionConseguida: destinos.renovacionConseguida ?? null,
			quisieronRenovar: destinos.quisieronRenovar ?? true,
			comoRenovo: destinos.comoRenovo ?? ''
		});
	}

	// --- Lo que cuesta mantener lo que tienen --------------------------------
	// Después de cobrar y antes de la foto del año: la plata del año ya entró, y
	// lo que no se puede sostener se pierde acá.
	for (const linea of cobrarMantenimiento(estado)) {
		log.push({ tipo: 'inversion', visiblePara: linea.visiblePara, texto: linea.texto });
	}

	// --- El otro pibe de la camada -------------------------------------------
	// Después de la foto del año no: antes, para que el diario pueda comparar el
	// año de los dos en la misma tapa.
	correrleElAnio(estado, semilla);

	// Lo que vale, al día. Es el número que los dos miran para decidir, así que
	// no puede quedar viejo de un año para otro.
	futbolista.valorMercadoUsd = valorDeMercado(estado);

	// --- La foto del año -----------------------------------------------------
	// Se anota acá, con la temporada jugada, la selección resuelta y el pase ya
	// hecho, pero antes de que el cuerpo envejezca: la media que se guarda es la
	// que tuvo ese año, no la que le queda para el siguiente.
	anotarEnElHistorial(estado, clubDondeJugo, novedad?.mundial ?? null);

	/*
	 * --- Y si el año le movió el techo ---------------------------------------
	 *
	 * Va acá, con la fila del año recién escrita, porque lo que empuja el techo
	 * es exactamente lo que dice esa fila: el Mundial que jugó, la nota que
	 * sacó, el título que ganó jugando. Ver `techo.ts`.
	 */
	const elAnio = estado.historial[estado.historial.length - 1];
	if (elAnio) {
		const empujones = loQueEmpujaElTecho(estado, elAnio);
		if (empujarElTecho(estado, elAnio) > 0) {
			const linea = loQueSeCuenta(empujones, estado.futbolista.nombre);
			if (linea) log.push({ tipo: 'techo', visiblePara: linea.visiblePara, texto: linea.texto });
		}
	}

	// --- ¿Alguno llegó? ------------------------------------------------------
	// Lo último de la temporada, con todo ya contado: los goles del año, el
	// Mundial, el pase, la plata y la fila del historial recién escrita. Si uno
	// de los dos tocó su número, se dice acá y una sola vez en toda la partida.
	for (const cumplido of revisarSuenos(estado)) {
		log.push({ tipo: 'sueno_cumplido', visiblePara: 'ambos', texto: cumplido.texto });
	}

	// El pedido de salida valía para este mercado. Cerrado el año, se apaga: si
	// se quedó y el año que viene se quiere ir igual, lo vuelve a pedir.
	estado.pidioLaSalida = false;

	// --- El cuerpo -----------------------------------------------------------
	futbolista.edad += 1;
	const desgasteExtra = rng.entero(0, 1) + Math.max(0, futbolista.edad - 30);
	futbolista.desgaste = Math.min(100, futbolista.desgaste + desgasteExtra);
	futbolista.forma = acotar(rng.entero(45, 70) - Math.floor(futbolista.desgaste / 10), 1, 100);

	// --- Lo que se va con la edad --------------------------------------------
	// Después de los 30 el cuerpo devuelve menos de lo que se le pide. Primero
	// se va la velocidad, después la potencia, y al final la resistencia. El
	// pase y el liderazgo no se van nunca: por eso los veteranos se retrasan de
	// puesto en vez de retirarse.
	if (futbolista.edad >= 30) {
		const caida = 1 + Math.floor((futbolista.edad - 30) / 2);
		futbolista.atributos.velocidad = acotar(futbolista.atributos.velocidad - caida, 1, 99);
		futbolista.atributos.potencia = acotar(
			futbolista.atributos.potencia - Math.max(0, caida - 1),
			1,
			99
		);
		if (futbolista.edad >= 33) {
			futbolista.atributos.resistencia = acotar(futbolista.atributos.resistencia - 1, 1, 99);
		}
		futbolista.atributos.liderazgo = acotar(futbolista.atributos.liderazgo + 1, 1, 99);
	}

	// --- La relación ---------------------------------------------------------
	// Deriva natural: si nadie la trabaja, se enfría sola. Lo que la sostiene es
	// que el representante elija estar, y eso le cuesta las gestiones que sí dan
	// plata. Ésa es la decisión del juego.
	estado.confianza = acotar(estado.confianza - 5, 0, 100);

	// El contrato de representación vence junto con el del club (los dos corren
	// arriba, antes del mercado). Cuando llega a cero, la pretemporada siguiente
	// es la de sentarse a hablar.
	if (futbolista.contrato.temporadasRestantes === 1) {
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto: `Le queda una temporada de contrato con ${club(futbolista.contrato.clubId).nombre}.`
		});
	}

	// --- El mundo sigue sin vos ----------------------------------------------
	// Los técnicos y los jugadores reales se mueven, se retiran y cambian de
	// club. Es lo que hace que la foto de nombres con la que arranca la partida
	// no quede vieja: a las tres temporadas el mundo ya es de esta partida.
	const mercado = simularMercado(
		estado.cambiosMundo ?? MUNDO_SIN_CAMBIOS,
		semilla,
		estado.temporada,
		estado.anio
	);
	estado.cambiosMundo = mercado.cambios;
	// Se guardan enteras además de escribirlas en el diario: la pantalla las
	// dibuja con los escudos de los dos clubes, y para eso hace falta saber de
	// dónde a dónde y no solo la frase.
	const novedades = titulares(mercado.movimientos, 4);
	estado.novedades = novedades.map((m) => ({
		tipo: m.tipo,
		nombre: m.nombre,
		desde: m.desde,
		hacia: m.hacia,
		texto: m.texto
	}));
	for (const movimiento of novedades) {
		log.push({ tipo: 'mercado', visiblePara: 'ambos', texto: movimiento.texto });
	}

	// --- ¿Sigue jugando? -----------------------------------------------------
	// La regla completa de retiro (incluida la de media baja dos temporadas
	// seguidas) llega en M5. Acá quedan los dos cortes duros para que la partida
	// no pueda seguir para siempre.
	estado.temporada += 1;
	estado.anio += 1;
	estado.fase = 1;

	if (futbolista.desgaste >= 98 || estado.temporada > TEMPORADAS_MAXIMAS) {
		estado.carreraTerminada = true;
		log.push({
			tipo: 'retiro',
			visiblePara: 'ambos',
			texto: `${futbolista.nombre} se retira a los ${futbolista.edad} años.`
		});
	}

	log.push({
		tipo: 'temporada_cerrada',
		visiblePara: 'ambos',
		texto:
			`Terminó la temporada ${estado.temporada - 1}. ${futbolista.nombre} cumple ` +
			`${futbolista.edad} y su media es ${media(futbolista.atributos, futbolista.posicion)}.`
	});

	return estado;
}

/**
 * El que se quedó sin contrato tiene que conseguir equipo.
 *
 * Se le acabó el contrato y no hubo pase: el club ya no le paga. De las ofertas
 * que hay sobre la mesa se queda con la que más lo va a hacer jugar, porque un
 * jugador libre no elige por plata, elige por seguir jugando.
 *
 * Y si no hay ninguna, ahí se termina. Es el final más duro del juego y el más
 * merecido: nadie lo quiere y no hay a dónde ir. Vale la pena que exista,
 * porque es lo que hace que dejar vencer un contrato sea una decisión de
 * verdad y no un trámite.
 */
function buscarEquipo(
	estado: Estado,
	semilla: string,
	ofertas: readonly Oferta[],
	log: EntradaLog[],
	mesa: {
		renovacionConseguida: boolean | null;
		quisieronRenovar: boolean;
		comoRenovo: string;
	} = { renovacionConseguida: null, quisieronRenovar: true, comoRenovo: '' }
): void {
	const f = estado.futbolista;
	const desde = club(f.contrato.clubId).nombre;

	/*
	 * Primero, el club donde está.
	 *
	 * Que se le termine el contrato no es que lo echen: si el club lo quiere —y
	 * lo quiere siempre que juegue— le renueva y no pasa nada. Sin esto, el que
	 * firmaba un año quedaba expulsado al terminarlo aunque las dos partes
	 * estuvieran contentas, y una carrera entera en un mismo club era imposible.
	 *
	 * Pero quién decide eso es la mesa, no esta función. Antes lo resolvía acá
	 * sola —`ofertaDeRenovacion` y listo— y esa era la raíz del bug que encontró
	 * Bebo: el jugador elegía quedarse, el diario le contestaba "se quedó, los
	 * dos estuvieron de acuerdo", y en la línea siguiente lo mandaba a otro club
	 * por no haber arreglado nada. Nadie había negociado nada porque no había
	 * dónde hacerlo.
	 *
	 * Con la mesa jugada, acá solo se ejecuta lo que salió de ahí:
	 *  - `false`  → la negociación se cayó, o eligieron no renovar. Al mercado.
	 *  - `true`   → hay acuerdo: se firma.
	 *  - `null`   → no hubo mesa. Se decide como antes.
	 */
	if (mesa.renovacionConseguida === false) {
		if (!mesa.quisieronRenovar) {
			log.push({
				tipo: 'contrato',
				visiblePara: 'ambos',
				texto:
					`Decidieron no renovar con ${desde} y salir al mercado sin contrato. Ahora hay que ` +
					`conseguir club.`
			});
		} else {
			log.push({
				tipo: 'contrato',
				visiblePara: 'ambos',
				texto: `En ${desde} no hubo acuerdo por la renovación. Hay que buscar club.`
			});
		}
	}

	/*
	 * Si la mesa salió bien, hay contrato. Sí o sí.
	 *
	 * `ofertaDeRenovacion` mira si el club lo quiere por su cuenta, y a alguien
	 * que no juega le dice que no. Pero si el representante ya consiguió la
	 * firma, decirle que no acá deja al diario contándose en contra otra vez:
	 * "firmaron la continuidad" y enseguida "hubo que firmar a las apuradas" en
	 * otro club. Cuando la mesa la ganó él, el club acepta —para eso se jugó—,
	 * aunque sea por poco y por un año.
	 */
	const sigue =
		mesa.renovacionConseguida === false
			? null
			: (ofertaDeRenovacion(estado, semilla) ??
				(mesa.renovacionConseguida === true ? loJusto(estado, mesa.comoRenovo) : null));
	if (sigue) {
		f.contrato.salarioMensual = sigue.salarioMensual;
		f.contrato.temporadasRestantes = sigue.temporadas;
		estado.representante.dineroUsd += sigue.comisionUsd;
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto:
				mesa.renovacionConseguida === true
					? `${estado.representante.nombre} cerró la renovación con ${desde}: ` +
						`${sigue.temporadas} ${sigue.temporadas === 1 ? 'temporada' : 'temporadas'} más, ` +
						`USD ${sigue.salarioMensual.toLocaleString('es-AR')} por mes.`
					: `Se le terminaba el contrato con ${desde} y lo renovaron sobre la hora por ` +
						`${sigue.temporadas} ${sigue.temporadas === 1 ? 'temporada' : 'temporadas'}.`
		});
		return;
	}

	/*
	 * De lo que haya sobre la mesa, la que más lo va a hacer jugar.
	 *
	 * El destino es el sensato —a nadie le sirve caer otra vez en un banco, y si
	 * cayera volvería a quedar libre el año siguiente y rebotaría toda la
	 * carrera—, pero las condiciones son las de firmar apurado: menos sueldo del
	 * que le habrían dado negociando, y el golpe de haber llegado hasta acá sin
	 * arreglar nada.
	 *
	 * Ahí está la diferencia con elegir: el que decide se lleva el contrato
	 * entero, el que no decide se lleva el mismo club por menos plata. Si el
	 * motor firmara los mismos términos, no decidir rendiría igual que decidir y
	 * el juego dejaría de tener sentido.
	 */
	const apurado = [...ofertas].sort((a, b) => b.brecha - a.brecha)[0];
	if (apurado) {
		estado.confianza = acotar(estado.confianza - 5, 0, 100);
		f.moral = acotar(f.moral - 8, 0, 100);
		// Y el costo que de verdad se siente: llega tarde, con la pretemporada
		// empezada y como el que nadie quería. El técnico lo hace esperar, y
		// esperar es menos minutos, menos goles y menos crecimiento.
		//
		// El descuento del sueldo solo no alcanzaba: el puntaje del futbolista no
		// mira la plata, así que resignar plata no le costaba nada y no decidir
		// terminaba rindiendo lo mismo que decidir.
		f.dt = acotar(f.dt - 18, -100, 100);
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			// Si la mesa ya se jugó, ya se contó por qué no hay contrato: repetir
			// "sin que arreglaran nada" contradice la charla que acaba de pasar.
			texto:
				mesa.renovacionConseguida === null
					? `Se le terminó el contrato con ${desde} sin que arreglaran nada, y hubo que firmar a ` +
						`las apuradas. Firmar apurado siempre sale más barato para el que firma del otro lado.`
					: `Sin contrato y con el mercado abierto, hubo que firmar a las apuradas. Firmar ` +
						`apurado siempre sale más barato para el que firma del otro lado.`
		});
		aplicarPase(
			estado,
			{
				...apurado,
				salarioMensual: Math.round((apurado.salarioMensual * DESCUENTO_POR_APURO) / 100) * 100,
				primaUsd: 0,
				comisionUsd: 0
			},
			log
		);
		return;
	}

	// Y si no llegó ninguna, se busca abajo. A los veinte sin contrato se juega
	// en el Ascenso; no se deja de jugar.
	const refugio = clubDeUltimoRecurso(estado);
	if (refugio) {
		const terminos = contratoDeUltimoRecurso(estado, refugio);
		aplicarPase(
			estado,
			{
				clubId: refugio,
				montoUsd: 0,
				primaUsd: 0,
				salarioMensual: terminos.salarioMensual,
				temporadas: terminos.temporadas,
				comisionUsd: 0,
				brecha: Math.round(brechaCon(f, refugio)),
				tecnico: null
			},
			log
		);
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto:
				`Nadie lo llamó del nivel de ${desde}. Terminó firmando en ${club(refugio).nombre} por ` +
				`bastante menos, que es lo que hay cuando se llega libre y sin ofertas.`
		});
		return;
	}

	// Y si de verdad no hay ningún club en el mundo donde pueda jugar, se
	// terminó. Es el final más duro del juego y el más merecido.
	estado.carreraTerminada = true;
	log.push({
		tipo: 'retiro',
		visiblePara: 'ambos',
		texto:
			`Se le terminó el contrato con ${desde} y no apareció nadie. ${f.nombre} se quedó ` +
			`sin club a los ${f.edad} años, y así es como se termina la mayoría de las carreras.`
	});
}

/**
 * Anota la temporada que cerró en la línea de tiempo de la carrera.
 *
 * Una fila por año, siempre: también las que no jugó. Un hueco en el gráfico
 * dice tanto como un pico, y si se saltearan las temporadas en blanco la curva
 * mentiría sobre lo que costó llegar.
 */
function anotarEnElHistorial(
	estado: Estado,
	clubDondeJugo: string,
	mundial: Mundial | null | undefined
): void {
	const f = estado.futbolista;
	const t = estado.ultimaTemporada;

	estado.historial = estado.historial ?? [];
	estado.historial.push({
		temporada: estado.temporada,
		anio: estado.anio,
		edad: f.edad,
		clubId: clubDondeJugo,
		media: media(f.atributos, f.posicion),
		nota: t?.temporada === estado.temporada ? t.nota : 0,
		partidos: t?.temporada === estado.temporada ? t.partidos : 0,
		goles: t?.temporada === estado.temporada ? t.goles : 0,
		asistencias: t?.temporada === estado.temporada ? t.asistencias : 0,
		fama: f.fama,
		valorUsd: valorDeMercado(estado),
		campeon: t?.temporada === estado.temporada ? t.campeon : false,
		titulo:
			t?.temporada === estado.temporada &&
			t.campeon &&
			t.partidos >= PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO,
		lesionado: t?.temporada === estado.temporada ? t.lesionado : false,
		mundial: mundial?.resultado ?? null,
		seFue: f.contrato.clubId !== clubDondeJugo
	});
}

function etiqueta(rol: Rol): string {
	return rol === 'futbolista' ? 'El futbolista' : 'El representante';
}

function acotar(valor: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, valor));
}

/** Copia profunda del estado: el motor nunca muta lo que recibe. */
function estructurar(estado: Estado): Estado {
	return structuredClone(estado);
}
