<script lang="ts">
	import { enhance } from '$app/forms';
	import { POSICIONES } from '$lib/engine/tipos';
	import { EDAD_INICIAL_POR_DEFECTO } from '$lib/engine/estado';
	import Bandera from '$lib/ui/Bandera.svelte';
	import ClubLinea from '$lib/ui/ClubLinea.svelte';
	import { CLUB_POR_DEFECTO, clubesPorLiga, nacionalidades } from '$lib/ui/opciones';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const NOMBRE_POSICION: Record<string, string> = {
		arquero: 'Arquero',
		defensor: 'Defensor',
		mediocampista: 'Mediocampista',
		delantero: 'Delantero'
	};

	const grupos = clubesPorLiga();
	const paises = nacionalidades();

	// El escudo de abajo del select cambia con lo que se elige: se ve adónde va
	// a arrancar la carrera antes de crear nada.
	let clubElegido = $state(CLUB_POR_DEFECTO);
</script>

<svelte:head>
	<title>Copolero</title>
</svelte:head>

<h1>Copolero</h1>
<p class="bajada">
	Una carrera de futbolista para dos. Uno juega al futbolista, el otro a su representante. Por
	turnos: cada uno entra cuando puede.
</p>

{#if form?.problemas}
	<div class="error">
		{#each form.problemas as problema (problema)}
			<div>{problema}</div>
		{/each}
	</div>
{/if}

<form method="POST" action="?/crear" use:enhance>
	<div class="tarjeta">
		<h3>Vos</h3>
		<label>
			<span class="titulo">Tu nombre</span>
			<input name="tuNombre" maxlength="60" required placeholder="Alan" />
		</label>
		<label>
			<span class="titulo">¿Qué rol querés jugar?</span>
			<select name="rol" required>
				<option value="futbolista">Futbolista</option>
				<option value="representante">Representante</option>
			</select>
		</label>
		<p class="sutil">El otro rol le queda a quien entre con el código.</p>
	</div>

	<div class="tarjeta">
		<h3>El futbolista</h3>
		<label>
			<span class="titulo">Nombre</span>
			<input name="nombreFutbolista" maxlength="60" required placeholder="Damián Correa" />
		</label>
		<label>
			<span class="titulo">Nacionalidad</span>
			<select name="nacionalidad">
				{#each paises as pais (pais)}
					<option value={pais} selected={pais === 'Argentina'}>{pais}</option>
				{/each}
			</select>
		</label>
		<label>
			<span class="titulo">Posición</span>
			<select name="posicion" required>
				{#each POSICIONES as posicion (posicion)}
					<option value={posicion} selected={posicion === 'delantero'}>
						{NOMBRE_POSICION[posicion]}
					</option>
				{/each}
			</select>
		</label>
		<label>
			<span class="titulo">Club donde arranca</span>
			<select name="clubId" bind:value={clubElegido} required>
				{#each grupos as grupo (grupo.etiqueta)}
					<optgroup label={grupo.etiqueta}>
						{#each grupo.clubes as club (club.id)}
							<option value={club.id}>{club.nombre}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</label>

		<div class="vistazo">
			<ClubLinea clubId={clubElegido} tamano={40} />
		</div>
		<p class="sutil" style="margin:-.4rem 0 1rem">
			Cuanto más abajo arranques, más carrera hay para hacer. El Ascenso argentino es el escalón
			más bajo del mundo.
		</p>
		<label>
			<span class="titulo">Edad inicial</span>
			<input
				name="edadInicial"
				type="number"
				min="15"
				max="22"
				value={EDAD_INICIAL_POR_DEFECTO}
				required
			/>
		</label>
	</div>

	<button type="submit">Crear la partida</button>
</form>

<h2>¿Te pasaron un código?</h2>
{#if form?.problemaCodigo}
	<div class="error">{form.problemaCodigo}</div>
{/if}
<form method="POST" action="?/entrar" use:enhance>
	<label>
		<span class="titulo">Código de la partida</span>
		<input
			name="codigo"
			maxlength="12"
			required
			placeholder="ABC234"
			autocapitalize="characters"
			style="text-transform: uppercase; letter-spacing: .2em;"
		/>
	</label>
	<button type="submit" class="secundario">Entrar</button>
</form>

<h2>El mundo</h2>
<div class="tarjeta">
	<p class="sutil" style="margin:0 0 .85rem">
		{grupos.reduce((n, g) => n + g.clubes.length, 0)} clubes en {grupos.length} ligas de {new Set(
			grupos.map((g) => g.paisId)
		).size} países, con los técnicos y los jugadores de verdad. Se mueven solos: cada temporada hay
		mercado de pases y hay quien se retira.
	</p>
	<div class="banderas">
		{#each [...new Set(grupos.map((g) => g.paisId))] as paisId (paisId)}
			<Bandera pais={paisId} alto={16} />
		{/each}
	</div>
</div>

<style>
	.vistazo {
		background: var(--tarjeta-alta);
		border-radius: 10px;
		padding: 0.7rem 0.85rem;
		margin: -0.4rem 0 0.6rem;
	}
	.banderas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
</style>
