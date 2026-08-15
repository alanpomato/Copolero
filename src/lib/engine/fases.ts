import { rngPara } from './rng';
import { media } from './estado';
import { simularMercado, titulares } from './mercado';
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
	type Rol
} from './tipos';

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

	// Las notas son privadas mientras la fase está abierta y se revelan a los dos
	// al cerrarla. En M0 son el único contenido; sirven para ver de punta a punta
	// que la barrera y la proyección por rol funcionan.
	for (const rol of ROLES) {
		const decision = decisiones.find((d) => d.rol === rol)!;
		const nota = decision.nota.trim();
		if (nota.length > 0) {
			log.push({
				tipo: 'nota',
				visiblePara: 'ambos',
				texto: `${etiqueta(rol)}: ${nota}`
			});
		}
	}

	log.push({
		tipo: 'fase_cerrada',
		visiblePara: 'ambos',
		texto: `Cerró ${NOMBRE_FASE[estado.fase]} de la temporada ${estado.temporada}.`
	});

	if (estado.fase === 3) {
		siguiente = cerrarTemporada(siguiente, semilla, log);
	} else {
		siguiente.fase = faseSiguiente(estado.fase);
	}

	return { estado: siguiente, log };
}

/**
 * Cierre de temporada: pasa un año para todos.
 *
 * En M0 esto es lo mínimo que hace falta para que la partida avance de verdad:
 * envejecer, desgastar, cobrar y recalcular la forma. La progresión de
 * atributos, los eventos y la economía completa llegan en M1 y M3.
 */
function cerrarTemporada(estado: Estado, semilla: string, log: EntradaLog[]): Estado {
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

	// --- El cuerpo -----------------------------------------------------------
	futbolista.edad += 1;
	const desgasteExtra = rng.entero(2, 5) + Math.max(0, futbolista.edad - 28);
	futbolista.desgaste = Math.min(100, futbolista.desgaste + desgasteExtra);
	futbolista.forma = acotar(rng.entero(45, 70) - Math.floor(futbolista.desgaste / 10), 1, 100);

	// --- La relación ---------------------------------------------------------
	// Deriva natural: si nadie la trabaja, se enfría sola. En M0 no hay todavía
	// acciones que la suban, así que baja siempre.
	estado.confianza = acotar(estado.confianza - 2, 0, 100);

	// --- El contrato ---------------------------------------------------------
	futbolista.contrato.temporadasRestantes = Math.max(
		0,
		futbolista.contrato.temporadasRestantes - 1
	);
	if (futbolista.contrato.temporadasRestantes === 0) {
		log.push({
			tipo: 'contrato',
			visiblePara: 'ambos',
			texto: `Se le vence el contrato con ${futbolista.contrato.club}.`
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
