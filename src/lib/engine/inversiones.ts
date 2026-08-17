import type { Estado, InversionComprada, Rol } from './tipos';

/**
 * En qué se gasta la plata.
 *
 * Hasta acá el dinero del futbolista era un número que subía y no servía para
 * nada: cobraba veinte años, juntaba millones y se retiraba con ellos sin haber
 * decidido nunca nada al respecto. El del representante al menos puntuaba al
 * final, pero tampoco se gastaba. Una economía donde no se puede comprar nada
 * no es una economía.
 *
 * Cada inversión se paga una vez y después cuesta todos los años. Ése es el
 * punto: no es una lista de mejoras para tildar todas, es una cuenta que hay
 * que poder sostener. El que se llena de gastos con el sueldo de un club chico
 * los pierde cuando el sueldo baja, que es exactamente lo que le pasa a la
 * gente.
 *
 * Nada de esto toca los números que decide el motor: cambian las condiciones,
 * no los resultados.
 */

export type Inversion = {
	id: string;
	de: Rol;
	nombre: string;
	detalle: string;
	/** Lo que hace, en una línea, para la tarjeta. */
	efecto: string;
	/**
	 * Qué tan cara es, de 1 a 5. No es un precio en dólares a propósito.
	 *
	 * Un futbolista cobra mil dólares por mes a los 16 y medio millón a los 28.
	 * Un precio fijo es imposible a los 16 y no se siente a los 28: medido, una
	 * carrera junta entre diez y cincuenta millones, así que cualquier número
	 * fijo que sirva de joven es calderilla después. El precio sale de lo que
	 * gana hoy, y así la decisión pesa igual a los dos extremos de la carrera.
	 */
	peso: number;
	/**
	 * Cuántas temporadas dura, si es un consumible.
	 *
	 * Las que no lo dicen son para siempre —el staff, la casa— y se pagan todos
	 * los años. Un consumible se paga una vez, dura lo que dura y se va solo. Es
	 * la compra del que tiene un año importante por delante y no quiere atarse a
	 * un gasto para el resto de la carrera.
	 */
	dura?: number;
	/** Si ya no tiene sentido comprarla. */
	sirveAun?: (estado: Estado) => boolean;
	/**
	 * Cómo se llama cuando se ata para siempre, si es un consumible.
	 *
	 * Un consumible se puede dejar de comprar todos los años y pasar a tenerlo
	 * fijo: en vez de un par de botines por temporada, un contrato con la marca.
	 * Cuesta más de entrada y se paga todos los años, pero no se termina nunca y
	 * no hay que acordarse. Es la misma decisión que existe en la vida: alquilar
	 * o atarse.
	 */
	fijo?: { nombre: string; detalle: string; efecto: string };
};

