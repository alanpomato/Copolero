<script lang="ts">
	/**
	 * La intensidad de la pretemporada, como velocímetro.
	 *
	 * Alan lo pidió con una imagen de referencia: "la parte de intensidad,
	 * poner un velocímetro, aguja sobre arco de colores, como el que mandaste".
	 * Las tres tarjetas de abajo (Suave / Firme / A matar) ya dicen en texto qué
	 * hace cada una; esto es lo que falta arriba: verlo de un vistazo, como se
	 * mira la aguja de un auto y no la ficha técnica del motor.
	 *
	 * La geometría es la misma que la del `Reloj` de las cartas del mercado —el
	 * arco abierto, la aguja desde el centro— pero con tres tercios de color fijo
	 * en vez de un relleno proporcional: acá no hay un porcentaje, hay tres
	 * casilleros, y la aguja siempre descansa en el medio del que está elegido,
	 * nunca en el borde entre dos.
	 *
	 * El orden de colores no es el mismo sentido que en el reloj de probabilidad
	 * —ahí verde es "va a salir bien"— pero el significado es el que corresponde
	 * acá: verde es lo que no te cuesta nada, rojo es lo que el cuerpo cobra.
	 */
	import type { PerfilDeIntensidad } from '$lib/engine/entrenamiento';

	let {
		intensidades,
		elegido,
		tamano = 168
	}: {
		/** Las tres, en el orden en que se dibujan: de la más floja a la más dura. */
		intensidades: PerfilDeIntensidad[];
		/** El id elegido. Si no hay ninguno todavía, apunta al del medio. */
		elegido?: string;
		tamano?: number;
	} = $props();

	const R = 42;
	const CENTRO = 50;
	/** Cuánto queda abierto abajo. Más que el reloj: acá se busca la forma de
	    tablero de auto, no la de un reloj de pared. */
	const ABIERTO = 108;
	const LARGO = 2 * Math.PI * R;
	const ARCO = (LARGO * (360 - ABIERTO)) / 360;
	const TERCIO = ARCO / 3;

	const TONOS = ['verde', 'amarillo', 'rojo'] as const;

	const indice = $derived.by(() => {
		const i = intensidades.findIndex((x) => x.id === elegido);
		return i === -1 ? Math.floor(intensidades.length / 2) : i;
	});

	/** El medio del tercio elegido, no el borde: 16.7 / 50 / 83.3 sobre 100. */
	const valor = $derived(((indice + 0.5) / Math.max(1, intensidades.length)) * 100);

	/*
	 * El ángulo, en el mismo sistema que usa la rotación del arco.
	 *
	 * `<g transform="rotate(90 + ABIERTO/2)">` gira el círculo entero ese tanto
	 * en el sentido normal de SVG (0° = las 3, creciendo en sentido horario). La
	 * aguja tiene que usar exactamente esa misma cuenta para el ángulo, sin
	 * restarle nada: hacerlo —que es lo que hacía la primera versión, copiada
	 * del `Reloj`— corría la aguja 90° de más, y con un relleno continuo casi no
	 * se nota; con tres tercios de color fijo, "Firme" señalaba al verde en vez
	 * de al amarillo, y se veía a la primera.
	 */
	const angulo = $derived(90 + ABIERTO / 2 + ((360 - ABIERTO) * valor) / 100);
	const punta = $derived.by(() => {
		const rad = (angulo * Math.PI) / 180;
		return { x: CENTRO + Math.cos(rad) * (R - 10), y: CENTRO + Math.sin(rad) * (R - 10) };
	});

	const actual = $derived(intensidades[indice]);
</script>

<svg
	class="velocimetro tono-{TONOS[indice] ?? 'amarillo'}"
	viewBox="0 0 100 78"
	width={tamano}
	height={(tamano * 78) / 100}
	role="img"
	aria-label="Intensidad: {actual?.nombre ?? ''}"
>
	<g transform="rotate({90 + ABIERTO / 2} {CENTRO} {CENTRO})">
		<circle
			class="zona verde"
			cx={CENTRO}
			cy={CENTRO}
			r={R}
			stroke-dasharray="{TERCIO} {LARGO}"
			stroke-dashoffset="0"
		/>
		<circle
			class="zona amarillo"
			cx={CENTRO}
			cy={CENTRO}
			r={R}
			stroke-dasharray="{TERCIO} {LARGO}"
			stroke-dashoffset={-TERCIO}
		/>
		<circle
			class="zona rojo"
			cx={CENTRO}
			cy={CENTRO}
			r={R}
			stroke-dasharray="{TERCIO} {LARGO}"
			stroke-dashoffset={-2 * TERCIO}
		/>
	</g>

	<!-- La aguja. -->
	<line class="aguja" x1={CENTRO} y1={CENTRO} x2={punta.x} y2={punta.y} stroke-linecap="round" />
	<circle class="eje" cx={CENTRO} cy={CENTRO} r="4.5" />

	{#if actual}
		<text class="nombre" x={CENTRO} y="70" text-anchor="middle">{actual.nombre}</text>
	{/if}
</svg>

<style>
	.velocimetro {
		display: block;
		overflow: visible;
		margin: 0 auto;
	}
	.zona {
		fill: none;
		stroke-width: 9;
		transition: stroke-dashoffset 0.2s ease;
	}
	.zona.verde {
		stroke: var(--acento);
	}
	.zona.amarillo {
		stroke: var(--espera);
	}
	.zona.rojo {
		stroke: var(--malo);
	}
	.aguja {
		fill: none;
		stroke-width: 3.5;
		/*
		 * Girar `x2`/`y2` no anima solo: son números, no una transformación. Y
		 * transicionar el ángulo con CSS tampoco alcanza acá porque la línea se
		 * recalcula entera con cada valor de `punta`, no gira sobre un pivote.
		 * Lo que se ve moverse es el color al cambiar de tercio; el salto de
		 * posición es instantáneo, como el de una aguja real que no se demora
		 * pasando de un número al otro.
		 */
	}
	.tono-verde .aguja,
	.tono-verde .eje {
		stroke: var(--acento);
	}
	.tono-amarillo .aguja,
	.tono-amarillo .eje {
		stroke: var(--espera);
	}
	.tono-rojo .aguja,
	.tono-rojo .eje {
		stroke: var(--malo);
	}
	.eje {
		fill: var(--tarjeta);
		stroke-width: 2;
	}
	.nombre {
		fill: var(--texto, #e7ebf3);
		stroke: none;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
</style>
