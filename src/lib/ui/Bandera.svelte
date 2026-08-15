<script lang="ts">
	import { BANDERAS, paisDeNacionalidad } from './banderas';

	/**
	 * La banderita de un país. Se le puede pasar el id (`ar`) o la nacionalidad
	 * tal como está escrita en el contenido (`Argentina`).
	 */
	let {
		pais = '',
		nacionalidad = '',
		alto = 14
	}: { pais?: string; nacionalidad?: string; alto?: number } = $props();

	const id = $derived(pais || paisDeNacionalidad(nacionalidad) || '');
	const bandera = $derived(BANDERAS[id]);

	// Grilla de 30×20: la proporción de casi todas las banderas.
	const ANCHO = 30;
	const ALTO = 20;

	type Franja = { x: number; y: number; w: number; h: number; color: string };

	const franjas = $derived.by((): Franja[] => {
		if (!bandera) return [];
		const pesos = bandera.pesos ?? bandera.franjas.map(() => 1);
		const total = pesos.reduce((a, b) => a + b, 0);
		const largo = bandera.orientacion === 'horizontal' ? ALTO : ANCHO;

		let acumulado = 0;
		return bandera.franjas.map((color, i) => {
			const tamano = (pesos[i] / total) * largo;
			const inicio = acumulado;
			acumulado += tamano;
			return bandera.orientacion === 'horizontal'
				? { x: 0, y: inicio, w: ANCHO, h: tamano + 0.02, color }
				: { x: inicio, y: 0, w: tamano + 0.02, h: ALTO, color };
		});
	});

	/** Los rayos del sol, como una estrella de ocho puntas. */
	function rayos(cx: number, cy: number, r: number): string {
		const puntas = 8;
		const puntos: string[] = [];
		for (let i = 0; i < puntas * 2; i++) {
			const radio = i % 2 === 0 ? r : r * 0.45;
			const angulo = (i * Math.PI) / puntas - Math.PI / 2;
			puntos.push(`${(cx + radio * Math.cos(angulo)).toFixed(2)},${(cy + radio * Math.sin(angulo)).toFixed(2)}`);
		}
		return puntos.join(' ');
	}

	function estrella(cx: number, cy: number, r: number): string {
		const puntos: string[] = [];
		for (let i = 0; i < 10; i++) {
			const radio = i % 2 === 0 ? r : r * 0.42;
			const angulo = (i * Math.PI) / 5 - Math.PI / 2;
			puntos.push(`${(cx + radio * Math.cos(angulo)).toFixed(2)},${(cy + radio * Math.sin(angulo)).toFixed(2)}`);
		}
		return puntos.join(' ');
	}
</script>

{#if bandera}
	<svg
		class="bandera"
		viewBox="0 0 {ANCHO} {ALTO}"
		height={alto}
		width={alto * 1.5}
		role="img"
		aria-label={id.toUpperCase()}
	>
		{#each franjas as f, i (i)}
			<rect x={f.x} y={f.y} width={f.w} height={f.h} fill={f.color} />
		{/each}

		{#if bandera.canton}
			<rect x="0" y="0" width={ANCHO / 3} height={ALTO / 2} fill={bandera.canton} />
		{/if}

		{#if bandera.emblema}
			{@const e = bandera.emblema}
			{#if e.tipo === 'sol'}
				{@const cx = e.donde === 'canton' ? 5 : ANCHO / 2}
				{@const cy = e.donde === 'canton' ? 5 : ALTO / 2}
				<polygon points={rayos(cx, cy, 4)} fill={e.color} />
				<circle {cx} {cy} r="1.9" fill={e.color} stroke="rgba(0,0,0,.25)" stroke-width=".3" />
			{:else if e.tipo === 'estrella'}
				{@const cx = e.donde === 'canton' ? 5 : ANCHO / 2}
				{@const cy = e.donde === 'canton' ? 5 : ALTO / 2}
				<polygon points={estrella(cx, cy, 3)} fill={e.color} />
			{:else if e.tipo === 'luna'}
				<circle cx="11" cy="10" r="5" fill={e.color} />
				<circle cx="13" cy="10" r="4" fill="#e30a17" />
				<polygon points={estrella(19, 10, 3)} fill={e.color} />
			{:else if e.tipo === 'cruz'}
				<rect x="0" y="7.5" width={ANCHO} height="5" fill={e.color} />
				<rect x="12.5" y="0" width="5" height={ALTO} fill={e.color} />
			{:else if e.tipo === 'rombo'}
				<polygon points="15,2 28,10 15,18 2,10" fill={e.color} />
				<circle cx="15" cy="10" r="4.5" fill={e.interior} />
			{:else if e.tipo === 'disco'}
				{@const cx = e.donde === 'union' ? ANCHO * 0.4 : ANCHO / 2}
				<circle {cx} cy="10" r="4" fill="none" stroke={e.color} stroke-width="1.4" />
			{/if}
		{/if}

		<rect
			x="0"
			y="0"
			width={ANCHO}
			height={ALTO}
			fill="none"
			stroke="rgba(255,255,255,.22)"
			stroke-width=".8"
		/>
	</svg>
{/if}

<style>
	.bandera {
		display: inline-block;
		vertical-align: -0.15em;
		border-radius: 2px;
		flex: none;
	}
</style>