export const INVERSIONES: Inversion[] = [
	// --- Del futbolista ------------------------------------------------------
	{
		id: 'preparador',
		de: 'futbolista',
		nombre: 'Preparador físico propio',
		detalle: 'Uno que te conoce el cuerpo y te arma el año a vos, no al plantel.',
		efecto: 'El cuerpo aguanta más: −2 de desgaste por temporada',
		peso: 3
	},
	{
		id: 'nutricionista',
		de: 'futbolista',
		nombre: 'Nutricionista y cocinero',
		detalle: 'Comer como se debe todo el año, no solo en pretemporada.',
		efecto: 'Llegás mejor a cada temporada: +7 de forma',
		peso: 2
	},
	{
		id: 'psicologo',
		de: 'futbolista',
		nombre: 'Psicólogo deportivo',
		detalle: 'Alguien con quien hablar cuando el año viene mal. Sirve justo ahí.',
		efecto: 'La moral no se te cae abajo de 40',
		peso: 2
	},
	{
		id: 'analista',
		de: 'futbolista',
		nombre: 'Analista de video propio',
		detalle: 'Ver tus propios partidos con alguien que sepa qué mirar.',
		efecto: 'Aprovechás más cada temporada: crecés un 18% más rápido',
		peso: 4
	},
	{
		id: 'casa',
		de: 'futbolista',
		nombre: 'La casa de la familia',
		detalle: 'Sacarlos del barrio. Es lo primero que compra casi todo el mundo.',
		efecto: 'Se te va un peso de encima: +15 de moral y +2 todos los años',
		peso: 5
	},

	// --- Consumibles del futbolista ------------------------------------------
	{
		id: 'botines',
		de: 'futbolista',
		nombre: 'Botines nuevos',
		detalle: 'Un par hecho a tu pie para el año que viene. Se gastan y listo.',
		efecto: 'Una temporada: goles y asistencias +12%',
		peso: 2,
		dura: 1,
		fijo: {
			nombre: 'Contrato con la marca',
			detalle: 'Que te manden los botines hechos a tu pie todos los años, sin acordarte.',
			efecto: 'Todas las temporadas: goles y asistencias +12%'
		}
	},
	{
		id: 'fisio',
		de: 'futbolista',
		nombre: 'Fisio para toda la temporada',
		detalle: 'Uno solo para vos durante el año. Después vuelve al plantel.',
		efecto: 'Dos temporadas: mitad de riesgo de lesión',
		peso: 3,
		dura: 2,
		fijo: {
			nombre: 'Tu fisio, para siempre',
			detalle: 'Contratarlo vos. Deja el plantel y trabaja solo con tu cuerpo, todos los años.',
			efecto: 'Siempre: mitad de riesgo de lesión'
		}
	},
	{
		id: 'concentracion',
		de: 'futbolista',
		nombre: 'Irte a entrenar afuera',
		detalle: 'Un verano entero en un centro de alto rendimiento, lejos de todo.',
		efecto: 'Una temporada: crecés un 30% más rápido',
		peso: 4,
		dura: 1,
		fijo: {
			nombre: 'Tu propio centro de entrenamiento',
			detalle: 'Un lugar tuyo donde entrenar cada verano. Se sostiene todos los años.',
			efecto: 'Todas las temporadas: crecés un 30% más rápido'
		}
	},

	// --- Del representante ---------------------------------------------------
	{
		id: 'oficina',
		de: 'representante',
		nombre: 'Una oficina de verdad',
		detalle: 'Dejar de atender del celular en un bar. Cambia con quién te sentás.',
		efecto: '+8 de contactos, y +1 todas las temporadas',
		peso: 2
	},
	{
		id: 'abogado',
		de: 'representante',
		nombre: 'Un abogado propio',
		detalle: 'Los contratos los mira alguien que sabe, no vos a las tres de la mañana.',
		efecto: '+10 de negociación',
		peso: 3
	},
	{
		id: 'ojeadores',
		de: 'representante',
		nombre: 'Dos ojeadores',
		detalle: 'Gente tuya mirando inferiores mientras vos estás en otra cosa.',
		efecto: '+10 de scouting, y +1 todas las temporadas',
		peso: 3
	},
	{
		id: 'prensa-propia',
		de: 'representante',
		nombre: 'Alguien que le maneje la prensa',
		detalle: 'Que las notas salgan como tienen que salir.',
		efecto: 'La prensa del futbolista sube sola: +3 por temporada',
		peso: 2
	}
];

export const NADA = 'nada';

/**
 * Lo que cada rol gana en un año, que es contra lo que se miden los precios.
 *
 * Del futbolista es el sueldo, que es lo que cobra seguro. Del representante,
 * el fijo más lo que le deja el porcentaje del sueldo: las comisiones de pase
 * son un golpe de suerte y no un ingreso con el que se pueda contar.
 */
export function ingresoAnual(estado: Estado, rol: Rol): number {
	if (rol === 'futbolista') return estado.futbolista.contrato.salarioMensual * 12;
	const delSueldo =
		(estado.futbolista.contrato.salarioMensual * 12 * estado.contratoRepresentacion.pctSalario) /
		100;
	return 4_000 + 600 * estado.representante.prestigio + delSueldo;
}

/**
 * Lo que sale comprarla hoy: unos meses de lo que gana.
 *
 * Estaba en 0.3 por punto de peso, o sea que el analista costaba un año y
 * cuarto de sueldo entero. Junto con el mantenimiento de abajo, armar el
 * equipo propio era una carrera entera de ahorro, y la vidriera terminaba
 * siendo una lista de cosas que se miran y no se compran nunca.
 */
const LO_QUE_SALE_POR_PUNTO = 0.18;

