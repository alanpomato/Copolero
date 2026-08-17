<script lang="ts">
	/**
	 * La charla.
	 *
	 * Para los momentos del representante donde lo que se juega es lo que se
	 * dice: el padre del pibe preguntando por qué tendría que firmar con vos.
	 * Ahí no hay pelota ni hay rueda; hay alguien del otro lado de la mesa
	 * esperando que hables.
	 *
	 * La idea es de Hernán y venía con el mecanismo puesto: una pregunta, y que
	 * "aunque contestes mal, igual el pibe se sume" si tenés carisma. Por eso
	 * este es el único de los cuatro que muestra dos números: lo que vale la
	 * respuesta que elegiste, y lo que te salva caer bien. El segundo no cambia
	 * el primero —la probabilidad que se ve sigue siendo la de verdad— y aparece
	 * solamente cuando la respuesta ya salió mal.
	 *
	 * Lo que se anima es la espera: los tres puntitos del que está por contestar,
	 * y después la cara del que escuchó.
	 */
	let {
		probabilidad,
		etiqueta = '',
		tamano = 132,
		salio = null,
		tirando = false,
		yaEstaba = false,
		/** Cuánto salva el carisma, para poder decirlo antes de hablar. */
		carisma = 0
	}: {
		probabilidad: number;
		etiqueta?: string;
		tamano?: number;
		salio?: boolean | null;
		tirando?: boolean;
		yaEstaba?: boolean;
		carisma?: number;
	} = $props();

	const p = $derived(Math.max(0, Math.min(100, probabilidad)));

	/** Lo que tarda en contestar. Lo mismo que la animación de abajo. */
	const PIENSA = 1400;

	let hablando = $state(false);
	let contestado = $state(false);

	let dicho: string | null = null;

	$effect(() => {
		if (salio === null) return;
		const firma = `${salio}`;
		if (dicho === firma) return;
		dicho = firma;

		if (yaEstaba) {
			contestado = true;
			return;
		}

		hablando = true;
		setTimeout(() => {
			hablando = false;
			contestado = true;
		}, PIENSA);
	});

	const tono = $derived(p >= 70 ? 'alta' : p >= 40 ? 'media' : 'baja');
	const canto = $derived(contestado && salio !== null ? (salio ? 'si' : 'no') : '');
</script>

<div
	class="quiz"
	class:tirando
	class:hablando
	class:contestado
	style="width:{tamano}px"
	data-canto={canto}
>
	<!--
		El que escucha. Dos ojos y una boca alcanzan: lo que hace falta es que se
		note que hay alguien enfrente y que esa cara cambia según lo que dijiste.
	-->
	<svg viewBox="0 0 100 84" role="img" aria-label={`${p}% de que le cierre`}>
		<circle cx="50" cy="38" r="27" class="cara" />
		<circle cx="40" cy="33" r="3.2" class="ojo" />
		<circle cx="60" cy="33" r="3.2" class="ojo" />

		{#if contestado && salio !== null}
			{#if salio}
				<path d="M38 46 Q50 56 62 46" class="boca" fill="none" />
			{:else}
				<path d="M38 52 Q50 43 62 52" class="boca" fill="none" />
			{/if}
		{:else}
			<line x1="40" y1="49" x2="60" y2="49" class="boca" />
		{/if}

		<!-- Los tres puntitos del que está por contestar. -->
		{#if hablando}
			<g class="pensando">
				<circle cx="38" cy="76" r="3" />
				<circle cx="50" cy="76" r="3" />
				<circle cx="62" cy="76" r="3" />
			</g>
		{/if}
	</svg>

	<p class="marcador">
		{#if contestado && salio !== null}
			<b class={salio ? 'bien' : 'mal'}>{salio ? 'LE CERRÓ' : 'NO LE CERRÓ'}</b>
		{:else}
			<b class={tono}>{p}%</b>
			<span>{tirando ? 'está pensando' : 'que le cierre'}</span>
		{/if}
	</p>

	{#if carisma > 0 && !contestado}
		<p class="carisma">
			+{carisma}% si sale mal<br /><i>por caer bien</i>
		</p>
	{/if}

	{#if etiqueta}
		<p class="etiqueta">{etiqueta}</p>
	{/if}
</div>

<style>
	.quiz {
		margin: 0 auto;
		text-align: center;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.cara {
		fill: var(--tarjeta-alta);
		stroke: var(--borde);
		stroke-width: 1.6;
		transition: stroke 0.3s ease;
	}
	.ojo {
		fill: var(--tenue);
	}
	.boca {
		stroke: var(--tenue);
		stroke-width: 2.6;
		stroke-linecap: round;
		fill: none;
	}
	.quiz[data-canto='si'] .cara {
		stroke: var(--acento);
	}
	.quiz[data-canto='si'] .boca,
	.quiz[data-canto='si'] .ojo {
		stroke: var(--acento);
		fill: var(--acento);
	}
	.quiz[data-canto='si'] .boca {
		fill: none;
	}
	.quiz[data-canto='no'] .cara {
		stroke: var(--malo);
	}
	.quiz[data-canto='no'] .boca,
	.quiz[data-canto='no'] .ojo {
		stroke: var(--malo);
		fill: var(--malo);
	}
	.quiz[data-canto='no'] .boca {
		fill: none;
	}

	/* Los puntitos, uno detrás del otro, como cuando alguien está por hablar. */
	.pensando circle {
		fill: var(--tenue);
		animation: puntito 1s ease-in-out infinite;
	}
	.pensando circle:nth-child(2) {
		animation-delay: 0.16s;
	}
	.pensando circle:nth-child(3) {
		animation-delay: 0.32s;
	}
	@keyframes puntito {
		0%,
		100% {
			opacity: 0.25;
		}
		45% {
			opacity: 1;
		}
	}

	.contestado svg {
		animation: asentir 0.45s ease-out;
	}
	@keyframes asentir {
		40% {
			transform: translateY(3px);
		}
	}

	.marcador {
		margin: 0.35rem 0 0;
		line-height: 1.15;
	}
	.marcador b {
		display: block;
		font-size: 1.3rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.marcador span {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tenue);
	}
	.marcador .alta,
	.marcador .bien {
		color: var(--acento);
	}
	.marcador .media {
		color: var(--espera);
	}
	.marcador .baja,
	.marcador .mal {
		color: var(--malo);
	}

	/* Lo que te salva caer bien. Va abajo y chico: no es la apuesta, es la red. */
	.carisma {
		margin: 0.5rem 0 0;
		font-size: 0.68rem;
		line-height: 1.3;
		color: var(--espera);
	}
	.carisma i {
		font-style: normal;
		color: var(--tenue);
	}

	.etiqueta {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.2;
	}

	@media (prefers-reduced-motion: reduce) {
		.pensando circle,
		.contestado svg {
			animation: none;
		}
	}
</style>
