<script lang="ts">
	import { enhance } from '$app/forms';
	import { POSICIONES } from '$lib/engine/tipos';
	import { EDAD_INICIAL_POR_DEFECTO } from '$lib/engine/estado';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const NOMBRE_POSICION: Record<string, string> = {
		arquero: 'Arquero',
		defensor: 'Defensor',
		mediocampista: 'Mediocampista',
		delantero: 'Delantero'
	};
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
			<input name="nacionalidad" maxlength="40" value="Argentina" />
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
			<input name="club" maxlength="40" required placeholder="Huracán" />
		</label>
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
