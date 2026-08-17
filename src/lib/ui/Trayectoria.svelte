<script lang="ts">
	import { club } from '../../../content/mundo';
	import type { HitoTemporada } from '$lib/engine/tipos';
	import Escudo from './Escudo.svelte';
	import { escudoDe } from './escudos';

	/**
	 * La carrera dibujada.
	 *
	 * Una barra por temporada, con la altura de la nota del año y el color del
	 * club donde se jugó. Encima, la línea de la media: la barra dice cómo le fue,
	 * la línea dice cuánto vale.
	 *
	 * Es la única pantalla donde se ve la forma de la carrera entera —el pico, la
	 * meseta, la caída— y es lo que hace que uno quiera una temporada más para
	 * ver hasta dónde llega la línea. Se toca una barra y abajo aparece ese año.
	 */
	let { historial }: { historial: HitoTemporada[] } = $props();

	/** Cuál está seleccionada. Por defecto, la última: la que acaba de pasar. */
	let elegida = $state<number | null>(null);
	const hito = $derived(
		historial.length === 0
			? null
			: (historial.find((h) => h.temporada === elegida) ?? historial[historial.length - 1])
	);

	/*
	 * Grilla del dibujo.
	 *
	 * El viewBox mide siempre lo mismo. Antes crecía con la cantidad de
	 * temporadas —`ancho = cuantas * paso + 8`— y con una sola temporada quedaba
	 * en 52 unidades, que estiradas al ancho de la tarjeta son catorce veces:
	 * una barra roja gigante y un "6.7" de treinta píxeles. El dibujo no puede
	 * cambiar de escala según cuánto lleve jugado.
	 *
	 * Y el marco no arranca en una temporada sino en diez, aunque haya jugado
	 * una. Con eso la primera barra se ve chica dentro de un gráfico que todavía
	 * está casi vacío, que es exactamente lo que está pasando en la partida.
	 */
	const ALTO = 96;
	const PISO = 78;
	const ANCHO = 520;
	/** Temporadas que el marco muestra desde el primer día. */
	const RANURAS_MINIMAS = 10;

	const cuantas = $derived(Math.max(1, historial.length));
	const ranuras = $derived(Math.max(cuantas, RANURAS_MINIMAS));
	const paso = $derived(Math.min(44, (ANCHO - 8) / ranuras));
	const medioAncho = $derived(Math.min(9, paso * 0.3));
	const ancho = ANCHO;
	/** Con pocas temporadas entra la nota escrita arriba de cada barra. */
	const conNumeros = $derived(paso >= 22);

	function x(i: number): number {
		return 4 + i * paso + paso / 2;
	}
	/** La nota, de 0 a 10, sobre los 62px útiles. */
	function yNota(nota: number): number {
		return PISO - Math.max(2, (nota / 10) * 62);
	}
	/** La media, de 30 a 95, sobre la misma altura. Es otra escala a propósito. */
	function yMedia(media: number): number {
		return PISO - ((Math.min(95, Math.max(30, media)) - 30) / 65) * 62;
	}

	const lineaDeMedia = $derived(
		historial.map((h, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${yMedia(h.media).toFixed(1)}`).join(' ')
	);

	/** Los títulos, agrupados por club: la vitrina. */
	const vitrina = $derived.by(() => {
		const por = new Map<string, number>();
		for (const h of historial) {
			if (h.titulo) por.set(h.clubId, (por.get(h.clubId) ?? 0) + 1);
		}
		return [...por.entries()].sort((a, b) => b[1] - a[1]);
	});

	const mundialesGanados = $derived(historial.filter((h) => h.mundial === 'campeon').length);
	const mundialesJugados = $derived(historial.filter((h) => h.mundial).length);

	const RESULTADO: Record<string, string> = {
		campeon: 'campeón del mundo',
		final: 'subcampeón del mundo',
		semifinal: 'semifinal del Mundial',
		cuartos: 'cuartos del Mundial',
		'fase-de-grupos': 'fase de grupos del Mundial'
	};
</script>

{#if historial.length > 0}
	<!--
		Plegado, como el mapa.

		El gráfico es la pantalla más linda del juego y también la más alta: mil
		píxeles que se miran cada tanto y que empujan el diario fuera de la
		pantalla todas las veces. Se abre cuando se lo quiere mirar, que es
		exactamente cuando vale la pena.
	-->
	<details class="tarjeta laCarrera" data-tema="historia">
		<summary>
			<span class="que">
				<b>La carrera</b>
				<i>
					{historial.length}
					{historial.length === 1 ? 'temporada' : 'temporadas'} · el pico, la meseta y la caída
				</i>
			</span>
			<span class="ver">Ver</span>
		</summary>

		<p class="sutil" style="margin:.8rem 0 .8rem">
			Barras: la nota de cada año, con los colores del club. <b class="leyenda">Línea dorada</b>:
			cómo fue creciendo tu media. Tocá una barra para ver ese año.
		</p>

		<div class="lienzo">
			<svg viewBox="0 0 {ancho} {ALTO}" role="img" aria-label="Carrera">
				<!-- Las referencias: nota 5 y nota 8, para tener contra qué mirar. -->
				{#each [5, 8] as marca (marca)}
					<line
						x1="0"
						y1={yNota(marca)}
						x2={ancho}
						y2={yNota(marca)}
						stroke="rgba(255,255,255,.09)"
						stroke-dasharray="2 3"
					/>
				{/each}
				<line x1="0" y1={PISO} x2={ancho} y2={PISO} stroke="rgba(255,255,255,.18)" />

				{#each historial as h, i (h.temporada)}
					{@const c = escudoDe(h.clubId)}
					{@const arriba = yNota(h.nota)}
					<g
						class="barra"
						class:elegida={hito?.temporada === h.temporada}
						role="button"
						tabindex="0"
						aria-label={`Temporada ${h.temporada}`}
						onclick={() => (elegida = h.temporada)}
						onkeydown={(e) => e.key === 'Enter' && (elegida = h.temporada)}
					>
						<!-- El área de toque, que es más ancha que la barra. -->
						<rect x={x(i) - paso / 2} y="0" width={paso} height={ALTO} fill="transparent" />
						<rect
							x={x(i) - medioAncho}
							y={arriba}
							width={medioAncho * 2}
							height={PISO - arriba}
							rx="2"
							fill={c.principal}
							stroke={c.secundario}
							stroke-width="1"
						/>
						<!--
							La nota escrita, y arriba de ella lo que se ganó ese año. Van en dos
							alturas distintas para que un año de campeón muestre las dos cosas.
						-->
						{#if conNumeros}
							<text
								x={x(i)}
								y={arriba - 4}
								text-anchor="middle"
								font-size="8"
								fill="var(--tenue)"
								class="nota">{h.nota.toFixed(1)}</text
							>
						{/if}
						{#if h.titulo}
							<text x={x(i)} y={arriba - (conNumeros ? 14 : 4)} text-anchor="middle" font-size="9"
								>🏆</text
							>
						{:else if h.mundial === 'campeon'}
							<text x={x(i)} y={arriba - (conNumeros ? 14 : 4)} text-anchor="middle" font-size="9"
								>🌍</text
							>
						{:else if h.mundial}
							<circle cx={x(i)} cy={arriba - (conNumeros ? 15 : 5)} r="2" fill="var(--espera)" />
						{/if}
						{#if h.seFue}
							<!-- Se fue al terminar ese año: la línea marca dónde se cortó. -->
							<line
								x1={x(i) + paso / 2}
								y1="6"
								x2={x(i) + paso / 2}
								y2={PISO}
								stroke="var(--mercado)"
								stroke-width="1"
								stroke-dasharray="2 2"
							/>
						{/if}
						<text
							x={x(i)}
							y={ALTO - 4}
							text-anchor="middle"
							font-size="7"
							fill="var(--tenue)"
							class="edad">{h.edad}</text
						>
					</g>
				{/each}

				<!--
					La línea de la media va arriba de todo y con un halo oscuro detrás: cae
					justo encima de las barras y sin el halo se pierde contra el color del
					club, que además es distinto en cada tramo.
				-->
				<path d={lineaDeMedia} fill="none" stroke="rgba(13,17,23,.85)" stroke-width="4.5" />
				<path
					d={lineaDeMedia}
					fill="none"
					stroke="var(--plata)"
					stroke-width="1.8"
					stroke-linejoin="round"
				/>
				{#each historial as h, i (h.temporada)}
					<circle
						cx={x(i)}
						cy={yMedia(h.media)}
						r="2.2"
						fill="var(--plata)"
						stroke="rgba(13,17,23,.85)"
						stroke-width="1"
					/>
				{/each}
			</svg>
		</div>

		{#if hito}
			<div class="detalle">
				<div class="quien">
					<Escudo clubId={hito.clubId} tamano={30} />
					<div>
						<b>Temporada {hito.temporada}</b>
						<span class="sutil"> · {hito.anio} · {hito.edad} años</span>
						<div class="sutil">{club(hito.clubId).nombre}</div>
					</div>
				</div>
				<div class="cifras">
					<div class="cifra">
						<span class="valor">{hito.nota.toFixed(1)}</span>
						<span class="etiqueta">Nota</span>
					</div>
					<div class="cifra">
						<span class="valor">{hito.partidos}</span>
						<span class="etiqueta">Partidos</span>
					</div>
					<div class="cifra">
						<span class="valor">{hito.goles}</span>
						<span class="etiqueta">Goles</span>
					</div>
					<div class="cifra">
						<span class="valor">{hito.media}</span>
						<span class="etiqueta">Media</span>
					</div>
				</div>
				{#if hito.campeon || hito.mundial || hito.seFue || hito.lesionado}
					<p class="hitos">
						{#if hito.titulo}<span class="chip listo">Campeón</span>
						{:else if hito.campeon}<span class="chip">El club salió campeón sin él</span>{/if}
						{#if hito.mundial}<span class="chip listo">{RESULTADO[hito.mundial] ?? 'Mundial'}</span
							>{/if}
						{#if hito.lesionado}<span class="chip espera">Se lesionó</span>{/if}
						{#if hito.seFue}<span class="chip">Se fue a fin de año</span>{/if}
					</p>
				{/if}
			</div>
		{/if}

		{#if vitrina.length > 0 || mundialesJugados > 0}
			<div class="vitrina">
				<h4>La vitrina</h4>
				<ul>
					{#each vitrina as [clubId, cuantos] (clubId)}
						<li>
							<Escudo {clubId} tamano={22} />
							<span>{club(clubId).nombre}</span>
							<b>{cuantos}</b>
						</li>
					{/each}
					{#if mundialesGanados > 0}
						<li class="mundo">
							<span class="icono">🌍</span>
							<span>Campeón del mundo</span>
							<b>{mundialesGanados}</b>
						</li>
					{:else if mundialesJugados > 0}
						<li class="mundo">
							<span class="icono">🌍</span>
							<span>Mundiales jugados</span>
							<b>{mundialesJugados}</b>
						</li>
					{/if}
				</ul>
			</div>
		{/if}
	</details>
{/if}

<style>
	/* Plegado: el título, un resumen de una línea, y el gráfico adentro. */
	.laCarrera > summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		list-style: none;
		cursor: pointer;
	}
	.laCarrera > summary::-webkit-details-marker {
		display: none;
	}
	.laCarrera .que b {
		display: block;
		font-size: 0.95rem;
		line-height: 1.25;
	}
	.laCarrera .que i {
		font-style: normal;
		font-size: 0.8rem;
		color: var(--tenue);
	}
	.laCarrera .ver {
		flex: none;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--acento);
	}
	.lienzo {
		overflow-x: auto;
		overflow-y: hidden;
		margin: 0 -0.25rem;
		padding: 0 0.25rem 0.25rem;
	}
	.lienzo svg {
		display: block;
		width: 100%;
		height: auto;
		/*
		 * Un tope, porque en la columna del medio la tarjeta tiene setecientos y
		 * pico de píxeles y un viewBox de 520 estirado a eso agranda todo un 40%
		 * —los números, las barras, los 🏆—. Con el tope el dibujo se ve al tamaño
		 * para el que está pensado y no se deforma en pantallas grandes.
		 */
		max-width: 34rem;
		/* Centrado: con el tope, en una tarjeta ancha queda aire a la derecha, y
		   un dibujo pegado a la izquierda con un hueco al lado se lee como un
		   error de maquetación en vez de una decisión. */
		margin: 0 auto;
	}
	.leyenda {
		color: var(--plata);
	}
	.barra {
		cursor: pointer;
	}
	.barra rect {
		transition: opacity 0.12s;
	}
	.barra:not(.elegida) rect {
		opacity: 0.62;
	}
	.barra:hover rect,
	.barra:focus-visible rect {
		opacity: 1;
	}
	.barra.elegida .edad {
		fill: var(--texto);
		font-weight: 700;
	}

	.detalle {
		margin-top: 0.8rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--borde);
	}
	.quien {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 0.7rem;
		font-size: 0.9rem;
	}
	.hitos {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.75rem 0 0;
	}

	.vitrina {
		margin-top: 0.9rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--borde);
	}
	.vitrina h4 {
		margin: 0 0 0.5rem;
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tenue);
	}
	.vitrina ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}
	.vitrina li {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.88rem;
	}
	.vitrina li span:not(.icono) {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.vitrina .icono {
		width: 22px;
		text-align: center;
		font-size: 1rem;
	}
	.vitrina b {
		font-variant-numeric: tabular-nums;
		color: var(--plata);
	}
</style>
