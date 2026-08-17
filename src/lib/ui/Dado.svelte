<script lang="ts">
	/**
	 * La tirada contra tu número.
	 *
	 * Para lo que se juega fuera de la cancha: el micrófono, el pedido del
	 * técnico, la charla que puede salir bien o salir muy mal. Ahí no hay pelota,
	 * así que no hay arco ni hay rueda: hay un número que tenés que sacar.
	 *
	 * Es la forma más literal de las tres, y ésa es la gracia. "Necesitás 62 o
	 * menos" y después "sacaste 41" no deja lugar a la sospecha de que el juego
	 * hizo trampa: se ve el umbral antes de tirar y se ve el número después. Un
	 * porcentaje se lee; un número contra un umbral se entiende.
	 *
	 * Y como en las otras dos, quien decide es el servidor. Acá el número que
	 * cae se elige para que coincida con lo que ya está escrito: si salió, cae
	 * dentro; si no, cae afuera. Es el dibujo el que se acomoda al resultado, y
	 * no al revés.
	 */
	let {
		probabilidad,
		etiqueta = '',
		tamano = 132,
		salio = null,
		tirando = false,
		yaEstaba = false
	}: {
		probabilidad: number;
		etiqueta?: string;
		tamano?: number;
		/** Booleano suelto y no un objeto: ver la nota en Ruleta.svelte. */
		salio?: boolean | null;
		tirando?: boolean;
		yaEstaba?: boolean;
	} = $props();

	const p = $derived(Math.max(0, Math.min(100, probabilidad)));

	/** Cuánto rueda antes de quedarse quieto. */
	const RUEDA = 1500;
	const CADA = 55;

	let numero = $state<number | null>(null);
	let rodando = $state(false);
	let frenado = $state(false);

	let tirado: string | null = null;

	/** Un número que sea coherente con lo que ya pasó. */
	function numeroQueCorresponde(salio: boolean): number {
		// Con 100 no se puede fallar, así que no hay rango de afuera que sortear.
		if (p >= 100) return 1 + Math.floor(Math.random() * 100);
		return salio
			? 1 + Math.floor(Math.random() * p)
			: p + 1 + Math.floor(Math.random() * (100 - p));
	}

	$effect(() => {
		if (salio === null) return;
		const firma = `${salio}`;
		if (tirado === firma) return;
		tirado = firma;

		const final = numeroQueCorresponde(salio);

		if (yaEstaba) {
			numero = final;
			frenado = true;
			return;
		}

		rodando = true;
		const gira = setInterval(() => (numero = 1 + Math.floor(Math.random() * 100)), CADA);
		setTimeout(() => {
			clearInterval(gira);
			numero = final;
			rodando = false;
			frenado = true;
		}, RUEDA);
	});

	const tono = $derived(p >= 70 ? 'alta' : p >= 40 ? 'media' : 'baja');
	const canto = $derived(frenado && salio !== null ? (salio ? 'entro' : 'no') : '');
</script>

<div
	class="dado"
	class:rodando
	class:frenado
	class:tirando
	style="width:{tamano}px"
	data-canto={canto}
>
	<div class="cara">
		<span class="cifra {frenado ? canto : tono}">
			{#if numero === null}—{:else}{numero}{/if}
		</span>
	</div>

	<!--
		El umbral, dibujado. La franja verde es lo que te sirve, y arranca en 1
		porque se tira de menor a mayor: cuanto más grande tu número, más ancha la
		franja. Es la misma probabilidad de la rueda, puesta en una recta.
	-->
	<div class="recta" aria-hidden="true">
		<span class="sirve" style="width:{p}%"></span>
		{#if numero !== null}
			<span class="donde" style="left:{Math.max(0, Math.min(100, numero))}%"></span>
		{/if}
	</div>

	<p class="umbral">
		{#if frenado && salio !== null}
			{salio ? `${numero} · entra` : `${numero} · se pasó`}
		{:else}
			Necesitás <b>{p}</b> o menos
		{/if}
	</p>

	{#if etiqueta}
		<p class="etiqueta">{etiqueta}</p>
	{/if}
</div>

<style>
	.dado {
		margin: 0 auto;
		text-align: center;
	}

	/* La cara del dado. Cuadrada y grande: es lo único que hay que mirar. */
	.cara {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		width: 76%;
		margin: 0 auto 0.6rem;
		background: var(--tarjeta-alta);
		border: 1px solid var(--borde);
		border-radius: 18px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.05),
			0 6px 16px rgba(0, 0, 0, 0.45);
	}
	.cifra {
		font-size: 2.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.cifra.alta {
		color: var(--acento);
	}
	.cifra.media {
		color: var(--espera);
	}
	.cifra.baja {
		color: var(--malo);
	}
	.cifra.entro {
		color: var(--acento);
	}
	.cifra.no {
		color: var(--malo);
	}

	/* Mientras rueda, tiembla apenas. No hace falta más. */
	.rodando .cara {
		animation: temblar 0.11s linear infinite;
	}
	@keyframes temblar {
		25% {
			transform: translate(1px, -1px) rotate(0.6deg);
		}
		75% {
			transform: translate(-1px, 1px) rotate(-0.6deg);
		}
	}
	.frenado .cara {
		animation: caer 0.4s ease-out;
	}
	@keyframes caer {
		35% {
			transform: scale(1.08);
		}
	}
	.dado[data-canto='entro'] .cara {
		border-color: var(--acento);
	}
	.dado[data-canto='no'] .cara {
		border-color: var(--malo);
	}
	.tirando .cara {
		opacity: 0.85;
	}

	.recta {
		position: relative;
		height: 6px;
		border-radius: 999px;
		background: rgba(248, 113, 113, 0.28);
		overflow: hidden;
	}
	.sirve {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--acento);
		opacity: 0.75;
	}
	/* Dónde cayó. Se mueve con el número, así que mientras rueda vibra sobre la
	   recta: se ve que el sorteo es sobre este rango y no sobre otro. */
	.donde {
		position: absolute;
		top: -3px;
		width: 2px;
		height: 12px;
		margin-left: -1px;
		border-radius: 999px;
		background: var(--texto);
	}
	.recta {
		overflow: visible;
	}

	.umbral {
		margin: 0.55rem 0 0;
		font-size: 0.78rem;
		color: var(--tenue);
	}
	.umbral b {
		color: var(--texto);
		font-variant-numeric: tabular-nums;
	}
	.etiqueta {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.2;
	}

	@media (prefers-reduced-motion: reduce) {
		.rodando .cara,
		.frenado .cara {
			animation: none;
		}
	}
</style>
