<script lang="ts">
	import { contexto } from '../../../content/mundo';
	import { dondeJuega } from './ciudades';
	import type * as Planisferio from './planisferio';
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
	 * El mapa es un mapa de verdad. Pasó por tres versiones y las dos primeras
	 * las volteó Alan mirándolas: cuatro óvalos grises ("¿y esto qué sería?") y
	 * después contornos de treinta puntos por continente, que ya se leían pero
	 * no llegaban ("quiero un mapa bien como el de Google Maps u Open Maps o
	 * ArcGIS"). Tenía razón las dos veces: a treinta puntos Italia no tiene bota
	 * y el golfo de México no existe.
	 *
	 * Ahora los datos son Natural Earth 1:50m —dominio público, la misma base
	 * que traen QGIS y ArcGIS— con fronteras, lagos y proyección Mercator, la de
	 * los mapas web. Sigue sin pedirle nada a internet: las coordenadas están
	 * adentro del repo y el dibujo lo hace el navegador. Ver `planisferio.ts` y
	 * el script que lo genera.
	 */
	let { historial }: { historial: HitoTemporada[] } = $props();

	/*
	 * El mundo se baja cuando se abre el mapa, no antes.
	 *
	 * Natural Earth en 1:50m son unos treinta kilobytes comprimidos, y hasta
	 * acá viajaban en cada carga de la pantalla de juego aunque nadie tocara el
	 * desplegable. Es la pantalla que más se abre del juego y la mitad de las
	 * veces se abre desde el teléfono: treinta kilobytes por vista, para un
	 * panel que se mira dos veces por carrera, es un peaje que no vale.
	 *
	 * Con `import()` dinámico el mapa queda en su propio archivo y se pide la
	 * primera vez que alguien lo abre. Mientras tanto, el resumen del
	 * desplegable —cuántos clubes, cuántas temporadas, dónde más se quedó— se
	 * calcula sin geografía y está desde el primer momento.
	 */
	let mundo = $state<typeof Planisferio | null>(null);
	let bajando = $state(false);

	async function traerElMundo() {
		if (mundo || bajando) return;
		bajando = true;
		mundo = await import('./planisferio');
		bajando = false;
	}

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
		const proyectar = mundo?.proyectar;

		for (const hito of historial) {
			const { club, pais } = contexto(hito.clubId);
			// Sin el mundo bajado todavía no hay dónde ponerlos, pero sí se pueden
			// contar: el resumen del desplegable no necesita coordenadas.
			const donde = proyectar ? proyectar(dondeJuega(club.ciudad, pais.id)) : { x: 0, y: 0 };
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
				/*
				 * Un desvío mínimo, para que dos clubes de la misma ciudad no se
				 * pisen del todo.
				 *
				 * Era diez veces más grande, y con el mapa viejo no molestaba porque
				 * los contornos eran manchas. Con coordenadas de verdad, tres
				 * unidades son quinientos kilómetros: La Serena aparecía adentro del
				 * Pacífico. Lo justo para que se distingan dos círculos y ni un poco
				 * más.
				 */
				x: donde.x + ((semilla % 5) - 2) * 0.28,
				y: donde.y + ((Math.floor(semilla / 5) % 5) - 2) * 0.28
			});
		}

		return [...porClub.values()].sort((a, b) => a.desde - b.desde);
	});

	const masLargo = $derived(Math.max(1, ...paradas.map((p) => p.temporadas)));

	/**
	 * El radio crece con las temporadas, pero con raíz: si no, quince años tapan
	 * el mapa.
	 *
	 * Y más chico que antes. El mapa pasó de contornos dibujados a mano a
	 * Natural Earth: ahora el punto cae en la ciudad exacta, y un círculo de
	 * cuatro unidades sobre un país que mide seis tapaba justamente el dato que
	 * el mapa vino a mostrar.
	 */
	function radio(temporadas: number): number {
		return 0.65 + Math.sqrt(temporadas / masLargo) * 1.15;
	}

	const total = $derived(paradas.reduce((suma, p) => suma + p.temporadas, 0));
	const donde = $derived(paradas.length);
	const masQuedado = $derived([...paradas].sort((a, b) => b.temporadas - a.temporadas)[0]);
</script>

{#if paradas.length > 0}
	<details class="mapa" ontoggle={(e) => e.currentTarget.open && traerElMundo()}>
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
			{#if mundo}
				{@const { ANCHO, ALTO, PAISES, LAGOS } = mundo}
				<svg viewBox="0 0 {ANCHO} {ALTO}" role="img" aria-label="Mapa de la carrera">
					<!--
					Los países, con sus fronteras. Ver `planisferio.ts`.

					Cada país es su propio `<path>` y no hay un contorno de "tierra"
					aparte: el relleno de todos juntos da la masa continental y el trazo
					de cada uno da la frontera. Un solo dato dibuja las dos cosas.
				-->
					<g class="tierra">
						{#each PAISES as pais (pais.nombre)}
							<path d={pais.d} />
						{/each}
					</g>

					<!-- Y los lagos, del color del agua: el Michigan y el Caspio son lo
				     que termina de que un mapa se lea como un mapa. -->
					<g class="agua">
						{#each LAGOS as lago, i (i)}
							<path d={lago} />
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
							<circle class="conTitulo" cx={p.x} cy={p.y} r={radio(p.temporadas) + 0.6} />
						{/if}
					{/each}
				</svg>
			{:else}
				<!-- Un hueco de la misma altura que el mapa, para que al terminar de
				     bajar no salte todo lo que está abajo. -->
				<div class="cargando" aria-hidden="true"></div>
			{/if}

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
		/* El agua. Que el fondo sea el mar y no el fondo de la página es lo que
		   hace que se lea como un mapa y no como un dibujo recortado. */
		background: #0a1420;
		border-radius: 10px;
	}
	.tierra path {
		fill: #1c2532;
		stroke: #2f3b4d;
		stroke-width: 0.12;
		stroke-linejoin: round;
		/* Los países comparten frontera, así que cada línea se dibuja dos veces.
		   Sin esto, las fronteras quedan del doble de grosor que las costas. */
		vector-effect: non-scaling-stroke;
	}
	.agua path {
		fill: #0a1420;
		stroke: none;
	}
	.cargando {
		aspect-ratio: 100 / 91.58;
		background: #0a1420;
		border-radius: 10px;
	}
	/* El camino: se ve el orden en que pasó por cada lugar. */
	.camino {
		stroke: #7c8798;
		stroke-opacity: 0.55;
		stroke-width: 0.28;
		stroke-dasharray: 0.9 0.8;
	}
	.parada {
		fill: var(--acento);
		fill-opacity: 0.85;
		stroke: #0a1420;
		stroke-width: 0.3;
	}
	/* Donde salió campeón, un anillo. */
	.conTitulo {
		fill: none;
		stroke: var(--espera);
		stroke-width: 0.4;
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
