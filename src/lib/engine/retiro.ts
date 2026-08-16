import { club, contexto } from '../../../content/mundo';
import type { Estado } from './tipos';

/**
 * El final.
 *
 * Toda la partida existe para llegar acá. Los dos puntajes no compiten: a los
 * dos les conviene que al futbolista le vaya bien. Pero puntúan por cosas
 * distintas, y ahí está el juego.
 *
 * El futbolista puntúa por legado: goles, títulos, minutos, y sobre todo por
 * haberse quedado. El multiplicador de permanencia es el que choca de frente
 * con la comisión por transferencia del representante, que cobra justamente
 * cuando se mueve. Ninguno de los dos puede maximizar lo suyo sin mirar al otro.
 *
 * Fórmulas de `docs/diseno-tecnico.md` § 7, ajustadas a lo que el estado
 * realmente lleva registrado.
 */

/** Temporadas en un club para que la hinchada te tenga como ídolo. */
const TEMPORADAS_PARA_SER_IDOLO = 4;

/**
 * Y hay que haber jugado.
 *
 * Estar diez años en un club sin entrar nunca no te hace ídolo de nadie: te
 * hace parte del plantel. El promedio de partidos por temporada es lo que
 * separa una cosa de la otra.
 */
const PARTIDOS_POR_TEMPORADA_PARA_SER_IDOLO = 15;

export type Desglose = { concepto: string; puntos: number };

export type PuntajeFinal = {
	total: number;
	desglose: Desglose[];
	/** Multiplicador de permanencia, ya aplicado al total. */
	multiplicador: number;
};

export type Idolatria = {
	clubId: string;
	temporadas: number;
};

/** En qué clubes quedó como ídolo: muchos años en la misma camiseta. */
export function clubesDondeEsIdolo(estado: Estado): Idolatria[] {
	const temporadas = Object.values(estado.temporadasPorClub ?? {}).reduce((a, b) => a + b, 0);
	const promedio = temporadas > 0 ? estado.futbolista.partidos / temporadas : 0;
	if (promedio < PARTIDOS_POR_TEMPORADA_PARA_SER_IDOLO) return [];

	return Object.entries(estado.temporadasPorClub ?? {})
		.filter(([, temporadas]) => temporadas >= TEMPORADAS_PARA_SER_IDOLO)
		.map(([clubId, temporadas]) => ({ clubId, temporadas }))
		.sort((a, b) => b.temporadas - a.temporadas);
}

/** La casa: el club donde jugó más temporadas. */
export function suClub(estado: Estado): Idolatria | null {
	const todos = Object.entries(estado.temporadasPorClub ?? {})
		.map(([clubId, temporadas]) => ({ clubId, temporadas }))
		.sort((a, b) => b.temporadas - a.temporadas);
	return todos[0] ?? null;
}

/**
 * Puntaje de Legado del futbolista.
 *
 * Los goles pesan por dónde se hicieron: uno en una liga fuerte vale más que
 * uno en el Ascenso, porque costó más.
 */
export function puntajeDelFutbolista(estado: Estado): PuntajeFinal {
	const f = estado.futbolista;
	const idolo = clubesDondeEsIdolo(estado);
	const casa = suClub(estado);

	// Los goles se ponderan por la liga donde terminó jugando: es una
	// aproximación, pero el estado no guarda gol por gol y la intención se
	// respeta igual.
	const fuerzaFinal = contexto(f.contrato.clubId).liga.fuerza;
	const pesoDeLosGoles = 0.6 + fuerzaFinal / 100;

	const desglose: Desglose[] = [
		{ concepto: `${f.goles} goles`, puntos: Math.round(10 * f.goles * pesoDeLosGoles) },
		{ concepto: `${f.asistencias} asistencias`, puntos: 6 * f.asistencias },
		{ concepto: `${f.titulos} títulos`, puntos: 150 * f.titulos },
		{ concepto: `${f.minutos.toLocaleString('es-AR')} minutos`, puntos: Math.round(0.05 * f.minutos) },
		{
			concepto: idolo.length === 1 ? 'Ídolo de un club' : `Ídolo de ${idolo.length} clubes`,
			puntos: 250 * idolo.length
		},
		{ concepto: `Fama final ${f.fama}`, puntos: 3 * f.fama }
	];

	if (estado.temporadasPerdidas > 0) {
		desglose.push({
			concepto: `${estado.temporadasPerdidas} temporadas perdidas`,
			puntos: -120 * estado.temporadasPerdidas
		});
	}

	const bruto = desglose.reduce((total, d) => total + d.puntos, 0);

	// Quedarse paga. Es lo que hace que aceptar todos los pases no sea gratis.
	const multiplicador = 1 + 0.05 * Math.max(0, (casa?.temporadas ?? 0) - 3);

	return {
		total: Math.max(0, Math.round(bruto * multiplicador)),
		desglose: desglose.filter((d) => d.puntos !== 0),
		multiplicador
	};
}