/**
 * Y lo que sale atarse.
 *
 * Un consumible fijo cuesta más de entrada que el consumible suelto: hay que
 * poder pagar el año de golpe y encima quedar enganchado al gasto. Si costara
 * lo mismo, atarse sería gratis y nadie compraría nunca la versión suelta.
 */
const LO_QUE_SALE_ATARSE = 1.7;

export function precioDe(estado: Estado, item: Inversion, fijo = false): number {
	const cuanto = item.peso * LO_QUE_SALE_POR_PUNTO * (fijo ? LO_QUE_SALE_ATARSE : 1);
	return Math.max(2_000, Math.round((ingresoAnual(estado, item.de) * cuanto) / 500) * 500);
}

/**
 * Y lo que va a costar sostenerla todos los años.
 *
 * Se congela al comprarla, con el sueldo de ese momento. Es la parte que hace
 * que tener plata sea una decisión y no un marcador: el que se llena de gastos
 * en su mejor año no los puede sostener cuando el sueldo baja, y eso es
 * exactamente lo que le pasa a la gente.
 */
/**
 * Cuánto cuesta sostenerla, por punto de peso y por año.
 *
 * Estaba en 0.055, y los pesos del futbolista suman 16: tener todo costaba el
 * 88% de lo que ganaba en el año. No era una decisión difícil, era una decisión
 * imposible —Hernán lo dijo jugando: "los precios anuales son impagables"—.
 *
 * Con 0.018 tener todo cuesta cerca de un tercio del ingreso. Sigue doliendo,
 * que es la idea: el que se llena de gastos en su mejor año no los sostiene
 * cuando el sueldo baja. Pero se puede.
 */
const LO_QUE_CUESTA_SOSTENERLA = 0.018;

export function mantenimientoDe(estado: Estado, item: Inversion, fijo = false): number {
	// Un consumible suelto no se mantiene: se compra, se usa y se termina. Uno
	// atado sí, y por eso es lo que lo hace una decisión y no un regalo.
	if (item.dura && !fijo) return 0;
	return Math.max(
		500,
		Math.round((ingresoAnual(estado, item.de) * item.peso * LO_QUE_CUESTA_SOSTENERLA) / 500) * 500
	);
}

/**
 * Una inversión ya comprada, con el gasto que quedó fijado ese día.
 *
 * `quedan` solo existe en los consumibles: es cuántas temporadas les faltan.
 */
/**
 * Una inversión ya comprada, con el gasto que quedó fijado ese día.
 *
 * `fijo` marca el consumible que se ató para siempre: no se gasta y se paga
 * todos los años, igual que el staff. Lo que cambia no es el efecto sino la
 * forma de pagarlo, así que es una bandera y no otro artículo del catálogo —el
 * efecto ya está escrito una sola vez—.
 */
export type Comprada = InversionComprada;

export function inversion(id: string | undefined): Inversion | null {
	return INVERSIONES.find((i) => i.id === id) ?? null;
}

/** Lo mismo que `Inversion` pero con los números de hoy puestos. */
/**
 * Un renglón de la vidriera, con lo que sale hoy y qué se hace con él.
 *
 * `modo` es la novedad. Antes la vidriera solo sabía ofrecer lo que todavía no
 * se tenía: un consumible comprado desaparecía de la lista y volvía recién
 * cuando se gastaba, así que no había forma de estirarlo antes de quedarse sin
 * ni de dejar de comprarlo todos los años. Bebo lo pidió con esas palabras:
 * "faltan consumibles renovables".
 *
 *  - `comprar`: no lo tiene.
 *  - `renovar`: lo tiene y le suma temporadas, al mismo precio.
 *  - `fijar`:   lo tiene suelto y lo ata para siempre, con gasto anual.
 */
export type ModoDeCompra = 'comprar' | 'renovar' | 'fijar';

export type EnLaVidriera = Inversion & {
	precioUsd: number;
	porTemporadaUsd: number;
	modo: ModoDeCompra;
	/** Cuántas temporadas le quedan, si ya lo tiene y es un consumible. */
	quedan?: number;
	/** Qué id hay que mandar para esta acción. */
	pedido: string;
};

/** El id que viaja en el formulario para cada acción. */
export function pedidoDe(id: string, modo: ModoDeCompra): string {
	return modo === 'comprar' ? id : `${id}:${modo}`;
}

