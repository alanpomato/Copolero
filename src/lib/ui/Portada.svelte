<script lang="ts">
	import type { Portada } from '$lib/engine/portada';
	import Escudo from './Escudo.svelte';
	import Ilustracion from './Ilustracion.svelte';

	/**
	 * La tapa del diario del día después.
	 *
	 * Es lo primero que se ve al abrir la temporada nueva, y a propósito no se
	 * parece a nada más del juego: papel en vez de fondo oscuro, serif en vez de
	 * la tipografía de siempre, y un titular del tamaño de un titular. La idea es
	 * que el año que cerró se lea de un vistazo y se sienta, en vez de tener que
	 * juntar cinco números de cinco tarjetas distintas.
	 *
	 * Se puede plegar: la tapa entera la primera vez, y después queda como una
	 * línea. A la temporada doce nadie quiere volver a leer todas las tapas, pero
	 * a la primera nadie se la quiere perder.
	 */
	let { portada }: { portada: Portada } = $props();

	let abierta = $state(true);
</script>

<article
	class="diario"
	class:gloria={portada.tono === 'gloria'}
	class:mala={portada.tono === 'mala'}
>
	<header class="cabezal">
		<span class="nombre">{portada.diario}</span>
		<span class="fecha">{portada.fecha}</span>
	</header>

	<button class="plegar" onclick={() => (abierta = !abierta)} aria-expanded={abierta}>
		<span class="fajita">Temporada {portada.temporada} · {portada.anio}</span>
		<span class="flecha" class:girada={abierta}>▾</span>
	</button>

	{#if abierta}
		<h2 class="titular">{portada.titular}</h2>

		<div class="foto">
			<Ilustracion foto={portada.foto} clubId={portada.clubId} />
			<span class="epigrafe">
				<Escudo clubId={portada.clubId} tamano={18} />
			</span>
		</div>

		<p class="bajada">{portada.bajada}</p>

		<div class="notas">
			{#each portada.notas as nota (nota.titulo)}
				<section>
					<h3>{nota.titulo}</h3>
					<p>{nota.texto}</p>
				</section>
			{/each}
		</div>
	{:else}
		<p class="plegada">{portada.titular}</p>
	{/if}
</article>

<style>
	/*
	 * Papel. Es el único bloque claro de todo el juego y ésa es la gracia: corta
	 * la pantalla en dos y avisa sin palabras que acá empieza otra cosa.
	 */
	.diario {
		--tinta: #16181c;
		--tinta-suave: #4a4f57;
		background: #f4f1e8;
		color: var(--tinta);
		border-radius: var(--radio);
		padding: 1rem 1.1rem 1.2rem;
		margin: 0 0 1rem;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(0, 0, 0, 0.5);
		font-family: Georgia, 'Times New Roman', serif;
	}
	.diario.gloria {
		background: #f7f2e0;
		box-shadow:
			0 10px 34px rgba(224, 184, 58, 0.25),
			0 0 0 1px rgba(224, 184, 58, 0.55);
	}
	.diario.mala {
		background: #eceae4;
	}

	.cabezal {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 3px double var(--tinta);
		padding-bottom: 0.45rem;
	}
	.nombre {
		font-weight: 800;
		font-size: 1.35rem;
		letter-spacing: 0.14em;
		line-height: 1;
	}
	.fecha {
		font-size: 0.7rem;
		color: var(--tinta-suave);
		font-style: italic;
		text-align: right;
		flex: none;
	}

	.plegar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin: 0.55rem 0 0;
		padding: 0;
		background: none;
		border: none;
		color: var(--tinta-suave);
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.plegar:hover .fajita {
		color: var(--tinta);
	}
	.flecha {
		transition: transform 0.15s;
	}
	.flecha.girada {
		transform: rotate(180deg);
	}

	.titular {
		margin: 0.5rem 0 0.7rem;
		font-size: clamp(1.7rem, 8.5vw, 2.5rem);
		line-height: 0.98;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--tinta);
		border: none;
	}

	.foto {
		position: relative;
		margin: 0 0 0.7rem;
	}
	.epigrafe {
		position: absolute;
		right: 6px;
		bottom: 6px;
		display: flex;
		padding: 3px;
		border-radius: 5px;
		background: rgba(244, 241, 232, 0.9);
	}

	.bajada {
		margin: 0 0 0.85rem;
		font-size: 1.02rem;
		line-height: 1.45;
		color: var(--tinta);
	}

	.notas {
		border-top: 1px solid rgba(22, 24, 28, 0.25);
		padding-top: 0.75rem;
		display: grid;
		gap: 0.7rem;
	}
	.notas section {
		border-left: 3px solid rgba(22, 24, 28, 0.3);
		padding-left: 0.65rem;
	}
	.notas h3 {
		margin: 0 0 0.15rem;
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tinta-suave);
		border: none;
	}
	.notas p {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.4;
		color: var(--tinta);
	}

	.plegada {
		margin: 0.5rem 0 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--tinta);
	}
</style>
