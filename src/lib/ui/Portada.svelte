<script lang="ts">
	import type { Portada } from '$lib/engine/portada';
	import Escudo from './Escudo.svelte';
	import Ilustracion from './Ilustracion.svelte';

	/**
	 * La tapa del diario del día después.
	 *
	 * Es lo primero que se ve al abrir la temporada nueva, y a propósito no se
	 * parece a nada más del juego: papel en vez de fondo oscuro, serif en vez de
	 * la tipografía de siempre, y un titular del tamaño de un titular. La idea es
	 * que el año que cerró se lea de un vistazo y se sienta, en vez de tener que
	 * juntar cinco números de cinco tarjetas distintas.
	 *
	 * Se puede plegar: la tapa entera la primera vez, y después queda como una
	 * línea. A la temporada doce nadie quiere volver a leer todas las tapas, pero
	 * a la primera nadie se la quiere perder.
	 */
	let { portada }: { portada: Portada } = $props();

	let abierta = $state(true);

	/**
	 * El confeti de los años buenos.
	 *
	 * Papelitos quietos, no una animación: la tapa se mira una vez y después
	 * queda plegada, y una animación que arranca cada vez que se abre la pantalla
	 * cansa a la tercera temporada. Las posiciones salen del año, así que la
	 * misma tapa se ve siempre igual.
	 */
	const papelitos = $derived.by(() => {
		if (portada.tono !== 'gloria') return [];
		const semilla = portada.anio * 31 + portada.temporada * 7;
		return Array.from({ length: 14 }, (_, i) => {
			const n = (semilla + i * 97) % 1000;
			return {
				izq: (n % 96) + 2,
				alto: ((n * 3) % 40) + 2,
				giro: (n * 7) % 180,
				color: ['#4ade80', '#e0b83a', '#6ab6e0', '#f87171'][n % 4]
			};
		});
	});
</script>

<article
	class="diario"
	class:gloria={portada.tono === 'gloria'}
	class:mala={portada.tono === 'mala'}
