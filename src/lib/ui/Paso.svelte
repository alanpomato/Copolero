<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Una decisión de la fase, plegada.
	 *
	 * La pretemporada llegó a medir cinco mil píxeles: cuatro decisiones abiertas
	 * a la vez, treinta tarjetas grises iguales, seis pantallas de celular para
	 * elegir tres cosas. Nadie lee eso; se scrollea hasta el botón y se cierra la
	 * fase sin decidir nada, que es la peor forma de jugar y también la más
	 * cómoda.
	 *
	 * Plegado, cada decisión ocupa una línea y muestra lo que está elegido. Eso
	 * cambia dos cosas: la fase entra en una pantalla, y —más importante— los
	 * valores por defecto se ven. Antes el que no tocaba nada entrenaba físico a
	 * intensidad firme sin enterarse nunca; ahora lo lee en la línea y decide si
	 * le sirve.
	 *
	 * Es un `<details>` de HTML y no un panel hecho a mano a propósito: abre y
	 * cierra sin JavaScript, el teclado lo maneja solo y el lector de pantalla
	 * sabe qué es. La fase se puede jugar entera con el JS caído.
	 */
	let {
		titulo,
		/** Lo que quedó elegido en esta decisión. Va en verde: es una elección. */
		elegido = '',
		/**
		 * Un dato, para los pasos que no deciden nada.
		 *
		 * Se distingue de `elegido` solo por el color, y hace falta: en gris se lee
		 * como el subtítulo que es, y en verde parecía una opción marcada en un paso
		 * donde no hay nada que marcar.
		 */
		dato = '',
		/** Una línea corta abajo del título, para cuando hace falta explicar. */
		nota = '',
		abierto = false,
		tema = '',
		children
	}: {
		titulo: string;
		elegido?: string;
		dato?: string;
		nota?: string;
		abierto?: boolean;
		tema?: string;
		children: Snippet;
	} = $props();
</script>

<details class="paso" open={abierto} data-tema={tema || undefined}>
	<summary>
		<span class="texto">
			<span class="titulo">{titulo}</span>
			{#if elegido}<span class="elegido">{elegido}</span>{/if}
			{#if dato}<span class="dato">{dato}</span>{/if}
		</span>
		<span class="flecha" aria-hidden="true"></span>
	</summary>
	<div class="cuerpo">
		{#if nota}<p class="nota">{nota}</p>{/if}
		{@render children()}
	</div>
</details>

<style>
	.paso {
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: 14px;
		margin: 0 0 0.6rem;
		overflow: hidden;
	}

	summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		/* Alto de dedo, no de mouse. */
		padding: 0.9rem 1rem;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		background: var(--tarjeta-alta);
	}
	.paso:has(summary:focus-visible) {
		outline: 2px solid var(--acento);
		outline-offset: 2px;
	}

	.texto {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.titulo {
		font-weight: 700;
		line-height: 1.25;
	}
	/* Lo que está elegido ahora. Es la mitad del valor de plegar: se ve sin abrir. */
	.elegido {
		font-size: 0.82rem;
		color: var(--acento);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dato {
		font-size: 0.82rem;
		color: var(--tenue);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.flecha {
		flex: none;
		width: 9px;
		height: 9px;
		border-right: 2px solid var(--tenue);
		border-bottom: 2px solid var(--tenue);
		transform: rotate(-45deg);
		margin-right: 4px;
		transition: transform 0.18s ease;
	}
	.paso[open] .flecha {
		transform: rotate(45deg);
		margin: -4px 4px 0 0;
	}

	.cuerpo {
		padding: 0 1rem 1rem;
	}
	.nota {
		margin: 0 0 0.85rem;
		font-size: 0.85rem;
		color: var(--tenue);
		line-height: 1.45;
	}

	/* Los temas pintan solo el borde de arriba: adentro ya hay tarjetas de color
	   y dos fondos teñidos uno encima del otro no se leen. */
	.paso[data-tema='cancha'] {
		border-top: 2px solid rgba(74, 222, 128, 0.45);
	}
	.paso[data-tema='plata'] {
		border-top: 2px solid rgba(251, 191, 36, 0.45);
	}
	.paso[data-tema='relacion'] {
		border-top: 2px solid rgba(129, 140, 248, 0.5);
	}
	.paso[data-tema='mercado'] {
		border-top: 2px solid rgba(56, 189, 248, 0.5);
	}
</style>
