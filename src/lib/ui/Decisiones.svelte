<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { loQuePromete } from '$lib/engine/entrenamiento';
	import { QUEDARSE } from '$lib/engine/pases';
	import { ESPERAR, FIRMAR } from '$lib/engine/renovacion';
	import { NOMBRE_ATRIBUTO } from '$lib/engine/puestos';
	import { SIN_TRATO } from '$lib/engine/representacion';
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import type { Atributos, Estado, Rol } from '$lib/engine/tipos';
	import AtributosLista from './Atributos.svelte';
	import Escudo from './Escudo.svelte';
	import Opcion from './Opcion.svelte';

	/**
	 * El cuerpo del formulario de la fase: cambia según la fase y el rol.
	 *
	 * Todo lo que se muestra acá vino del servidor ya filtrado por rol. El
	 * futbolista nunca recibe las gestiones del representante ni al revés, así
	 * que no hay nada que esconder del lado del navegador.
	 */
	let { opciones, estado, rol }: { opciones: OpcionesDeFase; estado: Estado; rol: Rol } = $props();

	// Elecciones por defecto: las mismas que toma el motor si nadie toca nada.
	let plan = $state('fisico');
	let intensidad = $state('firme');
	let gestion = $state('acompanar');
	let destino = $state(QUEDARSE);
	let acuerdo = $state('estandar');
	let renovacion = $state(FIRMAR);
	let ocasiones = $state<string[]>([]);

	$effect(() => {
		const cuantas = opciones.ocasiones?.length ?? 0;
		if (ocasiones.length !== cuantas) {
			// Por defecto, la opción más conservadora: la última de cada lista.
			ocasiones = (opciones.ocasiones ?? []).map((o) => o.opciones[o.opciones.length - 1].id);
		}
	});

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

	function comoJuega(brecha: number): string {
		if (brecha >= 10) return 'Sos la figura';
		if (brecha >= 2) return 'Titular';
		if (brecha >= -5) return 'Peleás el puesto';
		return 'Te sentás en el banco';
	}
</script>

<!-- ---------- Cuando vence el contrato con el club ---------- -->
{#if opciones.renovacion}
	{@const r = opciones.renovacion}
	<div class="tarjeta" data-tema="plata">
		<h3>{r.libre ? 'Quedó libre' : 'Se le vence el contrato'}</h3>
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
			<p class="sutil" style="margin:0">
				Tienen que <strong>elegir lo mismo</strong> para que pase algo. Si uno firma y el otro espera,
				no se firma nada y la relación lo paga.
			</p>
		{/if}
	</div>

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
{/if}

<!-- ---------- Cuando vence el contrato entre los dos ---------- -->
{#if opciones.tratos}
	<div class="tarjeta" data-tema="relacion">
		<h3>La mesa</h3>
		<p style="margin:0 0 .5rem">Se venció el contrato entre ustedes. Hay que firmar de nuevo.</p>
		<p class="sutil" style="margin:0">
			{#if rol === 'futbolista'}
				Elegí <strong>hasta dónde estás dispuesto a llegar</strong>. Si él pide menos o lo mismo,
				hay trato al número que pidió. Si pide más, no hay acuerdo y siguen con lo de antes un año
				más, con la relación golpeada.
			{:else}
				Elegí <strong>cuánto pedís</strong>. Si él llega hasta ahí o más, firman a tu número. Si te
				pasás, no hay acuerdo. Lo que podés pedir depende de tu prestigio y tu negociación.
			{/if}
		</p>
	</div>

	{#if opciones.consejo}
		<div class="tarjeta consejo" data-tema="relacion">
			<p style="margin:0">{opciones.consejo}</p>
		</div>
	{/if}

	{#each opciones.tratos as t (t.id)}
		<Opcion grupo="trato" valor={t.id} titulo={t.nombre} detalle={t.detalle} bind:elegido={acuerdo}>
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
{/if}

<!-- ---------- Fase 1: pretemporada ---------- -->
{#if opciones.planes}
	<div class="tarjeta" data-tema="cancha">
		<h3>Qué entrenás</h3>
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

	<div class="tarjeta" data-tema="cancha">
		<h3>Con cuánta intensidad</h3>
		<p class="sutil" style="margin:-.35rem 0 .8rem">
			Tenés {estado.futbolista.edad} años y {estado.futbolista.desgaste} de desgaste. Lo que ganás de
			más lo paga el cuerpo, y después de los 30 esa cuenta deja de cerrar.
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
	</div>

	<div class="tarjeta" data-tema="cancha">
		<h3>Cómo estás hoy</h3>
		<p class="sutil" style="margin:-.35rem 0 .85rem">
			Lo verde es lo que va a subir con <strong>{subeDe(plan).toLowerCase()}</strong>.
		</p>
		<AtributosLista atributos={estado.futbolista.atributos} destacados={queSube} />
	</div>
{/if}

<!-- ---------- Fase 2: la rueda de ocasión ---------- -->
{#if opciones.ocasiones}
	<p class="sutil" style="margin:0 0 1rem">
		Tres momentos de la temporada. Las probabilidades salen de tus atributos y son las de verdad: lo
		que dice el número es lo que se tira.
	</p>

	{#each opciones.ocasiones as ocasion, i (ocasion.id)}
		<div class="tarjeta">
			<h3>{i + 1} · {ocasion.titulo}</h3>
			<p style="margin:0 0 .9rem">{ocasion.contexto}</p>
			{#each ocasion.opciones as opcion (opcion.id)}
				<Opcion
					grupo={`ocasion-${i}`}
					valor={opcion.id}
					titulo={opcion.etiqueta}
					detalle={opcion.detalle}
					probabilidad={opcion.probabilidad}
					bind:elegido={ocasiones[i]}
				/>
			{/each}
		</div>
	{/each}
{/if}

<!-- ---------- Fases 1 y 2: la gestión del representante ---------- -->
{#if opciones.gestiones}
	<div class="tarjeta" data-tema="plata">
		<h3>Qué hacés esta fase</h3>
		<p class="sutil" style="margin:-.35rem 0 .8rem">
			Una sola. Las probabilidades salen de tu negociación, tu scouting y tus contactos.
		</p>
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
	</div>
{/if}

<!-- ---------- Fase 3: el mercado ---------- -->
{#if opciones.ofertas}
	<div class="tarjeta" data-tema="mercado">
		<h3>El mercado</h3>
		<p style="margin:0 0 .5rem">
			Hoy vale <strong>{plata(opciones.valorDeMercadoUsd ?? 0)}</strong>.
		</p>
		<p class="sutil" style="margin:0">
			El pase se hace <strong>solo si los dos eligen el mismo club</strong>. Si no coinciden, no hay
			pase y la confianza se paga. Hablalo antes de cerrar.
		</p>
	</div>

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
{/if}

<style>
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
