<script lang="ts">
	import Bandera from '$lib/ui/Bandera.svelte';
	import Escudo from '$lib/ui/Escudo.svelte';
	import { mundoPorPais } from '$lib/ui/opciones';

	/**
	 * Los escudos de todo el mundo, en una sola pantalla.
	 *
	 * Está para revisar: los colores de los clubes están puestos a mano y alguno
	 * va a estar mal. Verlos todos juntos es la forma más rápida de encontrarlo,
	 * y corregirlo es cambiar una línea en `src/lib/ui/escudos.ts`.
	 */
	const mundo = mundoPorPais();

	const total = $derived(
		mundo.reduce((n, p) => n + p.ligas.reduce((m, l) => m + l.clubes.length, 0), 0)
	);
</script>

<svelte:head>
	<title>Escudos — Copolero</title>
</svelte:head>

<h1>Escudos</h1>
<p class="bajada">
	Los {total} clubes del mundo. Los escudos son dibujo nuestro: fondo, patrón e iniciales. Lo único que
	sale de la realidad son los colores. Si alguno está mal, es una línea.
</p>

{#each mundo as pais (pais.id)}
	<h2><Bandera pais={pais.id} alto={18} /> {pais.nombre}</h2>
	{#each pais.ligas as liga (liga.id)}
		<h3 class="liga">{liga.nombre}</h3>
		<div class="grilla">
			{#each liga.clubes as club (club.id)}
				<div class="celda">
					<Escudo clubId={club.id} tamano={44} />
					<span>{club.nombre}</span>
				</div>
			{/each}
		</div>
	{/each}
{/each}

<p class="sutil" style="margin-top:2.5rem"><a href="/">← Volver</a></p>

<style>
	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.liga {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tenue);
		margin: 1.25rem 0 0.75rem;
	}
	.grilla {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 1rem 0.5rem;
	}
	.celda {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		text-align: center;
	}
	.celda span {
		font-size: 0.7rem;
		line-height: 1.25;
		color: var(--tenue);
	}
</style>
