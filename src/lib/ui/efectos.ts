import type { Efecto, Minijuego } from '$lib/engine/ocasiones';
import type { EfectoDelRepresentante } from '$lib/engine/momentos';

/**
 * Lo que gana y lo que pierde cada opción, dicho en una línea.
 *
 * Hasta ahora las consecuencias estaban solo en prosa: el `detalle` de la
 * opción y las frases de `siSale` / `siFalla`. Se leen bien una vez, pero
 * elegir entre dos opciones es comparar, y comparar dos párrafos es trabajo.
 * Alan lo marcó mirando el Copero, donde cada opción muestra directamente
 * "+3 OVR 60%" contra "−2 OVR 40%": se ve de un vistazo qué se apuesta y
 * contra qué.
 *
 * Los números no son nuevos ni inventados acá: son los mismos `premio` y
 * `castigo` que el motor ya venía aplicando y que la pantalla no mostraba.
 * Esto no cambia el balance, cambia cuánto de él está a la vista.
 */

export type Chip = {
	texto: string;
	/** `sube` es lo que te conviene, `baja` lo que no. Nada de "positivo". */
	tono: 'sube' | 'baja';
};

/**
 * Cómo se llama cada cosa y para qué lado le conviene moverse al jugador.
 *
 * `bueno: -1` es la trampa que hace falta anotar: subir el desgaste es malo, y
 * un chip verde que diga "+4 de desgaste" estaría mintiendo. Es el único campo
 * donde el signo del número y el signo de la noticia no coinciden.
 */
const CAMPOS: Record<string, { uno: string; varios?: string; bueno: 1 | -1; plata?: boolean }> = {
	goles: { uno: 'gol', varios: 'goles', bueno: 1 },
	asistencias: { uno: 'asistencia', varios: 'asistencias', bueno: 1 },
	fama: { uno: 'de fama', bueno: 1 },
	moral: { uno: 'de moral', bueno: 1 },
	dt: { uno: 'con el técnico', bueno: 1 },
	hinchada: { uno: 'con la gente', bueno: 1 },
	prensa: { uno: 'con la prensa', bueno: 1 },
	confianza: { uno: 'de confianza', bueno: 1 },
	desgaste: { uno: 'de desgaste', bueno: -1 },
	// Los del representante.
	dineroUsd: { uno: '', bueno: 1, plata: true },
	prestigio: { uno: 'de prestigio', bueno: 1 },
	negociacion: { uno: 'de negociación', bueno: 1 },
	scouting: { uno: 'de scouting', bueno: 1 },
	contactos: { uno: 'de contactos', bueno: 1 },
	carisma: { uno: 'de carisma', bueno: 1 },
	representadosExtra: { uno: 'representado', varios: 'representados', bueno: 1 }
};