function partirPedido(pedido: string): { id: string; modo: ModoDeCompra } {
	const [id, cual] = pedido.split(':');
	const modo: ModoDeCompra = cual === 'renovar' || cual === 'fijar' ? cual : 'comprar';
	return { id, modo };
}

/** Lo que este rol puede comprar, renovar o atar hoy. */
export function loQuePuedeComprar(estado: Estado, rol: Rol): EnLaVidriera[] {
	const compradas = new Map((estado.inversiones?.[rol] ?? []).map((c) => [c.id, c]));
	const vidriera: EnLaVidriera[] = [];

	for (const item of INVERSIONES) {
		if (item.de !== rol) continue;
		if (!(item.sirveAun?.(estado) ?? true)) continue;

		const ya = compradas.get(item.id);

		if (!ya) {
			vidriera.push({
				...item,
				precioUsd: precioDe(estado, item),
				porTemporadaUsd: mantenimientoDe(estado, item),
				modo: 'comprar',
				pedido: pedidoDe(item.id, 'comprar')
			});
			// Y si es un consumible, también se puede atar de una: el que ya sabe
			// que lo va a querer todos los años no tiene por qué empezar suelto.
			if (item.dura && item.fijo) {
				vidriera.push({
					...item,
					precioUsd: precioDe(estado, item, true),
					porTemporadaUsd: mantenimientoDe(estado, item, true),
					modo: 'fijar',
					pedido: pedidoDe(item.id, 'fijar')
				});
			}
			continue;
		}

		// Ya lo tiene. Un consumible suelto se puede estirar o atar; lo fijo y el
		// staff no se compran dos veces.
		if (item.dura && !ya.fijo) {
			vidriera.push({
				...item,
				precioUsd: precioDe(estado, item),
				porTemporadaUsd: 0,
				modo: 'renovar',
				quedan: ya.quedan,
				pedido: pedidoDe(item.id, 'renovar')
			});
			if (item.fijo) {
				vidriera.push({
					...item,
					precioUsd: precioDe(estado, item, true),
					porTemporadaUsd: mantenimientoDe(estado, item, true),
					modo: 'fijar',
					quedan: ya.quedan,
					pedido: pedidoDe(item.id, 'fijar')
				});
			}
		}
	}

	return vidriera;
}

/** Las que ya compró, con el gasto que le quedó fijado. */
export function loQueTiene(estado: Estado, rol: Rol): EnLaVidriera[] {
	const compradas = estado.inversiones?.[rol] ?? [];
	return compradas
		.map((c): EnLaVidriera | null => {
			const item = inversion(c.id);
			if (!item) return null;
			return {
				...item,
				// Lo atado se muestra con su otro nombre: es lo que lo hace distinto.
				nombre: c.fijo && item.fijo ? item.fijo.nombre : item.nombre,
				efecto: c.fijo && item.fijo ? item.fijo.efecto : item.efecto,
				precioUsd: precioDe(estado, item, c.fijo),
				porTemporadaUsd: c.porTemporadaUsd,
				modo: 'comprar' as const,
				quedan: c.quedan,
				// Lo atado ya no se gasta: se muestra sin cuenta regresiva.
				dura: c.fijo ? undefined : item.dura,
				pedido: item.id
			};
		})
		.filter((i): i is EnLaVidriera => i !== null);
}

function idsDe(estado: Estado, rol: Rol): string[] {
	return (estado.inversiones?.[rol] ?? []).map((c) => c.id);
}

function plataDe(estado: Estado, rol: Rol): number {
	return rol === 'futbolista' ? estado.futbolista.dineroUsd : estado.representante.dineroUsd;
}

function cobrarle(estado: Estado, rol: Rol, cuanto: number): void {
	if (rol === 'futbolista') estado.futbolista.dineroUsd -= cuanto;
	else estado.representante.dineroUsd -= cuanto;
}

/** Lo que se le va todos los años en lo que ya tiene. */
export function gastoAnual(estado: Estado, rol: Rol): number {
	return (estado.inversiones?.[rol] ?? []).reduce((suma, c) => suma + c.porTemporadaUsd, 0);
}

/**
 * Compra una inversión, si le alcanza.
 *
 * No avisa cuando no le alcanza: la pantalla ya muestra el precio y lo que
 * tiene. Devuelve la línea para el diario, o `null` si no compró nada.
 */
