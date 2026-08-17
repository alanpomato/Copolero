<script lang="ts">
	/**
	 * La probabilidad, dibujada como un reloj.
	 *
	 * Alan lo pidió así para las cartas del mercado: "la probabilidad de las
	 * tarjetas para el representante, ver de ponerlo con formato tipo reloj".
	 *
	 * Y funciona mejor que un número por una razón concreta: al representante le
	 * llegan seis cartas y tiene que elegir tres, o sea que su trabajo no es leer
	 * un porcentaje sino compararlos. Seis números en fila obligan a leerlos de a
	 * uno; seis relojes se comparan de un vistazo, como se compara la hora sin
	 * leerla.
	 *
	 * El número queda igual en el medio, porque a la hora de decidir entre 48% y
	 * 52% la aguja no alcanza.
	 */
	let {
		probabilidad,
		tamano = 84,
		apagado = false
	}: {
		/** 0–100. */
		probabilidad: number;
		tamano?: number;
		/** Se dibuja igual pero sin color: la que no eligió. */
		apagado?: boolean;
	} = $props();

	const R = 42;
	const CENTRO = 50;
	/** El arco no cierra: deja abajo el hueco de un reloj de verdad. */
	const ABIERTO = 62;
	const LARGO = 2 * Math.PI * R;
	const ARCO = (LARGO * (360 - ABIERTO)) / 360;

	const cuanto = $derived(Math.max(0, Math.min(100, probabilidad)));
	const lleno = $derived((ARCO * cuanto) / 100);

	/** Verde arriba de 60, amarillo en el medio, rojo abajo de 35. */
	const tono = $derived(cuanto >= 60 ? 'alta' : cuanto >= 35 ? 'media' : 'baja');

	/**
	 * Dónde apunta la aguja.
	 *
	 * El cero está abajo a la izquierda, donde arranca el arco, y va en sentido
	 * horario. Es la misma vuelta que hace el relleno, así que la punta cae
	 * siempre justo donde termina el color.
	 */
	const angulo = $derived(90 + ABIERTO / 2 + ((360 - ABIERTO) * cuanto) / 100);
	const punta = $derived.by(() => {
		const rad = ((angulo - 90) * Math.PI) / 180;
		return { x: CENTRO + Math.cos(rad) * (R - 9), y: CENTRO + Math.sin(rad) * (R - 9) };
	});
</script>

<svg
	class="reloj {tono}"
	class:apagado
	viewBox="0 0 100 100"
	width={tamano}
	height={tamano}
	role="img"
	aria-label="{cuanto}% de que prospere"
>
	<!-- El arco vacío, girado para que el hueco quede abajo. -->
	<g transform="rotate({90 + ABIERTO / 2} {CENTRO} {CENTRO})">
		<circle
			class="fondo"
			cx={CENTRO}
			cy={CENTRO}
			r={R}
			stroke-dasharray="{ARCO} {LARGO}"
			stroke-linecap="round"
		/>
		<circle
			class="lleno"
			cx={CENTRO}
			cy={CENTRO}
			r={R}
			stroke-dasharray="{lleno} {LARGO}"
			stroke-linecap="round"
		/>
	</g>

	<!-- Las marcas, cada 25: son las que hacen que se lea como un reloj. -->
	{#each [0, 25, 50, 75, 100] as marca (marca)}
		{@const rad = ((90 + ABIERTO / 2 + ((360 - ABIERTO) * marca) / 100 - 90) * Math.PI) / 180}
		<line
			class="marca"
			x1={CENTRO + Math.cos(rad) * (R - 5)}
			y1={CENTRO + Math.sin(rad) * (R - 5)}
			x2={CENTRO + Math.cos(rad) * (R + 4)}
			y2={CENTRO + Math.sin(rad) * (R + 4)}
		/>
	{/each}

	<!-- La aguja. -->
	<line class="aguja" x1={CENTRO} y1={CENTRO} x2={punta.x} y2={punta.y} stroke-linecap="round" />
	<circle class="eje" cx={CENTRO} cy={CENTRO} r="4.5" />

	<text class="numero" x={CENTRO} y={CENTRO + 22} text-anchor="middle">{cuanto}%</text>
</svg>

<style>
	.reloj {
		display: block;
		overflow: visible;
	}
	/*
	 * El arco y la aguja se pintan con `stroke`; el número, con `fill`.
	 *
	 * Vale la pena anotarlo porque la primera versión los pintaba juntos —una
	 * regla con `stroke` y `fill` para los tres— y el círculo del arco salía
	 * relleno: un disco verde en vez de un reloj. En SVG un `circle` es una
	 * figura cerrada aunque uno lo esté usando como línea.
	 */
	.fondo,
	.lleno {
		fill: none;
		stroke-width: 9;
	}
	.fondo {
		stroke: rgba(255, 255, 255, 0.08);
	}
	.lleno {
		transition: stroke-dasharray 0.35s ease;
	}
	.aguja {
		fill: none;
	}
	.numero {
		stroke: none;
	}

	.alta .lleno,
	.alta .aguja {
		stroke: var(--acento);
	}
	.alta .numero {
		fill: var(--acento);
	}
	.media .lleno,
	.media .aguja {
		stroke: var(--espera);
	}
	.media .numero {
		fill: var(--espera);
	}
	.baja .lleno,
	.baja .aguja {
		stroke: var(--malo);
	}
	.baja .numero {
		fill: var(--malo);
	}
	.marca {
		stroke: rgba(255, 255, 255, 0.22);
		stroke-width: 2;
	}
	.aguja {
		stroke-width: 3.5;
	}
	.eje {
		fill: var(--tarjeta);
		stroke: rgba(255, 255, 255, 0.35);
		stroke-width: 2;
	}
	.numero {
		font-size: 17px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	/* La que no eligió: se sigue viendo, pero ya no compite por la mirada. */
	.reloj.apagado {
		opacity: 0.4;
		filter: grayscale(0.85);
	}
</style>