/** La plata se escribe corta: "US$ 40K" y no "40000". */
function comoPlata(usd: number): string {
	const n = Math.abs(usd);
	if (n >= 1_000_000) return `US$ ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1000) return `US$ ${Math.round(n / 1000)}K`;
	return `US$ ${n}`;
}

/**
 * Los chips de un efecto, del más gordo al más chico.
 *
 * Se ordenan por tamaño porque en dos renglones entra lo importante y lo demás
 * se corta: si el orden fuera el del objeto, que un momento muestre primero
 * "+1 de moral" y esconda "+2 goles" dependería de cómo lo escribió quien lo
 * redactó, que no es un criterio.
 */
export function chipsDe(efecto: Efecto | EfectoDelRepresentante): Chip[] {
	const chips: { chip: Chip; peso: number }[] = [];

	for (const [campo, valor] of Object.entries(efecto)) {
		if (typeof valor !== 'number' || valor === 0) continue;
		const def = CAMPOS[campo];
		if (!def) continue;

		const signo = valor > 0 ? '+' : '−';
		const cuanto = Math.abs(valor);
		const texto = def.plata
			? `${signo}${comoPlata(valor)}`
			: def.varios
				? `${signo}${cuanto} ${cuanto === 1 ? def.uno : def.varios}`
				: `${signo}${cuanto} ${def.uno}`;

		chips.push({
			chip: { texto: texto.trim(), tono: valor * def.bueno > 0 ? 'sube' : 'baja' },
			// La plata se mide en miles y arrasaría con cualquier orden por valor
			// absoluto; se la lleva a la misma escala que el resto.
			peso: def.plata ? cuanto / 10_000 : cuanto
		});
	}

	return chips.sort((a, b) => b.peso - a.peso).map((c) => c.chip);
}

/**
 * Qué se dibuja al lado de una opción.
 *
 * Sale de lo que la opción mueve, no de una lista escrita a mano momento por
 * momento: así cada momento nuevo que se agregue ya viene con su escena y
 * nadie tiene que acordarse de elegirla. Y la escena termina diciendo la
 * verdad —lo que se ve es lo que esa opción toca—, que es más de lo que haría
 * una foto puesta por decorar.
 */
export type Escena =
	| 'remate'
	| 'pase'
	| 'duelo'
	| 'gambeta'
	| 'esfuerzo'
	| 'tecnico'
	| 'tribuna'
	| 'prensa'
	| 'vestuario'
	| 'plata'
	| 'mesa'
	| 'libreta'
	| 'cancha';

/**
 * Las escenas que le quedarían bien a una opción, de la que más la define a la
 * que menos.
 *
 * Es una lista y no una sola porque la elección final no se toma opción por
 * opción: ver `escenasDe`.
 */
function preferenciasDe(
	premio: Efecto | EfectoDelRepresentante,
	castigo: Efecto | EfectoDelRepresentante,
	juego?: Minijuego
): Escena[] {
	const p = premio as Record<string, number | undefined>;
	const c = castigo as Record<string, number | undefined>;
	/** Cuánto pesa un campo: lo que más mueve define mejor a la opción. */
	const cuanto = (campo: string) => Math.abs(p[campo] ?? 0) + Math.abs(c[campo] ?? 0);

	/*
	 * Dónde pasa esto lo dice el minijuego, no los números.
	 *
	 * La ruleta y el arco son la pelota en movimiento; el dado y la charla son
	 * fuera de la cancha. Y ahí está el dato que ningún campo del efecto tiene:
	 * "el cruce" —el nueve rival que te ganó la espalda— no mueve goles ni
	 * asistencias, mueve técnico y gente, así que por los números se dibujaba
	 * como un pizarrón y una tribuna. Pasa en el minuto treinta de un partido.
	 */
	const enLaCancha = juego === 'ruleta' || juego === 'arco';

	/*
	 * El duelo y la gambeta no salen de ningún campo del efecto: están para que
	 * una jugada tenga siempre otra jugada donde caer.
	 *
	 * Sin ellas, la segunda opción de un centro que llega al área se quedaba con
	 * la escena de la prensa —el remate ya se lo había llevado la primera, y lo
	 * siguiente que esa opción movía era la prensa—. Un micrófono al lado de "si
	 * le ganás el tiempo, el arquero no llega" no es un desajuste chico: es una
	 * imagen que contradice lo que dice el texto.
	 */
	const conLaPelota =
		enLaCancha || cuanto('goles') + cuanto('asistencias') + cuanto('desgaste') > 0;

	/*
	 * Un gol no es un punto de moral, y por eso los campos no pesan igual.
	 *
	 * La moral va con el peso más bajo de todos, y no porque importe poco: es al
	 * revés, la mueven casi todas las opciones de casi todos los momentos, así
	 * que es justamente el campo que menos distingue a una opción de la de al
	 * lado. Sin bajarla, una opción que da "+1 gol y +6 de moral" se dibujaba
	 * como un vestuario, y de lo que trata esa opción es del gol.
	 */
	const candidatas: { escena: Escena; peso: number }[] = [
		{ escena: 'remate', peso: cuanto('goles') * 12 },
		{ escena: 'pase', peso: cuanto('asistencias') * 9 },
		{ escena: 'duelo', peso: conLaPelota ? 6.5 : 0 },
		{ escena: 'gambeta', peso: conLaPelota ? 5.5 : 0 },
		{ escena: 'plata', peso: cuanto('dineroUsd') / 8000 },
		{ escena: 'libreta', peso: cuanto('representadosExtra') * 10 + cuanto('scouting') * 1.5 },
		{
			escena: 'mesa',
			peso: (cuanto('negociacion') + cuanto('contactos') + cuanto('prestigio')) * 1.5
		},
		{ escena: 'tecnico', peso: cuanto('dt') * 1.2 },
		{ escena: 'tribuna', peso: cuanto('hinchada') * 1.2 },
		{ escena: 'prensa', peso: cuanto('prensa') * 1.4 },
		{ escena: 'esfuerzo', peso: cuanto('desgaste') * 2.5 },
		{
			escena: 'vestuario',
			peso: (cuanto('moral') + cuanto('confianza') + cuanto('carisma')) * 0.5
		}
	];

	/*
	 * Y el lado manda sobre los números: lo que la opción mueve elige entre
	 * escenas del mismo lado, pero de qué lado es la escena no lo negocia.
	 */
	const DE_LA_CANCHA = new Set<Escena>([
		'remate',
		'pase',
		'duelo',
		'gambeta',
		'esfuerzo',
		'cancha'
	]);
	const donde = (e: Escena) =>
		juego === undefined ? 1 : DE_LA_CANCHA.has(e) === enLaCancha ? 3 : 0.35;

	const ordenadas = candidatas
		.filter((x) => x.peso > 0)
		.map((x) => ({ ...x, peso: x.peso * donde(x.escena) }))
		.sort((a, b) => b.peso - a.peso)
		.map((x) => x.escena);

	// La cancha vacía siempre al final: es la que sirve cuando no hay nada mejor.
	return [...ordenadas, 'cancha'];
}

/**
 * Qué se dibuja al lado de cada opción de un momento.
 *
 * Se reparten entre todas las opciones juntas, no una por una, y ésa es la
 * parte que importa. Elegida por separado, cada opción se lleva la escena que
 * mejor la describe —y en un momento donde las tres son tiros al arco, las
 * tres se llevan el mismo dibujo—. Tres estampas idénticas en el mismo cuadro
 * son exactamente la repetición que Alan estaba señalando: la primera vez
 * pasan, la cuarta temporada ya nadie las mira.
 *
 * Así que cada opción pide su lista de preferencias y se le da la primera que
 * quede libre. Sigue siendo honesto —lo que se ve es algo que esa opción de
 * verdad mueve— y el cuadro deja de repetirse.
 */
export function escenasDe(
	opciones: { premio: Efecto | EfectoDelRepresentante; castigo: Efecto | EfectoDelRepresentante }[],
	/** Con qué se juega el momento: dice si esto pasa en la cancha o afuera. */
	juego?: Minijuego
): Escena[] {
	const tomadas = new Set<Escena>();
	return opciones.map((o) => {
		const quiere = preferenciasDe(o.premio, o.castigo, juego);
		const libre = quiere.find((e) => !tomadas.has(e)) ?? quiere[0];
		tomadas.add(libre);
		return libre;
	});
}

/** La escena de una sola opción, sin nadie con quien repartir. */
export function escenaDe(
	premio: Efecto | EfectoDelRepresentante,
	castigo: Efecto | EfectoDelRepresentante
): Escena {
	return preferenciasDe(premio, castigo)[0];
}
