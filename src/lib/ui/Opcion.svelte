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
		deshabilitada = false,
		bloqueado = false,
		multiple = false,
		form = undefined,
		elegido = $bindable(),
		elegidas = $bindable(),
		extra
	}: {
		grupo: string;
		valor: string;
		titulo: string;
		detalle?: string;
		probabilidad?: number | null;
		/** Se muestra igual pero no se puede elegir: por ejemplo, no le alcanza. */
		deshabilitada?: boolean;
		/**
		 * Ya se eligió y no hay vuelta atrás. Distinto de `deshabilitada`: no es
		 * que no se pueda, es que ya está hecho. La elegida se queda encendida y
		 * las otras se apagan, que es lo que se siente al ver la que no elegiste.
		 */
		bloqueado?: boolean;
		/**
		 * Se pueden marcar varias a la vez.
		 *
		 * En la vidriera del futbolista tiene que poder comprarse más de una cosa
		 * en el mismo año: el límite es la plata, no el calendario. Con radios,
		 * elegir la segunda desmarcaba la primera.
		 */
		multiple?: boolean;
		/**
		 * A qué formulario pertenece este input.
		 *
		 * Sirve para las decisiones que viven fuera del `<form>` de la fase —la
		 * vidriera y pedir salir, que están en la columna del costado—. Un input
		 * con `form` se envía con ese formulario aunque esté en otra parte del
		 * documento, así que se puede sacar una decisión de donde estorba sin
		 * tener que mover el formulario entero ni duplicarlo.
		 */
		form?: string;
		elegido?: string;
		elegidas?: string[];
		extra?: Snippet;
	} = $props();

	const tono = $derived(
		probabilidad === null ? '' : probabilidad >= 70 ? 'alta' : probabilidad >= 40 ? 'media' : 'baja'
	);

	const marcada = $derived(multiple ? (elegidas ?? []).includes(valor) : elegido === valor);
</script>

<label
	class="opcion"
	class:activa={marcada}
	class:apagada={deshabilitada}
	class:sellada={bloqueado && marcada}
	class:descartada={bloqueado && !marcada}
>
	{#if multiple}
		<input
			type="checkbox"
			name={grupo}
			value={valor}
			bind:group={elegidas}
			disabled={deshabilitada || bloqueado}
			{form}
		/>
	{:else}
		<input
			type="radio"
			name={grupo}
			value={valor}
			bind:group={elegido}
			disabled={deshabilitada || bloqueado}
			{form}
		/>
	{/if}
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
	.opcion.apagada {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Ya jugada. La que se eligió queda firme; las otras se van apagando, que es
	   exactamente lo que pasa cuando la pelota ya salió. */
	.opcion.sellada {
		cursor: default;
		border-color: var(--acento);
		background: rgba(74, 222, 128, 0.09);
	}
	.opcion.sellada input,
	.opcion.descartada input {
		cursor: default;
	}
	.opcion.descartada {
		opacity: 0.32;
		cursor: default;
	}

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
