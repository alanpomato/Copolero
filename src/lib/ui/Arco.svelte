<script lang="ts">
	/**
	 * El arco.
	 *
	 * Para los momentos en que hay que definir: el penal, el mano a mano, el tiro
	 * libre, la atajada. Una rueda girando no se parece en nada a patear, y estos
	 * momentos son los que le dan sentido a jugar de nueve.
	 *
	 * Muestra lo mismo que la ruleta —la probabilidad de verdad, la que sale de
	 * tus atributos— pero como lo que es: cuánto del arco te queda libre. El
	 * arquero tapa lo que no es tuyo. Un 30% es un arquero enorme y un 80% es un
	 * arquero chico, y eso se entiende antes de leer el número.
	 *
	 * Y como en la ruleta, lo que decide es la respuesta del servidor, que ya
	 * está escrita antes de que la pelota salga. La pelota va a donde va porque
	 * ya se sabe si entró.
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
		/**
		 * Qué pasó, cuando ya pasó; `null` mientras se está eligiendo.
		 *
		 * Es un booleano suelto y no un objeto a propósito. Siendo `{ salio }`, el
		 * padre creaba uno nuevo en cada render, el efecto de acá lo veía como un
		 * resultado distinto y se volvía a correr —y al correrse de nuevo cancelaba
		 * sus propios `setTimeout`: la pelota nunca salía—. Un booleano es el mismo
		 * booleano siempre.
		 */
		salio?: boolean | null;
		tirando?: boolean;
		yaEstaba?: boolean;
	} = $props();

	const p = $derived(Math.max(0, Math.min(100, probabilidad)));

	/**
	 * Cuánto ocupa el arquero.
	 *
	 * Nunca tapa el arco entero ni desaparece: aun con un 92% hay alguien parado
	 * ahí, y aun con un 8% queda un rincón. Un arquero que ocupa todo o nada deja
	 * de leerse como un arquero.
	 */
	const anchoDelArquero = $derived(14 + ((100 - p) / 100) * 30);

	/** Lo que tarda la pelota. La misma cifra que la transición de abajo. */
	const VUELA = 900;
	const ESPERA_ANTES = 260;

	let pateada = $state(false);
	let frenada = $state(false);
	/** A dónde va la pelota, en el sistema del dibujo. */
	let pelota = $state({ x: 50, y: 64 });
	/** Para qué lado se tira el arquero. */
	let lado = $state(0);

	let jugada: string | null = null;

	$effect(() => {
		if (salio === null) return;
		const firma = `${salio}`;
		if (jugada === firma) return;
		jugada = firma;

		// El arquero se tira para un lado y la pelota va para donde tiene que ir:
		// al rincón que dejó libre si entró, a sus manos si la atajó.
		const haciaLaDerecha = Math.random() < 0.5;
		lado = haciaLaDerecha ? 1 : -1;
		const rincon = haciaLaDerecha ? 18 : 82;
		const manos = 50 + lado * 15;

		const destino = salio
			? { x: rincon, y: 14 + Math.random() * 20 }
			: { x: manos, y: 22 + Math.random() * 16 };

		if (yaEstaba) {
			pelota = destino;
			pateada = true;
			frenada = true;
			return;
		}

		setTimeout(() => {
			pateada = true;
			pelota = destino;
		}, ESPERA_ANTES);
		setTimeout(() => (frenada = true), ESPERA_ANTES + VUELA);
	});

	const canto = $derived(frenada && salio !== null ? (salio ? 'gol' : 'no') : '');
	const tono = $derived(p >= 70 ? 'alta' : p >= 40 ? 'media' : 'baja');
</script>

<div
	class="arco"
	class:tirando
	class:pateada
	class:frenada
	style="width:{tamano}px"
	data-canto={canto}
