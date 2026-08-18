<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { loQuePromete } from '$lib/engine/entrenamiento';
	import { QUEDARSE } from '$lib/engine/pases';
	import { NOMBRE_ATRIBUTO as ATRIBUTO } from '$lib/engine/puestos';
	import { ESPERAR, FIRMAR } from '$lib/engine/renovacion';
	import { NOMBRE_ATRIBUTO } from '$lib/engine/puestos';
	import { SIN_TRATO } from '$lib/engine/representacion';
	import { LO_QUE_CUESTA_CON_EL_DT, LO_QUE_CUESTA_CON_LA_HINCHADA, PIDE } from '$lib/engine/salida';
	import { deserialize } from '$app/forms';
	import { page } from '$app/state';
	import type { OpcionesDeFase, Tirada } from '$lib/engine/pantalla';
	import type { Atributos, Estado, Rol } from '$lib/engine/tipos';
	import AtributosLista from './Atributos.svelte';
	import Escudo from './Escudo.svelte';
	import Mercado from './Mercado.svelte';
	import { chipsDe } from './efectos';
	import Momento from './Momento.svelte';
	import Opcion from './Opcion.svelte';
	import Paso from './Paso.svelte';
	import Velocimetro from './Velocimetro.svelte';
	import { media } from '$lib/engine/estado';
	import { CARISMA_POR_DEFECTO } from '$lib/engine/momentos';

	/**
	 * El cuerpo del formulario de la fase: cambia según la fase y el rol.
	 *
	 * Todo lo que se muestra acá vino del servidor ya filtrado por rol. El
	 * futbolista nunca recibe las gestiones del representante ni al revés, así
	 * que no hay nada que esconder del lado del navegador.
	 */
	let {
		opciones,
		estado,
		rol,
		tiradas = []
	}: { opciones: OpcionesDeFase; estado: Estado; rol: Rol; tiradas?: Tirada[] } = $props();

	// Elecciones por defecto: las mismas que toma el motor si nadie toca nada.
	let plan = $state('fisico');
	let intensidad = $state('firme');
	let gestion = $state('acompanar');
	/*
	 * Dónde sale a buscar el representante. Ver `sondeo.ts`.
	 *
	 * Arranca vacío y lo completa el efecto de abajo con lo que ya tiene
	 * guardado: leer `opciones` acá adentro capturaría el valor del primer
	 * render y la elección del año pasado no se vería marcada al volver.
	 */
	let sondeo = $state('');
	let destino = $state(QUEDARSE);
	/** Representante, primer tiempo del mercado: las que deja pasar. Ver `cartas.ts`. */
	let filtradas = $state<string[]>([]);
	let acuerdo = $state('estandar');
	let renovacion = $state(FIRMAR);
	let compras = $state<string[]>([]);
	let rasgo = $state('');
	let sueno = $state('');
	let salida = $state('');

	$effect(() => {
		const tres = opciones.rasgos ?? [];
		if (tres.length > 0 && !tres.some((r) => r.id === rasgo)) rasgo = tres[0].id;
	});
	/*
	 * `bind:group` deja la variable en `null` mientras ningún radio está marcado.
	 * Acá eso significa "no eligió club", que es lo mismo que quedarse: sin esto
	 * el valor se queda en null hasta que alguien toca algo.
	 */
	$effect(() => {
		if (destino === null || destino === undefined) destino = QUEDARSE;
	});
	$effect(() => {
		const posibles = opciones.suenos ?? [];
		if (posibles.length > 0 && !posibles.some((s) => s.id === sueno)) sueno = posibles[0].id;
	});
	// Y el sondeo arranca en lo que ya tenía elegido, o en el de casa.
	$effect(() => {
		const donde = opciones.sondeo;
		if (donde && !donde.destinos.some((d) => d.id === sondeo && d.alcanza)) sondeo = donde.elegido;
	});
	let ocasiones = $state<string[]>([]);

	/*
	 * Los momentos de la temporada, de a uno.
	 *
	 * Estaban los tres abiertos a la vez y eran tres pantallas de scroll, pero el
	 * problema de fondo no era el largo: en un año no pasan tres cosas al mismo
	 * tiempo. Pasa una, se decide, y meses después pasa la otra. Mostrarlas juntas
	 * las convertía en un formulario de tres preguntas en vez de tres momentos.
	 *
	 * Cuántas ya ocurrieron no es una decisión de la pantalla: es cuántas se
	 * tiraron. Para llegar al segundo momento hay que haber jugado el primero, y
	 * eso lo sabe el servidor, no el navegador. `abierta` es la única que
	 * pertenece a la pantalla: cuál se está mirando ahora.
	 */
	let abierta = $state(0);

	/**
	 * Y si el momento está abierto de verdad, tapando todo lo demás.
	 *
	 * No se abre solo al entrar. Una pantalla que te tira un cuadro modal en la
	 * cara apenas cargó no se siente como que llegó el momento: se siente como
	 * un aviso. Se abre cuando lo abrís, y ahí sí ocupa todo.
	 */
	let jugando = $state(false);

	function seguir(cuantas: number) {
		if (abierta < cuantas - 1) abierta += 1;
		else jugando = false;
	}

	$effect(() => {
		const cuantas = losMomentos?.length ?? 0;
		if (ocasiones.length !== cuantas) {
			// Por defecto, la opción más conservadora: la última de cada lista.
			ocasiones = (losMomentos ?? []).map((o) => o.opciones[o.opciones.length - 1].id);
		}
	});

	/*
	 * Tirar la rueda.
	 *
	 * Lo que se manda es la elección; lo que vuelve es qué pasó. El servidor la
	 * escribe antes de contestar, así que a partir de acá no hay vuelta atrás:
	 * cambiar el radio no cambia nada, recargar tampoco, y al cerrar la fase el
	 * servidor pisa el formulario con lo que quedó escrito.
	 *
	 * Eso es justamente lo que la hace valer. Una ruleta que se puede volver a
	 * tirar hasta que salga bien no es una ruleta, es un botón de reintentar.
	 */
	let tiradasEnVivo = $state<Tirada[]>([]);
	let recienTirada = $state(-1);
	let tirando = $state(-1);
	let contado = $state(-1);
	let problema = $state('');

	/**
	 * Lo que tarda cada minijuego en terminar de contar el final.
	 *
	 * Tiene que ser lo que tarda la animación de cada uno, ni más ni menos. De
	 * menos, la crónica aparece con la pelota todavía en el aire; de más, queda
	 * un silencio raro después de que ya se vio todo.
	 */
	const LO_QUE_TARDA: Record<string, number> = {
		ruleta: 2700,
		arco: 1300,
		dado: 1600,
		quiz: 1500
	};

	/**
	 * Los momentos de este rol.
	 *
	 * Son la misma cosa dibujada igual: el futbolista tiene tres que pasan con la
	 * pelota y el representante dos que pasan fuera de la cancha, pero los dos
	 * tienen un planteo, opciones con la probabilidad de verdad y un minijuego
	 * que la dibuja. El servidor manda uno u otro según quién sea; acá no hace
	 * falta distinguirlos para nada más que el nombre del campo.
	 */
	const losMomentos = $derived(opciones.ocasiones ?? opciones.momentos);
	const campoDelMomento = $derived(opciones.ocasiones ? 'ocasion' : 'momento');

	/**
	 * Lo que no se puede perder de vista mientras se decide.
	 *
	 * Alan lo marcó aparte del pedido del popup, y es la advertencia que hace
	 * que el popup no sea un retroceso: "que no se pierda de vista el OVR y
	 * otros datos clave de la tarjeta del jugador". Un cuadro que tapa la
	 * pantalla te deja eligiendo entre dos opciones sin lo que necesitás para
	 * elegir, y ahí la decisión se vuelve un volantazo.
	 *
	 * Cada rol lleva lo suyo, y lo suyo es lo que los momentos mueven: al
	 * futbolista le importa cómo está el técnico y cuánto lleva gastado el
	 * cuerpo; al representante, con qué números se sienta a hablar.
	 */
	const cinta = $derived.by(() => {
		if (rol === 'representante') {
			const r = estado.representante;
			return {
				numero: String(r.prestigio),
				pie: 'Prestigio',
				datos: [
					{ rotulo: 'Negociación', valor: String(r.atributos.negociacion) },
					{ rotulo: 'Scouting', valor: String(r.atributos.scouting) },
					{ rotulo: 'Contactos', valor: String(r.atributos.contactos) },
					{ rotulo: 'Carisma', valor: String(r.atributos.carisma ?? CARISMA_POR_DEFECTO) }
				]
			};
		}
		const f = estado.futbolista;
		return {
			numero: String(media(f.atributos, f.posicion)),
			pie: 'Media',
			clubId: f.contrato.clubId,
			datos: [
				{ rotulo: 'Edad', valor: String(f.edad) },
				{ rotulo: 'Moral', valor: String(f.moral) },
				{ rotulo: 'Desgaste', valor: String(f.desgaste) },
				{ rotulo: 'Técnico', valor: String(f.dt) },
				{ rotulo: 'Gente', valor: String(f.hinchada) }
			]
		};
	});

	/** De qué club son los colores de las escenas: del que lo tiene. */
	const clubDeLasEscenas = $derived(estado.futbolista.contrato.clubId);

	/**
	 * Todo lo tirado: lo que vino con la página más lo que se tiró sin recargarla.
	 * Las que llegaron con la página se dibujan ya frenadas —esa sorpresa ya
	 * pasó—; las de esta visita giran.
	 */
	const hechas = $derived.by(() => {
		const todas: Record<number, Tirada> = {};
		for (const t of tiradas) todas[t.indice] = t;
		for (const t of tiradasEnVivo) todas[t.indice] = t;
		return todas;
	});

	/** Si de esta ya se sabe el final: o venía sabido, o la rueda ya frenó. */
	function terminada(i: number): boolean {
		if (!hechas[i]) return false;
		return recienTirada !== i || contado === i;
	}

	/**
	 * Hasta dónde se puede mirar: el primero sin jugar, y ni uno más.
	 *
	 * Cuenta las terminadas y no las tiradas, que no es lo mismo por dos segundos
	 * y medio: si contara las tiradas, el momento siguiente se destaparía con la
	 * rueda todavía girando y la pantalla saltaría sola justo cuando hay que
	 * estar mirándola.
	 */
	const destapadas = $derived.by(() => {
		const cuantas = losMomentos?.length ?? 0;
		let listas = 0;
		for (let i = 0; i < cuantas; i++) if (terminada(i)) listas++;
		return Math.min(cuantas, listas + 1);
	});

	/**
	 * Al entrar se mira el momento que toca: el primero sin jugar.
	 *
	 * Solo al entrar. Después la pantalla no se mueve sola nunca más: cuando la
	 * rueda frena, el que decide pasar al momento siguiente es el que está
	 * leyendo lo que acaba de pasar, no un efecto. Una pantalla que salta sola
	 * justo cuando terminaste de jugártela te roba el único segundo que valía la
	 * pena.
	 */
	let acomodadaPara = $state('');
	$effect(() => {
		const temporada = (losMomentos ?? []).map((o) => o.id).join('|');
		if (temporada === acomodadaPara) return;
		acomodadaPara = temporada;
		abierta = Math.max(0, destapadas - 1);
	});

	async function tirar(i: number, juego: string) {
		if (tirando >= 0 || hechas[i]) return;
		tirando = i;
		problema = '';

		const cuerpo = new FormData();
		cuerpo.set('indice', String(i));
		cuerpo.set('opcion', ocasiones[i] ?? '');

		try {
			const respuesta = await fetch(`${page.url.pathname}?/tirar`, {
				method: 'POST',
				body: cuerpo
			});
			const resultado = deserialize(await respuesta.text());

			if (resultado.type === 'success' && resultado.data?.tirada) {
				const tirada = resultado.data.tirada as Tirada;
				tiradasEnVivo = [...tiradasEnVivo, tirada];
				recienTirada = i;
				// Lo que valga de verdad es lo que dijo el servidor, no lo que estaba
				// marcado en la pantalla.
				ocasiones[i] = tirada.opcionId;
				// La crónica se escribe cuando la rueda frena. Contarla antes es
				// contar el final con la pelota todavía en el aire.
				setTimeout(() => (contado = i), LO_QUE_TARDA[juego] ?? 2700);
			} else if (resultado.type === 'failure') {
				problema = String(resultado.data?.problema ?? 'No se pudo tirar.');
			} else {
				problema = 'No se pudo tirar.';
			}
		} catch {
			problema = 'Se cortó la conexión. Probá de nuevo.';
		} finally {
			tirando = -1;
		}
	}

	function plata(usd: number): string {
		return `USD ${usd.toLocaleString('es-AR')}`;
	}

	/** Qué sube el plan elegido y hasta cuánto, con la intensidad elegida. */
	const promesa = $derived(opciones.planes ? loQuePromete(estado, plan, intensidad as never) : []);
	const queSube = $derived(promesa.map((p) => p.atributo) as (keyof Atributos)[]);

	/** Lo mismo pero para cualquier plan, para poder mostrarlo en cada tarjeta. */
	function subeDe(planId: string): string {
		const p = opciones.planes?.find((x) => x.id === planId);
		if (!p) return '';
		return p.atributos.map((a) => NOMBRE_ATRIBUTO[a]).join(' + ');
	}

	const clubActual = $derived(contexto(estado.futbolista.contrato.clubId).club.nombre);

	/*
	 * Lo que va escrito en la línea de cada paso plegado.
	 *
	 * Es lo que hace que plegar no sea esconder: la decisión no se ve entera pero
	 * sí se ve qué quedó elegido, así que se abre solo la que se quiere cambiar.
	 * Y de paso los valores por defecto salen a la luz, que antes se aplicaban sin
	 * que nadie los hubiera leído nunca.
	 */
	const nombreDelPlan = $derived(opciones.planes?.find((p) => p.id === plan)?.nombre ?? '');
	const nombreDeLaIntensidad = $derived(
		opciones.intensidades?.find((i) => i.id === intensidad)?.nombre ?? ''
	);
	const comoEntrena = $derived(
		nombreDelPlan ? `${nombreDelPlan} · ${nombreDeLaIntensidad.toLowerCase()}` : ''
	);
	/** Lo que se lleva del bolsillo lo que está marcado, y lo que suma por año. */
	const loQueGasta = $derived(
		compras.reduce(
			(suma, id) =>
				suma + (opciones.inversiones?.puedeComprar.find((i) => i.id === id)?.precioUsd ?? 0),
			0
		)
	);
	const loQueSumaPorAnio = $derived(
		compras.reduce(
			(suma, id) =>
				suma + (opciones.inversiones?.puedeComprar.find((i) => i.id === id)?.porTemporadaUsd ?? 0),
			0
		)
	);
	const queCompra = $derived(
		compras.length === 0
			? ''
			: compras.length === 1
				? (opciones.inversiones?.puedeComprar.find((i) => i.id === compras[0])?.nombre ?? '')
				: `${compras.length} cosas · ${plata(loQueGasta)}`
	);
	const queGestiona = $derived(opciones.gestiones?.find((g) => g.id === gestion)?.nombre ?? '');
	const queTrato = $derived(
		acuerdo === SIN_TRATO
			? 'No firmar'
			: (opciones.tratos?.find((t) => t.id === acuerdo)?.nombre ?? '')
	);
	/**
	 * Adónde va, escrito.
	 *
	 * Sale del club de la oferta elegida, salvo que la elegida sea quedarse. Y
	 * `destino` puede no ser ninguna de las dos cosas: `bind:group` de Svelte lo
	 * deja en `null` mientras ningún radio está marcado, que es lo que pasa en
	 * cada render donde las ofertas todavía no se dibujaron. Este derivado se
	 * evalúa igual —no le importa que el mercado no esté en pantalla— y llamar a
	 * `contexto(null)` tira: la página quedaba a medias con "No existe el club
	 * null" en la consola, en todas las fases, y ningún test lo veía porque el
	 * dato que viaja del servidor está perfecto. Lo que estaba mal era asumir.
	 */
	const queDestino = $derived.by(() => {
		if (!destino || destino === QUEDARSE) return `Quedarse en ${clubActual}`;
		const cual = opciones.ofertas?.find((o) => o.clubId === destino);
		return cual ? contexto(cual.clubId).club.nombre : `Quedarse en ${clubActual}`;
	});

	/*
	 * Cuál arranca abierto: uno solo, y el que define la fase.
	 *
	 * Abrir "el importante de cada bloque" no alcanzaba: hay pretemporadas donde
	 * coinciden la renovación, la mesa y el entrenamiento, y tres paneles abiertos
	 * son otra vez tres mil píxeles. El orden es por lo que pasa menos seguido y
	 * decide más: una mesa de contrato aparece cada tres o cuatro temporadas y te
	 * cambia la carrera; el plan de entrenamiento está siempre y casi nunca se
	 * toca.
	 */
	const abierto = $derived(
		opciones.renovacion?.oferta
			? 'renovacion'
			: opciones.tratos
				? 'mesa'
				: opciones.ofertas
					? 'mercado'
					: opciones.sondeo
						? 'sondeo'
						: opciones.gestiones
							? 'gestion'
							: opciones.planes
								? 'entrenamiento'
								: ''
	);

	function comoJuega(brecha: number): string {
		if (brecha >= 10) return 'Sos la figura';
		if (brecha >= 2) return 'Titular';
		if (brecha >= -5) return 'Peleás el puesto';
		return 'Te sentás en el banco';
	}
