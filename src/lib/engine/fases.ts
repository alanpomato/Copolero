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
import { simularMercado, titulares } from './mercado';
import { ocasionesDe, resolverOcasion } from './ocasiones';
import { aplicarPase, ofertasPara, resolverPase, valorDeMercado, type Oferta } from './pases';
import { resolverNegociacion, tocaRenegociar } from './representacion';
import {
	clubDeUltimoRecurso,
	comoLlegaAlMercado,
	contratoDeUltimoRecurso,
	ofertaDeRenovacion,
	resolverRenovacion,
	tocaRenovar
} from './renovacion';
import { aplicarSeleccion, jugarConLaSeleccion, type Mundial } from './seleccion';
import { PARTIDOS_PARA_QUE_EL_TITULO_SEA_TUYO, brechaCon, jugarTemporada } from './temporada';
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
	type Rol
} from './tipos';

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

	const futbolista = cerraron.includes('futbolista');
	const representante = cerraron.includes('representante');

	if (futbolista && representante) return 'BOTH_READY';
	if (futbolista) return 'WAITING_FOR_AGENT';
	if (representante) return 'WAITING_FOR_PLAYER';
	return 'WAITING_FOR_BOTH';
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
 * Exige las decisiones de los dos roles. La barrera es responsabilidad de quien
 * llama (ver `src/lib/server/partidas.ts`), pero acá se vuelve a verificar para
 * que el motor no pueda quedar en un estado a medias.
 */
export function resolverFase(
	estado: Estado,
	decisiones: readonly Decision[],
	semilla: string
): ResultadoFase {
	if (estado.carreraTerminada) {
		throw new Error('La carrera ya terminó: no hay más fases para resolver');
	}
	for (const rol of ROLES) {
		if (!decisiones.some((d) => d.rol === rol)) {
			throw new Error(`Falta la decisión de: ${rol}`);
		}
	}

	const log: EntradaLog[] = [];
	let siguiente: Estado = estructurar(estado);

	const delFutbolista = decisiones.find((d) => d.rol === 'futbolista')!;
	const delRepresentante = decisiones.find((d) => d.rol === 'representante')!;

	// Las notas son privadas mientras la fase está abierta y se revelan a los dos
	// al cerrarla.
	for (const rol of ROLES) {
		const nota = decisiones.find((d) => d.rol === rol)!.nota.trim();
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

	if (estado.fase === 1) {
		// --- Pretemporada ------------------------------------------------------
		const resultado = entrenar(
			siguiente,
			delFutbolista.entrenamiento ?? PLAN_POR_DEFECTO,
			(delFutbolista.intensidad as Intensidad) ?? INTENSIDAD_POR_DEFECTO,
			semilla
		);
		log.push({ tipo: 'entrenamiento', visiblePara: 'ambos', texto: resultado.texto });
	} else if (estado.fase === 2) {
		// --- La temporada ------------------------------------------------------
		// Primero se resuelve la rueda de ocasión, después se juega el año con lo
		// que esa rueda dejó en la moral y en la relación con el técnico.
		const ocasiones = ocasionesDe(siguiente, semilla);
		const elegidas = delFutbolista.ocasiones ?? [];
		const resultados = ocasiones.map((ocasion, i) =>
			resolverOcasion(ocasion, elegidas[i], siguiente, semilla, i)
		);

		const temporada = jugarTemporada(siguiente, resultados, semilla, delFutbolista.objetivo);
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

	// El representante trabaja en las dos primeras fases. En la tercera manda el
	// mercado, que se resuelve solo.
	if (estado.fase === 1 || estado.fase === 2) {
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
			representante: delRepresentante.destino
		});
	} else {
		siguiente.fase = faseSiguiente(estado.fase);
	}

	return { estado: siguiente, log };
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
	destinos: { futbolista?: string; representante?: string } = {}
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
	representante.dineroUsd += fijoAnual + comisionSalario;

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
			`y USD ${comisionSalario.toLocaleString('es-AR')} de comisión sobre el salario.`
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
	// del club donde se jugó. El pase se hace solamente si los dos eligieron el
	// mismo club: es la única decisión del juego que necesita que se hayan
	// hablado antes de apretar el botón.
	const ofertas = ofertasPara(estado, semilla);
	resolverPase(estado, ofertas, destinos.futbolista, destinos.representante, log);

	// --- El que quedó sin contrato -------------------------------------------
	// Si se le terminó el contrato y no hubo pase, el club no lo renueva solo:
	// hay que conseguir equipo. Sin esto, quedar libre no tenía consecuencia
	// —seguía jugando en el mismo lugar por el mismo sueldo para siempre— y la
	// apuesta de no renovar era gratis.
	if (
		futbolista.contrato.clubId === clubDondeJugo &&
		futbolista.contrato.temporadasRestantes === 0
	) {
		buscarEquipo(estado, semilla, ofertas, log);
	}

	// --- La foto del año -----------------------------------------------------
	// Se anota acá, con la temporada jugada, la selección resuelta y el pase ya
	// hecho, pero antes de que el cuerpo envejezca: la media que se guarda es la
	// que tuvo ese año, no la que le queda para el siguiente.
	anotarEnElHistorial(estado, clubDondeJugo, novedad?.mundial ?? null);

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
	for (const movimiento of titulares(mercado.movimientos, 4)) {
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
	log: EntradaLog[]
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
	 */
	const sigue = ofertaDeRenovacion(estado, semilla);
	if (sigue) {
		f.contrato.salarioMensual = sigue.salarioMensual;
		f.contrato.temporadasRestantes = sigue.temporadas;
		estado.representante.dineroUsd += sigue.comisionUsd;
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto:
				`Se le terminaba el contrato con ${desde} y lo renovaron sobre la hora por ` +
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
			texto:
				`Se le terminó el contrato con ${desde} sin que arreglaran nada, y hubo que firmar a las ` +
				`apuradas. Firmar apurado siempre sale más barato para el que firma del otro lado.`
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
