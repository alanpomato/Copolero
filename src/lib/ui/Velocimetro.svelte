<script lang="ts">
	/**
	 * La intensidad de la pretemporada, como velocímetro. Y se toca.
	 *
	 * Alan lo pidió con una imagen de referencia: "la parte de intensidad,
	 * poner un velocímetro, aguja sobre arco de colores, como el que mandaste".
	 * Las tres tarjetas de abajo (Suave / Firme / A matar) ya dicen en texto qué
	 * hace cada una; esto es lo que falta arriba: verlo de un vistazo, como se
	 * mira la aguja de un auto y no la ficha técnica del motor.
	 *
	 * Después lo jugó y pidió la otra mitad: "que uno mueva la aguja y según
	 * adonde mueva le diga suave/firme/a matar". Antes era decoración —dibujaba
	 * lo que ya se había elegido en las tarjetas de abajo— y ahora es un input
	 * más: tocarlo o arrastrarlo elige la intensidad tan bien como tocar la
	 * tarjeta, y las dos formas se mantienen sincronizadas porque las dos
	 * escriben la misma variable.
	 *
	 * La geometría —ida (índice → ángulo) y vuelta (ángulo → índice)— vive en
	 * `velocimetro-geometria.ts`, sin Svelte de por medio: son las dos mitades
	 * de la misma cuenta y tienen que usar exactamente la misma escala, así que
	 * conviene que estén juntas y sean fáciles de probar solas.
	 */
	import type { PerfilDeIntensidad } from '$lib/engine/entrenamiento';
	import {
		ABIERTO,
		CENTRO,
		R,
		anguloDe,
		anguloDelPuntero,
		puntaDe,
		zonaDesdeAngulo
	} from './velocimetro-geometria';

	let {
		intensidades,
		elegido = $bindable(),
		tamano = 168
	}: {
		/** Las tres, en el orden en que se dibujan: de la más floja a la más dura. */
		intensidades: PerfilDeIntensidad[];
		/** El id elegido. Si no hay ninguno todavía, apunta al del medio. Se puede tocar para cambiarlo. */
		elegido?: string;
		tamano?: number;
	} = $props();

	const LARGO = 2 * Math.PI * R;
	const ARCO = (LARGO * (360 - ABIERTO)) / 360;
	const TERCIO = ARCO / 3;

	const TONOS = ['verde', 'amarillo', 'rojo'] as const;

	const indice = $derived.by(() => {
		const i = intensidades.findIndex((x) => x.id === elegido);
		return i === -1 ? Math.floor(intensidades.length / 2) : i;
	});

	const angulo = $derived(anguloDe(indice, intensidades.length));
	const punta = $derived(puntaDe(angulo));

	const actual = $derived(intensidades[indice]);

	// ---------------------------------------------------------------------
	// Tocar o arrastrar la aguja
	// ---------------------------------------------------------------------

	let svg: SVGSVGElement | undefined = $state();
	let arrastrando = $state(false);

	/** Alto real del viewBox: ancho 100, alto 78 —ver el `viewBox` del `<svg>`. */
	const ALTO_VIEWBOX = 78;

	function elegirDesde(clientX: number, clientY: number) {
		if (!svg || intensidades.length === 0) return;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;
		const x = ((clientX - rect.left) / rect.width) * 100;
		const y = ((clientY - rect.top) / rect.height) * ALTO_VIEWBOX;
		const ang = anguloDelPuntero(x, y, CENTRO);
		const zona = zonaDesdeAngulo(ang, intensidades.length);
		const nuevo = intensidades[zona]?.id;
		if (nuevo) elegido = nuevo;
	}

	function onPointerDown(e: PointerEvent) {
		arrastrando = true;
		svg?.setPointerCapture(e.pointerId);
		elegirDesde(e.clientX, e.clientY);
	}
	function onPointerMove(e: PointerEvent) {
		if (!arrastrando) return;
		elegirDesde(e.clientX, e.clientY);
	}
	function onPointerUp() {
		arrastrando = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (intensidades.length === 0) return;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			elegido = intensidades[Math.max(0, indice - 1)].id;
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			elegido = intensidades[Math.min(intensidades.length - 1, indice + 1)].id;
		} else if (e.key === 'Home') {
			e.preventDefault();
			elegido = intensidades[0].id;
		} else if (e.key === 'End') {
			e.preventDefault();
			elegido = intensidades[intensidades.length - 1].id;
		}
	}
</script>

<svg
	bind:this={svg}
	class="velocimetro tono-{TONOS[indice] ?? 'amarillo'}"
	viewBox="0 0 100 {ALTO_VIEWBOX}"
	width={tamano}
	height={(tamano * ALTO_VIEWBOX) / 100}
	role="slider"
	tabindex="0"
	aria-label="Intensidad de la pretemporada"
	aria-valuemin={0}
	aria-valuemax={Math.max(0, intensidades.length - 1)}
	aria-valuenow={indice}
	aria-valuetext={actual?.nombre ?? ''}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKeydown}
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
		touch-action: none;
		cursor: grab;
	}
	.velocimetro:active {
		cursor: grabbing;
	}
	.velocimetro:focus-visible {
		outline: 2px solid var(--acento);
		outline-offset: 4px;
		border-radius: 8px;
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
