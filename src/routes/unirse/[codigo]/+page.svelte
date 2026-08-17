<script lang="ts">
	import { enhance } from '$app/forms';
	import { puesto as puestoPorId } from '$lib/engine/puestos';
	import ClubLinea from '$lib/ui/ClubLinea.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const NOMBRE_ROL: Record<string, string> = {
		futbolista: 'futbolista',
		representante: 'representante'
	};
</script>

<svelte:head>
	<title>Entrar a la partida {data.codigo} — Copolero</title>
</svelte:head>

<div class="angosta">
	<h1>Entrar</h1>
	<p class="bajada">
		{#if data.anfitrion}
			{data.anfitrion} te invitó a jugar.
		{:else}
			Partida {data.codigo}.
		{/if}
	</p>

	<div class="tarjeta">
		<h3>La carrera</h3>
		<p style="margin:0 0 .8rem">
			<strong>{data.futbolista.nombre}</strong>, {data.futbolista.edad} años,
			{puestoPorId(data.futbolista.puesto).nombre.toLowerCase()}, la {data.futbolista.numero}.
		</p>
		<ClubLinea clubId={data.futbolista.clubId} tamano={38} />
	</div>

	{#if data.rolLibre}
		<div class="tarjeta" data-tema="relacion">
			<h3>Tu rol</h3>
			<p style="margin:0 0 .5rem">
				Vas a jugar como <strong>{NOMBRE_ROL[data.rolLibre]}</strong>, y en la partida te llamás
				<strong>{data.nombreQueLeToca}</strong>.
			</p>
			<p class="sutil" style="margin:0">
				Es el que quedó libre. Los dos nombres los eligió quien armó la partida.
			</p>
		</div>

		{#if form?.problema}
			<div class="error">{form.problema}</div>
		{/if}

		<form method="POST" use:enhance>
			<button type="submit">Entrar como {data.nombreQueLeToca}</button>
		</form>
	{:else}
		<div class="error">Esta partida ya tiene sus dos jugadores.</div>
		<p class="sutil">
			Si vos sos uno de los dos, entrá con el link que te quedó guardado. Si no, <a href="/"
				>armá una partida nueva</a
			>.
		</p>
	{/if}
</div>
