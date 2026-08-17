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
		<span class="accion">
			<span class="verbo">{abierto ? 'Elegí' : 'Ver'}</span>
			<span class="flecha" aria-hidden="true"></span>
		</span>
	</summary>
	<div class="cuerpo">
		{#if nota}<p class="nota">{nota}</p>{/if}
		{@render children()}
	</div>
</details>

<style>
	/*
	 * Un paso es algo que se decide, y tiene que verse distinto de algo que se
	 * lee.
	 *
	 * Antes las decisiones y las tarjetas de información eran el mismo rectángulo
	 * gris con el mismo borde, y en una pantalla con quince no se sabía si estabas
	 * mirando tus estadísticas o eligiendo cómo jugar el año. Acá el fondo es más
	 * claro y el borde más vivo: las cosas que hay que tocar están un escalón más
	 * adelante que las que hay que mirar.
	 */
	.paso {
		background: var(--tarjeta-alta);
		border: 1px solid #313a47;
		border-radius: 14px;
		margin: 0 0 0.6rem;
		overflow: hidden;
		/*
		 * El paso se mide a sí mismo, no a la ventana.
		 *
		 * Hace falta porque el mismo componente vive en dos anchos muy distintos:
		 * en la columna del medio tiene cuarenta y pico de rem y en la del costado
		 * veintiuno. Con una media query de ventana, "La ficha completa" del
		 * costado se partiría en dos columnas de diez rem, que no es una columna,
		 * es una tira.
		 */
		container-type: inline-size;
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
		background: rgba(255, 255, 255, 0.04);
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

	/* Un verbo, para que se lea como algo que hay que hacer. */
	.accion {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.verbo {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--tenue);
	}
	.paso[open] .verbo {
		color: var(--acento);
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

	/*
	 * Cuando el paso es ancho, las opciones van de a dos.
	 *
	 * Diez inversiones o seis ofertas en una sola fila vertical no son una
	 * elección: son una lista de compras que se scrollea hasta el final. De a dos
	 * entran casi todas juntas y se pueden comparar de un vistazo, que es lo que
	 * una decisión necesita.
	 *
	 * Todo lo que no es una opción —los párrafos, los subtítulos que agrupan, las
	 * cifras, la ruleta— sigue ocupando el ancho completo. Con eso los grupos no
	 * se mezclan: el subtítulo corta la fila y lo que sigue arranca abajo.
	 */
	@container (min-width: 32rem) {
		.cuerpo {
			display: grid;
			grid-template-columns: 1fr 1fr;
			column-gap: 0.6rem;
			align-items: start;
		}
		.cuerpo > :global(:not(.opcion)) {
			grid-column: 1 / -1;
		}
	}
	.nota {
		margin: 0 0 0.85rem;
		font-size: 0.85rem;
		color: var(--tenue);
		line-height: 1.45;
	}

	/*
	 * La franja de color a la izquierda, la misma que usan las tarjetas.
	 *
	 * Antes acá era un borde de arriba y allá una franja al costado: dos sistemas
	 * distintos para decir lo mismo, y en una pantalla con las dos cosas se leía
	 * como un error de maquetación. Los colores salen de las variables de
	 * `app.css`, así que cambiar el tema de "plata" lo cambia en todo el juego.
	 */
	.paso[data-tema] {
		position: relative;
		border-left-color: transparent;
	}
	.paso[data-tema]::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 3px;
		background: var(--tema, var(--borde));
		z-index: 1;
	}
	.paso[data-tema='cancha'] {
		--tema: var(--cancha);
	}
	.paso[data-tema='plata'] {
		--tema: var(--plata);
	}
	.paso[data-tema='relacion'] {
		--tema: var(--relacion);
	}
	.paso[data-tema='mercado'] {
		--tema: var(--mercado);
	}
</style>