>
	{#if papelitos.length > 0}
		<div class="confeti" aria-hidden="true">
			{#each papelitos as p, i (i)}
				<span
					style="left:{p.izq}%; top:{p.alto}px; background:{p.color}; transform:rotate({p.giro}deg)"
				></span>
			{/each}
		</div>
	{/if}

	<header class="cabezal">
		<span class="nombre">{portada.diario}</span>
		<span class="fecha">{portada.fecha}</span>
	</header>

	<button class="plegar" onclick={() => (abierta = !abierta)} aria-expanded={abierta}>
		<span class="fajita">Temporada {portada.temporada} · {portada.anio}</span>
		<span class="flecha" class:girada={abierta}>▾</span>
	</button>

	{#if abierta}
		<h2 class="titular">{portada.titular}</h2>

		<!--
			En el celular esto es una columna: foto, bajada, notas. En pantalla ancha
			la foto se corre al costado del texto, que es cómo se arma una tapa de
			verdad y de paso arregla algo que estaba mal: la ilustración es un SVG al
			100% del ancho, así que en una columna de 786 píxeles se volvía de 440 de
			alto y se comía media pantalla ella sola.
		-->
		<div class="cuerpo">
			<div class="foto">
				<Ilustracion foto={portada.foto} clubId={portada.clubId} />
				<span class="epigrafe">
					<Escudo clubId={portada.clubId} tamano={18} />
				</span>
			</div>

			<div class="texto">
				<p class="bajada">{portada.bajada}</p>

				<!--
					La ficha del año, en la tipografía del diario.

					La tapa cuenta el año como se cuenta una temporada y eso es lo que la
					hace valer, pero después de leerla uno quiere los números. Estaban en
					el diario, tres pantallas más abajo y mezclados con todo lo demás.
				-->
				{#if portada.ficha.partidos > 0}
					<dl class="ficha">
						<div>
							<dt>PJ</dt>
							<dd>{portada.ficha.partidos}</dd>
						</div>
						<div>
							<dt>Goles</dt>
							<dd>{portada.ficha.goles}</dd>
						</div>
						<div>
							<dt>Asist.</dt>
							<dd>{portada.ficha.asistencias}</dd>
						</div>
						<div class="destacada">
							<dt>G+A</dt>
							<dd>{portada.ficha.participaciones}</dd>
						</div>
						<div>
							<dt>Gol/PJ</dt>
							<dd>{portada.ficha.promedio}</dd>
						</div>
						<div>
							<dt>Nota</dt>
							<dd>{portada.ficha.nota.toFixed(1)}</dd>
						</div>
					</dl>

					{#if portada.ficha.seleccion}
						<p class="seleccion">{portada.ficha.seleccion}</p>
					{/if}
				{/if}

				<div class="notas">
					{#each portada.notas as nota (nota.titulo)}
						<section>
							<h3>{nota.titulo}</h3>
							<p>{nota.texto}</p>
						</section>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<p class="plegada">{portada.titular}</p>
	{/if}
</article>

<style>
	/*
	 * Papel. Es el único bloque claro de todo el juego y ésa es la gracia: corta
	 * la pantalla en dos y avisa sin palabras que acá empieza otra cosa.
	 */
	.diario {
		position: relative;
		/* La tapa se acomoda a su propio ancho, no al de la ventana. */
		container-type: inline-size;
		--tinta: #16181c;
		--tinta-suave: #4a4f57;
		background: #f4f1e8;
		color: var(--tinta);
		border-radius: var(--radio);
		padding: 1rem 1.1rem 1.2rem;
		margin: 0 0 1rem;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.45),
			0 0 0 1px rgba(0, 0, 0, 0.5);
		font-family: Georgia, 'Times New Roman', serif;
	}
	.diario.gloria {
		background: #f7f2e0;
		box-shadow:
			0 10px 34px rgba(224, 184, 58, 0.25),
			0 0 0 1px rgba(224, 184, 58, 0.55);
	}
	.diario.mala {
		background: #eceae4;
	}

	.confeti {
		position: absolute;
		inset: 0 0 auto;
		height: 90px;
		overflow: hidden;
		pointer-events: none;
	}
	.confeti span {
		position: absolute;
		width: 10px;
		height: 4px;
		border-radius: 1px;
		opacity: 0.85;
	}

	.cabezal {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		border-bottom: 3px double var(--tinta);
		padding-bottom: 0.45rem;
	}
	.nombre {
		font-weight: 800;
		font-size: 1.35rem;
		letter-spacing: 0.14em;
		line-height: 1;
	}
	.fecha {
		font-size: 0.7rem;
		color: var(--tinta-suave);
		font-style: italic;
		text-align: right;
		flex: none;
	}

	.plegar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin: 0.55rem 0 0;
		padding: 0;
		background: none;
		border: none;
		color: var(--tinta-suave);
		font: inherit;
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		cursor: pointer;
	}
	.plegar:hover .fajita {
		color: var(--tinta);
	}
	.flecha {
		transition: transform 0.15s;
	}
	.flecha.girada {
		transform: rotate(180deg);
	}

	/*
	 * El titular no es un rótulo de sección: es el titular de un diario.
	 *
	 * `h2` en `app.css` es el cartel de "acá empieza otra parte" —chico, verde, en
	 * mayúsculas espaciadas, con una línea al costado—. Acá hay que apagar todo
	 * eso a mano, incluida la línea del `::after`, o la tapa sale con una raya
	 * verde cruzándole el titular.
	 */
	.titular {
		display: block;
		margin: 0.5rem 0 0.7rem;
		font-size: clamp(1.7rem, 8.5vw, 2.5rem);
		line-height: 0.98;
		font-weight: 800;
		text-transform: none;
		letter-spacing: -0.02em;
		color: var(--tinta);
		border: none;
	}
	.titular::after {
		content: none;
	}

	.cuerpo {
		display: grid;
		gap: 0.7rem;
	}
	.foto {
		position: relative;
	}
	/* Cuando la tapa es ancha, la foto se va al costado del texto. */
	@container (min-width: 33rem) {
		.cuerpo {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 1.1rem;
			align-items: start;
		}
		/* Y las notas del costado pasan a dos columnas dentro de su mitad cuando
		   hay lugar: son cuatro párrafos cortos, no un texto corrido. */
		.texto .notas {
			gap: 0.55rem 1rem;
		}
	}
	/* Y en una columna muy ancha, un tope para que no crezca sin fin. */
	.foto :global(svg) {
		max-height: 20rem;
	}
	.epigrafe {
		position: absolute;
		right: 6px;
		bottom: 6px;
		display: flex;
		padding: 3px;
		border-radius: 5px;
		background: rgba(244, 241, 232, 0.9);
	}

	.bajada {
		margin: 0 0 0.85rem;
		font-size: 1.02rem;
		line-height: 1.45;
		color: var(--tinta);
	}

	/* La ficha: números de diario, con línea arriba y abajo como una tabla de
	   resultados de papel. */
	.ficha {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.4rem;
		margin: 1rem 0 0;
		padding: 0.6rem 0;
		border-top: 1px solid rgba(0, 0, 0, 0.25);
		border-bottom: 1px solid rgba(0, 0, 0, 0.25);
	}
	.ficha div {
		margin: 0;
	}
	.ficha dt {
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		opacity: 0.6;
	}
	.ficha dd {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	/* Goles más asistencias es el número que de verdad mide un año. */
	.ficha .destacada dd {
		font-size: 1.35rem;
	}
	.seleccion {
		margin: 0.55rem 0 0;
		font-size: 0.82rem;
		font-style: italic;
		opacity: 0.75;
	}

	.notas {
		border-top: 1px solid rgba(22, 24, 28, 0.25);
		padding-top: 0.75rem;
		display: grid;
		gap: 0.7rem;
	}
	.notas section {
		border-left: 3px solid rgba(22, 24, 28, 0.3);
		padding-left: 0.65rem;
	}
	.notas h3 {
		margin: 0 0 0.15rem;
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--tinta-suave);
		border: none;
	}
	.notas p {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.4;
		color: var(--tinta);
	}

	.plegada {
		margin: 0.5rem 0 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--tinta);
	}
</style>
