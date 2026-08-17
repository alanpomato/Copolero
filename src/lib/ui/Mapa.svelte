<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import Escudo from './Escudo.svelte';
	import type { HitoTemporada } from '$lib/engine/tipos';

	/**
	 * Dónde estuvo.
	 *
	 * Una carrera es un recorrido y hasta ahora solo se podía leer como lista:
	 * el diario cuenta año por año y el gráfico cuenta el nivel, pero ninguno de
	 * los dos contesta la pregunta más simple que uno se hace mirando para atrás
	 * —¿dónde estuve, y dónde me quedé—.
	 *
	 * Cada país donde jugó es un círculo, y el círculo crece con las temporadas
	 * que pasó ahí. Así, de un vistazo, se ve la diferencia entre el que hizo
	 * quince años en un lugar y el que rebotó por seis: el primero es un punto
	 * grande, el segundo es un puñado de puntos chicos. Eso no se puede leer en
	 * una lista.
	 *
	 * El mapa es esquemático a propósito y no un mapa de verdad: no hace falta
	 * geografía para que se entienda, y un planisferio real sería un archivo
	 * enorme para decir lo mismo. Las posiciones son las justas para que
	 * Sudamérica esté abajo a la izquierda y Europa arriba a la derecha, que es
	 * lo único que el dibujo necesita contar.
	 */
	let { historial }: { historial: HitoTemporada[] } = $props();

	/**
	 * Dónde va cada país en el dibujo, en porcentaje del ancho y del alto.
	 *
	 * A ojo, y alcanza: lo que se lee es "cruzó el charco", no la latitud.
	 */
	const DONDE: Record<string, { x: number; y: number }> = {
		ar: { x: 26, y: 84 },
		uy: { x: 33, y: 78 },
		cl: { x: 19, y: 76 },
		br: { x: 34, y: 62 },
		mx: { x: 12, y: 36 },
		pt: { x: 55, y: 40 },
		es: { x: 59, y: 42 },
		en: { x: 61, y: 24 },
		fr: { x: 64, y: 34 },
		nl: { x: 66, y: 25 },
		de: { x: 71, y: 29 },
		it: { x: 71, y: 43 },
		tr: { x: 84, y: 46 }
	};

	type Parada = {
		clubId: string;
		pais: string;
		nombre: string;
		temporadas: number;
		/** La primera temporada en la que estuvo ahí: ordena el recorrido. */
		desde: number;
		titulos: number;
		x: number;
		y: number;
	};

	/**
	 * El recorrido, club por club y en orden.
	 *
	 * Se cuenta por club y no por país porque un club es un lugar y un país es
	 * una zona: dos años en Boca y dos en River no son cuatro años en Argentina.
	 * Pero se dibuja en la posición del país, con un desvío por club para que
	 * dos clubes del mismo lugar no se pisen.
	 */
	const paradas = $derived.by<Parada[]>(() => {
		const porClub = new Map<string, Parada>();

		for (const hito of historial) {
			const { club, pais } = contexto(hito.clubId);
			const donde = DONDE[pais.id] ?? { x: 50, y: 50 };
			const ya = porClub.get(hito.clubId);
			if (ya) {
				ya.temporadas += 1;
				if (hito.titulo) ya.titulos += 1;
				continue;
			}
			// El desvío sale del id del club, así que es el mismo siempre: si fuera
			// al azar, el mapa se reacomodaría solo en cada render.
			const semilla = [...hito.clubId].reduce((a, c) => a + c.charCodeAt(0), 0);
			porClub.set(hito.clubId, {
				clubId: hito.clubId,
				pais: pais.id,
				nombre: club.nombre,
				temporadas: 1,
				desde: hito.temporada,
				titulos: hito.titulo ? 1 : 0,
				x: donde.x + ((semilla % 7) - 3) * 1.6,
				y: donde.y + ((Math.floor(semilla / 7) % 5) - 2) * 1.8
			});
		}

		return [...porClub.values()].sort((a, b) => a.desde - b.desde);
	});

	const masLargo = $derived(Math.max(1, ...paradas.map((p) => p.temporadas)));

	/** El radio crece con las temporadas, pero con raíz: si no, quince años tapan el mapa. */
	function radio(temporadas: number): number {
		return 1.9 + Math.sqrt(temporadas / masLargo) * 3.4;
	}

	const total = $derived(paradas.reduce((suma, p) => suma + p.temporadas, 0));
	const donde = $derived(paradas.length);
	const masQuedado = $derived([...paradas].sort((a, b) => b.temporadas - a.temporadas)[0]);
