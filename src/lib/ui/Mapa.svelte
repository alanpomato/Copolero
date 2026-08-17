<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { TIERRAS, contornoDe, dondeJuega, proyectar } from './planisferio';
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
	 * El mapa es un mapa: costas de verdad y cada club en la longitud y la
	 * latitud de su ciudad. La primera versión eran cuatro óvalos grises y no se
	 * leían como continentes porque no lo eran —Alan lo dijo mirándolo: "¿y esto
	 * qué sería?"—. Con la costa dibujada, Sudamérica se reconoce sin que nadie
	 * la señale, y recién ahí el mapa empieza a decir algo. Ver `planisferio.ts`.
	 */
	let { historial }: { historial: HitoTemporada[] } = $props();

	type Parada = {
		clubId: string;
		pais: string;
		ciudad: string;
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
	 * Y se dibuja en la ciudad del club, no en la del país: entre Rosario y
	 * Tucumán hay mil kilómetros, y con el país una carrera entera en Argentina
	 * era un solo punto donde no se veía nada.
	 */
	const paradas = $derived.by<Parada[]>(() => {
		const porClub = new Map<string, Parada>();

		for (const hito of historial) {
			const { club, pais } = contexto(hito.clubId);
			const donde = proyectar(dondeJuega(club.ciudad, pais.id));
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
				ciudad: club.ciudad,
				nombre: club.nombre,
				temporadas: 1,
				desde: hito.temporada,
				titulos: hito.titulo ? 1 : 0,
				// Un desvío chico para que dos clubes del mismo país no se pisen. Sale
				// del id, así que es el mismo siempre: al azar, el mapa se
				// reacomodaría solo en cada render.
				x: donde.x + ((semilla % 7) - 3) * 1.1,
				y: donde.y + ((Math.floor(semilla / 7) % 5) - 2) * 1.3
			});
		}

		return [...porClub.values()].sort((a, b) => a.desde - b.desde);
	});

	const masLargo = $derived(Math.max(1, ...paradas.map((p) => p.temporadas)));

	/** El radio crece con las temporadas, pero con raíz: si no, quince años tapan el mapa. */
	function radio(temporadas: number): number {
		return 1.6 + Math.sqrt(temporadas / masLargo) * 2.6;
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
			<svg viewBox="0 0 100 100" role="img" aria-label="Mapa de la carrera">
				<!-- Las costas, de verdad. Ver `planisferio.ts`. -->
				<g class="tierra">
					{#each TIERRAS as tierra (tierra.nombre)}
						<path d={contornoDe(tierra.puntos)} />
					{/each}
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
						<span class="donde">
							{p.nombre}
							<i>{p.ciudad}</i>
						</span>
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
	.tierra path {
		fill: rgba(255, 255, 255, 0.055);
		stroke: rgba(255, 255, 255, 0.12);
		stroke-width: 0.25;
		stroke-linejoin: round;
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
		line-height: 1.2;
	}
	.donde i {
		display: block;
		font-style: normal;
		font-weight: 400;
		font-size: 0.74rem;
		color: var(--tenue);
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
