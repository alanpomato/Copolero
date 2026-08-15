<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { QUEDARSE } from '$lib/engine/pases';
	import type { OpcionesDeFase } from '$lib/engine/pantalla';
	import type { Estado, Rol } from '$lib/engine/tipos';
	import Escudo from './Escudo.svelte';
	import Opcion from './Opcion.svelte';

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
		rol
	}: { opciones: OpcionesDeFase; estado: Estado; rol: Rol } = $props();

	// Elecciones por defecto: las mismas que toma el motor si nadie toca nada.
	let plan = $state('fisico');
	let intensidad = $state('firme');
	let gestion = $state('acompanar');
	let destino = $state(QUEDARSE);
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

	function comoJuega(brecha: number): string {
		if (brecha >= 10) return 'Sos la figura';
		if (brecha >= 2) return 'Titular';
		if (brecha >= -5) return 'Peleás el puesto';
		return 'Te sentás en el banco';
	}
</script>

<!-- ---------- Fase 1: pretemporada ---------- -->
{#if opciones.planes}
	<div class="tarjeta">
		<h3>Qué entrenás</h3>
		{#each opciones.planes as p (p.id)}
			<Opcion
				grupo="entrenamiento"
				valor={p.id}
				titulo={p.nombre}
				detalle={p.detalle}
				bind:elegido={plan}
			/>
		{/each}
	</div>

	<div class="tarjeta">
		<h3>Con cuánta intensidad</h3>
		<p class="sutil" style="margin:-.35rem 0 .8rem">
			A los {estado.futbolista.edad} años, con {estado.futbolista.desgaste} de desgaste. Lo que
			ganás de más lo paga el cuerpo.
		</p>
		{#each opciones.intensidades ?? [] as i (i.id)}
			<Opcion
				grupo="intensidad"
				valor={i.id}
				titulo={i.nombre}
				detalle={`${i.detalle} Desgaste +${i.desgaste}.`}
				bind:elegido={intensidad}
			/>
		{/each}
	</div>
{/if}

<!-- ---------- Fase 2: la rueda de ocasión ---------- -->
{#if opciones.ocasiones}
	<p class="sutil" style="margin:0 0 1rem">
		Tres momentos de la temporada. Las probabilidades salen de tus atributos y son las de verdad:
		lo que dice el número es lo que se tira.
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
	<div class="tarjeta">
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
	<div class="tarjeta">
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
						<span>Pase: {plata(oferta.montoUsd)}</span>
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
</style>