/** Puntaje de Carrera del representante. */
export function puntajeDelRepresentante(estado: Estado): PuntajeFinal {
	const r = estado.representante;
	const idolo = clubesDondeEsIdolo(estado);

	const desglose: Desglose[] = [
		{
			concepto: `USD ${r.dineroUsd.toLocaleString('es-AR')} ganados`,
			puntos: Math.round(0.001 * r.dineroUsd)
		},
		{ concepto: `Prestigio ${r.prestigio}`, puntos: 4 * r.prestigio },
		{
			concepto: 'Contactos',
			puntos: Math.round(
				0.15 * (r.atributos.contactos + r.atributos.negociacion + r.atributos.scouting)
			)
		},
		{ concepto: `Confianza final ${estado.confianza}`, puntos: 3 * estado.confianza }
	];

	if (idolo.length > 0) {
		desglose.push({ concepto: 'Su jugador se retiró siendo ídolo', puntos: 300 });
	}
	if (estado.confianza < 25) {
		desglose.push({ concepto: 'Terminaron mal', puntos: -500 });
	}

	return {
		total: Math.max(0, Math.round(desglose.reduce((t, d) => t + d.puntos, 0))),
		desglose: desglose.filter((d) => d.puntos !== 0),
		multiplicador: 1
	};
}

// ---------------------------------------------------------------------------
// A qué se parece
// ---------------------------------------------------------------------------

export type Rango = {
	titulo: string;
	texto: string;
};

/**
 * Dónde queda la carrera.
 *
 * Son referencias, no comparaciones exactas: sirven para que el número tenga
 * una escala que uno pueda sentir. Diez mil puntos no significan nada solos.
 */
const RANGOS: { desde: number; titulo: string; texto: string }[] = [
	{
		desde: 12000,
		titulo: 'De los que se cuentan',
		texto: 'Una carrera de las que quedan en la historia grande del fútbol.'
	},
	{
		desde: 7000,
		titulo: 'Ídolo',
		texto: 'De los que tienen la camiseta con su nombre en la tribuna.'
	},
	{
		desde: 4000,
		titulo: 'Figura',
		texto: 'Fue titular indiscutido y lo llamaban por el nombre en la cancha.'
	},
	{
		desde: 2000,
		titulo: 'Buen jugador',
		texto: 'Una carrera sólida, de las que se hacen jugando todos los domingos.'
	},
	{
		desde: 800,
		titulo: 'Profesional',
		texto: 'Vivió del fútbol, que es más de lo que consigue casi todo el mundo.'
	},
	{
		desde: 0,
		titulo: 'Lo intentó',
		texto: 'No alcanzó, y no es poca cosa haber llegado a intentarlo.'
	}
];

const RANGOS_REPRESENTANTE: { desde: number; titulo: string; texto: string }[] = [
	{
		desde: 3000,
		titulo: 'De los que mueven el mercado',
		texto: 'Te atienden el teléfono en cualquier club del mundo.'
	},
	{
		desde: 1500,
		titulo: 'Representante grande',
		texto: 'Armaste una agencia de verdad, y con un solo jugador.'
	},
	{
		desde: 700,
		titulo: 'Te ganaste el lugar',
		texto: 'Vivís de esto y te conocen. No es poco.'
	},
	{
		desde: 250,
		titulo: 'La peleaste',
		texto: 'Sacaste una carrera adelante sin que nadie te regalara nada.'
	},
	{ desde: 0, titulo: 'No salió', texto: 'No todas las carreras terminan bien. Ésta no salió.' }
];

export function rangoDelFutbolista(puntaje: number): Rango {
	return RANGOS.find((r) => puntaje >= r.desde) ?? RANGOS[RANGOS.length - 1];
}

export function rangoDelRepresentante(puntaje: number): Rango {
	return (
		RANGOS_REPRESENTANTE.find((r) => puntaje >= r.desde) ??
		RANGOS_REPRESENTANTE[RANGOS_REPRESENTANTE.length - 1]
	);
}

// ---------------------------------------------------------------------------
// El resumen que se muestra
// ---------------------------------------------------------------------------

export type Retiro = {
	futbolista: PuntajeFinal & { rango: Rango };
	representante: PuntajeFinal & { rango: Rango };
	/** Los clubes donde quedó como ídolo, con nombre listo para mostrar. */
	idolatria: { nombre: string; temporadas: number }[];
	/** Su casa: dónde jugó más años. */
	casa: { nombre: string; temporadas: number } | null;
	/** Una línea que cierra la carrera. */
	epitafio: string;
};

export function resumirRetiro(estado: Estado): Retiro {
	const pl = puntajeDelFutbolista(estado);
	const pc = puntajeDelRepresentante(estado);
	const casa = suClub(estado);
	const f = estado.futbolista;

	const idolatria = clubesDondeEsIdolo(estado).map((i) => ({
		nombre: club(i.clubId).nombre,
		temporadas: i.temporadas
	}));

	return {
		futbolista: { ...pl, rango: rangoDelFutbolista(pl.total) },
		representante: { ...pc, rango: rangoDelRepresentante(pc.total) },
		idolatria,
		casa: casa ? { nombre: club(casa.clubId).nombre, temporadas: casa.temporadas } : null,
		epitafio: epitafioDe(estado, idolatria.length > 0, casa?.temporadas ?? 0)
	};
}

function epitafioDe(estado: Estado, fueIdolo: boolean, anosEnCasa: number): string {
	const f = estado.futbolista;
	const donde = club(f.contrato.clubId).nombre;

	if (fueIdolo && anosEnCasa >= 8) {
		return `${f.nombre} se retiró a los ${f.edad} años donde lo querían. De esos quedan pocos.`;
	}
	if (estado.confianza >= 75) {
		return `${f.nombre} colgó los botines a los ${f.edad} en ${donde}, y ${estado.representante.nombre} estuvo hasta el último día.`;
	}
	if (estado.confianza < 25) {
		return `${f.nombre} se retiró a los ${f.edad} años. Hacía rato que no se hablaban.`;
	}
	return `${f.nombre} se retiró a los ${f.edad} años en ${donde}. Fueron ${estado.temporada - 1} temporadas.`;
}