export function comprar(estado: Estado, rol: Rol, pedido: string | undefined): string | null {
	if (!pedido || pedido === NADA) return null;

	const { id, modo } = partirPedido(pedido);
	const item = inversion(id);
	if (!item || item.de !== rol) return null;

	const yaTiene = estado.inversiones?.[rol] ?? [];
	const ya = yaTiene.find((c) => c.id === item.id);

	/*
	 * Qué se puede hacer con cada cosa.
	 *
	 * Renovar necesita tenerlo suelto: no se estira lo que no existe ni lo que
	 * ya no se gasta. Atar no lo necesita —se puede empezar atado, el que ya
	 * sabe que lo va a querer todos los años no tiene por qué empezar suelto—,
	 * pero sí que sea un consumible con versión fija y que no esté ya atado.
	 * Y comprar suelto es solo para lo que no se tiene.
	 */
	if (modo === 'renovar' && (!ya || !item.dura || ya.fijo)) return null;
	if (modo === 'fijar' && (!item.dura || !item.fijo || ya?.fijo)) return null;
	if (modo === 'comprar' && ya) return null;

	const fijo = modo === 'fijar';
	const precio = precioDe(estado, item, fijo);
	if (plataDe(estado, rol) < precio) return null;

	cobrarle(estado, rol, precio);
	const porTemporadaUsd = mantenimientoDe(estado, item, fijo);

	estado.inversiones = {
		futbolista: [...(estado.inversiones?.futbolista ?? [])],
		representante: [...(estado.inversiones?.representante ?? [])]
	};

	if (!ya) {
		// No lo tenía: entra nuevo, suelto o atado según lo que haya pedido.
		estado.inversiones[rol] = [
			...yaTiene,
			{
				id: item.id,
				porTemporadaUsd,
				...(item.dura && !fijo ? { quedan: item.dura } : {}),
				...(fijo ? { fijo: true } : {})
			}
		];
		// El empujón único es de comprarlo, no de renovarlo: se siente una vez.
		aplicarDeUnaVez(estado, item);
	} else if (modo === 'renovar') {
		// Le suma temporadas a lo que le quedaba: renovar antes de que se termine
		// no desperdicia lo que sobraba, que sería castigar al que se adelanta.
		estado.inversiones[rol] = yaTiene.map((c) =>
			c.id === item.id ? { ...c, quedan: (c.quedan ?? 0) + (item.dura ?? 1) } : c
		);
	} else {
		// Atarlo: deja de gastarse y pasa a pagarse todos los años.
		estado.inversiones[rol] = yaTiene.map((c) =>
			c.id === item.id ? { id: c.id, porTemporadaUsd, fijo: true } : c
		);
	}

	const cuanto = `USD ${precio.toLocaleString('es-AR')}`;
	const porAnio = `USD ${porTemporadaUsd.toLocaleString('es-AR')} por año`;

	if (modo === 'renovar') {
		const restan = (ya?.quedan ?? 0) + (item.dura ?? 1);
		return (
			`${item.nombre}, renovado por ${cuanto}. Te ${restan === 1 ? 'queda' : 'quedan'} ` +
			`${restan} ${restan === 1 ? 'temporada' : 'temporadas'}.`
		);
	}
	if (fijo) {
		const nombre = item.fijo?.nombre ?? item.nombre;
		return `${nombre}: ${cuanto}, y ${porAnio} de acá en adelante. Ya no se te termina nunca.`;
	}
	if (item.dura) {
		return (
			`${item.nombre}: ${cuanto} por ${item.dura} ` +
			`${item.dura === 1 ? 'temporada' : 'temporadas'}. ${item.efecto}.`
		);
	}
	return `${item.nombre}: ${cuanto}, y ${porAnio} de acá en adelante. ${item.efecto}.`;
}

/** El empujón único del momento de comprarla. */
function aplicarDeUnaVez(estado: Estado, item: Inversion): void {
	const f = estado.futbolista;
	const r = estado.representante;
	const acotar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

	if (item.id === 'casa') f.moral = acotar(f.moral + 15);
	if (item.id === 'oficina') r.atributos.contactos = acotar(r.atributos.contactos + 8);
	if (item.id === 'abogado') r.atributos.negociacion = acotar(r.atributos.negociacion + 10);
	if (item.id === 'ojeadores') r.atributos.scouting = acotar(r.atributos.scouting + 10);
}

