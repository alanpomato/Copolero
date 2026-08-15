<script lang="ts">
	import { enhance } from '$app/forms';
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
	<p style="margin:0">
		<strong>{data.futbolista.nombre}</strong>, {data.futbolista.edad} años,
		{data.futbolista.posicion} en {data.futbolista.club}.
	</p>
</div>

{#if data.rolLibre}
	<div class="tarjeta">
		<h3>Tu rol</h3>
		<p style="margin:0 0 .5rem">
			Vas a jugar como <strong>{NOMBRE_ROL[data.rolLibre]}</strong>.
		</p>
		<p class="sutil" style="margin:0">Es el rol que quedó libre en esta partida.</p>
	</div>

	{#if form?.problema}
		<div class="error">{form.problema}</div>
	{/if}

	<form method="POST" use:enhance>
		<label>
			<span class="titulo">Tu nombre</span>
			<input name="nombre" maxlength="60" required placeholder="Hernán" />
		</label>
		<button type="submit">Entrar como {NOMBRE_ROL[data.rolLibre]}</button>
	</form>
{:else}
	<div class="error">Esta partida ya tiene sus dos jugadores.</div>
	<p class="sutil">
		Si vos sos uno de los dos, entrá con el link que te quedó guardado. Si no, <a href="/"
			>armá una partida nueva</a
		>.
	</p>
{/if}
