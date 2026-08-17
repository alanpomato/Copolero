<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { loQuePromete } from '$lib/engine/entrenamiento';
	import { QUEDARSE } from '$lib/engine/pases';
	import { NADA } from '$lib/engine/inversiones';
	import { NOMBRE_ATRIBUTO as ATRIBUTO } from '$lib/engine/puestos';
	import { OBJETIVO_POR_DEFECTO } from '$lib/engine/objetivos';
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
	import Opcion from './Opcion.svelte';
	import Paso from './Paso.svelte';
	import Ruleta from './Ruleta.svelte';

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
	let destino = $state(QUEDARSE);
	let acuerdo = $state('estandar');
	let renovacion = $state(FIRMAR);
	let objetivo = $state(OBJETIVO_POR_DEFECTO);
	let compra = $state(NADA);
	let rasgo = $state('');
	let sueno = $state('');
	let salida = $state('');

	$effect(() => {
		const tres = opciones.rasgos ?? [];
		if (tres.length > 0 && !tres.some((r) => r.id === rasgo)) rasgo = tres[0].id;
	});
	$effect(() => {
		const posibles = opciones.suenos ?? [];
		if (posibles.length > 0 && !posibles.some((s) => s.id === sueno)) sueno = posibles[0].id;
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

	function seguir(cuantas: number) {
		if (abierta < cuantas - 1) abierta += 1;
	}

	$effect(() => {
		const cuantas = opciones.ocasiones?.length ?? 0;
		if (ocasiones.length !== cuantas) {
			// Por defecto, la opción más conservadora: la última de cada lista.
			ocasiones = (opciones.ocasiones ?? []).map((o) => o.opciones[o.opciones.length - 1].id);
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

	/** Lo que tarda la rueda en frenar. Tiene que ser lo mismo que la animación. */
	const LO_QUE_TARDA_EN_FRENAR = 2700;

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
		const cuantas = opciones.ocasiones?.length ?? 0;
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
		const temporada = (opciones.ocasiones ?? []).map((o) => o.id).join('|');
		if (temporada === acomodadaPara) return;
		acomodadaPara = temporada;
		abierta = Math.max(0, destapadas - 1);
	});

	async function tirar(i: number) {
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
				setTimeout(() => (contado = i), LO_QUE_TARDA_EN_FRENAR);
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
	const queCompra = $derived(
		compra === NADA
			? 'No gastar nada'
			: (opciones.inversiones?.puedeComprar.find((i) => i.id === compra)?.nombre ?? '')
	);
	const queGestiona = $derived(opciones.gestiones?.find((g) => g.id === gestion)?.nombre ?? '');
	const queObjetivo = $derived(opciones.objetivos?.find((o) => o.id === objetivo)?.nombre ?? '');
	const queTrato = $derived(
		acuerdo === SIN_TRATO
			? 'No firmar'
			: (opciones.tratos?.find((t) => t.id === acuerdo)?.nombre ?? '')
	);
	const queDestino = $derived(
		destino === QUEDARSE ? `Quedarse en ${clubActual}` : contexto(destino).club.nombre
	);

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
					: opciones.objetivos
						? 'objetivo'
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
	<div class="tarjeta" data-tema="cancha">
		<h3>¿Qué clase de jugador sos?</h3>
		<p style="margin:0 0 .5rem">
			El azar te trajo tres. Elegí uno: <strong>te define para toda la carrera</strong> y no se cambia
			nunca más.
		</p>
		<p class="sutil" style="margin:0">
			Ninguno es mejor que otro. El olfato de gol hace goleadores y el pulmón hace jugadores que
			llegan a los 36.
		</p>
	</div>

	{#each opciones.rasgos as r (r.id)}
		<Opcion grupo="rasgo" valor={r.id} titulo={r.nombre} detalle={r.detalle} bind:elegido={rasgo}>
			{#snippet extra()}
				<span class="sube">
					<span class="chip-sube gana">+{r.cuanto} {ATRIBUTO[r.atributo]}</span>
					<span class="chip-sube">{r.siempre}</span>
				</span>
			{/snippet}
		</Opcion>
	{/each}
{/if}

<!-- ---------- Para qué vas a jugar ---------- -->
{#if opciones.suenos && opciones.suenos.length > 0}
	<div class="tarjeta" data-tema="oro">
		<h3>¿Para qué vas a jugar?</h3>
		<p style="margin:0 0 .5rem">
			Elegí una sola cosa. No se cambia, no se puede apurar y no se cumple en una temporada:
			<strong>es adónde va a haber llegado esta carrera cuando termine</strong>.
		</p>
		<p class="sutil" style="margin:0">
			{estado.futbolista.nombre} tiene {estado.futbolista.edad} años. Lo que elijas acá se va a ver en
			todas las pantallas hasta el último día.
		</p>
	</div>

	{#each opciones.suenos as s (s.id)}
		<Opcion grupo="sueno" valor={s.id} titulo={s.nombre} detalle={s.detalle} bind:elegido={sueno}>
			{#snippet extra()}
				<span class="sube">
					<span class="chip-sube gana">{s.meta}</span>
				</span>
			{/snippet}
		</Opcion>
	{/each}
{/if}

<!-- ---------- En qué gastar la plata ---------- -->
{#if opciones.inversiones}
	{@const inv = opciones.inversiones}
	<Paso
		titulo="Comprar para la temporada"
		elegido={queCompra}
		dato={queCompra === 'No gastar nada' ? `Tenés ${plata(inv.plataUsd)}` : ''}
		tema="plata"
		nota="Preparador, fisio, botines, la casa de la familia. Lo que comprás se paga una vez y después cuesta todos los años; si un año no te alcanza, lo perdés."
	>
		<div class="cifras" style="margin-bottom:.9rem">
			<div class="cifra">
				<span class="valor" style="font-size:1.1rem">{plata(inv.plataUsd)}</span>
				<span class="etiqueta">Tenés</span>
			</div>
			{#if inv.gastoAnualUsd > 0}
				<div class="cifra">
					<span class="valor" style="font-size:1.1rem">{plata(inv.gastoAnualUsd)}</span>
					<span class="etiqueta">Se te va por año</span>
				</div>
			{/if}
		</div>
		{#if inv.tiene.length > 0}
			<ul class="tenes" style="margin-bottom:1rem">
				{#each inv.tiene as i (i.id)}
					<li>
						<b>{i.nombre}</b> — {i.efecto}
						{#if i.dura}<span class="restan">queda{i.dura > 1 ? 'n' : ''} poco</span>{/if}
					</li>
				{/each}
			</ul>
		{/if}

		{#if inv.puedeComprar.length > 0}
			<Opcion
				grupo="inversion"
				valor={NADA}
				titulo="No gastar nada este año"
				detalle="Guardarla. Nunca está mal."
				bind:elegido={compra}
			/>
			{#each [{ titulo: 'Para siempre · se paga todos los años', cuales: inv.puedeComprar.filter((i) => !i.dura) }, { titulo: 'Por una o dos temporadas · se paga una vez', cuales: inv.puedeComprar.filter((i) => i.dura) }] as grupo (grupo.titulo)}
				{#if grupo.cuales.length > 0}
					<p class="subtitulo">{grupo.titulo}</p>
					{#each grupo.cuales as i (i.id)}
						<Opcion
							grupo="inversion"
							valor={i.id}
							titulo={i.nombre}
							detalle={i.detalle}
							bind:elegido={compra}
							deshabilitada={inv.plataUsd < i.precioUsd}
						>
							{#snippet extra()}
								<span class="sube">
									<span class="chip-sube gana">{i.efecto}</span>
									<span class="chip-sube {inv.plataUsd < i.precioUsd ? 'pierde' : ''}">
										{plata(i.precioUsd)}{inv.plataUsd < i.precioUsd ? ' · no te alcanza' : ''}
									</span>
									{#if i.porTemporadaUsd > 0}
										<span class="chip-sube pierde">{plata(i.porTemporadaUsd)} por año</span>
									{/if}
								</span>
							{/snippet}
						</Opcion>
					{/each}
				{/if}
			{/each}
		{/if}
	</Paso>
{/if}

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
				No hay nada que decidir acá. La decisión es en el mercado, al final de la temporada.
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

		<p class="subtitulo">
			Con cuánta intensidad · {estado.futbolista.edad} años, {estado.futbolista.desgaste} de desgaste
		</p>
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
	</Paso>
{/if}

<!-- ---------- Fase 2: cómo va a jugar el año ---------- -->
{#if opciones.objetivos}
	<Paso
		titulo="Cómo vas a jugar el año"
		elegido={queObjetivo}
		tema="cancha"
		abierto={abierto === 'objetivo'}
		nota="Es la decisión que más mueve la temporada. Ninguna es mejor que otra: cada una sube una parte y baja otra."
	>
		{#if opciones.consejoDelObjetivo}
			<p class="sutil" style="margin:-.4rem 0 1rem">{opciones.consejoDelObjetivo}</p>
		{/if}

		{#each opciones.objetivos as o (o.id)}
			<Opcion
				grupo="objetivo"
				valor={o.id}
				titulo={o.nombre}
				detalle={o.detalle}
				bind:elegido={objetivo}
			>
				{#snippet extra()}
					<span class="sube">
						<span class="chip-sube gana">{o.sube}</span>
						<span class="chip-sube pierde">{o.cuesta}</span>
					</span>
				{/snippet}
			</Opcion>
		{/each}
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
			Se eligió en la pretemporada y ya no se cambia: el campeonato empezó.
		</p>
	</div>
{/if}

<!-- ---------- Fase 2: la rueda de ocasión ---------- -->
{#if opciones.ocasiones}
	{@const cuantas = opciones.ocasiones.length}
	<div class="momentos">
		<p class="sutil" style="margin:0 0 1rem">
			{cuantas} momentos de la temporada, uno por vez. Elegís, tirás, y ahí mismo sabés qué pasó. Las
			probabilidades salen de tus atributos y son las de verdad: lo que dice el número es lo que se tira,
			y se tira una sola vez.
		</p>

		{#each opciones.ocasiones as ocasion, i (ocasion.id)}
			{@const tirada = hechas[i]}
			{@const elegida =
				ocasion.opciones.find((o) => o.id === (tirada?.opcionId ?? ocasiones[i])) ??
				ocasion.opciones[0]}
			{@const yaPaso = i < destapadas}
			{@const esLaDeAhora = i === abierta && yaPaso}

			{#if !yaPaso}
				<!-- Todavía no pasó. Se sabe que viene, y nada más. -->
				<p class="porVenir">
					{i + 1} · Todavía no pasó
				</p>
			{:else if !esLaDeAhora}
				<!-- Ya la jugó: una línea con lo que eligió y cómo le fue. -->
				<button
					type="button"
					class="resuelta"
					class:fallo={tirada && !tirada.salio}
					onclick={() => (abierta = i)}
				>
					<span class="cual">{i + 1} · {ocasion.titulo}</span>
					<span class="loQueElegi">{elegida.etiqueta}</span>
					<span class="pct">
						{#if tirada}{tirada.salio ? 'Entró' : 'No'}{:else}{elegida.probabilidad}%{/if}
					</span>
				</button>
			{:else}
				<div class="tarjeta ocasion" class:jugada={!!tirada}>
					<p class="numeroDeMomento">Momento {i + 1} de {cuantas}</p>
					<h3>{ocasion.titulo}</h3>
					<p style="margin:0 0 .9rem">{ocasion.contexto}</p>

					<!--
						La rueda al costado de las opciones, no arriba.
						Estaba arriba y era un problema de verdad: la rueda muestra la
						probabilidad de la opción elegida, así que al bajar a leer la tercera
						opción ya no se veía el número que esa opción produce. Al costado se
						mira la rueda y la opción al mismo tiempo, que es de lo que se trata
						elegir acá.
					-->
					<div class="apuesta">
						<div class="rueda">
							<Ruleta
								probabilidad={elegida.probabilidad}
								etiqueta={elegida.etiqueta}
								resultado={tirada ? { salio: tirada.salio } : null}
								tirando={tirando === i}
								yaEstaba={!!tirada && recienTirada !== i}
							/>
							{#if !tirada}
								<p class="sutil siSale">{elegida.siSale}</p>
							{/if}
						</div>

						<div class="cuales">
							{#each ocasion.opciones as opcion (opcion.id)}
								<Opcion
									grupo={`ocasion-${i}`}
									valor={opcion.id}
									titulo={opcion.etiqueta}
									detalle={opcion.detalle}
									probabilidad={opcion.probabilidad}
									bind:elegido={ocasiones[i]}
									bloqueado={!!tirada}
								/>
							{/each}
						</div>
					</div>

					{#if tirada && (recienTirada !== i || contado === i)}
						<!--
							Lo que pasó. Aparece cuando la rueda frenó: contarlo antes sería
							contar el final con la pelota todavía en el aire.
						-->
						{#if tirada.texto}
							<p class="loQuePaso" class:mal={!tirada.salio}>{tirada.texto}</p>
						{/if}
						{#if i < cuantas - 1}
							<button type="button" class="secundario siguiente" onclick={() => seguir(cuantas)}>
								¿Y qué pasó después?
							</button>
						{/if}
					{:else if tirada}
						<p class="loQuePaso esperando">…</p>
					{:else}
						<button type="button" class="tirarla" disabled={tirando === i} onclick={() => tirar(i)}>
							{tirando === i ? 'Girando…' : `Jugártela · ${elegida.probabilidad}%`}
						</button>
						<p class="aviso">Una sola vez. Lo que salga, salió.</p>
					{/if}

					{#if problema && tirando !== i}
						<p class="problema">{problema}</p>
					{/if}
				</div>
			{/if}

			<!--
				Las que no están abiertas igual mandan su elección.
				Un input escondido con `display:none` se envía igual que uno visible
				—lo que no se envía es uno deshabilitado—, así que la fase se resuelve
				completa aunque el jugador no haya vuelto a mirar la primera. Y si el
				navegador no tiene JavaScript, acá quedan las tres con su opción por
				defecto, que es lo mismo que toma el motor cuando nadie elige.

				También hace falta para la que está abierta y ya se tiró: ahí los radios
				quedan deshabilitados, y un radio deshabilitado no viaja. Igual, lo que
				manda es lo que el servidor tiene escrito.
			-->
			{#if !esLaDeAhora || tirada}
				<div hidden>
					<input type="radio" name={`ocasion-${i}`} value={ocasiones[i] ?? ''} checked />
				</div>
			{/if}
		{/each}
	</div>
{/if}

{#if opciones.salida}
	<!--
		Pedir salir.

		Va acá abajo y chico, y no arriba con las decisiones del año, porque no es
		una decisión del año: es algo que se hace una vez en toda una carrera, si
		se hace. Estaba arriba de todo y ocupaba una tarjeta entera, así que cada
		temporada la pantalla arrancaba preguntándole al jugador si se quería ir
		del club —una pregunta que casi siempre se contesta que no—. Lo que se
		usa siempre va arriba; esto se usa cuando pasa algo, y cuando pasa, se
		busca.
	-->
	<details class="salida" open={salida === PIDE}>
		<summary>
			<span class="que">¿Te querés ir de {clubActual}?</span>
			<span class="como">{salida === PIDE ? 'Lo pediste' : 'Pedir salir del club'}</span>
		</summary>

		<div class="adentro">
			<p class="elAviso">{opciones.salida.aviso}</p>

			<Opcion
				grupo="pedirSalida"
				valor=""
				titulo="Seguir como si nada"
				detalle="No decís nada. El club sigue contando con vos y el mercado, con lo que llegue solo."
				bind:elegido={salida}
			/>
			<Opcion
				grupo="pedirSalida"
				valor={PIDE}
				titulo="Decir que te querés ir"
				detalle="Se lo decís a tu representante y al club. De ahí en adelante se sabe que estás en venta."
				bind:elegido={salida}
			>
				{#snippet extra()}
					<span class="sube">
						<span class="chip-sube gana">Más ofertas en el mercado, y más baratas</span>
						<span class="chip-sube pierde">El técnico: −{LO_QUE_CUESTA_CON_EL_DT}</span>
						<span class="chip-sube pierde">La hinchada: −{LO_QUE_CUESTA_CON_LA_HINCHADA}</span>
					</span>
				{/snippet}
			</Opcion>
		</div>
	</details>
{/if}

<!-- ---------- Fases 1 y 2: la gestión del representante ---------- -->
{#if opciones.gestiones}
	<Paso
		titulo="Qué hacés esta fase"
		elegido={queGestiona}
		tema="plata"
		abierto={abierto === 'gestion'}
		nota="Una sola. Las probabilidades salen de tu negociación, tu scouting y tus contactos."
	>
		{#each opciones.gestiones as g (g.id)}
			<Opcion
				grupo="gestion"
				valor={g.id}
				titulo={g.nombre}
				detalle={g.detalle}
				probabilidad={g.probabilidad}
				bind:elegido={gestion}
			/>
		{/each}
	</Paso>
{/if}

<!-- ---------- Fase 3: el mercado ---------- -->
{#if opciones.ofertas}
	<Paso
		titulo="El mercado"
		elegido={queDestino}
		tema="mercado"
		abierto={abierto === 'mercado'}
		nota="El pase se hace solo si los dos eligen el mismo club. Si no coinciden, no hay pase y la confianza se paga. Hablalo antes de cerrar."
	>
		<p style="margin:-.4rem 0 1rem">
			Hoy vale <strong>{plata(opciones.valorDeMercadoUsd ?? 0)}</strong>.
		</p>

		<Opcion
			grupo="destino"
			valor={QUEDARSE}
			titulo="Quedarse"
			detalle={`Sigue en ${contexto(estado.futbolista.contrato.clubId).club.nombre}, por ${estado.futbolista.contrato.temporadasRestantes} ${estado.futbolista.contrato.temporadasRestantes === 1 ? 'temporada' : 'temporadas'} más.`}
			bind:elegido={destino}
		/>

		{#each opciones.ofertas as oferta (oferta.clubId)}
			<Opcion
				grupo="destino"
				valor={oferta.clubId}
				titulo={contexto(oferta.clubId).club.nombre}
				detalle={`${contexto(oferta.clubId).liga.nombre} · ${contexto(oferta.clubId).pais.nombre}`}
				bind:elegido={destino}
			>
				{#snippet extra()}
					<span class="oferta">
						<Escudo clubId={oferta.clubId} tamano={30} />
						<span class="numeros">
							<span><b>{plata(oferta.salarioMensual)}</b> por mes</span>
							<span>{oferta.temporadas} temporadas</span>
							{#if oferta.montoUsd > 0}
								<span>Pase: {plata(oferta.montoUsd)}</span>
							{:else}
								<span>Llega libre, sin pase</span>
							{/if}
							{#if oferta.primaUsd > 0}
								<span class="mio">Prima al firmar: {plata(oferta.primaUsd)}</span>
							{/if}
							{#if rol === 'representante'}
								<span class="mio">Tu comisión: {plata(oferta.comisionUsd)}</span>
							{/if}
							<span class:mio={rol === 'futbolista'}>{comoJuega(oferta.brecha)}</span>
							{#if oferta.tecnico}<span>Te dirige {oferta.tecnico}</span>{/if}
						</span>
					</span>
				{/snippet}
			</Opcion>
		{/each}
	</Paso>
{/if}

<style>
	/* La ocasión se mide a sí misma: en la columna del medio hay lugar para poner
	   la rueda al costado, en el celular no. */
	.ocasion {
		container-type: inline-size;
	}
	.numeroDeMomento {
		margin: 0 0 0.15rem;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--acento);
	}
	.siguiente {
		margin-top: 1rem;
	}

	/* La que todavía no pasó: se sabe que viene y nada más. */
	.porVenir {
		margin: 0 0 0.6rem;
		padding: 0.7rem 1rem;
		border: 1px dashed var(--borde);
		border-radius: 12px;
		font-size: 0.84rem;
		color: var(--tenue);
	}

	/* La ya decidida: una línea con lo que eligió, y se puede volver a abrir. */
	.resuelta {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		width: 100%;
		margin: 0 0 0.6rem;
		padding: 0.7rem 1rem;
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: 12px;
		color: var(--texto);
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.resuelta:hover {
		background: var(--tarjeta-alta);
	}
	.resuelta .cual {
		flex: none;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	.resuelta .loQueElegi {
		flex: 1;
		min-width: 0;
		font-weight: 700;
		color: var(--acento);
	}
	.resuelta .pct {
		flex: none;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		color: var(--acento);
	}
	.resuelta.fallo .loQueElegi,
	.resuelta.fallo .pct {
		color: var(--malo);
	}

	/* El botón de tirar. Es el único de la pantalla que hace algo irreversible,
	   así que es el único que se ve así: ancho, encendido y con el número puesto
	   adentro, para que no se pueda apretar sin haberlo leído. */
	.tirarla {
		width: 100%;
		margin-top: 1.1rem;
		padding: 0.95rem 1rem;
		font-size: 1.02rem;
		font-weight: 800;
		letter-spacing: 0.01em;
	}
	.tirarla:disabled {
		opacity: 0.75;
		cursor: progress;
	}
	.aviso {
		margin: 0.5rem 0 0;
		text-align: center;
		font-size: 0.76rem;
		color: var(--tenue);
	}

	/* La crónica, cuando la rueda ya frenó. */
	.loQuePaso {
		margin: 1.1rem 0 0;
		padding: 0.85rem 1rem;
		border-radius: 12px;
		border-left: 3px solid var(--acento);
		background: rgba(74, 222, 128, 0.08);
		font-size: 0.98rem;
		line-height: 1.45;
	}
	.loQuePaso.mal {
		border-left-color: var(--malo);
		background: rgba(248, 113, 113, 0.07);
	}
	.loQuePaso.esperando {
		border-left-color: var(--borde);
		background: transparent;
		color: var(--tenue);
		text-align: center;
		letter-spacing: 0.3em;
	}
	.problema {
		margin: 0.7rem 0 0;
		font-size: 0.84rem;
		color: var(--malo);
	}
	/* Ya jugada: la tarjeta deja de ser una pregunta. */
	.ocasion.jugada {
		border-color: var(--borde);
	}

	/* Pedir salir: una línea al pie, del tamaño de lo que se usa una vez cada
	   diez temporadas. Cuando se abre, se abre entera. */
	.salida {
		margin: 0.2rem 0 1.4rem;
	}
	.salida > summary {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.55rem 0.2rem;
		list-style: none;
		cursor: pointer;
		font-size: 0.84rem;
		color: var(--tenue);
		border-top: 1px solid var(--borde);
	}
	.salida > summary::-webkit-details-marker {
		display: none;
	}
	.salida > summary:hover .como {
		color: var(--texto);
	}
	.salida .como {
		flex: none;
		font-weight: 700;
		color: var(--mercado);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.salida[open] > summary {
		border-bottom: 0;
	}
	.salida .adentro {
		padding: 0.2rem 0 0.4rem;
		border-left: 2px solid var(--mercado);
		padding-left: 0.9rem;
		margin-bottom: 0.4rem;
	}
	.salida .elAviso {
		margin: 0 0 0.8rem;
		font-size: 0.88rem;
		line-height: 1.45;
	}
	.apuesta {
		display: grid;
		gap: 0.9rem;
	}
	.rueda {
		min-width: 0;
	}
	.siSale {
		margin: 0.6rem 0 0;
		text-align: center;
	}
	.cuales {
		min-width: 0;
	}
	@container (min-width: 30rem) {
		.apuesta {
			grid-template-columns: 10.5rem minmax(0, 1fr);
			gap: 1.2rem;
			align-items: center;
		}
		.siSale {
			font-size: 0.78rem;
			line-height: 1.35;
		}
		/* La última opción no arrastra el margen de abajo: deja un hueco raro
		   cuando la columna de al lado ya terminó. */
		.cuales :global(.opcion:last-child) {
			margin-bottom: 0;
		}
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

	.oferta {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		margin-top: 0.65rem;
	}
	.numeros {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.5rem;
		font-size: 0.8rem;
	}
	.numeros span {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 999px;
		padding: 0.15rem 0.55rem;
		color: var(--tenue);
	}
	.numeros span.mio {
		background: rgba(74, 222, 128, 0.14);
		color: var(--acento);
	}
	.numeros b {
		color: var(--texto);
	}
	.sube {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.4rem;
		margin-top: 0.55rem;
	}
	.chip-sube {
		font-size: 0.74rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 999px;
		padding: 0.12rem 0.5rem;
		color: var(--tenue);
	}
	.chip-sube b {
		color: var(--texto);
		font-variant-numeric: tabular-nums;
	}
	.chip-sube.gana {
		background: rgba(74, 222, 128, 0.14);
		color: var(--acento);
	}
	.chip-sube.pierde {
		background: rgba(248, 113, 113, 0.14);
		color: var(--malo);
	}
	.subtitulo {
		margin: 1rem 0 0.5rem;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tenue);
	}

	.tenes {
		list-style: none;
		margin: 0.85rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--tenue);
	}
	.tenes b {
		color: var(--texto);
	}
	.restan {
		color: var(--espera);
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
