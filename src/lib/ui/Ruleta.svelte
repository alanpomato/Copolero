<script lang="ts">
	/**
	 * La ruleta de la ocasión.
	 *
	 * Muestra contra qué estás apostando: el verde es lo que sale bien y el rojo
	 * lo que sale mal, y los dos pedazos son del tamaño de la probabilidad de
	 * verdad. Es el mismo número que ya estaba escrito, pero un 38% dibujado se
	 * entiende sin leerlo, y elegir entre dos porciones es otra cosa que elegir
	 * entre dos porcentajes.
	 *
	 * No gira al elegir, y no es un olvido: en Copolero la tirada se resuelve
	 * cuando cierran los dos, así que al momento de elegir el resultado todavía
	 * no existe. Una animación acá sería una mentira linda. Lo que sí hace es
	 * acomodarse cuando cambiás de opción, que es cuando cambia la apuesta.
	 */
	let {
		probabilidad,
		etiqueta = '',
		tamano = 132
	}: { probabilidad: number; etiqueta?: string; tamano?: number } = $props();

	const p = $derived(Math.max(0, Math.min(100, probabilidad)));

	// Geometría del anillo. El truco es dibujar un solo círculo y usar el trazo
	// discontinuo como si fuera la porción: no hay que calcular arcos a mano y
	// se anima solo.
	const RADIO = 42;
	const VUELTA = 2 * Math.PI * RADIO;
	const sale = $derived((p / 100) * VUELTA);

	const tono = $derived(p >= 70 ? 'alta' : p >= 40 ? 'media' : 'baja');
</script>

<div class="ruleta" style="width:{tamano}px">
	<svg viewBox="0 0 100 100" role="img" aria-label={`${p}% de que salga`}>
		<!-- El fondo, que es todo lo que puede salir mal. -->
		<circle
			cx="50"
			cy="50"
			r={RADIO}
			fill="none"
			stroke="var(--malo)"
			stroke-width="14"
			opacity=".55"
		/>

		<!-- Y encima, la porción que sale bien. -->
		<circle
			class="parte"
			cx="50"
			cy="50"
			r={RADIO}
			fill="none"
			stroke-width="14"
			stroke-dasharray="{sale} {VUELTA}"
			transform="rotate(-90 50 50)"
		/>

		<circle cx="50" cy="50" r="30" fill="var(--tarjeta)" />
		<text x="50" y="49" text-anchor="middle" class="numero {tono}" font-size="21" font-weight="800">
			{p}%
		</text>
		<text x="50" y="63" text-anchor="middle" class="pie" font-size="7.5">que salga</text>

		<!-- La aguja, arriba de todo. -->
		<polygon points="50,2 45,12 55,12" fill="var(--texto)" />
	</svg>

	{#if etiqueta}
		<p class="etiqueta">{etiqueta}</p>
	{/if}
</div>

<style>
	.ruleta {
		margin: 0 auto;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
	}
	.parte {
		stroke: var(--acento);
		/* Se acomoda cuando cambia la apuesta, que es cuando cambia el dibujo. */
		transition: stroke-dasharray 0.35s ease-out;
	}
	.numero {
		fill: var(--texto);
	}
	.numero.alta {
		fill: var(--acento);
	}
	.numero.media {
		fill: var(--espera);
	}
	.numero.baja {
		fill: var(--malo);
	}
	.pie {
		fill: var(--tenue);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.etiqueta {
		margin: 0.4rem 0 0;
		text-align: center;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.2;
	}
</style>