</script>

{#if paradas.length > 0}
	<details class="mapa">
		<summary>
			<span class="que">
				<b>Por dónde pasó</b>
				<i>
					{donde}
					{donde === 1 ? 'club' : 'clubes'} · {total}
					{total === 1 ? 'temporada' : 'temporadas'}
					{#if masQuedado && masQuedado.temporadas > 1}
						· {masQuedado.temporadas} en {masQuedado.nombre}
					{/if}
				</i>
			</span>
			<span class="ver">Ver</span>
		</summary>

		<div class="adentro">
			<!--
				El viewBox recorta el aire de arriba y de abajo: con 0 0 100 100 el
				mapa salía cuadrado y en la columna del medio eso son setecientos
				píxeles para decir dónde jugó.
			-->
			<svg viewBox="0 14 100 78" role="img" aria-label="Mapa de la carrera">
				<!--
					Los continentes, apenas insinuados. No es geografía: es para que los
					círculos no floten en un rectángulo vacío.
				-->
				<g class="tierra">
					<ellipse cx="27" cy="74" rx="13" ry="21" />
					<ellipse cx="14" cy="36" rx="9" ry="10" />
					<ellipse cx="67" cy="34" rx="17" ry="15" />
					<ellipse cx="83" cy="46" rx="7" ry="6" />
				</g>

				<!-- El recorrido, en orden. Es la carrera dibujada como viaje. -->
				{#each paradas.slice(1) as p, i (p.clubId)}
					{@const antes = paradas[i]}
					<line class="camino" x1={antes.x} y1={antes.y} x2={p.x} y2={p.y} />
				{/each}

				{#each paradas as p (p.clubId)}
					<circle class="parada" cx={p.x} cy={p.y} r={radio(p.temporadas)} />
					{#if p.titulos > 0}
						<circle class="conTitulo" cx={p.x} cy={p.y} r={radio(p.temporadas) + 1.4} />
					{/if}
				{/each}
			</svg>

			<ul class="lista">
				{#each [...paradas].sort((a, b) => b.temporadas - a.temporadas) as p (p.clubId)}
					<li>
						<Escudo clubId={p.clubId} tamano={22} />
						<span class="donde">{p.nombre}</span>
						<span class="cuanto">
							{p.temporadas}
							{p.temporadas === 1 ? 'temporada' : 'temporadas'}
							{#if p.titulos > 0}<b>· {p.titulos} {p.titulos === 1 ? 'título' : 'títulos'}</b>{/if}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</details>
{/if}

<style>
	.mapa {
		margin: 0 0 1rem;
		background: var(--tarjeta);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		overflow: hidden;
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.8rem 1rem;
		list-style: none;
		cursor: pointer;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		background: var(--tarjeta-alta);
	}
	.que b {
		display: block;
		font-size: 0.95rem;
		line-height: 1.25;
	}
	.que i {
		font-style: normal;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	.ver {
		flex: none;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--acento);
	}
	.mapa[open] summary {
		border-bottom: 1px solid var(--borde);
	}

	.adentro {
		display: grid;
		gap: 1rem;
		padding: 1rem;
	}
	@container (min-width: 34rem) {
		.adentro {
			grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
			align-items: start;
		}
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 10px;
	}
	.tierra ellipse {
		fill: rgba(255, 255, 255, 0.045);
	}
	/* El camino: se ve el orden en que pasó por cada lugar. */
	.camino {
		stroke: var(--borde);
		stroke-width: 0.5;
		stroke-dasharray: 1.4 1.4;
	}
	.parada {
		fill: var(--acento);
		fill-opacity: 0.75;
		stroke: var(--fondo);
		stroke-width: 0.6;
	}
	/* Donde salió campeón, un anillo. */
	.conTitulo {
		fill: none;
		stroke: var(--espera);
		stroke-width: 0.7;
	}

	.lista {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	.lista li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.84rem;
	}
	.donde {
		flex: 1;
		min-width: 0;
		font-weight: 700;
	}
	.cuanto {
		flex: none;
		color: var(--tenue);
		font-size: 0.78rem;
	}
	.cuanto b {
		color: var(--espera);
		font-weight: 700;
	}
</style>
