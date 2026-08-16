<script lang="ts">
	import { escudoDe } from './escudos';

	/**
	 * La camiseta del club, con el número puesto.
	 *
	 * Es la imagen que le pone cara al jugador. Sale de los mismos colores y el
	 * mismo patrón que el escudo, así que cambia sola cuando lo transfieren, y
	 * ver la camiseta nueva es la mitad de lo que se siente al cambiar de club.
	 *
	 * Dibujada, no una foto: no hay ninguna imagen que bajar y funciona para los
	 * 268 clubes por igual.
	 */
	let {
		clubId,
		numero,
		nombre = '',
		alto = 150
	}: { clubId: string; numero: number; nombre?: string; alto?: number } = $props();

	const c = $derived(escudoDe(clubId));
	const id = $derived(`camiseta-${clubId}-${numero}`);

	/** Contorno de una camiseta en una grilla de 100×110. */
	const CONTORNO =
		'M30 8 L42 4 Q50 12 58 4 L70 8 L92 22 L82 44 L72 38 L72 104 Q50 108 28 104 L28 38 L18 44 L8 22 Z';

	/** El apellido, que es lo que va en la espalda. */
	const apellido = $derived(nombre.trim().split(/\s+/).slice(-1)[0].toUpperCase());
</script>

<svg
	class="camiseta"
	viewBox="0 0 100 118"
	height={alto}
	role="img"
	aria-label={`Camiseta ${numero}`}
>
	<defs>
		<clipPath id={`recorte-${id}`}>
			<path d={CONTORNO} />
		</clipPath>
	</defs>

	<g clip-path="url(#recorte-{id})">
		<rect x="0" y="0" width="100" height="118" fill={c.principal} />

		{#if c.patron === 'bandas'}
			{#each [8, 28, 48, 68, 88] as x (x)}
				<rect {x} y="0" width="10" height="118" fill={c.secundario} />
			{/each}
		{:else if c.patron === 'mitades'}
			<rect x="50" y="0" width="50" height="118" fill={c.secundario} />
		{:else if c.patron === 'sash'}
			<polygon points="0,88 88,0 100,0 100,14 14,102 0,102" fill={c.secundario} />
		{:else if c.patron === 'franjas'}
			{#each [10, 34, 58, 82] as y (y)}
				<rect x="0" {y} width="100" height="12" fill={c.secundario} />
			{/each}
		{:else if c.patron === 'aro'}
			<rect x="0" y="46" width="100" height="16" fill={c.secundario} />
		{/if}

		<!-- Sombra del pliegue, para que no parezca un cartel. -->
		<rect x="0" y="0" width="100" height="118" fill="url(#sombra-{id})" opacity="0.5" />
	</g>

	<defs>
		<linearGradient id={`sombra-${id}`} x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#000" stop-opacity="0.35" />
			<stop offset="0.35" stop-color="#000" stop-opacity="0" />
			<stop offset="0.7" stop-color="#000" stop-opacity="0" />
			<stop offset="1" stop-color="#000" stop-opacity="0.35" />
		</linearGradient>
	</defs>

	<path d={CONTORNO} fill="none" stroke="rgba(0,0,0,.5)" stroke-width="2.5" />
	<path d={CONTORNO} fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1" />

	{#if apellido && apellido !== ''}
		<text
			x="50"
			y="46"
			text-anchor="middle"
			font-size="9"
			font-weight="700"
			letter-spacing="1"
			fill={c.tinta}
			stroke="rgba(0,0,0,.4)"
			stroke-width="2"
			paint-order="stroke"
		>
			{apellido.slice(0, 12)}
		</text>
	{/if}

	<text
		x="50"
		y="82"
		text-anchor="middle"
		font-size="38"
		font-weight="800"
		letter-spacing="-1"
		fill={c.tinta}
		stroke="rgba(0,0,0,.4)"
		stroke-width="3"
		paint-order="stroke"
	>
		{numero}
	</text>
</svg>

<style>
	.camiseta {
		display: block;
		filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
	}
</style>
