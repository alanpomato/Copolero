<script lang="ts">
	/**
	 * El trofeo, dibujado.
	 *
	 * Alan lo pidió mirando la vitrina: "que se pueda acceder y ver miniatura de
	 * trofeos", con la misma condición que el resto del arte del juego —"los
	 * trofeos se dibujan (SVG propio), no se copian de ningún lado"—. Hasta
	 * ahora la vitrina usaba el emoji 🏆, que ni pega con el resto de la
	 * identidad visual ni se puede recolorear. Este es el mismo tipo de dibujo
	 * que ya tiene el escudo: formas simples, coloreadas por variable, sin
	 * ningún archivo de por medio.
	 */
	let {
		tamano = 22,
		tono = 'liga'
	}: {
		tamano?: number;
		/** "liga": dorado, de campeón de club. "mundo": el de la selección. */
		tono?: 'liga' | 'mundo';
	} = $props();
</script>

<svg
	class="trofeo tono-{tono}"
	width={tamano}
	height={(tamano * 28) / 24}
	viewBox="0 0 24 28"
	role="img"
	aria-label={tono === 'mundo' ? 'Trofeo del Mundial' : 'Trofeo de liga'}
>
	<!-- Las dos asas. -->
	<path d="M4.5 6 C0 6.3 0 12.5 4.5 13.6" fill="none" class="borde" stroke-width="2.2" />
	<path d="M19.5 6 C24 6.3 24 12.5 19.5 13.6" fill="none" class="borde" stroke-width="2.2" />

	<!-- La copa. -->
	<path
		d="M5.5 4.5 H18.5 V10.5 C18.5 15.5 15.2 18.3 12 18.3 C8.8 18.3 5.5 15.5 5.5 10.5 Z"
		class="cuerpo"
	/>
	<!-- El brillo, arriba de la copa. -->
	<path d="M7 6 H12 V8.4 H7 Z" class="brillo" />

	<!-- El pie. -->
	<rect x="10.6" y="18.3" width="2.8" height="4" class="cuerpo" />
	<rect x="8.6" y="22" width="6.8" height="2.1" rx="0.6" class="cuerpo" />
	<rect x="6.7" y="23.9" width="10.6" height="2.4" rx="0.8" class="cuerpo" />
</svg>

<style>
	.trofeo {
		display: inline-block;
		vertical-align: middle;
		flex: none;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
	}
	.cuerpo,
	.borde {
		stroke: rgba(0, 0, 0, 0.4);
		stroke-width: 0.6;
	}
	.tono-liga .cuerpo {
		fill: var(--plata, #d8b34a);
	}
	.tono-liga .borde {
		stroke: var(--plata, #d8b34a);
	}
	.tono-mundo .cuerpo {
		fill: var(--acento);
	}
	.tono-mundo .borde {
		stroke: var(--acento);
	}
	.brillo {
		fill: rgba(255, 255, 255, 0.45);
		stroke: none;
	}
</style>