>
	<svg viewBox="0 0 100 72" role="img" aria-label={`${p}% de que entre`}>
		<!-- La red. Dos juegos de líneas cruzadas y ya se lee como una red. -->
		<defs>
			<pattern id="red" width="6" height="6" patternUnits="userSpaceOnUse">
				<path d="M0 0 L6 6 M6 0 L0 6" stroke="rgba(255,255,255,.14)" stroke-width="0.6" />
			</pattern>
		</defs>

		<rect x="9" y="5" width="82" height="41" fill="url(#red)" />

		<!-- El arquero: tapa lo que no es tuyo. Va detrás de los palos. -->
		<g class="arquero" style="--lado:{lado}">
			<rect
				x={50 - anchoDelArquero / 2}
				y="16"
				width={anchoDelArquero}
				height="30"
				rx="4"
				fill="var(--malo)"
				opacity=".55"
			/>
			<circle cx="50" cy="12" r="4.4" fill="var(--malo)" opacity=".75" />
		</g>

		<!-- Los tres palos. -->
		<path
			d="M9 46 L9 5 L91 5 L91 46"
			fill="none"
			stroke="var(--texto)"
			stroke-width="3"
			stroke-linecap="square"
		/>

		<!-- El pasto, apenas: sirve para que el arco no flote. -->
		<line x1="2" y1="46" x2="98" y2="46" stroke="var(--borde)" stroke-width="1.2" />
		<!-- El punto del penal, para que se entienda de dónde sale. -->
		<circle cx="50" cy="64" r="1.2" fill="var(--borde)" />

		<!-- La pelota. -->
		<circle class="pelota" cx={pelota.x} cy={pelota.y} r="3.8" />
	</svg>

	<p class="marcador">
		{#if frenada && salio !== null}
			<!--
				"SALIÓ" y no "GOL": la misma jugada tiene opciones que no terminan en
				gol —tocarla al compañero es una asistencia— y el dibujo no sabe cuál
				elegiste. Un cartel que dice GOL cuando fue asistencia contradice a la
				crónica que está tres centímetros más abajo.
			-->
			<b class={salio ? 'bien' : 'mal'}>{salio ? 'SALIÓ' : 'NO SALIÓ'}</b>
		{:else}
			<b class={tono}>{p}%</b>
			<span>{tirando ? 'va la pelota' : 'que entre'}</span>
		{/if}
	</p>

	{#if etiqueta}
		<p class="etiqueta">{etiqueta}</p>
	{/if}
</div>

<style>
	.arco {
		margin: 0 auto;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	/* La pelota sale de abajo y sube. La curva arranca fuerte y afloja, que es
	   como sale una pelota pateada. */
	.pelota {
		fill: var(--texto);
		stroke: var(--fondo);
		stroke-width: 1.2;
		transition:
			cx 0.9s cubic-bezier(0.2, 0.75, 0.3, 1),
			cy 0.9s cubic-bezier(0.2, 0.75, 0.3, 1);
	}

	/* El arquero se tira cuando sale la pelota. */
	.arquero {
		transform-origin: 50px 40px;
		transition: transform 0.55s cubic-bezier(0.3, 0.8, 0.3, 1);
	}
	.pateada .arquero {
		transform: translateX(calc(var(--lado) * 15px)) rotate(calc(var(--lado) * 18deg));
	}

	/* Cuando entra, la red se sacude. */
	.arco[data-canto='gol'] svg {
		animation: sacudir 0.5s ease-out;
	}
	@keyframes sacudir {
		30% {
			transform: translateY(2px) scale(1.03);
		}
		60% {
			transform: translateY(-1px);
		}
	}
	.arco[data-canto='gol'] .pelota {
		fill: var(--acento);
	}
	.arco[data-canto='no'] .pelota {
		fill: var(--malo);
	}

	.tirando svg {
		animation: latir 0.9s ease-in-out infinite;
	}
	@keyframes latir {
		50% {
			opacity: 0.82;
		}
	}

	/* El número, afuera del dibujo. Adentro chocaba con la pelota justo en el
	   momento en que hay que estar mirando la pelota. */
	.marcador {
		margin: 0.35rem 0 0;
		text-align: center;
		line-height: 1.15;
	}
	.marcador b {
		display: block;
		font-size: 1.35rem;
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
	.etiqueta {
		margin: 0.3rem 0 0;
		text-align: center;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.2;
	}

	@media (prefers-reduced-motion: reduce) {
		.pelota,
		.arquero {
			transition: none;
		}
		.arco svg {
			animation: none;
		}
	}
</style>
