<script lang="ts">
	import { enhance } from '$app/forms';
	import { EDAD_INICIAL_POR_DEFECTO } from '$lib/engine/estado';
	import {
		ATRIBUTOS,
		NOMBRE_ATRIBUTO,
		PIES,
		PUESTOS,
		PUESTO_POR_DEFECTO,
		PUNTOS_A_REPARTIR,
		TOPE_POR_ATRIBUTO,
		puesto as puestoPorId
	} from '$lib/engine/puestos';
	import type { Atributos } from '$lib/engine/tipos';
	import Bandera from '$lib/ui/Bandera.svelte';
	import ClubLinea from '$lib/ui/ClubLinea.svelte';
	import { CLUB_POR_DEFECTO, clubesPorLiga, nacionalidades } from '$lib/ui/opciones';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const grupos = clubesPorLiga();
	const paises = nacionalidades();

	const LINEAS: { etiqueta: string; posicion: string }[] = [
		{ etiqueta: 'Arco', posicion: 'arquero' },
		{ etiqueta: 'Defensa', posicion: 'defensor' },
		{ etiqueta: 'Mediocampo', posicion: 'mediocampista' },
		{ etiqueta: 'Ataque', posicion: 'delantero' }
	];

	// El escudo de abajo del select cambia con lo que se elige: se ve adónde va
	// a arrancar la carrera antes de crear nada.
	let clubElegido = $state(CLUB_POR_DEFECTO);

	let puestoElegido = $state(PUESTO_POR_DEFECTO);
	let pie = $state('derecho');
	let numero = $state(puestoPorId(PUESTO_POR_DEFECTO).numero);
	let numeroTocado = $state(false);

	const elPuesto = $derived(puestoPorId(puestoElegido));

	// Cambiar de puesto trae su número clásico, salvo que ya lo hayan elegido a
	// mano: el que quiere el 10 de lateral tiene derecho a llevárselo.
	$effect(() => {
		const sugerido = puestoPorId(puestoElegido).numero;
		if (!numeroTocado) numero = sugerido;
	});

	// --- El reparto de puntos ------------------------------------------------
	let reparto = $state<Record<string, number>>(Object.fromEntries(ATRIBUTOS.map((a) => [a, 0])));

	const gastados = $derived(Object.values(reparto).reduce((a, b) => a + b, 0));
	const quedan = $derived(PUNTOS_A_REPARTIR - gastados);

	function mover(atributo: keyof Atributos, delta: number) {
		const ahora = reparto[atributo] ?? 0;
		const nuevo = ahora + delta;
		if (nuevo < 0 || nuevo > TOPE_POR_ATRIBUTO) return;
		if (delta > 0 && quedan <= 0) return;
		reparto = { ...reparto, [atributo]: nuevo };
	}

	/** Los atributos que el puesto ya empuja solo, para no repartir al pedo. */
	const propiosDelPuesto = $derived(Object.keys(elPuesto.sesgo));
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
			<span class="titulo">Puesto</span>
			<select name="puesto" bind:value={puestoElegido} required>
				{#each LINEAS as linea (linea.posicion)}
					<optgroup label={linea.etiqueta}>
						{#each PUESTOS.filter((p) => p.posicion === linea.posicion) as p (p.id)}
							<option value={p.id}>{p.nombre}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</label>
		<p class="sutil" style="margin:-.7rem 0 1rem">{elPuesto.detalle}</p>

		<div class="fila">
			<label>
				<span class="titulo">Número</span>
				<input
					name="numero"
					type="number"
					min="1"
					max="99"
					bind:value={numero}
					oninput={() => (numeroTocado = true)}
					required
				/>
			</label>
			<label>
				<span class="titulo">Pie</span>
				<select name="pie" bind:value={pie} required>
					{#each PIES as p (p.id)}
						<option value={p.id}>{p.nombre}</option>
					{/each}
				</select>
			</label>
		</div>
		<p class="sutil" style="margin:-.7rem 0 1rem">
			{PIES.find((p) => p.id === pie)?.detalle}
			{#if elPuesto.lado}
				Este puesto es por la {elPuesto.lado === 'izquierdo' ? 'izquierda' : 'derecha'}.
			{/if}
		</p>
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
			Cuanto más abajo arranques, más carrera hay para hacer. El Ascenso argentino es el escalón más
			bajo del mundo.
		</p>
		<div class="reparto">
			<div class="reparto-cabecera">
				<span class="titulo" style="margin:0">Cómo es el pibe</span>
				<span class="quedan" class:vacio={quedan === 0}>
					{quedan === 0 ? 'Todo repartido' : `Quedan ${quedan}`}
				</span>
			</div>
			<p class="sutil" style="margin:.15rem 0 .9rem">
				Repartí los puntos en lo que quieras que sepa hacer. Es poco a propósito: inclina al pibe,
				no lo fabrica. Lo que define la carrera es el potencial, que nadie ve.
			</p>

			{#each ATRIBUTOS as atributo (atributo)}
				<div class="rasgo">
					<span class="rasgo-nombre">
						{NOMBRE_ATRIBUTO[atributo]}
						{#if propiosDelPuesto.includes(atributo)}
							<span class="propio" title="El puesto ya te da esto">del puesto</span>
						{/if}
					</span>
					<span class="mando">
						<button
							type="button"
							class="paso"
							onclick={() => mover(atributo, -1)}
							disabled={reparto[atributo] === 0}
							aria-label={`Sacar un punto de ${NOMBRE_ATRIBUTO[atributo]}`}>−</button
						>
						<span class="puntos" class:puestos={reparto[atributo] > 0}>+{reparto[atributo]}</span>
						<button
							type="button"
							class="paso"
							onclick={() => mover(atributo, 1)}
							disabled={quedan === 0 || reparto[atributo] === TOPE_POR_ATRIBUTO}
							aria-label={`Sumar un punto a ${NOMBRE_ATRIBUTO[atributo]}`}>+</button
						>
					</span>
					<input type="hidden" name={`reparto-${atributo}`} value={reparto[atributo]} />
				</div>
			{/each}
		</div>

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
		).size} países, con los técnicos y los jugadores de verdad. Se mueven solos: cada temporada hay mercado
		de pases y hay quien se retira.
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
	.fila {
		display: grid;
		grid-template-columns: 1fr 1.4fr;
		gap: 0.75rem;
	}
	.reparto {
		background: var(--tarjeta-alta);
		border-radius: 12px;
		padding: 0.9rem 1rem;
		margin-bottom: 1rem;
	}
	.reparto-cabecera {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.quedan {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: var(--acento);
	}
	.quedan.vacio {
		color: var(--tenue);
	}
	.rasgo {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0;
	}
	.rasgo-nombre {
		font-size: 0.95rem;
	}
	.propio {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tenue);
		border: 1px solid var(--borde);
		border-radius: 999px;
		padding: 0.05rem 0.4rem;
		margin-left: 0.3rem;
		white-space: nowrap;
	}
	.mando {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: none;
	}
	.paso {
		width: 2.1rem;
		height: 2.1rem;
		padding: 0;
		border-radius: 8px;
		background: var(--fondo);
		color: var(--texto);
		border: 1px solid var(--borde);
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1;
	}
	.paso:disabled {
		opacity: 0.35;
		background: var(--fondo);
	}
	.puntos {
		min-width: 2rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		color: var(--tenue);
	}
	.puntos.puestos {
		color: var(--acento);
	}
</style>