</script>

<!-- ---------- Qué clase de jugador sos ---------- -->
{#if opciones.rasgos && opciones.rasgos.length > 0}
	<!--
		La pregunta y sus respuestas, en un solo bloque.

		Estaban sueltas: el encabezado era una tarjeta y cada opción era otra
		tarjeta igual, así que la primera pantalla del juego era una fila de ocho
		cajas del mismo color y no se veía dónde terminaba una decisión y empezaba
		la otra. Adentro de un bloque con el título arriba, se lee que las tres de
		abajo son las respuestas a esta pregunta y no otra cosa más.
	-->
	<div class="decision" data-tema="cancha">
		<div class="pregunta">
			<h3>¿Qué clase de jugador sos?</h3>
			<p style="margin:0 0 .4rem">
				El azar te trajo tres. Elegí uno: <strong>te define para toda la carrera</strong> y no se cambia
				nunca más.
			</p>
			<p class="sutil" style="margin:0">
				Ninguno es mejor que otro. El olfato de gol hace goleadores y el pulmón hace jugadores que
				llegan a los 36.
			</p>
		</div>

		<div class="respuestas">
			{#each opciones.rasgos as r (r.id)}
				<Opcion
					grupo="rasgo"
					valor={r.id}
					titulo={r.nombre}
					detalle={r.detalle}
					bind:elegido={rasgo}
				>
					{#snippet extra()}
						<span class="sube">
							<span class="chip-sube gana">+{r.cuanto} {ATRIBUTO[r.atributo]}</span>
							<span class="chip-sube">{r.siempre}</span>
							{#if r.pero}
								<span class="chip-sube pierde">{r.pero}</span>
							{/if}
						</span>
					{/snippet}
				</Opcion>
			{/each}
		</div>
	</div>
{/if}

<!-- ---------- Para qué vas a jugar ---------- -->
{#if opciones.suenos && opciones.suenos.length > 0}
	<div class="decision" data-tema="oro">
		<div class="pregunta">
			<h3>¿Para qué vas a jugar?</h3>
			<p style="margin:0 0 .4rem">
				Elegí una sola cosa. No se cambia, no se puede apurar y no se cumple en una temporada:
				<strong>es adónde va a haber llegado esta carrera cuando termine</strong>.
			</p>
			<p class="sutil" style="margin:0">
				{estado.futbolista.nombre} tiene {estado.futbolista.edad} años. Lo que elijas acá se va a ver
				en todas las pantallas hasta el último día.
			</p>
		</div>

		<div class="respuestas">
			{#each opciones.suenos as s (s.id)}
				<Opcion
					grupo="sueno"
					valor={s.id}
					titulo={s.nombre}
					detalle={s.detalle}
					bind:elegido={sueno}
				>
					{#snippet extra()}
						<span class="sube">
							<span class="chip-sube gana">{s.meta}</span>
						</span>
					{/snippet}
				</Opcion>
			{/each}
		</div>
	</div>
{/if}

<!-- ---------- En qué gastar la plata ---------- -->

<!-- ---------- Cuando vence el contrato con el club ---------- -->
{#if opciones.renovacion}
	{@const r = opciones.renovacion}
	<Paso
		titulo={r.libre ? 'Quedó libre' : 'Se le vence el contrato'}
		elegido={r.oferta ? (renovacion === FIRMAR ? 'Firmar' : 'Salir libre') : ''}
		tema="plata"
		abierto={abierto === 'renovacion'}
	>
		{#if !r.oferta}
			<p style="margin:0 0 .5rem">
				<strong>{clubActual}</strong> no ofreció renovación. Con los minutos que le dan, en el club ya
				no cuentan con él.
			</p>
			<p class="sutil" style="margin:0">
				Tu representante puede intentar torcerlo en el mercado, al final de la temporada. Y si no lo
				consigue, ahí se define a dónde vas.
			</p>
		{:else}
			<p style="margin:0 0 .75rem">
				<strong>{clubActual}</strong> pone sobre la mesa
				<strong>{plata(r.oferta.salarioMensual)}</strong> por mes —{r.oferta.mejora >= 0
					? `+${r.oferta.mejora}%`
					: `${r.oferta.mejora}%`}— por {r.oferta.temporadas}
				{r.oferta.temporadas === 1 ? 'temporada' : 'temporadas'}.
			</p>
			<p class="sutil" style="margin:0 0 1rem">
				Tienen que <strong>elegir lo mismo</strong> para que pase algo. Si uno firma y el otro espera,
				no se firma nada y la relación lo paga.
			</p>
		{/if}

		{#if r.oferta}
			{@const o = r.oferta}
			<Opcion
				grupo="renovacion"
				valor={FIRMAR}
				titulo="Firmar la renovación"
				detalle="Lo seguro: más sueldo desde ya y {o.temporadas} {o.temporadas === 1
					? 'temporada'
					: 'temporadas'} tranquilo en {clubActual}."
				bind:elegido={renovacion}
			>
				{#snippet extra()}
					<span class="sube">
						<span class="chip-sube gana">{plata(o.salarioMensual)} por mes</span>
						{#if rol === 'representante'}
							<span class="chip-sube gana">Tu comisión: {plata(o.comisionUsd)}</span>
						{:else}
							<span class="chip-sube">Los años acá siguen sumando para el final</span>
						{/if}
					</span>
				{/snippet}
			</Opcion>

			<Opcion
				grupo="renovacion"
				valor={ESPERAR}
				titulo="No firmar y salir libre"
				detalle="La apuesta: si termina el contrato el pase no cuesta nada, así que muchos más clubes pueden ir a buscarlo y pagan más."
				bind:elegido={renovacion}
			>
				{#snippet extra()}
					<span class="sube">
						<span class="chip-sube gana">Sueldos ~18% mejores y prima por firmar</span>
						<span class="chip-sube pierde">El técnico lo hace jugar menos este año</span>
						<span class="chip-sube pierde">Y jugar menos es crecer menos</span>
					</span>
				{/snippet}
			</Opcion>
		{/if}
	</Paso>
{/if}

<!-- ---------- Cuando vence el contrato entre los dos ---------- -->
{#if opciones.tratos}
	<Paso
		titulo="La mesa: el contrato entre ustedes"
		elegido={queTrato}
		tema="relacion"
		abierto={abierto === 'mesa'}
	>
		<p style="margin:0 0 .5rem">Se venció el contrato entre ustedes. Hay que firmar de nuevo.</p>
		<p class="sutil" style="margin:0 0 1rem">
			{#if rol === 'futbolista'}
				Elegí <strong>hasta dónde estás dispuesto a llegar</strong>. Si él pide menos o lo mismo,
				hay trato al número que pidió. Si pide más, no hay acuerdo y siguen con lo de antes un año
				más, con la relación golpeada.
			{:else}
				Elegí <strong>cuánto pedís</strong>. Si él llega hasta ahí o más, firman a tu número. Si te
				pasás, no hay acuerdo. Lo que podés pedir depende de tu prestigio y tu negociación.
			{/if}
		</p>

		{#if opciones.consejo}
			<div class="tarjeta consejo" data-tema="relacion">
				<p style="margin:0">{opciones.consejo}</p>
			</div>
		{/if}

		{#each opciones.tratos as t (t.id)}
			<Opcion
				grupo="trato"
				valor={t.id}
				titulo={t.nombre}
				detalle={t.detalle}
				bind:elegido={acuerdo}
			>
				{#snippet extra()}
					<span class="sube">
						<span class="chip-sube">{t.duracionTemporadas} temporadas</span>
						{#if rol === 'representante'}
							<span class="chip-sube gana">
								Hoy serían {plata(
									Math.round((estado.futbolista.contrato.salarioMensual * 12 * t.pctSalario) / 100)
								)} por año
							</span>
						{:else}
							<span class="chip-sube pierde">
								Te cuesta {plata(
									Math.round((estado.futbolista.contrato.salarioMensual * 12 * t.pctSalario) / 100)
								)} por año
							</span>
						{/if}
					</span>
					<span class="acambio">{t.acambio}</span>
				{/snippet}
			</Opcion>
		{/each}

		{#if rol === 'futbolista'}
			<Opcion
				grupo="trato"
				valor={SIN_TRATO}
				titulo="No firmar"
				detalle="No te ata a nada. Siguen juntos un año más, por inercia."
				bind:elegido={acuerdo}
			/>
		{/if}
	</Paso>
{/if}

<!-- ---------- Fase 1: pretemporada ---------- -->
<!--
	Qué entrena y con cuánta intensidad van juntos, y no separados como estaban.
	Son una sola decisión: la intensidad no significa nada sin saber sobre qué se
	aplica, y elegirlas en dos tarjetas distintas obligaba a subir y bajar para
	comparar. Los atributos de hoy van adentro, que es donde se miran: al lado de
	lo que se está por entrenar.
-->
{#if opciones.planes}
	<Paso
		titulo="Cómo entrenás la pretemporada"
		elegido={comoEntrena}
		tema="cancha"
		abierto={abierto === 'entrenamiento'}
	>
		<AtributosLista
			atributos={estado.futbolista.atributos}
			destacados={queSube}
			posicion={estado.futbolista.posicion}
		/>
		<p class="sutil" style="margin:.6rem 0 1rem">
			Lo verde es lo que va a subir con <strong>{subeDe(plan).toLowerCase()}</strong>.
		</p>

		<p class="subtitulo">Qué entrenás</p>
		<!--
			Tres, y en fila.

			"Qué entrenás: solo 3 opciones en horizontal", dijo Alan, y las dos
			mitades del pedido son la misma: seis tarjetas apiladas eran media
			pantalla de scroll para llegar a la intensidad, que es la decisión que
			de verdad importa. Cuáles tres las decide el puesto; ver `planesPara`.
		-->
		<div class="enFila">
			{#each opciones.planes as p (p.id)}
				<Opcion
					grupo="entrenamiento"
					valor={p.id}
					titulo={p.nombre}
					detalle={p.detalle}
					bind:elegido={plan}
				>
					{#snippet extra()}
						<span class="sube">
							{#each p.atributos as a (a)}
								<span class="chip-sube">
									{NOMBRE_ATRIBUTO[a]}
									<b>{estado.futbolista.atributos[a]}</b>
								</span>
							{/each}
						</span>
					{/snippet}
				</Opcion>
			{/each}
		</div>

		<p class="subtitulo">
			Con cuánta intensidad · {estado.futbolista.edad} años, {estado.futbolista.desgaste} de desgaste
		</p>
		<!--
			El velocímetro, arriba de las tres tarjetas.

			"Poner un velocímetro, aguja sobre arco de colores, como el que
			mandaste", pidió Alan. Las tarjetas de abajo ya dicen en texto qué hace
			cada intensidad; esto es para verlo de un vistazo, sin leer nada, antes
			de leer nada.
		-->
		{#if opciones.intensidades}
			<Velocimetro intensidades={opciones.intensidades} elegido={intensidad} />
		{/if}
		<!-- También tres, y también en fila: apiladas quedaban dos arriba y una
		     colgando sola, que es peor que las tres juntas. -->
		<div class="enFila">
			{#each opciones.intensidades ?? [] as i (i.id)}
				<Opcion
					grupo="intensidad"
					valor={i.id}
					titulo={i.nombre}
					detalle={i.detalle}
					bind:elegido={intensidad}
				>
					{#snippet extra()}
						<span class="sube">
							{#each loQuePromete(estado, plan, i.id) as p (p.atributo)}
								<span class="chip-sube gana">{p.nombre} hasta +{p.hasta}</span>
							{/each}
							<span class="chip-sube pierde">Desgaste +{i.desgaste}</span>
						</span>
					{/snippet}
				</Opcion>
			{/each}
		</div>
	</Paso>
{/if}

<!-- ---------- Fase 2: pedir salir del club ---------- -->

<!-- ---------- Fase 2: con qué está jugando el año ---------- -->
{#if opciones.objetivoCerrado}
	{@const o = opciones.objetivoCerrado}
	<div class="yaElegido">
		<span class="rotulo">El año se juega así</span>
		<strong>{o.nombre}</strong>
		<span class="chip-sube gana">{o.sube}</span>
		<span class="chip-sube pierde">{o.cuesta}</span>
		<p class="sutil" style="margin:.5rem 0 0">
			Salió sorteado en la pretemporada, según la intensidad elegida, y ya no se cambia: el
			campeonato empezó.
		</p>
	</div>
{/if}

<!-- ---------- Fase 2: los momentos del año, de cada rol ---------- -->
{#if losMomentos}
	{@const cuantas = losMomentos.length}
	<div class="momentos">
		<p class="sutil" style="margin:0 0 .9rem">
			{#if cuantas === 1}
				Un momento {estado.fase === 3 ? 'del mercado' : 'de la temporada'}.
			{:else}
				{cuantas} momentos {estado.fase === 3 ? 'del mercado' : 'de la temporada'}, uno por vez.
			{/if}
			Elegís, tirás, y ahí mismo sabés qué pasó. Las probabilidades salen de tus atributos y son las de
			verdad: lo que dice el número es lo que se tira, y se tira una sola vez.
			{#if rol === 'representante' && opciones.carisma}
				Y tenés <b>{opciones.carisma.cuanto} de carisma</b>: cuando algo sale mal, {opciones.carisma
					.salva}% de las veces caés bien igual y se arregla solo.
			{/if}
		</p>

		<!--
			La lista de momentos, que es el año visto de afuera.

			Antes acá abajo venía el momento entero desplegado, y ése era el
			problema que marcó Alan: la decisión más pesada del año se leía igual
			que el resto del formulario. Ahora esto es solo el índice —qué pasó,
			qué toca y qué falta— y el momento en sí se abre encima de todo. Ver
			`Momento.svelte`.
		-->
		<ol class="linea">
			{#each losMomentos as ocasion, i (ocasion.id)}
				{@const tirada = hechas[i]}
				{@const elegida =
					ocasion.opciones.find((o) => o.id === (tirada?.opcionId ?? ocasiones[i])) ??
					ocasion.opciones[0]}
				{@const yaPaso = i < destapadas}
				{@const listo = terminada(i)}

				<li class:pendiente={!yaPaso}>
					{#if !yaPaso}
						<!-- Todavía no pasó. Se sabe que viene, y nada más. -->
						<span class="fila porVenir">
							<span class="n">{i + 1}</span>
							<span class="que">Todavía no pasó</span>
						</span>
					{:else}
						<button
							type="button"
							class="fila"
							class:jugado={listo}
							class:fallo={listo && tirada && !tirada.salio}
							class:ahora={!listo}
							onclick={() => {
								abierta = i;
								jugando = true;
							}}
						>
							<span class="n">{i + 1}</span>
							<span class="que">
								<b>{ocasion.titulo}</b>
								<i>{listo ? elegida.etiqueta : 'Te toca decidir'}</i>
							</span>
							<span class="comoSalio">
								{#if listo && tirada}
									{tirada.salio ? 'Salió' : 'No salió'}
								{:else}
									Jugarlo
								{/if}
							</span>
						</button>
					{/if}
				</li>
			{/each}
		</ol>

		<!--
			El momento abierto. Uno solo por vez, que es como pasan: en un año no
			ocurren tres cosas al mismo tiempo.
		-->
		{#if jugando && losMomentos[abierta]}
			{@const ocasion = losMomentos[abierta]}
			<Momento
				momento={ocasion}
				indice={abierta}
				total={cuantas}
				campo={campoDelMomento}
				clubId={clubDeLasEscenas}
				{cinta}
				carisma={opciones.carisma?.salva ?? 0}
				tirada={hechas[abierta]}
				tirando={tirando === abierta}
				contado={recienTirada !== abierta || contado === abierta}
				{problema}
				bind:elegida={ocasiones[abierta]}
				onTirar={(juego) => tirar(abierta, juego)}
				onSeguir={() => seguir(cuantas)}
				onCerrar={() => (jugando = false)}
			/>
		{/if}

		<!--
			Las elecciones viajan siempre, esté el popup abierto o cerrado.

			Un input escondido con `hidden` se envía igual que uno visible —lo que
			no se envía es uno deshabilitado—, así que la fase se resuelve completa
			aunque el jugador no haya abierto ningún momento, y sin JavaScript
			quedan las opciones por defecto, que es lo mismo que toma el motor
			cuando nadie elige. Igual, lo que manda de verdad es lo que el servidor
			tiene escrito: ver `tirarOcasion`.
		-->
		<div hidden>
			{#each losMomentos as ocasion, i (ocasion.id)}
				<input type="radio" name={`${campoDelMomento}-${i}`} value={ocasiones[i] ?? ''} checked />
			{/each}
		</div>
	</div>
{/if}

<!-- ---------- Fases 1 y 2: la gestión del representante ---------- -->
<!-- ---------- Fase 1, representante: dónde sale a buscar ---------- -->
<!--
	Dos continentes como mucho, y el segundo lo elige él.

	"Que el repre tenga la posibilidad de sondear por continente según cantidad
	de temporadas. O sea, no debería tener ofertas de todos los continentes sino
	de 2 máximo." Va acá arriba, antes de la gestión, porque es la decisión de
	pretemporada que más lejos llega: se elige en enero y recién se ve en el
	mercado de fin de año.
-->
{#if opciones.sondeo}
	{@const donde = opciones.sondeo}
	{@const elegido = donde.destinos.find((d) => d.id === sondeo)}
	<Paso
		titulo="Dónde salís a buscar"
		elegido={elegido?.nombre ?? ''}
		tema="plata"
		abierto={abierto === 'sondeo'}
		nota="Uno por año. Donde ya trabajás lo tenés siempre; el segundo es éste, y de ahí van a salir la mitad de las ofertas del mercado."
	>
		<p class="sutil" style="margin:0 0 .9rem">
			Tu agenda llega a <b>{donde.alcance}</b>. Sube con los contactos, con el prestigio y con los
			años que llevás trabajando.
		</p>
		<div class="enFila">
			{#each donde.destinos as d (d.id)}
				<Opcion
					grupo="sondeo"
					valor={d.id}
					titulo={d.nombre}
					detalle={d.esLaDeCasa
						? 'Donde ya trabajás. La tenés siempre, elijas lo que elijas.'
						: d.alcanza
							? 'Llegás. Este año los clubes de allá van a saber que existe.'
							: `Todavía no llegás: te faltan ${d.falta} de alcance.`}
					bind:elegido={sondeo}
					deshabilitada={!d.alcanza}
				>
					{#snippet extra()}
						<span class="sube">
							{#if d.esLaDeCasa}
								<span class="chip-sube gana">Siempre</span>
							{:else if d.alcanza}
								<span class="chip-sube gana">Se abre</span>
							{:else}
								<span class="chip-sube pierde">Faltan {d.falta}</span>
							{/if}
						</span>
					{/snippet}
				</Opcion>
			{/each}
		</div>
	</Paso>
{/if}

{#if opciones.gestiones}
	<Paso
		titulo="Qué hacés esta fase"
		elegido={queGestiona}
		tema="plata"
		abierto={abierto === 'gestion'}
		nota="Una sola, y vale para todo el año. Las probabilidades salen de tu negociación, tu scouting y tus contactos."
	>
		{#each opciones.gestiones as g (g.id)}
			{@const gana = chipsDe(g.siSale)}
			{@const pierde = chipsDe(g.siFalla)}
			<Opcion
				grupo="gestion"
				valor={g.id}
				titulo={g.nombre}
				detalle={g.detalle}
				probabilidad={g.probabilidad}
				bind:elegido={gestion}
			>
				{#snippet extra()}
					<!--
						Qué sube y qué baja, que era lo que no se podía saber.

						Alan preguntó lo obvio: "¿cómo sabemos cómo afecta cada tarjetita a
						las stats del representante?". No se podía, porque los efectos
						estaban escritos a mano adentro del código que los aplica. Ahora se
						declaran, y esto muestra exactamente lo que el motor va a cobrar.
						Ver `gestion.ts`.
					-->
					<span class="mueve">
						{#if gana.length > 0 || g.ademas?.siSale}
							<span class="fila">
								<span class="cuando sube">Si sale</span>
								<span class="chips">
									{#each gana as chip (chip.texto)}
										<span class="chip {chip.tono}">{chip.texto}</span>
									{/each}
									{#if g.ademas?.siSale}<span class="chip sube">{g.ademas.siSale}</span>{/if}
								</span>
							</span>
						{/if}
						{#if pierde.length > 0 || g.ademas?.siFalla}
							<span class="fila">
								<span class="cuando baja">Si no</span>
								<span class="chips">
									{#each pierde as chip (chip.texto)}
										<span class="chip {chip.tono}">{chip.texto}</span>
									{/each}
									{#if g.ademas?.siFalla}<span class="chip baja">{g.ademas.siFalla}</span>{/if}
								</span>
							</span>
						{/if}
					</span>
				{/snippet}
			</Opcion>
		{/each}
	</Paso>
{/if}

<!-- ---------- Fase 3: el mercado, en dos tiempos ---------- -->
<!--
	Ya no es un `Paso` plegable como los demás.

	El mercado dejó de ser una lista de tres ofertas que los dos miraban igual:
	ahora tiene dos tiempos y en cada uno hay un rol distinto haciendo algo
	distinto —o esperando—. Eso no entra en un desplegable con un título y un
	elegido, así que tiene su propia caja. Ver `Mercado.svelte` y `cartas.ts`.
-->
<Mercado {opciones} {estado} {rol} bind:filtradas bind:destino />

<style>
	/*
	 * Los tres planes de pretemporada, uno al lado del otro.
	 *
	 * Con `auto-fit` y no con una consulta de ancho: este bloque vive adentro de
	 * una columna que cambia de ancho según la pantalla, y `minmax` resuelve solo
	 * lo mismo —tres en fila donde entran, apilados donde no— sin tener que saber
	 * de antemano cuánto mide el contenedor.
	 */
	.enFila {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr));
	}

	/* Lo que mueve una gestión: los mismos chips que ya tienen los momentos. */
	.mueve {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.55rem;
	}
	.mueve .fila {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
	}
	.cuando {
		flex: none;
		width: 3.4rem;
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.cuando.sube {
		color: var(--acento);
	}
	.cuando.baja {
		color: var(--malo);
	}
	.mueve .chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	/*
	 * Una pregunta con sus respuestas adentro.
	 *
	 * La primera pantalla del juego eran ocho tarjetas iguales en fila: el
	 * encabezado de una decisión tenía exactamente el mismo peso visual que las
	 * opciones de la decisión anterior, así que no se veía dónde terminaba una y
	 * empezaba la otra. Alan lo dijo mirándola: "las opciones tienen casi el
	 * mismo formato que el título, no sabés qué estás eligiendo".
	 *
	 * El bloque hace lo mínimo que hace falta: una caja, el enunciado arriba con
	 * su color, y las respuestas hundidas adentro. Es el mismo patrón que ya
	 * usaba "cómo vas a jugar el año", que era el único que se leía bien.
	 */
	.decision {
		margin: 0 0 1.1rem;
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-left: 3px solid var(--tema, var(--acento));
		border-radius: var(--radio);
		overflow: hidden;
	}
	.decision[data-tema='cancha'] {
		--tema: var(--acento);
	}
	.decision[data-tema='oro'] {
		--tema: var(--espera);
	}
	.pregunta {
		padding: 1rem 1.1rem 0.9rem;
		border-bottom: 1px solid var(--borde);
		background: var(--tarjeta-alta);
	}
	.pregunta h3 {
		margin: 0 0 0.45rem;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--tema, var(--acento));
	}
	/* Las respuestas, hundidas: se ve que están adentro de la pregunta. */
	.respuestas {
		padding: 0.9rem 1.1rem 0.4rem;
	}
	.respuestas :global(.opcion:last-child) {
		margin-bottom: 0.5rem;
	}
	@container (min-width: 34rem) {
		.respuestas {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 0.8rem;
		}
	}
	/*
	 * La línea del año: qué pasó, qué toca y qué falta.
	 *
	 * Es un índice, no el contenido. El momento en sí se abre encima de todo
	 * —ver `Momento.svelte`—; acá abajo solo queda la forma del año, que se lee
	 * de un vistazo y se puede volver a abrir cualquiera de los que ya pasaron.
	 */
	.linea {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.fila {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		border: 1px solid var(--borde);
		background: var(--tarjeta);
		color: var(--texto);
		text-align: left;
		font: inherit;
	}
	button.fila {
		cursor: pointer;
	}
	button.fila:hover {
		background: var(--tarjeta-alta);
	}
	.n {
		flex: none;
		width: 1.6rem;
		height: 1.6rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		font-size: 0.78rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		background: rgba(255, 255, 255, 0.07);
		color: var(--tenue);
	}
	.que {
		flex: 1;
		min-width: 0;
		line-height: 1.25;
	}
	.que b {
		display: block;
		font-size: 0.92rem;
	}
	.que i {
		font-style: normal;
		font-size: 0.78rem;
		color: var(--tenue);
	}
	.comoSalio {
		flex: none;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--tenue);
	}

	/* El que toca: es el único que pide algo, así que es el único encendido. */
	.fila.ahora {
		border-color: var(--acento);
		background: rgba(74, 222, 128, 0.08);
	}
	.fila.ahora .n {
		background: var(--acento);
		color: #0b0e13;
	}
	.fila.ahora .comoSalio {
		color: var(--acento);
	}

	/* Los ya jugados: se leen, y se pueden volver a mirar. */
	.fila.jugado .comoSalio {
		color: var(--acento);
	}
	.fila.fallo .comoSalio {
		color: var(--malo);
	}

	/* La que todavía no pasó: se sabe que viene y nada más. */
	.fila.porVenir {
		border-style: dashed;
		background: transparent;
		color: var(--tenue);
		font-size: 0.84rem;
	}

	/* El objetivo ya cerrado: se lee, no se toca. */
	.yaElegido {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 0.6rem;
		margin: 0 0 1rem;
		padding: 0.85rem 1rem;
		background: rgba(74, 222, 128, 0.06);
		border: 1px dashed rgba(74, 222, 128, 0.3);
		border-radius: 12px;
	}
	.yaElegido .rotulo {
		width: 100%;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.yaElegido strong {
		font-size: 1.02rem;
	}
	.yaElegido p {
		width: 100%;
	}

	.subtitulo {
		margin: 1rem 0 0.5rem;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tenue);
	}

	.acambio {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.82rem;
		font-style: italic;
		color: var(--tenue);
	}
	.consejo {
		border-color: rgba(74, 222, 128, 0.3);
		background: rgba(74, 222, 128, 0.07);
	}
</style>
