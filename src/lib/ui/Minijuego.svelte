<script lang="ts">
	import type { Minijuego } from '$lib/engine/ocasiones';
	import Arco from './Arco.svelte';
	import Dado from './Dado.svelte';
	import Quiz from './Quiz.svelte';
	import Ruleta from './Ruleta.svelte';

	/**
	 * Con qué se juega este momento.
	 *
	 * Los tres tienen el mismo contrato —la probabilidad de verdad y el resultado
	 * que el servidor ya escribió— y ninguno decide nada: los tres dibujan lo que
	 * ya pasó. Lo único que cambia es la forma de mirarlo, y eso es lo que hace
	 * que la temporada quince no se juegue igual que la primera.
	 *
	 * Cuál va en cada momento lo dice el motor, no la pantalla. Un penal es un
	 * arco, una charla con el técnico es un número: si lo eligiera la pantalla
	 * sería decoración, y eligiéndolo el motor es parte de lo que el momento es.
	 */
	let {
		juego,
		...resto
	}: {
		juego: Minijuego;
		probabilidad: number;
		etiqueta?: string;
		tamano?: number;
		salio?: boolean | null;
		tirando?: boolean;
		yaEstaba?: boolean;
		/** Solo el quiz lo usa: cuánto salva caer bien. */
		carisma?: number;
	} = $props();
</script>

{#if juego === 'arco'}
	<Arco {...resto} />
{:else if juego === 'dado'}
	<Dado {...resto} />
{:else if juego === 'quiz'}
	<Quiz {...resto} />
{:else}
	<Ruleta {...resto} />
{/if}
