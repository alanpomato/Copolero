<script lang="ts">
	import type { EnLaVidriera } from '$lib/engine/inversiones';
	import { NOMBRE_RAREZA } from '$lib/engine/inversiones';

	/**
	 * Lo que ya compraste, a la vista siempre.
	 *
	 * Alan: "los consumibles está bien que aparezcan solo en pretemporada, pero
	 * después se borran y no sabés qué tenés. Además comprás un centro de
	 * entrenamiento y debería aparecer en algún lado". La vidriera existe una
	 * fase de cada tres; lo comprado tiene que existir las tres, o comprar se
	 * siente como tirar la plata a un pozo.
	 *
	 * Ordenado por rareza y no alfabéticamente: lo que costó conseguir va
	 * arriba, que es lo que uno quiere ver cuando abre esto.
	 */
	let { cuales }: { cuales: EnLaVidriera[] } = $props();

	const ORDEN = { dorada: 0, plata: 1, bronce: 2, comun: 3 };
	const ordenadas = $derived([...cuales].sort((a, b) => ORDEN[a.rareza] - ORDEN[b.rareza]));
</script>

<div class="tarjeta tengo">
	<h3>Lo que tenés</h3>
	<ul>
		{#each ordenadas as i (i.id)}
			<li data-rareza={i.rareza}>
				<span class="fila">
					<b>{i.nombre}</b>
					<span class="rareza">{NOMBRE_RAREZA[i.rareza]}</span>
				</span>
				<span class="que">{i.efecto}</span>
				{#if i.quedan}
					<span class="restan">
						Te {i.quedan === 1 ? 'queda' : 'quedan'}
						{i.quedan}
						{i.quedan === 1 ? 'temporada' : 'temporadas'}
					</span>
				{:else}
					<span class="restan siempre">Para siempre</span>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	h3 {
		margin: 0 0 0.7rem;
		font-size: 0.78rem;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--tenue, #8b93a7);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.5rem;
	}

	li {
		padding: 0.55rem 0.7rem;
		border-radius: 0.6rem;
		background: rgb(255 255 255 / 3%);
		/* La rareza se lee por el filo, no por el fondo: con cuatro fondos
		   distintos la columna se convierte en un semáforo. */
		border-left: 3px solid var(--filo);
		display: grid;
		gap: 0.12rem;
	}

	li[data-rareza='comun'] {
		--filo: #5b6478;
	}
	li[data-rareza='bronce'] {
		--filo: #b4763a;
	}
	li[data-rareza='plata'] {
		--filo: #b9c2d0;
	}
	li[data-rareza='dorada'] {
		--filo: #e3b23c;
	}

	.fila {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	b {
		font-size: 0.92rem;
	}

	.rareza {
		font-size: 0.62rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--filo);
		white-space: nowrap;
	}

	.que {
		font-size: 0.8rem;
		color: var(--tenue, #8b93a7);
	}

	.restan {
		font-size: 0.7rem;
		color: var(--tenue, #8b93a7);
		opacity: 0.8;
	}

	.restan.siempre {
		opacity: 0.55;
	}
</style>
