<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Una opción elegible: la tarjeta con el radio adentro.
	 *
	 * Se toca en cualquier parte, no solo en el puntito. En el celular eso es la
	 * diferencia entre jugar y pelearse con la pantalla.
	 */
	let {
		grupo,
		valor,
		titulo,
		detalle = '',
		probabilidad = null,
		elegido = $bindable(),
		extra
	}: {
		grupo: string;
		valor: string;
		titulo: string;
		detalle?: string;
		probabilidad?: number | null;
		elegido: string;
		extra?: Snippet;
	} = $props();

	const tono = $derived(
		probabilidad === null
			? ''
			: probabilidad >= 70
				? 'alta'
				: probabilidad >= 40
					? 'media'
					: 'baja'
	);
</script>

<label class="opcion" class:activa={elegido === valor}>
	<input type="radio" name={grupo} value={valor} bind:group={elegido} />
	<span class="cuerpo">
		<span class="cabecera">
			<span class="titulo">{titulo}</span>
			{#if probabilidad !== null}
				<span class="prob {tono}">{probabilidad}%</span>
			{/if}
		</span>
		{#if detalle}<span class="detalle">{detalle}</span>{/if}
		{#if probabilidad !== null && probabilidad < 100}
			<span class="barra"><span class="relleno {tono}" style="width:{probabilidad}%"></span></span>
		{/if}
		{#if extra}{@render extra()}{/if}
	</span>
</label>

<style>
	.opcion {
		display: block;
		position: relative;
		margin: 0 0 0.6rem;
		background: var(--tarjeta-alta);
		border: 1px solid var(--borde);
		border-radius: 12px;
		padding: 0.8rem 0.9rem;
		cursor: pointer;
	}
	.opcion.activa {
		border-color: var(--acento);
		background: rgba(74, 222, 128, 0.09);
	}
	/* El radio está, se puede tabular y lector de pantalla lo lee; lo que se ve
	   es la tarjeta entera, que en el celular es lo que se puede tocar. */
	.opcion input {
		position: absolute;
		inset: 0;
		opacity: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		cursor: pointer;
	}
	.opcion:has(input:focus-visible) {
		outline: 2px solid var(--acento);
		outline-offset: 2px;
	}
	.cuerpo {
		display: block;
	}
	.cabecera {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.titulo {
		font-weight: 700;
		line-height: 1.25;
	}
	.detalle {
		display: block;
		font-size: 0.84rem;
		color: var(--tenue);
		margin-top: 0.15rem;
	}
	.prob {
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		font-size: 1rem;
		flex: none;
	}
	.prob.alta {
		color: var(--acento);
	}
	.prob.media {
		color: var(--espera);
	}
	.prob.baja {
		color: var(--malo);
	}
	.relleno.alta {
		background: var(--acento);
	}
	.relleno.media {
		background: var(--espera);
	}
	.relleno.baja {
		background: var(--malo);
	}
	.barra {
		display: block;
		height: 4px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.09);
		margin-top: 0.55rem;
		overflow: hidden;
	}
	.relleno {
		display: block;
		height: 100%;
		border-radius: 999px;
	}
</style>