export type Mantenimiento = { texto: string; visiblePara: Rol }[];

/**
 * Lo que pasa al cerrar la temporada: se cobran los gastos y se aplica lo que
 * cada inversión da por año.
 *
 * El que no puede pagar la pierde. Sin eso, comprar sería una decisión de una
 * sola vez y no una cuenta que hay que sostener, y la mitad de la gracia de
 * tener plata es que se puede dejar de tener.
 */
export function cobrarMantenimiento(estado: Estado): Mantenimiento {
	const lineas: Mantenimiento = [];

	for (const rol of ['futbolista', 'representante'] as const) {
		const tiene = estado.inversiones?.[rol] ?? [];
		if (tiene.length === 0) continue;

		const quedan: Comprada[] = [];
		for (const comprada of tiene) {
			const item = inversion(comprada.id);
			if (!item) continue;

			// Los consumibles sueltos no se pagan otra vez: se gastan. Los atados sí,
			// y por eso caen abajo, con el staff: se cobran todos los años y se
			// pierden el año que no se puedan pagar.
			if (item.dura && !comprada.fijo) {
				const restan = (comprada.quedan ?? 1) - 1;
				if (restan > 0) {
					quedan.push({ ...comprada, quedan: restan });
				} else {
					lineas.push({
						visiblePara: rol,
						texto: `Se te terminaron ${item.nombre.toLowerCase()}. Duraron lo que tenían que durar.`
					});
				}
				continue;
			}

			if (plataDe(estado, rol) >= comprada.porTemporadaUsd) {
				cobrarle(estado, rol, comprada.porTemporadaUsd);
				quedan.push(comprada);
				aplicarPorTemporada(estado, item);
			} else {
				const comoSeLlama =
					comprada.fijo && item.fijo ? item.fijo.nombre.toLowerCase() : item.nombre.toLowerCase();
				lineas.push({
					visiblePara: rol,
					texto: `No pudiste sostener ${comoSeLlama} y lo perdiste. La plata se termina.`
				});
			}
		}

		estado.inversiones = {
			futbolista: [...(estado.inversiones?.futbolista ?? [])],
			representante: [...(estado.inversiones?.representante ?? [])]
		};
		estado.inversiones[rol] = quedan;
	}

	return lineas;
}

/** Lo que cada inversión hace todas las temporadas. */
function aplicarPorTemporada(estado: Estado, item: Inversion): void {
	const f = estado.futbolista;
	const r = estado.representante;
	const acotar = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

	if (item.id === 'preparador') f.desgaste = acotar(f.desgaste - 2);
	if (item.id === 'nutricionista') f.forma = acotar(f.forma + 7);
	if (item.id === 'casa') f.moral = acotar(f.moral + 2);
	if (item.id === 'oficina') r.atributos.contactos = acotar(r.atributos.contactos + 1);
	if (item.id === 'ojeadores') r.atributos.scouting = acotar(r.atributos.scouting + 1);
	if (item.id === 'prensa-propia') f.prensa = acotar(f.prensa + 3, -100, 100);
}

/** El piso de moral que da el psicólogo, para que lo use la temporada. */
export function pisoDeMoral(estado: Estado): number {
	return tiene(estado, 'psicologo') ? 40 : 0;
}

function tiene(estado: Estado, id: string): boolean {
	return (estado.inversiones?.futbolista ?? []).some((c) => c.id === id);
}

/** Cuánto más se aprovecha una temporada con analista propio. */
export function aprovechaExtra(estado: Estado): number {
	return (tiene(estado, 'analista') ? 1.18 : 1) * (tiene(estado, 'concentracion') ? 1.3 : 1);
}

/** Cuánto multiplican los botines lo que produce en la cancha. */
export function empujeDeLosBotines(estado: Estado): number {
	return tiene(estado, 'botines') ? 1.12 : 1;
}

/** Y cuánto le baja el fisio el riesgo de romperse. */
export function riesgoDeLesionExtra(estado: Estado): number {
	return tiene(estado, 'fisio') ? 0.5 : 1;
}
